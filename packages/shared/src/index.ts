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
    isActive: z.boolean().default(false),
    activationCode: z.string().nullable().optional(),
    agentApiKey: z.string().nullable().optional(),
    verificationToken: z.string().nullable().optional(),
    verificationExpiresAt: z.string().datetime().nullable().optional(),
    claimedAt: z.string().datetime().nullable().optional(),
    claimedVia: z.string().nullable().optional(),
    claimEmail: z.string().nullable().optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
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
    PARTIAL: 'partial',
    CONFIRMED: 'confirmed',
    REFUNDED: 'refunded',
} as const;

export const FUNDING_METHOD = {
    STRIPE: 'stripe',
    CRYPTO: 'crypto',
} as const;

export const REWARD_TYPE = {
    USDC: 'USDC',
    USDT: 'USDT',
    NATIVE: 'NATIVE',
    USD: 'USD',
    LLMTOKEN_OPENROUTER: 'LLMTOKEN_OPENROUTER',
    LLM_KEY: 'LLM_KEY',
} as const;

export type RewardType = (typeof REWARD_TYPE)[keyof typeof REWARD_TYPE];

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
    params: z.record(z.string(), z.unknown()),
    requireTagFriends: z.boolean().optional().default(false),
});
export type QuestTask = z.infer<typeof QuestTaskSchema>;

export const LlmModelSchema = z.object({
    id: z.string().uuid(),
    openrouterId: z.string(),
    name: z.string(),
    provider: z.string(),
    tier: z.string(),
    inputPricePer1M: z.number(),
    outputPricePer1M: z.number(),
    contextWindow: z.number(),
    isActive: z.boolean(),
    createdAt: z.string().datetime().optional(),
    updatedAt: z.string().datetime().optional(),
});
export type LlmModel = z.infer<typeof LlmModelSchema>;

export const QuestSchema = z.object({
    id: z.string().uuid(),
    title: z.string(),
    description: z.string(),
    sponsor: z.string(),
    type: z.nativeEnum(QUEST_TYPE),
    status: z.nativeEnum(QUEST_STATUS),
    rewardAmount: z.number(),
    rewardType: z.string(), // e.g. REWARD_TYPE.USDC, REWARD_TYPE.USD, REWARD_TYPE.LLM_KEY
    totalSlots: z.number(),
    filledSlots: z.number(),
    tags: z.array(z.string()).default([]),
    requiredSkills: z.array(z.string()).default([]), // skill names agent must have
    requireVerified: z.boolean().default(false), // only accept agents with verified (scanned) skills
    tasks: z.array(QuestTaskSchema).default([]), // social / human tasks
    questers: z.number().default(0), // count of active participations
    questerNames: z.array(z.string()).default([]), // first few agent names for avatar stack
    questerDetails: z.array(z.object({
        agentName: z.string(),
        humanHandle: z.string(), // owner email prefix (e.g. "alice" from "alice@example.com")
    })).default([]),
    network: z.string().nullable().optional(),   // blockchain name (e.g. "Base", "BNB Smart Chain")
    drawTime: z.string().datetime().nullable().optional(), // Lucky Draw deadline
    startAt: z.string().datetime().nullable().optional(), // ISO string — null = live immediately after funding
    expiresAt: z.string().datetime().nullable(), // ISO string
    createdAt: z.string().datetime(), // ISO string for API
    updatedAt: z.string().datetime(), // ISO string for API
    // Creator fields
    creatorUserId: z.string().uuid().nullable().optional(),
    creatorAgentId: z.string().uuid().nullable().optional(),
    creatorEmail: z.string().email().nullable().optional(),
    // Escrow / funding fields (optional — only present when funded)
    fundingStatus: z.string().nullable().optional(),
    cryptoTxHash: z.string().nullable().optional(),
    cryptoChainId: z.number().nullable().optional(),
    // Collaboration fields
    totalFunded: z.number().nullable().optional(),
    collaboratorCount: z.number().nullable().optional(),
    sponsorNames: z.array(z.string()).default([]),
    // LLM Key Bonus Reward
    llmKeyRewardEnabled: z.boolean().default(false),
    llmKeyTokenLimit: z.number().int().positive().nullable().optional(),
    // LLM Model Reward (LLMTOKEN_OPENROUTER)
    llmModelId: z.string().uuid().nullable().optional(),
    tokenBudgetPerWinner: z.number().nullable().optional(),
    llmModel: z.object({
        id: z.string().uuid(),
        openrouterId: z.string(),
        name: z.string(),
        provider: z.string(),
        tier: z.string(),
        inputPricePer1M: z.number(),
        outputPricePer1M: z.number(),
        contextWindow: z.number(),
        isActive: z.boolean(),
    }).nullable().optional(),
});

// --- Quest Collaboration ---
export const QuestCollaboratorSchema = z.object({
    id: z.string().uuid(),
    questId: z.string().uuid(),
    userId: z.string().uuid(),
    invitedBy: z.string().uuid().nullable(),
    acceptedAt: z.string().datetime().nullable(),
    expiresAt: z.string().datetime(),
    createdAt: z.string().datetime(),
    displayName: z.string().nullable().optional(),
    username: z.string().nullable().optional(),
});
export type QuestCollaborator = z.infer<typeof QuestCollaboratorSchema>;

export const QuestDepositSchema = z.object({
    id: z.string().uuid(),
    questId: z.string().uuid(),
    userId: z.string().uuid(),
    escrowQuestId: z.string(),
    amount: z.number(),
    tokenAddress: z.string(),
    chainId: z.number(),
    txHash: z.string().nullable(),
    walletAddress: z.string(),
    status: z.enum(['pending', 'confirmed', 'refunded']),
    createdAt: z.string().datetime(),
});
export type QuestDeposit = z.infer<typeof QuestDepositSchema>;

export const CollaboratorsResponseSchema = z.object({
    collaborators: z.array(QuestCollaboratorSchema),
    deposits: z.array(QuestDepositSchema),
    totalFunded: z.number(),
    rewardAmount: z.number(),
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
    // LLM Key Bonus Reward
    llmRewardApiKey: z.string().nullable().optional(),
    llmRewardIssuedAt: z.string().datetime().nullable().optional(),
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

// --- Web3 Skills ---
export * from './web3-skills';

// --- Escrow / Chain Configs ---
export * from './chains';
export * from './escrow-utils';
export * from './escrow-abi';
