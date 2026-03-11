---
title: "Quest Sponsorship Collaboration"
description: "Allow quest owners to invite co-sponsors who can edit, fund, and verify — each depositing on-chain via sub-questId"
status: completed
priority: P1
effort: 12h
branch: main
tags: [escrow, collaboration, quests, funding]
created: 2026-03-06
---

# Quest Sponsorship Collaboration

## Overview

Enable quest owners to invite sponsors who co-fund the reward pool on-chain. No contract upgrade — each depositor uses a deterministic sub-questId. Partial funding allowed; publish gate requires `totalFunded >= rewardAmount`.

## Phases

| # | Phase | Est | Status |
|---|-------|-----|--------|
| 1 | [Database & Shared Types](./phase-01-database-and-shared.md) | 2h | completed |
| 2 | [API — Collaboration Endpoints](./phase-02-api-collaboration.md) | 3h | completed |
| 3 | [API — Multi-Deposit Funding](./phase-03-api-funding.md) | 4h | completed |
| 4 | [Frontend](./phase-04-frontend.md) | 3h | completed |

## Key Constraints

- **No contract upgrade** — singleton escrow unchanged
- **Max 5 sponsors** per quest
- **Invite token:** `collab_<hex>`, 7-day expiry, single-use
- **Sub-questId:** `keccak256(questIdBytes32 + userIdBytes32)` — owner uses original questId
- Tasks locked after quest goes live
- `fundingStatus` gains `partial` state
- Publish gate: `totalFunded >= rewardAmount` (strict)

## Files Changed Summary

### Backend
- `apps/api/prisma/schema.prisma` — add `QuestCollaborator`, `QuestDeposit`, `totalFunded` on Quest
- `packages/shared/src/index.ts` — add `FUNDING_STATUS.PARTIAL`, collaboration schemas
- `apps/api/src/modules/quests/quests.service.ts` — add `isQuestSponsor()`, `generateCollabToken()`
- `apps/api/src/modules/quests/quests.routes.ts` — 4 new endpoints, modified PATCH/publish
- `apps/api/src/modules/escrow/escrow.service.ts` — sub-questId in `getDepositParams()`, multi-escrow `executeDistribute()`/`executeRefund()`
- `apps/api/src/modules/escrow/escrow-event-handlers.ts` — `handleQuestFunded()` sub-questId support
- `apps/api/src/modules/escrow/escrow.poller.ts` — sub-questId → logical quest mapping

### Frontend
- `apps/dashboard/src/routes/_authenticated/quests/$questId/fund.tsx` — partial deposit + invite link
- `apps/dashboard/src/routes/_public/quests/detail.tsx` — "Sponsored by" line
- `apps/dashboard/src/routes/_authenticated/dashboard.tsx` — include sponsored quests
- `apps/dashboard/src/router.tsx` — add `/quests/:questId/join` route
- NEW: `apps/dashboard/src/routes/_public/quests/join.tsx` — accept invite page

## Dependencies

- Phase 1 must complete before any other phase (schema generates Prisma client)
- Phase 2 and 3 can run in parallel after Phase 1
- Phase 4 requires Phase 2+3 endpoints to be available

## Migration Note

Existing quests: no collaborators, owner deposits to main questId — works as-is. Add migration script to backfill `totalFunded = rewardAmount` for existing `fundingStatus = 'confirmed'` quests.
