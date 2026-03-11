import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createHmac, timingSafeEqual } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { requireAdmin } from './admin.middleware';
import { getAdminPrisma, isTestnetDbConfigured, type AdminEnv } from './admin.prisma';
import {
    listQuests,
    getQuestDetail,
    adminUpdateQuest,
    adminDeleteQuest,
    forceQuestStatus,
    listUsers,
    getUserDetail,
    listUserAgents,
    listUserQuests,
    adminUpdateUser,
    listQuestParticipations,
    getEscrowOverview,
    listEscrowQuests,
    getAnalyticsOverview,
    getTimeseries,
} from './admin.service';

// ─── Env query param schema (shared across admin routes) ────────────────────
const envQuerySchema = z.object({
    env: z.enum(['mainnet', 'testnet']).default('mainnet'),
});

// ─── Admin JWT helpers ────────────────────────────────────────────────────────
const JWT_EXPIRY_SECONDS = 60 * 60 * 8; // 8 hours

function getJwtSecret(): string {
    return process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'admin-secret-change-me';
}

function signAdminJwt(payload: { id: string; email: string; role: string }): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify({
        ...payload,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + JWT_EXPIRY_SECONDS,
    })).toString('base64url');
    const sig = createHmac('sha256', getJwtSecret()).update(`${header}.${body}`).digest('base64url');
    return `${header}.${body}.${sig}`;
}

export function verifyAdminJwt(token: string): { id: string; email: string; role: string } | null {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const expected = createHmac('sha256', getJwtSecret()).update(`${header}.${body}`).digest('base64url');
    try {
        if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    } catch {
        return null;
    }
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as any;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { id: payload.id, email: payload.email, role: payload.role };
}

// ─── Admin JWT middleware (replaces server.authenticate for admin routes) ─────
export async function authenticateAdmin(request: FastifyRequest, reply: FastifyReply) {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ message: 'Missing or invalid Authorization header' });
    }
    const token = authHeader.slice(7);
    const payload = verifyAdminJwt(token);
    if (!payload) {
        return reply.status(401).send({ message: 'Invalid or expired admin token' });
    }
    request.user = {
        id: payload.id,
        email: payload.email,
        role: payload.role,
        username: null,
        displayName: null,
        supabaseId: '',
    };
}

// ─── Admin Login Routes (public, no auth required) ───────────────────────────
export async function adminLoginRoutes(server: FastifyInstance) {
    server.post(
        '/admin/login',
        {
            schema: {
                tags: ['Admin'],
                summary: 'Admin login via email/password (DB only)',
                body: z.object({
                    email: z.string().email(),
                    password: z.string().min(1),
                }),
            },
        },
        async (request, reply) => {
            const { email, password } = request.body as { email: string; password: string };

            const user = await server.prisma.user.findUnique({
                where: { email },
                select: { id: true, email: true, role: true, password: true },
            });

            if (!user || !user.password) {
                return reply.status(401).send({ message: 'Invalid email or password' });
            }

            const valid = await bcrypt.compare(password, user.password);
            if (!valid) {
                return reply.status(401).send({ message: 'Invalid email or password' });
            }

            if (user.role !== 'admin') {
                return reply.status(403).send({ message: 'Admin access required' });
            }

            const token = signAdminJwt({ id: user.id, email: user.email, role: user.role });

            return {
                token,
                user: { id: user.id, email: user.email, role: user.role },
            };
        }
    );
}

// ─── Admin Routes ────────────────────────────────────────────────────────────
// All routes require: authenticateAdmin + requireAdmin

