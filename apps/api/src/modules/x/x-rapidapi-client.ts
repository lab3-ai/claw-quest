/**
 * X (Twitter) RapidAPI client — twttrapi.p.rapidapi.com
 * Serverless tweet lookup without requiring user OAuth tokens.
 * Used for:
 *   - Agent claim verification (verify tweet contains activation code)
 *   - Quest task verification: post / quote_post (when user has no OAuth token)
 *
 * Env vars:
 *   RAPID_API_KEY                      — RapidAPI key (required)
 *   TWITTER_VERIFY_MENTION_CLAWQUEST   — require @clawquest mention (default: true)
 */

import { extractTweetId, normaliseHandle } from './x-utils'

const RAPIDAPI_HOST = 'twttrapi.p.rapidapi.com'
const RAPIDAPI_BASE = `https://${RAPIDAPI_HOST}`
const TIMEOUT_MS = 10_000

// ── Types ────────────────────────────────────────────────────────

export interface TweetAuthor {
    screenName: string
    name: string
    id: string
    followersCount: number
    followingCount: number
}

export interface TweetData {
    id: string
    text: string
    author: TweetAuthor
    mentionedHandles: string[]   // lowercased, no @
    quotedTweetId?: string
}

export interface TweetVerifyOptions {
    /** If set, tweet must be authored by this handle (case-insensitive, with or without @) */
    expectedAuthorUsername?: string
    /** Code that must appear somewhere in the tweet text */
    verificationCode?: string
    /** Require tweet to mention @clawquest (default: env TWITTER_VERIFY_MENTION_CLAWQUEST, fallback true) */
    requireMentionClawquest?: boolean
}

export interface TweetVerifyResult {
    verified: boolean
    reason?: string
    tweet?: TweetData
}

// ── Internal RapidAPI response shape ────────────────────────────

interface RapidApiTweetResponse {
    data?: {
        tweet_result?: {
            result?: {
                rest_id?: string
                core?: {
                    // API returns singular "user_result" (not "user_results")
                    user_result?: {
                        result?: {
                            rest_id?: string
                            legacy?: {
                                screen_name?: string
                                name?: string
                                followers_count?: number
                                friends_count?: number
                            }
                        }
                    }
                }
                legacy?: {
                    full_text?: string
                    entities?: {
                        user_mentions?: Array<{ screen_name?: string }>
                    }
                }
                note_tweet?: {
                    note_tweet_results?: {
                        result?: {
                            text?: string
                            entity_set?: {
                                user_mentions?: Array<{ screen_name?: string }>
                            }
                        }
                    }
                }
                quoted_status_id_str?: string
            }
        }
    }
}

// ── Helpers ──────────────────────────────────────────────────────

function rapidApiHeaders(apiKey: string): Record<string, string> {
    return {
        'x-rapidapi-host': RAPIDAPI_HOST,
        'x-rapidapi-key': apiKey,
    }
}

function parseTweet(id: string, raw: RapidApiTweetResponse): TweetData | null {
    const result = raw?.data?.tweet_result?.result
    if (!result) return null

    // API returns singular "user_result" (not "user_results")
    const authorResult = result.core?.user_result?.result
    const authorLegacy = authorResult?.legacy
    if (!authorLegacy?.screen_name) return null

    // Long tweets use note_tweet; standard tweets use legacy.full_text
    const noteTweet = result.note_tweet?.note_tweet_results?.result
    const text = noteTweet?.text ?? result.legacy?.full_text ?? ''

    // Merge mentions from both sources, deduplicate
    const legacyMentions = result.legacy?.entities?.user_mentions ?? []
    const noteMentions = noteTweet?.entity_set?.user_mentions ?? []
    const mentionedHandles = [
        ...new Set(
            [...legacyMentions, ...noteMentions]
                .map(m => normaliseHandle(m.screen_name ?? ''))
                .filter(Boolean),
        ),
    ]

    return {
        id,
        text,
        author: {
            screenName: authorLegacy.screen_name,
            name: authorLegacy.name ?? '',
            id: authorResult?.rest_id ?? '',
            followersCount: authorLegacy.followers_count ?? 0,
            followingCount: authorLegacy.friends_count ?? 0,
        },
        mentionedHandles,
        quotedTweetId: result.quoted_status_id_str ?? undefined,
    }
}

