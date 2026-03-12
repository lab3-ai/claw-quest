# Brainstorm: Quest Sponsorship Collaboration

**Date:** 2026-03-06
**Status:** AGREED — ready for implementation planning

## Problem Statement
Quest creators want to invite sponsors who can edit quest, add social tasks (follow their X/Telegram), and co-fund the quest reward pool.

## Agreed Solution: Collaborator Model (No Contract Upgrade)

### Roles (2 only)

| | **Owner** (implicit = creatorUserId) | **Sponsor** (invited) |
|---|---|---|
| Edit title/desc/deadline | ✅ | ✅ |
| Add/edit/remove tasks | ✅ | ✅ |
| Deposit funds | ✅ | ✅ |
| Verify quester submissions | ✅ | ✅ |
| Invite more sponsors | ✅ | ✅ |
| Remove sponsors | ✅ | ❌ |
| Publish quest | ✅ | ❌ |
| Cancel quest | ✅ | ❌ |
| Receive refund (pro-rata) | ✅ | ✅ |

- Owner = `quest.creatorUserId` (implicit, not stored in collaborator table)
- Sponsor = anyone in `QuestCollaborator` table
- No role column needed — presence in table = sponsor
- Permission: `isOwner || isSponsor` for most actions; `isOwner` only for publish/cancel/kick

### Funding Flow

**Principle:** No forced ordering. Owner can fund first or invite first. Partial funding allowed.

**Quest fields:**
- `rewardAmount` — target set by owner (minimum to publish)
- `totalFunded` — cached SUM of all QuestDeposit records (updated by poller)
- `fundingStatus` — `unfunded` → `partial` → `confirmed` (when `totalFunded >= rewardAmount`)

**Publish gate:** `totalFunded >= rewardAmount` — mandatory, no bypass.

**Scenarios:**
```
A) Owner funds solo:     Owner sets 500 → deposits 500 → confirmed → publish
B) Co-fund before live:  Owner sets 500 → deposits 200 + Sponsor deposits 300 → confirmed → publish
C) Sponsor joins after:  Quest live (500 funded) → Sponsor deposits 200 → totalFunded = 700 → winners get more
D) Owner funds nothing:  Owner sets 500 → Sponsors fund 500 total → confirmed → publish
```

### On-Chain Multi-Deposit (Sub-QuestId Approach)

Contract rejects 2nd deposit to same questId (`QuestAlreadyFunded` revert). Solution: each depositor gets unique sub-questId.

```
Sub-questId = keccak256(questIdBytes32 + padLeft(userId))
```

**On-chain state:**
```
escrow[questId]      → owner deposited 300 USDC (sponsor = owner wallet)
escrow[subQuestId-A] → sponsor A deposited 100 USDC (sponsor = A's wallet)
escrow[subQuestId-B] → sponsor B deposited 100 USDC (sponsor = B's wallet)
```

**Distribution:** Backend calls `distribute()` on EACH sub-escrow proportionally.
```
5 winners, 500 USDC total, 100 each:
  distribute(questId,      [w1..w5], [60,60,60,60,60])   // owner's 300
  distribute(subQuestId-A, [w1..w5], [20,20,20,20,20])   // sponsor A's 100
  distribute(subQuestId-B, [w1..w5], [20,20,20,20,20])   // sponsor B's 100
```

**Refund:** Call `refund()` on each sub-escrow → each sponsor gets own money back. No pro-rata math. Clean.

### Edit Rules by Quest Status

| Action | Draft/Scheduled | Live | Completed/Expired/Cancelled |
|--------|----------------|------|-----------------------------|
| Edit title/desc | ✅ anyone | ❌ locked | ❌ |
| Add/edit/remove tasks | ✅ anyone | ❌ locked | ❌ |
| Deposit funds | ✅ | ✅ (bonus pool) | ❌ |
| Invite sponsors | ✅ | ✅ | ❌ |
| Extend deadline | ✅ | ✅ owner only (extend only, no shorten) | ❌ |

**Tasks locked after live** — no mid-quest rule changes. Sponsors who want more tasks → create new quest.

### DB Schema

```prisma
model QuestCollaborator {
  id          String    @id @default(uuid())
  questId     String
  quest       Quest     @relation(fields: [questId], references: [id])
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  inviteToken String    @unique  // "collab_<hex>"
  invitedBy   String?            // userId of who invited
  acceptedAt  DateTime?
  createdAt   DateTime  @default(now())
  @@unique([questId, userId])
}

model QuestDeposit {
  id              String   @id @default(uuid())
  questId         String                        // logical quest ID
  escrowQuestId   String                        // on-chain questId (main or sub)
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  amount          Decimal                       // human-readable (e.g. 200.00)
  tokenAddress    String
  chainId         Int
  txHash          String?                       // filled when poller confirms
  walletAddress   String                        // depositor's wallet
  status          String   @default("pending")  // pending | confirmed | refunded
  createdAt       DateTime @default(now())
}
```

