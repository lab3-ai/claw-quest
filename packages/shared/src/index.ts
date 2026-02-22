import { z } from 'zod';

// --- Domain Constants ---

export const AGENT_STATUS = {
    IDLE: 'idle',
    QUESTING: 'questing',
    OFFLINE: 'offline',
} as const;

export type AgentStatus = (typeof AGENT_STATUS)[keyof typeof AGENT_STATUS];

// --- Zod Schemas ---

export const AgentSchema = z.object({
    id: z.string().uuid(),
    agentname: z.string().min(1).max(50),
    status: z.enum([AGENT_STATUS.IDLE, AGENT_STATUS.QUESTING, AGENT_STATUS.OFFLINE]),
    ownerId: z.string().uuid().nullable(),
    activationCode: z.string().optional(),
});

export const CreateAgentSchema = AgentSchema.pick({ agentname: true });

// --- Quest Types ---
export const QUEST_STATUS = {
    DRAFT: 'draft',
    LIVE: 'live',
    SCHEDULED: 'scheduled',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    EXPIRED: 'expired',
} as const;

export const FUNDING_STATUS = {
    UNFUNDED: 'unfunded',
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    REFUNDED: 'refunded',
} as const;

export const FUNDING_METHOD = {
    STRIPE: 'stripe',
    CRYPTO: 'crypto',
} as const;

export const QUEST_TYPE = {
    FCFS: 'FCFS', // First Come First Served
    LEADERBOARD: 'LEADERBOARD',
    LUCKY_DRAW: 'LUCKY_DRAW',
} as const;

export const LinkAgentSchema = z.object({
    activationCode: z.string().min(1),
});

// --- Quest Task (Social / Human tasks) ---
export const QuestTaskSchema = z.object({
    id: z.string().uuid(),
    platform: z.enum(['x', 'discord', 'telegram']),
    actionType: z.enum([
        'follow_account', 'like_post', 'repost', 'post', 'quote_post',
        'join_server', 'verify_role', 'join_channel',
    ]),
    label: z.string().min(1).max(100),
    params: z.record(z.string()),
    requireTagFriends: z.boolean().optional().default(false),
});
export type QuestTask = z.infer<typeof QuestTaskSchema>;

export const QuestSchema = z.object({
    id: z.string().uuid(),
    title: z.string(),
    description: z.string(),
    sponsor: z.string(),
    type: z.nativeEnum(QUEST_TYPE),
    status: z.nativeEnum(QUEST_STATUS),
    rewardAmount: z.number(),
    rewardType: z.string(), // e.g. 'USDC', 'USD', 'XP'
    totalSlots: z.number(),
    filledSlots: z.number(),
    tags: z.array(z.string()).default([]),
    requiredSkills: z.array(z.string()).default([]), // skill names agent must have
    tasks: z.array(QuestTaskSchema).default([]), // social / human tasks
    questers: z.number().default(0), // count of active participations
    questerNames: z.array(z.string()).default([]), // first few agent names for avatar stack
    questerDetails: z.array(z.object({
        agentName: z.string(),
        humanHandle: z.string(), // owner email prefix (e.g. "alice" from "alice@example.com")
    })).default([]),
    startAt: z.string().datetime().nullable().optional(), // ISO string — null = live immediately after funding
    expiresAt: z.string().datetime().nullable(), // ISO string
    createdAt: z.string().datetime(), // ISO string for API
    // Escrow / funding fields (optional — only present when funded)
    fundingStatus: z.string().optional(),
    cryptoTxHash: z.string().optional(),
    cryptoChainId: z.number().optional(),
});

// --- QuestParticipation (Questers list) ---
export const QuestParticipationSchema = z.object({
    id: z.string().uuid(),
    rank: z.number(),
    agentName: z.string(),
    humanHandle: z.string(),
    status: z.enum(['in_progress', 'submitted', 'completed', 'failed']),
    tasksCompleted: z.number(),
    tasksTotal: z.number(),
    payoutAmount: z.number().nullable(),
    payoutStatus: z.enum(['na', 'pending', 'paid']),
    joinedAt: z.string().datetime(),
    completedAt: z.string().datetime().nullable(),
});
export type QuestParticipation = z.infer<typeof QuestParticipationSchema>;

export const QuestersResponseSchema = z.object({
    questId: z.string().uuid(),
    questTitle: z.string(),
    questType: z.nativeEnum(QUEST_TYPE),
    questRewardAmount: z.number(),
    questRewardType: z.string(),
    totalQuesters: z.number(),
    doneQuesters: z.number(),
    inProgressQuesters: z.number(),
    tasksTotal: z.number(),
    participations: z.array(QuestParticipationSchema),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number(),
});
export type QuestersResponse = z.infer<typeof QuestersResponseSchema>;

export type Agent = z.infer<typeof AgentSchema>;
export type CreateAgentDto = z.infer<typeof CreateAgentSchema>;
export type Quest = z.infer<typeof QuestSchema>;

// --- API Responses ---

export interface ApiResponse<T> {
    data?: T;
    error?: {
        message: string;
        code: string;
    };
}

// --- Auth Schemas ---

export const RegisterSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

export const UserSchema = z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    username: z.string().nullable().optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export type RegisterDto = z.infer<typeof RegisterSchema>;
export type LoginDto = z.infer<typeof LoginSchema>;
export type UserDto = z.infer<typeof UserSchema>;

export interface AuthResponse {
    token: string;
    user: UserDto;
}

// --- Escrow / Chain Configs ---
export * from './chains';
export * from './escrow-utils';
export * from './escrow-abi';
