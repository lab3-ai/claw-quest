## Phase 1: Extract & Fix Distribution Calculator

**Priority:** High
**Status:** pending
**File:** `apps/api/src/modules/escrow/distribution-calculator.ts`

### Context
- Current `calculateDistribution` lives in `escrow.service.ts` lines 156-213
- Has bugs in FCFS slot capping and LUCKY_DRAW randomness
- No dust handling — BigInt division truncates, leaving undistributed wei

### Overview

Extract `calculateDistribution()` and `PayoutEntry` interface into a dedicated file. Fix all 3 distribution strategies and add dust allocation.

### Key Insights
- On-chain `distribute()` requires `sum(amounts) <= deposited - distributed - refunded` — any dust left in escrow is stuck until refund
- Dust should go to first recipient (simplest, deterministic)
- Contract uses `uint128` for amounts — no overflow risk with USDC/USDT (6 decimals)
- `totalSlots` on Quest model caps winner count for FCFS and LUCKY_DRAW

### Requirements

#### Functional
1. **FCFS**: First `min(totalSlots, completedCount)` agents, equal split, dust to first
2. **LEADERBOARD**: All completed participants, inverse-rank proportional, dust to first (rank 1)
3. **LUCKY_DRAW**: Random `min(totalSlots, completedCount)` from completed, equal split, dust to first
4. Crypto-safe randomness for LUCKY_DRAW (Node.js `crypto.getRandomValues`)
5. Return empty array if no eligible participants (caller handles)

#### Non-Functional
- File under 200 LOC
- Pure function (receives participations + quest data, returns PayoutEntry[])
- No Prisma dependency — caller fetches data, calculator computes

### Architecture

```
escrow.service.ts
  └─ calculateDistribution(prisma, questId)
       ├─ fetches quest + participations from DB
       └─ calls computePayouts(type, totalAmount, totalSlots, participations)
              └─ distribution-calculator.ts (pure logic)
```

### Related Code Files
- **Modify:** `apps/api/src/modules/escrow/escrow.service.ts` (remove calculator, import new)
- **Create:** `apps/api/src/modules/escrow/distribution-calculator.ts`

### Implementation Steps

1. Create `distribution-calculator.ts` with:

```typescript
// ── Types ───────────────────────────────────────────────────────────────────

export interface ParticipantInput {
    participationId: string;
    agentId: string;
    wallet: string;
}

export interface PayoutEntry {
    participationId: string;
    agentId: string;
    wallet: string;
    amount: bigint;
}

// ── Main dispatcher ─────────────────────────────────────────────────────────

export function computePayouts(
    questType: string,
    totalAmount: bigint,
    totalSlots: number,
    participants: ParticipantInput[],
): PayoutEntry[]
```

2. Implement `computeFcfs`:
   - `winnerCount = Math.min(totalSlots, participants.length)`
   - Take first `winnerCount` (already ordered by completedAt ASC from caller)
   - `perPerson = totalAmount / BigInt(winnerCount)`
   - `dust = totalAmount - perPerson * BigInt(winnerCount)`
   - First winner gets `perPerson + dust`

3. Implement `computeLeaderboard`:
   - All participants are winners (already ordered by rank/completedAt from caller)
   - Shares: rank 1 gets N shares, rank 2 gets N-1, ..., rank N gets 1
   - `totalShares = n*(n+1)/2`
   - Each gets `totalAmount * shares / totalShares`
   - Dust = `totalAmount - sum(payouts)` → add to first entry

4. Implement `computeLuckyDraw`:
   - Use Fisher-Yates shuffle with `crypto.getRandomValues(new Uint32Array(n))`
   - `winnerCount = Math.min(totalSlots, participants.length)`
   - Pick first `winnerCount` after shuffle
   - Equal split with dust to first winner

5. Add `cryptoShuffle<T>(arr: T[]): T[]` helper using `crypto.getRandomValues`

### Dust Handling Strategy

```
totalAmount = 1000000 (1 USDC in smallest units)
3 winners: perPerson = 333333
sum = 999999, dust = 1
winner[0] gets 333334, others get 333333
```

This is standard practice — ensures exact totalAmount is distributed on-chain.

### LUCKY_DRAW Crypto-Safe Shuffle

```typescript
import { randomBytes } from 'node:crypto';

function cryptoShuffle<T>(arr: T[]): T[] {
    const shuffled = [...arr];
    const randomValues = new Uint32Array(shuffled.length);
    crypto.getRandomValues(randomValues);
    // Fisher-Yates with crypto random
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = randomValues[i] % (i + 1);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}
```

Note: Use `globalThis.crypto.getRandomValues` (available in Node 19+, project requires >=20).

### Todo List
- [ ] Create `distribution-calculator.ts`
- [ ] Implement `computePayouts` dispatcher
- [ ] Implement `computeFcfs` with slot capping + dust
- [ ] Implement `computeLeaderboard` with proportional shares + dust
- [ ] Implement `computeLuckyDraw` with crypto shuffle + dust
- [ ] Add `cryptoShuffle` helper
- [ ] Export `PayoutEntry` and `ParticipantInput` interfaces

### Success Criteria
- Pure function, no DB/network dependencies
- Handles 0 participants (returns [])
- Handles fewer participants than totalSlots
- Sum of all payout amounts === totalAmount (no dust leak)
- LUCKY_DRAW uses crypto-safe randomness
- File under 200 LOC

### Risk Assessment
- **Modulo bias in shuffle**: `Uint32Array % (i+1)` has negligible bias for small arrays (<1000 participants). Acceptable for this use case.
- **Integer overflow**: BigInt has no overflow. Safe.
- **Edge case — 1 winner**: All 3 types degenerate to full amount to single winner. Works naturally.

### Security Considerations
- `Math.random()` is NOT cryptographically secure — replaced with `crypto.getRandomValues`
- Distribution amounts computed server-side, submitted by operator wallet — participants cannot manipulate
