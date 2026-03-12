# Quest Management Page Implementation Plan

**Status:** ✅ COMPLETED (2026-03-12)

## Overview
Implement sponsor-facing quest management interface with full CRUD operations and participant management.

## Scope
- **Route:** `/quests/:questId/manage`
- **Access:** Quest sponsors only (owner check required)
- **Features:** Status controls, metadata editing, funding panel, participant management

## Phase 1: Database Schema

### 1.1 Add Quest.sponsorId field
**File:** `/prisma/schema.prisma`

```prisma
model Quest {
  // ... existing fields
  sponsorId String? @db.Uuid  // Links to User.id
  sponsor   User?   @relation(fields: [sponsorId], references: [id], name: "SponsoredQuests")
}

model User {
  // ... existing fields
  sponsoredQuests Quest[] @relation(name: "SponsoredQuests")
}
```

### 1.2 Migration
```bash
pnpm prisma migrate dev --name add-quest-sponsor
```

## Phase 2: Backend API

**File:** `/apps/api/src/modules/quests/quests.routes.ts`

### 2.1 Update Quest Endpoint
```typescript
PATCH /quests/:id
- Auth: Required (Supabase JWT)
- Authorization: quest.sponsorId === req.user.id
- Body: { title?, description?, endDate?, rewardAmount?, ... }
- Response: Updated Quest
```

### 2.2 Publish Quest Endpoint
```typescript
POST /quests/:id/publish
- Auth: Required
- Authorization: Owner only
- Validation: Quest must be DRAFT, fully funded
- Action: Set status to ACTIVE
- Response: Updated Quest
```

### 2.3 Close Quest Endpoint
```typescript
POST /quests/:id/close
- Auth: Required
- Authorization: Owner only
- Validation: Quest must be ACTIVE or PAUSED
- Action: Set status to COMPLETED
- Response: Updated Quest
```

### 2.4 Verify Participation Endpoint
```typescript
POST /quests/:id/verify/:participationId
- Auth: Required
- Authorization: Owner only
- Validation: Participation exists, quest matches
- Action: Set participation.verified = true
- Response: Updated QuestParticipation
```

### 2.5 Payout Participation Endpoint
```typescript
POST /quests/:id/payout/:participationId
- Auth: Required
- Authorization: Owner only
- Validation: Participation verified, not already paid
- Action: Set participation.paidOut = true, create transaction
- Response: Updated QuestParticipation
```

## Phase 3: Frontend Component

**File:** `/apps/dashboard/src/routes/_authenticated/quests/$questId/manage.tsx`

### 3.1 Page Structure
```tsx
<div className="container mx-auto p-6">
  <QuestHeader quest={quest} />

  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    {/* Main content - 2 columns */}
    <div className="lg:col-span-2 space-y-6">
      <StatusControlPanel />
      <MetadataEditor />
      <ParticipantsTable />
    </div>

    {/* Sidebar - 1 column */}
    <div className="space-y-6">
      <FundingPanel />
      <QuestStats />
    </div>
  </div>
</div>
```

### 3.2 Components

#### StatusControlPanel
- Display current status badge
- Publish button (if DRAFT)
- Pause/Resume buttons (if ACTIVE)
- Close button (if ACTIVE/PAUSED)
- Status transition validation

#### MetadataEditor
- Inline editable fields: title, description, endDate
- Save button with loading state
- Cancel/reset functionality
- Validation feedback

#### FundingPanel
- Show funding status (funded amount / required amount)
- Progress bar
- "Fund with Crypto" CTA (links to funding flow)
- Display wallet address if funded

#### ParticipantsTable
- Columns: Agent/User, Platform, Task Status, Proof, Verified, Paid Out, Actions
- Actions: View Proof, Verify, Mark Paid
- Filters: All / Pending / Verified / Paid
- Pagination (10 per page)

### 3.3 Authorization Check
```tsx
const { user } = useAuth()
const isOwner = quest.sponsorId === user?.id

if (!isOwner) {
  return <Navigate to={`/quests/${questId}`} />
}
```

### 3.4 Data Fetching
```tsx
const { data: quest } = useQuery({
  queryKey: ['quest', questId],
  queryFn: () => fetchQuest(questId)
})

const { data: participants } = useQuery({
  queryKey: ['quest-participants', questId],
  queryFn: () => fetchQuestParticipants(questId)
})
```

