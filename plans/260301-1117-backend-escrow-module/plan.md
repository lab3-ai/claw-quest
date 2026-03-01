---
title: "Backend Escrow Module"
description: "Connect ClawQuestEscrow smart contract to API — event polling, payout distribution, refund service, tx tracking"
status: completed
priority: P1
effort: 6h
branch: main
tags: [escrow, blockchain, viem, backend]
created: 2026-03-01
---

# Backend Escrow Module — Implementation Plan

## Summary

Most infrastructure already exists. The escrow module has 5 files with working viem clients, ABI, event poller for QuestFunded, deposit params, on-chain status reads, distribute/refund execution, and API routes. What's missing: multi-event polling (Distributed/Refunded/EmergencyWithdrawn), idempotent event processing with DB-persisted cursor, transaction status tracking, retry logic, and production hardening.

## Current State (What Exists)

| File | Status | What It Does |
|------|--------|-------------|
| `escrow.config.ts` | Complete | Per-chain addresses, RPC URLs, env config |
| `escrow.client.ts` | Complete | Viem public + wallet client cache |
| `escrow.service.ts` | 80% done | Deposit params, on-chain status, distribute, refund, handleQuestFunded |
| `escrow.poller.ts` | 60% done | Polls QuestFunded only, in-memory cursor, no idempotency |
| `escrow.routes.ts` | Complete | /escrow/* endpoints (deposit-params, status, distribute, refund) |

## Phases

| # | Phase | Effort | Status |
|---|-------|--------|--------|
| 1 | [Harden event poller](./phase-01-harden-event-poller.md) | 2h | pending |
| 2 | [Add Distributed/Refunded event handlers](./phase-02-event-handlers.md) | 1.5h | pending |
| 3 | [Transaction status tracking + retries](./phase-03-tx-tracking.md) | 1.5h | pending |
| 4 | [Production hardening + env updates](./phase-04-production-hardening.md) | 1h | pending |

## Key Dependencies

- `viem` already in API deps
- `@clawquest/shared` has ESCROW_ABI, uuid<>bytes32, amount conversion
- Prisma schema has all needed fields (fundingStatus, cryptoTxHash, payoutStatus, etc.)
- No new Prisma migration needed (DB schema sufficient)
- No new npm packages needed

## Architecture

```
Frontend (wagmi)          Smart Contract              API (viem)
    |                         |                         |
    |-- deposit/approve -->   |                         |
    |                         |-- QuestFunded event -->  |
    |                         |                    [poller picks up]
    |                         |                    [DB: fundingStatus=confirmed]
    |                         |                         |
    |                         |  <-- distribute() ---   | <-- admin triggers
    |                         |-- QuestDistributed -->   |
    |                         |                    [poller picks up]
    |                         |                    [DB: payoutStatus=paid]
    |                         |                         |
    |                         |  <-- refund() -------   | <-- admin triggers
    |                         |-- QuestRefunded ---->    |
    |                         |                    [poller picks up]
    |                         |                    [DB: refundStatus=completed]
```

## File Map (New + Modified)

```
apps/api/src/modules/escrow/
  escrow.config.ts          # (no changes)
  escrow.client.ts          # (no changes)
  escrow.service.ts         # MODIFY: add handleDistributed, handleRefunded, handleEmergency
  escrow.poller.ts          # MODIFY: multi-event polling, DB cursor, idempotency
  escrow.routes.ts          # MODIFY: add tx-status endpoint
  escrow.types.ts           # NEW: shared types for escrow events
```
