import { randomBytes } from 'crypto';
import { PrismaClient } from '@prisma/client';
import type { QuestTask } from '@clawquest/shared';

// ─── Regex patterns for task param validation ────────────────────────────────
export const X_POST_URL_RE = /^https?:\/\/(x\.com|twitter\.com)\/\w+\/status\/\d+/i;
export const X_USERNAME_RE = /^@?[\w]{1,15}$/;
export const DISCORD_INVITE_RE = /^https?:\/\/(discord\.gg|discord\.com\/invite)\/[\w-]+$/i;
export const TELEGRAM_CHANNEL_RE = /^(@[\w]{5,32}|https?:\/\/t\.me\/[\w]+)$/i;

/** Validate task params based on platform + actionType. Returns error string or null. */
export function validateTaskParams(task: QuestTask): string | null {
    const p = task.params;
    switch (task.actionType) {
        case 'follow_account':
            if (!p.username || !X_USERNAME_RE.test(p.username))
                return `Task "${task.label}": invalid X username "${p.username || ''}"`;
            break;
        case 'like_post':
        case 'repost':
        case 'quote_post':
            if (!p.postUrl || !X_POST_URL_RE.test(p.postUrl))
                return `Task "${task.label}": invalid X post URL "${p.postUrl || ''}"`;
            break;
        case 'post':
            if (!p.content || p.content.length > 280)
                return `Task "${task.label}": post content required (max 280 chars)`;
            break;
        case 'join_server':
            if (!p.inviteUrl || !DISCORD_INVITE_RE.test(p.inviteUrl))
                return `Task "${task.label}": invalid Discord invite URL "${p.inviteUrl || ''}"`;
            break;
        case 'verify_role':
            if (!p.inviteUrl || !DISCORD_INVITE_RE.test(p.inviteUrl))
                return `Task "${task.label}": invalid Discord invite URL "${p.inviteUrl || ''}"`;
            if (!p.roleName)
                return `Task "${task.label}": role name is required`;
            break;
        case 'join_channel':
            if (!p.channelUrl || !TELEGRAM_CHANNEL_RE.test(p.channelUrl))
                return `Task "${task.label}": invalid Telegram channel "${p.channelUrl || ''}"`;
            break;
        default:
            return `Task "${task.label}": unknown action type "${task.actionType}"`;
    }
    return null;
}

/** Validate all tasks in an array. Returns first error or null. */
export function validateAllTasks(tasks: QuestTask[]): string | null {
    for (const task of tasks) {
        const err = validateTaskParams(task);
        if (err) return err;
    }
    return null;
}

// ─── Token generators ─────────────────────────────────────────────────────────

export function generateClaimToken(): string {
    return 'quest_' + randomBytes(32).toString('hex');
}

export function generatePreviewToken(): string {
    return 'pv_' + randomBytes(24).toString('hex');
}

// ─── Quest creation ───────────────────────────────────────────────────────────

export interface CreateQuestInput {
    title: string;
    description: string;
    sponsor?: string;
    type?: string;
    status?: string;
    rewardAmount: number;
    rewardType?: string;
    totalSlots?: number;
    tags?: string[];
    requiredSkills?: string[];
    tasks?: QuestTask[];
    expiresAt?: string;
    startAt?: string;
}

export interface QuestCreator {
    agentId?: string;   // set when agent creates via API
    userId?: string;    // set when human creates via dashboard
    email?: string;     // human email
}

