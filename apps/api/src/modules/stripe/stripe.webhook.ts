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

            server.log.info(
                { type: event.type, id: event.id, livemode: event.livemode },
                '[stripe:webhook] Event received'
            );

            try {
                switch (event.type) {
                    case 'checkout.session.completed':
                        server.log.info({ eventId: event.id }, '[stripe:webhook] Processing checkout.session.completed');
                        await handleCheckoutCompleted(server, event);
                        break;

                    case 'checkout.session.async_payment_failed':
                        server.log.info({ eventId: event.id }, '[stripe:webhook] Processing checkout.session.async_payment_failed');
                        await handleCheckoutCompleted(server, event);
                        break;

                    case 'checkout.session.expired':
                        server.log.info({ eventId: event.id }, '[stripe:webhook] Processing checkout.session.expired');
                        await handleCheckoutCompleted(server, event);
                        break;

                    case 'charge.refunded':
                        server.log.info({ eventId: event.id }, '[stripe:webhook] Processing charge.refunded');
                        await handleChargeRefunded(server, event);
                        break;

                    case 'account.updated':
                        server.log.info({ eventId: event.id }, '[stripe:webhook] Processing account.updated');
                        await handleAccountUpdated(server, event);
                        break;

                    default:
                        server.log.debug({ type: event.type, eventId: event.id }, '[stripe:webhook] Unhandled event');
                }
            } catch (err: any) {
                server.log.error(
                    {
                        err: err.message,
                        stack: err.stack,
                        type: event.type,
                        eventId: event.id,
                        sessionId: (event.data.object as any)?.id,
                    },
                    '[stripe:webhook] Handler error - will retry if transient'
                );
                // Re-throw database/transient errors to trigger Stripe retry
                // Return 200 for application errors (invalid data, already processed, etc.)
                if (err.message?.includes('Database') || err.message?.includes('ECONNREFUSED') || err.message?.includes('timeout')) {
                    throw err;
                }
            }

            return reply.status(200).send({ received: true });
        },
    );
}

// ─── Shared Payment Confirmation Logic ──────────────────────────────────────

/**
 * Confirm quest funding from a Stripe Checkout Session.
 * This function is idempotent and can be called from webhook or manual verification.
 */
