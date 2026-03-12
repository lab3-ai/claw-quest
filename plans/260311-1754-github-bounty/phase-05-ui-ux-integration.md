# Phase 5 — Frontend UI/UX Integration

**Status:** pending | **Blocked by:** Phase 4 ✅
**Branch:** github | **Date:** 2026-03-11
**Context:** Session brainstorm → GitHub Bounty must be a separate product identity from Quests.
Key principle: developer-focused UX, NOT mixed with quest flow.

---

## Current State (Phase 4 skeleton)

All routes registered in `router.tsx` ✅. Files exist but UI/UX gaps:

| Gap | File | Severity |
|-----|------|----------|
| No "Bounties" nav item in header | `_public.tsx` | 🔴 blocking |
| No status filter on explore | `index.tsx` | 🟡 |
| No language badge / GitHub icon on cards | `index.tsx` | 🟡 |
| Submissions hidden from non-creators | `detail.tsx` | 🟡 |
| "Connect GitHub" is tiny inline text | `detail.tsx` | 🟡 |
| No sidebar layout on detail | `detail.tsx` | 🟡 |
| No GitHub Connect screen in wizard | `new.tsx` | 🔴 UX broken |
| No success/confirmation screen after publish | `new.tsx` | 🟡 |
| Mine page has no "My Submissions" tab | `mine.tsx` | 🟡 |
| No GitHub identity status in Account | `account.tsx` | 🟡 |

---

## Implementation Steps

### Step 1 — Nav: Add "Bounties" tab

**File:** `apps/dashboard/src/routes/_public.tsx`

Add "Bounties" link alongside "Quests" in both desktop nav and mobile Sheet nav:

```tsx
// Desktop nav (after Quests link)
<Link
  to="/github-bounties"
  className="px-0 py-1.5 text-sm text-muted-foreground no-underline hover:text-foreground [&.active]:font-semibold [&.active]:text-foreground [&.active]:border-b-2 [&.active]:border-foreground"
>
  Bounties
</Link>

// Mobile Sheet nav (after Quests link)
<Link to="/github-bounties" onClick={() => setMobileOpen(false)} ...>
  Bounties
</Link>
```

"+ Create Quest" button in header stays as-is (quest-only). When user is on `/github-bounties/*`, the "Create Bounty" CTA lives inside the explore page header.

---

### Step 2 — Explore page improvements

**File:** `apps/dashboard/src/routes/_public/github-bounties/index.tsx`

**2a. Add status filter tabs** (before rewardType pills):

```
[Open] [In Review] [Completed] [All]   |   USDC · LLM Key · USD
```

- "Open" = `status=live AND submissions.count=0`
- "In Review" = `status=live AND submissions.count>0`
- API already supports `?status=` filter

**2b. Upgrade bounty card** — add GitHub icon + language badge:

```
┌──────────────────────────────────────────────────┐
│ [GH icon] facebook/react          [TS]  [hard]   │
│                                                   │
│  Fix memory leak in Fiber reconciler              │
│                                                   │
│  💰 500 USDC · 2 submissions · closes in 5d      │
└──────────────────────────────────────────────────┘
```

- Repo name: `font-mono text-xs` with GitHub Octocat SVG icon (inline, ~14px)
- Language badge: from API response `bounty.language` field (if available) — skip if null
- Difficulty chip derived from reward amount (current logic OK, keep)
- Add `issueUrl` link shown as `#123` chip on card

**2c. Empty state with better CTA:**

```tsx
<div className="text-center py-16 space-y-3">
  <p className="text-sm text-muted-foreground">No bounties yet.</p>
  <Button asChild size="sm">
    <Link to="/github-bounties/new">Post the first bounty</Link>
  </Button>
</div>
```

---

### Step 3 — Detail page improvements

**File:** `apps/dashboard/src/routes/_public/github-bounties/detail.tsx`

**3a. Two-column layout** (desktop: left 2/3 + right sticky sidebar 1/3):

```tsx
<div className="max-w-4xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
  {/* Left: header + description + submissions */}
  <div>...</div>
  {/* Right sidebar: reward + CTA */}
  <div className="lg:sticky lg:top-24 h-fit space-y-4">...</div>
</div>
```

Sidebar content:
- Big reward amount (like quest detail page: `text-4xl font-bold text-primary`)
- Status badge
- Deadline countdown (if set)
- "Submit PR" CTA (or "Connect GitHub" button if no GitHub account)
- `{maxWinners} winner{s}` + `{questType}` info

**3b. Submissions visible to everyone** (remove `enabled: isCreator` guard from non-approval query):

- Public view: shows `@githubHandle · PR #123 · pending/approved`
- Creator view: same list + approve/reject buttons
- This creates visible competition (like "X questers joined")

**3c. "Connect GitHub" as prominent banner** (not inline text):

```tsx
{isAuthenticated && !user.hasGithubToken && !isCreator && isLive && (
  <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-center space-y-2 mb-6">
    <p className="text-sm font-medium">Connect GitHub to submit a PR</p>
    <p className="text-xs text-muted-foreground">We verify you're the PR author</p>
    <Button size="sm" onClick={() => triggerGitHubOAuth("read:user")}>
      Connect GitHub
    </Button>
  </div>
)}
```

Note: need `hasGithubToken` from `useAuth()` — check if `/auth/me` already returns this field (similar to `hasXToken`). If not, add to auth context.

---

### Step 4 — Create wizard: GitHub Connect screen + success screen

**File:** `apps/dashboard/src/routes/_authenticated/github-bounties/new.tsx`

**4a. Replace raw `window.location.href` redirect with inline "Connect GitHub" state:**

Instead of immediately redirecting when `needsGithubAuth`, show an intermediate screen inside the wizard card:

