/**
 * X (Twitter) RapidAPI client — twttrapi.p.rapidapi.com
 * Serverless tweet lookup without requiring user OAuth tokens.
 * Used for:
 *   - Agent claim verification (verify tweet contains activation code)
 *   - Quest task verification: post / quote_post (when user has no OAuth token)
 *
 * Env vars:
 *   RAPID_API_KEY                      — RapidAPI key (required)
 *   TWITTER_VERIFY_MENTION_CLAWQUEST   — require @clawquest_ai mention (default: true)
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
    /** Require tweet to mention @clawquest_ai  (default: env TWITTER_VERIFY_MENTION_CLAWQUEST, fallback true) */
    requireMentionClawquest?: boolean
}

export interface TweetVerifyResult {
    verified: boolean
    reason?: string
    tweet?: TweetData
}

// ── Internal RapidAPI response shape (twttrapi) ────────────────────
// /tweet-v2 may return tweet_result (internal) or v2-style data+includes.

interface RapidApiTweetResponse {
    data?: {
        tweet_result?: {
            result?: {
                rest_id?: string
                core?: {
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
        // v2-style (optional): id, text, author_id, referenced_tweets
        id?: string
        text?: string
        author_id?: string
        referenced_tweets?: Array<{ type?: string; id?: string }>
        entities?: { mentions?: Array<{ username?: string }> }
    }
    includes?: {
        users?: Array<{
            id?: string
            username?: string
            name?: string
            public_metrics?: { followers_count?: number; following_count?: number }
        }>
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
    const parsed = parseTweetInternal(id, raw) ?? parseTweetV2Style(id, raw) ?? parseTweetFlexible(id, raw, raw)
    return parsed
}

function parseTweetInternal(id: string, raw: RapidApiTweetResponse): TweetData | null {
    const result = raw?.data?.tweet_result?.result
    if (!result) return null

    const authorResult = result.core?.user_result?.result
    const authorLegacy = authorResult?.legacy
    if (!authorLegacy?.screen_name) return null

    const noteTweet = result.note_tweet?.note_tweet_results?.result
    const text = noteTweet?.text ?? result.legacy?.full_text ?? ''

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

/** Fallback for twttrapi /tweet-v2 when response is Twitter API v2 style (data + includes.users). */
function parseTweetV2Style(id: string, raw: RapidApiTweetResponse): TweetData | null {
    const d = raw?.data
    if (!d?.text && !d?.id) return null
    const authorId = d.author_id
    const users = raw.includes?.users ?? []
    const author = authorId ? users.find(u => u.id === authorId) : users[0]
    if (!author?.username) return null
    const mentionedHandles = (d.entities?.mentions ?? []).map(m => normaliseHandle(m.username ?? '')).filter(Boolean)
    const quoted = d.referenced_tweets?.find(r => r.type === 'quoted')
    return {
        id: d.id ?? id,
        text: d.text ?? '',
        author: {
            screenName: author.username,
            name: author.name ?? '',
            id: author.id ?? '',
            followersCount: author.public_metrics?.followers_count ?? 0,
            followingCount: author.public_metrics?.following_count ?? 0,
        },
        mentionedHandles,
        quotedTweetId: quoted?.id,
    }
}

/** Last-resort: scan for tweet-like object (text/full_text + author) in nested response. */
function parseTweetFlexible(id: string, raw: unknown, root?: unknown): TweetData | null {
    if (!raw || typeof raw !== 'object') return null
    const rootObj = (root ?? raw) as Record<string, unknown>
    const obj = raw as Record<string, unknown>
    const legacy = obj.legacy as Record<string, unknown> | undefined
    const noteTweet = (obj.note_tweet as { note_tweet_results?: { result?: { text?: string } } })?.note_tweet_results?.result?.text
    const text =
        typeof obj.full_text === 'string' ? obj.full_text
            : typeof obj.text === 'string' ? obj.text
                : typeof legacy?.full_text === 'string' ? legacy.full_text
                    : typeof noteTweet === 'string' ? noteTweet
                        : null
    if (!text) {
        const data = obj.data as Record<string, unknown> | undefined
        if (data && typeof data === 'object') {
            const inner = (data.tweet_result as { result?: Record<string, unknown> })?.result ?? data.result ?? data
            if (inner && typeof inner === 'object') return parseTweetFlexible(id, inner, rootObj)
            return parseTweetFlexible(id, data, rootObj)
        }
        const result = obj.result as Record<string, unknown> | undefined
        if (result && typeof result === 'object') return parseTweetFlexible(id, result, rootObj)
        return null
    }
    let screenName = ''
    let name = ''
    let authorId = ''
    let followersCount = 0
    let followingCount = 0
    if (typeof obj.author_id === 'string') {
        authorId = obj.author_id
        type IncludesUsers = { includes?: { users?: Array<{ id?: string; username?: string; name?: string; public_metrics?: { followers_count?: number; following_count?: number } }> } }
        const rootIncludes = (rootObj as IncludesUsers).includes
        const user = rootIncludes?.users?.find((u: { id?: string }) => u.id === authorId)
        if (user) {
            screenName = (user as { username?: string }).username ?? ''
            name = (user as { name?: string }).name ?? ''
            authorId = (user as { id?: string }).id ?? authorId
            const pm = (user as { public_metrics?: { followers_count?: number; following_count?: number } }).public_metrics
            followersCount = pm?.followers_count ?? 0
            followingCount = pm?.following_count ?? 0
        }
    }
    const core = obj.core as { user_result?: { result?: { legacy?: { screen_name?: string; name?: string; followers_count?: number; friends_count?: number }; rest_id?: string } } } | undefined
    const authorLegacy = core?.user_result?.result?.legacy
    if (authorLegacy && typeof authorLegacy.screen_name === 'string') {
        screenName = authorLegacy.screen_name
        name = String(authorLegacy.name ?? '')
        authorId = core?.user_result?.result?.rest_id ?? authorId
        followersCount = Number(authorLegacy.followers_count ?? 0)
        followingCount = Number(authorLegacy.friends_count ?? 0)
    }
    if (!screenName) return null
    const entities = (obj.entities as { user_mentions?: Array<{ screen_name?: string }> })?.user_mentions ?? (obj.entities as { mentions?: Array<{ username?: string }> })?.mentions
    const mentionedHandles = Array.isArray(entities)
        ? entities.map((m: { screen_name?: string; username?: string }) => normaliseHandle((m as { screen_name?: string }).screen_name ?? (m as { username?: string }).username ?? '')).filter(Boolean)
        : []
    const quoted = (obj.quoted_status_id_str as string) ?? (obj.referenced_tweets as Array<{ type?: string; id?: string }>)?.find(r => r.type === 'quoted')?.id
    return {
        id: typeof obj.rest_id === 'string' ? obj.rest_id : typeof obj.id === 'string' ? obj.id : id,
        text,
        author: { screenName, name, id: authorId, followersCount, followingCount },
        mentionedHandles: [...new Set(mentionedHandles)],
        quotedTweetId: quoted ?? undefined,
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

    const url = `${RAPIDAPI_BASE}/tweet-v2?pid=${encodeURIComponent(tweetId)}`
    try {
        const res = await fetch(url, {
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

    // Step 2: Fetch tweet (try multiple endpoints for better compatibility)
    let tweet: TweetData | null = null
    const endpoints = [
        `/tweet-v2?pid=${encodeURIComponent(tweetId)}`,
        `/get-tweet?tweet_id=${encodeURIComponent(tweetId)}`,
    ]

    let lastError: string | null = null

    for (const endpoint of endpoints) {
        try {
            const url = `${RAPIDAPI_BASE}${endpoint}`
            const res = await fetch(url, {
                headers: rapidApiHeaders(apiKey),
                signal: AbortSignal.timeout(TIMEOUT_MS),
            })

            if (res.status === 429) {
                return { verified: false, reason: 'Rate limit exceeded — please try again later' }
            }

            if (res.status === 402) {
                return { verified: false, reason: 'RapidAPI payment required — your API key may have exceeded its quota or subscription limit' }
            }

            if (!res.ok) {
                // Try to get error details from response
                let errorDetail = ''
                let errorBody = ''
                try {
                    errorBody = await res.text()
                    if (errorBody) {
                        const parsed = JSON.parse(errorBody)
                        errorDetail = parsed.message || parsed.error || parsed.detail || errorBody.substring(0, 200)

                        // Check for common RapidAPI error messages
                        if (errorDetail.toLowerCase().includes('quota') ||
                            errorDetail.toLowerCase().includes('credit') ||
                            errorDetail.toLowerCase().includes('subscription')) {
                            return { verified: false, reason: `RapidAPI quota exceeded: ${errorDetail}` }
                        }
                    }
                } catch {
                    errorDetail = `HTTP ${res.status}`
                }

                // Store error for fallback to next endpoint
                lastError = `Endpoint ${endpoint}: ${res.status} - ${errorDetail || 'Unknown error'}`

                // If 404, try next endpoint; otherwise return error immediately
                if (res.status === 404) {
                    continue // Try next endpoint
                }

                if (res.status === 403 || res.status === 401) {
                    return { verified: false, reason: 'Twitter API authentication failed — please check API configuration or subscription status' }
                }

                // For other errors, try next endpoint if available
                if (endpoint !== endpoints[endpoints.length - 1]) {
                    continue
                }

                return { verified: false, reason: `Tweet verification failed (${res.status}): ${errorDetail || 'Unknown error'}` }
            }

            // Success - parse response
            const data = await res.json() as RapidApiTweetResponse
            tweet = parseTweet(tweetId, data)

            // If successfully parsed, break out of loop
            if (tweet) {
                break
            }

            // If parse failed, try next endpoint
            lastError = `Failed to parse response from ${endpoint}`
        } catch (err: any) {
            lastError = `Error fetching from ${endpoint}: ${err?.message || 'Unknown error'}`
            // Try next endpoint if available
            if (endpoint !== endpoints[endpoints.length - 1]) {
                continue
            }

            if (err?.name === 'TimeoutError') {
                return { verified: false, reason: 'Twitter API timeout — please try again' }
            }
            return { verified: false, reason: `Tweet verification error: ${err?.message || 'Unknown error'}` }
        }
    }

    // If we get here and tweet is still null, all endpoints failed
    if (!tweet) {
        if (lastError?.includes('404')) {
            return { verified: false, reason: `Tweet not found (tweet ID: ${tweetId}) — the tweet may have been deleted, is private, or the URL is invalid. Error: ${lastError}` }
        }
        return { verified: false, reason: `Failed to fetch tweet: ${lastError || 'All endpoints failed'}` }
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

    // Step 3b: Check @clawquest_ai mention
    if (requireMention) {
        const hasMention =
            tweet.mentionedHandles.includes('clawquest_ai') ||
            tweet.text.toLowerCase().includes('@clawquest_ai')

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

// ── User-action verification via RapidAPI ────────────────────────
// Used to verify like_post / repost / follow_account without OAuth tokens.
// Identifies users by xHandle (screen_name) rather than xId.

interface RapidApiUserListResponse {
    data?: {
        users?: Array<{
            result?: {
                rest_id?: string
                legacy?: { screen_name?: string }
            }
        }>
    }
    next_cursor?: string
}

/** Extract screen_names from deeply-nested or flat user-list RapidAPI responses. */
function extractScreenNames(data: unknown): string[] {
    if (!data || typeof data !== 'object') return []
    const names: string[] = []
    // Flat format: { data: { users: [{ result: { legacy: { screen_name } } }] } }
    const flat = (data as RapidApiUserListResponse)?.data?.users ?? []
    for (const u of flat) {
        const sn = u.result?.legacy?.screen_name
        if (sn) names.push(normaliseHandle(sn))
    }
    // If flat format found users, return
    if (names.length > 0) return names
    // Fallback: recursively scan for screen_name strings (handles deeply nested formats)
    function scan(obj: unknown): void {
        if (!obj || typeof obj !== 'object') return
        if (Array.isArray(obj)) { obj.forEach(scan); return }
        const o = obj as Record<string, unknown>
        if (typeof o['screen_name'] === 'string') names.push(normaliseHandle(o['screen_name'] as string))
        for (const v of Object.values(o)) scan(v)
    }
    scan(data)
    return names
}


/** Extract pagination cursor from RapidAPI user-list responses. */
function extractNextCursor(data: unknown): string | null {
    if (!data || typeof data !== 'object') return null
    const flat = (data as RapidApiUserListResponse).next_cursor
    if (flat) return flat
    // Scan for cursor strings in nested formats
    function findCursor(obj: unknown): string | null {
        if (!obj || typeof obj !== 'object') return null
        if (Array.isArray(obj)) {
            for (const item of obj) { const c = findCursor(item); if (c) return c }
            return null
        }
        const o = obj as Record<string, unknown>
        for (const [k, v] of Object.entries(o)) {
            if ((k === 'next_cursor' || k === 'cursor_bottom' || k === 'cursor') && typeof v === 'string' && v) return v
            const c = findCursor(v); if (c) return c
        }
        return null
    }
    return findCursor(data)
}

/** Recursively extract tweet id_str values from any twttrapi response format. */
function extractTweetIds(data: unknown): string[] {
    const ids: string[] = []
    function scan(obj: unknown): void {
        if (!obj || typeof obj !== 'object') return
        if (Array.isArray(obj)) { obj.forEach(scan); return }
        const o = obj as Record<string, unknown>
        if (typeof o['id_str'] === 'string' && /^\d+$/.test(o['id_str'] as string)) ids.push(o['id_str'] as string)
        for (const v of Object.values(o)) scan(v)
    }
    scan(data)
    return ids
}

/**
 * Check if a user (identified by xId) liked a given tweet.
 * Uses twttrapi GET /user/likes?user_id={xId}. Paginates up to 5 pages (~500 likes max). Returns null on API error.
 */
export async function checkUserLikedTweet(
    tweetId: string, xId: string, apiKey?: string,
): Promise<boolean | null> {
    const key = apiKey ?? process.env.RAPID_API_KEY ?? ''
    if (!key) return null
    let cursor = ''
    for (let page = 0; page < 5; page++) {
        try {
            const url = `${RAPIDAPI_BASE}/user/likes?user_id=${encodeURIComponent(xId)}&count=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`
            const res = await fetch(url, { headers: rapidApiHeaders(key), signal: AbortSignal.timeout(TIMEOUT_MS) })
            if (!res.ok) return null
            const data = await res.json() as unknown
            const ids = extractTweetIds(data)
            if (ids.includes(tweetId)) return true
            const next = extractNextCursor(data)
            if (!next || ids.length === 0) return false
            cursor = next
        } catch {
            return null
        }
    }
    return false
}

/**
 * Check if a user (identified by xHandle) retweeted a given tweet.
 * Uses twttrapi GET /tweet/retweeted-by?tweet_id={tweetId}. Paginates up to 3 pages. Returns null on API error.
 */
export async function checkUserRetweeted(
    tweetId: string, xHandle: string, apiKey?: string,
): Promise<boolean | null> {
    const key = apiKey ?? process.env.RAPID_API_KEY ?? ''
    if (!key) return null
    const target = normaliseHandle(xHandle)
    let cursor = ''
    for (let page = 0; page < 3; page++) {
        try {
            const url = `${RAPIDAPI_BASE}/tweet/retweeted-by?tweet_id=${encodeURIComponent(tweetId)}&count=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`
            const res = await fetch(url, { headers: rapidApiHeaders(key), signal: AbortSignal.timeout(TIMEOUT_MS) })
            if (!res.ok) return null
            const data = await res.json() as unknown
            const names = extractScreenNames(data)
            if (names.includes(target)) return true
            const next = extractNextCursor(data)
            if (!next || names.length === 0) return false
            cursor = next
        } catch {
            return null
        }
    }
    return false
}

/**
 * Check if a user (identified by username/handle) follows a target account.
 * Uses twttrapi GET /user-following?username={username}. Paginates up to 5 pages. Returns null on API error.
 */
export async function checkUserFollows(
    username: string, targetHandle: string, apiKey?: string,
): Promise<boolean | null> {
    const key = apiKey ?? process.env.RAPID_API_KEY ?? ''
    if (!key) return null
    const target = normaliseHandle(targetHandle)
    let cursor = ''
    for (let page = 0; page < 5; page++) {
        try {
            const url = `${RAPIDAPI_BASE}/user-following?username=${encodeURIComponent(username)}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`
            const res = await fetch(url, { headers: rapidApiHeaders(key), signal: AbortSignal.timeout(TIMEOUT_MS) })
            if (!res.ok) return null
            const data = await res.json() as unknown
            const names = extractScreenNames(data)
            if (names.includes(target)) return true
            const next = extractNextCursor(data)
            if (!next || names.length === 0) return false
            cursor = next
        } catch {
            return null
        }
    }
    return false
}

/**
 * Fetch a tweet via /get-tweet endpoint for quote_post verification.
 * Returns { authorId, quotedStatusId } or null on error.
 */
export async function fetchTweetForQuoteVerify(
    tweetId: string, apiKey?: string,
): Promise<{ authorId: string; quotedStatusId: string | null } | null> {
    const key = apiKey ?? process.env.RAPID_API_KEY ?? ''
    if (!key) return null
    try {
        const url = `${RAPIDAPI_BASE}/get-tweet?tweet_id=${encodeURIComponent(tweetId)}`
        const res = await fetch(url, { headers: rapidApiHeaders(key), signal: AbortSignal.timeout(TIMEOUT_MS) })
        if (!res.ok) return null
        const data = await res.json() as {
            data?: {
                tweet_result?: {
                    result?: {
                        core?: { user_result?: { result?: { rest_id?: string } } }
                        legacy?: { quoted_status_id_str?: string }
                    }
                }
            }
        }
        const result = data?.data?.tweet_result?.result
        if (!result) return null
        const authorId = result.core?.user_result?.result?.rest_id ?? ''
        const quotedStatusId = result.legacy?.quoted_status_id_str ?? null
        return { authorId, quotedStatusId }
    } catch {
        return null
    }
}

// Re-export extractTweetId for callers that only need the URL parser
export { extractTweetId } from './x-utils'
