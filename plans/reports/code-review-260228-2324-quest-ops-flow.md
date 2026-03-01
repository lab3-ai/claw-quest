# Code Review: Quest Operations Flow

**Date:** 2026-02-28
**Reviewer:** code-reviewer
**Scope:** Backend verify/manage-summary routes, escrow auth changes, frontend manage page

---

## Overall Assessment

The Quest Operations Flow adds meaningful functionality: proof verification (single + bulk), a manage-summary endpoint, and a manage page for quest creators. The auth model change from admin-only to creator-or-admin for escrow distribute/refund is a sound design decision. However, there is one **critical bug** that would silently prevent payouts to approved participants, plus several medium issues worth addressing.

---

## Critical Issues

### 1. `calculateDistribution` excludes verified participants -- payouts will fail

**File:** `/Users/hd/clawquest/apps/api/src/modules/escrow/escrow.service.ts` line 183

The distribution query filters `status: { in: ['completed', 'submitted'] }` but the new verify flow transitions proofs from `submitted` -> `verified`. Once a creator approves proofs, those participants become `verified` and are **excluded from distribution**.

This means the intended flow (approve proofs -> distribute) will either:
- Distribute to zero participants (if all were approved), throwing "No eligible participants"
- Skip approved participants entirely

**Fix:** Add `'verified'` to the status filter:
```typescript
status: { in: ['completed', 'submitted', 'verified'] },
```

Or, if `verified` should be the only status eligible for distribution (more correct semantically):
```typescript
status: { in: ['verified'] },
```

**Impact:** Blockers. Distribution is non-functional for the new verify workflow.

---

## High Priority

### 2. Manage page displays raw BigInt strings and token addresses

**File:** `/Users/hd/clawquest/apps/dashboard/src/routes/_authenticated/quests/$questId/manage.tsx` lines 338-350

The escrow section renders `escrow.deposited` (e.g., `"500000000"`) and `escrow.token` (e.g., `"0x036CbD53842c..."`) instead of human-readable values.

The API already returns `depositedHuman`, `distributedHuman`, `refundedHuman`, `remainingHuman` and can infer the token symbol.

**Fix in `EscrowStatus` interface (manage.tsx):**
```typescript
interface EscrowStatus {
    depositedHuman: number
    distributedHuman: number
    refundedHuman: number
    remainingHuman: number
    // keep token for fallback, but prefer symbol derived from quest.rewardType
}
```

**Fix in JSX:** Use `escrow.depositedHuman` + `quest.rewardType` instead.

### 3. `bulkVerifyParticipations` runs sequential updates in a loop (N+1 writes)

**File:** `/Users/hd/clawquest/apps/api/src/modules/quests/quests.service.ts` lines 309-331

Each item is updated one at a time inside a `for` loop. For 100 items (the max), this is 100 sequential DB round trips.

**Fix:** Use `prisma.$transaction` to batch all updates:
```typescript
const operations = items.filter(item => {
    const p = pMap.get(item.participationId);
    return p && p.status === 'submitted';
}).map(item => {
    // build update
    return prisma.questParticipation.update({ where: { id: item.participationId }, data: { ... } });
});
await prisma.$transaction(operations);
```

This also fixes the atomicity gap -- currently a partial failure leaves some approved and some not, with no way to recover.

### 4. `executeDistribute` has N+1 reads inside the payout loop

**File:** `/Users/hd/clawquest/apps/api/src/modules/escrow/escrow.service.ts` lines 294-306

Inside the loop updating each payout participant, line 300 does `prisma.quest.findUnique({ where: { id: questId } })` for every single payout entry to get `tokenDecimals`. This query returns the same result each time.

**Fix:** Read `tokenDecimals` once before the loop:
```typescript
const questData = await prisma.quest.findUnique({ where: { id: questId } });
const decimals = questData?.tokenDecimals || 6;
for (const payout of payouts) {
    await prisma.questParticipation.update({
        where: { id: payout.participationId },
        data: {
            payoutAmount: fromSmallestUnit(payout.amount, decimals),
            payoutStatus: 'paid',
            payoutTxHash: txHash,
        },
    });
}
```

---

## Medium Priority

### 5. Escrow distribute/refund routes duplicate auth logic

**File:** `/Users/hd/clawquest/apps/api/src/modules/escrow/escrow.routes.ts` lines 189-197 and 252-259

