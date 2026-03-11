# Phase 02 — API: Collaboration Endpoints

**Priority:** P1
**Effort:** 3h
**Status:** completed
**Depends on:** Phase 01

## Context Links

- Routes: `apps/api/src/modules/quests/quests.routes.ts`
- Service: `apps/api/src/modules/quests/quests.service.ts`
- Shared: `packages/shared/src/index.ts`

## Overview

4 new endpoints for invite/accept/list/remove sponsors. Update `PATCH /quests/:id` and `POST /quests/:id/publish` to accept sponsor auth. Add `isQuestSponsor()` and `generateCollabToken()` to service.

## Related Code Files

**Modify:**
- `apps/api/src/modules/quests/quests.service.ts`
- `apps/api/src/modules/quests/quests.routes.ts`

## Implementation Steps

### 1. Add Service Helpers

**File:** `apps/api/src/modules/quests/quests.service.ts`

Add `generateCollabToken()` after existing token generators:
```typescript
export function generateCollabToken(): string {
  return 'collab_' + randomBytes(32).toString('hex');
}
```

Add `isQuestSponsor()` after `isQuestCreatorOrAdmin()`:
```typescript
export async function isQuestSponsor(
  prisma: PrismaClient,
  questId: string,
  userId: string,
): Promise<boolean> {
  const collab = await prisma.questCollaborator.findUnique({
    where: { questId_userId: { questId, userId } },
    select: { acceptedAt: true },
  });
  return collab?.acceptedAt != null;
}
```

Add `isQuestOwnerOrSponsor()` convenience function:
```typescript
export async function isQuestOwnerOrSponsor(
  prisma: PrismaClient,
  questId: string,
  userId: string,
  userRole: string,
): Promise<{ allowed: boolean; isOwner: boolean; quest: any }> {
  const quest = await prisma.quest.findUnique({ where: { id: questId } });
  if (!quest) throw new QuestNotFoundError();
  const isOwner = quest.creatorUserId === userId || userRole === 'admin';
  const isSponsor = isOwner ? false : await isQuestSponsor(prisma, questId, userId);
  return { allowed: isOwner || isSponsor, isOwner, quest };
}
```

### 2. New Endpoint: POST /quests/:id/invite

Auth: owner or accepted sponsor. Returns `{ inviteUrl, token, expiresAt }`.

```typescript
server.post('/:id/invite', { onRequest: [server.authenticate] }, async (req, reply) => {
  const { id } = req.params as { id: string };
  const userId = req.user.id;
  const userRole = req.user.role;

  const { allowed, quest } = await isQuestOwnerOrSponsor(
    server.prisma, id, userId, userRole
  );
  if (!allowed) return reply.status(403).send({ error: { message: 'Forbidden', code: 'FORBIDDEN' } });

  // Check quest is not terminal
  if (['completed', 'cancelled', 'expired'].includes(quest.status)) {
    return reply.status(400).send({ error: { message: 'Cannot invite to a closed quest', code: 'QUEST_CLOSED' } });
  }

  // Enforce max 5 sponsors
  const sponsorCount = await server.prisma.questCollaborator.count({
    where: { questId: id, acceptedAt: { not: null } },
  });
  if (sponsorCount >= 5) {
    return reply.status(400).send({ error: { message: 'Max 5 sponsors reached', code: 'MAX_SPONSORS' } });
  }

  const token = generateCollabToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  // Create pending collaborator record (no userId — token-based)
  // Store token in a pending invite record (userId filled on accept)
  // Use a placeholder approach: store inviteToken on a record with acceptedAt=null
  // We do NOT know the invitee userId yet — store as pending invite linked to questId
  await server.prisma.questCollaborator.create({
    data: {
      questId: id,
      userId: userId,        // temporarily set to inviter; overwritten on accept
      inviteToken: token,
      invitedBy: userId,
      expiresAt,
      // acceptedAt: null — marks as pending
    },
  });
  // NOTE: On accept, the record's userId will be updated to the actual invitee.
  // This requires upsert logic in the accept endpoint.

  const inviteUrl = `${frontendUrl}/quests/${id}/join?token=${token}`;
  return { inviteUrl, token, expiresAt: expiresAt.toISOString() };
});
```

**Design note on pending invites:** Rather than storing inviter's userId temporarily, create a standalone pending invite table approach is overkill (YAGNI). Instead, keep `QuestCollaborator` records with `acceptedAt = null` representing open invites. The `userId` field stores the inviter until the invite is accepted (at which point a new record is created for the invitee and the pending invite is deleted). See accept endpoint below.

**Revised approach** — simpler: store `inviteToken` + `expiresAt` in a separate lightweight map. Even simpler: add `inviteeUserId String?` to `QuestCollaborator`. But per YAGNI, use the cleanest approach:

The `QuestCollaborator` record represents an _accepted_ sponsor. Pending invites are stored as records with `acceptedAt = null` and `userId = ''` (placeholder). On accept, update `userId` and set `acceptedAt`. Enforce `@@unique([questId, userId])` won't apply to placeholder records because we use a temp UUID.

