import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { isStripeConfigured } from './stripe.config';
import { stripe } from './stripe.config';
import { createFundCheckout, createBountyFundCheckout, distributeFiat, refundFiat } from './stripe.service';
import { createConnectedAccount, getConnectedAccountStatus, createDashboardLink } from './stripe-connect.service';
import { stripeWebhookRoute } from './stripe.webhook';

// ─── Stripe Routes ──────────────────────────────────────────────────────────

const COMING_SOON_MESSAGE = 'Coming Soon';

export async function stripeRoutes(server: FastifyInstance) {
    // All Stripe routes disabled — return 400 before any handler runs
    server.addHook('onRequest', async (_request, reply) => {
        return reply.status(400).send({ message: COMING_SOON_MESSAGE });
    });

    // Register webhook sub-route (no auth — Stripe signs it)
    server.register(stripeWebhookRoute);

    // ── POST /stripe/checkout/:questId ──────────────────────────────────────
    server.post(
        '/checkout/:questId',
        {
            schema: {
                tags: ['Stripe'],
                summary: 'Create Stripe Checkout Session to fund a quest with fiat',
                security: [{ bearerAuth: [] }],
                params: z.object({ questId: z.string().uuid() }),
                body: z.object({
                    successUrl: z.string().url(),
                    cancelUrl: z.string().url(),
                }),
                response: {
                    200: z.object({
                        checkoutUrl: z.string(),
                        sessionId: z.string(),
                    }),
                },
            },
            onRequest: [server.authenticate],
        },
        async (request, reply) => {
            if (!isStripeConfigured()) {
                return reply.status(503).send({ message: 'Stripe not configured' } as any);
            }

            const { questId } = request.params as any;
            const { successUrl, cancelUrl } = request.body as any;

            // Verify ownership or partnership
            const quest = await server.prisma.quest.findUnique({ where: { id: questId } });
            if (!quest) return reply.status(404).send({ message: 'Quest not found' } as any);
            const isOwner = quest.creatorUserId === request.user.id || request.user.role === 'admin';
            if (!isOwner) {
                const partner = await server.prisma.questCollaborator.findFirst({
                    where: { questId, userId: request.user.id, acceptedAt: { not: null } },
                    select: { id: true },
                });
                if (!partner) {
                    return reply.status(403).send({ message: 'Only quest owner or partner can fund' } as any);
                }
            }

            try {
                return await createFundCheckout(server.prisma, questId, successUrl, cancelUrl);
            } catch (err: any) {
                return reply.status(400).send({ message: err.message } as any);
            }
        },
    );

    // ── POST /stripe/checkout/bounty/:bountyId — Fund GitHub Bounty (USD) ─────
    server.post(
        '/checkout/bounty/:bountyId',
        {
            schema: {
                tags: ['Stripe'],
                summary: 'Create Stripe Checkout Session to fund a GitHub Bounty with USD',
                security: [{ bearerAuth: [] }],
                params: z.object({ bountyId: z.string().uuid() }),
                body: z.object({ successUrl: z.string().url(), cancelUrl: z.string().url() }),
                response: {
                    200: z.object({ checkoutUrl: z.string(), sessionId: z.string() }),
                },
            },
            onRequest: [server.authenticate],
        },
        async (request, reply) => {
            if (!isStripeConfigured()) {
                return reply.status(503).send({ message: 'Stripe not configured' } as any);
            }
            const { bountyId } = request.params as any;
            const { successUrl, cancelUrl } = request.body as any;

            const bounty = await server.prisma.gitHubBounty.findUnique({ where: { id: bountyId } });
            if (!bounty) return reply.status(404).send({ message: 'Bounty not found' } as any);
            if (bounty.creatorUserId !== request.user.id) {
                return reply.status(403).send({ message: 'Only bounty creator can fund it' } as any);
            }

            try {
                return await createBountyFundCheckout(server.prisma, bountyId, successUrl, cancelUrl);
            } catch (err: any) {
                return reply.status(400).send({ message: err.message } as any);
            }
        },
    );

    // ── GET /stripe/checkout/session/:sessionId ─────────────────────────────
    server.get(
        '/checkout/session/:sessionId',
        {
            schema: {
                tags: ['Stripe'],
                summary: 'Get Stripe Checkout Session status (for callback verification)',
                security: [{ bearerAuth: [] }],
                params: z.object({ sessionId: z.string() }),
                response: {
                    200: z.object({
                        sessionId: z.string(),
                        paymentStatus: z.string(),
                        questId: z.string().nullable(),
                        paid: z.boolean(),
                    }),
                },
            },
            onRequest: [server.authenticate],
        },
        async (request, reply) => {
            if (!isStripeConfigured()) {
                return reply.status(503).send({ message: 'Stripe not configured' } as any);
            }

            const { sessionId } = request.params as any;

            try {
                const session = await stripe.checkout.sessions.retrieve(sessionId);
                const questId = session.metadata?.questId || null;

                return {
                    sessionId: session.id,
                    paymentStatus: session.payment_status,
                    questId,
                    paid: session.payment_status === 'paid',
                };
            } catch (err: any) {
                if (err.type === 'StripeInvalidRequestError') {
                    return reply.status(404).send({ message: 'Session not found' } as any);
                }
                server.log.error({ err: err.message, sessionId }, '[stripe:session] failed');
                return reply.status(400).send({ message: err.message } as any);
            }
        },
    );

    // ── POST /stripe/reset-funding/:questId ─────────────────────────────────
    server.post(
        '/reset-funding/:questId',
        {
            schema: {
                tags: ['Stripe'],
                summary: 'Reset quest funding status if Stripe session was canceled/expired',
                security: [{ bearerAuth: [] }],
                params: z.object({ questId: z.string().uuid() }),
                response: {
                    200: z.object({
                        message: z.string(),
                        reset: z.boolean(),
                    }),
                },
            },
            onRequest: [server.authenticate],
        },
        async (request, reply) => {
            if (!isStripeConfigured()) {
                return reply.status(503).send({ message: 'Stripe not configured' } as any);
            }

            const { questId } = request.params as any;
            const quest = await server.prisma.quest.findUnique({ where: { id: questId } });
            if (!quest) return reply.status(404).send({ message: 'Quest not found' } as any);

            const isOwner = quest.creatorUserId === request.user.id || request.user.role === 'admin';
            if (!isOwner) {
                return reply.status(403).send({ message: 'Only quest owner can reset funding' } as any);
            }

            // Only allow reset if quest is in pending state
            if (quest.fundingStatus !== 'pending') {
                return reply.status(400).send({
                    message: `Quest funding status is ${quest.fundingStatus}, cannot reset`
                } as any);
            }

            // Check session status if sessionId exists
            if (quest.stripeSessionId) {
                try {
                    const session = await stripe.checkout.sessions.retrieve(quest.stripeSessionId);
                    // If session is paid, don't reset
                    if (session.payment_status === 'paid') {
                        return reply.status(400).send({
                            message: 'Session is paid, cannot reset'
                        } as any);
                    }
                } catch (err: any) {
                    // Session might not exist or be expired, that's okay
                    server.log.debug({ err: err.message, sessionId: quest.stripeSessionId },
                        '[stripe:reset] Session check failed, proceeding with reset');
                }
            }

            // Reset funding status
            await server.prisma.quest.update({
                where: { id: questId },
                data: {
                    fundingStatus: 'unfunded',
                    fundingMethod: null,
                    stripeSessionId: null,
                    stripePaymentId: null,
                },
            });

            return { message: 'Funding status reset successfully', reset: true };
        },
    );


    // ── POST /stripe/distribute/:questId ────────────────────────────────────
    server.post(
        '/distribute/:questId',
        {
            schema: {
                tags: ['Stripe'],
                summary: 'Distribute fiat rewards to winners via Stripe Connect',
                security: [{ bearerAuth: [] }],
                params: z.object({ questId: z.string().uuid() }),
                response: {
                    200: z.object({
                        message: z.string(),
                        transfers: z.array(z.object({
                            participationId: z.string(),
                            transferId: z.string(),
                            amount: z.number(),
                        })),
                    }),
                },
            },
            onRequest: [server.authenticate],
        },
        async (request, reply) => {
            if (!isStripeConfigured()) {
                return reply.status(503).send({ message: 'Stripe not configured' } as any);
            }

            const { questId } = request.params as any;
            const quest = await server.prisma.quest.findUnique({ where: { id: questId } });
            if (!quest) return reply.status(404).send({ message: 'Quest not found' } as any);

            const isCreator = quest.creatorUserId === request.user.id;
            const isAdmin = request.user.role === 'admin';
            if (!isCreator && !isAdmin) {
                return reply.status(403).send({ message: 'Only quest creator or admin can distribute' } as any);
            }

            try {
                const result = await distributeFiat(server.prisma, questId);
                return { message: 'Fiat rewards distributed successfully', ...result };
            } catch (err: any) {
                server.log.error({ err: err.message, questId }, '[stripe:distribute] failed');
                return reply.status(400).send({ message: err.message } as any);
            }
        },
    );

    // ── POST /stripe/refund/:questId ────────────────────────────────────────
    server.post(
        '/refund/:questId',
        {
            schema: {
                tags: ['Stripe'],
                summary: 'Refund fiat quest funding back to sponsor',
                security: [{ bearerAuth: [] }],
                params: z.object({ questId: z.string().uuid() }),
                body: z.object({
                    reason: z.string().optional(),
                }).optional(),
                response: {
                    200: z.object({
                        message: z.string(),
                        refundId: z.string(),
                        amount: z.number(),
                    }),
                },
            },
            onRequest: [server.authenticate],
        },
        async (request, reply) => {
            if (!isStripeConfigured()) {
                return reply.status(503).send({ message: 'Stripe not configured' } as any);
            }

            const { questId } = request.params as any;
            const { reason } = (request.body as any) || {};

            const quest = await server.prisma.quest.findUnique({ where: { id: questId } });
            if (!quest) return reply.status(404).send({ message: 'Quest not found' } as any);

            const isCreator = quest.creatorUserId === request.user.id;
            const isAdmin = request.user.role === 'admin';
            if (!isCreator && !isAdmin) {
                return reply.status(403).send({ message: 'Only quest creator or admin can refund' } as any);
            }

            try {
                const result = await refundFiat(server.prisma, questId, reason);
                return { message: 'Refund processed successfully', ...result };
            } catch (err: any) {
                server.log.error({ err: err.message, questId }, '[stripe:refund] failed');
                return reply.status(400).send({ message: err.message } as any);
            }
        },
    );

    // ── POST /stripe/connect/onboard — Start connected account onboarding ───
    server.post(
        '/connect/onboard',
        {
            schema: {
                tags: ['Stripe'],
                summary: 'Create or resume Stripe Express account onboarding to receive fiat payouts',
                security: [{ bearerAuth: [] }],
                body: z.object({
                    returnUrl: z.string().url(),
                    refreshUrl: z.string().url(),
                }),
                response: {
                    200: z.object({
                        accountId: z.string(),
                        onboardingUrl: z.string(),
                    }),
                },
            },
            onRequest: [server.authenticate],
        },
        async (request, reply) => {
            if (!isStripeConfigured()) {
                return reply.status(503).send({ message: 'Stripe not configured' } as any);
            }

            const { returnUrl, refreshUrl } = request.body as any;
            try {
                return await createConnectedAccount(server.prisma, request.user.id, returnUrl, refreshUrl);
            } catch (err: any) {
                return reply.status(400).send({ message: err.message } as any);
            }
        },
    );

    // ── GET /stripe/connect/status ──────────────────────────────────────────
    server.get(
        '/connect/status',
        {
            schema: {
                tags: ['Stripe'],
                summary: 'Check current user Stripe connected account onboarding status',
                security: [{ bearerAuth: [] }],
                response: {
                    200: z.object({
                        hasAccount: z.boolean(),
                        isOnboarded: z.boolean(),
                        accountId: z.string().nullable(),
                    }),
                },
            },
            onRequest: [server.authenticate],
        },
        async (request) => {
            return getConnectedAccountStatus(server.prisma, request.user.id);
        },
    );

    // ── GET /stripe/connect/dashboard ───────────────────────────────────────
    server.get(
        '/connect/dashboard',
        {
            schema: {
                tags: ['Stripe'],
                summary: 'Get Stripe Express dashboard login link',
                security: [{ bearerAuth: [] }],
                response: {
                    200: z.object({ dashboardUrl: z.string() }),
                },
            },
            onRequest: [server.authenticate],
        },
        async (request, reply) => {
            const user = await server.prisma.user.findUnique({ where: { id: request.user.id } });
            if (!user?.stripeConnectedAccountId) {
                return reply.status(400).send({ message: 'No connected account found' } as any);
            }

            try {
                const url = await createDashboardLink(user.stripeConnectedAccountId);
                return { dashboardUrl: url };
            } catch (err: any) {
                return reply.status(400).send({ message: err.message } as any);
            }
        },
    );
}
