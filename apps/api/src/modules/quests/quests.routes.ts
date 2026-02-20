import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { QuestSchema, QuestersResponseSchema, QUEST_STATUS, QUEST_TYPE } from '@clawquest/shared';

const CreateQuestSchema = QuestSchema.omit({
    id: true,
    createdAt: true,
    filledSlots: true,
    questers: true,
}).extend({
    expiresAt: z.string().datetime().optional(),
    tags: z.array(z.string()).default([]),
});

export async function questsRoutes(server: FastifyInstance) {
    // List Quests
    server.get(
        '/',
        {
            schema: {
                tags: ['Quests'],
                summary: 'List available quests',
                querystring: z.object({
                    status: z.nativeEnum(QUEST_STATUS).optional(),
                    type: z.nativeEnum(QUEST_TYPE).optional(),
                }),
                response: {
                    200: z.array(QuestSchema),
                },
            },
        },
        async (request, reply) => {
            const { status, type } = request.query as any;

            const where: any = {};
            if (status) where.status = status;
            else where.status = { not: 'draft' }; // As default, don't show drafts publicly

            if (type) where.type = type;

            const quests = await server.prisma.quest.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: { select: { participations: true } },
                    participations: {
                        take: 5,
                        include: {
                            agent: {
                                select: {
                                    name: true,
                                    owner: { select: { email: true } },
                                },
                            },
                        },
                        orderBy: { joinedAt: 'asc' },
                    },
                },
            });

            return quests.map(({ _count, participations, ...q }) => ({
                ...q,
                tags: q.tags ?? [],
                questers: _count.participations,
                questerNames: participations.map(p => p.agent.name),
                questerDetails: participations.map(p => ({
                    agentName: p.agent.name,
                    humanHandle: p.agent.owner.email.split('@')[0],
                })),
                expiresAt: q.expiresAt ? q.expiresAt.toISOString() : null,
                createdAt: q.createdAt.toISOString(),
            }));
        }
    );

    // Get Quest Details
    server.get(
        '/:id',
        {
            schema: {
                tags: ['Quests'],
                summary: 'Get quest details',
                params: z.object({ id: z.string().uuid() }),
                response: {
                    200: QuestSchema,
                },
            },
        },
        async (request, reply) => {
            const { id } = request.params as any;
            const quest = await server.prisma.quest.findUnique({
                where: { id },
                include: {
                    _count: { select: { participations: true } },
                    participations: {
                        take: 5,
                        include: {
                            agent: {
                                select: {
                                    name: true,
                                    owner: { select: { email: true } },
                                },
                            },
                        },
                        orderBy: { joinedAt: 'asc' },
                    },
                },
            });

            if (!quest) {
                return reply.status(404).send({ message: 'Quest not found', code: 'NOT_FOUND' } as any);
            }

            const { _count, participations, ...q } = quest;
            return {
                ...q,
                tags: q.tags ?? [],
                questers: _count.participations,
                questerNames: participations.map(p => p.agent.name),
                questerDetails: participations.map(p => ({
                    agentName: p.agent.name,
                    humanHandle: p.agent.owner.email.split('@')[0],
                })),
                expiresAt: q.expiresAt ? q.expiresAt.toISOString() : null,
                createdAt: q.createdAt.toISOString(),
            };
        }
    );

    // GET /:id/questers — paginated questers list
    server.get(
        '/:id/questers',
        {
            schema: {
                tags: ['Quests'],
                summary: 'List questers for a quest',
                params: z.object({ id: z.string().uuid() }),
                querystring: z.object({
                    page: z.coerce.number().min(1).default(1),
                    pageSize: z.coerce.number().min(1).max(100).default(10),
                    status: z.enum(['all', 'done', 'in_progress']).default('all'),
                }),
                response: { 200: QuestersResponseSchema },
            },
        },
        async (request, reply) => {
            const { id } = request.params as any;
            const { page, pageSize, status } = request.query as any;

            const quest = await server.prisma.quest.findUnique({ where: { id } });
            if (!quest) {
                return reply.status(404).send({ message: 'Quest not found', code: 'NOT_FOUND' } as any);
            }

            // Build participation filter
            const statusFilter = status === 'done'
                ? { status: { in: ['completed', 'submitted'] } }
                : status === 'in_progress'
                ? { status: { in: ['in_progress', 'failed'] } }
                : {};

            const [allParticipations, totalCount] = await Promise.all([
                server.prisma.questParticipation.findMany({
                    where: { questId: id, ...statusFilter },
                    include: { agent: { select: { name: true, owner: { select: { email: true } } } } },
                    orderBy: [{ completedAt: 'asc' }, { joinedAt: 'asc' }],
                    skip: (page - 1) * pageSize,
                    take: pageSize,
                }),
                server.prisma.questParticipation.count({ where: { questId: id, ...statusFilter } }),
            ]);

            // counts for filter bar (always over all, regardless of current filter)
            const [doneCount, inProgressCount] = await Promise.all([
                server.prisma.questParticipation.count({ where: { questId: id, status: { in: ['completed', 'submitted'] } } }),
                server.prisma.questParticipation.count({ where: { questId: id, status: { in: ['in_progress', 'failed'] } } }),
            ]);

            const tasksTotal = allParticipations[0]?.tasksTotal ?? 5;
            const offset = (page - 1) * pageSize;

            return {
                questId: quest.id,
                questTitle: quest.title,
                questType: quest.type as any,
                questRewardAmount: quest.rewardAmount,
                questRewardType: quest.rewardType,
                totalQuesters: doneCount + inProgressCount,
                doneQuesters: doneCount,
                inProgressQuesters: inProgressCount,
                tasksTotal,
                participations: allParticipations.map((p, i) => ({
                    id: p.id,
                    rank: offset + i + 1,
                    agentName: p.agent.name,
                    humanHandle: p.agent.owner.email.split('@')[0],
                    status: p.status as any,
                    tasksCompleted: p.tasksCompleted,
                    tasksTotal: p.tasksTotal,
                    payoutAmount: p.payoutAmount,
                    payoutStatus: p.payoutStatus as any,
                    joinedAt: p.joinedAt.toISOString(),
                    completedAt: p.completedAt ? p.completedAt.toISOString() : null,
                })),
                page,
                pageSize,
                totalPages: Math.ceil(totalCount / pageSize),
            };
        }
    );

    // Create Quest (Admin/Operator) - No auth for MVP/Stub
    server.post(
        '/',
        {
            schema: {
                tags: ['Quests'],
                summary: 'Create a new quest (Admin)',
                body: CreateQuestSchema,
                response: {
                    201: QuestSchema,
                },
            },
        },
        async (request, reply) => {
            const body = request.body as any;

            const quest = await server.prisma.quest.create({
                data: {
                    ...body,
                    status: body.status || 'draft',
                    filledSlots: 0,
                },
            });

            return reply.code(201).send(quest as any);
        }
    );

    // ── Accept Quest — supports both human JWT and agent API key ────────────────
    // Agent API key: Authorization: Bearer cq_<key> — agentId resolved from key
    // Human JWT:     Authorization: Bearer <jwt>    — agentId must be provided in body
    server.post(
        '/:id/accept',
        {
            schema: {
                tags: ['Quests'],
                summary: 'Accept a quest (human JWT or agent API key)',
                params: z.object({ id: z.string().uuid() }),
                body: z.object({ agentId: z.string().uuid().optional() }),
                response: {
                    200: z.object({ message: z.string(), participationId: z.string() }),
                },
            },
        },
        async (request, reply) => {
            const { id } = request.params as any;
            const auth = request.headers.authorization ?? '';
            let agentId: string;

            if (auth.startsWith('Bearer cq_')) {
                // Agent API key path — resolve agentId from key
                const apiKey = auth.slice(7);
                const agent = await server.prisma.agent.findUnique({
                    where: { agentApiKey: apiKey },
                    select: { id: true },
                });
                if (!agent) return reply.status(401).send({ message: 'Invalid agent API key' } as any);
                agentId = agent.id;
            } else {
                // Human Supabase token path — verify ownership
                try { await app.authenticate(request, reply); } catch { return reply.status(401).send({ message: 'Unauthorized' } as any); }
                const { agentId: bodyAgentId } = request.body as any;
                if (!bodyAgentId) return reply.status(400).send({ message: 'agentId required for human auth' } as any);
                const owned = await server.prisma.agent.findFirst({
                    where: { id: bodyAgentId, ownerId: (request as any).user.id },
                    select: { id: true },
                });
                if (!owned) return reply.status(403).send({ message: 'Agent not found or not owned by you' } as any);
                agentId = bodyAgentId;
            }

            const quest = await server.prisma.quest.findUnique({ where: { id } });
            if (!quest) return reply.status(404).send({ message: 'Quest not found' } as any);
            if (quest.status !== 'live') return reply.status(400).send({ message: 'Quest is not live' } as any);
            if (quest.filledSlots >= quest.totalSlots) return reply.status(400).send({ message: 'Quest is full' } as any);

            const existing = await server.prisma.questParticipation.findUnique({
                where: { questId_agentId: { questId: id, agentId } },
            });
            if (existing) return reply.status(400).send({ message: 'Agent already accepted this quest' } as any);

            const participation = await server.prisma.questParticipation.create({
                data: { questId: id, agentId, status: 'in_progress' },
            });

            await Promise.all([
                server.prisma.quest.update({ where: { id }, data: { filledSlots: { increment: 1 } } }),
                server.prisma.agent.update({ where: { id: agentId }, data: { status: 'questing' } }),
                server.prisma.agentLog.create({
                    data: { agentId, type: 'QUEST_START', message: `Accepted quest: ${quest.title}`, meta: { questId: id } },
                }),
            ]);

            return { message: 'Quest accepted', participationId: participation.id };
        }
    );

    // ── POST /quests/:id/proof — submit completion proof (agent API key) ──────
    // proof is a flexible JSON object — structure depends on quest task types:
    //   Social: { taskType: "follow_x", proofUrl: "https://x.com/..." }
    //   Agent:  { taskType: "skill_result", result: "..." }
    server.post(
        '/:id/proof',
        {
            schema: {
                tags: ['Quests'],
                summary: 'Submit quest completion proof (agent API key auth)',
                security: [{ bearerAuth: [] }],
                params: z.object({ id: z.string().uuid() }),
                body: z.object({
                    proof: z.array(z.object({
                        taskType: z.string(),
                        proofUrl: z.string().url().optional(),
                        result: z.string().optional(),
                        meta: z.record(z.any()).optional(),
                    })).min(1),
                }),
                response: {
                    200: z.object({
                        message: z.string(),
                        participationId: z.string(),
                        status: z.string(),
                    }),
                },
            },
        },
        async (request, reply) => {
            const auth = request.headers.authorization ?? '';
            if (!auth.startsWith('Bearer cq_')) {
                return reply.status(401).send({ error: 'Agent API key required' } as any);
            }
            const apiKey = auth.slice(7);
            const agent = await server.prisma.agent.findUnique({
                where: { agentApiKey: apiKey },
                select: { id: true },
            });
            if (!agent) return reply.status(401).send({ error: 'Invalid agent API key' } as any);

            const { id: questId } = request.params as any;
            const { proof } = request.body as any;

            const participation = await server.prisma.questParticipation.findUnique({
                where: { questId_agentId: { questId, agentId: agent.id } },
            });
            if (!participation) return reply.status(404).send({ error: 'No active participation for this quest' } as any);
            if (participation.status === 'completed') return reply.status(400).send({ error: 'Quest already completed' } as any);

            const updated = await server.prisma.questParticipation.update({
                where: { id: participation.id },
                data: {
                    proof,
                    status: 'submitted',
                    tasksCompleted: proof.length,
                    completedAt: new Date(),
                },
            });

            await server.prisma.agentLog.create({
                data: {
                    agentId: agent.id,
                    type: 'QUEST_COMPLETE',
                    message: `Submitted proof for quest`,
                    meta: { questId, participationId: participation.id, proofCount: proof.length },
                },
            });

            return {
                message: '✅ Proof submitted. Awaiting operator verification.',
                participationId: updated.id,
                status: updated.status,
            };
        }
    );
}
