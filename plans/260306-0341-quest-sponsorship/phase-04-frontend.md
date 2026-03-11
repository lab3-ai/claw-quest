# Phase 04 — Frontend

**Priority:** P1
**Effort:** 3h
**Status:** completed
**Depends on:** Phase 02, Phase 03

## Context Links

- Fund page: `apps/dashboard/src/routes/_authenticated/quests/$questId/fund.tsx`
- Quest detail: `apps/dashboard/src/routes/_public/quests/detail.tsx`
- Dashboard: `apps/dashboard/src/routes/_authenticated/dashboard.tsx`
- Router: `apps/dashboard/src/router.tsx`
- Shared types: `packages/shared/src/index.ts`

## Overview

5 targeted changes: (1) fund page shows partial funding progress + invite link, (2) public quest detail shows "Sponsored by" line, (3) dashboard includes quests where user is sponsor, (4) new `/quests/:questId/join` route, (5) router registration.

## Related Code Files

**Modify:**
- `apps/dashboard/src/routes/_authenticated/quests/$questId/fund.tsx`
- `apps/dashboard/src/routes/_public/quests/detail.tsx`
- `apps/dashboard/src/routes/_authenticated/dashboard.tsx`
- `apps/dashboard/src/router.tsx`

**Create:**
- `apps/dashboard/src/routes/_public/quests/join.tsx`

## Implementation Steps

### 1. Fund Page — Partial Deposit + Invite Link

**File:** `apps/dashboard/src/routes/_authenticated/quests/$questId/fund.tsx`

**A. Fetch collaborators data** (new query, only shown to owner/sponsor):
```typescript
const { data: collabData } = useQuery({
  queryKey: ['quest-collaborators', questId],
  queryFn: () => api.get(`/quests/${questId}/collaborators`).then(r => r.data),
  enabled: !!user,
});
```

**B. Replace single funding check with `totalFunded` progress bar:**
```typescript
// Replace: fundingStatus === 'confirmed' check
// With: progress bar component
const totalFunded = collabData?.totalFunded ?? 0;
const rewardAmount = quest.rewardAmount ?? 0;
const fundingPct = rewardAmount > 0 ? Math.min(100, (totalFunded / rewardAmount) * 100) : 0;
const isFullyFunded = totalFunded >= rewardAmount;

// In JSX, below the deposit form:
<div className="mt-4 space-y-2">
  <div className="flex justify-between text-sm text-muted-foreground">
    <span>Funding progress</span>
    <span>{totalFunded} / {rewardAmount} {quest.rewardType}</span>
  </div>
  <div className="h-2 bg-muted rounded-full overflow-hidden">
    <div
      className="h-full bg-primary transition-all"
      style={{ width: `${fundingPct}%` }}
    />
  </div>
  {!isFullyFunded && (
    <p className="text-xs text-muted-foreground">
      {rewardAmount - totalFunded} {quest.rewardType} still needed to publish
    </p>
  )}
</div>
```

**C. Sponsor deposit amount** — show suggested amount (from `getDepositParams()` response), allow user to see it. The amount returned is already the full `rewardAmount` for sponsors (they can deposit any portion — but the contract requires a specific amount call). Keep existing flow: frontend calls the fund endpoint, gets `amount`, passes to wallet.

**D. Invite link section** — below fund button, shown to owner or accepted sponsor:
```typescript
// State for invite dialog
const [inviteOpen, setInviteOpen] = useState(false);
const [inviteUrl, setInviteUrl] = useState('');
const [inviteLoading, setInviteLoading] = useState(false);

const handleGenerateInvite = async () => {
  setInviteLoading(true);
  try {
    const res = await api.post(`/quests/${questId}/invite`);
    setInviteUrl(res.data.inviteUrl);
    setInviteOpen(true);
  } finally {
    setInviteLoading(false);
  }
};

// In JSX, below the fund button:
{isOwnerOrSponsor && (
  <div className="mt-4 pt-4 border-t">
    <button
      onClick={handleGenerateInvite}
      disabled={inviteLoading}
      className="text-sm text-muted-foreground hover:text-foreground underline"
    >
      Invite a co-sponsor
    </button>
  </div>
)}

// Dialog:
<Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Invite a Co-Sponsor</DialogTitle>
      <DialogDescription>
        Share this link. Expires in 7 days, single use.
      </DialogDescription>
    </DialogHeader>
    <div className="flex gap-2">
      <input
        readOnly value={inviteUrl}
        className="flex-1 text-sm bg-muted rounded px-3 py-2"
      />
      <Button size="sm" onClick={() => navigator.clipboard.writeText(inviteUrl)}>
        Copy
      </Button>
    </div>
  </DialogContent>
</Dialog>
```

**E. Determine `isOwnerOrSponsor`:**
```typescript
const isOwner = user?.id === quest.creatorUserId;
const isSponsor = collabData?.collaborators?.some(c => c.userId === user?.id) ?? false;
const isOwnerOrSponsor = isOwner || isSponsor;
```

### 2. Public Quest Detail — "Sponsored by" Line

**File:** `apps/dashboard/src/routes/_public/quests/detail.tsx`

The API's `GET /quests/:id` response already includes `sponsorNames` array (added to `QuestSchema` in Phase 01). If `sponsorNames.length > 0`, show the line below the quest title/sponsor field.

Locate where `quest.sponsor` is rendered and add below it:
```typescript
{quest.sponsorNames && quest.sponsorNames.length > 0 && (
  <p className="text-sm text-muted-foreground">
    Sponsored by{' '}
    {quest.sponsorNames.join(', ')}
  </p>
)}
```

**Backend update required:** `formatQuestResponse()` in `quests.service.ts` must populate `sponsorNames` from collaborators. Add to the `GET /quests/:id` handler:

