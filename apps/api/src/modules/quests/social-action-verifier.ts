/**
 * Completion-time social action verification.
 * Confirms user actually performed the task (follow, like, repost, post, join, etc.)
 * Separate from social-validator.ts which only checks target existence at creation time.
 */
import { PrismaClient } from '@prisma/client'
import { ensureFreshToken, getTweet, checkFollowing, lookupUserByUsername, checkUserLikedTweet, getRetweetedBy, getAppBearerToken } from '../x/x-rest-client'
import { fetchTweetById, checkUserFollows, fetchTweetForQuoteVerify, checkUserLikedTweet as checkUserLikedTweetRapid, checkUserRetweeted } from '../x/x-rapidapi-client'
import { extractTweetId, normaliseHandle } from '../x/x-utils'
import { getGuildMember, getUserGuildMember, resolveInvite } from '../discord/discord-rest-client'
import { validateSocialTarget, type SocialValidationResult } from './social-validator'

export interface VerificationContext {
  userId: string
  prisma: PrismaClient
  // X identity
  xId?: string | null
  xHandle?: string | null
  xAccessToken?: string | null
  xRefreshToken?: string | null
  xTokenExpiry?: Date | null
  // Discord identity
  discordId?: string | null
  discordAccessToken?: string | null
  // Telegram identity
  telegramId?: string | null
  // Proof URLs for post/quote_post (map of taskIndex → URL)
  proofUrls?: Record<number, string>
  // Task params from quest definition
  params?: Record<string, string>
  // Telegram bot token
  telegramBotToken?: string
}

// ── X Verification ──────────────────────────────────────────────