**Final clean approach:** Keep pending invite records with `userId = inviterId` (the person who created the invite) and a flag — but this conflicts with the unique constraint.

**Correct approach:** Add `inviteeEmail String?` to track invited-but-not-yet-accepted. The cleanest v1 is: pending invite records use `userId = 'pending_<token>'` — but UUIDs are validated.

**Resolution:** Add nullable `pendingUserId` is over-engineered. Use this pattern:
- Pending invite: `QuestCollaborator { userId = inviter, acceptedAt = null, inviteToken, invitedBy = inviter }`
- On accept: delete the pending record, create new `{ userId = accepter, acceptedAt = now(), invitedBy }`
- `@@unique([questId, userId])` prevents double-accept

### 3. New Endpoint: POST /quests/:id/collaborate

Auth: authenticated user. Body: `{ token: string }`.

```typescript
server.post('/:id/collaborate', { onRequest: [server.authenticate] }, async (req, reply) => {
  const { id } = req.params as { id: string };
  const { token } = req.body as { token: string };
  const userId = req.user.id;

  // Find pending invite
  const invite = await server.prisma.questCollaborator.findUnique({
    where: { inviteToken: token },
  });
  if (!invite || invite.questId !== id) {
    return reply.status(404).send({ error: { message: 'Invalid invite token', code: 'INVALID_TOKEN' } });
  }
  if (invite.expiresAt < new Date()) {
    return reply.status(400).send({ error: { message: 'Invite link expired', code: 'TOKEN_EXPIRED' } });
  }
  if (invite.acceptedAt) {
    return reply.status(400).send({ error: { message: 'Invite already used', code: 'TOKEN_USED' } });
  }

  const quest = await server.prisma.quest.findUnique({ where: { id } });
  if (!quest || ['completed', 'cancelled', 'expired'].includes(quest.status)) {
    return reply.status(400).send({ error: { message: 'Quest is closed', code: 'QUEST_CLOSED' } });
  }

  // Prevent owner from accepting own invite
  if (quest.creatorUserId === userId) {
    return reply.status(400).send({ error: { message: 'Owner cannot be a sponsor', code: 'OWNER_CONFLICT' } });
  }

  // Check not already a sponsor
  const existing = await server.prisma.questCollaborator.findUnique({
    where: { questId_userId: { questId: id, userId } },
  });
  if (existing?.acceptedAt) {
    return reply.status(400).send({ error: { message: 'Already a sponsor', code: 'ALREADY_SPONSOR' } });
  }

  // Enforce max 5
  const sponsorCount = await server.prisma.questCollaborator.count({
    where: { questId: id, acceptedAt: { not: null } },
  });
  if (sponsorCount >= 5) {
    return reply.status(400).send({ error: { message: 'Max 5 sponsors reached', code: 'MAX_SPONSORS' } });
  }

  const invitedBy = invite.invitedBy;

  // Mark invite as used (delete pending record, create accepted record)
  await server.prisma.$transaction([
    server.prisma.questCollaborator.delete({ where: { id: invite.id } }),
    server.prisma.questCollaborator.create({
      data: { questId: id, userId, inviteToken: token, invitedBy, acceptedAt: new Date(),
              expiresAt: invite.expiresAt },
    }),
  ]);

  return { success: true, questId: id };
});
```

### 4. New Endpoint: GET /quests/:id/collaborators

Auth: owner or sponsor. Returns sponsors + their deposits + totals.

```typescript
server.get('/:id/collaborators', { onRequest: [server.authenticate] }, async (req, reply) => {
  const { id } = req.params as { id: string };
  const userId = req.user.id;
  const userRole = req.user.role;

  const { allowed } = await isQuestOwnerOrSponsor(server.prisma, id, userId, userRole);
  if (!allowed) return reply.status(403).send({ error: { message: 'Forbidden', code: 'FORBIDDEN' } });

  const [collaborators, deposits, quest] = await Promise.all([
    server.prisma.questCollaborator.findMany({
      where: { questId: id, acceptedAt: { not: null } },
      include: { user: { select: { displayName: true, username: true, email: true } } },
      orderBy: { acceptedAt: 'asc' },
    }),
    server.prisma.questDeposit.findMany({
      where: { questId: id },
      orderBy: { createdAt: 'asc' },
    }),
    server.prisma.quest.findUnique({ where: { id }, select: { rewardAmount: true, totalFunded: true } }),
  ]);

  return {
    collaborators: collaborators.map(c => ({
      id: c.id, questId: c.questId, userId: c.userId,
      invitedBy: c.invitedBy, acceptedAt: c.acceptedAt?.toISOString() ?? null,
      expiresAt: c.expiresAt.toISOString(), createdAt: c.createdAt.toISOString(),
      displayName: c.user.displayName, username: c.user.username,
    })),
    deposits: deposits.map(d => ({
      id: d.id, questId: d.questId, userId: d.userId,
      escrowQuestId: d.escrowQuestId, amount: Number(d.amount),
      tokenAddress: d.tokenAddress, chainId: d.chainId,
      txHash: d.txHash, walletAddress: d.walletAddress,
      status: d.status, createdAt: d.createdAt.toISOString(),
    })),
    totalFunded: Number(quest?.totalFunded ?? 0),
    rewardAmount: Number(quest?.rewardAmount ?? 0),
  };
});
```

