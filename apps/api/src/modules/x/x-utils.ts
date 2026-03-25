/**
 * Shared X (Twitter) utilities — no external dependencies.
 * Used by both x-rest-client (OAuth) and x-rapidapi-client (RapidAPI).
 */

/** Extract tweet ID from X/Twitter URL.
 *  Supports: 
 *  - https://x.com/user/status/123
 *  - https://twitter.com/user/status/123
 *  - URLs with query params, fragments, or trailing slashes
 */
export function extractTweetId(url: string): string | null {
  // Try multiple patterns to handle various URL formats
  // Pattern 1: Standard format (with or without trailing content)
  const match1 = url.match(/(?:twitter\.com|x\.com)\/[^\/\s?#]+\/status\/(\d+)/)
  if (match1?.[1]) return match1[1]

  // Pattern 2: Handle URLs with mobile format or other variations
  const match2 = url.match(/\/status[es]?\/(\d+)/)
  if (match2?.[1]) return match2[1]

  // Pattern 3: Direct tweet ID if URL is just a number (edge case)
  const justId = url.trim().match(/^(\d+)$/)
  if (justId?.[1]) return justId[1]

  return null
}

/** Normalise a Twitter handle — strips leading @, lowercases. */
export function normaliseHandle(handle: string): string {
  return handle.replace(/^@/, '').toLowerCase()
}
