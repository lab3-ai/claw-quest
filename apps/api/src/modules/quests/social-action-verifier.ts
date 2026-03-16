/**
 * Completion-time social action verification.
 * Confirms user actually performed the task (follow, like, repost, post, join, etc.)
 * Separate from social-validator.ts which only checks target existence at creation time.
 */
import { PrismaClient } from '@prisma/client'
import { extractTweetId, normaliseHandle } from '../x/x-utils'
import { getTweetInfo, checkRetweet, checkFollow } from '../x/x-twitter-api45-client'
import { getGuildMember, resolveInvite } from '../discord/discord-rest-client'
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
  discordTokenExpiry?: Date | null
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
      if (!ctx.xHandle) return { valid: false, error: 'Link your X account to verify this task' }

      const tweet = await getTweetInfo(proofTweetId)
      if (!tweet) return { valid: false, error: 'Tweet not found — is it public?' }

      if (normaliseHandle(tweet.authorScreenName) !== normaliseHandle(ctx.xHandle)) {
        return { valid: false, error: 'This tweet was not posted by your linked X account' }
      }

      if (actionType === 'quote_post') {
        const targetTweetId = extractTweetId(targetValue)
        if (targetTweetId) {
          const quoteOk =
            tweet.quotedTweetId === targetTweetId ||
            tweet.entityUrls.some(u => u.includes(targetTweetId)) ||
            tweet.text.includes(targetTweetId)
          if (!quoteOk) return { valid: false, error: 'This tweet does not quote the required post' }
        }
      }
      return { valid: true }
    }

    case 'follow_account': {
      if (!ctx.xHandle) return { valid: false, error: 'Link your X account to verify this task' }
      const targetHandle = targetValue.replace(/^@/, '').replace(/^https?:\/\/(x|twitter)\.com\//, '').split('/')[0]
      if (!targetHandle) return { valid: false, error: 'Quest task missing target account — contact quest creator' }

      const follows = await checkFollow(ctx.xHandle, targetHandle)
      if (follows === null) return { valid: false, error: 'Follow verification unavailable — try again later' }
      return follows ? { valid: true } : { valid: false, error: 'not following this account' }
    }

    case 'repost': {
      if (!ctx.xHandle) return { valid: false, error: 'Link your X account to verify this task' }
      const tweetId = extractTweetId(targetValue) || targetValue
      if (!tweetId) return { valid: false, error: 'Quest task missing tweet URL — contact quest creator' }

      const retweeted = await checkRetweet(ctx.xHandle, tweetId)
      if (retweeted === null) return { valid: false, error: 'Repost verification unavailable — try again later' }
      return retweeted ? { valid: true } : { valid: false, error: 'You have not reposted this tweet' }
    }

    case 'like_post':
      // Like verification not supported via this API — auto-pass
      return { valid: true }

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

    // Bot-based verification — requires the ClawQuest bot to be in the Discord server
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
