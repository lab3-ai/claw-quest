# TwitterAPI.io X Verification Integration Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace RapidAPI (twttrapi) with TwitterAPI.io as the primary fallback for X action verification (`follow_account`, `repost`, `post`, `quote_post`), keeping X API OAuth as the most authoritative path and RapidAPI as last resort.

**Architecture:** Add a new thin client module `x-twitterapio-client.ts` with three functions (`fetchTweetById`, `checkFollowRelationship`, `getTweetRetweeters`). Update `verifyXAction` in `social-action-verifier.ts` to slot TwitterAPI.io between the X API OAuth path and the existing RapidAPI path. No liked-tweet endpoint exists in TwitterAPI.io — `like_post` continues using X API bearer + RapidAPI.

**Tech Stack:** Node.js fetch, TypeScript, Vitest (tests), env var `TWITTER_API_IO_KEY`

---

## TwitterAPI.io Endpoints Used

| Action | Endpoint | Base URL |
|--------|----------|----------|
| Tweet lookup (post/quote_post) | `GET /twitter/tweets?tweet_ids=<id>` | `https://api.twitterapi.io` |
| Follow check | `GET /twitter/user/check_follow_relationship?source_user_name=<>&target_user_name=<>` | `https://api.twitterapi.io` |
| Repost check | `GET /twitter/tweet/retweeters?tweetId=<>&cursor=<>` | `https://api.twitterapi.io` |

**Auth:** `X-API-Key: <TWITTER_API_IO_KEY>` header on every request.

Response tweet object shape:
```ts
{
  id: string
  author: { id: string; userName: string; ... }
  quoted_tweet?: { id: string; ... }
  retweeted_tweet?: { id: string; ... }
}
```

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `apps/api/src/modules/x/x-twitterapio-client.ts` | **Create** | TwitterAPI.io API calls: `fetchTweetById`, `checkFollowRelationship`, `getTweetRetweeters` |
| `apps/api/src/modules/x/__tests__/x-twitterapio-client.test.ts` | **Create** | Unit tests for the new client |
| `apps/api/src/modules/quests/social-action-verifier.ts` | **Modify** | Slot TwitterAPI.io fallback into `verifyXAction` |
| `apps/api/.env.example` *(or root `.env.example`)* | **Modify** | Add `TWITTER_API_IO_KEY` |

---

## Chunk 1: New TwitterAPI.io Client

### Task 1: Create `x-twitterapio-client.ts`

**Files:**
- Create: `apps/api/src/modules/x/x-twitterapio-client.ts`

- [ ] **Step 1: Write the file**

