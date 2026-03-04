import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { isStripeConfigured } from './stripe.config';
import { createFundCheckout, distributeFiat, refundFiat } from './stripe.service';
import { createConnectedAccount, getConnectedAccountStatus, createDashboardLink } from './stripe-connect.service';
import { stripeWebhookRoute } from './stripe.webhook';

// ─── Stripe Routes ──────────────────────────────────────────────────────────

export async function stripeRoutes(server: FastifyInstance) {
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

            // Verify ownership
            const quest = await server.prisma.quest.findUnique({ where: { id: questId } });
            if (!quest) return reply.status(404).send({ message: 'Quest not found' } as any);
            if (quest.creatorUserId !== request.user.id && request.user.role !== 'admin') {
                return reply.status(403).send({ message: 'Only quest creator can fund' } as any);
            }

            try {
                return await createFundCheckout(server.prisma, questId, successUrl, cancelUrl);
            } catch (err: any) {
                return reply.status(400).send({ message: err.message } as any);
            }
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
