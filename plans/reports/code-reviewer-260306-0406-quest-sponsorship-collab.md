# Code Review: Quest Sponsorship Collaboration

**Date:** 2026-03-06 04:06
**Scope:** 13 files, ~1545 LOC added
**Focus:** Security, race conditions, edge cases, correctness

---

## Overall Assessment

Solid feature design -- sub-questId derivation, multi-deposit tracking, and the invite/accept flow are well-structured. However, there are several critical and high-priority issues that need addressing before production use.

---

## CRITICAL Issues

### C1. Invite creates record with inviter's userId, not a placeholder -- accept creates duplicate

**File:** `/Users/hd/clawquest/apps/api/src/modules/quests/quests.routes.ts` (POST `/:id/invite`, ~line 1430)

The invite endpoint creates a `QuestCollaborator` with `userId` set to the **inviter's** userId (the person generating the link), not the eventual invitee. When the invitee accepts, the code deletes this record and creates a new one with the invitee's userId. But:

1. The `@@unique([questId, userId])` constraint means the inviter gets a collaborator record they didn't intend. If the owner invites someone, the owner gets a pending collab record on their own quest.
2. If the owner generates 2 invite links, the second `create` will fail on the unique constraint `[questId, userId]` because the inviter (owner) already has a pending record from the first invite.

```typescript
// Current: creates record with inviter's userId
await server.prisma.questCollaborator.create({
    data: {
        questId: id,
        userId,        // <-- this is the inviter, NOT the invitee
        inviteToken: token,
        invitedBy: userId,
        expiresAt,
    },
});
```

**Fix:** The invite record should either use a sentinel/null userId or use a separate `PendingInvite` table. Simplest fix: remove the `@@unique([questId, userId])` for the invite stage and add a `status` field (pending_invite vs accepted), or create a separate model for pending invites.

### C2. Distribution rounding loses funds -- BigInt truncation

**File:** `/Users/hd/clawquest/apps/api/src/modules/escrow/escrow.service.ts` (~line 340, multi-deposit distribute loop)

```typescript
const depositShare = Number(deposit.amount) / totalFunded;
const amounts = payouts.map(p => BigInt(Math.floor(Number(p.amount) * depositShare)));
```

Converting BigInt to Number and back introduces precision loss for large token amounts. For a deposit of 1000 USDC (1000000000 in smallest units) split across 3 participants and 2 sponsors, the `Math.floor` truncation accumulates rounding dust. The sum of distributed amounts may be less than the escrow balance, causing the contract's `distribute()` to revert (most escrow contracts require exact or under-distribution).

More critically, `Number(p.amount)` loses precision for amounts > 2^53 (unlikely for USDC but possible for 18-decimal tokens at scale).

**Fix:** Use pure BigInt arithmetic for proportional splits:
```typescript
const amounts = payouts.map(p => (p.amount * deposit.amountSmallest) / totalFundedSmallest);
```

### C3. Race condition: sponsor count check is not atomic

**File:** `/Users/hd/clawquest/apps/api/src/modules/quests/quests.routes.ts` (POST `/:id/collaborate`, ~line 1505)

The collaborate endpoint checks `sponsorCount >= 5` and then performs the transaction, but between the count check and the transaction, another concurrent request could also pass the check. This TOCTOU race allows exceeding the 5-sponsor limit.

**Fix:** Move the count check inside the transaction, or use a database-level constraint.

---

## HIGH Priority

### H1. `getDepositParams` has side effects on a GET-like endpoint

**File:** `/Users/hd/clawquest/apps/api/src/modules/escrow/escrow.service.ts` (~line 88)

`getDepositParams` now creates a `QuestDeposit` record with status `pending` as a side effect. This is called from `GET /escrow/:questId/deposit-params` via the escrow routes. A GET endpoint should be idempotent, but this creates DB records. If the frontend calls this multiple times (retries, page refreshes), it creates at most one pending record per user (guarded by `findFirst`), but this is still surprising behavior.

**Recommendation:** Move deposit record creation to a separate POST endpoint or create it when the user actually initiates the transaction.

### H2. `updateQuest` with `skipAuthCheck=true` bypasses all ownership validation

**File:** `/Users/hd/clawquest/apps/api/src/modules/quests/quests.service.ts` (~line 228)

The PATCH route calls `isQuestOwnerOrSponsor` then passes `skipAuthCheck=true` to `updateQuest`. But sponsors can now edit ANY field on a draft quest (title, description, reward amount, tasks, etc.). A malicious sponsor could change the reward amount to 0, change tasks, etc.

**Fix:** Restrict sponsor edits to a whitelist of fields (e.g., only viewing, not modifying quest content). Or add field-level permissions.

### H3. Delete collaborator doesn't handle deposits already made

**File:** `/Users/hd/clawquest/apps/api/src/modules/quests/quests.routes.ts` (DELETE `/:id/collaborators/:targetUserId`, ~line 1564)

When an owner removes a sponsor, the collaborator record is deleted but any `QuestDeposit` records from that sponsor remain. The on-chain funds are still in the escrow under their sub-questId. There is no refund initiated, and no warning to the owner. This creates an inconsistent state where funds exist on-chain but the sponsor has no access.

