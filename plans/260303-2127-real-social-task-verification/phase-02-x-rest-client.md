# Phase 2: X REST Client

## Context Links
- Discord REST client (pattern to mirror): `/Users/hd/clawquest/apps/api/src/modules/discord/discord-rest-client.ts`
- X API research: `/Users/hd/clawquest/plans/reports/researcher-260303-x-api-v2-basic-tier.md`
- Prisma schema (User model): `/Users/hd/clawquest/apps/api/prisma/schema.prisma`

## Overview
- **Priority:** P1 (blocks Phase 3)
- **Status:** completed
- **Effort:** 3h
- **Depends on:** Phase 1

Create `x-rest-client.ts` — bare fetch, no SDK, mirrors discord-rest-client pattern. Handles token refresh, rate limits, all verification endpoints.

## Key Insights
- Discord client: 118 lines, bare fetch, AbortSignal.timeout(8000), null-on-error pattern
- X access token: 2h, refresh: 6mo one-time use (rotates). Must write new tokens back to DB.
- Rate limits per-user: 15 req/15min for engagement endpoints, 300 for tweet/user lookup
- All endpoints need user OAuth token (not app token) — scopes: tweet.read users.read follows.read like.read retweet.read

## Requirements

### Functional
- `refreshXToken(userId, refreshToken)` — refresh expired token, persist new tokens to DB
- `checkFollowing(accessToken, userId, targetUserId)` — GET /2/users/:id/following, paginate to find target
- `getLikingUsers(accessToken, tweetId, targetUserId)` — check if user in liking_users list
- `getRetweetedBy(accessToken, tweetId, targetUserId)` — check if user in retweeted_by list
- `getTweet(accessToken, tweetId)` — get tweet author_id + referenced_tweets
- `lookupUserByUsername(accessToken, username)` — resolve @handle to user ID
- Auto-refresh: each function checks expiry, refreshes if needed

### Non-functional
- 8s timeout on all fetch calls (match Discord pattern)
- Graceful null returns on error (match Discord pattern)
- No external dependencies (bare fetch)

## Architecture

```
x-rest-client.ts (~150 lines)
├── const X_API = 'https://api.x.com/2'
├── const TIMEOUT_MS = 8000
├── refreshXToken(userId, refreshToken, prisma) → { accessToken, refreshToken }
├── ensureFreshToken(user, prisma) → string | null  // auto-refresh wrapper
├── checkFollowing(token, userXId, targetXId) → boolean | null
├── getLikingUsers(token, tweetId, userXId) → boolean | null
├── getRetweetedBy(token, tweetId, userXId) → boolean | null
├── getTweet(token, tweetId) → { authorId, referencedTweetId? } | null
└── lookupUserByUsername(token, username) → string | null  // returns X user ID
```

## Related Code Files

### Create
- `apps/api/src/modules/x/x-rest-client.ts`

## Implementation Steps

### 1. Create module directory

```bash
mkdir -p apps/api/src/modules/x
```

### 2. Implement x-rest-client.ts