```typescript
// In the GET /:id route, add collaborators include:
const quest = await server.prisma.quest.findUnique({
  where: { id },
  include: {
    collaborators: {
      where: { acceptedAt: { not: null } },
      include: { user: { select: { displayName: true, username: true } } },
    },
    // ...existing includes
  },
});
// Then in formatQuestResponse or inline:
const sponsorNames = quest.collaborators?.map(c =>
  c.user.displayName ?? c.user.username ?? 'Sponsor'
) ?? [];
```

Pass `sponsorNames` into `formatQuestResponse()` or spread it onto the response directly.

### 3. Dashboard — Include Sponsored Quests

**File:** `apps/dashboard/src/routes/_authenticated/dashboard.tsx`

The dashboard fetches `GET /quests/mine` (or equivalent). Extend that query to include quests where the user is an accepted sponsor.

**Backend change** — update `GET /quests/mine` endpoint (in `quests.routes.ts`):
```typescript
// Current: where: { creatorUserId: userId }
// New: fetch collaborations too
const [ownedQuests, sponsoredCollabs] = await Promise.all([
  server.prisma.quest.findMany({ where: { creatorUserId: userId }, ... }),
  server.prisma.questCollaborator.findMany({
    where: { userId, acceptedAt: { not: null } },
    include: { quest: { include: { /* same includes */ } } },
  }),
]);
const sponsoredQuests = sponsoredCollabs.map(c => c.quest);
const allQuests = [...ownedQuests, ...sponsoredQuests];
// Deduplicate by id (edge case: owner who was also added as collab)
const unique = Array.from(new Map(allQuests.map(q => [q.id, q])).values());
```

**Frontend:** No change needed if the API returns the merged list. Optionally add a visual indicator (e.g. "Co-sponsor" badge) on quest cards where `quest.creatorUserId !== user.id`:
```typescript
{quest.creatorUserId !== user?.id && (
  <span className="text-xs bg-secondary text-secondary-foreground rounded px-1.5 py-0.5">
    Co-sponsor
  </span>
)}
```

### 4. New Join Page

**File:** `apps/dashboard/src/routes/_public/quests/join.tsx`

```typescript
import { useEffect, useState } from 'react';
import { useSearch, useNavigate, useParams } from '@tanstack/react-router';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

export default function QuestJoinPage() {
  const { questId } = useParams({ from: '/quests/$questId/join' });
  const { token } = useSearch({ from: '/quests/$questId/join' });
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'idle' | 'accepting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      // Redirect to login, preserve token in state for post-auth redirect
      navigate({ to: '/login', search: { redirect: `/quests/${questId}/join?token=${token}` } });
      return;
    }
    if (status !== 'idle') return;

    setStatus('accepting');
    api.post(`/quests/${questId}/collaborate`, { token })
      .then(() => {
        setStatus('success');
        setTimeout(() => navigate({ to: `/quests/${questId}/fund` }), 1500);
      })
      .catch(err => {
        setStatus('error');
        setErrorMsg(err.response?.data?.error?.message ?? 'Failed to accept invite');
      });
  }, [user, isLoading]);

  if (isLoading || status === 'idle' || status === 'accepting') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Accepting invite...</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-foreground">You're now a co-sponsor. Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <p className="text-destructive">{errorMsg}</p>
      <a href="/quests" className="text-sm text-muted-foreground underline">Browse quests</a>
    </div>
  );
}
```

### 5. Register Join Route in Router

**File:** `apps/dashboard/src/router.tsx`

TanStack Router uses file-based routing. Create the file at the correct path under `_public`:

Route file path: `apps/dashboard/src/routes/_public/quests/$questId/join.tsx`

If using `createFileRoute`:
```typescript
// At top of join.tsx:
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

export const Route = createFileRoute('/_public/quests/$questId/join')({
  validateSearch: z.object({ token: z.string() }),
  component: QuestJoinPage,
});
```

No manual entry in `router.tsx` needed — TanStack Router auto-registers file-based routes.

## Todo Checklist

- [ ] Fund page: add `useQuery` for `/quests/:id/collaborators`
- [ ] Fund page: replace funding check with `totalFunded` progress bar
- [ ] Fund page: add `isOwnerOrSponsor` derivation
- [ ] Fund page: add "Invite a co-sponsor" button + Dialog with copy link
- [ ] Quest detail: render `sponsorNames` as "Sponsored by Alice, Bob" if present
- [ ] Backend: include collaborators in `GET /quests/:id` response, populate `sponsorNames`
- [ ] Backend: update `GET /quests/mine` to include sponsored quests
- [ ] Dashboard: show "Co-sponsor" badge on non-owned quest cards
- [ ] Create `apps/dashboard/src/routes/_public/quests/$questId/join.tsx`
- [ ] Join page: handle auth redirect, accept invite, redirect to fund page
- [ ] Verify TanStack Router picks up new route (run `pnpm --filter dashboard dev` and check)

## Success Criteria

- Fund page shows progress bar with `totalFunded / rewardAmount`
- "Invite a co-sponsor" link visible to owner and sponsors, hidden from strangers
- Clicking invite generates link, opens dialog with copy button
- `/quests/:id/join?token=collab_xxx` — unauthenticated user redirected to login then back
- After accepting, user sees quest in My Quests with "Co-sponsor" badge
- Public quest detail shows "Sponsored by Alice, Bob" when collaborators exist
- Expired / used token shows clear error message on join page

## Security Considerations

- Token passed as URL search param — acceptable for short-lived invite links (7-day expiry)
- Join page calls POST (state-changing) only after user is authenticated
- No sensitive data on join page — just success/error state
