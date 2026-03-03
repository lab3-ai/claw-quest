# Code Review: Real Social Task Verification

**Date:** 2026-03-03 22:41
**Reviewer:** code-reviewer
**Feature:** Replace existence-only checks with real platform API verification

---

## Scope

- **Files reviewed:** 8 (4 new, 4 modified)
- **LOC added:** ~500
- **Focus:** Security, correctness, backward compatibility, edge cases
- **Tests:** 161 passing (5 files), builds succeed for API + Dashboard
- **Plan:** `/Users/hd/clawquest/plans/260303-2127-real-social-task-verification/plan.md` (status: completed)

### Files

| File | Lines | New/Modified |
|------|-------|-------------|
| `apps/api/src/modules/x/x-rest-client.ts` | 198 | New |
| `apps/api/src/modules/quests/social-action-verifier.ts` | 173 | New |
| `apps/api/src/modules/x/__tests__/x-rest-client.test.ts` | 147 | New |
| `apps/api/src/modules/quests/__tests__/social-action-verifier.test.ts` | 164 | New |
| `apps/api/prisma/schema.prisma` | +3 lines | Modified |
| `apps/api/src/modules/auth/auth.routes.ts` | 341 total | Modified |
| `apps/api/src/modules/quests/quests.routes.ts` | 1546 total | Modified |
| `apps/dashboard/src/routes/_public/quests/detail.tsx` | +24 lines | Modified |

---

## Overall Assessment

Solid implementation that follows established patterns (mirrors discord-rest-client, respects file size limits, clean error messages). The two-function split (creation-time `validateSocialTarget` vs completion-time `verifySocialAction`) is well-designed. Token handling is secure -- `/me` returns `hasXToken: boolean` instead of raw tokens.

However, there is one **critical regression** and one **blocking deployment issue** that must be fixed before merge.

---

## Critical Issues

### 1. MISSING DATABASE MIGRATION -- Deployment will fail

**File:** `apps/api/prisma/schema.prisma`

The schema adds 3 new columns (`xAccessToken`, `xRefreshToken`, `xTokenExpiry`) to the User model, but no Prisma migration was generated. Zero migration files reference these columns.

**Impact:** `prisma migrate deploy` will fail in production. The API will crash on any code path that reads/writes X tokens.

**Fix:**
```bash
pnpm --filter api db:migrate -- --name add_x_oauth_tokens
```

### 2. verify_role REGRESSION -- Always passes without checking

**File:** `apps/api/src/modules/quests/social-action-verifier.ts` (line 121-122)

The `verifyDiscordAction` function has a comment saying `verify_role` is "delegated to existing validateSocialTarget in quest routes" -- but the quest routes no longer call `validateSocialTarget` for any task type. Both `check-tasks` and `tasks/verify` now route ALL tasks through `verifySocialAction`, which returns `{ valid: true }` for `verify_role` without any actual check.

The plan (phase-03, lines 205-211) explicitly specifies the correct delegation code, but it was not implemented.

**Impact:** Any quest with a `verify_role` task will auto-pass verification. Users can complete Discord role-gated quests without having the required role. This defeats the entire purpose of role verification.

**Fix in `social-action-verifier.ts`:**
```typescript
// Replace line 121-122:
// verify_role delegated to existing validateSocialTarget in quest routes
return { valid: true }

// With:
if (actionType === 'verify_role') {
  const { validateSocialTarget } = await import('./social-validator')
  return validateSocialTarget('discord', 'verify_role', '', undefined, {
    discordId: ctx.discordId,
    discordAccessToken: ctx.discordAccessToken,
    params: ctx.params,
  })
}
return { valid: true }
```

Or use a static import at the top of the file (preferred -- avoids dynamic import):
```typescript
import { validateSocialTarget } from './social-validator'
```

---

## High Priority

### 3. `like_post` / `repost` false negatives on popular tweets

**File:** `apps/api/src/modules/x/x-rest-client.ts` (lines 124-156)

`getLikingUsers` and `getRetweetedBy` fetch only the first 100 results with no pagination. For tweets with >100 likes/retweets, a user's action may not appear in the first page.

**Impact:** Users who legitimately liked/retweeted a popular tweet may fail verification. X API returns liking_users in reverse chronological order, so early likers are most likely to be missed.

**Mitigation (not blocking, but should be documented):**
- Add pagination (same pattern as `checkFollowing`) up to 5 pages (500 results)
- Or document the limitation and add a "try again later" hint in the error message
- X Basic tier rate limit (75 requests/15min per user for tweet reads) allows pagination

### 4. Frontend callback page missing for `/auth/x/callback`

**File:** No file exists at `apps/dashboard/src/routes/auth/x-callback.tsx` or similar