### 5. New Endpoint: DELETE /quests/:id/collaborators/:userId

Auth: owner only.

```typescript
server.delete('/:id/collaborators/:targetUserId', { onRequest: [server.authenticate] }, async (req, reply) => {
  const { id, targetUserId } = req.params as { id: string; targetUserId: string };
  const { allowed, isOwner } = await isQuestOwnerOrSponsor(
    server.prisma, id, req.user.id, req.user.role
  );
  if (!allowed || !isOwner) {
    return reply.status(403).send({ error: { message: 'Only owner can remove sponsors', code: 'FORBIDDEN' } });
  }

  const collab = await server.prisma.questCollaborator.findUnique({
    where: { questId_userId: { questId: id, userId: targetUserId } },
  });
  if (!collab) return reply.status(404).send({ error: { message: 'Sponsor not found', code: 'NOT_FOUND' } });

  await server.prisma.questCollaborator.delete({
    where: { questId_userId: { questId: id, userId: targetUserId } },
  });

  return { success: true };
});
```

### 6. Modify PATCH /quests/:id

**File:** `apps/api/src/modules/quests/quests.routes.ts` — existing PATCH handler.

Replace `isQuestCreatorOrAdmin` check with `isQuestOwnerOrSponsor`. Apply edit restrictions:
- Draft/scheduled: sponsors can edit title, desc, tasks, deadlines (same as owner)
- Live: only `expiresAt` extension allowed (owner only — no sponsor deadline changes)
- Tasks array locked when `quest.status === 'live'`

```typescript
// Replace existing auth check in PATCH handler:
const { allowed, isOwner, quest } = await isQuestOwnerOrSponsor(
  server.prisma, id, userId, userRole
);
if (!allowed) return reply.status(403).send(...);

// Lock tasks if live
if (quest.status === 'live' && body.tasks !== undefined) {
  return reply.status(400).send({ error: { message: 'Tasks locked after quest goes live', code: 'TASKS_LOCKED' } });
}

// Deadline extension: live quest, owner only, no shortening
if (quest.status === 'live' && body.expiresAt !== undefined) {
  if (!isOwner) return reply.status(403).send({ error: { message: 'Only owner can extend deadline', code: 'FORBIDDEN' } });
  const newExpiry = new Date(body.expiresAt);
  if (quest.expiresAt && newExpiry < quest.expiresAt) {
    return reply.status(400).send({ error: { message: 'Cannot shorten deadline', code: 'INVALID_DEADLINE' } });
  }
}

// Pass userId loosely — updateQuest needs refactor to accept owner-or-sponsor
// Update quests.service.ts updateQuest() to remove hard creatorUserId check
// (auth check already done above via isQuestOwnerOrSponsor)
```

Update `updateQuest()` in `quests.service.ts`: remove the `creatorUserId` ownership check (caller handles auth).

### 7. Modify POST /quests/:id/publish

Replace funding status check: use `totalFunded >= rewardAmount` instead of `fundingStatus === 'confirmed'`.

```typescript
// In publish handler, after ownership check:
const quest = await server.prisma.quest.findUnique({ where: { id } });
if (Number(quest.totalFunded) < Number(quest.rewardAmount)) {
  return reply.status(400).send({
    error: { message: `Insufficient funding: ${quest.totalFunded}/${quest.rewardAmount}`, code: 'INSUFFICIENT_FUNDING' }
  });
}
```

## Todo Checklist

- [ ] Add `generateCollabToken()` to `quests.service.ts`
- [ ] Add `isQuestSponsor()` to `quests.service.ts`
- [ ] Add `isQuestOwnerOrSponsor()` to `quests.service.ts`
- [ ] Remove hard `creatorUserId` check from `updateQuest()` (auth done at route level)
- [ ] Add `POST /quests/:id/invite` endpoint
- [ ] Add `POST /quests/:id/collaborate` endpoint
- [ ] Add `GET /quests/:id/collaborators` endpoint
- [ ] Add `DELETE /quests/:id/collaborators/:targetUserId` endpoint
- [ ] Update `PATCH /quests/:id` — use `isQuestOwnerOrSponsor`, lock tasks on live, owner-only deadline extend
- [ ] Update `POST /quests/:id/publish` — gate on `totalFunded >= rewardAmount`
- [ ] Export `isQuestSponsor`, `isQuestOwnerOrSponsor`, `generateCollabToken` from service

## Success Criteria

- `POST /invite` returns valid collab URL, creates pending record
- `POST /collaborate` creates accepted record, deletes pending, rejects expired/used tokens
- `GET /collaborators` returns collaborators + deposit breakdown
- `DELETE /collaborators/:userId` owner-only, 403 for sponsor
- `PATCH` on live quest rejects task changes, allows owner deadline extension
- Publish fails if `totalFunded < rewardAmount`

## Security Considerations

- Token expiry checked server-side (not trust client)
- `DELETE` enforces `isOwner` not just `isAllowed`
- Max 5 sponsors enforced on both invite and accept (race condition: accept is definitive guard)