**Quest model additions:**
```prisma
model Quest {
  // ...existing fields...
  totalFunded       Decimal?  @default(0)
  collaborators     QuestCollaborator[]
  deposits          QuestDeposit[]
}
```

### API Changes

**New endpoints:**
- `POST /quests/:id/invite` — generate invite link (owner or sponsor)
- `POST /quests/:id/collaborate` — accept invite (auth + collab token)
- `GET /quests/:id/collaborators` — list sponsors + their deposits
- `DELETE /quests/:id/collaborators/:userId` — remove sponsor (owner only)

**Modified endpoints:**
- `PATCH /quests/:id` — extend auth: `isOwner || isSponsor` (draft only for content; live allows deposit + deadline extend)
- `GET /quests/:id/fund` — generate deposit params with sub-questId for non-owner depositors
- `POST /quests/:id/publish` — check `totalFunded >= rewardAmount` instead of single deposit
- Distribution logic — use `totalFunded` instead of `rewardAmount`; distribute from multiple sub-escrows

**Escrow poller change:**
1. `Deposited` event → match wallet to QuestDeposit record (by escrowQuestId)
2. Update deposit status → confirmed
3. Recalculate `quest.totalFunded = SUM(confirmed deposits)`
4. If `totalFunded >= rewardAmount` → `fundingStatus: confirmed`

### Invite Flow

```
Owner/Sponsor generates invite → collab_<hex> token (7-day expiry)
→ Share link: /quests/:id/join?token=collab_xxx
→ Invitee logs in → POST /quests/:id/collaborate { token }
→ Creates QuestCollaborator record → invitee sees quest in "My Quests"
```

### Frontend UI

**Public quest detail:** `Sponsored by Alice, Bob, Charlie`

**Dashboard (owner/sponsor view):**
- Sponsors section: avatars + deposit amounts + invite button
- Fund progress: `totalFunded / rewardAmount` bar with per-depositor breakdown
- Invite: click → generate link → copy/share (no role picker needed)
- Owner sees: Publish, Cancel, Remove buttons
- Sponsor sees: Edit, Fund, Invite buttons (no Publish/Cancel/Remove)

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Roles | 2 only (owner + sponsor) | KISS — sponsor = full access minus publish/cancel/kick |
| Role column | None — presence in table = sponsor | YAGNI |
| Funding order | Flexible | Don't force workflow |
| Multi-deposit on-chain | Sub-questId per depositor | No contract upgrade |
| Tasks after live | Locked | No mid-quest rule changes |
| Deadline after live | Extend only, owner only | Don't harm active questers |
| Distribution source | `totalFunded` (not `rewardAmount`) | Bonus deposits benefit winners |
| Refund | `refund()` per sub-escrow | Each sponsor gets own money back |
| Invite | Anyone can invite | Viral growth |
| Remove | Owner only | Prevent sponsor drama |
| Max sponsors | 5 per quest | Prevent abuse |
| Invite expiry | 7 days | Prevent stale links |
| fundingStatus | Add `partial` state | UX clarity for partial funding |

### Risks
1. **Concurrent edits** — v1: last-write-wins (acceptable for small teams)
2. **Gas cost** — N distribute txs instead of 1 (negligible on Base/BNB)
3. **Poller complexity** — must map sub-questIds back to logical quest
4. **Sub-questId collision** — astronomically unlikely with keccak256
5. **Sponsor deposits after expired** — API rejects, contract has no guard (backend is gate)

### Migration / Backward Compatibility
- Existing quests: no collaborators, owner deposits to main questId — works as-is
- `totalFunded` defaults to `rewardAmount` for existing funded quests (migration script)
- All changes additive — no breaking changes to existing API consumers

## Resolved Questions
- ~~Invite single-use or multi-use?~~ → Single-use per invite link
- ~~Sponsor leave + refund?~~ → No voluntary leave; refund only on cancel/expire
- ~~See each other's deposits?~~ → Yes, transparency
- ~~Tasks after live?~~ → No, locked
- ~~Notifications?~~ → v2

## Unresolved Questions
None — all decisions made. Ready for implementation plan.
