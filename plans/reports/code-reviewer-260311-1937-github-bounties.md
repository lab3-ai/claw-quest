# Code Review — GitHub Bounties Feature

**Date:** 2026-03-11
**Files reviewed:** 7 (6 frontend, 1 API routes)
**Scope:** Bug fixes, design system compliance, TypeScript issues

---

## Critical Issues

### 1. LLM_KEY rewardAmount=0 fails API validation — bounty creation broken

**File:** `apps/dashboard/src/routes/_authenticated/github-bounties/new.tsx` line 294
**File:** `apps/api/src/modules/github-bounty/github-bounty.routes.ts` line 26

`StepPublish` sends `rewardAmount: 0` for LLM_KEY bounties:
```ts
rewardAmount: s.rewardType === "LLM_KEY" ? 0 : (s.rewardAmount ?? s.suggestedReward),
```

The API schema requires `z.number().positive()` (strictly > 0). This will always throw a 400 validation error when publishing LLM_KEY bounties through the wizard — the most common AI-native path.

**Fix:** Change schema to `z.number().nonnegative()` on the API, or send `rewardAmount: 0` only for LLM_KEY and guard with `.refine()` (e.g. allow 0 when rewardType is LLM_KEY).

---

### 2. GitHub Connect banner always shown to authenticated users — UX and logic bug

**File:** `apps/dashboard/src/routes/_public/github-bounties/detail.tsx` lines 265–290

The "Connect GitHub" banner is rendered for **every authenticated user** when the bounty is live — including users who already connected GitHub. There is no check against `user` profile's `githubHandle`. The bounty detail page does not receive `githubHandle` from `useAuth()` but it could be derived from the profile query or a simple boolean from `/auth/me`.

Impact: already-connected users see a spurious "Connect GitHub" prompt above the PR form every time.

**Fix:** Add `hasGithubConnected` boolean to `/auth/me` response (mirrors `hasXToken` pattern), pass it from `useAuth()` or a profile query, and conditionally hide the banner.

---

## Warnings

### 3. `approveMutation` sends `Authorization: Bearer null` when session is expired

**File:** `apps/dashboard/src/routes/_public/github-bounties/detail.tsx` line 151–155

```ts
const token = await getAccessToken()   // may return null
const res = await fetch(..., {
    headers: { Authorization: `Bearer ${token}` },  // "Bearer null"
```

No null-guard before the fetch. The API will return a 401 rather than crashing, but the UI shows a generic `"Action failed"` error with no guidance to re-authenticate. `submitMutation` has a guard (`if (!token) throw new Error("Not authenticated")`), but `approveMutation` does not.

---

### 4. `Math.random()` used as OAuth CSRF state — cryptographically weak

**Files:** `detail.tsx` line 170, `new.tsx` line 127

```ts
const state = Math.random().toString(36).slice(2)
```

`Math.random()` is not cryptographically secure. Should use `crypto.randomUUID()` or `crypto.getRandomValues()`. This is the same pattern noted in project memory for the open redirect issues — consistent weakness in the auth flow.

---

### 5. Route registration order — `/my-submissions` registered after `/:id`

**File:** `apps/api/src/modules/github-bounty/github-bounty.routes.ts` lines 154, 256

`/my-submissions` (static) is registered after `/:id` (parametric). Fastify v4 uses `find-my-way` which correctly prioritises static segments over parametric regardless of registration order, so this **does not cause a runtime bug**. However, it's a readability hazard — future maintainers may be confused. Convention: register all static routes before parametric equivalents.

---

### 6. Hardcoded color values — design system violations

Multiple files use raw Tailwind color values instead of design tokens:

| File | Violation | Expected |
|------|-----------|----------|
| `index.tsx` line 38, 48–50 | `text-green-400`, `text-yellow-400`, `text-red-400`, `text-blue-400`, `text-purple-400` | Use CSS vars or design tokens (`text-success`, `text-warning`, etc.) if defined |
| `detail.tsx` lines 45–47, 56, 71 | Same green/yellow/red/blue/purple palette | Same |
| `new.tsx` lines 31–39, 365 | Same | Same |
| `mine.tsx` lines 50, 57 | Same | Same |

