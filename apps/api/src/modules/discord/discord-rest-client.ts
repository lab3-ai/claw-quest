/**
 * Lightweight Discord REST client — bare fetch(), no discord.js.
 * Bot only needs guild membership read (permissions=0).
 */

const DISCORD_API = 'https://discord.com/api/v10'
const TIMEOUT_MS = 8000

export interface DiscordRole {
  id: string       // snowflake
  name: string
  color: number    // integer color code
  position: number // sort order (higher = more powerful)
}

interface DiscordInviteResponse {
  guild?: { id: string; name: string }
}

interface DiscordRoleRaw {
  id: string
  name: string
  color: number
  position: number
  managed: boolean
}

interface DiscordMemberResponse {
  roles: string[]
}

function botHeaders(): Record<string, string> {
  const token = process.env.DISCORD_BOT_TOKEN
  if (!token) throw new Error('DISCORD_BOT_TOKEN not configured')
  return {
    'Authorization': `Bot ${token}`,
    'User-Agent': 'DiscordBot (https://clawquest.ai, 1.0)',
    'Content-Type': 'application/json',
  }
}

/** Resolve invite code → guild info (public endpoint, no auth needed) */
export async function resolveInvite(code: string): Promise<{ guildId: string; guildName: string } | null> {
  try {
    const res = await fetch(
      `${DISCORD_API}/invites/${encodeURIComponent(code)}?with_counts=false`,
      { signal: AbortSignal.timeout(TIMEOUT_MS) },
    )
    if (!res.ok) return null
    const data = await res.json() as DiscordInviteResponse
    if (!data.guild) return null
    return { guildId: data.guild.id, guildName: data.guild.name }
  } catch {
    return null
  }
}

/** Fetch all roles for a guild (bot must be a member). Returns sorted by position desc, excludes @everyone. */
export async function getGuildRoles(guildId: string): Promise<DiscordRole[] | null> {
  try {
    const res = await fetch(
      `${DISCORD_API}/guilds/${encodeURIComponent(guildId)}/roles`,
      { headers: botHeaders(), signal: AbortSignal.timeout(TIMEOUT_MS) },
    )
    if (!res.ok) return null
    const roles = await res.json() as DiscordRoleRaw[]
    return roles
      .filter(r => r.name !== '@everyone' && !r.managed)
      .sort((a, b) => b.position - a.position)
      .map(({ id, name, color, position }) => ({ id, name, color, position }))
  } catch {
    return null
  }
}

/** Get a single member's role IDs in a guild. Returns role ID array or null. */
export async function getGuildMember(guildId: string, userId: string): Promise<string[] | null> {
  try {
    const res = await fetch(
      `${DISCORD_API}/guilds/${encodeURIComponent(guildId)}/members/${encodeURIComponent(userId)}`,
      { headers: botHeaders(), signal: AbortSignal.timeout(TIMEOUT_MS) },
    )
    if (!res.ok) return null
    const data = await res.json() as DiscordMemberResponse
    return data.roles
  } catch {
    return null
  }
}

/** Get member roles using the USER's own OAuth access token (guilds.members.read scope).
 *  Does NOT require the bot to be in the server.
 *  Discord endpoint: GET /users/@me/guilds/{guild.id}/member */
export async function getUserGuildMember(accessToken: string, guildId: string): Promise<string[] | null> {
  try {
    const res = await fetch(
      `${DISCORD_API}/users/@me/guilds/${encodeURIComponent(guildId)}/member`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'DiscordBot (https://clawquest.ai, 1.0)',
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    )
    if (!res.ok) return null
    const data = await res.json() as DiscordMemberResponse
    return data.roles
  } catch {
    return null
  }
}

/** Check if Discord integration is configured (bot token + client ID) */
export function isDiscordConfigured(): boolean {
  return !!process.env.DISCORD_BOT_TOKEN && !!process.env.DISCORD_CLIENT_ID
}