```tsx
// New state: "needs_github_auth"
{wizardState === "needs_github_auth" && (
  <div className="text-center space-y-4 py-4">
    <div className="text-4xl">🐙</div>
    <p className="text-sm font-medium">Connect GitHub to analyze private repos</p>
    <p className="text-xs text-muted-foreground">
      This repo requires access. Public repos don't need this.
    </p>
    <Button onClick={handleGitHubOAuth}>Connect GitHub</Button>
    <button onClick={() => setWizardState("repo")} className="text-xs text-muted-foreground underline block">
      Use a different repo
    </button>
  </div>
)}
```

**4b. Add publish success screen** (step 4, after step 3 Publish):

```tsx
{step === 3 && publishedIds.length > 0 && (
  <div className="text-center space-y-4 py-4">
    <div className="text-4xl">🎉</div>
    <p className="text-sm font-semibold">
      {publishedIds.length} bounty{publishedIds.length !== 1 ? "ies" : ""} published!
    </p>
    <p className="text-xs text-muted-foreground">
      LLM Key bounties are live now. Paid bounties need funding.
    </p>
    <div className="flex gap-2 justify-center">
      <Button size="sm" asChild>
        <Link to="/github-bounties/mine">Manage Bounties</Link>
      </Button>
      <Button size="sm" variant="outline" asChild>
        <Link to="/github-bounties">Explore</Link>
      </Button>
    </div>
  </div>
)}
```

---

### Step 5 — Mine page: add "My Submissions" tab

**File:** `apps/dashboard/src/routes/_authenticated/github-bounties/mine.tsx`

Add 2 tabs: **Created** (current content) and **Submitted** (PRs submitted by this user):

```tsx
const [tab, setTab] = useState<"created" | "submitted">("created")
```

"Submitted" tab fetches `GET /github-bounties/my-submissions` → shows:
- Bounty title (link to detail)
- PR number (link to GitHub)
- Status badge: pending / approved / rejected
- Reward if approved

Tab switcher pattern (same as Dashboard tabs):
```tsx
<div className="flex gap-1 border-b border-border mb-6">
  {["created", "submitted"].map(t => (
    <button key={t} onClick={() => setTab(t as typeof tab)}
      className={cn("px-4 py-2 text-sm capitalize", tab === t ? "border-b-2 border-foreground font-medium" : "text-muted-foreground")}>
      {t}
    </button>
  ))}
</div>
```

---

### Step 6 — Account page: GitHub connection status

**File:** `apps/dashboard/src/routes/_authenticated/account.tsx`

Add "Connected Accounts" section (below existing OAuth providers). GitHub entry:

```tsx
<div className="flex items-center justify-between py-3 border-b border-border">
  <div className="flex items-center gap-3">
    <GithubSvgIcon size={20} />
    <div>
      <p className="text-sm font-medium">GitHub</p>
      {user.githubHandle
        ? <p className="text-xs text-muted-foreground">@{user.githubHandle}</p>
        : <p className="text-xs text-muted-foreground">Not connected</p>
      }
    </div>
  </div>
  {user.githubHandle
    ? <Badge variant="outline" className="text-xs text-green-400 border-green-500/30">Connected</Badge>
    : <Button size="sm" variant="outline" onClick={connectGitHub}>Connect</Button>
  }
</div>
```

`user.githubHandle` from `useAuth()` — check if `/auth/me` returns this; if not, add it.

---

## Files Modified

| File | Change |
|------|--------|
| `apps/dashboard/src/routes/_public.tsx` | Add "Bounties" nav link (desktop + mobile) |
| `apps/dashboard/src/routes/_public/github-bounties/index.tsx` | Status filter, card upgrade |
| `apps/dashboard/src/routes/_public/github-bounties/detail.tsx` | 2-col layout, public submissions, GitHub Connect banner |
| `apps/dashboard/src/routes/_authenticated/github-bounties/new.tsx` | GitHub Connect screen, success screen |
| `apps/dashboard/src/routes/_authenticated/github-bounties/mine.tsx` | Two tabs: Created + Submitted |
| `apps/dashboard/src/routes/_authenticated/account.tsx` | GitHub connection section |
| `apps/api/src/modules/auth/auth.routes.ts` | Confirm `/auth/me` returns `githubHandle` |

---

## API Checks Required

Before implementing, verify these endpoints exist:

- [ ] `GET /github-bounties?status=live&rewardType=USDC` — status filter support
- [ ] `GET /github-bounties/:id/submissions` — public (no auth) — currently requires auth?
- [ ] `GET /github-bounties/my-submissions` — new endpoint for "Submitted" tab
- [ ] `/auth/me` returns `githubHandle` field

If missing, add minimal API changes first (see notes in each step).

---

## Todo

- [x] Step 1: Add "Bounties" nav link to `_public.tsx`
- [x] Step 2: Upgrade explore page (status filter + card design)
- [x] Step 3: Upgrade detail page (2-col layout + public submissions + GitHub Connect banner)
- [x] Step 4: Add GitHub Connect screen + success screen to create wizard
- [x] Step 5: Add "My Submissions" tab to mine page
- [x] Step 6: Add GitHub connection section to account page
- [x] API: `GET /:id/submissions` made public (removed auth + creator check)
- [x] API: `GET /my-submissions` new endpoint added
- [x] TypeScript: zero errors (tsc --noEmit clean)

---

## Success Criteria

- User can navigate to `/github-bounties` from main nav
- Developer landing on detail page sees submissions list (competition signal)
- GitHub Connect is prominently surfaced before submit (not buried)
- After creating bounties, user sees success screen with next actions
- User can see their submitted PRs in Mine page
- Account page shows GitHub connection status