If `text-success`, `text-warning`, `text-destructive` tokens are not defined for all colors in `src/index.css`, at minimum the reward-type colors (`purple-400`, `blue-400`) should be moved to a single shared utility (currently duplicated across 3+ files).

---

### 7. `font-bold` usage — design system rule violation

**Files:** Several header labels in `account.tsx` use `font-semibold` (acceptable). Checked — no `font-bold` found. Clean on this rule.

---

## Minor Issues

### 8. `GitHubIcon` SVG component duplicated 3 times — DRY violation

**Files:** `index.tsx` line 63, `detail.tsx` line 77, `new.tsx` line 43

Identical inline SVG component defined in each file. Should be extracted to `src/components/icons/GitHubIcon.tsx`.

---

### 9. `rewardBadgeClass` / `rewardLabel` helper functions duplicated

**Files:** `index.tsx` lines 35–44, `detail.tsx` lines 44–53

Identical helpers. Should live in a shared `bounty-utils.ts`.

---

### 10. `filterBounties` called twice per tab render in `index.tsx`

**File:** `apps/dashboard/src/routes/_public/github-bounties/index.tsx` lines 109, 142

```ts
const filtered = filterBounties(data?.bounties ?? [], statusTab)   // line 109
// ...
{filterBounties(data.bounties, tab.key).length}   // line 142 — called N times per tab
```

`filterBounties` is called once per STATUS_TAB item in the tab bar (4x) plus once for the main list render. For 50 bounties this is negligible, but it's redundant. Cache counts with `useMemo`.

---

### 11. `account.tsx` — GitHub OAuth state uses `Math.random()` (same as #4)

**File:** `apps/dashboard/src/routes/_authenticated/account.tsx` line 664 (inferred from grep)

Same CSRF weakness as items #4 above — same fix applies.

---

### 12. `+ Post Bounty` uses inline string with `+` — not a MingCute icon

**Files:** `index.tsx` line 121, `mine.tsx` line 267

```tsx
<Link to="/github-bounties/new">+ Post Bounty</Link>
```

Other nav buttons (e.g. "Create Quest" in `_public.tsx` line 163) use `<AddLine size={16} />`. Apply `AddLine` here for consistency.

---

## Positive Observations

- State validation in `github-callback.tsx` correctly compares `state !== savedState` and clears sessionStorage after use — solid CSRF protection on the callback.
- Fastify route authz is correct: public submissions list, authenticated approve/reject. No IDOR on the creator-only PATCH.
- `submitMutation` correctly handles `needsGithubAuth` error from the API and triggers OAuth flow rather than showing a generic error.
- `approveMutation.isPending` disables both approve and reject buttons simultaneously — prevents double-mutation race condition.
- Submission authorship check in `github-bounty.service.ts` line 264 validates `pr.user.login` against `user.githubHandle` — prevents impersonation.

---

## Recommended Actions (prioritised)

1. **[Critical]** Fix LLM_KEY `rewardAmount=0` — change API schema to `.nonnegative()` or add a `.refine()` allowing 0 for LLM_KEY
2. **[Critical]** GitHub Connect banner — check `githubHandle` before showing; mirrors `hasXToken` pattern already in `/auth/me`
3. **[Warning]** Add null-guard to `approveMutation` token (copy pattern from `submitMutation`)
4. **[Warning]** Replace `Math.random()` with `crypto.randomUUID()` in all 3 OAuth state generators
5. **[Minor]** Extract `GitHubIcon`, `rewardBadgeClass`, `rewardLabel` to shared files
6. **[Minor]** Replace `+ Post Bounty` inline `+` with `<AddLine>` MingCute icon
7. **[Minor]** Move static `/my-submissions` route registration before `/:id` in routes file

---

## Unresolved Questions

- Are design tokens for `text-success`, `text-warning` defined in `src/index.css`? If yes, the reward/difficulty color helpers must use them. If not, the green/yellow/red Tailwind palette is acceptable interim.
- Does `/auth/me` already return `githubHandle` or a `hasGithubConnected` boolean? If so, item #2 fix is a 2-line change in `detail.tsx`.
- Is there a `rewardAmount` cross-field validation planned for the API (0 allowed iff LLM_KEY)? The schema fix in item #1 needs to be agreed on.
