import { PrismaClient, Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../../app';

// ─── Pagination helper ───────────────────────────────────────────────────────

interface PaginationParams {
    page: number;
    pageSize: number;
}

function paginate(params: PaginationParams) {
    return {
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
    };
}

function paginationMeta(total: number, params: PaginationParams) {
    return {
        page: params.page,
        pageSize: params.pageSize,
        total,
        totalPages: Math.ceil(total / params.pageSize),
    };
}

// ─── Quest Management ────────────────────────────────────────────────────────

export interface AdminQuestListParams extends PaginationParams {
    status?: string;
    type?: string;
    fundingStatus?: string;
    search?: string;
    creatorId?: string;
    sort: string;
    order: string;
}

export async function listQuests(prisma: PrismaClient, params: AdminQuestListParams) {
    const where: Prisma.QuestWhereInput = {};

    if (params.status) where.status = params.status;
    if (params.type) where.type = params.type;
    if (params.fundingStatus) where.fundingStatus = params.fundingStatus;
    if (params.creatorId) where.creatorUserId = params.creatorId;
    if (params.search) {
        where.title = { contains: params.search, mode: 'insensitive' };
    }

    const orderBy: Prisma.QuestOrderByWithRelationInput = {
        [params.sort]: params.order,
    };

    const [quests, total] = await Promise.all([
        prisma.quest.findMany({
            where,
            orderBy,
            ...paginate(params),
            include: {
                _count: { select: { participations: true } },
            },
        }),
        prisma.quest.count({ where }),
    ]);

    const data = quests.map((q) => ({
        id: q.id,
        title: q.title,
        status: q.status,
        type: q.type,
        rewardAmount: Number(q.rewardAmount),
        rewardType: q.rewardType,
        totalSlots: q.totalSlots,
        filledSlots: q.filledSlots,
        fundingStatus: q.fundingStatus,
        fundingMethod: q.fundingMethod,
        creatorEmail: q.creatorEmail,
        creatorUserId: q.creatorUserId,
        createdAt: q.createdAt.toISOString(),
        expiresAt: q.expiresAt?.toISOString() ?? null,
        participationCount: (q as any)._count.participations,
    }));

    return { data, pagination: paginationMeta(total, params) };
}

export async function getQuestDetail(prisma: PrismaClient, questId: string) {
    const quest = await prisma.quest.findUnique({
        where: { id: questId },
    });
    if (!quest) return null;

    // Aggregate participation counts
    const participationSummary = await prisma.questParticipation.groupBy({
        by: ['status'],
        where: { questId },
        _count: true,
    });

    const summaryMap = new Map(participationSummary.map((s) => [s.status, s._count]));

    return {
        ...quest,
        rewardAmount: Number(quest.rewardAmount),
        createdAt: quest.createdAt.toISOString(),
        expiresAt: quest.expiresAt?.toISOString() ?? null,
        startAt: quest.startAt?.toISOString() ?? null,
        claimedAt: quest.claimedAt?.toISOString() ?? null,
        participationSummary: {
            total: quest.filledSlots,
            completed: summaryMap.get('completed') ?? 0,
            inProgress: summaryMap.get('in_progress') ?? 0,
            submitted: summaryMap.get('submitted') ?? 0,
            failed: summaryMap.get('failed') ?? 0,
        },
    };
}

export async function listQuestParticipations(prisma: PrismaClient, questId: string, params: PaginationParams) {
    const [participations, total] = await Promise.all([
        prisma.questParticipation.findMany({
            where: { questId },
            include: {
                agent: { select: { agentname: true, id: true } },
            },
            orderBy: { joinedAt: 'desc' },
            ...paginate(params),
        }),
        prisma.questParticipation.count({ where: { questId } }),
    ]);

    const data = participations.map((p) => ({
        id: p.id,
        agentId: p.agentId,
        agentName: p.agent?.agentname ?? 'anonymous',
        status: p.status,
        tasksCompleted: p.tasksCompleted,
        tasksTotal: p.tasksTotal,
        payoutAmount: p.payoutAmount,
        payoutStatus: p.payoutStatus,
        joinedAt: p.joinedAt.toISOString(),
        completedAt: p.completedAt?.toISOString() ?? null,
    }));

    return { data, pagination: paginationMeta(total, params) };
}


export interface AdminUpdateQuestInput {
    title?: string;
    description?: string;
    sponsor?: string;
    type?: string;
    status?: string;
    rewardAmount?: number;
    rewardType?: string;
    totalSlots?: number;
    tags?: string[];
    requiredSkills?: string[];
    expiresAt?: string | null;
    startAt?: string | null;
    fundingStatus?: string;
}

export async function adminUpdateQuest(
    prisma: PrismaClient,
    questId: string,
    input: AdminUpdateQuestInput,
) {
    const quest = await prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) return null;

    const data: any = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description;
    if (input.sponsor !== undefined) data.sponsor = input.sponsor;
    if (input.type !== undefined) data.type = input.type;
    if (input.status !== undefined) data.status = input.status;
    if (input.rewardAmount !== undefined) data.rewardAmount = input.rewardAmount;
    if (input.rewardType !== undefined) data.rewardType = input.rewardType;
    if (input.totalSlots !== undefined) data.totalSlots = input.totalSlots;
    if (input.tags !== undefined) data.tags = input.tags;
    if (input.requiredSkills !== undefined) data.requiredSkills = input.requiredSkills;
    if (input.expiresAt !== undefined) data.expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
    if (input.startAt !== undefined) data.startAt = input.startAt ? new Date(input.startAt) : null;
    if (input.fundingStatus !== undefined) data.fundingStatus = input.fundingStatus;

    return prisma.quest.update({ where: { id: questId }, data });
}