### 3.5 Mutations
```tsx
const publishMutation = useMutation({
  mutationFn: (questId) => api.post(`/quests/${questId}/publish`),
  onSuccess: () => queryClient.invalidateQueries(['quest', questId])
})

const updateMutation = useMutation({
  mutationFn: (data) => api.patch(`/quests/${questId}`, data),
  onSuccess: () => queryClient.invalidateQueries(['quest', questId])
})
```

## Phase 4: Styling

**Approach:** Tailwind CSS v4 with shadcn/ui components

### 4.1 Layout Classes
- Container: `container mx-auto p-6`
- Grid: `grid grid-cols-1 lg:grid-cols-3 gap-6`
- Card: `rounded-lg border bg-card p-6`
- Mobile responsive: Stack columns at < 1024px

### 4.2 Component Variants (shadcn/ui)
- Button: `variant="default"`, `variant="destructive"`, `variant="outline"`
- Badge: Status badges for DRAFT/ACTIVE/COMPLETED
- Table: shadcn Table component
- Input: shadcn Input component
- Dialog: For confirmation modals

## Phase 5: Testing

### 5.1 Backend Tests
```bash
cd apps/api
pnpm test -- quests.routes.test.ts
```

Test cases:
- Update quest (owner only)
- Publish quest (validation)
- Close quest
- Verify participation
- Payout participation
- Authorization failures

### 5.2 Frontend Tests
- Component rendering
- Authorization redirect
- Mutation success/error states
- Table filtering/pagination

## Phase 6: Mobile Responsiveness

### Breakpoints
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

### Responsive Changes
- Stack sidebar below main content at < 1024px
- Table to card view at < 640px
- Collapsible metadata editor at < 640px
- Full-width buttons at < 640px

## Acceptance Criteria

- ✅ Route `/quests/:questId/manage` renders for quest owners
- ✅ Non-owners redirected to quest detail page (existing auth check)
- ✅ Can publish DRAFT quest (new endpoint + UI)
- ✅ Can close ACTIVE quest (new endpoint + UI)
- ✅ Can edit quest metadata via edit link (existing edit page)
- ✅ Funding panel shows accurate status (existing) + CTA added
- ✅ Participants table displays all participations (existing)
- ✅ Can verify participant submissions (existing)
- ✅ Can distribute payouts (existing)
- ✅ Mobile responsive (existing + new controls)
- ✅ All backend endpoints have auth + authorization
- ✅ Schema update completed (sponsorId field)

## Implementation Summary

**Phase 1: Database Schema** - ✅ COMPLETED
- Added `Quest.sponsorId UUID?` field
- Added relation to User model
- Prisma client regenerated (column already existed in DB)

**Phase 2: Backend API** - ✅ COMPLETED
- POST /quests/:id/publish - Publish draft to live
- POST /quests/:id/close - Close live quest to completed
- Both use `isQuestOwnerOrSponsor()` for authorization
- Validation via `validatePublishRequirements()`

**Phase 3: Frontend** - ✅ COMPLETED
- Enhanced existing manage.tsx page
- Added status controls panel with publish/close buttons
- Added funding requirement notice with CTA
- Added edit link for draft quests
- Used React Query mutations with proper error handling

**Test Results:** 120 tests passed, builds successful
**Code Review:** 8.5/10 (Production Ready)

## Implementation Order

1. Schema update + migration
2. Backend endpoints (one at a time, with tests)
3. Frontend components (stub UI first, then wire up)
4. Integration testing
5. Mobile responsive pass
6. Final review

## Files to Create/Modify

**New:**
- `/prisma/migrations/[timestamp]_add_quest_sponsor/migration.sql`
- `/apps/dashboard/src/routes/_authenticated/quests/$questId/manage.tsx`
- `/apps/dashboard/src/components/quest/StatusControlPanel.tsx`
- `/apps/dashboard/src/components/quest/MetadataEditor.tsx`
- `/apps/dashboard/src/components/quest/FundingPanel.tsx`
- `/apps/dashboard/src/components/quest/ParticipantsTable.tsx`

**Modified:**
- `/prisma/schema.prisma`
- `/apps/api/src/modules/quests/quests.routes.ts`
- `/apps/api/src/modules/quests/quests.service.ts`
