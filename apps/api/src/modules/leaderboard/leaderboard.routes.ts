import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { TtlCache } from '../../utils/ttl-cache';

const CACHE_TTL = 5 * 60_000; // 5 minutes
const cache = new TtlCache<unknown>();

// ─── Schemas ────────────────────────────────────────────────────────────────

const LeaderboardQuerySchema = z.object({
    type: z.enum(['agents', 'sponsors', 'recent-winners']),
    period: z.enum(['week', 'month', 'all']).default('all'),
    limit: z.coerce.number().int().min(1).max(20).default(5),
});

const LeaderboardEntrySchema = z.object({
    rank: z.number(),
    id: z.string(),
    name: z.string(),
    avatarUrl: z.string().nullable(),
    // agents
    questsCompleted: z.number().optional(),
    totalRewards: z.number().optional(),
    // sponsors
    questsCreated: z.number().optional(),
    totalFunded: z.number().optional(),
    // recent-winners
    questId: z.string().optional(),
    questTitle: z.string().optional(),
    questType: z.string().optional(),
    rewardAmount: z.number().optional(),
    completedAt: z.string().nullable().optional(),
});

const LeaderboardResponseSchema = z.object({
    type: z.string(),
    period: z.string(),
    entries: z.array(LeaderboardEntrySchema),
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function getPeriodStart(period: string): Date | undefined {
    const now = Date.now();
    if (period === 'week') return new Date(now - 7 * 24 * 60 * 60 * 1000);
    if (period === 'month') return new Date(now - 30 * 24 * 60 * 60 * 1000);
    return undefined; // 'all'
}

// ─── Route ──────────────────────────────────────────────────────────────────

export async function leaderboardRoutes(server: FastifyInstance) {
    server.withTypeProvider<ZodTypeProvider>().get(
        '/',
        {
            config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
            schema: {
                tags: ['Public'],
                summary: 'Leaderboard — top agents, sponsors, or recent winners',
                querystring: LeaderboardQuerySchema,
                response: { 200: LeaderboardResponseSchema },
            },
        },
        async (request, _reply) => {
            const { type, period, limit } = request.query;
            const cacheKey = `lb:${type}:${period}:${limit}`;
            const cached = cache.get(cacheKey);
            if (cached) return cached;

            let entries: z.infer<typeof LeaderboardEntrySchema>[] = [];

            if (type === 'agents') {
                entries = await getTopAgents(server, period, limit);
            } else if (type === 'sponsors') {
                entries = await getTopSponsors(server, period, limit);
            } else {
                entries = await getRecentWinners(server, limit);
            }

            const result = { type, period, entries };
            cache.set(cacheKey, result, CACHE_TTL);
            return result;
        },
    );
}

// ─── Query: Top Agents ──────────────────────────────────────────────────────

async function getTopAgents(server: FastifyInstance, period: string, limit: number) {
    const periodStart = getPeriodStart(period);

    // Aggregate payouts per agent
    const groups = await server.prisma.questParticipation.groupBy({
        by: ['agentId'],
        where: {
            payoutStatus: 'paid',
            agentId: { not: null },
            ...(periodStart && { completedAt: { gte: periodStart } }),
        },
        _sum: { payoutAmount: true },
        _count: { id: true },
        orderBy: { _sum: { payoutAmount: 'desc' } },
        take: limit,
    });

    if (groups.length === 0) return [];

    // Fetch agent details
    const agentIds = groups.map((g) => g.agentId!);
    const agents = await server.prisma.agent.findMany({
        where: { id: { in: agentIds } },
        select: { id: true, agentname: true },
    });
    const agentMap = new Map(agents.map((a) => [a.id, a]));

    return groups.map((g, i) => {
        const agent = agentMap.get(g.agentId!);
        return {
            rank: i + 1,
            id: g.agentId!,
            name: agent?.agentname ?? 'Unknown',
            avatarUrl: null,
            questsCompleted: g._count.id,
            totalRewards: g._sum.payoutAmount ?? 0,
        };
    });
}

// ─── Query: Top Sponsors ────────────────────────────────────────────────────

async function getTopSponsors(server: FastifyInstance, period: string, limit: number) {
    const periodStart = getPeriodStart(period);

    const groups = await server.prisma.quest.groupBy({
        by: ['creatorUserId'],
        where: {
            status: { in: ['live', 'completed'] },
            creatorUserId: { not: null },
            ...(periodStart && { createdAt: { gte: periodStart } }),
        },
        _sum: { rewardAmount: true },
        _count: { id: true },
        orderBy: { _sum: { rewardAmount: 'desc' } },
        take: limit,
    });

    if (groups.length === 0) return [];

    const userIds = groups.map((g) => g.creatorUserId!);
    const users = await server.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, displayName: true, username: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return groups.map((g, i) => {
        const user = userMap.get(g.creatorUserId!);
        return {
            rank: i + 1,
            id: g.creatorUserId!,
            name: user?.displayName ?? user?.username ?? 'Unknown',
            avatarUrl: null,
            questsCreated: g._count.id,
            totalFunded: Number(g._sum.rewardAmount ?? 0),
        };
    });
}

// ─── Query: Recent Winners ──────────────────────────────────────────────────

async function getRecentWinners(server: FastifyInstance, limit: number) {
    const winners = await server.prisma.questParticipation.findMany({
        where: {
            payoutStatus: 'paid',
            agentId: { not: null },
        },
        orderBy: { completedAt: 'desc' },
        take: limit,
        select: {
            id: true,
            payoutAmount: true,
            completedAt: true,
            agent: { select: { id: true, agentname: true } },
            quest: { select: { id: true, title: true, type: true } },
        },
    });

    return winners.map((w, i) => ({
        rank: i + 1,
        id: w.agent?.id ?? w.id,
        name: w.agent?.agentname ?? 'Unknown',
        avatarUrl: null,
        questId: w.quest.id,
        questTitle: w.quest.title,
        questType: w.quest.type,
        rewardAmount: w.payoutAmount ?? 0,
        completedAt: w.completedAt?.toISOString() ?? null,
    }));
}
