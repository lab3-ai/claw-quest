## Phase 2: Update Escrow Service Integration

**Priority:** High
**Status:** pending
**Depends on:** Phase 1
**File:** `apps/api/src/modules/escrow/escrow.service.ts`

### Context
- `escrow.service.ts` is currently 338 lines — over 200-line guideline
- After extracting calculator, it drops to ~200 lines
- Need to add validation guards before distribution
- `executeDistribute` currently has no status checks

### Overview

Refactor `escrow.service.ts` to import from `distribution-calculator.ts`, add pre-distribution validation, and clean up the `calculateDistribution` wrapper.

### Related Code Files
- **Modify:** `apps/api/src/modules/escrow/escrow.service.ts`
- **Read-only:** `apps/api/src/modules/escrow/distribution-calculator.ts` (from Phase 1)
- **Read-only:** `apps/api/src/modules/escrow/escrow.routes.ts` (no changes needed — guards already exist there)

### Implementation Steps

#### Step 1: Update imports in `escrow.service.ts`

Remove the inline `PayoutEntry` interface and `calculateDistribution` logic. Replace with:

```typescript
import { computePayouts, type PayoutEntry, type ParticipantInput } from './distribution-calculator';
```

Keep `PayoutEntry` re-exported so existing importers (if any) don't break.

#### Step 2: Refactor `calculateDistribution`

The function stays in `escrow.service.ts` as the DB-aware wrapper. It:
1. Fetches quest from DB
2. Fetches eligible participations from DB
3. Maps to `ParticipantInput[]`
4. Calls `computePayouts()` (pure function from Phase 1)
5. Returns `PayoutEntry[]`

```typescript
export async function calculateDistribution(
    prisma: PrismaClient,
    questId: string,
): Promise<PayoutEntry[]> {
    const quest = await prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) throw new Error('Quest not found');

    const chainId = quest.cryptoChainId || escrowConfig.defaultChainId;
    const tokenInfo = getTokenInfo(chainId, quest.rewardType.toUpperCase());
    if (!tokenInfo) throw new Error(`Token ${quest.rewardType} not found for chain ${chainId}`);

    const totalAmount = toSmallestUnit(quest.rewardAmount, tokenInfo.decimals);

    const participations = await prisma.questParticipation.findMany({
        where: {
            questId,
            status: { in: ['completed', 'submitted', 'verified'] },
            payoutWallet: { not: null },
        },
        orderBy: [{ completedAt: 'asc' }, { joinedAt: 'asc' }],
    });

    if (participations.length === 0) return [];

    const participants: ParticipantInput[] = participations.map(p => ({
        participationId: p.id,
        agentId: p.agentId,
        wallet: p.payoutWallet!,
    }));

    return computePayouts(quest.type, totalAmount, quest.totalSlots, participants);
}
```

#### Step 3: Add validation guards in `executeDistribute`

Before computing payouts, validate:

```typescript
export async function executeDistribute(
    prisma: PrismaClient,
    questId: string,
    chainId: number,
): Promise<string> {
    // Guard: check quest status
    const quest = await prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) throw new Error('Quest not found');
    if (quest.status === 'completed') throw new Error('Quest already distributed');
    if (quest.status !== 'live') throw new Error('Quest must be live to distribute');
    if (quest.fundingStatus !== 'confirmed') throw new Error('Quest is not funded');

    // Guard: check no existing pending/paid payouts
    const existingPayouts = await prisma.questParticipation.count({
        where: { questId, payoutStatus: { in: ['pending', 'paid'] } },
    });
    if (existingPayouts > 0) throw new Error('Distribution already in progress');

    const payouts = await calculateDistribution(prisma, questId);
    if (payouts.length === 0) throw new Error('No eligible participants for distribution');

    // ... rest of existing on-chain submission logic unchanged
}
```

Note: The route handler (`escrow.routes.ts` line 203) already checks `fundingStatus === 'confirmed'`. The service-level guard is defense-in-depth.

#### Step 4: Remove dead code

Delete from `escrow.service.ts`:
- Old inline `PayoutEntry` interface (lines 146-151)
- Old inline `calculateDistribution` function body (lines 156-213)
- Old switch/case for FCFS/LEADERBOARD/LUCKY_DRAW

Replace with import + slim wrapper as shown in Step 2.

### What stays unchanged
- `getDepositParams()` — untouched
- `getEscrowStatus()` — untouched
- `writeContractWithRetry()` — untouched
- `executeRefund()` — untouched
- Event handler re-exports — untouched
- `escrow.routes.ts` — untouched
- `escrow.poller.ts` — untouched
- `escrow-event-handlers.ts` — untouched (already marks quest `completed` on QuestDistributed event)

### Todo List
- [ ] Import `computePayouts` and types from `distribution-calculator.ts`
- [ ] Refactor `calculateDistribution` to use `computePayouts`
- [ ] Add status validation guards in `executeDistribute`
- [ ] Add double-distribution guard (check existing payouts)
- [ ] Remove old inline calculator code
- [ ] Re-export `PayoutEntry` type for backward compat
- [ ] Verify file is under 200 LOC after refactor

### Success Criteria
- `escrow.service.ts` under 200 lines
- All existing imports/exports still work
- `executeDistribute` rejects completed/non-live quests
- `executeDistribute` rejects quests with existing payouts
- No behavior change for the happy path

### Risk Assessment
- **Breaking existing route handler**: Route already has its own guards. Service-level guards are additive. Low risk.
- **Re-export compatibility**: Re-exporting `PayoutEntry` from the new file ensures no broken imports.
