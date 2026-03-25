# Phase 1: Harden Event Poller

## Context Links
- Current poller: `apps/api/src/modules/escrow/escrow.poller.ts`
- Config: `apps/api/src/modules/escrow/escrow.config.ts`
- Shared ABI: `packages/shared/src/escrow-abi.ts`

## Overview
- **Priority**: P1
- **Status**: pending
- **Effort**: 2h

Current poller only handles QuestFunded, uses in-memory block cursor (lost on restart), no idempotency guard, no re-org protection. This phase fixes all three.

## Key Insights

1. **In-memory cursor problem**: `lastProcessedBlock` is a `Map<number, bigint>` — on server restart, poller re-scans last ~100 blocks. Harmless for QuestFunded (has `if (quest.fundingStatus === 'confirmed') return` guard), but Distributed/Refunded events need similar guards.
2. **Simplest cursor persistence**: Use a new Prisma model `EscrowCursor` or a simple key-value approach. YAGNI says: store cursor in a small DB table.
3. **Re-org safety**: On Base/L2s re-orgs are rare but possible. Solution: process events with a small confirmation buffer (e.g., 5 blocks behind tip). Simple and sufficient.
4. **Rate limits**: Public RPCs limit `eth_getLogs` range. Current 2000 block cap is good.

## Requirements

### Functional
- Persist last-processed block per chain in DB
- Resume from persisted block on restart (no gap, no re-scan)
- Process events with N-block confirmation delay (configurable, default 5)
- All event handlers must be idempotent (safe to re-process same event)

### Non-functional
- No new npm packages
- Poller failure should not crash server
- Log all processed events with block number, tx hash

## Architecture

### New Prisma Model

```prisma
model EscrowCursor {
  chainId     Int    @id
  lastBlock   BigInt
  updatedAt   DateTime @updatedAt
}
```

This requires a migration. Alternatively, use `prisma.$executeRaw` with a simple table to avoid migration overhead during dev. **Decision**: Use Prisma model — it's clean and migrations are cheap.

### Confirmation Buffer

```
currentBlock = await client.getBlockNumber()
safeBlock = currentBlock - CONFIRMATION_BLOCKS  // default 5
fromBlock = cursor.lastBlock + 1
toBlock = min(safeBlock, fromBlock + MAX_RANGE)
```

## Related Code Files

### Modify
- `apps/api/src/modules/escrow/escrow.poller.ts` — add DB cursor, confirmation buffer, multi-event fetching
- `apps/api/prisma/schema.prisma` — add `EscrowCursor` model

### Create
- `apps/api/src/modules/escrow/escrow.types.ts` — shared type definitions for event args

## Implementation Steps

1. Add `EscrowCursor` model to Prisma schema
2. Run `pnpm db:migrate` to create migration
3. Create `escrow.types.ts` with typed event arg interfaces
4. Refactor `escrow.poller.ts`:
   - Replace in-memory `lastProcessedBlock` with DB read/write via `prisma.escrowCursor`
   - Add `CONFIRMATION_BLOCKS` config (default 5, from env `ESCROW_CONFIRMATION_BLOCKS`)
   - Change `pollChain()` to fetch ALL escrow events (not just QuestFunded)
   - Use `parseEventLogs` from viem to decode all event types from raw logs
   - Route decoded events to appropriate handlers
   - Update cursor in DB after successful batch processing
5. Keep existing `handleQuestFunded` as-is (already idempotent)
6. Add config: `escrowConfig.confirmationBlocks` in `escrow.config.ts`

## Todo

- [ ] Add `EscrowCursor` model to schema.prisma
- [ ] Run migration
- [ ] Create `escrow.types.ts`
- [ ] Add `confirmationBlocks` to escrow.config.ts
- [ ] Refactor poller: DB cursor + confirmation buffer
- [ ] Refactor poller: fetch all events (not just QuestFunded)
- [ ] Test: restart server, verify cursor resumes correctly

## Success Criteria
- Poller resumes from DB-persisted block on restart
- Events processed with configurable confirmation delay
- All 4 event types fetched (QuestFunded, QuestDistributed, QuestRefunded, EmergencyWithdrawal)
- No duplicate processing on re-scan

## Risk Assessment
- **Prisma migration on prod DB**: Low risk — adding a new table, no column changes
- **RPC rate limits**: Mitigated by existing 2000-block cap and configurable interval
- **Missed events during deploy**: Cursor persisted — poller resumes from last block after deploy

## Security Considerations
- Cursor writes use Prisma upsert (no SQL injection)
- Block numbers validated as non-negative bigint
