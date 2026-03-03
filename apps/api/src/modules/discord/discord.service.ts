/**
 * Discord service — business logic for guild info, roles, bot invite URL.
 */

import { resolveInvite, getGuildRoles, isDiscordConfigured } from './discord-rest-client'
import type { DiscordRole } from './discord-rest-client'

export interface GuildInfo {
  guildId: string
  guildName: string
  botPresent: boolean
}

/** Resolve invite code and check if bot is present in the guild */
export async function getGuildInfo(inviteCode: string): Promise<GuildInfo | null> {
  const guild = await resolveInvite(inviteCode)
  if (!guild) return null

  // Check bot presence by attempting to fetch roles
  const roles = await getGuildRoles(guild.guildId)
  return {
    guildId: guild.guildId,
    guildName: guild.guildName,
    botPresent: roles !== null,
  }
}

/** Fetch roles for a guild. Returns null if bot not in server. */
export async function fetchGuildRoles(guildId: string): Promise<DiscordRole[] | null> {
  return getGuildRoles(guildId)
}

/** Construct Discord OAuth2 bot invite URL */
export function getBotInviteUrl(guildId?: string): string {
  const clientId = process.env.DISCORD_CLIENT_ID
  if (!clientId) throw new Error('DISCORD_CLIENT_ID not configured')

  const params = new URLSearchParams({
    client_id: clientId,
    scope: 'bot',
    permissions: '0', // read-only, no special perms needed
  })
  if (guildId) params.set('guild_id', guildId)

  return `https://discord.com/oauth2/authorize?${params.toString()}`
}

export { isDiscordConfigured }