export async function adminDeleteQuest(prisma: PrismaClient, questId: string) {
    const quest = await prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) return null;

    if (quest.fundingStatus === 'confirmed' && quest.refundStatus !== 'completed') {
        return { error: 'HAS_ESCROW_FUNDS' } as const;
    }

    await prisma.quest.delete({ where: { id: questId } });
    return { deleted: true } as const;
}

export async function forceQuestStatus(
    prisma: PrismaClient,
    questId: string,
    status: string,
    reason: string,
    adminEmail: string,
) {
    const quest = await prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) return null;

    const previousStatus = quest.status;
    const updated = await prisma.quest.update({
        where: { id: questId },
        data: { status },
    });

    return {
        questId,
        previousStatus,
        newStatus: status,
        reason,
        adminEmail,
        updatedAt: updated.updatedAt.toISOString(),
    };
}

// ─── User Management ─────────────────────────────────────────────────────────

export interface AdminUserListParams extends PaginationParams {
    search?: string;
    role?: string;
    sort: string;
    order: string;
}

export async function listUsers(prisma: PrismaClient, params: AdminUserListParams) {
    const where: Prisma.UserWhereInput = {};

    if (params.role) where.role = params.role;
    if (params.search) {
        where.email = { contains: params.search, mode: 'insensitive' };
    }

    const orderBy: Prisma.UserOrderByWithRelationInput = {
        [params.sort]: params.order,
    };

    const [users, total] = await Promise.all([
        prisma.user.findMany({
            where,
            orderBy,
            ...paginate(params),
            include: {
                _count: {
                    select: {
                        agents: true,
                        wallets: true,
                    },
                },
            },
        }),
        prisma.user.count({ where }),
    ]);

    // Get quest counts per user (created quests)
    const userIds = users.map((u) => u.id);
    const questCounts = await prisma.quest.groupBy({
        by: ['creatorUserId'],
        where: { creatorUserId: { in: userIds } },
        _count: true,
    });
    const questCountMap = new Map(questCounts.map((q) => [q.creatorUserId, q._count]));

    const data = users.map((u) => ({
        id: u.id,
        email: u.email,
        username: u.username,
        role: u.role,
        supabaseId: u.supabaseId,
        createdAt: u.createdAt.toISOString(),
        agentCount: (u as any)._count.agents,
        questCount: questCountMap.get(u.id) ?? 0,
        walletCount: (u as any)._count.wallets,
    }));

    return { data, pagination: paginationMeta(total, params) };
}

export async function getUserDetail(prisma: PrismaClient, userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            wallets: {
                select: {
                    id: true,
                    address: true,
                    chainId: true,
                    isPrimary: true,
                    createdAt: true,
                },
            },
        },
    });
    if (!user) return null;

    return {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        supabaseId: user.supabaseId,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        wallets: user.wallets.map((w) => ({
            id: w.id,
            address: w.address,
            chainId: w.chainId,
            isPrimary: w.isPrimary,
            createdAt: w.createdAt.toISOString(),
        })),
    };
}