export async function createQuest(
    prisma: PrismaClient,
    input: CreateQuestInput,
    creator?: QuestCreator,
) {
    const tasks: QuestTask[] = input.tasks ?? [];

    // Validate tasks
    const taskErr = validateAllTasks(tasks);
    if (taskErr) throw new QuestValidationError(taskErr);

    const claimToken = generateClaimToken();
    const claimTokenExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h
    const previewToken = generatePreviewToken();

    const quest = await prisma.quest.create({
        data: {
            title: input.title,
            description: input.description,
            sponsor: input.sponsor || 'System',
            type: input.type || 'FCFS',
            status: input.status || 'draft',
            rewardAmount: input.rewardAmount,
            rewardType: input.rewardType || 'USDC',
            totalSlots: input.totalSlots || 100,
            filledSlots: 0,
            tags: input.tags || [],
            requiredSkills: input.requiredSkills || [],
            tasks: tasks as any,
            expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
            startAt: input.startAt ? new Date(input.startAt) : null,
            // Tokens
            claimToken,
            claimTokenExpiresAt,
            previewToken,
            // Creator
            creatorAgentId: creator?.agentId || null,
            creatorUserId: creator?.userId || null,
            creatorEmail: creator?.email || null,
            // When human creates directly, mark as claimed immediately
            claimedAt: creator?.userId ? new Date() : null,
        },
    });

    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'ClawQuest_aibot';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    return {
        quest,
        claimToken,
        previewToken,
        telegramDeeplink: `https://t.me/${botUsername}?start=${claimToken}`,
        previewUrl: `${frontendUrl}/quests/${quest.id}?token=${previewToken}&claim=${claimToken}`,
        fundUrl: `${frontendUrl}/quests/${quest.id}/fund`,
    };
}

// ─── Quest update (draft only) ────────────────────────────────────────────────

export interface UpdateQuestInput {
    title?: string;
    description?: string;
    sponsor?: string;
    type?: string;
    rewardAmount?: number;
    rewardType?: string;
    totalSlots?: number;
    tags?: string[];
    requiredSkills?: string[];
    tasks?: QuestTask[];
    expiresAt?: string | null;
    startAt?: string | null;
}

export async function updateQuest(
    prisma: PrismaClient,
    questId: string,
    creatorUserId: string,
    input: UpdateQuestInput,
) {
    const quest = await prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) throw new QuestNotFoundError();
    if (quest.status !== 'draft') throw new QuestNotEditableError();
    if (quest.creatorUserId !== creatorUserId) throw new QuestForbiddenError();

    // Validate tasks if provided
    if (input.tasks) {
        const taskErr = validateAllTasks(input.tasks);
        if (taskErr) throw new QuestValidationError(taskErr);
    }

    const data: any = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description;
    if (input.sponsor !== undefined) data.sponsor = input.sponsor;
    if (input.type !== undefined) data.type = input.type;
    if (input.rewardAmount !== undefined) data.rewardAmount = input.rewardAmount;
    if (input.rewardType !== undefined) data.rewardType = input.rewardType;
    if (input.totalSlots !== undefined) data.totalSlots = input.totalSlots;
    if (input.tags !== undefined) data.tags = input.tags;
    if (input.requiredSkills !== undefined) data.requiredSkills = input.requiredSkills;
    if (input.tasks !== undefined) data.tasks = input.tasks as any;
    if (input.expiresAt !== undefined) data.expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
    if (input.startAt !== undefined) data.startAt = input.startAt ? new Date(input.startAt) : null;

    return prisma.quest.update({ where: { id: questId }, data });
}

// ─── Status transitions ───────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<string, string[]> = {
    draft: ['live', 'scheduled', 'cancelled'],
    live: ['completed', 'expired', 'cancelled'],
    scheduled: ['live', 'cancelled'],
    // terminal states — no transitions out
    completed: [],
    cancelled: [],
    expired: [],
};

export function isValidTransition(from: string, to: string): boolean {
    return (VALID_TRANSITIONS[from] ?? []).includes(to);
}

// ─── Response helpers ─────────────────────────────────────────────────────────

/** Format a raw Prisma quest (with includes) into the API response shape.
 *  Strips internal DB fields (claimToken, claimTokenExpiresAt, claimedAt, previewToken)
 *  that must not be exposed in public responses.
 */
export function formatQuestResponse(
    quest: any,
    participations?: any[],
    count?: number,
) {
    const questers = count ?? 0;
    const names = participations?.map((p: any) => p.agent.agentname) ?? [];
    const details = participations?.map((p: any) => ({
        agentName: p.agent.agentname,
        humanHandle: p.agent.owner?.username ?? p.agent.owner?.email?.split('@')[0] ?? 'unclaimed',
    })) ?? [];

    // Destructure out internal fields before spreading
    const {
        claimToken: _claimToken,
        claimTokenExpiresAt: _claimTokenExpiresAt,
        claimedAt: _claimedAt,
        previewToken: _previewToken,
        ...safeQuest
    } = quest;

    return {
        ...safeQuest,
        tags: quest.tags ?? [],
        requiredSkills: quest.requiredSkills ?? [],
        tasks: quest.tasks ?? [],
        questers,
        questerNames: names,
        questerDetails: details,
        startAt: quest.startAt ? quest.startAt.toISOString() : null,
        expiresAt: quest.expiresAt ? quest.expiresAt.toISOString() : null,
        createdAt: quest.createdAt.toISOString(),
        updatedAt: quest.updatedAt.toISOString(),
    };
}