**Fix:** Either block removal if sponsor has confirmed deposits, or trigger a refund flow.

### H4. `handleQuestFunded` uses `quest.creatorUserId ?? ''` as fallback userId

**File:** `/Users/hd/clawquest/apps/api/src/modules/escrow/escrow-event-handlers.ts` (~line 82)

When a deposit arrives without a prior pending record (direct on-chain), the handler creates a deposit with `userId: quest.creatorUserId ?? ''`. An empty string userId is invalid and could cause FK constraint failures or downstream issues.

**Fix:** Use a proper fallback or skip the userId field if unknown. Consider making it nullable.

### H5. Partial refund sets `refundStatus: 'pending'` -- stale state

**File:** `/Users/hd/clawquest/apps/api/src/modules/escrow/escrow-event-handlers.ts` (~line 227)

When a partial refund happens (some deposits refunded, others remain), the quest gets `refundStatus: 'pending'` even though the refund event already completed. This status was set before the `executeRefund` call and is now being overwritten back to `pending` by the event handler. The `refundTxHash` is also set to only the last refund's hash.

---

## MEDIUM Priority

### M1. Invite token in URL is single-use but stored in `inviteToken` column after acceptance

The `inviteToken` value is reused from the pending invite to the accepted collaborator record. After acceptance, this token remains in the DB and is indexed. While the `acceptedAt` check prevents reuse, the token still resolves via `findUnique({ inviteToken })`. Consider nullifying it after acceptance.

### M2. `/mine` endpoint has no pagination

The `/mine` endpoint now fetches ALL owned quests + ALL sponsored quests with `Promise.all`. For a power user with many quests, this becomes expensive. No `limit`/`offset` parameters.

### M3. `collaborators` endpoint leaks email addresses

**File:** `/Users/hd/clawquest/apps/api/src/modules/quests/quests.routes.ts` (~line 1543)

The collaborators query includes `email` in the user select but the response mapping doesn't include it. However, the raw query result is in memory. Verify no accidental leakage. Currently safe but fragile.

### M4. `resolveLogicalQuestId` does 2 DB queries for every event

For owner deposits (the common case), `bytes32ToUuid` succeeds and does a `quest.findUnique`. For sub-questIds, it does the UUID attempt (which may or may not throw), then a `questDeposit.findFirst`. Consider caching or ordering the checks based on frequency.

### M5. Missing migration file

The schema has new models (`QuestCollaborator`, `QuestDeposit`) and a new field (`totalFunded` on Quest) but no migration file was included in the diff. Ensure `prisma migrate dev` was run.

---

## Edge Cases Found

1. **Self-invite:** Owner can generate invite link but the collaborate endpoint blocks `quest.creatorUserId === userId`. However, a sponsor can invite the owner (since they pass `isQuestOwnerOrSponsor`), which creates a confusing invite that the owner can't accept.
2. **Expired invite cleanup:** No cron/job to clean up expired `QuestCollaborator` records with `acceptedAt: null`.
3. **Sub-questId collision:** `keccak256(questIdBytes32 + userIdBytes32)` is collision-resistant, but if two different quest+user combos produce the same hash (astronomically unlikely but theoretically possible), deposits would cross-contaminate.
4. **`executeDistribute` sequential transactions:** The multi-deposit distribute loop sends transactions sequentially (`for...of` with `await`). If one sub-escrow distribute reverts (e.g., insufficient balance), subsequent deposits won't be distributed. No rollback of the ones that succeeded.
5. **`payoutTxHash` always uses `txHashes[0]`:** In multi-deposit distribute, all participation records get the first tx hash, not the ones relevant to their actual payout.

---

## Positive Observations

- Sub-questId derivation via `keccak256(questId + userId)` is a clean approach for multi-sponsor escrow
- The `resolveLogicalQuestId` pattern cleanly handles both legacy and new deposit styles
- Funding progress recalculation from `QuestDeposit.aggregate` is correct and idempotent
- The invite/accept transaction properly deletes + creates atomically
- Good validation: owner can't self-sponsor, closed quests can't receive invites, max 5 sponsors enforced

---

## Recommended Actions (Priority Order)

1. **Fix C1** -- Redesign invite storage so pending invites don't use inviter's userId in unique constraint
2. **Fix C2** -- Use BigInt-only arithmetic for proportional distribution splits
3. **Fix C3** -- Move sponsor count check inside a transaction or add DB constraint
4. **Fix H2** -- Restrict which fields sponsors can edit (or make them read-only)
5. **Fix H3** -- Block sponsor removal if they have confirmed on-chain deposits
6. **Fix H1** -- Move deposit record creation out of `getDepositParams`
7. Run `prisma migrate dev` if not done (M5)

---

## Unresolved Questions

1. What happens if a sponsor deposits more than the remaining needed amount? The `depositAmount` calculation shows full reward as reference when fully funded -- should the contract reject over-deposits?
2. Is there a plan for sponsor-initiated refunds (a sponsor wants their deposit back before quest completion)?
3. Should the `distribute` flow handle partial failures across sub-escrows gracefully (retry failed ones)?
