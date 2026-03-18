import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { QuestSchema, QuestTaskSchema, QuestersResponseSchema, QUEST_STATUS, QUEST_TYPE, REWARD_TYPE } from '@clawquest/shared';
import type { QuestTask } from '@clawquest/shared';
import {
    createQuest,
    updateQuest,
    formatQuestResponse,
    isValidTransition,
    isQuestCreatorOrAdmin,
    isQuestOwnerOrSponsor,
    generateCollabToken,
    verifyParticipation,
    bulkVerifyParticipations,
    resolveHumanHandle,
    USER_IDENTITY_SELECT,
    QuestValidationError,
    QuestNotFoundError,
    QuestNotEditableError,
    QuestForbiddenError,
} from './quests.service';
import { openRouterService } from './openrouter.service';
import { issueLlmKeysForQuest } from './llm-key-reward.service';
import { validatePublishRequirements } from './quests.publish-validator';
import { validateSocialTarget } from './social-validator';
import { verifySocialAction, VerificationContext } from './social-action-verifier';
import { notifyQuestCancelled, notifyProofVerified } from '../telegram/services/bot-notification.service';
import { createChallenge } from '../challenges/challenges.service';

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
    rewardType: z.enum([REWARD_TYPE.USDC, REWARD_TYPE.USDT, REWARD_TYPE.NATIVE, REWARD_TYPE.USD, REWARD_TYPE.LLMTOKEN_OPENROUTER, REWARD_TYPE.LLM_KEY]).default(REWARD_TYPE.USDC),
    tokenProvider: z.string().optional(),
    tokenAmount: z.number().optional(),
    startAt: z.string().datetime().optional(),
    expiresAt: z.string().datetime().optional(),
    tags: z.array(z.string()).default([]),
    tasks: z.array(QuestTaskSchema).default([]),
    requiredSkills: z.array(z.string()).default([]),
    network: z.string().optional(),
    drawTime: z.string().datetime().optional(),
    fundingMethod: z.enum(['crypto', 'stripe']).optional(),
    llmKeyRewardEnabled: z.boolean().default(false),
    llmKeyTokenLimit: z.number().int().positive().optional(),
    creatorTelegramId: z.coerce.bigint().optional(),
    // LLM Model Reward (LLMTOKEN_OPENROUTER) — server computes rewardAmount from these
    llmModelId: z.string().uuid().optional(),
    tokenBudgetPerWinner: z.number().positive().optional(),
}).refine(
    (data) => {
        // If rewardType is LLMTOKEN_OPENROUTER, llmModelId and tokenBudgetPerWinner are required
        if (data.rewardType === REWARD_TYPE.LLMTOKEN_OPENROUTER) {
            return !!data.llmModelId && !!data.tokenBudgetPerWinner && data.tokenBudgetPerWinner > 0;
        }
        return true;
    },
    {
        message: 'llmModelId and tokenBudgetPerWinner are required when rewardType is LLMTOKEN_OPENROUTER',
    }
);