The creator-or-admin check is inlined identically in both `distribute` and `refund` handlers. The quest service already exports `isQuestCreatorOrAdmin` for exactly this purpose.

**Fix:** Replace inline check with:
```typescript
const { allowed } = await isQuestCreatorOrAdmin(server.prisma, questId, request.user.id, request.user.role);
if (!allowed) return reply.status(403).send({ message: '...' } as any);
```

### 6. Manage page does not check authorization on the frontend

**File:** `/Users/hd/clawquest/apps/dashboard/src/routes/_public/quests/detail.tsx` line 616

The Manage button visibility check `quest.creatorUserId === user?.id` does not account for admin users. Admins can access the manage-summary API but won't see the button.

**Fix:**
```tsx
{isAuthenticated && (quest.creatorUserId === user?.id || user?.role === 'admin') && quest.status !== 'draft' && (
```

Note: This requires `role` to be available in the auth context's user object.

### 7. No status transition guard on the manage page actions

The manage page enables "Distribute Payout" when `isFunded && hasVerified` but does not check if the quest is already `completed`. A user could trigger distribution on an already-completed quest if they navigate directly to the manage page.

**Fix:** Add `quest.status !== 'completed'` to the distribute button's disabled condition.

### 8. Missing `response` schema on manage-summary endpoint

**File:** `/Users/hd/clawquest/apps/api/src/modules/quests/quests.routes.ts` line 1213

The manage-summary route has no `response` schema defined. All other new routes define response schemas. While not a runtime issue, this means the endpoint won't appear in the OpenAPI docs response section.

### 9. Proof data exposed verbatim in manage page

**File:** `/Users/hd/clawquest/apps/dashboard/src/routes/_authenticated/quests/$questId/manage.tsx` line 71

`JSON.stringify(p.proof, null, 2)` renders raw proof JSON including potential PII or internal metadata. If proof contains sensitive fields (wallet addresses, user data), this could be an information disclosure issue.

**Recommendation:** Define which proof fields are safe to display and render only those, or at minimum truncate large proof objects.

---

## Low Priority

### 10. `escrow.token` raw address in manage page

The `EscrowStatus` type in the manage page stores `token: string` which is a contract address. Even if the human-readable amounts are fixed, showing a raw 0x address as "token" next to the amount is not user-friendly.

### 11. Missing `creatorUserId` in detail.tsx fetch type

**File:** `/Users/hd/clawquest/apps/dashboard/src/routes/_public/quests/detail.tsx` line 105

`QuestWithParticipation` extends `Quest` and adds `creatorUserId?: string`. This field is optional, meaning the Manage button check could silently fail (comparing `undefined === user.id`). The field should be guaranteed in the API response.

### 12. Breadcrumb separator inconsistency

The manage page uses `/` as separator while the detail page uses `>`. Minor visual inconsistency.

---

## Positive Observations

- Auth check pattern (creator-or-admin) is clean and reusable via `isQuestCreatorOrAdmin`
- Zod validation on all route params and bodies is thorough
- Bulk verify has a sensible max limit of 100 items
- The manage-summary endpoint combines quest + participations + status counts in a single query, avoiding waterfall fetches
- Error reporting in `bulkVerifyParticipations` is user-friendly -- partial success returns both `updated` count and per-item error messages
- CSS follows the project's design system variables pattern
- Responsive grid breakpoint at 720px for the manage page

---

## Recommended Actions (Priority Order)

1. **[CRITICAL]** Fix `calculateDistribution` to include `verified` status
2. **[HIGH]** Fix manage page to use `depositedHuman`/`distributedHuman` instead of raw BigInts
3. **[HIGH]** Fix N+1 quest query in `executeDistribute` payout loop
4. **[HIGH]** Wrap `bulkVerifyParticipations` updates in `$transaction`
5. **[MEDIUM]** DRY the creator-or-admin check in escrow routes
6. **[MEDIUM]** Show Manage button for admin users on detail page
7. **[MEDIUM]** Add `completed` status guard to distribute button

---

## Unresolved Questions

- What is the intended lifecycle? Should `verified` be the final status for distribution, or should there be a separate `verified` -> `completed` transition before payout?
- Should the Prisma schema's `status` comment (`// in_progress, submitted, completed, failed`) be updated to include `verified` and `rejected` as valid values?
- Is `submitted` still a valid distribution-eligible status, or should only `verified` proofs be paid?
