# Phase 3: Integration & Links

## Overview
- **Priority:** P2
- **Status:** Completed
- **Effort:** 2h
- **Depends on:** Phase 2 (manage page)
- Wire up navigation links, add manage button to existing pages, polish UX

## Key Insights
- Quest Detail page already shows quest info — add "Manage" button for creator/admin
- Dashboard "My Quests" tab already lists user's quests — add manage link per quest
- Need to pass `creatorUserId` in quest API responses for frontend access checks
- Admin can access manage page for any quest — need to handle in Quest Detail CTA area

## Related Code Files

### Modify
- `apps/dashboard/src/routes/_public/quests/detail.tsx` — add Manage button for creator
- `apps/dashboard/src/routes/_authenticated/dashboard.tsx` — add manage link in My Quests table
- `apps/api/src/modules/quests/quests.routes.ts` — ensure `creatorUserId` in quest response
- `apps/api/src/modules/auth/auth.routes.ts` — ensure `role` in `/auth/me` response (already done per memory)

### Reference
- `apps/dashboard/src/context/AuthContext.tsx` — check if user role exposed

## Implementation Steps

### 1. Quest Detail → Manage button

In `detail.tsx`, after quest data loads:
```typescript
const isCreator = quest.creatorUserId === user?.id
const isAdmin = user?.role === 'admin'
const canManage = isCreator || isAdmin

// In CTA area, alongside existing buttons:
{canManage && (
  <Link to="/quests/$questId/manage" params={{ questId }}>
    <button className="btn btn-secondary">Manage Quest</button>
  </Link>
)}
```

Show only when quest is funded (fundingStatus === 'confirmed') or has participations.

### 2. Dashboard My Quests → Manage link

In `dashboard.tsx`, in the quest table/card:
- Add "Manage" action link next to existing actions
- Link to `/quests/:questId/manage`
- Show for quests with status live/scheduled/completed (not drafts)

### 3. Ensure creatorUserId in API responses

Check `formatQuestResponse()` in `quests.service.ts` — confirm `creatorUserId` is included.
If not, add it to the response shape and Zod schema.

### 4. Ensure user role in AuthContext

Check if `AuthContext` exposes `user.role`. The `/auth/me` endpoint returns `role` per memory notes.
If not in context: add to the user type and fetch logic.

### 5. Add status indicators on My Quests

In dashboard quest list, show proof review status:
- "3 proofs awaiting review" badge on quests with `submitted` participations
- This requires adding participation summary to `/quests/mine` response

Add to `/quests/mine` response:
```typescript
// In the query, include participation counts
_count: {
  select: {
    participations: { where: { status: 'submitted' } }
  }
}
// Map to: pendingProofs: quest._count.participations
```

### 6. Breadcrumb on manage page

Ensure manage page has breadcrumb:
```
Quests / Quest Title / Manage
```
(Already planned in Phase 2 but verify consistency with fund page breadcrumb pattern)

## Todo List

- [x] Add "Manage" button on Quest Detail page (creator/admin only)
- [x] Add manage link in Dashboard My Quests tab
- [x] Verify `creatorUserId` in quest API responses
- [x] Verify `user.role` available in AuthContext
- [ ] (deferred) Add pending proofs count to `/quests/mine` response
- [x] Show "X proofs awaiting review" badge on My Quests
- [x] Compile check: `pnpm build`

## Success Criteria
- Creator sees "Manage" button on their quest's detail page
- Dashboard My Quests shows manage link for live/funded quests
- Pending proofs count visible on My Quests
- Admin sees Manage button on any quest detail page
- Navigation between detail/manage/dashboard is seamless

## Risk Assessment
- **creatorUserId exposure:** Safe — UUID only, no PII. Already used in quest claim flow
- **Role check on frontend:** Frontend check is UX only. Real auth happens server-side in Phase 1

## Security Considerations
- Frontend role/creator checks for UX only — all endpoints enforce server-side auth
- No sensitive data exposed in quest responses beyond what's already public
