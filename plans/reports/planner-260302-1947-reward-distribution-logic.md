# Planner Report: Reward Distribution Logic

## Research Summary

Analyzed 6 files in the escrow module to understand current state:

### Existing Code Map
| File | Lines | Role |
|------|-------|------|
| `escrow.service.ts` | 338 | deposit params, escrow status, calculateDistribution, executeDistribute, executeRefund |
| `escrow.routes.ts` | 376 | 6 endpoints (deposit-params, status, distribute, refund, tx-status, health) |
| `escrow.config.ts` | 99 | env-based config, chain allowlist |
| `escrow.client.ts` | 80 | viem public/wallet client cache |
| `escrow.poller.ts` | 174 | block-range event polling with DB cursor |
| `escrow-event-handlers.ts` | 177 | 4 event handlers (funded, distributed, refunded, emergency) |

### Bugs Found in Current `calculateDistribution`

1. **FCFS (line 184)**: Divides by `participations.length` instead of `min(totalSlots, participations.length)`. If 10 agents complete but `totalSlots=3`, all 10 get paid (should be first 3).

2. **LUCKY_DRAW (line 201)**: Uses `Math.random() - 0.5` for shuffle — not crypto-safe and has known bias (sort-based shuffle is O(n log n) with inconsistent comparator).

3. **All types**: No dust handling. BigInt division truncates — `1000000 / 3 = 333333` leaves 1 unit undistributed on-chain.

4. **No status guards**: `executeDistribute` doesn't check quest.status. Can distribute a `draft` quest or double-distribute a `completed` quest.

### Existing Flow (Unchanged)
```
Route POST /escrow/distribute/:questId
  → auth + fundingStatus check (route layer)
  → executeDistribute(prisma, questId, chainId)
    → calculateDistribution(prisma, questId)
    → simulateContract (catch reverts early)
    → writeContract (submit tx)
    → mark payouts as 'pending'
  → Poller picks up QuestDistributed event
    → handleQuestDistributed marks payouts 'paid', quest 'completed'
```

### DB Schema (No Changes Needed)
- `Quest.type`: FCFS | LEADERBOARD | LUCKY_DRAW
- `Quest.totalSlots`: caps winners for FCFS and LUCKY_DRAW
- `Quest.drawTime`: LUCKY_DRAW deadline (validated on publish)
- `QuestParticipation.payoutWallet`: winner's address (set during quest)
- `QuestParticipation.payoutStatus`: na → pending → paid
- `QuestParticipation.payoutAmount`: float, set on distribute
- No `rank` field exists in DB — LEADERBOARD uses completion order

## Plan Decision

**Approach: Extract + Fix** (not rewrite)

- Extract `calculateDistribution` logic into `distribution-calculator.ts` (pure function)
- Fix 3 bugs (FCFS slot cap, LUCKY_DRAW crypto shuffle, dust handling)
- Add status guards in `executeDistribute`
- Write unit tests for the pure calculator (no mocks needed)

3 phases, ~3h total effort. No migrations, no new endpoints, no frontend changes.

## Unresolved Questions

1. **LEADERBOARD tier configuration**: Current code uses proportional inverse-rank (rank 1 gets N shares, rank N gets 1). The user prompt mentioned "tiered payout: 1st=40%, 2nd=25%, etc." — left as proportional for now since there's no DB field for custom tiers. Can add later as a `rewardTiers: Json?` field on Quest if needed. **YAGNI.**

2. **LUCKY_DRAW timing**: Should distribution be blocked until `drawTime` passes? Current code doesn't check. The route handler lets creator/admin trigger at will. Recommend adding a `drawTime` guard but marking as optional enhancement since the admin may want manual control.
