# Task 1 — Frontend UI/UX Polish & Remaining Pages
> Priority order: Agent Detail → Quest Manage → Toast → Auth polish → Mobile

---

## Context
Stack: React 18 + TanStack Router + TanStack Query + plain CSS (no Tailwind).
Auth: `useAuth()` from `@/context/AuthContext` → `{ session, user, isAuthenticated }`.
API base: `const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000"`.
Design refs: `design-backup/dashboard.html` (agent detail section).
All shared CSS already imported in `main.tsx`. Page CSS imported in component file.
Use `PlatformIcon` from `@/components/PlatformIcon` for brand icons.

---

## 1. Agent Detail Page `/agents/:agentId`

**Route**: `src/routes/_authenticated/agents/[agentId].tsx`
Add to `router.tsx`:
```ts
{ path: '/agents/$agentId', component: AgentDetail }
```

**Layout** (2-column: main + 280px sidebar):
```
┌─────────────────────────────┬───────────────┐
│ Agent name + status badge   │ Stats sidebar │
│ Platform + created date     │ Quests done   │
│                             │ Total earned  │
├─────────────────────────────┤ Active quest  │
│ Active Quest card (if any)  │               │
│ progress bar + task list    │               │
├─────────────────────────────┤               │
│ Activity Log                │               │
│ (AgentLog entries, reverse) │               │
└─────────────────────────────┴───────────────┘
```

**API calls**:
- `GET /agents/:id` → agent detail
- `GET /agents/:id/logs` (needs backend addition — see below)

**Backend addition needed** in `agents.routes.ts`:
```ts
GET /agents/:id/logs → AgentLog[] (auth, must own agent)
```

**Key components**:
- `<StatusBadge status="idle|questing|offline" />`
- `<ActivityLog logs={AgentLog[]} />`
- Progress bar: `tasksCompleted / tasksTotal`

---

## 2. Quest Manage Page `/quests/:questId/manage`

**Route**: `src/routes/_authenticated/quests/manage.tsx`
Only accessible to quest creator (check `quest.sponsorId === user.id` — needs schema update).

**Sections**:
1. **Quest Status control**: draft → live → completed (button `Publish`, `Close`)
2. **Funding panel**: show required amount, "Fund with Crypto" CTA
3. **Edit metadata**: title, description, end date
4. **Participants table**: same as questers page but with operator actions (verify proof, mark paid)

**Backend additions needed**:
```ts
PATCH /quests/:id          → update quest (auth, owner only)
POST  /quests/:id/publish  → status: draft → live
POST  /quests/:id/close    → status: live → completed
POST  /quests/:id/verify/:participationId  → mark task verified
POST  /quests/:id/payout/:participationId  → trigger payout
```

**Schema addition**: `Quest.sponsorId String?` linking to `User.id`

---

## 3. Global Toast Notifications

**File**: `src/components/Toast.tsx` + `src/context/ToastContext.tsx`

**API**:
```tsx
const { toast } = useToast()
toast.success("Quest created!")
toast.error("Something went wrong")
toast.info("...")
```

**Implementation**:
- Context with `toasts: Toast[]` state + `addToast` / `removeToast`
- Toast component: fixed position bottom-right, auto-dismiss 3s
- CSS: slide-in animation, color variants (success=green, error=red, info=blue)
- Wrap `<App>` in `<ToastProvider>` in `main.tsx`

---

## 4. Auth Pages Polish

Files: `src/routes/login.tsx`, `src/routes/register.tsx`

**Improvements**:
- Center card layout (max-width 400px)
- Logo / brand header
- Field validation feedback (red border + hint text)
- Loading spinner on submit button
- Error message display from API response
- "Already have an account? Login" link

---

## 5. Mobile Responsive Pass

Target breakpoints: 768px (tablet), 480px (mobile).

Key changes:
- `quest-detail.tsx`: stack 2-column to single column at 768px
- `dashboard.tsx`: collapse agent table to cards at 480px
- `create.tsx`: wizard full width, hide preview sidebar at 768px (show at step review only)
- Nav: hamburger menu at 480px

---

## CSS Conventions (Important)
- No Tailwind. Use CSS custom properties from design system.
- Variables: `--fg`, `--fg-muted`, `--border`, `--border-heavy`, `--link`, `--accent`, `--sidebar-bg`
- Shared classes: `.badge-live`, `.badge-draft`, `.badge-fcfs`, `.badge-leaderboard`, `.badge-luckydraw`
- Page-specific CSS goes in `src/styles/pages/[page-name].css` and import at top of component file
