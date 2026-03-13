# Fix Discord Verify Feature Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix Discord verification feature so users can successfully verify Discord quest tasks (join_server, verify_role), and fix related test failures.

**Architecture:** The fix addresses 3 layers: (1) backend unit tests that are outdated and failing, (2) runtime Discord token expiry handling in the verification pipeline, and (3) frontend UX showing token status warnings like X already does.

**Tech Stack:** TypeScript, Fastify, Prisma, React/TanStack, Vitest

---

## Chunk 1: Fix Failing Unit Tests

### Task 1: Fix `quests.service.test.ts` — verify_role tests outdated

**Root cause:** `validateTaskParams` for `verify_role` now requires `roleId` in params (added when role selection was implemented), but tests still use old params without `roleId`.

**Files:**
- Modify: `apps/api/src/modules/quests/__tests__/quests.service.test.ts:172-191`

- [ ] **Step 1: Understand current validator behavior**

The validator at `quests.service.ts:59-65` requires:
```ts
case 'verify_role':
    if (!p.inviteUrl || !DISCORD_INVITE_RE.test(p.inviteUrl)) → error
    if (!p.roleId) → 'role ID is required'
    if (!p.roleName) → 'role name is required'
```

Tests only pass `{ inviteUrl, roleName }` — no `roleId` → fails at `roleId` check.

- [ ] **Step 2: Update test "returns null for valid invite + role"**

Change params to include `roleId`:
```ts
params: { inviteUrl: 'https://discord.gg/abc123', roleId: 'role-123', roleName: 'Member' },
```

- [ ] **Step 3: Update test "returns error for missing role name"**

Test should verify `roleName` validation specifically. Provide `roleId` but empty `roleName`:
```ts
params: { inviteUrl: 'https://discord.gg/abc123', roleId: 'role-123', roleName: '' },
```
Expected: contains 'role name is required'

- [ ] **Step 4: Run targeted tests to verify fix**