```ts
/**
 * TwitterAPI.io client — api.twitterapi.io
 * Used as primary fallback when X API OAuth is unavailable.
 * Docs: https://docs.twitterapi.io/introduction
 *
 * Env vars:
 *   TWITTER_API_IO_KEY — API key from TwitterAPI.io dashboard
 */

import { normaliseHandle } from './x-utils'

const BASE_URL = 'https://api.twitterapi.io'
const TIMEOUT_MS = 8000

// ── Types ────────────────────────────────────────────────────────

interface TweetAuthorInfo {
  id: string
  userName: string
  name: string
}

interface TweetApiioData {
  id: string
  author: TweetAuthorInfo
  quoted_tweet?: { id: string }
}

interface GetTweetsResponse {
  tweets?: TweetApiioData[]
  status?: string
}

interface CheckFollowResponse {
  data?: { following: boolean; followed_by: boolean }
  status?: string
}

interface RetweetersResponse {
  users?: Array<{ userName?: string }>
  has_next_page?: boolean
  next_cursor?: string
  status?: string
}

// ── Helpers ──────────────────────────────────────────────────────

function apiHeaders(): Record<string, string> {
  const key = process.env.TWITTER_API_IO_KEY ?? ''
  return { 'X-API-Key': key }
}

function hasKey(): boolean {
  return Boolean(process.env.TWITTER_API_IO_KEY)
}

// ── Public API ───────────────────────────────────────────────────

/**
 * Fetch a tweet by ID.
 * Returns { authorId, authorHandle, quotedTweetId } or null on error.
 */
export async function fetchTweetById(
  tweetId: string,
): Promise<{ authorId: string; authorHandle: string; quotedTweetId?: string } | null> {
  if (!hasKey()) return null
  try {
    const url = `${BASE_URL}/twitter/tweets?tweet_ids=${encodeURIComponent(tweetId)}`
    const res = await fetch(url, { headers: apiHeaders(), signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!res.ok) return null
    const data = await res.json() as GetTweetsResponse
    const tweet = data.tweets?.[0]
    if (!tweet) return null
    return {
      authorId: tweet.author.id,
      authorHandle: normaliseHandle(tweet.author.userName),
      quotedTweetId: tweet.quoted_tweet?.id,
    }
  } catch {
    return null
  }
}

/**
 * Check if sourceHandle follows targetHandle.
 * Returns true/false or null on API error.
 * Cost: 100 credits per call.
 */
export async function checkFollowRelationship(
  sourceHandle: string, targetHandle: string,
): Promise<boolean | null> {
  if (!hasKey()) return null
  try {
    const source = normaliseHandle(sourceHandle)
    const target = normaliseHandle(targetHandle)
    const url = `${BASE_URL}/twitter/user/check_follow_relationship?source_user_name=${encodeURIComponent(source)}&target_user_name=${encodeURIComponent(target)}`
    const res = await fetch(url, { headers: apiHeaders(), signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!res.ok) return null
    const data = await res.json() as CheckFollowResponse
    if (data.status !== 'success' || data.data == null) return null
    return data.data.following
  } catch {
    return null
  }
}

/**
 * Check if xHandle appears in retweeters of tweetId.
 * Paginates up to 5 pages (~500 retweeters). Returns null on API error.
 */
export async function checkUserRetweeted(
  tweetId: string, xHandle: string,
): Promise<boolean | null> {
  if (!hasKey()) return null
  const target = normaliseHandle(xHandle)
  let cursor = ''
  for (let page = 0; page < 5; page++) {
    try {
      const url = `${BASE_URL}/twitter/tweet/retweeters?tweetId=${encodeURIComponent(tweetId)}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`
      const res = await fetch(url, { headers: apiHeaders(), signal: AbortSignal.timeout(TIMEOUT_MS) })
      if (!res.ok) return null
      const data = await res.json() as RetweetersResponse
      if (data.users?.some(u => normaliseHandle(u.userName ?? '') === target)) return true
      if (!data.has_next_page || !data.next_cursor) return false
      cursor = data.next_cursor
    } catch {
      return null
    }
  }
  return false
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/vuongluu/Documents/jobs/lab3/ceo-1/clawquest-1
pnpm --filter api exec tsc --noEmit 2>&1 | head -30
```

