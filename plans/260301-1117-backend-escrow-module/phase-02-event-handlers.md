# Phase 2: Add Distributed/Refunded/Emergency Event Handlers

## Context Links
- Service: `apps/api/src/modules/escrow/escrow.service.ts`
- Interface events: `contracts/src/interfaces/IClawQuestEscrow.sol` (lines 32-49)
- Shared ABI events: `packages/shared/src/escrow-abi.ts` (lines 188-223)
- Prisma Quest model: `apps/api/prisma/schema.prisma` (lines 67-132)
- QuestParticipation model: `apps/api/prisma/schema.prisma` (lines 134-154)

## Overview
- **Priority**: P1
- **Status**: pending
- **Effort**: 1.5h
- **Depends on**: Phase 1 (multi-event poller)

Currently only `handleQuestFunded` exists. Need handlers for the 3 remaining events so DB stays in sync with on-chain state even when txs are triggered externally (admin dashboard, emergency withdraw by sponsor).

## Key Insights

1. **Dual-write pattern**: `executeDistribute()` and `executeRefund()` already update DB after sending tx. Event handlers act as a **reconciliation layer** — they catch the same state change if it was triggered externally or if the DB write after tx failed.
2. **Idempotency is critical**: Since executeDistribute already writes `payoutStatus=paid`, the event handler must check before overwriting. Same for refund.
3. **EmergencyWithdrawal**: Sponsor calls directly on-chain, bypassing API. Only the event handler captures this. Must set `refundStatus=completed` + `status=cancelled`.

## Contract Events (from IClawQuestEscrow.sol)

```solidity
event QuestDistributed(bytes32 indexed questId, address[] recipients, uint128[] amounts, uint128 totalPayout);
event QuestRefunded(bytes32 indexed questId, address indexed sponsor, uint128 amount);
event EmergencyWithdrawal(bytes32 indexed questId, address indexed sponsor, uint128 amount);
```

## Requirements

### Functional
- `handleQuestDistributed`: Update quest status + participation payouts from event data
- `handleQuestRefunded`: Update refundStatus, refundTxHash, refundedAt
- `handleEmergencyWithdrawal`: Same as refund but also set quest cancelled
- All handlers idempotent — safe to call multiple times for same tx

### Non-functional
- Each handler under 60 lines
- Log every processed event

## Implementation Steps

### 1. `handleQuestDistributed` in `escrow.service.ts`

```typescript
export async function handleQuestDistributed(
    prisma: PrismaClient,
    questIdBytes32: string,
    recipients: string[],
    amounts: bigint[],
    totalPayout: bigint,
    txHash: string,
    chainId: number,
): Promise<void>
```

Logic:
- Convert questIdBytes32 to UUID
- Find quest; skip if not found
- Skip if quest.status already 'completed' AND all participations paid (idempotency)
- Resolve token decimals from quest.tokenDecimals or TOKEN_REGISTRY
- For each recipient/amount pair:
  - Find QuestParticipation where payoutWallet matches recipient (case-insensitive)
  - If found and payoutStatus != 'paid': update payoutAmount, payoutStatus='paid', payoutTxHash
- Update quest status to 'completed'

**Edge case**: Multiple partial distributions allowed by contract. Handler should not assume single distribution.

### 2. `handleQuestRefunded` in `escrow.service.ts`

```typescript
export async function handleQuestRefunded(
    prisma: PrismaClient,
    questIdBytes32: string,
    sponsor: string,
    amount: bigint,
    txHash: string,
    chainId: number,
): Promise<void>
```

Logic:
- Convert questIdBytes32 to UUID
- Find quest; skip if not found
- Skip if refundStatus already 'completed' (idempotency)
- Resolve human amount from token decimals
- Update: refundStatus='completed', refundTxHash=txHash, refundedAt=now, refundAmount=humanAmount
- If quest status not already cancelled: set status='cancelled'

### 3. `handleEmergencyWithdrawal` in `escrow.service.ts`

```typescript
export async function handleEmergencyWithdrawal(
    prisma: PrismaClient,
    questIdBytes32: string,
    sponsor: string,
    amount: bigint,
    txHash: string,
    chainId: number,
): Promise<void>
```

Logic:
- Nearly identical to handleQuestRefunded
- Additionally mark quest as cancelled (emergency = sponsor forced withdrawal)
- Log with `[escrow] EMERGENCY` prefix for monitoring

### 4. Wire handlers into poller

In the refactored `escrow.poller.ts` (from Phase 1), the event routing switch:

```typescript
switch (event.eventName) {
    case 'QuestFunded':
        await handleQuestFunded(prisma, ...event.args);
        break;
    case 'QuestDistributed':
        await handleQuestDistributed(prisma, ...event.args);
        break;
    case 'QuestRefunded':
        await handleQuestRefunded(prisma, ...event.args);
        break;
    case 'EmergencyWithdrawal':
        await handleEmergencyWithdrawal(prisma, ...event.args);
        break;
}
```

## Related Code Files

### Modify
- `apps/api/src/modules/escrow/escrow.service.ts` — add 3 new handler functions
- `apps/api/src/modules/escrow/escrow.poller.ts` — import + route new handlers

## Todo

- [ ] Implement `handleQuestDistributed` in escrow.service.ts
- [ ] Implement `handleQuestRefunded` in escrow.service.ts
- [ ] Implement `handleEmergencyWithdrawal` in escrow.service.ts
- [ ] Wire all handlers into poller's event routing
- [ ] Test: manually trigger distribute and verify DB updated via poller
- [ ] Test: verify idempotency (re-process same event)

## Success Criteria
- All 4 event types processed by poller
- DB state consistent with on-chain state after each event
- Re-processing same event is a no-op (idempotent)
- EmergencyWithdrawal correctly captures sponsor-initiated refunds

## Risk Assessment
- **Wallet address matching**: Case-insensitive comparison needed (checksummed vs lowercase). Use `.toLowerCase()`.
- **Partial distributions**: Contract allows multiple `distribute()` calls. Handler must not assume single distribution — check `payoutStatus` per participation, not quest-level.
- **Missing payoutWallet**: If participation has no wallet, skip gracefully (log warning).