The `/x/authorize` endpoint generates a redirect URL to `{FRONTEND_URL}/auth/x/callback`, but no frontend route handles this callback. The OAuth flow will land on a 404 page.

**Impact:** Users cannot complete X account linking. The entire X verification feature is blocked until this page is built.

**Fix:** Create `apps/dashboard/src/routes/auth/x-callback.tsx` that:
1. Extracts `code` and `state` from URL search params
2. Retrieves `codeVerifier` from sessionStorage (saved before redirect)
3. POSTs to `/auth/x/callback` with `{ code, codeVerifier, redirectUri }`
4. Redirects to dashboard on success

### 5. `check-tasks` GET endpoint makes N external API calls per request -- no rate limiting

**File:** `apps/api/src/modules/quests/quests.routes.ts` (line 586-600)

The `check-tasks` GET endpoint now calls `verifySocialAction` for every task in the quest. A quest with 5 X tasks triggers 5+ X API calls (each `follow_account` uses 2 calls: username lookup + following check). Since this is a GET with no rate limiting, a user polling this endpoint every second will exhaust X API rate limits rapidly.

**Impact:** X Basic tier: 10,000 tweet reads/month. A single user could burn through this in minutes.

**Suggested fix:**
- Add rate limiting to `check-tasks` (e.g., 1 request per 30 seconds per user per quest)
- Or cache verification results for a short TTL (e.g., 60 seconds)
- Consider: `check-tasks` is a preview -- could skip X verification and only show "Link your X account" / "Token status" gates without actually calling X API

---

## Medium Priority

### 6. `redirectUri` accepted from client in `/x/callback` is unnecessary

**File:** `apps/api/src/modules/auth/auth.routes.ts` (line 283, 307)

The `XCallbackBody` accepts `redirectUri` from the client and forwards it to X's token endpoint. The server already knows the redirect URI (it generates it in `/x/authorize`). Accepting it from the client means an attacker could potentially craft a different redirect URI (though X would reject the mismatch, it's still unnecessary surface area).