Expected: no errors for the new file.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/x/x-twitterapio-client.ts
git commit -m "feat(x): add TwitterAPI.io client with tweet, follow, and retweet checks"
```

---

### Task 2: Write tests for `x-twitterapio-client.ts`

**Files:**
- Create: `apps/api/src/modules/x/__tests__/x-twitterapio-client.test.ts`

- [ ] **Step 1: Write failing tests first**

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { fetchTweetById, checkFollowRelationship, checkUserRetweeted } from '../x-twitterapio-client'

describe('x-twitterapio-client', () => {
  beforeEach(() => {
    process.env.TWITTER_API_IO_KEY = 'test-key'
  })
  afterEach(() => {
    vi.restoreAllMocks()
    delete process.env.TWITTER_API_IO_KEY
  })

  // ── fetchTweetById ──
  describe('fetchTweetById', () => {
    it('returns authorId, authorHandle and quotedTweetId on success', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'success',
          tweets: [{
            id: '123',
            author: { id: 'uid-1', userName: 'TestUser', name: 'Test' },
            quoted_tweet: { id: 'q-99' },
          }],
        }),
      })
      const result = await fetchTweetById('123')
      expect(result).toEqual({ authorId: 'uid-1', authorHandle: 'testuser', quotedTweetId: 'q-99' })
    })

    it('returns null when tweets array is empty', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success', tweets: [] }),
      })
      expect(await fetchTweetById('123')).toBeNull()
    })

    it('returns null on HTTP error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({ ok: false })
      expect(await fetchTweetById('123')).toBeNull()
    })

    it('returns null when TWITTER_API_IO_KEY missing', async () => {
      delete process.env.TWITTER_API_IO_KEY
      global.fetch = vi.fn()
      expect(await fetchTweetById('123')).toBeNull()
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('normalises authorHandle to lowercase', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tweets: [{ id: '1', author: { id: 'u1', userName: 'MIXEDCASE', name: 'X' } }],
        }),
      })
      const result = await fetchTweetById('1')
      expect(result?.authorHandle).toBe('mixedcase')
    })
  })

  // ── checkFollowRelationship ──
  describe('checkFollowRelationship', () => {
    it('returns true when source follows target', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success', data: { following: true, followed_by: false } }),
      })
      expect(await checkFollowRelationship('alice', 'bob')).toBe(true)
    })

    it('returns false when source does not follow target', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success', data: { following: false, followed_by: false } }),
      })
      expect(await checkFollowRelationship('alice', 'bob')).toBe(false)
    })

    it('returns null on HTTP error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({ ok: false })
      expect(await checkFollowRelationship('alice', 'bob')).toBeNull()
    })

    it('returns null when status is not success', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'error', message: 'User not found' }),
      })
      expect(await checkFollowRelationship('alice', 'bob')).toBeNull()
    })

    it('strips @ from handles before calling API', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success', data: { following: true, followed_by: false } }),
      })
      await checkFollowRelationship('@alice', '@bob')
      const url = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
      expect(url).toContain('source_user_name=alice')
      expect(url).toContain('target_user_name=bob')
    })
  })

  // ── checkUserRetweeted ──
  describe('checkUserRetweeted', () => {
    it('returns true when user in retweeters', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'success',
          users: [{ userName: 'TargetUser' }],
          has_next_page: false,
          next_cursor: '',
        }),
      })
      expect(await checkUserRetweeted('tweet-1', 'targetuser')).toBe(true)
    })

    it('returns false when user not found in single page', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          users: [{ userName: 'OtherUser' }],
          has_next_page: false,
          next_cursor: '',
        }),
      })
      expect(await checkUserRetweeted('tweet-1', 'targetuser')).toBe(false)
    })

    it('paginates until user found', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            users: [{ userName: 'page1user' }],
            has_next_page: true,
            next_cursor: 'cursor-2',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            users: [{ userName: 'TargetUser' }],
            has_next_page: false,
            next_cursor: '',
          }),
        })
      expect(await checkUserRetweeted('tweet-1', 'targetuser')).toBe(true)
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })

    it('returns null on HTTP error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({ ok: false })
      expect(await checkUserRetweeted('tweet-1', 'user')).toBeNull()
    })
  })
})
```

- [ ] **Step 2: Run tests — verify they fail correctly (if client not done) or pass**

```bash
cd /Users/vuongluu/Documents/jobs/lab3/ceo-1/clawquest-1
pnpm --filter api test -- x-twitterapio-client --run 2>&1 | tail -20
```

