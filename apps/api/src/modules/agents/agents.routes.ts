import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { CreateAgentSchema, AgentSchema } from '@clawquest/shared';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { verifyTweet } from '../x/x-rapidapi-client';

// ─── Helper ──────────────────────────────────────────────────────────────────

function generateAgentApiKey(): string {
    return 'cq_' + randomBytes(24).toString('hex'); // e.g. cq_a3f9b2...
}

// ─── Agent Auth Helper ────────────────────────────────────────────────────────
// Agents authenticate with "Authorization: Bearer cq_<key>" — separate from human JWT.
// Returns { agentId, ownerId } or sends 401 and returns null.

async function authenticateAgent(
    server: FastifyInstance & { prisma: any },
    request: FastifyRequest,
    reply: FastifyReply
): Promise<{ agentId: string; ownerId: string | null } | null | undefined> {
    const auth = request.headers.authorization;
    if (!auth?.startsWith('Bearer cq_')) {
        reply.status(401).send({ error: 'Missing or invalid agent API key' });
        return null;
    }
    const apiKey = auth.slice(7); // strip "Bearer "
    const agent = await server.prisma.agent.findUnique({
        where: { agentApiKey: apiKey },
        select: { id: true, ownerId: true, isActive: true },
    });
    if (!agent) {
        reply.status(401).send({ error: 'Invalid agent API key' });
        return null;
    }
    // Block inactive agents — only the active agent per user can call APIs
    if (agent.ownerId && !agent.isActive) {
        reply.status(403).send({ error: 'This agent is not active. Ask your human owner to activate it on the Dashboard.' });
        return null;
    }
    return { agentId: agent.id, ownerId: agent.ownerId as string | null };
}

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
                activationCode: a.activationCode ?? undefined,
                agentApiKey: a.agentApiKey ?? undefined,
                verificationToken: a.verificationToken ?? undefined,
                verificationExpiresAt: a.verificationExpiresAt?.toISOString() ?? undefined,
                claimedAt: a.claimedAt?.toISOString() ?? undefined,
                claimedVia: a.claimedVia ?? undefined,
                claimEmail: a.claimEmail ?? undefined,
                createdAt: a.createdAt.toISOString(),
                updatedAt: a.updatedAt.toISOString(),
            }));
        }
    );

    // ── Create Agent (human JWT) ──────────────────────────────────────────────
    server.post(
        '/',
        {
            onRequest: [app.authenticate],
            schema: {
                tags: ['Agents'],
                summary: 'Create a new agent',
                security: [{ bearerAuth: [] }],
                body: CreateAgentSchema,
                response: { 201: AgentSchema },
            },
        },
        async (request, reply) => {
            const { agentname } = request.body as { agentname: string };
            const agent = await server.prisma.agent.create({
                data: {
                    agentname,
                    ownerId: request.user.id,
                    activationCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
                },
            });
            return reply.code(201).send({
                id: agent.id,
                agentname: agent.agentname,
                status: agent.status as any,
                ownerId: agent.ownerId,
                isActive: agent.isActive,
                activationCode: agent.activationCode ?? undefined,
                agentApiKey: agent.agentApiKey ?? undefined,
                verificationToken: agent.verificationToken ?? undefined,
                verificationExpiresAt: agent.verificationExpiresAt?.toISOString() ?? undefined,
                claimedAt: agent.claimedAt?.toISOString() ?? undefined,
                claimedVia: agent.claimedVia ?? undefined,
                claimEmail: agent.claimEmail ?? undefined,
                createdAt: agent.createdAt.toISOString(),
                updatedAt: agent.updatedAt.toISOString(),
            });
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
                activationCode: agent.activationCode ?? undefined,
                agentApiKey: agent.agentApiKey ?? undefined,
                verificationToken: agent.verificationToken ?? undefined,
                verificationExpiresAt: agent.verificationExpiresAt?.toISOString() ?? undefined,
                claimedAt: agent.claimedAt?.toISOString() ?? undefined,
                claimedVia: agent.claimedVia ?? undefined,
                claimEmail: agent.claimEmail ?? undefined,
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

            // Verify ownership and must be claimed
            const agent = await server.prisma.agent.findFirst({
                where: { id, ownerId: userId },
                select: { id: true, claimedAt: true, agentname: true },
            });
            if (!agent) return reply.status(404).send({ error: 'Agent not found or not owned by you' } as any);
            if (!agent.claimedAt) return reply.status(400).send({ error: 'Agent must be claimed before activating' } as any);

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

    // ── POST /agents/register — agent exchanges activationCode for agentApiKey ─
    // No auth required. The activationCode IS the one-time credential.
    // Human creates agent on Dashboard → copies activationCode → gives to their agent.
    // Agent calls this endpoint once → receives agentApiKey (store in ~/.clawquest/credentials.json).
    server.post(
        '/register',
        {
            schema: {
                tags: ['Agents'],
                summary: 'Exchange activation code for agent API key (no auth required)',
                body: z.object({
                    activationCode: z.string().min(4).max(12),
                    agentname: z.string().min(1).max(50).optional(),
                }),
                response: {
                    200: z.object({
                        agentId: z.string().uuid(),
                        agentApiKey: z.string(),
                        agentname: z.string(),
                        ownerId: z.string().uuid(),
                        message: z.string(),
                    }),
                },
            },
        },
        async (request, reply) => {
            const { activationCode, agentname } = request.body as { activationCode: string; agentname?: string };

            const agent = await server.prisma.agent.findUnique({
                where: { activationCode: activationCode.toUpperCase() },
            });

            if (!agent) {
                return reply.status(404).send({ error: 'Invalid or expired activation code' } as any);
            }

            // Issue a fresh agentApiKey, consume the activationCode
            const agentApiKey = generateAgentApiKey();

            const updated = await server.prisma.agent.update({
                where: { id: agent.id },
                data: {
                    agentApiKey,
                    activationCode: null, // one-time use — clear it
                    ...(agentname ? { agentname } : {}),
                },
            });

            await server.prisma.agentLog.create({
                data: {
                    agentId: agent.id,
                    type: 'INFO',
                    message: 'Agent registered via activation code',
                    meta: { method: 'activation_code' },
                },
            });

            return {
                agentId: updated.id,
                agentApiKey,
                agentname: updated.agentname,
                ownerId: updated.ownerId,
                message: `✅ Agent "${updated.agentname}" registered. Store agentApiKey safely — it won't be shown again.`,
            };
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

    // ── POST /agents/self-register — agent-first registration (no auth) ─────
    // Agent calls this to create itself, gets agentApiKey + claim URL for human.
    // Human visits claimUrl → enters verificationCode → claims the agent.
    server.post(
        '/self-register',
        {
            schema: {
                tags: ['Agents'],
                summary: 'Agent self-registration (no auth required)',
                body: z.object({
                    agentname: z.string().min(1).max(50).optional(),
                    platform: z.string().max(50).optional(),
                }),
                response: {
                    201: z.object({
                        agentId: z.string().uuid(),
                        agentApiKey: z.string(),
                        verificationToken: z.string(),
                        claimUrl: z.string(),
                        verificationCode: z.string(),
                        telegramDeeplink: z.string(),
                        message: z.string(),
                    }),
                },
            },
        },
        async (request, reply) => {
            const { agentname, platform } = request.body as { agentname?: string; platform?: string };
            const resolvedName = agentname || `agent-${randomBytes(3).toString('hex')}`;

            const agentApiKey = generateAgentApiKey();
            const verificationToken = 'agent_' + randomBytes(32).toString('hex');
            const verificationExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h

            const agent = await server.prisma.agent.create({
                data: {
                    agentname: resolvedName,
                    ownerId: null,
                    agentApiKey,
                    verificationToken,
                    verificationExpiresAt,
                },
            });

            await server.prisma.agentLog.create({
                data: {
                    agentId: agent.id,
                    type: 'INFO',
                    message: 'Agent self-registered, awaiting human claim',
                    meta: { method: 'self-register', platform: platform ?? null },
                },
            });

            const frontendUrl = process.env.FRONTEND_URL || 'https://clawquest.ai';
            const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'ClawQuest_aibot';
            const claimUrl = `${frontendUrl}/verify?token=${verificationToken}`;
            const verificationCode = verificationToken.slice(0, 8);
            const telegramDeeplink = `https://t.me/${botUsername}?start=${verificationToken}`;

            return reply.code(201).send({
                agentId: agent.id,
                agentApiKey,
                verificationToken,
                claimUrl,
                verificationCode,
                telegramDeeplink,
                message: `Agent "${resolvedName}" created. Share the claim URL and verification code with your human owner. Store agentApiKey safely.`,
            });
        }
    );

    // ── GET /agents/verify/:token — get agent info by verification token (public) ─────
    server.get(
        '/verify/:token',
        {
            schema: {
                tags: ['Agents'],
                summary: 'Get agent info by verification token (public)',
                params: z.object({
                    token: z.string().min(1),
                }),
                response: {
                    200: z.object({
                        display_name: z.string(),
                        verification_code: z.string(),
                    }),
                },
            },
        },
        async (request, reply) => {
            const { token } = request.params as { token: string };

            const agent = await server.prisma.agent.findUnique({
                where: { verificationToken: token },
                select: {
                    agentname: true,
                    verificationToken: true,
                    verificationExpiresAt: true,
                    ownerId: true,
                },
            });

            if (!agent) {
                return reply.status(404).send({ error: 'Invalid verification token' } as any);
            }

            if (agent.ownerId) {
                return reply.status(400).send({ error: 'Agent already claimed' } as any);
            }

            if (agent.verificationExpiresAt && agent.verificationExpiresAt < new Date()) {
                return reply.status(410).send({ error: 'Verification token expired' } as any);
            }

            const verificationCode = agent.verificationToken?.slice(0, 8) || '';

            return {
                display_name: agent.agentname,
                verification_code: verificationCode,
            };
        }
    );

    // ── POST /agents/verify — human claims an agent (human JWT) ─────────────
    server.post(
        '/verify',
        {
            onRequest: [app.authenticate],
            schema: {
                tags: ['Agents'],
                summary: 'Claim a self-registered agent (human JWT)',
                security: [{ bearerAuth: [] }],
                body: z.object({
                    verificationToken: z.string().min(1),
                    verify_tweet_url: z.string().url().optional(),
                }),
                response: {
                    200: z.object({
                        agentId: z.string().uuid(),
                        agentname: z.string(),
                        message: z.string(),
                    }),
                },
            },
        },
        async (request, reply) => {
            const { verificationToken, verify_tweet_url } = request.body as { verificationToken: string; verify_tweet_url?: string };

            const agent = await server.prisma.agent.findUnique({
                where: { verificationToken },
            });

            if (!agent) {
                return reply.status(404).send({ error: 'Invalid or expired verification token' } as any);
            }

            if (agent.ownerId) {
                return reply.status(400).send({ error: 'Agent already claimed' } as any);
            }

            if (agent.verificationExpiresAt && agent.verificationExpiresAt < new Date()) {
                return reply.status(410).send({ error: 'Verification token expired' } as any);
            }

            // If verify_tweet_url is provided, verify via X (RapidAPI — no OAuth tokens needed)
            if (verify_tweet_url) {
                const verificationCode = verificationToken.slice(0, 8);

                const result = await verifyTweet(verify_tweet_url, { verificationCode });

                if (!result.verified) {
                    const status = result.reason === 'Tweet not found' ? 404
                        : result.reason?.includes('Rate limit') ? 429
                            : 400;
                    return reply.status(status).send({ error: result.reason } as any);
                }
            }

            const updated = await server.prisma.agent.update({
                where: { id: agent.id },
                data: {
                    ownerId: request.user.id,
                    verificationToken: null,
                    verificationExpiresAt: null,
                    claimedAt: new Date(),
                    claimedVia: verify_tweet_url ? 'x' : 'supabase',
                },
            });

            await server.prisma.agentLog.create({
                data: {
                    agentId: agent.id,
                    type: 'INFO',
                    message: `Agent claimed by ${request.user.email}${verify_tweet_url ? ' via X verification' : ''}`,
                    meta: {
                        method: verify_tweet_url ? 'x_verification' : 'verification',
                        userId: request.user.id,
                        verify_tweet_url: verify_tweet_url || undefined,
                    },
                },
            });

            return {
                agentId: updated.id,
                agentname: updated.agentname,
                message: `Agent "${updated.agentname}" is now yours!`,
            };
        }
    );
}
