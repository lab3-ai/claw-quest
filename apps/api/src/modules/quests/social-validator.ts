import { getGuildMember, getUserGuildMember } from '../discord/discord-rest-client'

/** Response type for social validation */
export interface SocialValidationResult {
  valid: boolean
  error?: string
  meta?: Record<string, string>
}

/** Optional user context for role-based verification at quest completion */
export interface ValidationContext {
  discordId?: string | null
  discordAccessToken?: string | null   // OAuth2 token with guilds.members.read scope
  params?: Record<string, string>
}

const TIMEOUT_MS = 8000

/** Validate X (Twitter) account existence via oEmbed */
async function validateXAccount(username: string): Promise<SocialValidationResult> {
  const handle = username.replace(/^@/, '')
  try {
    const res = await fetch(
      `https://publish.twitter.com/oembed?url=https://x.com/${handle}`,
      { signal: AbortSignal.timeout(TIMEOUT_MS) },
    )
    if (res.ok) {
      const data = await res.json() as { author_name?: string }
      return { valid: true, meta: { name: data.author_name ?? handle } }
    }
    if (res.status === 404) return { valid: false, error: 'X account not found' }
    return { valid: false, error: 'X account not found' }
  } catch {
    return { valid: true }
  }
}

/** Validate X (Twitter) post existence via oEmbed */
async function validateXPost(postUrl: string): Promise<SocialValidationResult> {
  try {
    const res = await fetch(
      `https://publish.twitter.com/oembed?url=${encodeURIComponent(postUrl)}`,
      { signal: AbortSignal.timeout(TIMEOUT_MS) },
    )
    if (res.ok) {
      const data = await res.json() as { author_name?: string }
      return { valid: true, meta: { author: data.author_name ?? '' } }
    }
    return { valid: false, error: 'Post not found or is private' }
  } catch {
    return { valid: true }
  }
}

/** Extract Discord invite code from URL or raw code */
function extractDiscordCode(value: string): string | null {
  const urlMatch = value.match(/discord\.(?:gg|com\/invite)\/([A-Za-z0-9-]+)/)
  if (urlMatch) return urlMatch[1]
  // Treat bare alphanumeric string as code
  if (/^[A-Za-z0-9-]+$/.test(value.trim())) return value.trim()
  return null
}

/** Validate Discord invite via Discord API */
async function validateDiscordInvite(value: string): Promise<SocialValidationResult> {
  const code = extractDiscordCode(value)
  if (!code) return { valid: false, error: 'Discord invite is invalid or expired' }
  try {
    const res = await fetch(
      `https://discord.com/api/v10/invites/${code}?with_counts=true`,
      { signal: AbortSignal.timeout(TIMEOUT_MS) },
    )
    if (res.ok) {
      const data = await res.json() as { guild?: { name?: string } }
      return { valid: true, meta: { name: data.guild?.name ?? '' } }
    }
    return { valid: false, error: 'Discord invite is invalid or expired' }
  } catch {
    return { valid: true }
  }
}

/** Extract Telegram channel username from @handle or t.me URL */
function extractTelegramUsername(value: string): string | null {
  if (value.startsWith('@')) return value.slice(1)
  const urlMatch = value.match(/t\.me\/([A-Za-z0-9_]+)/)
  if (urlMatch) return urlMatch[1]
  if (/^[A-Za-z0-9_]+$/.test(value.trim())) return value.trim()
  return null
}

/** Validate Telegram channel existence via Bot API getChat */
async function validateTelegramChannel(
  value: string,
  botToken: string | undefined,
): Promise<SocialValidationResult> {
  if (!botToken) {
    return { valid: true, meta: { warning: 'Telegram validation unavailable' } }
  }
  const username = extractTelegramUsername(value)
  if (!username) return { valid: false, error: 'Channel not found or is private' }
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/getChat?chat_id=@${username}`,
      { signal: AbortSignal.timeout(TIMEOUT_MS) },
    )
    if (res.ok) {
      const data = await res.json() as { ok?: boolean; result?: { title?: string } }
      if (data.ok) {
        return { valid: true, meta: { title: data.result?.title ?? username } }
      }
    }
    return { valid: false, error: 'Channel not found or is private' }
  } catch {
    return { valid: true }
  }
}

/** Verify participant holds a specific Discord role.
 *  Prefers OAuth user token (guilds.members.read) over bot — no bot-in-server required. */
async function validateDiscordRole(
  params: Record<string, string>,
  discordId: string | null | undefined,
  discordAccessToken?: string | null,
): Promise<SocialValidationResult> {
  if (!discordId) {
    return { valid: false, error: 'Link your Discord account to verify role' }
  }
  const { guildId, roleId, roleName } = params
  if (!guildId || !roleId) {
    return { valid: false, error: 'Quest task missing guild/role data' }
  }

  // Prefer OAuth user token (no bot in server required)
  let memberRoles: string[] | null = null
  if (discordAccessToken) {
    memberRoles = await getUserGuildMember(discordAccessToken, guildId)
  }
  // Fallback to bot if no OAuth token or token failed
  if (!memberRoles) {
    memberRoles = await getGuildMember(guildId, discordId)
  }

  if (!memberRoles) {
    return { valid: false, error: 'Not a member of the Discord server (or bot not in server)' }
  }
  if (!memberRoles.includes(roleId)) {
    return { valid: false, error: `Missing required role: ${roleName || 'unknown'}` }
  }
  return { valid: true, meta: { roleName: roleName || roleId } }
}

/** Main dispatcher — routes to per-platform validators */
export async function validateSocialTarget(
  platform: string,
  type: string,
  value: string,
  telegramBotToken?: string,
  context?: ValidationContext,
): Promise<SocialValidationResult> {
  switch (platform) {
    case 'x': {
      if (type === 'follow_account') return validateXAccount(value)
      if (['like_post', 'repost', 'quote_post'].includes(type)) return validateXPost(value)
      // post = user creates new content, skip validation
      return { valid: true }
    }
    case 'discord': {
      if (type === 'verify_role' && context?.discordId !== undefined) {
        // Completion-time: check if user actually has the role
        return validateDiscordRole(context.params ?? {}, context.discordId, context.discordAccessToken)
      }
      if (['join_server', 'verify_role'].includes(type)) return validateDiscordInvite(value)
      return { valid: true }
    }
    case 'telegram': {
      if (type === 'join_channel') return validateTelegramChannel(value, telegramBotToken)
      return { valid: true }
    }
    default:
      return { valid: true }
  }
}