export async function questsRoutes(server: FastifyInstance) {
    // List Quests
    server.get(
        '/',
        {
            schema: {
                tags: ['Quests'],
                summary: 'List available quests',
                querystring: z.object({
                    status: z.union([z.nativeEnum(QUEST_STATUS), z.literal('ended')]).optional(),
                    type: z.nativeEnum(QUEST_TYPE).optional(),
                    limit: z.coerce.number().int().min(1).max(100).default(50),
                    offset: z.coerce.number().int().min(0).default(0),
                }),
                response: {
                    200: z.array(QuestSchema),
                },
            },
        },
        async (request) => {
            const { status, type, limit, offset } = request.query as any;

            const where: any = {};
            if (status === 'ended') {
                // Special alias: return all terminal-state quests
                where.status = { in: ['completed', 'expired', 'cancelled'] };
            } else if (status) {
                where.status = status;
            } else {
                // Default: only show active/upcoming quests, exclude drafts and terminal states
                where.status = { in: ['live', 'scheduled'] };
                where.OR = [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } },
                ];
            }

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
                            user: { select: USER_IDENTITY_SELECT },
                            agent: { select: { agentname: true } },
                        },
                        orderBy: { joinedAt: 'asc' },
                    },
                    llmModel: true,
                },
            });

            return quests.map(({ _count, participations, ...q }) =>
                formatQuestResponse(q, participations, _count.participations)
            );
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
                        isCreator: z.boolean().optional(),
                        isSponsor: z.boolean().optional(),
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
                            tasksCompleted: z.number().optional(),
                            tasksTotal: z.number().optional(),
                            proof: z.any().optional(),
                            verifiedSkills: z.array(z.string()).optional(),
                            llmRewardApiKey: z.string().nullable().optional(),
                            llmRewardIssuedAt: z.string().datetime().nullable().optional(),
                            payoutTokenApiKey: z.string().nullable().optional(),
                            payoutTokenStatus: z.string().nullable().optional(),
                            payoutTokenExpiresAt: z.string().datetime().nullable().optional(),
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
                            user: { select: USER_IDENTITY_SELECT },
                            agent: { select: { agentname: true } },
                        },
                        orderBy: { joinedAt: 'asc' },
                    },
                    llmModel: true,
                },
            });

            if (!quest) {
                return reply.status(404).send({ message: 'Quest not found', code: 'NOT_FOUND' } as any);
            }

            // Auto-check and reset Stripe session if canceled/expired (background, non-blocking)
            if (quest.fundingStatus === 'pending' && quest.stripeSessionId && quest.fundingMethod === 'stripe') {
                // Check session status asynchronously (don't block response)
                (async () => {
                    try {
                        const { stripe, isStripeConfigured } = await import('../stripe/stripe.config');
                        if (!isStripeConfigured() || !stripe) return;

                        const session = await stripe.checkout.sessions.retrieve(quest.stripeSessionId!);

                        // If session is not paid, reset funding status
                        if (session.payment_status !== 'paid') {
                            const currentQuest = await server.prisma.quest.findUnique({
                                where: { id },
                                select: { fundingStatus: true },
                            });

                            // Only reset if still pending (idempotency)
                            if (currentQuest?.fundingStatus === 'pending') {
                                await server.prisma.quest.update({
                                    where: { id },
                                    data: {
                                        fundingStatus: 'unfunded',
                                        fundingMethod: null,
                                        stripeSessionId: null,
                                        stripePaymentId: null,
                                    },
                                });

                                server.log.info(
                                    { questId: id, sessionId: quest.stripeSessionId, paymentStatus: session.payment_status },
                                    '[quests:get] Auto-reset funding status (session canceled/expired)'
                                );
                            }
                        }
                    } catch (err: any) {
                        // Silently fail - session might not exist or Stripe API error
                        server.log.debug(
                            { questId: id, sessionId: quest.stripeSessionId, error: err.message },
                            '[quests:get] Failed to check session status'
                        );
                    }
                })();
            }

            // Draft access control: require token or creator auth
            if (quest.status === 'draft') {
                let hasAccess = false;

                // Check preview token
                if (token && quest.previewToken === token) {
                    hasAccess = true;
                }

                // Check if authenticated creator or partner
                if (!hasAccess) {
                    const authHeader = request.headers.authorization;
                    if (authHeader?.startsWith('Bearer ') && !authHeader.startsWith('Bearer cq_')) {
                        try {
                            await (server as any).authenticate(request, reply);
                            const user = (request as any).user;
                            if (user?.id) {
                                if (quest.creatorUserId === user.id) {
                                    hasAccess = true;
                                } else {
                                    // Check if user is an accepted partner
                                    const partnerRecord = await server.prisma.questCollaborator.findFirst({
                                        where: { questId: id, userId: user.id, acceptedAt: { not: null } },
                                        select: { id: true },
                                    });
                                    if (partnerRecord) hasAccess = true;
                                }
                            }
                        } catch {
                            if (reply.sent) return
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
                const draftUser = (request as any).user;
                const isCreator = !!(draftUser?.id && quest.creatorUserId === draftUser.id);
                return {
                    ...formatQuestResponse(q, participations, _count.participations),
                    isPreview: true,
                    isCreator,
                    isSponsor: !isCreator && hasAccess && !!draftUser?.id,
                    fundingRequired: quest.fundingStatus === 'unfunded',
                    previewToken: quest.previewToken,
                    fundUrl: `${frontendUrl}/quests/${quest.id}/fund`,
                };
            }

            // Public quest (live, completed, etc.)
            const { _count, participations, ...q } = quest;
            const response: any = formatQuestResponse(q, participations, _count.participations);

            // Include user's participation + isCreator if authenticated
            const authHeader = request.headers.authorization;
            if (authHeader?.startsWith('Bearer ') && !authHeader.startsWith('Bearer cq_')) {
                try {
                    await (server as any).authenticate(request, reply);
                    const user = (request as any).user;
                    if (user?.id) {
                        response.isCreator = quest.creatorUserId === user.id;
                        // Check if user is a co-sponsor (accepted collaborator)
                        const sponsorRecord = await server.prisma.questCollaborator.findFirst({
                            where: { questId: id, userId: user.id, acceptedAt: { not: null } },
                            select: { id: true },
                        });
                        response.isSponsor = !!sponsorRecord;
                        const myParticipation = await server.prisma.questParticipation.findUnique({
                            where: { questId_userId: { questId: id, userId: user.id } },
                        });
                        if (myParticipation) {
                            // Fetch verified skill slugs from SkillChallenge
                            const verifiedChallenges = await server.prisma.skillChallenge.findMany({
                                where: { questId: id, userId: user.id, passed: true },
                                select: { skillSlug: true },
                            });
                            const verifiedSkills = verifiedChallenges.map(c => c.skillSlug);

                            response.myParticipation = {
                                id: myParticipation.id,
                                status: myParticipation.status,
                                payoutWallet: myParticipation.payoutWallet,
                                payoutStatus: myParticipation.payoutStatus,
                                payoutAmount: myParticipation.payoutAmount,
                                payoutTxHash: myParticipation.payoutTxHash,
                                tasksCompleted: myParticipation.tasksCompleted,
                                tasksTotal: myParticipation.tasksTotal,
                                proof: myParticipation.proof,
                                verifiedSkills,
                                llmRewardApiKey: myParticipation.llmRewardApiKey ?? null,
                                llmRewardIssuedAt: myParticipation.llmRewardIssuedAt?.toISOString() ?? null,
                                payoutTokenApiKey: myParticipation.payoutTokenApiKey ?? null,
                                payoutTokenStatus: myParticipation.payoutTokenStatus ?? null,
                                payoutTokenExpiresAt: myParticipation.payoutTokenExpiresAt?.toISOString() ?? null,
                            };
                        }
                    }
                } catch {
                    if (reply.sent) return
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
                    include: {
                        user: { select: { username: true, email: true, telegramUsername: true, xHandle: true, discordHandle: true } },
                        agent: { select: { agentname: true } },
                    },
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
                questRewardAmount: Number(quest.rewardAmount),
                questRewardType: quest.rewardType,
                totalQuesters: doneCount + inProgressCount,
                doneQuesters: doneCount,
                inProgressQuesters: inProgressCount,
                tasksTotal,
                participations: allParticipations.map((p, i) => ({
                    id: p.id,
                    rank: offset + i + 1,
                    agentName: p.agent?.agentname ?? 'anonymous',
                    humanHandle: resolveHumanHandle(p),
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

    // ── Skill Search (ClawHub catalog) ─────────────────────────────────────────
    server.get(
        '/skills/search',
        {
            schema: {
                tags: ['Quests'],
                summary: 'Search ClawHub skills catalog',
                querystring: z.object({
                    q: z.string().min(2).max(100),
                    limit: z.coerce.number().int().min(1).max(50).default(20),
                }),
                response: {
                    200: z.object({
                        data: z.array(z.object({
                            slug: z.string(),
                            display_name: z.string(),
                            summary: z.string().nullable(),
                            owner_handle: z.string().nullable(),
                            owner_display_name: z.string().nullable(),
                            owner_image: z.string().nullable(),
                            downloads: z.number(),
                            installs_all_time: z.number(),
                            stars: z.number(),
                            latest_version: z.string().nullable(),
                        })),
                    }),
                },
            },
        },
        async (request, reply) => {
            const { q, limit } = request.query as { q: string; limit: number };
            const rows = await server.prisma.clawhub_skills.findMany({
                where: {
                    OR: [
                        { slug: { contains: q.trim(), mode: 'insensitive' } },
                        { display_name: { contains: q.trim(), mode: 'insensitive' } },
                        { owner_handle: { contains: q.trim(), mode: 'insensitive' } },
                    ],
                },
                select: {
                    slug: true,
                    display_name: true,
                    summary: true,
                    owner_handle: true,
                    owner_display_name: true,
                    owner_image: true,
                    downloads: true,
                    installs_all_time: true,
                    stars: true,
                    latest_version: true,
                },
                orderBy: { downloads: 'desc' },
                take: limit,
            });
            return reply.send({ data: rows });
        }
    );

    // ── Skill Verification Info (public) ────────────────────────────────────────
    server.get(
        '/skills/:slug/verification-info',
        {
            schema: {
                tags: ['Quests'],
                summary: 'Get verification_config for a skill (null if not configured)',
                params: z.object({ slug: z.string() }),
                response: {
                    200: z.object({
                        slug: z.string(),
                        display_name: z.string(),
                        verification_config: z.unknown().nullable(),
                    }),
                    404: z.object({ error: z.string() }),
                },
            },
        },
        async (request, reply) => {
            const { slug } = request.params as { slug: string };
            const skill = await server.prisma.clawhub_skills.findUnique({
                where: { slug },
                select: { slug: true, display_name: true, verification_config: true },
            });
            if (!skill) return reply.status(404).send({ error: 'Skill not found' });
            return reply.send(skill);
        }
    );

    // ── Create Skill Challenge (JWT auth, on behalf of user's agent) ────────────
    // Human user clicks "How to verify" on quest detail — creates a challenge token
    // and returns the /verify/:token URL for redirect.
    server.post(
        '/challenges',
        {
            preHandler: [server.authenticate],
            schema: {
                tags: ['Quests'],
                summary: 'Create a skill verification challenge (JWT auth)',
                body: z.object({
                    skillSlug: z.string().min(1),
                    questId: z.string().optional(),
                }),
                response: {
                    200: z.object({
                        token: z.string(),
                        verifyUrl: z.string(),
                        expiresAt: z.string(),
                    }),
                    400: z.object({ error: z.string() }),
                },
            },
        },
        async (request, reply) => {
            const userId = (request.user as any).id as string;

            const { skillSlug, questId } = request.body;
            try {
                const { token, verifyUrl, challenge } = await createChallenge(server.prisma, {
                    skillSlug,
                    questId,
                    userId,
                });
                return reply.status(200).send({
                    token,
                    verifyUrl,
                    expiresAt: challenge.expiresAt.toISOString(),
                });
            } catch (err: any) {
                return reply.status(400).send({ error: err.message });
            }
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
                let bodyText = '';
                if (!substantialText) {
                    bodyText = text
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
                } else if (bodyText) {
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

    // ── Social Task Validation ─────────────────────────────────────────────
    server.get(
        '/validate-social',
        {
            schema: {
                tags: ['Quests'],
                summary: 'Validate social task target exists (X account, Discord invite, Telegram channel)',
                querystring: z.object({
                    platform: z.enum(['x', 'discord', 'telegram']),
                    type: z.string(),
                    value: z.string().min(1),
                }),
                response: {
                    200: z.object({
                        valid: z.boolean(),
                        error: z.string().optional(),
                        meta: z.record(z.string(), z.string()).optional(),
                    }),
                },
            },
            preHandler: [server.authenticate],
        },
        async (request) => {
            const { platform, type, value } = request.query as { platform: string; type: string; value: string }
            const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN
            return validateSocialTarget(platform, type, value, telegramBotToken)
        }
    );

    // ── GET /quests/:id/check-tasks — Auto-verify human tasks for current user ──
    server.get(
        '/:id/check-tasks',
        {
            schema: {
                tags: ['Quests'],
                summary: 'Check auto-verifiable human tasks for the authenticated user (e.g. Discord role)',
                security: [{ bearerAuth: [] }],
                params: z.object({ id: z.string().uuid() }),
                response: {
                    200: z.object({
                        results: z.array(z.object({
                            taskIndex: z.number(),
                            actionType: z.string(),
                            valid: z.boolean(),
                            error: z.string().optional(),
                            meta: z.record(z.string(), z.string()).optional(),
                        })),
                    }),
                },
            },
            preHandler: [server.authenticate],
        },
        async (request, reply) => {
            const { id: questId } = request.params as { id: string }
            const quest = await server.prisma.quest.findUnique({ where: { id: questId } })
            if (!quest) return reply.status(404).send({ error: { message: 'Quest not found', code: 'NOT_FOUND' } } as any)

            const tasks = (quest.tasks as QuestTask[]) ?? []
            const user = await server.prisma.user.findUnique({ where: { id: request.user.id } })

            const results: Array<{ taskIndex: number; actionType: string; valid: boolean; error?: string; meta?: Record<string, string> }> = []

            for (let i = 0; i < tasks.length; i++) {
                const task = tasks[i]
                const ctx: VerificationContext = {
                    userId: request.user.id,
                    prisma: server.prisma,
                    xId: user?.xId, xHandle: user?.xHandle, xAccessToken: user?.xAccessToken,
                    xRefreshToken: user?.xRefreshToken, xTokenExpiry: user?.xTokenExpiry,
                    discordId: user?.discordId, discordAccessToken: user?.discordAccessToken,
                    discordTokenExpiry: user?.discordTokenExpiry,
                    telegramId: user?.telegramId,
                    params: task.params as Record<string, string>,
                    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
                }
                const result = await verifySocialAction(task.platform, task.actionType, i, ctx)
                results.push({ taskIndex: i, actionType: task.actionType, ...result })
            }

            return { results }
        }
    );

    // ── POST /quests/:id/tasks/verify — Auto-verify and Save progress ───────────
    const VerifyTasksBody = z.object({
        proofUrls: z.record(z.string(), z.string().url()).optional(),
    }).optional();

    server.post(
        '/:id/tasks/verify',
        {
            schema: {
                tags: ['Quests'],
                summary: 'Auto-verify and save progress for all social tasks',
                security: [{ bearerAuth: [] }],
                params: z.object({ id: z.string().uuid() }),
                body: VerifyTasksBody,
                response: {
                    200: z.object({
                        message: z.string(),
                        tasksCompleted: z.number(),
                        tasksTotal: z.number(),
                        status: z.string(),
                        results: z.array(z.object({
                            taskIndex: z.number(),
                            actionType: z.string(),
                            valid: z.boolean(),
                            error: z.string().optional(),
                        })),
                    }),
                },
            },
            onRequest: [server.authenticate],
        },
        async (request, reply) => {
            const { id: questId } = request.params as { id: string }
            const userId = request.user.id

            const quest = await server.prisma.quest.findUnique({ where: { id: questId } })
            if (!quest) return reply.status(404).send({ message: 'Quest not found' } as any)

            // Find participation by userId
            let participation = await server.prisma.questParticipation.findUnique({
                where: { questId_userId: { questId, userId } },
            })

            if (!participation) {
                return reply.status(400).send({ message: 'You must accept the quest first.' } as any)
            }

            if (participation.status === 'completed') {
                return reply.status(200).send({
                    message: 'Quest already completed',
                    tasksCompleted: participation.tasksCompleted,
                    tasksTotal: participation.tasksTotal,
                    status: participation.status,
                    results: [],
                } as any)
            }

            const tasks = (quest.tasks as QuestTask[]) ?? []
            const user = await server.prisma.user.findUnique({ where: { id: userId } })

            // Parse proof URLs from body
            const body = request.body as { proofUrls?: Record<string, string> } | undefined
            const rawProofUrls = body?.proofUrls
            const proofUrlsMap: Record<number, string> | undefined = rawProofUrls
                ? Object.fromEntries(Object.entries(rawProofUrls).map(([k, v]) => [Number(k), v]))
                : undefined

            const proof = (participation.proof as any) || {}
            const verifiedIndices = new Set<number>(proof.verifiedIndices || [])

            const results: any[] = []
            let newVerification = false

            for (let i = 0; i < tasks.length; i++) {
                const task = tasks[i]
                if (verifiedIndices.has(i)) {
                    results.push({ taskIndex: i, actionType: task.actionType, valid: true })
                    continue
                }

                const ctx: VerificationContext = {
                    userId,
                    prisma: server.prisma,
                    xId: user?.xId, xHandle: user?.xHandle, xAccessToken: user?.xAccessToken,
                    xRefreshToken: user?.xRefreshToken, xTokenExpiry: user?.xTokenExpiry,
                    discordId: user?.discordId, discordAccessToken: user?.discordAccessToken,
                    discordTokenExpiry: user?.discordTokenExpiry,
                    telegramId: user?.telegramId,
                    proofUrls: proofUrlsMap,
                    params: task.params as Record<string, string>,
                    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
                }
                const validationResult = await verifySocialAction(
                    task.platform, task.actionType, i, ctx,
                )

                results.push({
                    taskIndex: i,
                    actionType: task.actionType,
                    valid: validationResult.valid,
                    error: validationResult.error,
                })

                if (validationResult.valid) {
                    verifiedIndices.add(i)
                    newVerification = true
                }
            }

            if (newVerification) {
                const newTasksCompleted = verifiedIndices.size
                const allTasksDone = newTasksCompleted >= participation.tasksTotal

                participation = await server.prisma.questParticipation.update({
                    where: { id: participation.id },
                    data: {
                        tasksCompleted: newTasksCompleted,
                        status: allTasksDone ? 'completed' : participation.status,
                        completedAt: allTasksDone ? new Date() : participation.completedAt,
                        proof: {
                            ...proof,
                            verifiedIndices: Array.from(verifiedIndices)
                        }
                    }
                })

                if (allTasksDone && participation.agentId) {
                    await server.prisma.agent.update({
                        where: { id: participation.agentId },
                        data: { status: 'idle' }
                    })
                }
            }

            return {
                message: participation.status === 'completed' ? 'Quest fully completed!' : 'Progress updated',
                tasksCompleted: participation.tasksCompleted,
                tasksTotal: participation.tasksTotal,
                status: participation.status,
                results
            }
        }
    );

    // Verify a single task by index — avoids calling all external APIs on every verify
    server.post(
        '/:id/tasks/:taskIndex/verify',
        { onRequest: [server.authenticate] },
        async (request, reply) => {
            const { id: questId, taskIndex: taskIndexStr } = request.params as {
                id: string
                taskIndex: string
            }
            const { proofUrl } = (request.body as { proofUrl?: string }) ?? {}
            const userId = request.user!.id

            const taskIndex = parseInt(taskIndexStr, 10)
            if (isNaN(taskIndex) || taskIndex < 0) {
                return reply.status(400).send({ error: { message: 'Invalid taskIndex', code: 'INVALID_TASK_INDEX' } })
            }

            const quest = await server.prisma.quest.findUnique({
                where: { id: questId },
            })
            if (!quest) {
                return reply.status(400).send({ error: { message: 'Quest not found', code: 'QUEST_NOT_FOUND' } })
            }

            const participation = await server.prisma.questParticipation.findFirst({
                where: { questId, userId },
            })
            if (!participation) {
                return reply.status(400).send({ error: { message: 'Not participating in this quest', code: 'NOT_PARTICIPATING' } })
            }

            const tasks = quest.tasks as QuestTask[]
            if (taskIndex >= tasks.length) {
                return reply.status(400).send({ error: { message: 'taskIndex out of range', code: 'INVALID_TASK_INDEX' } })
            }

            const task = tasks[taskIndex]
            const proof = participation.proof as { verifiedIndices?: number[] } | null
            const verifiedIndices = new Set<number>(proof?.verifiedIndices ?? [])

            // Already verified — return cached result immediately, no external API call
            if (verifiedIndices.has(taskIndex)) {
                return reply.send({
                    taskIndex,
                    platform: task.platform,
                    actionType: task.actionType,
                    valid: true,
                    error: null,
                    tasksCompleted: verifiedIndices.size,
                    tasksTotal: tasks.length,
                    status: participation.status,
                })
            }

            const user = await server.prisma.user.findUnique({ where: { id: userId } })

            const proofUrlsMap: Record<number, string> = {}
            if (proofUrl) proofUrlsMap[taskIndex] = proofUrl

            const ctx: VerificationContext = {
                userId,
                prisma: server.prisma,
                xId: user?.xId,
                xHandle: user?.xHandle,
                xAccessToken: user?.xAccessToken,
                xRefreshToken: user?.xRefreshToken,
                xTokenExpiry: user?.xTokenExpiry,
                discordId: user?.discordId,
                discordAccessToken: user?.discordAccessToken,
                telegramId: user?.telegramId,
                proofUrls: proofUrlsMap,
                params: task.params as Record<string, string>,
                telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
            }

            const result = await verifySocialAction(task.platform, task.actionType, taskIndex, ctx)

            let newStatus = participation.status
            let newTasksCompleted = verifiedIndices.size

            if (result.valid) {
                verifiedIndices.add(taskIndex)
                newTasksCompleted = verifiedIndices.size
                const allDone = newTasksCompleted === tasks.length

                await server.prisma.questParticipation.update({
                    where: { id: participation.id },
                    data: {
                        tasksCompleted: newTasksCompleted,
                        status: allDone ? 'completed' : participation.status,
                        completedAt: allDone ? new Date() : participation.completedAt,
                        proof: {
                            ...(proof ?? {}),
                            verifiedIndices: Array.from(verifiedIndices),
                        },
                    },
                })

                if (allDone) {
                    newStatus = 'completed'
                    if (participation.agentId) {
                        await server.prisma.agent.update({
                            where: { id: participation.agentId },
                            data: { status: 'idle' },
                        })
                    }
                }
            }

            return reply.send({
                taskIndex,
                platform: task.platform,
                actionType: task.actionType,
                valid: result.valid,
                error: result.error ?? null,
                tasksCompleted: newTasksCompleted,
                tasksTotal: tasks.length,
                status: newStatus,
            })
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
                    // Check if response was already sent (e.g., 401 from authenticate)
                    if (reply.sent) return;
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
    // Agent API key: Authorization: Bearer cq_<key> — agentId+userId resolved from key
    // Human JWT:     Authorization: Bearer <jwt>    — userId from auth, agentId optional
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
            let userId: string;
            let agentId: string | undefined;

            if (auth.startsWith('Bearer cq_')) {
                // Agent API key path — resolve agentId + userId from key
                const apiKey = auth.slice(7);
                const agent = await server.prisma.agent.findUnique({
                    where: { agentApiKey: apiKey },
                    select: { id: true, ownerId: true },
                });
                if (!agent) return reply.status(401).send({ message: 'Invalid agent API key' } as any);
                agentId = agent.id;
                userId = agent.ownerId ?? undefined;
            } else {
                // Human Supabase token path
                try { await server.authenticate(request, reply); } catch { return reply.status(401).send({ message: 'Unauthorized' } as any); }
                userId = (request as any).user.id;
                const { agentId: bodyAgentId } = request.body as any;
                if (bodyAgentId) {
                    const owned = await server.prisma.agent.findFirst({
                        where: { id: bodyAgentId, ownerId: userId },
                        select: { id: true },
                    });
                    if (!owned) return reply.status(403).send({ message: 'Agent not found or not owned by you' } as any);
                    agentId = bodyAgentId;
                } else {
                    // Auto-resolve active agent — use the agent marked isActive=true
                    const activeAgent = await server.prisma.agent.findFirst({
                        where: { ownerId: userId, isActive: true },
                        select: { id: true },
                    });
                    if (activeAgent) {
                        agentId = activeAgent.id;
                    }
                    // If no active agent, proceed without agentId (quest joins without agent link)
                }
            }

            const quest = await server.prisma.quest.findUnique({ where: { id } });
            if (!quest) return reply.status(404).send({ message: 'Quest not found' } as any);
            if (quest.status !== 'live') return reply.status(400).send({ message: 'Quest is not live' } as any);
            // LUCKY_DRAW allows unlimited participants — totalSlots = number of winners, not participant cap
            if (quest.type !== 'LUCKY_DRAW' && quest.filledSlots >= quest.totalSlots) return reply.status(400).send({ message: 'Quest is full' } as any);

            // ── Skill Gate: only check if agent is provided ─────────────
            const requiredSkills = (quest as any).requiredSkills as string[] ?? [];
            if (agentId && requiredSkills.length > 0) {
                const whereClause: any = {
                    agentId,
                    name: { in: requiredSkills },
                };
                if ((quest as any).requireVerified) {
                    whereClause.verified = true;
                }
                const agentSkills = await server.prisma.agentSkill.findMany({
                    where: whereClause,
                    select: { name: true, verified: true },
                });
                const agentSkillNames = new Set(agentSkills.map(s => s.name));
                const missingSkills = requiredSkills.filter(s => !agentSkillNames.has(s));

                if (missingSkills.length > 0) {
                    const msg = (quest as any).requireVerified
                        ? `Agent is missing verified skills: ${missingSkills.join(', ')}. Run Skill Scan to verify your skills.`
                        : `Agent is missing required skills: ${missingSkills.join(', ')}. Report your skills via POST /agents/me/skills before accepting this quest.`;
                    return reply.status(403).send({
                        message: msg,
                        missingSkills,
                        requiredSkills,
                    } as any);
                }
            }

            // Check for existing participation: by userId if available, otherwise by agentId
            let existing = null;
            if (userId) {
                existing = await server.prisma.questParticipation.findUnique({
                    where: { questId_userId: { questId: id, userId } },
                });
            } else if (agentId) {
                existing = await server.prisma.questParticipation.findUnique({
                    where: { questId_agentId: { questId: id, agentId } },
                });
            }
            if (existing) return reply.status(400).send({ message: 'You already accepted this quest' } as any);

            // Calculate actual task count from quest tasks + required skills
            const questTasks = (quest.tasks as any[]) ?? [];
            const tasksTotal = questTasks.length + requiredSkills.length;

            // Auto-complete if quest only requires verified skills (no social tasks)
            const hasOnlySkillTasks = questTasks.length === 0 && requiredSkills.length > 0;
            const autoComplete = hasOnlySkillTasks && (quest as any).requireVerified;

            const participation = await server.prisma.questParticipation.create({
                data: {
                    questId: id,
                    userId,
                    agentId: agentId ?? null,
                    status: autoComplete ? 'completed' : 'in_progress',
                    tasksTotal: tasksTotal || 5,
                    tasksCompleted: autoComplete ? requiredSkills.length : 0,
                    completedAt: autoComplete ? new Date() : undefined,
                },
            });

            const sideEffects: Promise<any>[] = [
                server.prisma.quest.update({ where: { id }, data: { filledSlots: { increment: 1 } } }),
            ];
            if (agentId) {
                sideEffects.push(
                    server.prisma.agent.update({ where: { id: agentId }, data: { status: 'questing' } }),
                    server.prisma.agentLog.create({
                        data: { agentId, type: 'QUEST_START', message: `Accepted quest: ${quest.title}`, meta: { questId: id } },
                    }),
                );
            }
            await Promise.all(sideEffects);

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
                        meta: z.record(z.string(), z.unknown()).optional(),
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

            const participation = await server.prisma.questParticipation.findFirst({
                where: { questId, agentId: agent.id },
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

    // ── PATCH /quests/:id — Edit quest (owner or sponsor) ────────────────────
    server.patch(
        '/:id',
        {
            schema: {
                tags: ['Quests'],
                summary: 'Edit a quest (owner or sponsor)',
                security: [{ bearerAuth: [] }],
                params: z.object({ id: z.string().uuid() }),
                body: z.object({
                    title: z.string().min(1).optional(),
                    description: z.string().optional(),
                    sponsor: z.string().optional(),
                    type: z.nativeEnum(QUEST_TYPE).optional(),
                    status: z.string().optional(),
                    rewardAmount: z.number().min(0).optional(),
                    rewardType: z.string().optional(),
                    totalSlots: z.number().min(1).optional(),
                    tags: z.array(z.string()).optional(),
                    requiredSkills: z.array(z.string()).optional(),
                    requireVerified: z.boolean().optional(),
                    tasks: z.array(QuestTaskSchema).optional(),
                    expiresAt: z.string().datetime().nullable().optional(),
                    network: z.string().optional(),
                    drawTime: z.string().datetime().nullable().optional(),
                    startAt: z.string().datetime().nullable().optional(),
                    fundingMethod: z.enum(['crypto', 'stripe']).optional(),
                    llmKeyRewardEnabled: z.boolean().optional(),
                    llmKeyTokenLimit: z.number().int().positive().optional(),
                    llmModelId: z.string().uuid().optional(),
                    tokenBudgetPerWinner: z.number().positive().optional(),
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
            const userRole = (request as any).user?.role ?? 'user';

            try {
                const { allowed, isOwner, quest } = await isQuestOwnerOrSponsor(
                    server.prisma, id, userId, userRole,
                );
                if (!allowed) return reply.status(403).send({ message: 'Forbidden', code: 'FORBIDDEN' } as any);

                // Lock tasks after quest goes live
                if (quest.status === 'live' && body.tasks !== undefined) {
                    return reply.status(400).send({ message: 'Tasks locked after quest goes live', code: 'TASKS_LOCKED' } as any);
                }

                // Deadline extension: live quest, owner only, no shortening
                if (quest.status === 'live' && body.expiresAt !== undefined) {
                    if (!isOwner) return reply.status(403).send({ message: 'Only owner can extend deadline', code: 'FORBIDDEN' } as any);
                    const newExpiry = new Date(body.expiresAt);
                    if (quest.expiresAt && newExpiry < quest.expiresAt) {
                        return reply.status(400).send({ message: 'Cannot shorten deadline', code: 'INVALID_DEADLINE' } as any);
                    }
                }

                await updateQuest(server.prisma, id, userId, body, true);
                // Re-fetch with llmModel include so response has full model info
                const updated = await server.prisma.quest.findUnique({
                    where: { id },
                    include: {
                        _count: { select: { participations: true } },
                        participations: {
                            take: 5,
                            include: {
                                user: { select: USER_IDENTITY_SELECT },
                                agent: { select: { agentname: true } },
                            },
                            orderBy: { joinedAt: 'asc' },
                        },
                        llmModel: true,
                    },
                });
                if (!updated) return reply.status(404).send({ message: 'Quest not found', code: 'NOT_FOUND' } as any);
                const { participations: p, _count } = updated;
                return formatQuestResponse(updated, p, _count?.participations ?? 0);
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
            const { status: newStatus } = request.body as any;
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

    // ── POST /quests/:id/publish — Publish quest (draft → live) ─────────────────
    server.post(
        '/:id/publish',
        {
            schema: {
                tags: ['Quests'],
                summary: 'Publish a quest (draft → live)',
                security: [{ bearerAuth: [] }],
                params: z.object({ id: z.string().uuid() }),
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
            const userId = (request as any).user?.id;
            const userRole = (request as any).user?.role ?? 'user';

            const quest = await server.prisma.quest.findUnique({ where: { id } });
            if (!quest) return reply.status(404).send({ message: 'Quest not found' } as any);

            // Check ownership - sponsor or creator can publish
            const { allowed } = await isQuestOwnerOrSponsor(
                server.prisma, id, userId, userRole,
            );
            if (!allowed) return reply.status(403).send({ message: 'Forbidden' } as any);

            if (quest.status !== 'draft') {
                return reply.status(400).send({
                    message: `Cannot publish quest in ${quest.status} status. Only draft quests can be published.`,
                    code: 'INVALID_STATUS',
                } as any);
            }

            // Validate publish requirements
            const publishErr = validatePublishRequirements(quest);
            if (publishErr) {
                return reply.status(400).send({
                    message: 'Quest does not meet publish requirements',
                    ...publishErr,
                } as any);
            }

            const previousStatus = quest.status;
            await server.prisma.quest.update({
                where: { id },
                data: { status: 'live' },
            });

            return {
                questId: id,
                previousStatus,
                newStatus: 'live',
                message: 'Quest published successfully',
            };
        }
    );

    // ── POST /quests/:id/close — Close quest (live/scheduled → completed) ───────
    server.post(
        '/:id/close',
        {
            schema: {
                tags: ['Quests'],
                summary: 'Close a quest (live/scheduled → completed)',
                security: [{ bearerAuth: [] }],
                params: z.object({ id: z.string().uuid() }),
                body: z.object({
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
            const userId = (request as any).user?.id;
            const userRole = (request as any).user?.role ?? 'user';

            const quest = await server.prisma.quest.findUnique({ where: { id } });
            if (!quest) return reply.status(404).send({ message: 'Quest not found' } as any);

            // Check ownership - sponsor or creator can close
            const { allowed } = await isQuestOwnerOrSponsor(
                server.prisma, id, userId, userRole,
            );
            if (!allowed) return reply.status(403).send({ message: 'Forbidden' } as any);

            if (quest.status !== 'live' && quest.status !== 'scheduled') {
                return reply.status(400).send({
                    message: `Cannot close quest in ${quest.status} status. Only live or scheduled quests can be closed.`,
                    code: 'INVALID_STATUS',
                } as any);
            }

            const previousStatus = quest.status;
            await server.prisma.quest.update({
                where: { id },
                data: { status: 'completed' },
            });

            return {
                questId: id,
                previousStatus,
                newStatus: 'completed',
                message: 'Quest closed successfully',
            };
        }
    );

    // ── GET /quests/accepted — Quests accepted by user (human or via agents) ────
    // NOTE: registered BEFORE /:id to avoid route conflict
    // REQUIRES: authenticated user (JWT). To see agent participations, user must
    //           have at least one registered agent. Human participations are always included.
    server.get(
        '/accepted',
        {
            schema: {
                tags: ['Quests'],
                summary: 'List quests accepted by the authenticated user or their agents',
                security: [{ bearerAuth: [] }],
                response: {
                    200: z.array(QuestSchema),
                },
            },
            onRequest: [server.authenticate],
        },
        async (request) => {
            const userId = (request as any).user?.id;

            // Get all agents owned by user (may be empty — humans can participate without agents)
            const userAgents = await server.prisma.agent.findMany({
                where: { ownerId: userId },
                select: { id: true },
            });
            const agentIds = userAgents.map(a => a.id);

            // Query participations for BOTH the human user AND all their agents
            // - userId match: human participated directly
            // - agentId match: agent participated on behalf of user
            const participations = await server.prisma.questParticipation.findMany({
                where: {
                    OR: [
                        ...(userId ? [{ userId }] : []),
                        ...(agentIds.length > 0 ? [{ agentId: { in: agentIds } }] : []),
                    ],
                },
                select: { questId: true },
                distinct: ['questId'],
            });

            if (participations.length === 0) {
                return [];
            }

            const questIds = participations.map(p => p.questId);

            const questInclude = {
                _count: { select: { participations: true } },
                participations: {
                    take: 5,
                    include: {
                        user: { select: USER_IDENTITY_SELECT },
                        agent: { select: { agentname: true } },
                    },
                    orderBy: { joinedAt: 'asc' as const },
                },
            };

            const quests = await server.prisma.quest.findMany({
                where: {
                    id: { in: questIds },
                    // Show all non-draft quests: live, scheduled, completed, expired, cancelled
                    status: { not: 'draft' },
                },
                // Most recently active first: ended quests by updatedAt, live quests by createdAt
                orderBy: { updatedAt: 'desc' },
                include: questInclude,
            });

            return quests.map(({ _count, participations, ...q }: any) =>
                formatQuestResponse(q, participations, _count.participations)
            );
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
        async (request) => {
            const userId = (request as any).user?.id;

            const questInclude = {
                _count: { select: { participations: true } },
                participations: {
                    take: 5,
                    include: {
                        user: { select: USER_IDENTITY_SELECT },
                        agent: { select: { agentname: true } },
                    },
                    orderBy: { joinedAt: 'asc' as const },
                },
            };

            // Get user to check for telegramId
            const user = await server.prisma.user.findUnique({
                where: { id: userId },
                select: { telegramId: true },
            });

            // Build where clause for quests
            const questWhere: any = { creatorUserId: userId };

            // If user has telegramId, also include quests created via waitlist (creatorTelegramId)
            if (user?.telegramId) {
                try {
                    // Convert String telegramId to BigInt for comparison
                    const telegramIdBigInt = BigInt(user.telegramId);
                    questWhere.OR = [
                        { creatorUserId: userId },
                        { creatorTelegramId: telegramIdBigInt },
                    ];
                } catch (err) {
                    // If telegramId is too large for BigInt, skip the OR clause
                    server.log.debug({ err, telegramId: user.telegramId }, 'Failed to convert telegramId to BigInt');
                }
            }

            const [ownedQuests, sponsoredCollabs] = await Promise.all([
                server.prisma.quest.findMany({
                    where: questWhere,
                    orderBy: { createdAt: 'desc' },
                    include: questInclude,
                }),
                server.prisma.questCollaborator.findMany({
                    where: { userId, acceptedAt: { not: null } },
                    include: { quest: { include: questInclude } },
                }),
            ]);

            const sponsoredQuests = sponsoredCollabs.map(c => c.quest);
            const allQuests = [...ownedQuests, ...sponsoredQuests];
            // Deduplicate by id
            const unique = Array.from(new Map(allQuests.map(q => [q.id, q])).values());

            return unique.map(({ _count, participations, ...q }: any) => ({
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

            // Check if wallet address is already used in this quest
            const normalizedAddressCheck = walletAddress.toLowerCase();
            const existingWallet = await server.prisma.questParticipation.findFirst({
                where: {
                    questId: id,
                    payoutWallet: normalizedAddressCheck,
                },
            });
            if (existingWallet) {
                return reply.status(400).send({
                    message: 'This wallet address is already used by another participant in this quest',
                } as any);
            }

            // Find user's participation (via their agents)
            const userAgents = await server.prisma.agent.findMany({
                where: { ownerId: userId },
                select: { id: true },
            });
            const agentIds = userAgents.map(a => a.id);

            const participation = await server.prisma.questParticipation.findFirst({
                where: {
                    questId: id,
                    OR: [
                        ...(agentIds.length > 0 ? [{ agentId: { in: agentIds } }] : []),
                        { userId },
                    ],
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

            const normalizedAddress = normalizedAddressCheck;

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

            notifyQuestCancelled(server, id).catch(() => { });
            return { message: 'Quest cancelled', questId: id };
        }
    );

    // ── POST /quests/:id/invite — Generate co-sponsor invite link ──────────
    server.post(
        '/:id/invite',
        {
            schema: {
                tags: ['Quests'],
                summary: 'Generate a partner invite link',
                security: [{ bearerAuth: [] }],
                params: z.object({ id: z.string().uuid() }),
                response: {
                    200: z.object({
                        inviteUrl: z.string(),
                        token: z.string(),
                        expiresAt: z.string(),
                    }),
                },
            },
            onRequest: [server.authenticate],
        },
        async (request, reply) => {
            const { id } = request.params as any;
            const userId = (request as any).user?.id;
            const userRole = (request as any).user?.role ?? 'user';

            const { allowed, quest } = await isQuestOwnerOrSponsor(server.prisma, id, userId, userRole);
            if (!allowed) return reply.status(403).send({ error: { message: 'Forbidden', code: 'FORBIDDEN' } } as any);

            if (['completed', 'cancelled', 'expired'].includes(quest.status)) {
                return reply.status(400).send({ error: { message: 'Cannot invite to a closed quest', code: 'QUEST_CLOSED' } } as any);
            }

            const sponsorCount = await server.prisma.questCollaborator.count({
                where: { questId: id, acceptedAt: { not: null } },
            });
            if (sponsorCount >= 5) {
                return reply.status(400).send({ error: { message: 'Max 5 partners reached', code: 'MAX_SPONSORS' } } as any);
            }

            const token = generateCollabToken();
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

            // Pending invite: userId is null until invitee accepts
            await server.prisma.questCollaborator.create({
                data: {
                    questId: id,
                    userId: null,
                    inviteToken: token,
                    invitedBy: userId,
                    expiresAt,
                },
            });

            const inviteUrl = `${frontendUrl}/quests/${id}/join?token=${token}`;
            return { inviteUrl, token, expiresAt: expiresAt.toISOString() };
        }
    );

    // ── POST /quests/:id/collaborate — Accept a co-sponsor invite ───────────
    server.post(
        '/:id/collaborate',
        {
            schema: {
                tags: ['Quests'],
                summary: 'Accept a co-sponsor invite via token',
                security: [{ bearerAuth: [] }],
                params: z.object({ id: z.string().uuid() }),
                body: z.object({ token: z.string().min(1) }),
                response: {
                    200: z.object({ success: z.boolean(), questId: z.string() }),
                },
            },
            onRequest: [server.authenticate],
        },
        async (request, reply) => {
            const { id } = request.params as any;
            const { token } = request.body as { token: string };
            const userId = (request as any).user?.id;

            const invite = await server.prisma.questCollaborator.findUnique({
                where: { inviteToken: token },
            });
            if (!invite || invite.questId !== id) {
                return reply.status(404).send({ error: { message: 'Invalid invite token', code: 'INVALID_TOKEN' } } as any);
            }
            if (invite.expiresAt < new Date()) {
                return reply.status(400).send({ error: { message: 'Invite link expired', code: 'TOKEN_EXPIRED' } } as any);
            }
            if (invite.acceptedAt) {
                return reply.status(400).send({ error: { message: 'Invite already used', code: 'TOKEN_USED' } } as any);
            }

            const quest = await server.prisma.quest.findUnique({ where: { id } });
            if (!quest || ['completed', 'cancelled', 'expired'].includes(quest.status)) {
                return reply.status(400).send({ error: { message: 'Quest is closed', code: 'QUEST_CLOSED' } } as any);
            }
            if (quest.creatorUserId === userId) {
                return reply.status(400).send({ error: { message: 'Owner is already a partner', code: 'OWNER_CONFLICT' } } as any);
            }

            // Check not already a sponsor (use findFirst since userId can be null)
            const existing = await server.prisma.questCollaborator.findFirst({
                where: { questId: id, userId, acceptedAt: { not: null } },
            });
            if (existing) {
                return reply.status(400).send({ error: { message: 'Already a partner', code: 'ALREADY_SPONSOR' } } as any);
            }

            // Use interactive transaction to avoid TOCTOU race on sponsor count
            await server.prisma.$transaction(async (tx) => {
                const sponsorCount = await tx.questCollaborator.count({
                    where: { questId: id, acceptedAt: { not: null } },
                });
                if (sponsorCount >= 5) {
                    throw new Error('MAX_SPONSORS');
                }
                await tx.questCollaborator.update({
                    where: { id: invite.id },
                    data: { userId, acceptedAt: new Date() },
                });
            }).catch((err: any) => {
                if (err.message === 'MAX_SPONSORS') {
                    return reply.status(400).send({ error: { message: 'Max 5 partners reached', code: 'MAX_SPONSORS' } } as any);
                }
                throw err;
            });

            return { success: true, questId: id };
        }
    );

    // ── GET /quests/:id/collaborators — List sponsors + deposits ────────────
    server.get(
        '/:id/collaborators',
        {
            schema: {
                tags: ['Quests'],
                summary: 'List collaborators and deposits for a quest',
                security: [{ bearerAuth: [] }],
                params: z.object({ id: z.string().uuid() }),
            },
            onRequest: [server.authenticate],
        },
        async (request, reply) => {
            const { id } = request.params as any;
            const userId = (request as any).user?.id;
            const userRole = (request as any).user?.role ?? 'user';

            const { allowed } = await isQuestOwnerOrSponsor(server.prisma, id, userId, userRole);
            if (!allowed) return reply.status(403).send({ error: { message: 'Forbidden', code: 'FORBIDDEN' } } as any);

            const [collaborators, deposits, quest] = await Promise.all([
                server.prisma.questCollaborator.findMany({
                    where: { questId: id, acceptedAt: { not: null } },
                    include: { user: { select: { displayName: true, username: true, email: true } } },
                    orderBy: { acceptedAt: 'asc' },
                }),
                server.prisma.questDeposit.findMany({
                    where: { questId: id },
                    orderBy: { createdAt: 'asc' },
                }),
                server.prisma.quest.findUnique({ where: { id }, select: { rewardAmount: true, totalFunded: true } }),
            ]);

            return {
                collaborators: collaborators
                    .filter(c => c.user !== null)
                    .map(c => ({
                        id: c.id, questId: c.questId, userId: c.userId,
                        invitedBy: c.invitedBy, acceptedAt: c.acceptedAt?.toISOString() ?? null,
                        expiresAt: c.expiresAt.toISOString(), createdAt: c.createdAt.toISOString(),
                        displayName: c.user!.displayName, username: c.user!.username,
                    })),
                deposits: deposits.map(d => ({
                    id: d.id, questId: d.questId, userId: d.userId,
                    escrowQuestId: d.escrowQuestId, amount: Number(d.amount),
                    tokenAddress: d.tokenAddress, chainId: d.chainId,
                    txHash: d.txHash, walletAddress: d.walletAddress,
                    status: d.status, createdAt: d.createdAt.toISOString(),
                })),
                totalFunded: Number(quest?.totalFunded ?? 0),
                rewardAmount: Number(quest?.rewardAmount ?? 0),
            };
        }
    );

    // ── DELETE /quests/:id/collaborators/:targetUserId — Remove sponsor ──────
    server.delete(
        '/:id/collaborators/:targetUserId',
        {
            schema: {
                tags: ['Quests'],
                summary: 'Remove a sponsor from a quest (owner only)',
                security: [{ bearerAuth: [] }],
                params: z.object({
                    id: z.string().uuid(),
                    targetUserId: z.string().uuid(),
                }),
                response: {
                    200: z.object({ success: z.boolean() }),
                },
            },
            onRequest: [server.authenticate],
        },
        async (request, reply) => {
            const { id, targetUserId } = request.params as any;
            const userId = (request as any).user?.id;
            const userRole = (request as any).user?.role ?? 'user';

            const { allowed, isOwner } = await isQuestOwnerOrSponsor(server.prisma, id, userId, userRole);
            if (!allowed || !isOwner) {
                return reply.status(403).send({ error: { message: 'Only owner can remove partners', code: 'FORBIDDEN' } } as any);
            }

            const collab = await server.prisma.questCollaborator.findUnique({
                where: { questId_userId: { questId: id, userId: targetUserId } },
            });
            if (!collab) return reply.status(404).send({ error: { message: 'Sponsor not found', code: 'NOT_FOUND' } } as any);

            await server.prisma.questCollaborator.delete({
                where: { questId_userId: { questId: id, userId: targetUserId } },
            });

            return { success: true };
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
                notifyProofVerified(server, pid, action === 'approve' ? 'approved' : 'rejected').catch(() => { });
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
                    user: { select: USER_IDENTITY_SELECT },
                    agent: { select: { agentname: true } },
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
                    agentName: p.agent?.agentname ?? 'anonymous',
                    humanHandle: resolveHumanHandle(p),
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

    // ── POST /quests/:id/distribute-payouts — Distribute LLM token payouts ───
    server.post(
        '/:id/distribute-payouts',
        {
            schema: {
                tags: ['Quests'],
                summary: 'Distribute LLM token payouts to quest winners',
                security: [{ bearerAuth: [] }],
                params: z.object({ id: z.string().uuid() }),
                response: {
                    200: z.object({
                        distributed: z.number(),
                        failed: z.number(),
                        results: z.array(z.object({
                            participationId: z.string(),
                            success: z.boolean(),
                            apiKey: z.string().optional(),
                            error: z.string().optional(),
                        })),
                    }),
                },
            },
            onRequest: [server.authenticate],
        },
        async (request, reply) => {
            const { id: questId } = request.params as any;
            const userId = request.user.id;
            const userRole = request.user.role ?? 'user';

            // Verify quest exists and check permissions
            const quest = await server.prisma.quest.findUnique({ where: { id: questId } });
            if (!quest) {
                return reply.status(404).send({ message: 'Quest not found' } as any);
            }

            const { allowed } = await isQuestCreatorOrAdmin(server.prisma, questId, userId, userRole);
            if (!allowed) {
                return reply.status(403).send({
                    message: 'Only quest creator or admin can distribute payouts'
                } as any);
            }

            // Verify this is an LLM token reward quest
            if (quest.rewardType !== REWARD_TYPE.LLMTOKEN_OPENROUTER) {
                return reply.status(400).send({
                    message: 'This endpoint is only for LLMTOKEN_OPENROUTER reward type'
                } as any);
            }

            if (!quest.tokenProvider || !quest.tokenAmount) {
                return reply.status(400).send({
                    message: 'Quest missing tokenProvider or tokenAmount configuration'
                } as any);
            }

            // Get completed participations without token payouts
            const participations = await server.prisma.questParticipation.findMany({
                where: {
                    questId,
                    status: 'completed',
                    OR: [
                        { payoutTokenStatus: null },
                        { payoutTokenStatus: 'pending_key_creation' },
                    ],
                },
                include: {
                    user: { select: { id: true, email: true, username: true } },
                    agent: { select: { id: true, agentname: true } },
                },
            });

            if (participations.length === 0) {
                return reply.status(200).send({
                    distributed: 0,
                    failed: 0,
                    results: [],
                    message: 'No pending payouts to distribute',
                } as any);
            }

            const results: Array<{
                participationId: string;
                success: boolean;
                apiKey?: string;
                error?: string;
            }> = [];

            let distributed = 0;
            let failed = 0;

            // Process each participation
            for (const participation of participations) {
                try {
                    // Generate unique key name
                    const timestamp = Date.now();
                    const identifier = participation.user?.username ||
                        participation.agent?.agentname ||
                        participation.id.substring(0, 8);
                    const keyName = `quest_${questId.substring(0, 8)}_${identifier}_${timestamp}`;

                    // Set expiry to 30 days from now
                    const expiresAt = new Date();
                    expiresAt.setDate(expiresAt.getDate() + 30);

                    // Create API key via OpenRouter
                    const keyResponse = await openRouterService.createApiKey({
                        name: keyName,
                        limit: Number(quest.tokenAmount),
                        expiresAt: expiresAt.toISOString(),
                    });

                    // Update participation with key details
                    await server.prisma.questParticipation.update({
                        where: { id: participation.id },
                        data: {
                            payoutTokenProvider: quest.tokenProvider,
                            payoutTokenAmount: quest.tokenAmount,
                            payoutTokenApiKey: keyResponse.key,
                            payoutTokenKeyId: keyResponse.id,
                            payoutTokenExpiresAt: expiresAt,
                            payoutTokenStatus: 'key_sent',
                        },
                    });

                    results.push({
                        participationId: participation.id,
                        success: true,
                        apiKey: keyResponse.key,
                    });

                    distributed++;
                } catch (error: any) {
                    console.error(`[Payout] Failed to create key for participation ${participation.id}:`, error);

                    // Update status to track failure
                    await server.prisma.questParticipation.update({
                        where: { id: participation.id },
                        data: {
                            payoutTokenStatus: 'pending_key_creation',
                        },
                    });

                    results.push({
                        participationId: participation.id,
                        success: false,
                        error: error.message || 'Failed to create API key',
                    });

                    failed++;
                }
            }

            return {
                distributed,
                failed,
                results,
            };
        }
    );

    // ── POST /quests/:id/issue-llm-keys — Manual trigger for LLM key reward ───
    server.post(
        '/:id/issue-llm-keys',
        {
            preHandler: [server.authenticate],
            schema: {
                params: z.object({ id: z.string().uuid() }),
                response: {
                    200: z.object({ issued: z.number(), failed: z.number() }),
                },
            },
        },
        async (request, reply) => {
            const { id: questId } = request.params as { id: string };

            const quest = await server.prisma.quest.findUnique({
                where: { id: questId },
                select: { llmKeyRewardEnabled: true, creatorUserId: true, creatorAgentId: true },
            });
            if (!quest) return reply.code(404).send({ error: { message: 'Quest not found', code: 'QUEST_NOT_FOUND' } });
            if (!quest.llmKeyRewardEnabled) return reply.code(400).send({ error: { message: 'LLM key reward not enabled for this quest', code: 'LLM_REWARD_DISABLED' } });

            const userId = (request.user as { id?: string })?.id;
            const isOwner = userId && quest.creatorUserId === userId;
            if (!isOwner) return reply.code(403).send({ error: { message: 'Forbidden', code: 'FORBIDDEN' } });

            const result = await issueLlmKeysForQuest(server.prisma, questId);
            return result;
        },
    );

    // ── POST /quests/:id/verify/:participationId — Verify participation (simpler path) ───
    server.post(
        '/:id/verify/:participationId',
        {
            schema: {
                tags: ['Quests'],
                summary: 'Verify (approve/reject) a submitted proof',
                security: [{ bearerAuth: [] }],
                params: z.object({
                    id: z.string().uuid(),
                    participationId: z.string().uuid(),
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
            const { id: questId, participationId } = request.params as any;
            const { action, reason } = request.body as any;
            const userId = request.user.id;
            const userRole = request.user.role ?? 'user';

            const { allowed } = await isQuestCreatorOrAdmin(server.prisma, questId, userId, userRole);
            if (!allowed) return reply.status(403).send({ message: 'Only quest creator or admin can verify proofs' } as any);

            try {
                const participation = await verifyParticipation(server.prisma, questId, participationId, action, reason);
                notifyProofVerified(server, participationId, action === 'approve' ? 'approved' : 'rejected').catch(() => { });
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

    // ── POST /quests/:id/payout/:participationId — Trigger payout for single participation ───
    server.post(
        '/:id/payout/:participationId',
        {
            schema: {
                tags: ['Quests'],
                summary: 'Trigger payout for a single quest participation',
                security: [{ bearerAuth: [] }],
                params: z.object({
                    id: z.string().uuid(),
                    participationId: z.string().uuid(),
                }),
                response: {
                    200: z.object({
                        success: z.boolean(),
                        participationId: z.string(),
                        apiKey: z.string().optional(),
                        message: z.string(),
                        error: z.string().optional(),
                    }),
                },
            },
            onRequest: [server.authenticate],
        },
        async (request, reply) => {
            const { id: questId, participationId } = request.params as any;
            const userId = request.user.id;
            const userRole = request.user.role ?? 'user';

            // Verify quest exists and check permissions
            const quest = await server.prisma.quest.findUnique({ where: { id: questId } });
            if (!quest) {
                return reply.status(404).send({ message: 'Quest not found' } as any);
            }

            const { allowed } = await isQuestCreatorOrAdmin(server.prisma, questId, userId, userRole);
            if (!allowed) {
                return reply.status(403).send({
                    message: 'Only quest creator or admin can trigger payouts'
                } as any);
            }

            // Get the participation
            const participation = await server.prisma.questParticipation.findUnique({
                where: { id: participationId },
                include: {
                    user: { select: { id: true, email: true, username: true } },
                    agent: { select: { id: true, agentname: true } },
                },
            });

            if (!participation) {
                return reply.status(404).send({ message: 'Participation not found' } as any);
            }

            if (participation.questId !== questId) {
                return reply.status(400).send({ message: 'Participation does not belong to this quest' } as any);
            }

            if (participation.status !== 'completed') {
                return reply.status(400).send({
                    message: 'Participation must be completed before payout',
                } as any);
            }

            // Check if already paid
            if (participation.payoutTokenStatus === 'key_sent') {
                return reply.status(400).send({
                    message: 'Payout already processed for this participation',
                } as any);
            }

            // Verify this is an LLM token reward quest
            if (quest.rewardType !== REWARD_TYPE.LLMTOKEN_OPENROUTER) {
                return reply.status(400).send({
                    message: 'This endpoint is only for LLMTOKEN_OPENROUTER reward type'
                } as any);
            }

            if (!quest.tokenProvider || !quest.tokenAmount) {
                return reply.status(400).send({
                    message: 'Quest missing tokenProvider or tokenAmount configuration'
                } as any);
            }

            try {
                // Generate unique key name
                const timestamp = Date.now();
                const identifier = participation.user?.username ||
                    participation.agent?.agentname ||
                    participation.id.substring(0, 8);
                const keyName = `quest_${questId.substring(0, 8)}_${identifier}_${timestamp}`;

                // Set expiry to 30 days from now
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + 30);

                // Create API key via OpenRouter
                const keyResponse = await openRouterService.createApiKey({
                    name: keyName,
                    limit: Number(quest.tokenAmount),
                    expiresAt: expiresAt.toISOString(),
                });

                // Update participation with key details
                await server.prisma.questParticipation.update({
                    where: { id: participation.id },
                    data: {
                        payoutTokenProvider: quest.tokenProvider,
                        payoutTokenAmount: quest.tokenAmount,
                        payoutTokenApiKey: keyResponse.key,
                        payoutTokenKeyId: keyResponse.id,
                        payoutTokenExpiresAt: expiresAt,
                        payoutTokenStatus: 'key_sent',
                    },
                });

                return {
                    success: true,
                    participationId: participation.id,
                    apiKey: keyResponse.key,
                    message: 'Payout processed successfully',
                };
            } catch (error: any) {
                console.error(`[Payout] Failed to create key for participation ${participation.id}:`, error);

                // Update status to track failure
                await server.prisma.questParticipation.update({
                    where: { id: participation.id },
                    data: {
                        payoutTokenStatus: 'pending_key_creation',
                    },
                });

                return reply.status(500).send({
                    success: false,
                    participationId: participation.id,
                    message: 'Failed to process payout',
                    error: error.message || 'Unknown error',
                } as any);
            }
        }
    );
}
