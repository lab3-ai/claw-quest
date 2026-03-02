import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { QuestSchema, QuestTaskSchema, QuestersResponseSchema, QUEST_STATUS, QUEST_TYPE } from '@clawquest/shared';
import type { QuestTask } from '@clawquest/shared';
import {
    validateTaskParams,
    createQuest,
    updateQuest,
    formatQuestResponse,
    isValidTransition,
    isQuestCreatorOrAdmin,
    verifyParticipation,
    bulkVerifyParticipations,
    QuestValidationError,
    QuestNotFoundError,
    QuestNotEditableError,
    QuestForbiddenError,
} from './quests.service';
import { validatePublishRequirements } from './quests.publish-validator';

const CreateQuestSchema = QuestSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    filledSlots: true,
    questers: true,
    questerNames: true,
    questerDetails: true,
}).extend({
    description: z.string().default(''),
    sponsor: z.string().default('System'),
    status: z.nativeEnum(QUEST_STATUS).default(QUEST_STATUS.DRAFT),
    rewardAmount: z.number().default(0),
    startAt: z.string().datetime().optional(),
    expiresAt: z.string().datetime().optional(),
    tags: z.array(z.string()).default([]),
    tasks: z.array(QuestTaskSchema).default([]),
    requiredSkills: z.array(z.string()).default([]),
    network: z.string().optional(),
    drawTime: z.string().datetime().optional(),
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
                    limit: z.coerce.number().int().min(1).max(100).default(50),
                    offset: z.coerce.number().int().min(0).default(0),
                }),
                response: {
                    200: z.array(QuestSchema),
                },
            },
        },
        async (request, reply) => {
            const { status, type, limit, offset } = request.query as any;

            const where: any = {};
            if (status) where.status = status;
            else where.status = { not: 'draft' }; // As default, don't show drafts publicly

            if (type) where.type = type;

            const quests = await server.prisma.quest.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
                include: {
                    _count: { select: { participations: true } },
                    participations: {
                        take: 5,
                        select: {
                            agent: {
                                select: {
                                    agentname: true,
                                    owner: { select: { email: true, username: true } },
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
                requiredSkills: (q as any).requiredSkills ?? [],
                tasks: (q.tasks as any) ?? [],
                questers: _count.participations,
                questerNames: participations.map(p => p.agent.agentname),
                questerDetails: participations.map(p => ({
                    agentName: p.agent.agentname,
                    humanHandle: p.agent.owner?.username ?? p.agent.owner?.email?.split('@')[0] ?? 'unclaimed',
                })),
                drawTime: q.drawTime ? q.drawTime.toISOString() : null,
                startAt: q.startAt ? q.startAt.toISOString() : null,
                expiresAt: q.expiresAt ? q.expiresAt.toISOString() : null,
                createdAt: q.createdAt.toISOString(),
                updatedAt: q.updatedAt.toISOString(),
            }));
        }
    );

    // Get Quest Details — supports token-based draft preview
    server.get(
        '/:id',
        {
            schema: {
                tags: ['Quests'],
                summary: 'Get quest details (supports draft preview via token)',
                params: z.object({ id: z.string().uuid() }),
                querystring: z.object({
                    token: z.string().optional(),
                }).optional(),
                response: {
                    200: QuestSchema.extend({
                        isPreview: z.boolean().optional(),
                        fundingRequired: z.boolean().optional(),
                        previewToken: z.string().optional(),
                        fundUrl: z.string().optional(),
                        creatorUserId: z.string().nullable().optional(),
                        fundingMethod: z.string().nullable().optional(),
                        myParticipation: z.object({
                            id: z.string(),
                            status: z.string(),
                            payoutWallet: z.string().nullable(),
                            payoutStatus: z.string().nullable(),
                            payoutAmount: z.number().nullable(),
                            payoutTxHash: z.string().nullable(),
                        }).optional(),
                    }),
                },
            },
        },
        async (request, reply) => {
            const { id } = request.params as any;
            const { token } = (request.query as any) ?? {};

            const quest = await server.prisma.quest.findUnique({
                where: { id },
                include: {
                    _count: { select: { participations: true } },
                    participations: {
                        take: 5,
                        include: {
                            agent: {
                                select: {
                                    agentname: true,
                                    owner: { select: { email: true, username: true } },
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

            // Draft access control: require token or creator auth
            if (quest.status === 'draft') {
                let hasAccess = false;

                // Check preview token
                if (token && quest.previewToken === token) {
                    hasAccess = true;
                }

                // Check if authenticated creator (optional — don't fail if no auth)
                if (!hasAccess) {
                    const authHeader = request.headers.authorization;
                    if (authHeader?.startsWith('Bearer ') && !authHeader.startsWith('Bearer cq_')) {
                        try {
                            await (server as any).authenticate(request, reply);
                            const user = (request as any).user;
                            if (user?.id && quest.creatorUserId === user.id) {
                                hasAccess = true;
                            }
                        } catch {
                            // Not authenticated — that's fine, just check token
                        }
                    }
                }

                if (!hasAccess) {
                    return reply.status(404).send({ message: 'Quest not found', code: 'NOT_FOUND' } as any);
                }

                // Return with preview flags
                const { _count, participations, ...q } = quest;
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
                return {
                    ...formatQuestResponse(q, participations, _count.participations),
                    isPreview: true,
                    fundingRequired: quest.fundingStatus === 'unfunded',
                    previewToken: quest.previewToken,
                    fundUrl: `${frontendUrl}/quests/${quest.id}/fund`,
                };
            }

            // Public quest (live, completed, etc.)
            const { _count, participations, ...q } = quest;
            const response: any = formatQuestResponse(q, participations, _count.participations);

            // Include user's participation if authenticated
            const authHeader = request.headers.authorization;
            if (authHeader?.startsWith('Bearer ') && !authHeader.startsWith('Bearer cq_')) {
                try {
                    await (server as any).authenticate(request, reply);
                    const user = (request as any).user;
                    if (user?.id) {
                        const userAgents = await server.prisma.agent.findMany({
                            where: { ownerId: user.id },
                            select: { id: true },
                        });
                        const agentIds = userAgents.map((a: any) => a.id);
                        if (agentIds.length > 0) {
                            const myParticipation = await server.prisma.questParticipation.findFirst({
                                where: {
                                    questId: id,
                                    agentId: { in: agentIds },
                                },
                                orderBy: { joinedAt: 'desc' },
                            });
                            if (myParticipation) {
                                response.myParticipation = {
                                    id: myParticipation.id,
                                    status: myParticipation.status,
                                    payoutWallet: myParticipation.payoutWallet,
                                    payoutStatus: myParticipation.payoutStatus,
                                    payoutAmount: myParticipation.payoutAmount,
                                    payoutTxHash: myParticipation.payoutTxHash,
                                };
                            }
                        }
                    }
                } catch {
                    // Not authenticated — that's fine, return without myParticipation
                }
            }

            return response;
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
                    include: { agent: { select: { agentname: true, owner: { select: { email: true, username: true } } } } },
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
                    agentName: p.agent.agentname,
                    humanHandle: p.agent.owner?.username ?? p.agent.owner?.email?.split('@')[0] ?? 'unclaimed',
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

    // ── Skill Preview (proxy fetch + parse) ────────────────────────────────────
    server.get(
        '/skill-preview',
        {
            schema: {
                tags: ['Quests'],
                summary: 'Preview a skill from an external URL',
                querystring: z.object({ url: z.string().url() }),
                response: {
                    200: z.object({
                        name: z.string(),
                        desc: z.string(),
                        version: z.string(),
                        url: z.string(),
                    }),
                },
            },
        },
        async (request, reply) => {
            const { url } = request.query as { url: string };

            // SSRF guard: only http/https
            const parsed = new URL(url);
            if (!['http:', 'https:'].includes(parsed.protocol)) {
                return reply.status(400).send({ message: 'Only HTTP/HTTPS URLs are allowed' } as any);
            }

            // Convert GitHub blob URLs to raw
            let rawUrl = url;
            const ghMatch = url.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)$/);
            if (ghMatch) rawUrl = `https://raw.githubusercontent.com/${ghMatch[1]}/${ghMatch[2]}/${ghMatch[3]}`;

            let text: string;
            try {
                const res = await fetch(rawUrl, { signal: AbortSignal.timeout(8000) });
                if (!res.ok) return reply.status(400).send({ message: `Fetch failed: ${res.status}` } as any);
                text = await res.text();
            } catch {
                return reply.status(400).send({ message: 'Could not fetch URL' } as any);
            }

            let name = 'Custom Skill';
            let desc = '';
            let version = '0.0.0';

            // ── HTML response: extract from structured data, meta tags + body ──
            const isHtml = text.trimStart().startsWith('<!') || text.trimStart().startsWith('<html');
            if (isHtml) {
                // 1. Name: prefer <h1> (cleanest), fall back to <title>
                const h1Match = text.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
                if (h1Match) {
                    name = h1Match[1].replace(/<[^>]+>/g, '').trim();
                }
                if (name === 'Custom Skill') {
                    const titleMatch = text.match(/<title[^>]*>([^<]+)<\/title>/i);
                    if (titleMatch) name = titleMatch[1].replace(/\s+(?:[-–|]|by)\s+.*$/, '').trim();
                }

                // 2. JSON-LD structured data (most reliable when present)
                const jsonLdBlocks = [...text.matchAll(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
                for (const block of jsonLdBlocks) {
                    try {
                        const ld = JSON.parse(block[1]);
                        const items = Array.isArray(ld) ? ld : [ld];
                        for (const item of items) {
                            if (item.description && typeof item.description === 'string') {
                                desc = item.description.slice(0, 350);
                                if (item.name && typeof item.name === 'string') name = item.name;
                                if (item.version && typeof item.version === 'string') version = item.version;
                                break;
                            }
                        }
                        if (desc) break;
                    } catch { /* invalid JSON-LD, skip */ }
                }

                if (desc) {
                    if (name === 'Custom Skill') {
                        const pathSegments = parsed.pathname.split('/').filter(Boolean);
                        if (pathSegments.length > 0) name = pathSegments[pathSegments.length - 1];
                    }
                    return { name, desc, version, url };
                }

                // 3. Extract body content after the last <h1> (where actual content lives)
                let substantialText = '';

                // 3a. Find text after the last </h1> — most specific content heading
                const lastH1End = text.lastIndexOf('</h1>');
                if (lastH1End >= 0) {
                    const afterH1 = text.slice(lastH1End + 5)
                        .replace(/<script[\s\S]*?<\/script>/gi, '')
                        .replace(/<style[\s\S]*?<\/style>/gi, '')
                        .replace(/<[^>]+>/g, ' ')
                        .replace(/\s+/g, ' ')
                        .trim();
                    if (afterH1.length >= 30) substantialText = afterH1.slice(0, 350);
                }

                // 3b. Fallback: strip all boilerplate, take first prose sentence
                if (!substantialText) {
                    const bodyText = text
                        .replace(/<script[\s\S]*?<\/script>/gi, '')
                        .replace(/<style[\s\S]*?<\/style>/gi, '')
                        .replace(/<nav[\s\S]*?<\/nav>/gi, '')
                        .replace(/<header[\s\S]*?<\/header>/gi, '')
                        .replace(/<footer[\s\S]*?<\/footer>/gi, '')
                        .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
                        .replace(/<[^>]+>/g, ' ')
                        .replace(/\s+/g, ' ')
                        .trim();
                    substantialText = bodyText.slice(0, 350);
                }

                // 4. Extract meta description
                const metaDescMatch = text.match(
                    /<meta\s+(?:name|property)=["'](?:description|og:description)["']\s+content=["']([^"']+)["']/i
                ) || text.match(
                    /<meta\s+content=["']([^"']+)["']\s+(?:name|property)=["'](?:description|og:description)["']/i
                );
                const metaDesc = metaDescMatch ? metaDescMatch[1].trim() : '';

                // 5. Detect generic meta (site-wide boilerplate)
                let metaIsGeneric = false;
                if (metaDesc) {
                    const nameWords = name.toLowerCase().split(/[\s\-_]+/).filter(w => w.length >= 4);
                    const metaLower = metaDesc.toLowerCase();
                    const nameInMeta = nameWords.length > 0 && nameWords.some(w => metaLower.includes(w));

                    metaIsGeneric = metaDesc.length < 100
                        && !nameInMeta
                        && substantialText.length > metaDesc.length;
                }

                // 6. Choose best description: specific meta > body text > generic meta > raw body
                if (metaDesc && !metaIsGeneric) {
                    desc = metaDesc.slice(0, 350);
                } else if (substantialText) {
                    desc = substantialText.slice(0, 350);
                } else if (metaDesc) {
                    desc = metaDesc.slice(0, 350);
                } else {
                    desc = bodyText.slice(0, 350);
                }

                // 7. Name fallback from URL path
                if (name === 'Custom Skill') {
                    const pathSegments = parsed.pathname.split('/').filter(Boolean);
                    if (pathSegments.length > 0) name = pathSegments[pathSegments.length - 1];
                }

                return { name, desc, version, url };
            }

            // ── Raw text/markdown: parse YAML frontmatter ────────────────────
            const fmMatch = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
            if (fmMatch) {
                const lines = fmMatch[1].split('\n');
                let currentKey = '';
                const entries: Record<string, string> = {};
                for (const line of lines) {
                    if (/^\s+/.test(line) && currentKey) {
                        const cont = line.trim();
                        if (cont && cont !== '>' && cont !== '|') {
                            entries[currentKey] = entries[currentKey] === '>' || entries[currentKey] === '|'
                                ? cont : entries[currentKey] + ' ' + cont;
                        }
                        continue;
                    }
                    const idx = line.indexOf(':');
                    if (idx > 0) {
                        const key = line.slice(0, idx).trim();
                        const val = line.slice(idx + 1).trim();
                        if (key) { currentKey = key; entries[key] = val || ''; }
                    }
                }
                if (entries.name) name = entries.name;
                if (entries.description) desc = entries.description;
                if (entries.version) version = entries.version;
            }

            if (!desc) desc = text.replace(/^---[\s\S]*?---\s*/, '').slice(0, 350);
            else desc = desc.slice(0, 350);

            return { name, desc, version, url };
        }
    );

    // Create Quest — supports agent API key, human JWT, or no auth (MVP)
    server.post(
        '/',
        {
            schema: {
                tags: ['Quests'],
                summary: 'Create a new quest',
                body: CreateQuestSchema,
                response: {
                    201: QuestSchema.extend({
                        telegramDeeplink: z.string().optional(),
                        claimToken: z.string().optional(),
                        previewToken: z.string().optional(),
                        previewUrl: z.string().optional(),
                        fundUrl: z.string().optional(),
                    }),
                },
            },
        },
        async (request, reply) => {
            const body = request.body as any;
            const auth = request.headers.authorization ?? '';

            // Resolve creator identity
            const creator: { agentId?: string; userId?: string; email?: string } = {};

            if (auth.startsWith('Bearer cq_')) {
                // Agent API key → set creatorAgentId
                const apiKey = auth.slice(7);
                const agent = await server.prisma.agent.findUnique({
                    where: { agentApiKey: apiKey },
                    select: { id: true },
                });
                if (!agent) return reply.status(401).send({ message: 'Invalid agent API key' } as any);
                creator.agentId = agent.id;
            } else if (auth.startsWith('Bearer ') && !auth.startsWith('Bearer cq_')) {
                // Try human JWT
                try {
                    await (server as any).authenticate(request, reply);
                    const user = (request as any).user;
                    if (user?.id) {
                        creator.userId = user.id;
                        creator.email = user.email;
                    }
                } catch {
                    // No auth is OK for MVP — quest created without owner
                }
            }

            try {
                const result = await createQuest(server.prisma, body, creator);

                return reply.code(201).send({
                    ...formatQuestResponse(result.quest),
                    telegramDeeplink: result.telegramDeeplink,
                    claimToken: result.claimToken,
                    previewToken: result.previewToken,
                    previewUrl: result.previewUrl,
                    fundUrl: result.fundUrl,
                } as any);
            } catch (err: any) {
                if (err instanceof QuestValidationError) {
                    return reply.status(400).send({ message: err.message, code: err.code } as any);
                }
                throw err;
            }
        }
    );

    // ── Claim Quest Ownership (human JWT auth) ──────────────────────────────────
    server.post(
        '/claim',
        {
            schema: {
                tags: ['Quests'],
                summary: 'Claim quest ownership via claim token (human JWT)',
                security: [{ bearerAuth: [] }],
                body: z.object({
                    claimToken: z.string().min(1),
                }),
                response: {
                    200: z.object({
                        questId: z.string(),
                        title: z.string(),
                        message: z.string(),
                    }),
                },
            },
            onRequest: [server.authenticate],
        },
        async (request, reply) => {
            const { claimToken } = request.body as any;

            const quest = await server.prisma.quest.findUnique({
                where: { claimToken },
            });

            if (!quest) {
                return reply.status(404).send({ error: 'Invalid or expired claim token' } as any);
            }

            if (quest.claimedAt) {
                return reply.status(400).send({ error: 'Quest already claimed' } as any);
            }

            if (quest.claimTokenExpiresAt && quest.claimTokenExpiresAt < new Date()) {
                return reply.status(410).send({ error: 'Claim token expired' } as any);
            }

            const updated = await server.prisma.quest.update({
                where: { id: quest.id },
                data: {
                    creatorUserId: (request as any).user.id,
                    creatorEmail: (request as any).user.email,
                    claimedAt: new Date(),
                    claimToken: null,
                    claimTokenExpiresAt: null,
                },
            });

            return {
                questId: updated.id,
                title: updated.title,
                message: `Quest "${updated.title}" is now yours!`,
            };
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

            // ── Skill Gate: check agent has all required skills ─────────────
            const requiredSkills = (quest as any).requiredSkills as string[] ?? [];
            if (requiredSkills.length > 0) {
                const agentSkills = await server.prisma.agentSkill.findMany({
                    where: { agentId, name: { in: requiredSkills } },
                    select: { name: true },
                });
                const agentSkillNames = new Set(agentSkills.map(s => s.name));
                const missingSkills = requiredSkills.filter(s => !agentSkillNames.has(s));

                if (missingSkills.length > 0) {
                    return reply.status(403).send({
                        message: `Agent is missing required skills: ${missingSkills.join(', ')}. Report your skills via POST /agents/me/skills before accepting this quest.`,
                        missingSkills,
                        requiredSkills,
                    } as any);
                }
            }

            const existing = await server.prisma.questParticipation.findUnique({
                where: { questId_agentId: { questId: id, agentId } },
            });
            if (existing) return reply.status(400).send({ message: 'Agent already accepted this quest' } as any);

            // Calculate actual task count from quest tasks + required skills
            const questTasks = (quest.tasks as any[]) ?? [];
            const tasksTotal = questTasks.length + requiredSkills.length;

            const participation = await server.prisma.questParticipation.create({
                data: { questId: id, agentId, status: 'in_progress', tasksTotal: tasksTotal || 5 },
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
                        meta: z.record(z.unknown()).optional(),
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

    // ── PATCH /quests/:id — Edit quest (draft only, creator auth) ────────────
    server.patch(
        '/:id',
        {
            schema: {
                tags: ['Quests'],
                summary: 'Edit a draft quest (creator only)',
                security: [{ bearerAuth: [] }],
                params: z.object({ id: z.string().uuid() }),
                body: z.object({
                    title: z.string().min(1).optional(),
                    description: z.string().optional(),
                    sponsor: z.string().optional(),
                    type: z.nativeEnum(QUEST_TYPE).optional(),
                    rewardAmount: z.number().min(0).optional(),
                    rewardType: z.string().optional(),
                    totalSlots: z.number().min(1).optional(),
                    tags: z.array(z.string()).optional(),
                    requiredSkills: z.array(z.string()).optional(),
                    tasks: z.array(QuestTaskSchema).optional(),
                    expiresAt: z.string().datetime().nullable().optional(),
                    network: z.string().optional(),
                    drawTime: z.string().datetime().nullable().optional(),
                    startAt: z.string().datetime().nullable().optional(),
                }),
                response: {
                    200: QuestSchema,
                },
            },
            onRequest: [server.authenticate],
        },
        async (request, reply) => {
            const { id } = request.params as any;
            const body = request.body as any;
            const userId = (request as any).user?.id;

            try {
                const updated = await updateQuest(server.prisma, id, userId, body);
                return formatQuestResponse(updated);
            } catch (err: any) {
                if (err instanceof QuestNotFoundError) return reply.status(404).send({ message: err.message, code: err.code } as any);
                if (err instanceof QuestNotEditableError) return reply.status(400).send({ message: err.message, code: err.code } as any);
                if (err instanceof QuestForbiddenError) return reply.status(403).send({ message: err.message, code: err.code } as any);
                if (err instanceof QuestValidationError) return reply.status(400).send({ message: err.message, code: err.code } as any);
                throw err;
            }
        }
    );

    // ── PATCH /quests/:id/status — Status transitions ────────────────────────
    server.patch(
        '/:id/status',
        {
            schema: {
                tags: ['Quests'],
                summary: 'Transition quest status (creator or system)',
                security: [{ bearerAuth: [] }],
                params: z.object({ id: z.string().uuid() }),
                body: z.object({
                    status: z.string(),
                    reason: z.string().optional(),
                }),
                response: {
                    200: z.object({
                        questId: z.string(),
                        previousStatus: z.string(),
                        newStatus: z.string(),
                        message: z.string(),
                    }),
                },
            },
            onRequest: [server.authenticate],
        },
        async (request, reply) => {
            const { id } = request.params as any;
            const { status: newStatus, reason } = request.body as any;
            const userId = (request as any).user?.id;

            const quest = await server.prisma.quest.findUnique({ where: { id } });
            if (!quest) return reply.status(404).send({ message: 'Quest not found' } as any);
            if (quest.creatorUserId !== userId) return reply.status(403).send({ message: 'Not quest creator' } as any);

            if (!isValidTransition(quest.status, newStatus)) {
                return reply.status(400).send({
                    message: `Invalid status transition: ${quest.status} → ${newStatus}`,
                    code: 'INVALID_TRANSITION',
                } as any);
            }

            // Validate publish requirements when going draft → live
            if (quest.status === 'draft' && newStatus === 'live') {
                const publishErr = validatePublishRequirements(quest);
                if (publishErr) {
                    return reply.status(400).send({
                        message: 'Quest does not meet publish requirements',
                        ...publishErr,
                    } as any);
                }
            }

            const previousStatus = quest.status;
            await server.prisma.quest.update({
                where: { id },
                data: { status: newStatus },
            });

            return {
                questId: id,
                previousStatus,
                newStatus,
                message: `Quest status changed: ${previousStatus} → ${newStatus}`,
            };
        }
    );

    // ── GET /quests/mine — Creator's quests (includes drafts) ────────────────
    // NOTE: registered BEFORE /:id to avoid route conflict
    server.get(
        '/mine',
        {
            schema: {
                tags: ['Quests'],
                summary: 'List quests created by the authenticated user',
                security: [{ bearerAuth: [] }],
                response: {
                    200: z.array(QuestSchema.extend({
                        fundingStatus: z.string().optional(),
                        previewToken: z.string().optional(),
                    })),
                },
            },
            onRequest: [server.authenticate],
        },
        async (request, reply) => {
            const userId = (request as any).user?.id;

            const quests = await server.prisma.quest.findMany({
                where: { creatorUserId: userId },
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: { select: { participations: true } },
                    participations: {
                        take: 5,
                        include: {
                            agent: {
                                select: { agentname: true, owner: { select: { email: true, username: true } } },
                            },
                        },
                        orderBy: { joinedAt: 'asc' },
                    },
                },
            });

            return quests.map(({ _count, participations, ...q }) => ({
                ...formatQuestResponse(q, participations, _count.participations),
                fundingStatus: q.fundingStatus,
                previewToken: q.previewToken,
            }));
        }
    );

    // ── POST /quests/:id/claim-reward — Submit wallet for payout ──────────────
    server.post(
        '/:id/claim-reward',
        {
            schema: {
                tags: ['Quests'],
                summary: 'Submit wallet address to claim crypto reward',
                security: [{ bearerAuth: [] }],
                params: z.object({ id: z.string().uuid() }),
                body: z.object({
                    walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address'),
                }),
                response: {
                    200: z.object({
                        message: z.string(),
                        payoutWallet: z.string(),
                    }),
                },
            },
            onRequest: [server.authenticate],
        },
        async (request, reply) => {
            const { id } = request.params as any;
            const { walletAddress } = request.body as { walletAddress: string };
            const userId = request.user.id;

            // Find quest
            const quest = await server.prisma.quest.findUnique({ where: { id } });
            if (!quest) return reply.status(404).send({ message: 'Quest not found' } as any);

            // Must be crypto-funded
            if (quest.fundingMethod !== 'crypto') {
                return reply.status(400).send({ message: 'This quest does not use crypto rewards' } as any);
            }

            // Find user's participation (via their agents)
            const userAgents = await server.prisma.agent.findMany({
                where: { ownerId: userId },
                select: { id: true },
            });
            const agentIds = userAgents.map(a => a.id);

            if (agentIds.length === 0) {
                return reply.status(400).send({ message: 'You have no agents participating in this quest' } as any);
            }

            const participation = await server.prisma.questParticipation.findFirst({
                where: {
                    questId: id,
                    agentId: { in: agentIds },
                    status: { in: ['completed', 'submitted'] },
                },
            });

            if (!participation) {
                return reply.status(400).send({
                    message: 'No completed participation found for this quest',
                } as any);
            }

            if (participation.payoutWallet) {
                return reply.status(400).send({
                    message: 'Wallet already submitted for this quest',
                } as any);
            }

            const normalizedAddress = walletAddress.toLowerCase();

            // Upsert WalletLink for user
            await server.prisma.walletLink.upsert({
                where: {
                    userId_address: { userId, address: normalizedAddress },
                },
                update: {},
                create: {
                    userId,
                    address: normalizedAddress,
                    isPrimary: (await server.prisma.walletLink.count({ where: { userId } })) === 0,
                },
            });

            // Set payoutWallet on participation
            await server.prisma.questParticipation.update({
                where: { id: participation.id },
                data: { payoutWallet: normalizedAddress },
            });

            return {
                message: 'Wallet submitted for payout',
                payoutWallet: normalizedAddress,
            };
        }
    );

    // ── POST /quests/:id/cancel — Cancel quest + future refund ───────────────
    server.post(
        '/:id/cancel',
        {
            schema: {
                tags: ['Quests'],
                summary: 'Cancel a quest (creator only)',
                security: [{ bearerAuth: [] }],
                params: z.object({ id: z.string().uuid() }),
                body: z.object({ reason: z.string().optional() }),
                response: {
                    200: z.object({ message: z.string(), questId: z.string() }),
                },
            },
            onRequest: [server.authenticate],
        },
        async (request, reply) => {
            const { id } = request.params as any;
            const userId = (request as any).user?.id;

            const quest = await server.prisma.quest.findUnique({ where: { id } });
            if (!quest) return reply.status(404).send({ message: 'Quest not found' } as any);
            if (quest.creatorUserId !== userId) return reply.status(403).send({ message: 'Not quest creator' } as any);

            if (!isValidTransition(quest.status, 'cancelled')) {
                return reply.status(400).send({
                    message: `Cannot cancel quest in status: ${quest.status}`,
                    code: 'INVALID_TRANSITION',
                } as any);
            }

            await server.prisma.quest.update({
                where: { id },
                data: { status: 'cancelled' },
            });

            // Trigger on-chain refund if crypto-funded
            if (quest.fundingStatus === 'confirmed' && quest.cryptoChainId) {
                try {
                    const { executeRefund } = await import('../escrow/escrow.service');
                    await executeRefund(server.prisma, id, quest.cryptoChainId);
                    server.log.info({ questId: id }, 'Refund triggered on cancellation');
                } catch (err: any) {
                    server.log.error({ err, questId: id }, 'Refund failed on cancellation — will retry');
                    // Don't fail the cancel operation — refund can be retried
                }
            }

            return { message: 'Quest cancelled', questId: id };
        }
    );

    // ── POST /quests/:id/participations/:pid/verify — Approve/reject proof ───
    server.post(
        '/:id/participations/:pid/verify',
        {
            schema: {
                tags: ['Quests'],
                summary: 'Verify (approve/reject) a submitted proof',
                security: [{ bearerAuth: [] }],
                params: z.object({
                    id: z.string().uuid(),
                    pid: z.string().uuid(),
                }),
                body: z.object({
                    action: z.enum(['approve', 'reject']),
                    reason: z.string().optional(),
                }),
                response: {
                    200: z.object({
                        message: z.string(),
                        participation: z.object({
                            id: z.string(),
                            status: z.string(),
                        }),
                    }),
                },
            },
            onRequest: [server.authenticate],
        },
        async (request, reply) => {
            const { id: questId, pid } = request.params as any;
            const { action, reason } = request.body as any;
            const userId = request.user.id;
            const userRole = request.user.role ?? 'user';

            const { allowed } = await isQuestCreatorOrAdmin(server.prisma, questId, userId, userRole);
            if (!allowed) return reply.status(403).send({ message: 'Only quest creator or admin can verify proofs' } as any);

            try {
                const participation = await verifyParticipation(server.prisma, questId, pid, action, reason);
                return {
                    message: `Proof ${action === 'approve' ? 'approved' : 'rejected'}`,
                    participation: { id: participation.id, status: participation.status },
                };
            } catch (err: any) {
                if (err instanceof QuestValidationError) {
                    return reply.status(400).send({ message: err.message } as any);
                }
                if (err instanceof QuestNotFoundError) {
                    return reply.status(404).send({ message: err.message } as any);
                }
                throw err;
            }
        }
    );

    // ── POST /quests/:id/participations/verify-bulk — Bulk approve/reject ────
    server.post(
        '/:id/participations/verify-bulk',
        {
            schema: {
                tags: ['Quests'],
                summary: 'Bulk verify (approve/reject) submitted proofs',
                security: [{ bearerAuth: [] }],
                params: z.object({ id: z.string().uuid() }),
                body: z.object({
                    items: z.array(z.object({
                        participationId: z.string().uuid(),
                        action: z.enum(['approve', 'reject']),
                        reason: z.string().optional(),
                    })).min(1).max(100),
                }),
                response: {
                    200: z.object({
                        updated: z.number(),
                        errors: z.array(z.string()),
                    }),
                },
            },
            onRequest: [server.authenticate],
        },
        async (request, reply) => {
            const { id: questId } = request.params as any;
            const { items } = request.body as any;
            const userId = request.user.id;
            const userRole = request.user.role ?? 'user';

            const { allowed } = await isQuestCreatorOrAdmin(server.prisma, questId, userId, userRole);
            if (!allowed) return reply.status(403).send({ message: 'Only quest creator or admin can verify proofs' } as any);

            try {
                return await bulkVerifyParticipations(server.prisma, questId, items);
            } catch (err: any) {
                if (err instanceof QuestNotFoundError) {
                    return reply.status(404).send({ message: err.message } as any);
                }
                throw err;
            }
        }
    );

    // ── GET /quests/:id/manage-summary — Combined data for manage page ───────
    server.get(
        '/:id/manage-summary',
        {
            schema: {
                tags: ['Quests'],
                summary: 'Get quest manage summary (creator/admin)',
                security: [{ bearerAuth: [] }],
                params: z.object({ id: z.string().uuid() }),
            },
            onRequest: [server.authenticate],
        },
        async (request, reply) => {
            const { id: questId } = request.params as any;
            const userId = request.user.id;
            const userRole = request.user.role ?? 'user';

            const quest = await server.prisma.quest.findUnique({ where: { id: questId } });
            if (!quest) return reply.status(404).send({ message: 'Quest not found' } as any);

            const isCreator = quest.creatorUserId === userId;
            const isAdmin = userRole === 'admin';
            if (!isCreator && !isAdmin) {
                return reply.status(403).send({ message: 'Only quest creator or admin can access manage summary' } as any);
            }

            const participations = await server.prisma.questParticipation.findMany({
                where: { questId },
                include: {
                    agent: {
                        select: {
                            agentname: true,
                            owner: { select: { email: true, username: true } },
                        },
                    },
                },
                orderBy: [{ completedAt: 'asc' }, { joinedAt: 'asc' }],
            });

            const statusCounts = {
                in_progress: 0,
                submitted: 0,
                verified: 0,
                rejected: 0,
                completed: 0,
                failed: 0,
            };
            for (const p of participations) {
                if (p.status in statusCounts) {
                    (statusCounts as any)[p.status]++;
                }
            }

            return {
                quest: {
                    ...formatQuestResponse(quest),
                    fundingStatus: quest.fundingStatus,
                    fundingMethod: quest.fundingMethod,
                    cryptoChainId: quest.cryptoChainId,
                    cryptoTxHash: quest.cryptoTxHash,
                    sponsorWallet: quest.sponsorWallet,
                },
                participations: participations.map(p => ({
                    id: p.id,
                    agentName: p.agent.agentname,
                    humanHandle: p.agent.owner?.username ?? p.agent.owner?.email?.split('@')[0] ?? 'unclaimed',
                    status: p.status,
                    proof: p.proof,
                    tasksCompleted: p.tasksCompleted,
                    tasksTotal: p.tasksTotal,
                    payoutWallet: p.payoutWallet,
                    payoutAmount: p.payoutAmount,
                    payoutStatus: p.payoutStatus,
                    payoutTxHash: p.payoutTxHash,
                    joinedAt: p.joinedAt.toISOString(),
                    completedAt: p.completedAt ? p.completedAt.toISOString() : null,
                })),
                statusCounts,
                totalParticipations: participations.length,
            };
        }
    );
}
