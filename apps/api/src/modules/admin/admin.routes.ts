import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAdmin } from './admin.middleware';
import {
    listQuests,
    getQuestDetail,
    adminUpdateQuest,
    adminDeleteQuest,
    forceQuestStatus,
    listUsers,
    getUserDetail,
    adminUpdateUser,
    getEscrowOverview,
    listEscrowQuests,
    getAnalyticsOverview,
    getTimeseries,
} from './admin.service';

// ─── Admin Routes ────────────────────────────────────────────────────────────
// All routes require: authenticate + requireAdmin

export async function adminRoutes(server: FastifyInstance) {
    // Apply auth + admin check to all routes in this plugin
    server.addHook('onRequest', server.authenticate);
    server.addHook('onRequest', requireAdmin);

    // ═══════════════════════════════════════════════════════════════════════════
    // QUEST MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════

    // ── GET /admin/quests ─────────────────────────────────────────────────────
    server.get(
        '/quests',
        {
            schema: {
                tags: ['Admin'],
                summary: 'List all quests (admin)',
                security: [{ bearerAuth: [] }],
                querystring: z.object({
                    status: z.string().optional(),
                    type: z.string().optional(),
                    fundingStatus: z.string().optional(),
                    search: z.string().optional(),
                    creatorId: z.string().uuid().optional(),
                    sort: z.enum(['createdAt', 'rewardAmount', 'filledSlots', 'title']).default('createdAt'),
                    order: z.enum(['asc', 'desc']).default('desc'),
                    page: z.coerce.number().int().min(1).default(1),
                    pageSize: z.coerce.number().int().min(1).max(100).default(25),
                }),
            },
        },
        async (request) => {
            const params = request.query as any;
            return listQuests(server.prisma, params);
        }
    );

    // ── GET /admin/quests/:id ─────────────────────────────────────────────────
    server.get(
        '/quests/:id',
        {
            schema: {
                tags: ['Admin'],
                summary: 'Get full quest detail (admin)',
                security: [{ bearerAuth: [] }],
                params: z.object({ id: z.string().uuid() }),
            },
        },
        async (request, reply) => {
            const { id } = request.params as any;
            const quest = await getQuestDetail(server.prisma, id);
            if (!quest) return reply.status(404).send({ message: 'Quest not found' });
            return quest;
        }
    );

    // ── PATCH /admin/quests/:id ───────────────────────────────────────────────
    server.patch(
        '/quests/:id',
        {
            schema: {
                tags: ['Admin'],
                summary: 'Update any quest (admin bypass)',
                security: [{ bearerAuth: [] }],
                params: z.object({ id: z.string().uuid() }),
                body: z.object({
                    title: z.string().optional(),
                    description: z.string().optional(),
                    sponsor: z.string().optional(),
                    type: z.string().optional(),
                    status: z.string().optional(),
                    rewardAmount: z.number().optional(),
                    rewardType: z.string().optional(),
                    totalSlots: z.number().optional(),
                    tags: z.array(z.string()).optional(),
                    requiredSkills: z.array(z.string()).optional(),
                    expiresAt: z.string().nullable().optional(),
                    startAt: z.string().nullable().optional(),
                    fundingStatus: z.string().optional(),
                }),
            },
        },
        async (request, reply) => {
            const { id } = request.params as any;
            const result = await adminUpdateQuest(server.prisma, id, request.body as any);
            if (!result) return reply.status(404).send({ message: 'Quest not found' });
            return result;
        }
    );

    // ── DELETE /admin/quests/:id ──────────────────────────────────────────────
    server.delete(
        '/quests/:id',
        {
            schema: {
                tags: ['Admin'],
                summary: 'Delete a quest (admin)',
                security: [{ bearerAuth: [] }],
                params: z.object({ id: z.string().uuid() }),
            },
        },
        async (request, reply) => {
            const { id } = request.params as any;
            const result = await adminDeleteQuest(server.prisma, id);
            if (!result) return reply.status(404).send({ message: 'Quest not found' });
            if ('error' in result) {
                return reply.status(400).send({
                    message: 'Quest has escrow funds. Trigger refund before deletion.',
                    code: result.error,
                });
            }
            return { message: 'Quest deleted', deletedId: id };
        }
    );

    // ── POST /admin/quests/:id/force-status ──────────────────────────────────
    server.post(
        '/quests/:id/force-status',
        {
            schema: {
                tags: ['Admin'],
                summary: 'Force quest status change (admin)',
                security: [{ bearerAuth: [] }],
                params: z.object({ id: z.string().uuid() }),
                body: z.object({
                    status: z.string(),
                    reason: z.string().min(1),
                }),
            },
        },
        async (request, reply) => {
            const { id } = request.params as any;
            const { status, reason } = request.body as any;
            const result = await forceQuestStatus(server.prisma, id, status, reason, request.user.email);
            if (!result) return reply.status(404).send({ message: 'Quest not found' });

            server.log.info(
                { questId: id, from: result.previousStatus, to: status, reason, admin: request.user.email },
                'Admin forced quest status change'
            );

            return result;
        }
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // USER MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════

    // ── GET /admin/users ──────────────────────────────────────────────────────
    server.get(
        '/users',
        {
            schema: {
                tags: ['Admin'],
                summary: 'List all users (admin)',
                security: [{ bearerAuth: [] }],
                querystring: z.object({
                    search: z.string().optional(),
                    role: z.string().optional(),
                    sort: z.enum(['createdAt', 'email']).default('createdAt'),
                    order: z.enum(['asc', 'desc']).default('desc'),
                    page: z.coerce.number().int().min(1).default(1),
                    pageSize: z.coerce.number().int().min(1).max(100).default(25),
                }),
            },
        },
        async (request) => {
            const params = request.query as any;
            return listUsers(server.prisma, params);
        }
    );

    // ── GET /admin/users/:id ──────────────────────────────────────────────────
    server.get(
        '/users/:id',
        {
            schema: {
                tags: ['Admin'],
                summary: 'Get user detail (admin)',
                security: [{ bearerAuth: [] }],
                params: z.object({ id: z.string().uuid() }),
            },
        },
        async (request, reply) => {
            const { id } = request.params as any;
            const user = await getUserDetail(server.prisma, id);
            if (!user) return reply.status(404).send({ message: 'User not found' });
            return user;
        }
    );

    // ── PATCH /admin/users/:id ────────────────────────────────────────────────
    server.patch(
        '/users/:id',
        {
            schema: {
                tags: ['Admin'],
                summary: 'Update user role (admin)',
                security: [{ bearerAuth: [] }],
                params: z.object({ id: z.string().uuid() }),
                body: z.object({
                    role: z.enum(['user', 'admin']),
                }),
            },
        },
        async (request, reply) => {
            const { id } = request.params as any;
            const { role } = request.body as any;
            const result = await adminUpdateUser(server.prisma, id, role, request.user.id);
            if (!result) return reply.status(404).send({ message: 'User not found' });
            if ('error' in result) {
                return reply.status(400).send({
                    message: 'Cannot demote yourself',
                    code: result.error,
                });
            }
            return result;
        }
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // ESCROW DASHBOARD
    // ═══════════════════════════════════════════════════════════════════════════

    // ── GET /admin/escrow/overview ────────────────────────────────────────────
    server.get(
        '/escrow/overview',
        {
            schema: {
                tags: ['Admin'],
                summary: 'Escrow aggregate stats (admin)',
                security: [{ bearerAuth: [] }],
            },
        },
        async () => {
            return getEscrowOverview(server.prisma);
        }
    );

    // ── GET /admin/escrow/quests ──────────────────────────────────────────────
    server.get(
        '/escrow/quests',
        {
            schema: {
                tags: ['Admin'],
                summary: 'List funded quests with escrow status (admin)',
                security: [{ bearerAuth: [] }],
                querystring: z.object({
                    page: z.coerce.number().int().min(1).default(1),
                    pageSize: z.coerce.number().int().min(1).max(100).default(25),
                }),
            },
        },
        async (request) => {
            const params = request.query as any;
            return listEscrowQuests(server.prisma, params);
        }
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // ANALYTICS
    // ═══════════════════════════════════════════════════════════════════════════

    // ── GET /admin/analytics/overview ─────────────────────────────────────────
    server.get(
        '/analytics/overview',
        {
            schema: {
                tags: ['Admin'],
                summary: 'Platform analytics overview (admin)',
                security: [{ bearerAuth: [] }],
            },
        },
        async () => {
            return getAnalyticsOverview(server.prisma);
        }
    );

    // ── GET /admin/analytics/timeseries ───────────────────────────────────────
    server.get(
        '/analytics/timeseries',
        {
            schema: {
                tags: ['Admin'],
                summary: 'Time-series analytics data (admin)',
                security: [{ bearerAuth: [] }],
                querystring: z.object({
                    metric: z.enum(['users', 'quests', 'participations']),
                    period: z.enum(['day', 'week', 'month']).default('day'),
                    from: z.string().optional(),
                    to: z.string().optional(),
                }),
            },
        },
        async (request) => {
            const { metric, period, from, to } = request.query as any;
            const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const toDate = to ? new Date(to) : new Date();
            return getTimeseries(server.prisma, metric, period, fromDate, toDate);
        }
    );
}