export async function listUserAgents(prisma: PrismaClient, userId: string, params: PaginationParams) {
    const [agents, total] = await Promise.all([
        prisma.agent.findMany({
            where: { ownerId: userId },
            select: {
                id: true,
                agentname: true,
                status: true,
                createdAt: true,
                _count: { select: { participations: true, skills: true } },
            },
            orderBy: { createdAt: 'desc' },
            ...paginate(params),
        }),
        prisma.agent.count({ where: { ownerId: userId } }),
    ]);

    const data = agents.map((a) => ({
        id: a.id,
        agentname: a.agentname,
        status: a.status,
        createdAt: a.createdAt.toISOString(),
        skillCount: (a as any)._count.skills,
        participationCount: (a as any)._count.participations,
    }));

    return { data, pagination: paginationMeta(total, params) };
}

export async function listUserQuests(prisma: PrismaClient, userId: string, params: PaginationParams) {
    const [quests, total] = await Promise.all([
        prisma.quest.findMany({
            where: { creatorUserId: userId },
            select: {
                id: true,
                title: true,
                status: true,
                rewardAmount: true,
                rewardType: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            ...paginate(params),
        }),
        prisma.quest.count({ where: { creatorUserId: userId } }),
    ]);

    const data = quests.map((q) => ({
        id: q.id,
        title: q.title,
        status: q.status,
        rewardAmount: Number(q.rewardAmount),
        rewardType: q.rewardType,
        createdAt: q.createdAt.toISOString(),
    }));

    return { data, pagination: paginationMeta(total, params) };
}

export interface AdminUpdateUserInput {
    role?: 'user' | 'admin';
    username?: string;
    password?: string;
}

export async function adminUpdateUser(
    prisma: PrismaClient,
    userId: string,
    input: AdminUpdateUserInput,
    requestingUserId: string,
) {
    if (userId === requestingUserId && input.role !== undefined && input.role !== 'admin') {
        return { error: 'CANNOT_DEMOTE_SELF' } as const;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;

    const data: any = {};
    if (input.role !== undefined) data.role = input.role;
    if (input.username !== undefined) data.username = input.username;
    if (input.password !== undefined) {
        data.password = await bcrypt.hash(input.password, 10);

        // Sync with Supabase Auth if supabaseId exists
        if (user.supabaseId) {
            const { error: syncError } = await supabaseAdmin.auth.admin.updateUserById(user.supabaseId, {
                password: input.password,
            });
            if (syncError) {
                console.error(`[SupabaseSync] Failed to update password for user ${userId}:`, syncError.message);
            } else {
                console.log(`[SupabaseSync] Successfully synced password for user ${userId}`);
            }
        }
    }

    const updated = await prisma.user.update({
        where: { id: userId },
        data,
    });

    return {
        id: updated.id,
        email: updated.email,
        username: updated.username,
        role: updated.role,
    };
}

// ─── Escrow Dashboard ────────────────────────────────────────────────────────

export async function getEscrowOverview(prisma: PrismaClient) {
    const [fundedQuests, completedDist, pendingDist, completedRefunds, pendingRefunds] =
        await Promise.all([
            prisma.quest.findMany({
                where: { fundingStatus: 'confirmed' },
                select: { rewardAmount: true, rewardType: true, status: true, refundStatus: true },
            }),
            prisma.quest.count({
                where: { fundingStatus: 'confirmed', status: 'completed' },
            }),
            prisma.quest.count({
                where: {
                    fundingStatus: 'confirmed',
                    status: { notIn: ['completed', 'cancelled'] },
                },
            }),
            prisma.quest.count({
                where: { refundStatus: 'completed' },
            }),
            prisma.quest.count({
                where: { fundingStatus: 'confirmed', status: 'cancelled', refundStatus: { not: 'completed' } },
            }),
        ]);

    // Group locked value by token
    const lockedValue: Record<string, number> = {};
    for (const q of fundedQuests) {
        const token = q.rewardType;
        lockedValue[token] = (lockedValue[token] || 0) + Number(q.rewardAmount);
    }

    return {
        totalQuestsFunded: fundedQuests.length,
        totalLockedValue: lockedValue,
        completedDistributions: completedDist,
        pendingDistributions: pendingDist,
        completedRefunds,
        pendingRefunds,
    };
}

export async function listEscrowQuests(prisma: PrismaClient, params: PaginationParams) {
    const where: Prisma.QuestWhereInput = {
        fundingStatus: { not: 'unfunded' },
    };

    const [quests, total] = await Promise.all([
        prisma.quest.findMany({
            where,
            orderBy: { fundedAt: 'desc' },
            ...paginate(params),
            select: {
                id: true,
                title: true,
                status: true,
                fundingStatus: true,
                fundingMethod: true,
                rewardAmount: true,
                rewardType: true,
                cryptoChainId: true,
                cryptoTxHash: true,
                sponsorWallet: true,
                fundedAt: true,
                refundStatus: true,
                refundTxHash: true,
                refundedAt: true,
            },
        }),
        prisma.quest.count({ where }),
    ]);

    const data = quests.map((q) => ({
        ...q,
        rewardAmount: Number(q.rewardAmount),
        fundedAt: q.fundedAt?.toISOString() ?? null,
        refundedAt: q.refundedAt?.toISOString() ?? null,
    }));

    return { data, pagination: paginationMeta(total, params) };
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export async function getAnalyticsOverview(prisma: PrismaClient) {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
        totalUsers,
        usersThisWeek,
        usersThisMonth,
        totalAgents,
        activeAgents,
        claimedAgents,
        totalQuests,
        questsByStatus,
        questsByType,
        totalParticipations,
        completedParticipations,
        inProgressParticipations,
        totalFunded,
        totalPaid,
    ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
        prisma.user.count({ where: { createdAt: { gte: monthAgo } } }),
        prisma.agent.count(),
        prisma.agent.count({ where: { status: 'questing' } }),
        prisma.agent.count({ where: { ownerId: { not: null } } }),
        prisma.quest.count(),
        prisma.quest.groupBy({ by: ['status'], _count: true }),
        prisma.quest.groupBy({ by: ['type'], _count: true }),
        prisma.questParticipation.count(),
        prisma.questParticipation.count({ where: { status: 'completed' } }),
        prisma.questParticipation.count({ where: { status: 'in_progress' } }),
        prisma.quest.aggregate({
            where: { fundingStatus: 'confirmed' },
            _sum: { rewardAmount: true },
        }),
        prisma.questParticipation.aggregate({
            where: { payoutStatus: 'paid' },
            _sum: { payoutAmount: true },
        }),
    ]);

    const statusMap: Record<string, number> = {};
    for (const s of questsByStatus) statusMap[s.status] = s._count;

    const typeMap: Record<string, number> = {};
    for (const t of questsByType) typeMap[t.type] = t._count;

    const avgCompletionRate =
        totalParticipations > 0
            ? Math.round((completedParticipations / totalParticipations) * 100)
            : 0;

    return {
        users: {
            total: totalUsers,
            thisWeek: usersThisWeek,
            thisMonth: usersThisMonth,
        },
        agents: {
            total: totalAgents,
            active: activeAgents,
            withOwner: claimedAgents,
        },
        quests: {
            total: totalQuests,
            byStatus: statusMap,
            byType: typeMap,
            avgCompletionRate,
        },
        participations: {
            total: totalParticipations,
            completed: completedParticipations,
            inProgress: inProgressParticipations,
        },
        escrow: {
            totalFunded: Number(totalFunded._sum.rewardAmount ?? 0),
            totalDistributed: totalPaid._sum.payoutAmount ?? 0,
        },
    };
}

export async function getTimeseries(
    prisma: PrismaClient,
    metric: string,
    period: string,
    from: Date,
    to: Date,
) {
    const table = metric === 'users' ? '"User"' : metric === 'quests' ? '"Quest"' : '"QuestParticipation"';
    const dateField =
        metric === 'participations' ? '"joinedAt"' : '"createdAt"';

    const result = await prisma.$queryRawUnsafe<{ bucket: Date; count: bigint }[]>(
        `SELECT date_trunc($1, ${dateField}) as bucket, COUNT(*) as count
         FROM ${table}
         WHERE ${dateField} >= $2 AND ${dateField} <= $3
         GROUP BY bucket
         ORDER BY bucket ASC`,
        period,
        from,
        to,
    );

    return {
        metric,
        period,
        data: result.map((r) => ({
            date: r.bucket.toISOString(),
            count: Number(r.count),
        })),
    };
}
