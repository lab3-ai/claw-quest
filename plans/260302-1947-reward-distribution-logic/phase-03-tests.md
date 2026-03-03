## Phase 3: Unit Tests for Distribution Calculator

**Priority:** High
**Status:** pending
**Depends on:** Phase 1
**File:** `apps/api/src/modules/escrow/__tests__/distribution-calculator.test.ts`

### Context
- `distribution-calculator.ts` is a pure function module — ideal for unit testing
- No mocks needed (no DB, no network)
- Existing test pattern: `apps/api/src/modules/quests/__tests__/quests.service.test.ts`
- Test runner: vitest (already configured in project)

### Overview

Write comprehensive unit tests for `computePayouts` covering all 3 quest types, edge cases, and dust handling.

### Related Code Files
- **Create:** `apps/api/src/modules/escrow/__tests__/distribution-calculator.test.ts`
- **Read-only:** `apps/api/src/modules/escrow/distribution-calculator.ts` (from Phase 1)

### Test Cases

#### FCFS Tests

| Test | Input | Expected |
|------|-------|----------|
| Equal split, no dust | 1000000n, 2 slots, 2 participants | [500000n, 500000n] |
| Equal split with dust | 1000000n, 3 slots, 3 participants | [333334n, 333333n, 333333n] |
| More slots than participants | 1000000n, 10 slots, 2 participants | [500000n, 500000n] |
| Fewer slots than participants | 1000000n, 2 slots, 5 participants | [500000n, 500000n] (first 2 only) |
| Single winner | 1000000n, 1 slot, 3 participants | [1000000n] |
| Single participant | 1000000n, 5 slots, 1 participant | [1000000n] |

#### LEADERBOARD Tests

| Test | Input | Expected |
|------|-------|----------|
| 2 participants | 1000000n, -, 2 participants | [666666n+dust, 333333n] (2:1 ratio) |
| 3 participants | 900000n, -, 3 participants | [450000n, 300000n, 150000n] (3:2:1) |
| Single participant | 1000000n, -, 1 participant | [1000000n] |
| Sum equals total | any amount, -, N participants | sum(payouts) === totalAmount |

#### LUCKY_DRAW Tests

| Test | Input | Expected |
|------|-------|----------|
| All win (slots >= participants) | 1000000n, 10 slots, 3 participants | 3 entries, equal split |
| Subset wins (slots < participants) | 1000000n, 2 slots, 5 participants | 2 entries, equal split |
| Sum equals total | any amount, N slots, M participants | sum(payouts) === totalAmount |
| Single slot | 1000000n, 1 slot, 5 participants | 1 entry, full amount |
| All selected are from input | - | every winner.wallet exists in input |

#### Edge Cases (All Types)

| Test | Input | Expected |
|------|-------|----------|
| Zero participants | any, any, [] | [] |
| Zero amount | 0n, any, [participant] | all amounts 0n |
| Unknown quest type | "UNKNOWN", ... | throws Error |

#### Invariant Tests (All Types)

```typescript
// For every non-empty result:
// 1. Sum of amounts === totalAmount
// 2. Every entry has valid wallet string
// 3. No negative amounts
// 4. Result length <= participants.length
// 5. Result length <= totalSlots (for FCFS/LUCKY_DRAW)
```

### Implementation Steps

1. Create test file at `apps/api/src/modules/escrow/__tests__/distribution-calculator.test.ts`

2. Add helper to generate participant inputs:
```typescript
function makeParticipants(n: number): ParticipantInput[] {
    return Array.from({ length: n }, (_, i) => ({
        participationId: `p-${i}`,
        agentId: `a-${i}`,
        wallet: `0x${(i + 1).toString(16).padStart(40, '0')}`,
    }));
}
```

3. Add sum helper:
```typescript
function sumPayouts(entries: PayoutEntry[]): bigint {
    return entries.reduce((acc, e) => acc + e.amount, 0n);
}
```

4. Group tests by quest type using `describe` blocks

5. For LUCKY_DRAW randomness: test that results are a subset of inputs, not exact ordering (non-deterministic). Run multiple times to verify count stays correct.

### Todo List
- [ ] Create test file with helpers
- [ ] Write FCFS tests (6 cases)
- [ ] Write LEADERBOARD tests (4 cases)
- [ ] Write LUCKY_DRAW tests (5 cases)
- [ ] Write edge case tests (3 cases)
- [ ] Write invariant tests (sum, no negatives, bounds)
- [ ] Run tests and verify all pass

### Success Criteria
- All tests pass with `pnpm --filter api test`
- Coverage: every branch in `computePayouts` hit
- Sum invariant verified for every non-empty result
- LUCKY_DRAW tests don't flake (test properties, not specific order)

### Run Command
```bash
pnpm --filter api test -- --run src/modules/escrow/__tests__/distribution-calculator.test.ts
```

### Risk Assessment
- **LUCKY_DRAW flakiness**: Tests assert on count and membership, never on order. Safe.
- **BigInt literals**: vitest supports BigInt natively. No issues.