**Fix:** Compute `redirectUri` server-side in the callback handler, same as in `/x/authorize`:
```typescript
const redirectUri = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/x/callback`;
```
Then remove `redirectUri` from `XCallbackBody`.

### 7. `codeVerifier` returned in `/x/authorize` response

**File:** `apps/api/src/modules/auth/auth.routes.ts` (line 275)

The `codeVerifier` is a PKCE secret -- it should never leave the server in a standard OAuth2 PKCE flow. However, in this SPA architecture where the server generates the PKCE pair on behalf of the frontend, this is acceptable because:
- The response is over HTTPS to an authenticated user
- The frontend needs the verifier to complete the token exchange

This is fine for an SPA flow where the backend acts as a PKCE proxy, but worth noting that the more standard pattern would be for the frontend to generate the PKCE pair itself.

### 8. `targetHandle` parsing is fragile for URLs with path segments

**File:** `apps/api/src/modules/quests/social-action-verifier.ts` (line 55)

```typescript
const targetHandle = targetValue.replace(/^@/, '').replace(/^https?:\/\/(x|twitter)\.com\//, '')
```

If `targetValue` is `https://x.com/elonmusk/status/123`, the result is `elonmusk/status/123`, which gets passed to `lookupUserByUsername`. The `encodeURIComponent` in `x-rest-client.ts` saves this from being a path traversal, but it will fail the lookup and return a confusing "Could not resolve target X account" error.

**Fix:** Extract only the first path segment:
```typescript
const targetHandle = targetValue
  .replace(/^@/, '')
  .replace(/^https?:\/\/(x|twitter)\.com\//, '')
  .split('/')[0]  // take only username part
```

### 9. Telegram `chatId` fallback produces bad identifiers

**File:** `apps/api/src/modules/quests/social-action-verifier.ts` (lines 136-139)

The fallback `chatId` computation:
```typescript
else chatId = `@${channelUrl.replace(/^https?:\/\//, '')}`
```
If `channelUrl` is `https://t.me/joinchat/ABC123` (a private invite link), this produces `@t.me/joinchat/ABC123` which is invalid for the Telegram API. The API will return a 400 error, which is handled, but the error message "Bot cannot check this channel -- it must be added as admin" is misleading.

**Fix:** Add a check for joinchat/+ links and return a specific error:
```typescript
if (channelUrl.includes('/joinchat/') || channelUrl.includes('/+')) {
  return { valid: false, error: 'Private invite links cannot be verified — use a public channel @username' }
}
```

---

## Low Priority

### 10. `quests.routes.ts` at 1546 lines -- well above 200-line guideline

The file was already oversized before this change. The diff adds ~50 lines. This is a pre-existing issue, not introduced by this PR.

### 11. `VerifyTasksBody` allows `.optional()` on the entire schema

**File:** `apps/api/src/modules/quests/quests.routes.ts` (line 607-609)

```typescript
const VerifyTasksBody = z.object({
    proofUrls: z.record(z.string(), z.string().url()).optional(),
}).optional();
```

The `.optional()` on the outer object means the body can be `undefined`. Combined with the inner `.optional()` on `proofUrls`, this means sending no body or an empty body both work. This is fine functionally but the outer `.optional()` is redundant since Fastify sends `undefined` body as `{}` for JSON content type.

### 12. Test coverage gap: no test for `verify_role` through `verifySocialAction`

There's no test asserting that `verifySocialAction('discord', 'verify_role', ...)` actually checks the role. Once the regression (issue #2) is fixed, a test should be added.

---

## Edge Cases Found by Scouting

1. **Race condition on X token refresh:** Two concurrent requests for the same user could both detect expired token and both call `refreshXToken`. X refresh tokens are one-time-use, so the second refresh will fail. The first write wins (token saved to DB), but the second request gets `null` and shows "token expired" error. Low risk -- user retries and it works.

2. **Task params variability:** `social-action-verifier.ts` reads `ctx.params?.targetUrl || ctx.params?.accountHandle`. The actual param names depend on quest task creation. If a task uses a different param name (e.g., `url` instead of `targetUrl`), verification silently passes with an empty target. Should validate that expected params exist.

3. **`kickedout` status in Telegram:** The `getChatMember` status list includes `restricted` as "joined". A restricted user might not be able to interact but is counted as verified. This is arguably correct -- they did join.

---

## Positive Observations

- **Token leak prevention:** `/me` endpoint returns `hasXToken: boolean`, not raw tokens. Same for Discord.
- **Clean separation:** Creation-time validation (`social-validator.ts`) and completion-time verification (`social-action-verifier.ts`) are separate files with clear responsibilities.
- **Pattern consistency:** `x-rest-client.ts` follows `discord-rest-client.ts` structure: timeout, error handling, null returns.
- **File sizes:** All new files under 200 lines (198, 173, 147, 164).
- **Error messages are actionable:** "Link your X account", "token expired -- re-link", "Bot cannot check this channel -- must be added as admin".
- **Proof URL validation:** Zod `z.string().url()` server-side + `type="url"` client-side + `extractTweetId` regex guard.
- **Frontend UX:** Error messages include "Go to Settings" link when user needs to link/re-link accounts.
- **.env.example updated** with new X_CLIENT_ID / X_CLIENT_SECRET.
- **Delete social account clears tokens:** The `DELETE /social/twitter` handler now clears xAccessToken, xRefreshToken, xTokenExpiry -- proper cleanup.

---

## Recommended Actions (Priority Order)

1. **[CRITICAL]** Generate Prisma migration for X token fields: `pnpm --filter api db:migrate -- --name add_x_oauth_tokens`
2. **[CRITICAL]** Fix `verify_role` in `social-action-verifier.ts` -- add delegation to `validateSocialTarget`
3. **[HIGH]** Create frontend `/auth/x/callback` route to complete OAuth flow
4. **[HIGH]** Add rate limiting or caching to `check-tasks` endpoint
5. **[MEDIUM]** Remove `redirectUri` from `XCallbackBody`, compute server-side
6. **[MEDIUM]** Fix `targetHandle` parsing to handle full URLs with path segments
7. **[MEDIUM]** Handle Telegram private invite links with specific error message
8. **[LOW]** Add test for `verify_role` through `verifySocialAction` dispatcher

---

## Metrics

| Metric | Value |
|--------|-------|
| New files | 4 (2 source + 2 test) |
| Tests passing | 161/161 |
| Build status | API pass, Dashboard pass |
| File size compliance | All new files under 200 lines |
| .env.example | Updated |
| Migration | **MISSING** |

---

## Unresolved Questions

1. X API Basic tier rate limits (10k reads/month, 15 req/15min per user) -- is this sufficient for expected volume? If quests go viral with many participants, the `checkFollowing` pagination (up to 10 pages) could exhaust limits quickly.
2. Will the X OAuth app be registered with `offline.access` scope? Without it, refresh tokens won't be issued and tokens expire in 2 hours.
3. For `like_post` and `repost` verification limited to 100 results -- is there a product decision on acceptable false-negative rate for popular tweets?
4. The plan lists `retweet.read` in scopes (line 62) but the implementation uses `like.read` (which covers both). Should `retweet.read` be added to the scopes list in `/x/authorize`?