Expected: All tests PASS (client was written first in Task 1).

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/x/__tests__/x-twitterapio-client.test.ts
git commit -m "test(x): add unit tests for TwitterAPI.io client"
```

---

## Chunk 2: Update `social-action-verifier.ts`

### Task 3: Integrate TwitterAPI.io into `verifyXAction`

**Files:**
- Modify: `apps/api/src/modules/quests/social-action-verifier.ts`

**Updated verification logic per action:**

| Action | Path 1 (primary) | Path 2 | Path 3 (last resort) |
|--------|-----------------|--------|----------------------|
| `post` | X API OAuth (getTweet → authorId check) | TwitterAPI.io fetchTweetById (authorId or authorHandle check) | RapidAPI |
| `quote_post` | X API OAuth (getTweet → quotedTweetId check) | TwitterAPI.io fetchTweetById (quotedTweetId check) | RapidAPI |
| `follow_account` | X API OAuth (checkFollowing) | TwitterAPI.io checkFollowRelationship | RapidAPI |
| `like_post` | X API bearer (checkUserLikedTweet) | RapidAPI | *(no TwitterAPI.io endpoint)* |
| `repost` | X API bearer (getRetweetedBy) | TwitterAPI.io checkUserRetweeted | RapidAPI |

- [ ] **Step 1: Update the import block at the top of `social-action-verifier.ts`**

Add import for the new client. Current import section (lines 7–8):
```ts
import { ensureFreshToken, getTweet, checkFollowing, lookupUserByUsername, checkUserLikedTweet, getRetweetedBy, getAppBearerToken } from '../x/x-rest-client'
import { fetchTweetById, checkUserFollows, fetchTweetForQuoteVerify, checkUserLikedTweet as checkUserLikedTweetRapid, checkUserRetweeted } from '../x/x-rapidapi-client'
```

Replace with:
```ts
import { ensureFreshToken, getTweet, checkFollowing, lookupUserByUsername, checkUserLikedTweet, getRetweetedBy, getAppBearerToken } from '../x/x-rest-client'
import { fetchTweetById as rapidFetchTweetById, checkUserFollows, fetchTweetForQuoteVerify, checkUserLikedTweet as checkUserLikedTweetRapid, checkUserRetweeted as rapidCheckUserRetweeted } from '../x/x-rapidapi-client'
import { fetchTweetById as twitteraioFetchTweetById, checkFollowRelationship, checkUserRetweeted as twitteraioCheckUserRetweeted } from '../x/x-twitterapio-client'
```

- [ ] **Step 2: Rewrite the `post` / `quote_post` case**

Current code block (lines 44–99). Replace the entire `case 'post': case 'quote_post':` block with:

```ts
case 'post':
case 'quote_post': {
  const proofUrl = ctx.proofUrls?.[taskIndex]
  if (!proofUrl) return { valid: false, error: 'Paste your tweet URL to verify' }
  const proofTweetId = extractTweetId(proofUrl)
  if (!proofTweetId) return { valid: false, error: 'Invalid tweet URL — use format: https://x.com/.../status/...' }

  // Path A: X API OAuth (most authoritative — verifies by xId)
  if (ctx.xId) {
    const token = await ensureFreshToken(
      { id: ctx.userId, xAccessToken: ctx.xAccessToken, xRefreshToken: ctx.xRefreshToken, xTokenExpiry: ctx.xTokenExpiry },
      ctx.prisma,
    )
    if (token) {
      const tweet = await getTweet(token, proofTweetId)
      if (!tweet) return { valid: false, error: 'Tweet not found — is it public?' }
      if (tweet.authorId !== ctx.xId) return { valid: false, error: 'This tweet was not posted by your linked X account' }
      if (actionType === 'quote_post') {
        const targetTweetId = extractTweetId(targetValue)
        if (targetTweetId && tweet.quotedTweetId !== targetTweetId) {
          return { valid: false, error: 'This tweet does not quote the required post' }
        }
      }
      return { valid: true }
    }
  }

  // Path B: TwitterAPI.io fallback
  const twitteraioTweet = await twitteraioFetchTweetById(proofTweetId)
  if (twitteraioTweet) {
    // Author check: prefer xId, fall back to xHandle
    if (ctx.xId && twitteraioTweet.authorId && twitteraioTweet.authorId !== ctx.xId) {
      return { valid: false, error: 'This tweet was not posted by your linked X account' }
    } else if (!ctx.xId && ctx.xHandle) {
      if (twitteraioTweet.authorHandle !== normaliseHandle(ctx.xHandle)) {
        return { valid: false, error: 'This tweet was not posted by your linked X account' }
      }
    }
    if (actionType === 'quote_post') {
      const targetTweetId = extractTweetId(targetValue)
      if (targetTweetId && twitteraioTweet.quotedTweetId !== targetTweetId) {
        return { valid: false, error: 'This tweet does not quote the required post' }
      }
    }
    return { valid: true }
  }

  // Path C: RapidAPI last resort
  const rapidApiKey = process.env.RAPID_API_KEY
  if (rapidApiKey) {
    if (actionType === 'quote_post') {
      const result = await fetchTweetForQuoteVerify(proofTweetId, rapidApiKey)
      if (!result) return { valid: false, error: 'Tweet not found — is it public?' }
      if (ctx.xId && result.authorId && result.authorId !== ctx.xId) {
        return { valid: false, error: 'This tweet was not posted by your linked X account' }
      }
      const targetTweetId = extractTweetId(targetValue)
      if (targetTweetId && result.quotedStatusId !== targetTweetId) {
        return { valid: false, error: 'This tweet does not quote the required post' }
      }
      return { valid: true }
    }
    const tweet = await rapidFetchTweetById(proofTweetId, rapidApiKey)
    if (!tweet) return { valid: false, error: 'Tweet not found — is it public?' }
    if (ctx.xHandle) {
      if (normaliseHandle(tweet.author.screenName) !== normaliseHandle(ctx.xHandle)) {
        return { valid: false, error: 'This tweet was not posted by your linked X account' }
      }
    } else if (ctx.xId && tweet.author.id && tweet.author.id !== ctx.xId) {
      return { valid: false, error: 'This tweet was not posted by your linked X account' }
    }
    return { valid: true }
  }

  return { valid: false, error: 'Link your X account to verify this task' }
}
```

- [ ] **Step 3: Rewrite the `follow_account` case**

Replace the `case 'follow_account':` block (lines 100–124):

```ts
case 'follow_account': {
  const targetHandle = targetValue.replace(/^@/, '').replace(/^https?:\/\/(x|twitter)\.com\//, '')

  // Path A: X API OAuth (official)
  if (ctx.xId && (ctx.xAccessToken || ctx.xRefreshToken)) {
    const token = await ensureFreshToken(
      { id: ctx.userId, xAccessToken: ctx.xAccessToken, xRefreshToken: ctx.xRefreshToken, xTokenExpiry: ctx.xTokenExpiry },
      ctx.prisma,
    )
    if (!token) return { valid: false, error: 'X account token expired — please re-link your X account' }
    const targetXId = await lookupUserByUsername(token, targetHandle)
    if (targetXId) {
      const follows = await checkFollowing(token, ctx.xId, targetXId)
      if (follows !== null) return follows ? { valid: true } : { valid: false, error: 'not following this account' }
    }
  }

  // Path B: TwitterAPI.io checkFollowRelationship (accurate, 100 credits/call)
  if (ctx.xHandle) {
    const follows = await checkFollowRelationship(ctx.xHandle, targetHandle)
    if (follows !== null) return follows ? { valid: true } : { valid: false, error: 'not following this account' }
  }

  // Path C: RapidAPI last resort
  if (!ctx.xHandle) return { valid: false, error: 'Link your X account to verify this task' }
  const follows = await checkUserFollows(ctx.xHandle, targetHandle)
  if (follows === null) return { valid: false, error: 'Follow verification unavailable — try again later' }
  return follows ? { valid: true } : { valid: false, error: 'not following this account' }
}
```

- [ ] **Step 4: Rewrite the `repost` case**

Replace the `case 'repost':` block (lines 138–153):

```ts
case 'repost': {
  if (!ctx.xId) return { valid: false, error: 'Link your X account to verify this task' }
  const tweetId = extractTweetId(targetValue) || targetValue
  if (!tweetId) return { valid: false, error: 'Quest task missing tweet URL — contact quest creator' }

  // Path A: X API bearer
  const bearerToken = getAppBearerToken()
  if (bearerToken) {
    const retweeted = await getRetweetedBy(bearerToken, tweetId, ctx.xId)
    if (retweeted !== null) return retweeted ? { valid: true } : { valid: false, error: 'You have not reposted this tweet' }
  }

  // Path B: TwitterAPI.io retweeters (by xHandle)
  if (ctx.xHandle) {
    const retweeted = await twitteraioCheckUserRetweeted(tweetId, ctx.xHandle)
    if (retweeted !== null) return retweeted ? { valid: true } : { valid: false, error: 'You have not reposted this tweet' }
  }

  // Path C: RapidAPI last resort
  if (!ctx.xHandle) return { valid: false, error: 'Repost verification unavailable — try again later' }
  const retweetedRapid = await rapidCheckUserRetweeted(tweetId, ctx.xHandle)
  if (retweetedRapid === null) return { valid: false, error: 'Repost verification unavailable — try again later' }
  return retweetedRapid ? { valid: true } : { valid: false, error: 'You have not reposted this tweet' }
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /Users/vuongluu/Documents/jobs/lab3/ceo-1/clawquest-1
pnpm --filter api exec tsc --noEmit 2>&1 | head -30
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/quests/social-action-verifier.ts
git commit -m "feat(quests): integrate TwitterAPI.io as primary fallback for X action verification"
```

---

## Chunk 3: Env Var + Integration Tests

### Task 4: Add env var to `.env.example`

**Files:**
- Modify: `.env.example` (root) — whichever file contains X-related vars

- [ ] **Step 1: Find and update .env.example**

```bash
grep -n "X_BEARER\|RAPID_API\|X_CLIENT" /Users/vuongluu/Documents/jobs/lab3/ceo-1/clawquest-1/.env.example | head -10
```

Add below the existing X/RAPID vars:
```
# TwitterAPI.io — used as primary fallback for X verification (post, follow, repost)
TWITTER_API_IO_KEY=
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "chore: add TWITTER_API_IO_KEY to .env.example"
```

---

### Task 5: Run full test suite

- [ ] **Step 1: Run all X module tests**

```bash
cd /Users/vuongluu/Documents/jobs/lab3/ceo-1/clawquest-1
pnpm --filter api test -- --run 2>&1 | tail -30
```

Expected: All tests pass. No regressions in `x-rest-client.test.ts`.

- [ ] **Step 2: Fix any failures**

If tests fail, investigate the output and fix. Common causes:
- Import name conflicts (check `rapidCheckUserRetweeted` vs `checkUserRetweeted` naming)
- TypeScript strict null issues

- [ ] **Step 3: Final compile check**

```bash
pnpm --filter api exec tsc --noEmit
```

- [ ] **Step 4: Final commit if any fixes**

```bash
git add -p
git commit -m "fix(x): resolve import conflicts after TwitterAPI.io integration"
```

---

## Notes on `like_post`

TwitterAPI.io has **no "user liked tweets" endpoint** — only `POST /like_tweet_v2` (action, requires login cookie). The `like_post` case in `verifyXAction` is left unchanged: it continues to use X API app bearer (`checkUserLikedTweet`) with RapidAPI as fallback.

## Cost Reference

| Endpoint | Cost |
|----------|------|
| `GET /twitter/tweets` | ~$0.15/1k tweets |
| `GET /twitter/user/check_follow_relationship` | 100 credits/call (~$0.001) |
| `GET /twitter/tweet/retweeters` | ~$0.15/1k users |
| `GET /twitter/user/followings` | ~$0.18/1k users |
