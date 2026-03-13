# X Twitter-API45 Client Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace X verification logic in `verifyXAction` with a new RapidAPI client using `twitter-api45.p.rapidapi.com`, keeping existing clients untouched.

**Architecture:** Create a new thin client `x-twitter-api45-client.ts` wrapping 3 endpoints (getTweet, checkRetweet, checkFollow). Update only the `verifyXAction` function in `social-action-verifier.ts` to use this new client. `like_post` task auto-passes (returns `valid: true`).

**Tech Stack:** TypeScript, fetch, `twitter-api45.p.rapidapi.com`, env var `RAPID_API_KEY`

---

## New API Reference (twitter-api45.p.rapidapi.com)

| Endpoint | Params | Response |
|---|---|---|
| `GET /tweet.php` | `id={tweetId}` | `{ author: { screen_name, rest_id }, text, ... }` |
| `GET /checkretweet.php` | `screenname={user}&tweet_id={id}` | `{ is_retweeted: bool, status: "ok" }` |
| `GET /checkfollow.php` | `screenname={user}&target={targetHandle}` | `{ is_follow: bool, username: string }` |

> Note: RAPIDAPI.md shows `checkfollow` curl using `checkretweet.php` URL — likely a doc typo. Use `checkfollow.php` with `screenname` + `target` params. If wrong, switch to actual endpoint and update.

---

## File Map

| Action | File |
|---|---|
| **Create** | `apps/api/src/modules/x/x-twitter-api45-client.ts` |
| **Modify** | `apps/api/src/modules/quests/social-action-verifier.ts` |
| **No change** | `apps/api/src/modules/x/x-rest-client.ts` |
| **No change** | `apps/api/src/modules/x/x-rapidapi-client.ts` |

---

## Chunk 1: New RapidAPI Client

### Task 1: Create x-twitter-api45-client.ts

**Files:**
- Create: `apps/api/src/modules/x/x-twitter-api45-client.ts`

- [ ] **Step 1: Create the client file**

```typescript
/**
 * X (Twitter) client via twitter-api45.p.rapidapi.com
 * Used for quest task verification: post, quote_post, follow_account, repost.
 * Env: RAPID_API_KEY
 */

const HOST = 'twitter-api45.p.rapidapi.com'
const BASE = `https://${HOST}`
const TIMEOUT_MS = 10_000

function headers(apiKey: string): Record<string, string> {
  return {
    'x-rapidapi-host': HOST,
    'x-rapidapi-key': apiKey,
  }
}

export interface TweetInfo {
  /** Author screen name (handle without @) */
  authorScreenName: string
  /** Author numeric ID */
  authorId: string
  /** Tweet text content */
  text: string
  /** URLs in entities — used to detect quoted tweet */
  entityUrls: string[]
}

/**
 * Fetch tweet by ID. Returns null if not found or API error.
 * Endpoint: GET /tweet.php?id={tweetId}
 */
