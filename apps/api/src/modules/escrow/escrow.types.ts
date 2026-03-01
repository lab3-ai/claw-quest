// ─── Escrow Event Types ───────────────────────────────────────────────────────
// Typed interfaces for decoded on-chain escrow events.

export interface QuestFundedArgs {
    questId: string;        // bytes32 hex
    sponsor: string;        // address
    token: string;          // address
    amount: bigint;         // uint128
    expiresAt: bigint;      // uint64
}

export interface QuestDistributedArgs {
    questId: string;        // bytes32 hex
    recipients: string[];   // address[]
    amounts: bigint[];      // uint128[]
    totalPayout: bigint;    // uint128
}

export interface QuestRefundedArgs {
    questId: string;        // bytes32 hex
    sponsor: string;        // address
    amount: bigint;         // uint128
}

export interface EmergencyWithdrawalArgs {
    questId: string;        // bytes32 hex
    sponsor: string;        // address
    amount: bigint;         // uint128
}
