# Phase 2: Quest Manage Page

## Overview
- **Priority:** P1
- **Status:** Completed
- **Effort:** 5h
- **Depends on:** Phase 1 (verify API)
- New dashboard page `/quests/:questId/manage` for creator/admin to manage quest lifecycle

## Key Insights
- Follow existing dashboard patterns: TanStack Query for data, plain CSS with design system vars
- Page-specific CSS in `src/styles/pages/quest-manage.css`
- Reuse existing components: badge, button, card from `src/components/ui/`
- Route at `_authenticated/quests/$questId/manage.tsx`
- Access check: creator (creatorUserId) OR admin (role === 'admin')

## Requirements

### Functional
- Overview section: quest info, status, funding status
- Participants table: agent name, status, proof details, verify actions
- Escrow panel: on-chain status (deposited, distributed, refunded, remaining)
- Actions: distribute payout, refund, change status
- Inline proof review with approve/reject buttons

### Non-functional
- Responsive (but desktop-first — admin tool)
- Loading states for all async actions
- Error handling with user-friendly messages
- Optimistic UI not needed — refetch after mutations

## Related Code Files

### Create
- `apps/dashboard/src/routes/_authenticated/quests/$questId/manage.tsx` — main page
- `apps/dashboard/src/styles/pages/quest-manage.css` — page styles

### Modify
- `apps/dashboard/src/router.tsx` — register new route (if not file-based auto)

### Reference (read-only)
- `apps/dashboard/src/routes/_authenticated/quests/$questId/fund.tsx` — pattern reference
- `apps/dashboard/src/routes/_public/quests/detail.tsx` — quest detail pattern
- `apps/dashboard/src/routes/_public/quests/questers.tsx` — table pattern

## Architecture

```
┌─────────────────────────────────────────────────┐
│ Quest Manage Page                               │
│                                                 │
│  ┌──────────────────────┐ ┌──────────────────┐  │
│  │ Quest Overview       │ │ Escrow Status    │  │
│  │ title, type, status  │ │ deposited        │  │
│  │ reward, slots        │ │ distributed      │  │
│  │ funding status       │ │ remaining        │  │
│  └──────────────────────┘ │ refunded         │  │
│                           └──────────────────┘  │
│                                                 │
│  ┌──────────────────────────────────────────┐   │
│  │ Participants & Proofs                    │   │
│  │ ┌──────┬────────┬────────┬────────────┐  │   │
│  │ │Agent │Status  │Proof   │Actions     │  │   │
│  │ │name  │badge   │details │approve/rej │  │   │
│  │ └──────┴────────┴────────┴────────────┘  │   │
│  └──────────────────────────────────────────┘   │
│                                                 │
│  ┌──────────────────────────────────────────┐   │
│  │ Actions                                  │   │
│  │ [Distribute Payout] [Refund] [Cancel]    │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

## Implementation Steps

### 1. Create route file `manage.tsx`

```typescript
// apps/dashboard/src/routes/_authenticated/quests/$questId/manage.tsx
import { useParams } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import '@/styles/pages/quest-manage.css'
```

### 2. Data fetching

Use `GET /quests/:id/manage-summary` (from Phase 1):
```typescript
const { data, isLoading } = useQuery({
  queryKey: ['quest-manage', questId],
  queryFn: () => fetchWithAuth(`/quests/${questId}/manage-summary`),
})
```

Escrow status (separate, may fail if not on-chain):
```typescript
const { data: escrow } = useQuery({
  queryKey: ['escrow-status', questId],
  queryFn: () => fetch(`${API_BASE}/escrow/status/${questId}`).then(r => r.ok ? r.json() : null),
  enabled: !!data?.quest?.cryptoChainId,
})
```

### 3. Quest Overview section

Display: title, type badge, status badge, reward, slots (filled/total), funding status, dates.
Reuse badge styles from existing CSS.

### 4. Participants & Proofs table

Columns: Agent Name, Status (badge), Tasks Completed, Proof Details, Actions

Status badge colors:
- `in_progress` → blue
- `submitted` → yellow (awaiting review)
- `verified` → green
- `rejected` → red
- `completed` → green (paid)

Proof details: expandable row or inline display showing proof JSON.

Actions column:
- `submitted` → [Approve] [Reject] buttons
- `verified` → "Verified ✓" text
- `rejected` → "Rejected" + reason text
- Other → no actions

### 5. Verify mutations

```typescript
const verifyMutation = useMutation({
  mutationFn: ({ pid, action, reason }) =>
    fetchWithAuth(`/quests/${questId}/participations/${pid}/verify`, {
      method: 'POST',
      body: JSON.stringify({ action, reason }),
    }),
  onSuccess: () => queryClient.invalidateQueries(['quest-manage', questId]),
})
```

Reject needs a reason — show small input/modal when clicking Reject.

### 6. Escrow Status panel

Show: deposited, distributed, refunded, remaining (human-readable amounts)
Show token symbol and chain name.
If no escrow data: "No on-chain escrow found" message.

### 7. Action buttons

**Distribute Payout:**
- Enabled when: fundingStatus === 'confirmed' AND at least 1 verified participation
- Confirmation dialog: "Distribute X USDC to Y participants?"
- Calls `POST /escrow/distribute/:questId` with auth header
- Show tx hash link on success

**Refund:**
- Enabled when: fundingStatus === 'confirmed'
- Confirmation dialog: "Refund remaining funds to sponsor wallet?"
- Calls `POST /escrow/refund/:questId` with auth header
- Show tx hash link on success

**Cancel Quest:**
- Calls `PATCH /quests/:id/status` with `{ status: 'cancelled' }`
- Only for non-funded quests

### 8. Access guard

At top of component, after data loads:
```typescript
const canManage = quest.creatorUserId === user?.id || user?.role === 'admin'
if (!canManage) return <div>You don't have permission to manage this quest.</div>
```

### 9. Create CSS file

`apps/dashboard/src/styles/pages/quest-manage.css`

Follow existing patterns:
- `.manage-page` container
- `.manage-overview`, `.manage-escrow`, `.manage-participants`, `.manage-actions` sections
- Use design system vars: `--fg`, `--fg-muted`, `--border`, `--accent`
- Table styles consistent with questers page

## Todo List

- [x] Create `manage.tsx` route file with basic structure
- [x] Implement quest overview section
- [x] Implement participants & proofs table
- [x] Implement verify approve/reject with mutations
- [x] Implement reject reason input
- [x] Implement escrow status panel
- [x] Implement distribute action with confirmation
- [x] Implement refund action with confirmation
- [x] Implement access guard (creator OR admin)
- [x] Create `quest-manage.css` with page styles
- [x] Compile check: `pnpm --filter dashboard build`

## Success Criteria
- Creator sees manage page with all quest data
- Creator can approve/reject proofs inline
- Creator can trigger distribute with confirmation
- Creator can trigger refund with confirmation
- Escrow on-chain data displays correctly
- Page handles loading/error states
- Admin can access any quest manage page

## Risk Assessment
- **Large component:** Keep under 200 lines by extracting sections into local components within file
- **Escrow call fails:** Handle gracefully — show error, don't crash page
- **Race condition on verify+distribute:** Distribute checks for verified participants server-side

## Security Considerations
- Access guard prevents unauthorized users from seeing manage page
- All mutations use authenticated API calls
- Confirmation dialogs prevent accidental distribute/refund