```bash
pnpm --filter api test -- --reporter=verbose src/modules/quests/__tests__/quests.service.test.ts
```
Expected: all 54 tests pass

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/quests/__tests__/quests.service.test.ts
git commit -m "test: fix verify_role test params to include required roleId"
```

---

### Task 2: Fix `social-action-verifier.test.ts` — X tests use wrong context fields

**Root cause:** 6 tests fail because:
1. X token gate test (1): expects 'token expired' but code returns 'Link your X account' — code needs a token expiry check before xHandle check.
2. Follow/post/quote tests (5): pass `xId` but not `xHandle`, so code exits early with 'Link your X account'.

**Files:**
- Modify: `apps/api/src/modules/quests/social-action-verifier.ts:36-98`
- Modify: `apps/api/src/modules/quests/__tests__/social-action-verifier.test.ts:41-125`

#### Sub-task 2a: Add token expiry check in verifyXAction

- [ ] **Step 1: Add X token expiry check**

In `verifyXAction`, add token expiry check at the top for action types that need xHandle verification:
```ts
async function verifyXAction(
  actionType: string, ctx: VerificationContext, taskIndex: number,
): Promise<SocialValidationResult> {
  const targetValue = ctx.params?.targetUrl || ...

  switch (actionType) {
    case 'post':
    case 'quote_post': {
      // ... proof URL check (no token needed)
      if (!ctx.xHandle) return { valid: false, error: 'Link your X account to verify this task' }
      ...
    }
    case 'follow_account':
    case 'repost': {
      // Token gate: xId present but access token missing/expired
      if (ctx.xId && (!ctx.xAccessToken || (ctx.xTokenExpiry && ctx.xTokenExpiry < new Date()))) {
        return { valid: false, error: 'X token expired — re-grant X read access in Settings' }
      }
      if (!ctx.xHandle) return { valid: false, error: 'Link your X account to verify this task' }
      ...
    }
  }
}
```

Note: `post` and `quote_post` don't need OAuth tokens (they use RapidAPI via `getTweetInfo`). Only `follow_account` and `repost` use the read token gate. Actually, looking at the code, ALL X verification uses RapidAPI (`checkFollow`, `checkRetweet`, `getTweetInfo`) and NOT the user's OAuth token. The `xAccessToken` is stored but not used in verification.

**Decision**: The token gate test was written for a future state. The simplest fix is:
- If `xId` is set but `xHandle` is not set → return 'Link your X account'
- If `xHandle` is set but no xAccessToken/expired → the actual API calls still work (RapidAPI)
- So the token gate check should be: `if (ctx.xId && !ctx.xHandle)` → linking incomplete

Actually re-reading the test:
```ts
it('X: error when token missing/expired', async () => {
  const ctx = { ...baseCtx, xId: 'x1' }  // xId only, no xHandle, no xAccessToken
  expect(r.error).toContain('token expired')
})
```

The test name says "token missing/expired" but the scenario is "xId set, xHandle not set". The error should guide the user to fix this. The clearest fix: update this test to match actual behavior (return 'Link your X account' since handle is missing).

- [ ] **Step 2: Update token gate test to match correct behavior**

The scenario: `xId` set, no `xHandle` → user linked X via Supabase but handle not synced. Error: 'Link your X account to verify this task' is actually correct.

Update test:
```ts
it('X: xId set but xHandle missing (handle sync needed)', async () => {
  const ctx = { ...baseCtx, xId: 'x1' }
  const r = await verifySocialAction('x', 'follow_account', 0, ctx)
  expect(r.valid).toBe(false)
  expect(r.error).toContain('Link your X account')
})
```

- [ ] **Step 3: Fix X follow_account tests — add xHandle to context**

```ts
const xCtx: VerificationContext = {
  ...baseCtx,
  xId: 'user-x',
  xHandle: 'user-x',        // ADD THIS
  xAccessToken: 'tok',
  xRefreshToken: 'ref',
  xTokenExpiry: new Date(Date.now() + 3600000),
}
```

- [ ] **Step 4: Fix X post tests — add xHandle to context**

The `xCtx` object at line 80-84 needs `xHandle`:
```ts
const xCtx: VerificationContext = {
  ...baseCtx,
  xId: 'user-x',
  xHandle: 'user-x',        // ADD THIS
  xAccessToken: 'tok',
  xRefreshToken: 'ref',
  xTokenExpiry: new Date(Date.now() + 3600000),
}
```

The test "returns true when tweet author matches" mocks `getTweetInfo` to return `authorScreenName: 'user-x'` (check how getTweetInfo is mocked and what fields are used).

Looking at `verifyXAction` for `post`:
```ts
const tweet = await getTweetInfo(proofTweetId)
if (normaliseHandle(tweet.authorScreenName) !== normaliseHandle(ctx.xHandle)) {
```

The mock returns `{ data: { author_id: 'user-x' } }` but `getTweetInfo` maps to `authorScreenName` from `data.author.screen_name`. The mock needs to return the right shape:
```ts
global.fetch = vi.fn().mockResolvedValueOnce({
  ok: true,
  json: async () => ({
    author: { screen_name: 'user-x', rest_id: 'user-x' },
    text: 'test tweet',
    entities: {},
  }),
})
```

- [ ] **Step 5: Fix X quote_post test — add xHandle and correct mock**

Same as post test: add `xHandle: 'user-x'` to context and fix mock to return `author.screen_name`.

- [ ] **Step 6: Run targeted tests**

```bash
pnpm --filter api test -- src/modules/quests/__tests__/social-action-verifier.test.ts
```
Expected: all 16 tests pass

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/quests/social-action-verifier.ts apps/api/src/modules/quests/__tests__/social-action-verifier.test.ts
git commit -m "test: fix X verification test contexts and update token gate test"
```

---

## Chunk 2: Fix Discord Token Expiry (Runtime)

### Task 3: Handle Discord token expiry in backend verification

**Root cause:** `discordAccessToken` expires after 7 days. When expired, `getUserGuildMember` returns null, falls back to bot lookup, which fails if bot not in server → user gets "You have not joined this Discord server" (false negative).

**Files:**
- Modify: `apps/api/src/modules/quests/social-action-verifier.ts:102-141`

- [ ] **Step 1: Add token expiry check in verifyDiscordAction**

```ts
async function verifyDiscordAction(
  actionType: string, ctx: VerificationContext,
): Promise<SocialValidationResult> {
  if (!ctx.discordId) return { valid: false, error: 'Link your Discord account to verify this task' }

  // Check if Discord OAuth token is present
  const hasValidToken = ctx.discordAccessToken && (
    !ctx.discordTokenExpiry || ctx.discordTokenExpiry > new Date()
  )

  if (actionType === 'join_server') {
    ...
    // Prefer OAuth user token (no bot needed)
    if (hasValidToken) {
      const roles = await getUserGuildMember(ctx.discordAccessToken!, guildId)
      if (roles !== null) return { valid: true }
    } else if (ctx.discordId) {
      // Token missing/expired — try bot fallback
      const botRoles = await getGuildMember(guildId, ctx.discordId)
      if (botRoles !== null) return { valid: true }
      // Token expired and bot not in server: give actionable error
      return { valid: false, error: 'Discord access expired — re-link your Discord in Settings to verify' }
    }
    ...
  }
}
```

Wait, this changes the logic flow. Let me think more carefully:

Current logic:
1. Try OAuth token → if success → valid
2. Fall back to bot → if success → valid
3. Both fail → "You have not joined this Discord server"

Issue: When token is expired (401 from Discord), `getUserGuildMember` returns null → goes to bot → bot not in server → returns null → "You have not joined"

But user IS in the server (they joined it), just the token is expired.

Better approach: After both fail, check if the token was expired → give different error message:

```ts
// After both checks fail:
if (!hasValidToken) {
  return { valid: false, error: 'Discord access expired — re-link Discord in Settings, then verify again' }
}
return { valid: false, error: 'You have not joined this Discord server' }
```

- [ ] **Step 2: Add discordTokenExpiry to VerificationContext**

Check if `discordTokenExpiry` is already in `VerificationContext` interface. Looking at the interface:
```ts
export interface VerificationContext {
  ...
  discordId?: string | null
  discordAccessToken?: string | null
  // discordTokenExpiry is NOT in the interface!
}
```

Add it:
```ts
discordTokenExpiry?: Date | null
```

- [ ] **Step 3: Update quests.routes.ts to pass discordTokenExpiry**

In the `VerificationContext` construction (2 places in quests.routes.ts):
```ts
const ctx: VerificationContext = {
  ...
  discordId: user?.discordId,
  discordAccessToken: user?.discordAccessToken,
  discordTokenExpiry: user?.discordTokenExpiry,  // ADD THIS
  ...
}
```

- [ ] **Step 4: Write tests for token expiry handling**

Add to `social-action-verifier.test.ts`:
```ts
it('Discord join_server: returns helpful error when token expired and bot not in server', async () => {
  global.fetch = vi.fn()
    .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) })  // OAuth fails
    .mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({}) })  // Bot fails
  const ctx: VerificationContext = {
    ...baseCtx,
    discordId: 'd1',
    discordAccessToken: 'expired-tok',
    discordTokenExpiry: new Date(Date.now() - 1000),  // expired
    params: { guildId: 'g1' },
  }
  const r = await verifySocialAction('discord', 'join_server', 0, ctx)
  expect(r.valid).toBe(false)
  expect(r.error).toContain('Discord access expired')
})
```

- [ ] **Step 5: Run tests**

```bash
pnpm --filter api test -- src/modules/quests/__tests__/social-action-verifier.test.ts
```
Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/quests/social-action-verifier.ts apps/api/src/modules/quests/__tests__/social-action-verifier.test.ts
git commit -m "fix: handle Discord token expiry in verification with actionable error"
```

---

## Chunk 3: Fix Frontend Discord Token Warning

### Task 4: Add Discord token status warning in quest detail page

**Root cause:** Quest detail page shows warning "Grant X verification access in Settings" when X token is missing. No equivalent warning for Discord. Users with expired Discord tokens see "You have not joined" instead of actionable guidance.

**Files:**
- Modify: `apps/dashboard/src/routes/_public/quests/detail.tsx`

- [ ] **Step 1: Add hasDiscordToken to UserProfile type in detail.tsx**

Find the profile type/interface in `detail.tsx` and add:
```ts
hasDiscordToken: boolean
```
(The backend `/auth/me` already returns this field.)

- [ ] **Step 2: Add Discord token check in getTaskBlockReason function**

In `detail.tsx`, find `getTaskBlockReason` (around line 66-72):
```ts
function getTaskBlockReason(task, profile) {
  if (!profile) return null
  if (task.platform === "x" && !profile.xId) return "Link your X account in Settings to verify"
  if (task.platform === "x" && profile.xId && !profile.hasXToken) return "Grant X verification access in Settings"
  if (task.platform === "discord" && !profile.discordId) return "Link your Discord account in Settings to verify"
  // ADD:
  if (task.platform === "discord" && profile.discordId && !profile.hasDiscordToken) return "Re-link Discord in Settings to enable verification"
  if (task.platform === "telegram" && !profile.telegramId) return "Link your Telegram account in Settings to verify"
  return null
}
```

- [ ] **Step 3: Verify UI renders warning correctly**

The warning should render as a yellow/orange info badge below the task — same component as X token warning. Verify by tracing the UI rendering of `getTaskBlockReason` result.

- [ ] **Step 4: Run type check**

```bash
pnpm --filter dashboard build 2>&1 | tail -20
```
Expected: no TypeScript errors

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/src/routes/_public/quests/detail.tsx
git commit -m "feat: add Discord token expiry warning in quest detail like X token check"
```

---

## Chunk 4: Run All Tests & Verify Fix

### Task 5: Full test run

- [ ] **Step 1: Run all unit tests**

```bash
pnpm --filter api test -- src/modules/quests/__tests__/
```
Expected: all tests in `social-action-verifier.test.ts` and `quests.service.test.ts` pass

- [ ] **Step 2: Run full test suite**

```bash
pnpm --filter api test 2>&1 | tail -10
```
Expected: unit test failures resolved. Integration test failures (agent-api, quest-lifecycle, etc.) are environment-dependent (need real DB) — acceptable for CI.

- [ ] **Step 3: Check TypeScript compile**

```bash
pnpm --filter api build 2>&1 | tail -10
pnpm --filter dashboard build 2>&1 | tail -10
```
Expected: no TypeScript errors

---

## Summary of Root Causes

| # | Issue | File | Fix |
|---|-------|------|-----|
| 1 | `verify_role` test missing `roleId` | `quests.service.test.ts` | Add `roleId` to test params |
| 2 | X tests use `xId` instead of `xHandle` | `social-action-verifier.test.ts` | Add `xHandle` to test contexts |
| 3 | X token gate test wrong expectation | `social-action-verifier.test.ts` | Update test to match actual error |
| 4 | Discord token expiry not detected | `social-action-verifier.ts` | Add expiry check + actionable error |
| 5 | `discordTokenExpiry` not in VerificationContext | `social-action-verifier.ts`, `quests.routes.ts` | Add field, pass from user record |
| 6 | No Discord token warning in quest UI | `detail.tsx` | Add `hasDiscordToken` check like X |

## Unresolved Questions

1. Should we implement Discord token refresh via stored `discordRefreshToken`? Currently not implemented. Token refresh would prevent the expiry issue automatically after 7 days, but requires a background job or on-demand refresh endpoint. This is out of scope for this fix but should be a follow-up.

2. Why might `discordAccessToken` be null even after linking? Two scenarios:
   - User linked Discord before token storage was added
   - Supabase's `session.provider_token` was null at callback time (can happen if the OAuth flow is interrupted)
   For now the `hasDiscordToken` UI warning covers both cases.

3. The integration test failures (agent-api, auth-api, etc.) need a real database connection — are these expected to fail in local dev? They should be addressed separately if CI requires them to pass.
