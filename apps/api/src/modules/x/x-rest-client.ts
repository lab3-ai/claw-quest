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
    const clientSecret = process.env.X_CLIENT_SECRET
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
    console.log('refreshXToken data', data)

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

  const result = await refreshXToken(user.id, user.xRefreshToken, prisma)
  return result?.accessToken ?? null
}

// ── API Helpers ─────────────────────────────────────────────────

function authHeaders(token: string): Record<string, string> {
  return { 'Authorization': `Bearer ${token}` }
}

/** Returns the app-only Bearer Token from env, or null if not configured. */
export function getAppBearerToken(): string | null {
  return process.env.X_BEARER_TOKEN ?? null
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

/** Check if userXId retweeted tweetId. Paginates up to 10 pages (1000 results). */
export async function getRetweetedBy(
  token: string, tweetId: string, userXId: string,
): Promise<boolean | null> {
  try {
    let paginationToken: string | undefined
    for (let page = 0; page < 10; page++) {
      const url = new URL(`${X_API}/tweets/${tweetId}/retweeted_by`)
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
      if (data.data?.some(u => u.id === userXId)) return true
      paginationToken = data.meta?.next_token
      if (!paginationToken) break
    }
    return false
  } catch {
    return null
  }
}

/**
 * Check if userXId liked tweetId using app-only Bearer Token.
 * Endpoint: GET /2/users/{userXId}/liked_tweets. Paginates up to 10 pages (1000 likes).
 */
export async function checkUserLikedTweet(
  userXId: string, tweetId: string,
): Promise<boolean | null> {
  const token = getAppBearerToken()
  if (!token) return null
  try {
    let paginationToken: string | undefined
    for (let page = 0; page < 10; page++) {
      const url = new URL(`${X_API}/users/${userXId}/liked_tweets`)
      url.searchParams.set('max_results', '100')
      url.searchParams.set('tweet.fields', 'id')
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
      if (data.data?.some(t => t.id === tweetId)) return true
      paginationToken = data.meta?.next_token
      if (!paginationToken) break
    }
    return false
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

/** Get tweet with text content — returns authorId, text, and optional quoted tweet ID. */
export async function getTweetWithText(
  token: string, tweetId: string,
): Promise<{ authorId: string; text: string; quotedTweetId?: string } | null> {
  try {
    const res = await fetch(
      `${X_API}/tweets/${tweetId}?tweet.fields=author_id,text,referenced_tweets`,
      { headers: authHeaders(token), signal: AbortSignal.timeout(TIMEOUT_MS) },
    )
    if (!res.ok) return null
    const data = await res.json() as {
      data?: {
        author_id: string
        text: string
        referenced_tweets?: Array<{ type: string; id: string }>
      }
    }
    if (!data.data) return null
    const quoted = data.data.referenced_tweets?.find(r => r.type === 'quoted')
    return { authorId: data.data.author_id, text: data.data.text, quotedTweetId: quoted?.id }
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