export async function getTweetInfo(
  tweetId: string, apiKey?: string,
): Promise<TweetInfo | null> {
  const key = apiKey ?? process.env.RAPID_API_KEY ?? ''
  if (!key) return null
  try {
    const res = await fetch(`${BASE}/tweet.php?id=${encodeURIComponent(tweetId)}`, {
      headers: headers(key),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) return null
    const data = await res.json() as {
      author?: { screen_name?: string; rest_id?: string }
      text?: string
      entities?: { urls?: Array<{ expanded_url?: string }> }
    }
    const screenName = data.author?.screen_name
    if (!screenName) return null
    return {
      authorScreenName: screenName,
      authorId: data.author?.rest_id ?? '',
      text: data.text ?? '',
      entityUrls: (data.entities?.urls ?? []).map(u => u.expanded_url ?? '').filter(Boolean),
    }
  } catch {
    return null
  }
}

/**
 * Check if user retweeted a tweet.
 * Endpoint: GET /checkretweet.php?screenname={user}&tweet_id={id}
 * Returns null on API error.
 */
export async function checkRetweet(
  screenName: string, tweetId: string, apiKey?: string,
): Promise<boolean | null> {
  const key = apiKey ?? process.env.RAPID_API_KEY ?? ''
  if (!key) return null
  try {
    const url = `${BASE}/checkretweet.php?screenname=${encodeURIComponent(screenName)}&tweet_id=${encodeURIComponent(tweetId)}`
    const res = await fetch(url, {
      headers: headers(key),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) return null
    const data = await res.json() as { is_retweeted?: boolean; status?: string }
    if (data.status !== 'ok') return null
    return data.is_retweeted ?? false
  } catch {
    return null
  }
}

/**
 * Check if user follows a target account.
 * Endpoint: GET /checkfollow.php?screenname={user}&target={targetHandle}
 * Returns null on API error.
 */
export async function checkFollow(
  screenName: string, targetHandle: string, apiKey?: string,
): Promise<boolean | null> {
  const key = apiKey ?? process.env.RAPID_API_KEY ?? ''
  if (!key) return null
  try {
    const url = `${BASE}/checkfollow.php?screenname=${encodeURIComponent(screenName)}&target=${encodeURIComponent(targetHandle)}`
    const res = await fetch(url, {
      headers: headers(key),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) return null
    const data = await res.json() as { is_follow?: boolean }
    return data.is_follow ?? false
  } catch {
    return null
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm --filter api build 2>&1 | head -30
```
Expected: No errors for the new file (other errors from rest of project OK if pre-existing).

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/x/x-twitter-api45-client.ts
git commit -m "feat(x): add twitter-api45 client for retweet, follow, tweet lookup"
```

---

## Chunk 2: Update verifyXAction

### Task 2: Rewrite verifyXAction to use new client

**Files:**
- Modify: `apps/api/src/modules/quests/social-action-verifier.ts`

**Current behavior** (to replace):
- `post` / `quote_post`: OAuth path → RapidAPI (twttrapi) fallback
- `follow_account`: OAuth path → checkUserFollows (twttrapi) fallback
- `repost`: bearerToken (X API) → checkUserRetweeted (twttrapi) fallback
- `like_post`: checkUserLikedTweet (X API + twttrapi fallback)

**New behavior**:
- `post`: getTweetInfo(proofTweetId) → verify author matches xHandle (case-insensitive)
- `quote_post`: getTweetInfo(proofTweetId) → verify author + check entityUrls or text contains target tweet ID
- `follow_account`: checkFollow(xHandle, targetHandle)
- `repost`: checkRetweet(xHandle, tweetId)
- `like_post`: **always return `{ valid: true }`** (no verification)
- All: require `xHandle`, return error if missing

- [ ] **Step 1: Update imports in social-action-verifier.ts**

Replace the x-client imports at top of file. The old imports from `x-rest-client` and `x-rapidapi-client` in `verifyXAction` are no longer used (keep file imports as-is — don't delete from file, just stop using in this function).

Add new import:
```typescript
import { getTweetInfo, checkRetweet, checkFollow } from '../x/x-twitter-api45-client'
```

- [ ] **Step 2: Replace the verifyXAction function body**

Replace the entire `verifyXAction` function (lines ~37-157 in current file):

```typescript
async function verifyXAction(
  actionType: string, ctx: VerificationContext, taskIndex: number,
): Promise<SocialValidationResult> {
  const targetValue = ctx.params?.targetUrl || ctx.params?.postUrl || ctx.params?.accountHandle || ctx.params?.username || ''

  switch (actionType) {
    case 'post':
    case 'quote_post': {
      const proofUrl = ctx.proofUrls?.[taskIndex]
      if (!proofUrl) return { valid: false, error: 'Paste your tweet URL to verify' }
      const proofTweetId = extractTweetId(proofUrl)
      if (!proofTweetId) return { valid: false, error: 'Invalid tweet URL — use format: https://x.com/.../status/...' }
      if (!ctx.xHandle) return { valid: false, error: 'Link your X account to verify this task' }

      const tweet = await getTweetInfo(proofTweetId)
      if (!tweet) return { valid: false, error: 'Tweet not found — is it public?' }

      const authorMatch = normaliseHandle(tweet.authorScreenName) === normaliseHandle(ctx.xHandle)
      if (!authorMatch) return { valid: false, error: 'This tweet was not posted by your linked X account' }

      if (actionType === 'quote_post') {
        const targetTweetId = extractTweetId(targetValue)
        if (targetTweetId) {
          const quoteOk =
            tweet.entityUrls.some(u => u.includes(targetTweetId)) ||
            tweet.text.includes(targetTweetId)
          if (!quoteOk) return { valid: false, error: 'This tweet does not quote the required post' }
        }
      }
      return { valid: true }
    }

    case 'follow_account': {
      if (!ctx.xHandle) return { valid: false, error: 'Link your X account to verify this task' }
      const targetHandle = targetValue.replace(/^@/, '').replace(/^https?:\/\/(x|twitter)\.com\//, '').split('/')[0]
      if (!targetHandle) return { valid: false, error: 'Quest task missing target account — contact quest creator' }

      const follows = await checkFollow(ctx.xHandle, targetHandle)
      if (follows === null) return { valid: false, error: 'Follow verification unavailable — try again later' }
      return follows ? { valid: true } : { valid: false, error: 'not following this account' }
    }

    case 'repost': {
      if (!ctx.xHandle) return { valid: false, error: 'Link your X account to verify this task' }
      const tweetId = extractTweetId(targetValue) || targetValue
      if (!tweetId) return { valid: false, error: 'Quest task missing tweet URL — contact quest creator' }

      const retweeted = await checkRetweet(ctx.xHandle, tweetId)
      if (retweeted === null) return { valid: false, error: 'Repost verification unavailable — try again later' }
      return retweeted ? { valid: true } : { valid: false, error: 'You have not reposted this tweet' }
    }

    case 'like_post':
      // Like verification not supported via this API — auto-pass
      return { valid: true }

    default:
      return { valid: true }
  }
}
```

- [ ] **Step 3: Build to verify no TypeScript errors**

```bash
pnpm --filter api build 2>&1 | head -40
```
Expected: Build succeeds (or only pre-existing errors unrelated to these files).

- [ ] **Step 4: Run linter**

```bash
pnpm --filter api lint 2>&1 | grep -E "social-action-verifier|x-twitter-api45" | head -20
```
Expected: No new lint errors in these two files.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/quests/social-action-verifier.ts apps/api/src/modules/x/x-twitter-api45-client.ts
git commit -m "feat(quests): use twitter-api45 for X task verification, like_post auto-pass"
```

---

## Notes

- **`like_post` always passes**: API doesn't reliably support like verification; business decision to auto-pass.
- **`xHandle` required**: All verifications require user's linked X handle. No OAuth token path.
- **Existing clients untouched**: `x-rest-client.ts` and `x-rapidapi-client.ts` remain but are no longer called from `verifyXAction`.
- **`checkfollow.php` endpoint**: If the actual endpoint differs from `checkfollow.php`, update only the URL in `x-twitter-api45-client.ts`.
- **`quote_post` detection**: Relies on the target tweet ID appearing in `entityUrls` or tweet text. If the API returns a dedicated `quoted_status_id` field, update `getTweetInfo` to extract it.
