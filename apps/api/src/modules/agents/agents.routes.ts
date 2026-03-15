import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { AgentSchema } from '@clawquest/shared';
import { z } from 'zod';
import { authenticateAgent } from './agent-auth.helper';

// ─── Routes ──────────────────────────────────────────────────────────────────

export async function agentsRoutes(app: FastifyInstance) {
    const server = app.withTypeProvider<ZodTypeProvider>();

    // ── List Agents (human JWT) ───────────────────────────────────────────────
    server.get(
        '/',
        {
            onRequest: [app.authenticate],
            schema: {
                tags: ['Agents'],
                summary: 'List user agents',
                security: [{ bearerAuth: [] }],
                response: { 200: z.array(AgentSchema) },
            },
        },
        async (request) => {
            const agents = await server.prisma.agent.findMany({
                where: { ownerId: request.user.id },
                orderBy: { createdAt: 'desc' },
            });
            return agents.map(a => ({
                id: a.id,
                agentname: a.agentname,
                status: a.status as any,
                ownerId: a.ownerId,
                isActive: a.isActive,
                agentApiKey: a.agentApiKey ?? undefined,
                createdAt: a.createdAt.toISOString(),
                updatedAt: a.updatedAt.toISOString(),
            }));
        }
    );

    // ── Get Agent Details (human JWT) ─────────────────────────────────────────
    server.get(
        '/:id',
        {
            onRequest: [app.authenticate],
            schema: {
                tags: ['Agents'],
                summary: 'Get agent details',
                security: [{ bearerAuth: [] }],
                params: z.object({ id: z.string().uuid() }),
                response: { 200: AgentSchema },
            },
        },
        async (request, reply) => {
            const { id } = request.params as { id: string };
            const agent = await server.prisma.agent.findFirst({
                where: { id, ownerId: request.user.id },
            });
            if (!agent) {
                return reply.status(404).send({ message: 'Agent not found', code: 'NOT_FOUND' } as any);
            }
            return {
                id: agent.id,
                agentname: agent.agentname,
                status: agent.status as any,
                ownerId: agent.ownerId,
                isActive: agent.isActive,
                agentApiKey: agent.agentApiKey ?? undefined,
                createdAt: agent.createdAt.toISOString(),
                updatedAt: agent.updatedAt.toISOString(),
            };
        }
    );

    // ── PATCH /agents/:id/activate — set agent as active (human JWT) ──────────
    server.patch(
        '/:id/activate',
        {
            onRequest: [app.authenticate],
            schema: {
                tags: ['Agents'],
                summary: 'Set agent as active — only this agent can call questing APIs',
                security: [{ bearerAuth: [] }],
                params: z.object({ id: z.string().uuid() }),
                response: {
                    200: z.object({ agentId: z.string(), isActive: z.boolean(), message: z.string() }),
                },
            },
        },
        async (request, reply) => {
            const { id } = request.params as { id: string };
            const userId = (request as any).user.id;

            // Verify ownership
            const agent = await server.prisma.agent.findFirst({
                where: { id, ownerId: userId },
                select: { id: true, agentname: true },
            });
            if (!agent) return reply.status(404).send({ error: 'Agent not found or not owned by you' } as any);

            // Deactivate all other agents for this user, then activate this one
            await server.prisma.$transaction([
                server.prisma.agent.updateMany({
                    where: { ownerId: userId, isActive: true },
                    data: { isActive: false },
                }),
                server.prisma.agent.update({
                    where: { id },
                    data: { isActive: true },
                }),
            ]);

            return { agentId: id, isActive: true, message: `Agent "${agent.agentname}" is now active.` };
        }
    );

    // ── DELETE /agents/:id — delete agent (human JWT) ─────────────────────────
    server.delete(
        '/:id',
        {
            onRequest: [app.authenticate],
            schema: {
                tags: ['Agents'],
                summary: 'Delete an agent (only if idle or pending claim)',
                security: [{ bearerAuth: [] }],
                params: z.object({ id: z.string().uuid() }),
                response: {
                    200: z.object({ message: z.string() }),
                },
            },
        },
        async (request, reply) => {
            const { id } = request.params as { id: string };
            const userId = (request as any).user.id;

            const agent = await server.prisma.agent.findFirst({
                where: { id, ownerId: userId },
                select: { id: true, status: true, agentname: true },
            });
            if (!agent) return reply.status(404).send({ error: 'Agent not found or not owned by you' } as any);
            if (agent.status === 'questing') {
                return reply.status(400).send({ error: 'Cannot delete an agent that is currently questing' } as any);
            }

            await server.prisma.agent.delete({ where: { id } });
            return { message: `Agent "${agent.agentname}" deleted.` };
        }
    );

    // ── GET /agents/:id/logs — get agent logs (human JWT) ─────────────────────
    server.get(
        '/:id/logs',
        {
            onRequest: [app.authenticate],
            schema: {
                tags: ['Agents'],
                summary: 'Get agent activity logs (human JWT auth)',
                security: [{ bearerAuth: [] }],
                params: z.object({ id: z.string().uuid() }),
                querystring: z.object({ limit: z.coerce.number().min(1).max(100).default(50) }),
                response: {
                    200: z.array(z.object({
                        id: z.string(),
                        type: z.string(),
                        message: z.string(),
                        meta: z.record(z.string(), z.unknown()).nullable(),
                        createdAt: z.string(),
                    })),
                },
            },
        },
        async (request, reply) => {
            const { id } = request.params as { id: string };
            const { limit } = request.query as { limit: number };

            // Verify agent ownership
            const agent = await server.prisma.agent.findFirst({
                where: { id, ownerId: request.user.id },
                select: { id: true },
            });

            if (!agent) {
                return reply.status(403).send({ error: 'Forbidden: You do not own this agent' } as any);
            }

            // Fetch logs
            const logs = await server.prisma.agentLog.findMany({
                where: { agentId: id },
                orderBy: { createdAt: 'desc' },
                take: limit,
            });

            return logs.map(l => ({
                id: l.id,
                type: l.type,
                message: l.message,
                meta: l.meta ?? null,
                createdAt: l.createdAt.toISOString(),
            }));
        }
    );

    // ── GET /agents/me — agent self-info (agent API key) ─────────────────────
    server.get(
        '/me',
        {
            schema: {
                tags: ['Agents'],
                summary: 'Get current agent info (agent API key auth)',
                security: [{ bearerAuth: [] }],
                response: {
                    200: z.object({
                        agentId: z.string().uuid(),
                        agentname: z.string(),
                        status: z.string(),
                        ownerId: z.string().uuid().nullable(),
                        activeQuests: z.array(z.object({
                            participationId: z.string(),
                            questId: z.string(),
                            questTitle: z.string(),
                            status: z.string(),
                            tasksCompleted: z.number(),
                            tasksTotal: z.number(),
                            joinedAt: z.string(),
                        })),
                        completedQuestsCount: z.number(),
                        createdAt: z.string(),
                    }),
                },
            },
        },
        async (request, reply) => {
            const ctx = await authenticateAgent(server as any, request, reply);
            if (!ctx) return;

            const agent = await server.prisma.agent.findUnique({
                where: { id: ctx.agentId },
                include: {
                    participations: {
                        where: { status: { in: ['in_progress', 'submitted'] } },
                        include: { quest: { select: { title: true } } },
                        orderBy: { joinedAt: 'desc' },
                    },
                    _count: {
                        select: { participations: { where: { status: 'completed' } } },
                    },
                },
            });

            if (!agent) return reply.status(404).send({ error: 'Agent not found' } as any);

            return {
                agentId: agent.id,
                agentname: agent.agentname,
                status: agent.status,
                ownerId: agent.ownerId,
                activeQuests: agent.participations.map(p => ({
                    participationId: p.id,
                    questId: p.questId,
                    questTitle: p.quest.title,
                    status: p.status,
                    tasksCompleted: p.tasksCompleted,
                    tasksTotal: p.tasksTotal,
                    joinedAt: p.joinedAt.toISOString(),
                })),
                completedQuestsCount: agent._count.participations,
                createdAt: agent.createdAt.toISOString(),
            };
        }
    );

    // ── GET /agents/logs — agent activity log (agent API key) ─────────────────
    server.get(
        '/logs',
        {
            schema: {
                tags: ['Agents'],
                summary: 'Get agent activity logs (agent API key auth)',
                security: [{ bearerAuth: [] }],
                querystring: z.object({ limit: z.coerce.number().min(1).max(100).default(50) }),
                response: {
                    200: z.array(z.object({
                        id: z.string(),
                        type: z.string(),
                        message: z.string(),
                        meta: z.record(z.string(), z.unknown()).nullable(),
                        createdAt: z.string(),
                    })),
                },
            },
        },
        async (request, reply) => {
            const ctx = await authenticateAgent(server as any, request, reply);
            if (!ctx) return;

            const { limit } = request.query as { limit: number };
            const logs = await server.prisma.agentLog.findMany({
                where: { agentId: ctx.agentId },
                orderBy: { createdAt: 'desc' },
                take: limit,
            });
            return logs.map(l => ({ ...l, meta: l.meta ?? null, createdAt: l.createdAt.toISOString() }));
        }
    );

    // ── POST /agents/me/log — agent writes activity log (agent API key) ───────
    server.post(
        '/me/log',
        {
            schema: {
                tags: ['Agents'],
                summary: 'Write an activity log entry (agent API key auth)',
                security: [{ bearerAuth: [] }],
                body: z.object({
                    type: z.enum(['QUEST_START', 'QUEST_COMPLETE', 'ERROR', 'INFO']),
                    message: z.string().min(1).max(500),
                    meta: z.record(z.string(), z.unknown()).optional(),
                }),
                response: { 201: z.object({ id: z.string(), createdAt: z.string() }) },
            },
        },
        async (request, reply) => {
            const ctx = await authenticateAgent(server as any, request, reply);
            if (!ctx) return;

            const { type, message, meta } = request.body as { type: string; message: string; meta?: Record<string, unknown> };
            const log = await server.prisma.agentLog.create({
                data: { agentId: ctx.agentId, type, message, meta: (meta ?? undefined) as any },
            });
            return reply.code(201).send({ id: log.id, createdAt: log.createdAt.toISOString() });
        }
    );

    // ── POST /agents/me/skills — report installed skills (upsert) ─────────────
    // Agent scans its own environment and reports what skills it has.
    // Uses upsert: creates new records or updates lastSeenAt for existing ones.
    const SkillEntrySchema = z.object({
        name: z.string().min(1).max(500),         // e.g. "sponge-wallet" or full URL for custom skills
        version: z.string().max(20).optional(),    // e.g. "1.0.0"
        source: z.enum(['clawhub', 'mcp', 'manual', 'custom', 'openclaw', 'cloudage', 'agentforge', 'claude', 'claude_code']).default('clawhub'),
        publisher: z.string().max(100).optional(), // e.g. "paysponge"
        meta: z.record(z.string(), z.unknown()).optional(),         // tool names, descriptions, etc.
    });

    server.post(
        '/me/skills',
        {
            schema: {
                tags: ['Agents'],
                summary: 'Report installed skills (agent API key auth)',
                security: [{ bearerAuth: [] }],
                body: z.object({ skills: z.array(SkillEntrySchema).min(1).max(50) }),
                response: {
                    200: z.object({
                        synced: z.number(),
                        skills: z.array(z.object({
                            name: z.string(),
                            version: z.string().nullable(),
                            source: z.string(),
                            publisher: z.string().nullable(),
                            lastSeenAt: z.string(),
                        })),
                    }),
                },
            },
        },
        async (request, reply) => {
            const ctx = await authenticateAgent(server as any, request, reply);
            if (!ctx) return;

            const { skills } = request.body as { skills: Array<{ name: string; version?: string; source?: string; publisher?: string; meta?: Record<string, unknown> }> };
            const now = new Date();

            const results = await Promise.all(
                skills.map((s: { name: string; version?: string; source?: string; publisher?: string; meta?: Record<string, unknown> }) =>
                    server.prisma.agentSkill.upsert({
                        where: { agentId_name: { agentId: ctx.agentId, name: s.name } },
                        create: {
                            agentId: ctx.agentId,
                            name: s.name,
                            version: s.version ?? null,
                            source: s.source ?? 'clawhub',
                            publisher: s.publisher ?? null,
                            meta: (s.meta ?? undefined) as any,
                            lastSeenAt: now,
                        },
                        update: {
                            version: s.version ?? undefined,
                            source: s.source ?? undefined,
                            publisher: s.publisher ?? undefined,
                            meta: (s.meta ?? undefined) as any,
                            lastSeenAt: now,
                        },
                    })
                )
            );

            return {
                synced: results.length,
                skills: results.map((r: any) => ({
                    name: r.name,
                    version: r.version,
                    source: r.source,
                    publisher: r.publisher,
                    lastSeenAt: r.lastSeenAt.toISOString(),
                })),
            };
        }
    );

    // ── POST /agents/me/skills/scan — verified skill scan from scan tool ──────
    const ScanBodySchema = z.object({
        platform: z.enum(['openclaw', 'cloudage', 'agentforge', 'claude', 'claude_code']),
        workspace: z.string().optional(),
        skills: z.array(z.object({
            name: z.string().min(1).max(500),
            version: z.string().max(20).optional(),
            path: z.string().optional(),
        })).min(1).max(200),
    });

    server.post(
        '/me/skills/scan',
        {
            schema: {
                tags: ['Agents'],
                summary: 'Report verified skills from scan tool (agent API key auth)',
                security: [{ bearerAuth: [] }],
                body: ScanBodySchema,
                response: {
                    200: z.object({
                        synced: z.number(),
                        verified: z.boolean(),
                        platform: z.string(),
                        scannedAt: z.string(),
                        skills: z.array(z.object({
                            name: z.string(),
                            version: z.string().nullable(),
                            verified: z.boolean(),
                            platform: z.string(),
                        })),
                    }),
                },
            },
        },
        async (request, reply) => {
            const ctx = await authenticateAgent(server as any, request, reply);
            if (!ctx) return;

            const { platform, skills } = request.body as { platform: string; skills: Array<{ name: string; version?: string; path?: string }> };
            const now = new Date();

            const results = await Promise.all(
                skills.map((s: { name: string; version?: string; path?: string }) =>
                    server.prisma.agentSkill.upsert({
                        where: { agentId_name: { agentId: ctx.agentId, name: s.name } },
                        create: {
                            agentId: ctx.agentId,
                            name: s.name,
                            version: s.version ?? null,
                            source: platform,
                            verified: true,
                            platform,
                            scannedAt: now,
                            lastSeenAt: now,
                        },
                        update: {
                            version: s.version ?? undefined,
                            verified: true,
                            platform,
                            scannedAt: now,
                            lastSeenAt: now,
                        },
                    })
                )
            );

            return {
                synced: results.length,
                verified: true,
                platform,
                scannedAt: now.toISOString(),
                skills: results.map((r: any) => ({
                    name: r.name,
                    version: r.version,
                    verified: r.verified,
                    platform: r.platform!,
                })),
            };
        }
    );

    // ── GET /agents/me/skills — list agent's installed skills ─────────────────
    server.get(
        '/me/skills',
        {
            schema: {
                tags: ['Agents'],
                summary: 'List agent installed skills (agent API key auth)',
                security: [{ bearerAuth: [] }],
                response: {
                    200: z.array(z.object({
                        name: z.string(),
                        version: z.string().nullable(),
                        source: z.string(),
                        publisher: z.string().nullable(),
                        meta: z.record(z.string(), z.unknown()).nullable(),
                        lastSeenAt: z.string(),
                        createdAt: z.string(),
                    })),
                },
            },
        },
        async (request, reply) => {
            const ctx = await authenticateAgent(server as any, request, reply);
            if (!ctx) return;

            const skills = await server.prisma.agentSkill.findMany({
                where: { agentId: ctx.agentId },
                orderBy: { name: 'asc' },
            });

            return skills.map(s => ({
                name: s.name,
                version: s.version,
                source: s.source,
                publisher: s.publisher,
                meta: s.meta ?? null,
                lastSeenAt: s.lastSeenAt.toISOString(),
                createdAt: s.createdAt.toISOString(),
            }));
        }
    );

    // ── GET /agents/:agentId/skills — public skill list ─────────────────────
    server.get(
        '/:agentId/skills',
        {
            schema: {
                tags: ['Agents'],
                summary: 'Get agent skills (public)',
                params: z.object({ agentId: z.string().uuid() }),
                response: {
                    200: z.object({
                        skills: z.array(z.object({
                            name: z.string(),
                            version: z.string().nullable(),
                            verified: z.boolean(),
                            platform: z.string().nullable(),
                            scannedAt: z.string().nullable(),
                        })),
                        lastScan: z.string().nullable(),
                    }),
                },
            },
        },
        async (request) => {
            const { agentId } = request.params as { agentId: string };
            const skills = await server.prisma.agentSkill.findMany({
                where: { agentId },
                orderBy: { name: 'asc' },
            });
            const lastScan = skills.reduce((latest: Date | null, s) => {
                if (s.scannedAt && (!latest || s.scannedAt > latest)) return s.scannedAt;
                return latest;
            }, null);
            return {
                skills: skills.map(s => ({
                    name: s.name,
                    version: s.version,
                    verified: s.verified,
                    platform: s.platform,
                    scannedAt: s.scannedAt?.toISOString() ?? null,
                })),
                lastScan: lastScan?.toISOString() ?? null,
            };
        }
    );

}
