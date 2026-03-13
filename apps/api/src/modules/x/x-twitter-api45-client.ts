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
  /** Expanded URLs from entities — used to detect quoted tweet */
  entityUrls: string[]
}

/**
 * Fetch tweet by ID.
 * Endpoint: GET /tweet.php?id={tweetId}
 * Returns null if not found or API error.
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
 * Endpoint: GET /checkretweet.php?screenname={user}&tweet_id={tweetId}
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
    const url = `${BASE}/checkfollow.php?user=${encodeURIComponent(screenName)}&follows=${encodeURIComponent(targetHandle)}`
    const res = await fetch(url, {
      headers: headers(key),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    const raw = await res.text()
    if (!raw?.trim()) return null
    const data = JSON.parse(raw) as { is_follow?: boolean }
    return data.is_follow ?? false
  } catch {
    return null
  }
}
