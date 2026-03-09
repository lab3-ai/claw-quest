/**
 * Shared X (Twitter) utilities — no external dependencies.
 * Used by both x-rest-client (OAuth) and x-rapidapi-client (RapidAPI).
 */

/** Extract tweet ID from X/Twitter URL.
 *  Supports: https://x.com/user/status/123, https://twitter.com/user/status/123
 */
export function extractTweetId(url: string): string | null {
  const match = url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/)
  return match?.[1] ?? null
}

/** Normalise a Twitter handle — strips leading @, lowercases. */
export function normaliseHandle(handle: string): string {
  return handle.replace(/^@/, '').toLowerCase()
}