```typescript
/**
 * Lightweight X (Twitter) REST client — bare fetch(), no SDK.
 * Mirrors discord-rest-client.ts pattern.
 */
import { PrismaClient } from '@prisma/client'

const X_API = 'https://api.x.com/2'
const X_TOKEN_URL = 'https://api.x.com/2/oauth2/token'
const TIMEOUT_MS = 8000

// ── Token Refresh ──────────────────────────────────────────────

/** Refresh X OAuth token. Returns new tokens or null on failure.
 *  Writes refreshed tokens back to DB. */
export async function refreshXToken(
  userId: string,
  refreshToken: string,
  prisma: PrismaClient,
): Promise<{ accessToken: string; refreshToken: string } | null> {
  const clientId = process.env.X_CLIENT_ID
  const clientSecret = process.env.X_CLIENT_SECRET
  if (!clientId) return null

  try {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      refresh_token: refreshToken,
    })

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    }
    // Confidential client: add Basic auth
    if (clientSecret) {
      headers['Authorization'] = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
    }

    const res = await fetch(X_TOKEN_URL, {
      method: 'POST',
      headers,
      body: body.toString(),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })

    if (!res.ok) return null

    const data = await res.json() as {
      access_token: string
      refresh_token: string
      expires_in: number
    }

    // Persist new tokens to DB
    await prisma.user.update({
      where: { id: userId },
      data: {
        xAccessToken: data.access_token,
        xRefreshToken: data.refresh_token,
        xTokenExpiry: new Date(Date.now() + data.expires_in * 1000),
      },
    })

    return { accessToken: data.access_token, refreshToken: data.refresh_token }
  } catch {
    return null
  }
}

/** Ensure user has a fresh X access token. Auto-refreshes if expired. */
export async function ensureFreshToken(
  user: { id: string; xAccessToken?: string | null; xRefreshToken?: string | null; xTokenExpiry?: Date | null },
  prisma: PrismaClient,
): Promise<string | null> {
  if (!user.xAccessToken || !user.xRefreshToken) return null

  // Token still valid (5min buffer)
  if (user.xTokenExpiry && user.xTokenExpiry.getTime() > Date.now() + 5 * 60 * 1000) {
    return user.xAccessToken
  }

  // Refresh needed
  const result = await refreshXToken(user.id, user.xRefreshToken, prisma)
  return result?.accessToken ?? null
}

// ── API Helpers ─────────────────────────────────────────────────

function authHeaders(token: string): Record<string, string> {
  return { 'Authorization': `Bearer ${token}` }
}

// ── Verification Endpoints ──────────────────────────────────────

/** Check if userXId follows targetXId. Paginates up to 1000 results. */
export async function checkFollowing(
  token: string, userXId: string, targetXId: string,
): Promise<boolean | null> {
  try {
    let paginationToken: string | undefined
    for (let page = 0; page < 10; page++) {
      const url = new URL(`${X_API}/users/${userXId}/following`)
      url.searchParams.set('max_results', '100')
      url.searchParams.set('user.fields', 'id')
      if (paginationToken) url.searchParams.set('pagination_token', paginationToken)

      const res = await fetch(url.toString(), {
        headers: authHeaders(token),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      if (!res.ok) return null

      const data = await res.json() as {
        data?: Array<{ id: string }>
        meta?: { next_token?: string }
      }
      if (data.data?.some(u => u.id === targetXId)) return true
      paginationToken = data.meta?.next_token
      if (!paginationToken) break
    }
    return false
  } catch {
    return null
  }
}

/** Check if userXId is in liking_users of tweetId. Max 100 results. */
export async function getLikingUsers(
  token: string, tweetId: string, userXId: string,
): Promise<boolean | null> {
  try {
    const res = await fetch(
      `${X_API}/tweets/${tweetId}/liking_users?user.fields=id&max_results=100`,
      { headers: authHeaders(token), signal: AbortSignal.timeout(TIMEOUT_MS) },
    )
    if (!res.ok) return null
    const data = await res.json() as { data?: Array<{ id: string }> }
    return data.data?.some(u => u.id === userXId) ?? false
  } catch {
    return null
  }
}

/** Check if userXId retweeted tweetId. Max 100 results. */
export async function getRetweetedBy(
  token: string, tweetId: string, userXId: string,
): Promise<boolean | null> {
  try {
    const res = await fetch(
      `${X_API}/tweets/${tweetId}/retweeted_by?user.fields=id&max_results=100`,
      { headers: authHeaders(token), signal: AbortSignal.timeout(TIMEOUT_MS) },
    )
    if (!res.ok) return null
    const data = await res.json() as { data?: Array<{ id: string }> }
    return data.data?.some(u => u.id === userXId) ?? false
  } catch {
    return null
  }
}

/** Get tweet details — returns authorId and optional quoted tweet ID. */
export async function getTweet(
  token: string, tweetId: string,
): Promise<{ authorId: string; quotedTweetId?: string } | null> {
  try {
    const res = await fetch(
      `${X_API}/tweets/${tweetId}?tweet.fields=author_id,referenced_tweets`,
      { headers: authHeaders(token), signal: AbortSignal.timeout(TIMEOUT_MS) },
    )
    if (!res.ok) return null
    const data = await res.json() as {
      data?: {
        author_id: string
        referenced_tweets?: Array<{ type: string; id: string }>
      }
    }
    if (!data.data) return null
    const quoted = data.data.referenced_tweets?.find(r => r.type === 'quoted')
    return { authorId: data.data.author_id, quotedTweetId: quoted?.id }
  } catch {
    return null
  }
}

/** Resolve @username to X user ID. */
export async function lookupUserByUsername(
  token: string, username: string,
): Promise<string | null> {
  try {
    const handle = username.replace(/^@/, '')
    const res = await fetch(
      `${X_API}/users/by/username/${encodeURIComponent(handle)}?user.fields=id`,
      { headers: authHeaders(token), signal: AbortSignal.timeout(TIMEOUT_MS) },
    )
    if (!res.ok) return null
    const data = await res.json() as { data?: { id: string } }
    return data.data?.id ?? null
  } catch {
    return null
  }
}
```

**Line count:** ~150 lines. Under 200-line limit.

## Todo List

- [ ] Create `apps/api/src/modules/x/` directory
- [ ] Implement x-rest-client.ts with all 7 exported functions
- [ ] Compile check: `pnpm --filter api build`

## Success Criteria
- All 7 functions exported and compile
- Token refresh writes back to DB
- Pagination in checkFollowing (up to 1000 users)
- Graceful null returns on any error
- Under 200 lines

## Risk Assessment
- **Rate limits:** 15 req/15min for following/liking/retweeted. Per-user tokens mitigate this. If rate limited, function returns null (caller handles gracefully).
- **One-time refresh token:** If two concurrent requests both try to refresh, one will fail. Mitigation: `ensureFreshToken` has 5min buffer so concurrent calls during valid window share same token. Edge case: if both trigger refresh simultaneously, second refresh will use stale token and fail — user must re-link.

## Next Steps
- Phase 3 calls these functions from social-validator.ts
