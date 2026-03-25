/**
 * GitHub Bounty REST API routes.
 *
 * Prefix: /github-bounties (registered in app.ts)
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
    analyzeRepo,
    createBounty,
    createBounties,
    listBounties,
    listMyBounties,
    submitPr,
    updateSubmissionStatus,
} from './github-bounty.service';
import { listRepos } from './github-rest-client';

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const CreateBountySchema = z.object({
    repoOwner: z.string().min(1).max(100),
    repoName: z.string().min(1).max(100),
    title: z.string().min(10).max(200),
    description: z.string().min(20),
    rewardAmount: z.number().nonnegative(),
    rewardType: z.enum(['USDC', 'USD', 'LLM_KEY']),
    questType: z.enum(['fcfs', 'leaderboard']).default('fcfs'),
    maxWinners: z.number().int().min(1).max(50).default(1),
    deadline: z.string().datetime().optional(),
    issueNumber: z.number().int().positive().optional(),
    issueUrl: z.string().url().optional(),
    llmKeyTokenLimit: z.number().int().positive().optional(),
});

const BulkCreateSchema = z.object({
    bounties: z.array(CreateBountySchema).min(1).max(20),
});

const SubmitPrSchema = z.object({
    prUrl: z.string().url().regex(/github\.com\/.+\/.+\/pull\/\d+/, 'Must be a valid GitHub PR URL'),
});

const UpdateSubmissionSchema = z.object({
    action: z.enum(['approve', 'reject']),
});

const ListQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(20),
    status: z.enum(['live', 'completed']).optional(),
    rewardType: z.enum(['USDC', 'USD', 'LLM_KEY']).optional(),
    repoOwner: z.string().optional(),
    repoName: z.string().optional(),
});

const AnalyzeRepoSchema = z.object({
    repoUrl: z.string().url().regex(/github\.com\/.+\/.+/, 'Must be a valid GitHub repo URL'),
});

// ─── Routes ───────────────────────────────────────────────────────────────────

export async function githubBountyRoutes(app: FastifyInstance) {
    // ── POST /analyze-repo — LLM-powered bounty suggestions ──
    app.post(
        '/analyze-repo',
        {
            onRequest: [app.authenticate],
            schema: {
                tags: ['GitHub Bounties'],
                summary: 'Analyze a GitHub repo and get LLM-suggested bounties',
                security: [{ bearerAuth: [] }],
                body: AnalyzeRepoSchema,
            },
        },
        async (request, reply) => {
            const { repoUrl } = AnalyzeRepoSchema.parse(request.body);
            const result = await analyzeRepo(repoUrl);
            return result;
        }
    );

    // ── GET /list-repos — List public repos for a GitHub org or user ──
    app.get(
        '/list-repos',
        {
            onRequest: [app.authenticate],
            schema: {
                tags: ['GitHub Bounties'],
                summary: 'List public repos for a GitHub org or user',
                security: [{ bearerAuth: [] }],
                querystring: z.object({ owner: z.string().min(1).max(100) }),
            },
        },
        async (request, reply) => {
            const { owner } = request.query as { owner: string };
            try {
                const repos = await listRepos(owner, process.env.GITHUB_TOKEN ?? null);
                return { repos };
            } catch (err: any) {
                return reply.status(404).send({ error: { message: err.message, code: 'ORG_NOT_FOUND' } });
            }
        }
    );

    // ── GET / — List live bounties ──
    app.get(
        '/',
        {
            schema: {
                tags: ['GitHub Bounties'],
                summary: 'List live GitHub bounties (public)',
                querystring: ListQuerySchema,
            },
        },
        async (request) => {
            const query = ListQuerySchema.parse(request.query);
            return listBounties(app.prisma, query);
        }
    );

    // ── GET /mine — My bounties (creator view) ──
    app.get(
        '/mine',
        {
            onRequest: [app.authenticate],
            schema: {
                tags: ['GitHub Bounties'],
                summary: 'Get bounties created by the current user',
                security: [{ bearerAuth: [] }],
            },
        },
        async (request) => {
            return listMyBounties(app.prisma, request.user.id);
        }
    );

    // ── GET /my-submissions — PRs submitted by the current user ──
    app.get(
        '/my-submissions',
        {
            onRequest: [app.authenticate],
            schema: {
                tags: ['GitHub Bounties'],
                summary: 'Get all PR submissions made by the current user',
                security: [{ bearerAuth: [] }],
            },
        },
        async (request) => {
            const submissions = await app.prisma.gitHubBountySubmission.findMany({
                where: { userId: request.user.id },
                orderBy: { createdAt: 'desc' },
                include: {
                    bounty: {
                        select: {
                            id: true, title: true, repoOwner: true, repoName: true,
                            rewardAmount: true, rewardType: true, status: true,
                        },
                    },
                },
            });
            return submissions;
        }
    );

    // ── POST / — Create a single bounty ──
    app.post(
        '/',
        {
            onRequest: [app.authenticate],
            schema: {
                tags: ['GitHub Bounties'],
                summary: 'Create a GitHub bounty',
                security: [{ bearerAuth: [] }],
                body: CreateBountySchema,
            },
        },
        async (request, reply) => {
            const input = CreateBountySchema.parse(request.body);
            const bounty = await createBounty(app.prisma, request.user.id, input);
            return reply.status(201).send(bounty);
        }
    );

    // ── POST /bulk — Bulk create bounties from suggestions ──
    app.post(
        '/bulk',
        {
            onRequest: [app.authenticate],
            schema: {
                tags: ['GitHub Bounties'],
                summary: 'Bulk create bounties (from LLM suggestions)',
                security: [{ bearerAuth: [] }],
                body: BulkCreateSchema,
            },
        },
        async (request, reply) => {
            const { bounties } = BulkCreateSchema.parse(request.body);
            const created = await createBounties(app.prisma, request.user.id, bounties);
            return reply.status(201).send({ bounties: created });
        }
    );

    // ── GET /:id — Get bounty detail ──
    app.get(
        '/:id',
        {
            schema: {
                tags: ['GitHub Bounties'],
                summary: 'Get a GitHub bounty by ID (public)',
                params: z.object({ id: z.string().uuid() }),
            },
        },
        async (request, reply) => {
            const { id } = (request.params as { id: string });
            const bounty = await app.prisma.gitHubBounty.findUnique({
                where: { id },
                include: { _count: { select: { submissions: true } } },
            });
            if (!bounty) return reply.status(404).send({ error: { message: 'Bounty not found', code: 'NOT_FOUND' } });
            return bounty;
        }
    );

    // ── PATCH /:id — Update a draft bounty ──
    app.patch(
        '/:id',
        {
            onRequest: [app.authenticate],
            schema: {
                tags: ['GitHub Bounties'],
                summary: 'Update a draft bounty (creator only)',
                security: [{ bearerAuth: [] }],
                params: z.object({ id: z.string().uuid() }),
                body: CreateBountySchema.partial(),
            },
        },
        async (request, reply) => {
            const { id } = (request.params as { id: string });
            const bounty = await app.prisma.gitHubBounty.findUnique({ where: { id } });
            if (!bounty) return reply.status(404).send({ error: { message: 'Bounty not found', code: 'NOT_FOUND' } });
            if (bounty.creatorUserId !== request.user.id) return reply.status(403).send({ error: { message: 'Forbidden', code: 'FORBIDDEN' } });
            if (bounty.status !== 'draft') return reply.status(400).send({ error: { message: 'Only draft bounties can be edited', code: 'NOT_DRAFT' } });

            const input = CreateBountySchema.partial().parse(request.body);
            const updated = await app.prisma.gitHubBounty.update({
                where: { id },
                data: {
                    ...input,
                    deadline: input.deadline ? new Date(input.deadline) : undefined,
                },
            });
            return updated;
        }
    );

    // ── DELETE /:id — Cancel a bounty ──
    app.delete(
        '/:id',
        {
            onRequest: [app.authenticate],
            schema: {
                tags: ['GitHub Bounties'],
                summary: 'Cancel a bounty (creator only)',
                security: [{ bearerAuth: [] }],
                params: z.object({ id: z.string().uuid() }),
            },
        },
        async (request, reply) => {
            const { id } = (request.params as { id: string });
            const bounty = await app.prisma.gitHubBounty.findUnique({ where: { id } });
            if (!bounty) return reply.status(404).send({ error: { message: 'Bounty not found', code: 'NOT_FOUND' } });
            if (bounty.creatorUserId !== request.user.id) return reply.status(403).send({ error: { message: 'Forbidden', code: 'FORBIDDEN' } });
            if (bounty.status === 'completed') return reply.status(400).send({ error: { message: 'Completed bounties cannot be cancelled', code: 'ALREADY_COMPLETED' } });

            await app.prisma.gitHubBounty.update({ where: { id }, data: { status: 'cancelled' } });
            return { ok: true };
        }
    );

    // ── POST /:id/submit — Submit a PR ──
    app.post(
        '/:id/submit',
        {
            onRequest: [app.authenticate],
            schema: {
                tags: ['GitHub Bounties'],
                summary: 'Submit a PR to claim a bounty',
                security: [{ bearerAuth: [] }],
                params: z.object({ id: z.string().uuid() }),
                body: SubmitPrSchema,
            },
        },
        async (request, reply) => {
            const { id } = (request.params as { id: string });
            const { prUrl } = SubmitPrSchema.parse(request.body);
            const result = await submitPr(app.prisma, id, request.user.id, prUrl);

            if ('error' in result) return reply.status(400).send({ error: { message: result.error, code: 'SUBMISSION_ERROR' } });

            return reply.status(201).send(result.submission);
        }
    );

    // ── GET /:id/submissions — List submissions (public, approve/reject requires creator) ──
    app.get(
        '/:id/submissions',
        {
            schema: {
                tags: ['GitHub Bounties'],
                summary: 'List submissions for a bounty (public)',
                params: z.object({ id: z.string().uuid() }),
            },
        },
        async (request, reply) => {
            const { id } = (request.params as { id: string });
            const bounty = await app.prisma.gitHubBounty.findUnique({ where: { id } });
            if (!bounty) return reply.status(404).send({ error: { message: 'Bounty not found', code: 'NOT_FOUND' } });

            const submissions = await app.prisma.gitHubBountySubmission.findMany({
                where: { bountyId: id },
                orderBy: { createdAt: 'asc' },
                include: {
                    user: { select: { id: true, username: true, displayName: true, githubHandle: true } },
                    agent: { select: { id: true, agentname: true } },
                },
            });
            return submissions;
        }
    );

    // ── PATCH /:id/submissions/:subId — Approve or reject a submission ──
    app.patch(
        '/:id/submissions/:subId',
        {
            onRequest: [app.authenticate],
            schema: {
                tags: ['GitHub Bounties'],
                summary: 'Approve or reject a submission (creator only)',
                security: [{ bearerAuth: [] }],
                params: z.object({ id: z.string().uuid(), subId: z.string().uuid() }),
                body: UpdateSubmissionSchema,
            },
        },
        async (request, reply) => {
            const { id, subId } = (request.params as { id: string; subId: string });
            const { action } = UpdateSubmissionSchema.parse(request.body);
            const result = await updateSubmissionStatus(app.prisma, id, subId, request.user.id, action);

            if (result.error) return reply.status(400).send({ error: { message: result.error, code: 'ACTION_ERROR' } });
            return result.submission;
        }
    );
}
