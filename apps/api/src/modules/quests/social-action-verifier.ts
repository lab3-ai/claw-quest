/**
 * Completion-time social action verification.
 * Confirms user actually performed the task (follow, like, repost, post, join, etc.)
 * Separate from social-validator.ts which only checks target existence at creation time.
 */
import { PrismaClient } from '@prisma/client'
import { ensureFreshToken, checkFollowing, getLikingUsers, getRetweetedBy, getTweet, lookupUserByUsername } from '../x/x-rest-client'
import { getGuildMember, getUserGuildMember } from '../discord/discord-rest-client'
import { validateSocialTarget, type SocialValidationResult } from './social-validator'

export interface VerificationContext {
  userId: string
  prisma: PrismaClient
  // X identity
  xId?: string | null
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

/** Extract tweet ID from X URL: https://x.com/user/status/123456 → 123456 */
function extractTweetId(url: string): string | null {
  const match = url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/)
  return match?.[1] ?? null
}

// ── X Verification ──────────────────────────────────────────────

async function verifyXAction(
  actionType: string, ctx: VerificationContext, taskIndex: number,
): Promise<SocialValidationResult> {
  if (!ctx.xId) return { valid: false, error: 'Link your X account to verify this task' }

  const token = await ensureFreshToken(
    { id: ctx.userId, xAccessToken: ctx.xAccessToken, xRefreshToken: ctx.xRefreshToken, xTokenExpiry: ctx.xTokenExpiry },
    ctx.prisma,
  )
  if (!token) return { valid: false, error: 'X account token expired — please re-link your X account' }

  const targetValue = ctx.params?.targetUrl || ctx.params?.accountHandle || ''

  switch (actionType) {
    case 'follow_account': {
      const targetHandle = targetValue.replace(/^@/, '').replace(/^https?:\/\/(x|twitter)\.com\//, '')
      const targetId = await lookupUserByUsername(token, targetHandle)
      if (!targetId) return { valid: false, error: 'Could not resolve target X account' }
      const following = await checkFollowing(token, ctx.xId, targetId)
      if (following === null) return { valid: false, error: 'X API unavailable — try again in a few minutes' }
      return following ? { valid: true } : { valid: false, error: 'You are not following this account' }
    }
    case 'like_post': {
      const tweetId = extractTweetId(targetValue)
      if (!tweetId) return { valid: false, error: 'Invalid tweet URL in task' }
      const liked = await getLikingUsers(token, tweetId, ctx.xId)
      if (liked === null) return { valid: false, error: 'X API unavailable — try again in a few minutes' }
      return liked ? { valid: true } : { valid: false, error: 'You have not liked this post' }
    }
    case 'repost': {
      const tweetId = extractTweetId(targetValue)
      if (!tweetId) return { valid: false, error: 'Invalid tweet URL in task' }
      const reposted = await getRetweetedBy(token, tweetId, ctx.xId)
      if (reposted === null) return { valid: false, error: 'X API unavailable — try again in a few minutes' }
      return reposted ? { valid: true } : { valid: false, error: 'You have not reposted this post' }
    }
    case 'post':
    case 'quote_post': {
      const proofUrl = ctx.proofUrls?.[taskIndex]
      if (!proofUrl) return { valid: false, error: 'Paste your tweet URL to verify' }
      const proofTweetId = extractTweetId(proofUrl)
      if (!proofTweetId) return { valid: false, error: 'Invalid tweet URL — use format: https://x.com/.../status/...' }
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
    const guildId = ctx.params?.guildId
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
    if (!res.ok) {
      return { valid: false, error: 'Bot cannot check this channel — it must be added as admin' }
    }
    const data = await res.json() as { ok: boolean; result?: { status: string } }
    if (!data.ok) return { valid: false, error: 'Could not check membership' }

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