export async function adminRoutes(server: FastifyInstance) {
    // Apply admin JWT auth + admin role check to all routes in this plugin
    server.addHook('onRequest', authenticateAdmin);
    server.addHook('onRequest', requireAdmin);

    // ── GET /admin/env-status ───────────────────────────────────────────────
    server.get(
        '/env-status',
        {
            schema: {
                tags: ['Admin'],
                summary: 'Get environment configuration status',
                security: [{ bearerAuth: [] }],
            },
        },
        async () => {
            return {
                testnetDbConfigured: isTestnetDbConfigured(),
                currentDefault: 'mainnet',
            };
        }
    );

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
                    env: z.enum(['mainnet', 'testnet']).default('mainnet'),
                }),
            },
        },
        async (request) => {
            const { env, ...params } = request.query as any;
            const prisma = getAdminPrisma(server.prisma, env);
            return listQuests(prisma, params);
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
                querystring: envQuerySchema,
            },
        },
        async (request, reply) => {
            const { id } = request.params as any;
            const { env } = request.query as any;
            const prisma = getAdminPrisma(server.prisma, env);
            const quest = await getQuestDetail(prisma, id);
            if (!quest) return reply.status(404).send({ message: 'Quest not found' });
            return quest;
        }
    );

    // ── GET /admin/quests/:id/participations ──────────────────────────────────
    server.get(
        '/quests/:id/participations',
        {
            schema: {
                tags: ['Admin'],
                summary: 'List quest participations (admin)',
                security: [{ bearerAuth: [] }],
                params: z.object({ id: z.string().uuid() }),
                querystring: z.object({
                    page: z.coerce.number().int().min(1).default(1),
                    pageSize: z.coerce.number().int().min(1).max(100).default(25),
                    env: z.enum(['mainnet', 'testnet']).default('mainnet'),
                }),
            },
        },
        async (request) => {
            const { id } = request.params as any;
            const { env, ...params } = request.query as any;
            const prisma = getAdminPrisma(server.prisma, env);
            return listQuestParticipations(prisma, id, params);
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
                querystring: envQuerySchema,
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
            const { env } = request.query as any;
            const prisma = getAdminPrisma(server.prisma, env);
            const result = await adminUpdateQuest(prisma, id, request.body as any);
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
                querystring: envQuerySchema,
            },
        },
        async (request, reply) => {
            const { id } = request.params as any;
            const { env } = request.query as any;
            const prisma = getAdminPrisma(server.prisma, env);
            const result = await adminDeleteQuest(prisma, id);
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
                querystring: envQuerySchema,
                body: z.object({
                    status: z.string(),
                    reason: z.string().min(1),
                }),
            },
        },
        async (request, reply) => {
            const { id } = request.params as any;
            const { env } = request.query as any;
            const prisma = getAdminPrisma(server.prisma, env);
            const { status, reason } = request.body as any;
            const result = await forceQuestStatus(prisma, id, status, reason, request.user.email);
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
                    env: z.enum(['mainnet', 'testnet']).default('mainnet'),
                }),
            },
        },
        async (request) => {
            const { env, ...params } = request.query as any;
            const prisma = getAdminPrisma(server.prisma, env);
            return listUsers(prisma, params);
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
                querystring: envQuerySchema,
            },
        },
        async (request, reply) => {
            const { id } = request.params as any;
            const { env } = request.query as any;
            const prisma = getAdminPrisma(server.prisma, env);
            const user = await getUserDetail(prisma, id);
            if (!user) return reply.status(404).send({ message: 'User not found' });
            return user;
        }
    );

    // ── GET /admin/users/:id/agents ───────────────────────────────────────────
    server.get(
        '/users/:id/agents',
        {
            schema: {
                tags: ['Admin'],
                summary: 'List user agents (admin)',
                security: [{ bearerAuth: [] }],
                params: z.object({ id: z.string().uuid() }),
                querystring: z.object({
                    page: z.coerce.number().int().min(1).default(1),
                    pageSize: z.coerce.number().int().min(1).max(100).default(25),
                    env: z.enum(['mainnet', 'testnet']).default('mainnet'),
                }),
            },
        },
        async (request) => {
            const { id } = request.params as any;
            const { env, ...params } = request.query as any;
            const prisma = getAdminPrisma(server.prisma, env);
            return listUserAgents(prisma, id, params);
        }
    );

    // ── GET /admin/users/:id/quests ───────────────────────────────────────────
    server.get(
        '/users/:id/quests',
        {
            schema: {
                tags: ['Admin'],
                summary: 'List user created quests (admin)',
                security: [{ bearerAuth: [] }],
                params: z.object({ id: z.string().uuid() }),
                querystring: z.object({
                    page: z.coerce.number().int().min(1).default(1),
                    pageSize: z.coerce.number().int().min(1).max(100).default(25),
                    env: z.enum(['mainnet', 'testnet']).default('mainnet'),
                }),
            },
        },
        async (request) => {
            const { id } = request.params as any;
            const { env, ...params } = request.query as any;
            const prisma = getAdminPrisma(server.prisma, env);
            return listUserQuests(prisma, id, params);
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
                querystring: envQuerySchema,
                body: z.object({
                    role: z.enum(['user', 'admin']).optional(),
                    username: z.string().min(3).max(30).optional(),
                    password: z.string().min(6).optional(),
                }),
            },
        },
        async (request, reply) => {
            const { id } = request.params as any;
            const { env } = request.query as any;
            const prisma = getAdminPrisma(server.prisma, env);
            const result = await adminUpdateUser(prisma, id, request.body as any, request.user.id);
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
                querystring: envQuerySchema,
            },
        },
        async (request) => {
            const { env } = request.query as any;
            const prisma = getAdminPrisma(server.prisma, env);
            return getEscrowOverview(prisma);
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
                    env: z.enum(['mainnet', 'testnet']).default('mainnet'),
                }),
            },
        },
        async (request) => {
            const { env, ...params } = request.query as any;
            const prisma = getAdminPrisma(server.prisma, env);
            return listEscrowQuests(prisma, params);
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
                querystring: envQuerySchema,
            },
        },
        async (request) => {
            const { env } = request.query as any;
            const prisma = getAdminPrisma(server.prisma, env);
            return getAnalyticsOverview(prisma);
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
                    env: z.enum(['mainnet', 'testnet']).default('mainnet'),
                }),
            },
        },
        async (request) => {
            const { metric, period, from, to, env } = request.query as any;
            const prisma = getAdminPrisma(server.prisma, env);
            const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const toDate = to ? new Date(to) : new Date();
            return getTimeseries(prisma, metric, period, fromDate, toDate);
        }
    );
}