async function verifyXAction(
  actionType: string, ctx: VerificationContext, taskIndex: number,
): Promise<SocialValidationResult> {
  // Support multiple param key conventions used by quest creators
  const targetValue = ctx.params?.targetUrl || ctx.params?.postUrl || ctx.params?.accountHandle || ctx.params?.username || ''

  switch (actionType) {
    case 'post':
    case 'quote_post': {
      const proofUrl = ctx.proofUrls?.[taskIndex]
      if (!proofUrl) return { valid: false, error: 'Paste your tweet URL to verify' }
      const proofTweetId = extractTweetId(proofUrl)
      if (!proofTweetId) return { valid: false, error: 'Invalid tweet URL — use format: https://x.com/.../status/...' }

      // Path A: OAuth (most authoritative)
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

      // Path B: RapidAPI fallback
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
        const tweet = await fetchTweetById(proofTweetId, rapidApiKey)
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
    case 'follow_account': {
      const targetHandle = targetValue.replace(/^@/, '').replace(/^https?:\/\/(x|twitter)\.com\//, '')

      // Prefer OAuth path when user has linked X (official API); fallback to RapidAPI when no token
      if (ctx.xId && (ctx.xAccessToken || ctx.xRefreshToken)) {
        const token = await ensureFreshToken(
          { id: ctx.userId, xAccessToken: ctx.xAccessToken, xRefreshToken: ctx.xRefreshToken, xTokenExpiry: ctx.xTokenExpiry },
          ctx.prisma,
        )
        if (!token) {
          // Token refresh failed - expired
          return { valid: false, error: 'X account token expired — please re-link your X account' }
        }
        const targetXId = await lookupUserByUsername(token, targetHandle)
        if (targetXId) {
          const follows = await checkFollowing(token, ctx.xId, targetXId)
          if (follows !== null) return follows ? { valid: true } : { valid: false, error: 'not following this account' }
        }
      }
      // Fallback: RapidAPI (no OAuth). Requires xHandle.
      if (!ctx.xHandle) return { valid: false, error: 'Link your X account to verify this task' }
      const follows = await checkUserFollows(ctx.xHandle, targetHandle)
      if (follows === null) return { valid: false, error: 'Follow verification unavailable — try again later' }
      return follows ? { valid: true } : { valid: false, error: 'not following this account' }
    }
    case 'like_post': {
      if (!ctx.xId) return { valid: false, error: 'Link your X account to verify this task' }
      const tweetId = extractTweetId(targetValue) || targetValue
      if (!tweetId) return { valid: false, error: 'Quest task missing tweet URL — contact quest creator' }
      // Primary: X API v2 app-only bearer token
      const liked = await checkUserLikedTweet(ctx.xId, tweetId)
      if (liked !== null) return liked ? { valid: true } : { valid: false, error: 'You have not liked this tweet' }
      // Fallback: RapidAPI (uses xHandle)
      if (!ctx.xHandle) return { valid: false, error: 'Like verification unavailable — try again later' }
      const likedRapid = await checkUserLikedTweetRapid(tweetId, ctx.xId)
      if (likedRapid === null) return { valid: false, error: 'Like verification unavailable — try again later' }
      return likedRapid ? { valid: true } : { valid: false, error: 'You have not liked this tweet' }
    }
    case 'repost': {
      if (!ctx.xId) return { valid: false, error: 'Link your X account to verify this task' }
      const tweetId = extractTweetId(targetValue) || targetValue
      if (!tweetId) return { valid: false, error: 'Quest task missing tweet URL — contact quest creator' }
      // Primary: X API v2 app-only bearer token
      const bearerToken = getAppBearerToken()
      if (bearerToken) {
        const retweeted = await getRetweetedBy(bearerToken, tweetId, ctx.xId)
        if (retweeted !== null) return retweeted ? { valid: true } : { valid: false, error: 'You have not reposted this tweet' }
      }
      // Fallback: RapidAPI (uses xHandle)
      if (!ctx.xHandle) return { valid: false, error: 'Repost verification unavailable — try again later' }
      const retweetedRapid = await checkUserRetweeted(tweetId, ctx.xHandle)
      if (retweetedRapid === null) return { valid: false, error: 'Repost verification unavailable — try again later' }
      return retweetedRapid ? { valid: true } : { valid: false, error: 'You have not reposted this tweet' }
    }
    default:
      return { valid: true }
  }
}

// ── Discord Verification ────────────────────────────────────────

async function verifyDiscordAction(
  actionType: string, ctx: VerificationContext,
): Promise<SocialValidationResult> {
  if (!ctx.discordId) return { valid: false, error: 'Link your Discord account to verify this task' }

  if (actionType === 'join_server') {
    let guildId = ctx.params?.guildId
    // Fallback: resolve inviteUrl → guildId (handles legacy quests or when createQuest/updateQuest did not resolve)
    if (!guildId && ctx.params?.inviteUrl) {
      const code = ctx.params.inviteUrl.replace(/^https?:\/\/(discord\.gg|discord\.com\/invite)\//i, '').trim()
      if (code) {
        const guild = await resolveInvite(code)
        if (guild) guildId = guild.guildId
      }
    }
    if (!guildId) return { valid: false, error: 'Quest task missing guildId — contact quest creator' }

    // Prefer OAuth user token (no bot needed)
    if (ctx.discordAccessToken) {
      const roles = await getUserGuildMember(ctx.discordAccessToken, guildId)
      if (roles !== null) return { valid: true }
    }
    // Fallback to bot
    const botRoles = await getGuildMember(guildId, ctx.discordId)
    if (botRoles !== null) return { valid: true }

    return { valid: false, error: 'You have not joined this Discord server' }
  }

  // verify_role: delegate to existing validateDiscordRole via validateSocialTarget
  if (actionType === 'verify_role') {
    return validateSocialTarget('discord', 'verify_role', '', undefined, {
      discordId: ctx.discordId,
      discordAccessToken: ctx.discordAccessToken,
      params: ctx.params,
    })
  }

  return { valid: true }
}

// ── Telegram Verification ───────────────────────────────────────

async function verifyTelegramAction(
  actionType: string, ctx: VerificationContext,
): Promise<SocialValidationResult> {
  if (actionType !== 'join_channel') return { valid: true }
  if (!ctx.telegramId) return { valid: false, error: 'Link your Telegram account to verify this task' }
  if (!ctx.telegramBotToken) return { valid: false, error: 'Telegram verification unavailable' }

  const channelUrl = ctx.params?.channelUrl || ctx.params?.targetUrl || ''
  let chatId: string
  const urlMatch = channelUrl.match(/t\.me\/([A-Za-z0-9_]+)/)
  if (urlMatch) chatId = `@${urlMatch[1]}`
  else if (channelUrl.startsWith('@')) chatId = channelUrl
  else chatId = `@${channelUrl.replace(/^https?:\/\//, '')}`

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${ctx.telegramBotToken}/getChatMember?chat_id=${encodeURIComponent(chatId)}&user_id=${ctx.telegramId}`,
      { signal: AbortSignal.timeout(8000) },
    )

    // Always parse body — Telegram always returns JSON even for HTTP errors
    const data = await res.json() as { ok: boolean; result?: { status: string }; description?: string; error_code?: number }

    if (!data.ok) {
      const desc = data.description ?? ''
      console.error(`[Telegram] getChatMember failed for chatId=${chatId} userId=${ctx.telegramId}: ${res.status} ${desc}`)

      if (desc.includes('CHAT_ADMIN_REQUIRED') || res.status === 403)
        return { valid: false, error: 'Bot must be added as an admin of this channel' }
      if (desc.includes('chat not found'))
        return { valid: false, error: 'Channel not found — verify the channel URL in the quest task' }
      if (desc.includes('USER_ID_INVALID') || desc.includes('user not found'))
        return { valid: false, error: 'Could not verify your Telegram account — try unlinking and relinking' }

      return { valid: false, error: `Telegram error: ${desc || 'Could not check membership'}` }
    }

    const joined = ['creator', 'administrator', 'member', 'restricted'].includes(data.result?.status ?? '')
    return joined
      ? { valid: true }
      : { valid: false, error: 'You have not joined this channel' }
  } catch {
    return { valid: false, error: 'Telegram API unavailable — try again later' }
  }
}

// ── Main Dispatcher ─────────────────────────────────────────────

/** Completion-time verification: did user actually perform this action? */
export async function verifySocialAction(
  platform: string, actionType: string, taskIndex: number, ctx: VerificationContext,
): Promise<SocialValidationResult> {
  switch (platform) {
    case 'x': return verifyXAction(actionType, ctx, taskIndex)
    case 'discord': return verifyDiscordAction(actionType, ctx)
    case 'telegram': return verifyTelegramAction(actionType, ctx)
    default: return { valid: true }
  }
}
