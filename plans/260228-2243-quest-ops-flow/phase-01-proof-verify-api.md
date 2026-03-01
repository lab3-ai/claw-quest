# Phase 1: Proof Verification API

## Overview
- **Priority:** P1
- **Status:** Completed
- **Effort:** 3h
- Add endpoints for creator/admin to approve/reject agent-submitted proofs

## Key Insights
- Proof submit already sets `QuestParticipation.status = "submitted"` and stores `proof` JSON
- Need new status values: `verified`, `rejected` (in addition to existing `in_progress`, `submitted`, `completed`, `failed`)
- Creator auth: check `quest.creatorUserId === user.id`
- Admin auth: reuse existing `requireAdmin` middleware
- Distribute endpoint already requires admin — need to also allow creator

## Requirements

### Functional
- Single verify: approve/reject one participation
- Bulk verify: approve/reject multiple participations at once
- Creator OR admin can verify
- Rejection needs a `reason` field
- Creator OR admin can trigger distribute/refund (not just admin)

### Non-functional
- No N+1 queries in bulk verify
- Consistent with existing API patterns (Zod schemas, error handling)

## Related Code Files

### Modify
- `apps/api/src/modules/quests/quests.routes.ts` — add verify endpoints
- `apps/api/src/modules/quests/quests.service.ts` — add verify logic
- `apps/api/src/modules/escrow/escrow.routes.ts` — relax auth for distribute/refund (creator OR admin)

### No New Files
- All logic fits in existing quest module

## Architecture

```
Agent submits proof → status="submitted"
                          ↓
Creator/Admin reviews → POST /quests/:id/participations/:pid/verify
                          ↓
         ┌─ action="approve" → status="verified"
         └─ action="reject"  → status="rejected" + reason
                          ↓
All verified → Creator triggers distribute → on-chain payout
```

## Implementation Steps

### 1. Add verify service function
In `quests.service.ts`:

```typescript
export async function verifyParticipation(
  prisma: PrismaClient,
  questId: string,
  participationId: string,
  action: 'approve' | 'reject',
  verifierId: string,
  reason?: string,
): Promise<QuestParticipation> {
  // 1. Find participation, check questId matches
  // 2. Check status === 'submitted' (can only verify submitted proofs)
  // 3. Update status to 'verified' or 'rejected'
  // 4. If rejected, store reason in proof JSON
  // 5. Return updated participation
}
```

### 2. Add bulk verify service function
```typescript
export async function bulkVerifyParticipations(
  prisma: PrismaClient,
  questId: string,
  items: Array<{ participationId: string; action: 'approve' | 'reject'; reason?: string }>,
  verifierId: string,
): Promise<{ updated: number; errors: string[] }>
```

### 3. Add auth helper: isQuestCreatorOrAdmin
```typescript
// In quests.service.ts or as inline check
// Returns true if user is quest creator OR has admin role
```

### 4. Add verify routes in quests.routes.ts

**Single verify:**
```
POST /quests/:id/participations/:pid/verify
Body: { action: "approve" | "reject", reason?: string }
Auth: creator (creatorUserId) OR admin
Response: { message, participation: { id, status, ... } }
```

**Bulk verify:**
```
POST /quests/:id/participations/verify-bulk
Body: { items: [{ participationId, action, reason? }] }
Auth: creator OR admin
Response: { updated: number, errors: string[] }
```

### 5. Relax escrow distribute/refund auth
Currently: `onRequest: [server.authenticate, requireAdmin]`
Change to: `onRequest: [server.authenticate]` + inline check for creator OR admin

In the route handler:
```typescript
const quest = await server.prisma.quest.findUnique({ where: { id: questId } });
const isCreator = quest.creatorUserId === request.user.id;
const isAdmin = request.user.role === 'admin';
if (!isCreator && !isAdmin) return reply.status(403).send({ message: 'Forbidden' });
```

### 6. Add quest summary endpoint for manage page
```
GET /quests/:id/manage-summary
Auth: creator OR admin
Response: quest + participations with proof + escrow status
```
Combines data needed for manage page in single call to reduce frontend requests.

## Todo List

- [x] Add `verifyParticipation()` in quests.service.ts
- [x] Add `bulkVerifyParticipations()` in quests.service.ts
- [x] Add `isQuestCreatorOrAdmin()` helper
- [x] Add `POST /quests/:id/participations/:pid/verify` route
- [x] Add `POST /quests/:id/participations/verify-bulk` route
- [x] Add `GET /quests/:id/manage-summary` route
- [x] Relax distribute auth to creator OR admin
- [x] Relax refund auth to creator OR admin
- [x] Compile check: `pnpm --filter api build`

## Success Criteria
- Creator can approve/reject submitted proofs via API
- Admin can approve/reject submitted proofs via API
- Creator can trigger distribute/refund (not just admin)
- Bulk verify works for multiple participations
- Existing tests still pass

## Risk Assessment
- **Double verify:** Mitigate by checking `status === 'submitted'` before allowing verify
- **Creator impersonation:** Mitigate by checking `creatorUserId` against authenticated user
- **Relaxing auth on escrow:** Mitigate with explicit creator check, not just "any authenticated user"

## Security Considerations
- Only quest creator or admin can verify — never other users
- Reject reason stored for audit trail
- Escrow actions still require funding confirmation check
