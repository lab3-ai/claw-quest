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