// ─── Proof Verification ──────────────────────────────────────────────────

/** Check if a user is the quest creator or admin. */
export async function isQuestCreatorOrAdmin(
    prisma: PrismaClient,
    questId: string,
    userId: string,
    userRole: string,
): Promise<{ allowed: boolean; quest: any }> {
    const quest = await prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) throw new QuestNotFoundError();
    const allowed = quest.creatorUserId === userId || userRole === 'admin';
    return { allowed, quest };
}

/** Approve or reject a single participation proof. */
export async function verifyParticipation(
    prisma: PrismaClient,
    questId: string,
    participationId: string,
    action: 'approve' | 'reject',
    reason?: string,
) {
    const participation = await prisma.questParticipation.findUnique({
        where: { id: participationId },
    });
    if (!participation || participation.questId !== questId) {
        throw new QuestValidationError('Participation not found for this quest');
    }
    if (participation.status !== 'submitted') {
        throw new QuestValidationError(`Can only verify submitted proofs (current: ${participation.status})`);
    }

    const newStatus = action === 'approve' ? 'verified' : 'rejected';
    const proofData = (participation.proof as any) ?? {};
    const updatedProof = action === 'reject'
        ? { ...proofData, rejectionReason: reason }
        : proofData;

    return prisma.questParticipation.update({
        where: { id: participationId },
        data: {
            status: newStatus,
            proof: updatedProof,
        },
    });
}

/** Approve or reject multiple participations at once. */
export async function bulkVerifyParticipations(
    prisma: PrismaClient,
    questId: string,
    items: Array<{ participationId: string; action: 'approve' | 'reject'; reason?: string }>,
) {
    // Load all participations in one query
    const ids = items.map(i => i.participationId);
    const participations = await prisma.questParticipation.findMany({
        where: { id: { in: ids }, questId },
    });
    const pMap = new Map(participations.map(p => [p.id, p]));

    const errors: string[] = [];
    const operations: any[] = [];

    for (const item of items) {
        const p = pMap.get(item.participationId);
        if (!p) {
            errors.push(`${item.participationId}: not found`);
            continue;
        }
        if (p.status !== 'submitted') {
            errors.push(`${item.participationId}: status is ${p.status}, expected submitted`);
            continue;
        }

        const newStatus = item.action === 'approve' ? 'verified' : 'rejected';
        const proofData = (p.proof as any) ?? {};
        const updatedProof = item.action === 'reject'
            ? { ...proofData, rejectionReason: item.reason }
            : proofData;

        operations.push(
            prisma.questParticipation.update({
                where: { id: item.participationId },
                data: { status: newStatus, proof: updatedProof },
            })
        );
    }

    if (operations.length > 0) {
        await prisma.$transaction(operations);
    }

    return { updated: operations.length, errors };
}

// ─── Error classes ────────────────────────────────────────────────────────────

export class QuestValidationError extends Error {
    code = 'INVALID_TASK_PARAMS';
    constructor(message: string) {
        super(message);
        this.name = 'QuestValidationError';
    }
}

export class QuestNotFoundError extends Error {
    code = 'NOT_FOUND';
    constructor() {
        super('Quest not found');
        this.name = 'QuestNotFoundError';
    }
}

export class QuestNotEditableError extends Error {
    code = 'NOT_EDITABLE';
    constructor() {
        super('Quest can only be edited in draft status');
        this.name = 'QuestNotEditableError';
    }
}

export class QuestForbiddenError extends Error {
    code = 'FORBIDDEN';
    constructor() {
        super('You do not have permission to edit this quest');
        this.name = 'QuestForbiddenError';
    }
}