export async function confirmQuestFundingFromSession(
    prisma: any,
    session: Stripe.Checkout.Session,
    logger?: any,
): Promise<{ confirmed: boolean; questId: string | null; reason?: string; error?: Error }> {
    const questId = session.metadata?.questId;
    const sessionType = session.metadata?.type;

    if (!questId || sessionType !== 'quest_funding') {
        const reason = `Invalid session metadata: questId=${questId}, type=${sessionType}`;
        logger?.warn({ sessionId: session.id, questId, sessionType }, reason);
        return { confirmed: false, questId: null, reason };
    }

    if (session.payment_status !== 'paid') {
        const reason = `Payment status is ${session.payment_status}, not paid`;
        logger?.warn(
            { sessionId: session.id, questId, paymentStatus: session.payment_status },
            reason
        );
        return { confirmed: false, questId, reason };
    }

    const quest = await prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) {
        const reason = `Quest not found: ${questId}`;
        logger?.error({ sessionId: session.id, questId }, reason);
        return { confirmed: false, questId, reason };
    }

    // Idempotency: skip if already confirmed
    if (quest.fundingStatus === 'confirmed') {
        logger?.info({ sessionId: session.id, questId }, 'Quest already confirmed, skipping update');
        return { confirmed: true, questId, reason: 'Already confirmed' };
    }

    const hasStartAt = quest.startAt && new Date(quest.startAt) > new Date();
    const newStatus = hasStartAt ? 'scheduled' : 'live';

    try {
        await prisma.quest.update({
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

        logger?.info(
            { sessionId: session.id, questId, newStatus, paymentIntent: session.payment_intent },
            `Quest funding confirmed, status updated to ${newStatus}`
        );

        return { confirmed: true, questId, reason: `Status updated to ${newStatus}` };
    } catch (err: any) {
        const reason = `Database update failed: ${err.message}`;
        logger?.error(
            { sessionId: session.id, questId, error: err.message, stack: err.stack },
            reason
        );
        return { confirmed: false, questId, reason, error: err };
    }
}

// ─── Event Handlers ─────────────────────────────────────────────────────────

/** Quest funding confirmed or canceled via Stripe Checkout */
async function handleCheckoutCompleted(server: FastifyInstance, event: Stripe.Event) {
    const session = event.data.object as Stripe.Checkout.Session;
    server.log.info(
        {
            sessionId: session.id,
            paymentStatus: session.payment_status,
            paymentIntent: session.payment_intent,
            amountTotal: session.amount_total,
            currency: session.currency,
            questId: session.metadata?.questId,
            type: session.metadata?.type,
            eventId: event.id,
        },
        '[stripe:webhook] checkout.session.completed received'
    );

    const questId = session.metadata?.questId;
    const sessionType = session.metadata?.type;

    // Only process quest_funding sessions
    if (!questId || sessionType !== 'quest_funding') {
        server.log.debug(
            { sessionId: session.id, questId, sessionType },
            '[stripe:webhook] Skipping non-quest_funding session'
        );
        return;
    }

    // Expand session to get full payment details if needed
    let expandedSession = session;
    if (!session.payment_intent && session.id) {
        try {
            expandedSession = await stripe.checkout.sessions.retrieve(session.id, {
                expand: ['payment_intent'],
            }) as Stripe.Checkout.Session;
            server.log.debug(
                { sessionId: session.id, expandedPaymentIntent: expandedSession.payment_intent },
                '[stripe:webhook] Expanded session to get payment_intent'
            );
        } catch (err: any) {
            server.log.warn(
                { sessionId: session.id, error: err.message },
                '[stripe:webhook] Failed to expand session, using original'
            );
        }
    }

    // Handle canceled/failed payments
    if (expandedSession.payment_status !== 'paid') {
        await handleCheckoutCanceled(server, expandedSession, questId);
        return;
    }

    // Handle successful payment
    const result = await confirmQuestFundingFromSession(server.prisma, expandedSession, server.log);

    if (result.confirmed) {
        server.log.info(
            {
                questId: result.questId,
                reason: result.reason,
                sessionId: session.id,
                paymentIntent: expandedSession.payment_intent,
            },
            '[stripe:webhook] Quest funded successfully'
        );
    } else {
        // Log detailed failure information
        server.log.error(
            {
                questId: result.questId,
                reason: result.reason,
                sessionId: session.id,
                paymentStatus: expandedSession.payment_status,
                paymentIntent: expandedSession.payment_intent,
                metadata: expandedSession.metadata,
                error: result.error?.message,
                stack: result.error?.stack,
            },
            '[stripe:webhook] Failed to confirm quest funding'
        );

        // For database errors, throw to trigger Stripe retry
        if (result.error && result.error.message.includes('Database')) {
            throw result.error;
        }
    }
}

/** Handle canceled or failed checkout session - automatically reset funding status */
async function handleCheckoutCanceled(
    server: FastifyInstance,
    session: Stripe.Checkout.Session,
    questId: string,
) {
    const quest = await server.prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) {
        server.log.warn({ sessionId: session.id, questId }, '[stripe:webhook] Quest not found for canceled session');
        return;
    }

    // Only reset if quest is still in pending state (idempotency check)
    if (quest.fundingStatus !== 'pending') {
        server.log.debug(
            { sessionId: session.id, questId, currentStatus: quest.fundingStatus },
            '[stripe:webhook] Quest not in pending state, skipping reset'
        );
        return;
    }

    try {
        await server.prisma.quest.update({
            where: { id: questId },
            data: {
                fundingStatus: 'unfunded',
                fundingMethod: null,
                stripeSessionId: null,
                stripePaymentId: null,
            },
        });

        server.log.info(
            {
                sessionId: session.id,
                questId,
                paymentStatus: session.payment_status,
                eventType: 'checkout_canceled',
            },
            '[stripe:webhook] Quest funding automatically reset to unfunded (checkout canceled/failed/expired)'
        );
    } catch (err: any) {
        server.log.error(
            {
                sessionId: session.id,
                questId,
                error: err.message,
                stack: err.stack,
            },
            '[stripe:webhook] Failed to reset quest funding status'
        );
        throw err;
    }
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