// ── Public API ───────────────────────────────────────────────────

/** Fetch a single tweet by ID. Returns null if not found or API unavailable. */
export async function fetchTweetById(
    tweetId: string,
    apiKey?: string,
): Promise<TweetData | null> {
    const key = apiKey ?? process.env.RAPID_API_KEY ?? ''
    if (!key) return null

    try {
        const res = await fetch(`${RAPIDAPI_BASE}/get-tweet?tweet_id=${tweetId}`, {
            headers: rapidApiHeaders(key),
            signal: AbortSignal.timeout(TIMEOUT_MS),
        })
        if (!res.ok) return null
        const data = await res.json() as RapidApiTweetResponse
        return parseTweet(tweetId, data)
    } catch {
        return null
    }
}

/** Fetch a tweet from a full URL. Returns null if URL invalid or tweet not found. */
export async function fetchTweetByUrl(
    tweetUrl: string,
    apiKey?: string,
): Promise<TweetData | null> {
    const tweetId = extractTweetId(tweetUrl)
    if (!tweetId) return null
    return fetchTweetById(tweetId, apiKey)
}

/**
 * Verify a tweet satisfies a set of conditions.
 *
 * Use cases:
 *  - Agent claim: verificationCode = first 8 chars of verificationToken
 *  - Quest post task: verificationCode = undefined, expectedAuthorUsername = user's X handle
 */
export async function verifyTweet(
    tweetUrl: string,
    options: TweetVerifyOptions = {},
): Promise<TweetVerifyResult> {
    const apiKey = process.env.RAPID_API_KEY ?? ''

    // Resolve requireMentionClawquest: options > env > default true
    const requireMention = options.requireMentionClawquest
        ?? (process.env.TWITTER_VERIFY_MENTION_CLAWQUEST !== 'false')

    // Step 1: Extract tweet ID
    const tweetId = extractTweetId(tweetUrl)
    if (!tweetId) {
        return { verified: false, reason: 'Invalid Twitter URL format' }
    }

    if (!apiKey) {
        return { verified: false, reason: 'Twitter verification not configured (missing RAPID_API_KEY)' }
    }

    // Step 2: Fetch tweet
    let tweet: TweetData | null
    try {
        const res = await fetch(`${RAPIDAPI_BASE}/get-tweet?tweet_id=${tweetId}`, {
            headers: rapidApiHeaders(apiKey),
            signal: AbortSignal.timeout(TIMEOUT_MS),
        })

        if (res.status === 429) {
            return { verified: false, reason: 'Rate limit exceeded — please try again later' }
        }
        if (!res.ok) {
            return { verified: false, reason: 'Tweet not found' }
        }

        const data = await res.json() as RapidApiTweetResponse
        tweet = parseTweet(tweetId, data)
    } catch (err: any) {
        if (err?.name === 'TimeoutError') {
            return { verified: false, reason: 'Twitter API timeout — please try again' }
        }
        return { verified: false, reason: 'Tweet not found' }
    }

    if (!tweet) {
        return { verified: false, reason: 'Tweet not found' }
    }

    // Step 3a: Check author
    if (options.expectedAuthorUsername) {
        const expected = normaliseHandle(options.expectedAuthorUsername)
        const actual = normaliseHandle(tweet.author.screenName)
        if (actual !== expected) {
            return {
                verified: false,
                reason: 'Tweet must be posted by your Twitter account',
                tweet,
            }
        }
    }

    // Step 3b: Check @clawquest mention
    if (requireMention) {
        const hasMention =
            tweet.mentionedHandles.includes('clawquest') ||
            tweet.text.toLowerCase().includes('@clawquest')

        if (!hasMention) {
            return {
                verified: false,
                reason: 'Tweet must mention @clawquest',
                tweet,
            }
        }
    }

    // Step 3c: Check verification code
    if (options.verificationCode && !tweet.text.includes(options.verificationCode)) {
        return {
            verified: false,
            reason: 'Tweet does not contain verification code',
            tweet,
        }
    }

    return { verified: true, tweet }
}

// Re-export extractTweetId for callers that only need the URL parser
export { extractTweetId } from './x-utils'
