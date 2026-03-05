import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { stripe, stripeConfig } from './stripe.config';
import type Stripe from 'stripe';

// ─── Stripe Webhook Handler ─────────────────────────────────────────────────

export async function stripeWebhookRoute(server: FastifyInstance) {
    server.post(
        '/webhook',
        {
            schema: {
                tags: ['Stripe'],
                summary: 'Stripe webhook handler (signature-verified)',
                // No auth — Stripe signs the payload
            },
            config: { rawBody: true },
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
            const sig = request.headers['stripe-signature'] as string;
            if (!sig) {
                return reply.status(400).send({ message: 'Missing stripe-signature header' });
            }

            // rawBody is set by @fastify/raw-body plugin
            const rawBody = (request as any).rawBody as string | Buffer;
            if (!rawBody) {
                return reply.status(400).send({ message: 'Missing raw body' });
            }

            let event: Stripe.Event;
            try {
                event = stripe.webhooks.constructEvent(rawBody, sig, stripeConfig.webhookSecret);
            } catch (err: any) {
                server.log.error({ err: err.message }, '[stripe:webhook] Signature verification failed');
                return reply.status(400).send({ message: 'Invalid webhook signature' });
            }

            server.log.info({ type: event.type, id: event.id }, '[stripe:webhook] Event received');

            try {
                switch (event.type) {
                    case 'checkout.session.completed':
                        await handleCheckoutCompleted(server, event);
                        break;

                    case 'charge.refunded':
                        await handleChargeRefunded(server, event);
                        break;

                    case 'account.updated':
                        await handleAccountUpdated(server, event);
                        break;

                    default:
                        server.log.debug({ type: event.type }, '[stripe:webhook] Unhandled event');
                }
            } catch (err: any) {
                server.log.error({ err: err.message, type: event.type }, '[stripe:webhook] Handler error');
                // Still return 200 to avoid Stripe retries for application errors
            }

            return reply.status(200).send({ received: true });
        },
    );
}

// ─── Event Handlers ─────────────────────────────────────────────────────────

/** Quest funding confirmed via Stripe Checkout */
async function handleCheckoutCompleted(server: FastifyInstance, event: Stripe.Event) {
    const session = event.data.object as Stripe.Checkout.Session;
    const questId = session.metadata?.questId;
    if (!questId || session.metadata?.type !== 'quest_funding') return;

    if (session.payment_status !== 'paid') {
        server.log.warn({ questId, paymentStatus: session.payment_status }, '[stripe:webhook] Checkout not paid');
        return;
    }

    // Determine quest status based on startAt
    const quest = await server.prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) {
        server.log.warn({ questId }, '[stripe:webhook] Quest not found for checkout');
        return;
    }

    // Idempotency: skip if already confirmed
    if (quest.fundingStatus === 'confirmed') {
        server.log.info({ questId }, '[stripe:webhook] Quest already confirmed (idempotent skip)');
        return;
    }

    const hasStartAt = quest.startAt && new Date(quest.startAt) > new Date();
    const newStatus = hasStartAt ? 'scheduled' : 'live';

    await server.prisma.quest.update({
        where: { id: questId },
        data: {
            fundingStatus: 'confirmed',
            fundingMethod: 'stripe',
            stripePaymentId: session.payment_intent as string,
            fundedAt: new Date(),
            fundedAmount: session.amount_total ? session.amount_total / 100 : null,
            status: newStatus,
        },
    });

    server.log.info({ questId, status: newStatus }, '[stripe:webhook] Quest funded via Stripe');
}

/** Refund confirmed by Stripe */
async function handleChargeRefunded(server: FastifyInstance, event: Stripe.Event) {
    const charge = event.data.object as Stripe.Charge;
    const paymentIntent = charge.payment_intent as string;
    if (!paymentIntent) return;

    const quest = await server.prisma.quest.findFirst({
        where: { stripePaymentId: paymentIntent },
    });
    if (!quest) return;

    // Idempotency
    if (quest.refundStatus === 'completed') return;

    await server.prisma.quest.update({
        where: { id: quest.id },
        data: {
            refundStatus: 'completed',
            refundAmount: charge.amount_refunded / 100,
            refundedAt: new Date(),
        },
    });

    server.log.info({ questId: quest.id, refundedCents: charge.amount_refunded }, '[stripe:webhook] Refund confirmed');
}

/** Connected account onboarding completed */
async function handleAccountUpdated(server: FastifyInstance, event: Stripe.Event) {
    const account = event.data.object as Stripe.Account;
    const userId = account.metadata?.userId;
    if (!userId) return;

    const isOnboarded = !!(account.details_submitted && account.charges_enabled);
    if (!isOnboarded) return;

    await server.prisma.user.updateMany({
        where: {
            id: userId,
            stripeConnectedAccountId: account.id,
            stripeConnectedOnboarded: false,
        },
        data: { stripeConnectedOnboarded: true },
    });

    server.log.info({ userId, accountId: account.id }, '[stripe:webhook] Connected account onboarded');
}
