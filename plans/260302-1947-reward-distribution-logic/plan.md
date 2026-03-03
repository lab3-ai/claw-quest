---
title: "Reward Distribution Logic for 3 Quest Types"
description: "Fix and harden the calculateDistribution function with proper per-type logic, dust handling, crypto-safe randomness, and validation guards"
status: pending
priority: P1
effort: 3h
branch: main
tags: [escrow, distribution, backend, reward]
created: 2026-03-02
---

# Reward Distribution Logic

## Current State

`calculateDistribution()` already exists in `escrow.service.ts` (lines 156-213) with basic logic for all 3 quest types. The `executeDistribute()` function (lines 246-289) calls it, submits the on-chain tx, and marks payouts as `pending`. The poller's `handleQuestDistributed` event handler (in `escrow-event-handlers.ts`) then marks them `paid` and sets quest status to `completed`.

**What works:**
- Basic FCFS equal split
- Basic LEADERBOARD proportional (inverse-rank weighting)
- Basic LUCKY_DRAW random selection
- On-chain tx submission + simulation
- Poller-based status reconciliation

**What needs fixing/hardening:**

| Issue | Severity | Type |
|-------|----------|------|
| FCFS divides by `participations.length` instead of `min(totalSlots, participations.length)` | High | Bug |
| LUCKY_DRAW uses `Math.random()` instead of crypto-safe randomness | Medium | Security |
| No rounding dust handling — sum of payouts can be < totalAmount | Medium | Financial |
| No guard against distributing a quest that's already distributed/completed | High | Bug |
| No guard for quests with status != `live` | Medium | Validation |
| LEADERBOARD has no configurable tiers — only uses proportional formula | Low | Enhancement |
| `escrow.service.ts` is 338 lines, exceeds 200-line guideline | Low | Code quality |

## Architecture Decision

**Extract `calculateDistribution` into its own file** (`distribution-calculator.ts`) to:
1. Keep files under 200 LOC
2. Make distribution logic independently testable
3. Leave `escrow.service.ts` focused on on-chain interactions

No new DB fields needed. No new endpoints. No schema changes.

## Phases

| # | Phase | File | Status |
|---|-------|------|--------|
| 1 | [Extract & fix distribution calculator](./phase-01-distribution-calculator.md) | `distribution-calculator.ts` | pending |
| 2 | [Update escrow service integration](./phase-02-escrow-service-update.md) | `escrow.service.ts` | pending |
| 3 | [Write unit tests](./phase-03-tests.md) | `distribution-calculator.test.ts` | pending |

## Key Dependencies
- No Prisma migration required
- No shared package changes
- No frontend changes
- Existing poller/event-handler flow remains unchanged
