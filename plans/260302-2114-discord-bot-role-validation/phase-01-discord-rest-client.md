# Phase 1: Discord REST Client + Env Vars

## Context
- [Discord API Research](../reports/researcher-260302-2114-discord-bot-api.md)
- [plan.md](./plan.md)

## Overview
- **Priority:** High
- **Status:** pending
- **Effort:** Small
- Lightweight Discord REST client using bare `fetch()` — no discord.js dependency.

## Key Insights
- Auth: `Authorization: Bot <token>` + mandatory `User-Agent: DiscordBot (https://clawquest.ai, 1.0)`
- Base URL: `https://discord.com/api/v10`
- Rate limits: parse headers, 50 req/s global. Don't hardcode.
- Single member lookup does NOT need GUILD_MEMBERS privileged intent

## Requirements
- Typed REST client with error handling + timeout (8s, match existing social-validator pattern)
- Methods: `resolveInvite`, `getGuildRoles`, `getGuildMember`
- Graceful degradation on 403/404 (bot not in server)
- Env vars: `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID`

## Related Code Files
- Create: `apps/api/src/modules/discord/discord-rest-client.ts`
- Modify: `.env.example` — add new vars
- Reference: `apps/api/src/modules/quests/social-validator.ts` (pattern for timeout + error handling)

## Implementation Steps

1. Add `DISCORD_BOT_TOKEN` and `DISCORD_CLIENT_ID` to `.env.example`
2. Create `apps/api/src/modules/discord/` directory
3. Create `discord-rest-client.ts`:

```ts
const DISCORD_API = 'https://discord.com/api/v10'
const TIMEOUT_MS = 8000

function botHeaders(): Record<string, string> {
  return {
    'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
    'User-Agent': 'DiscordBot (https://clawquest.ai, 1.0)',
    'Content-Type': 'application/json',
  }
}

// Resolve invite code → guild info (public, no auth)
export async function resolveInvite(code: string): Promise<{ guildId: string; guildName: string } | null>

// Fetch all roles for a guild (bot must be member)
export async function getGuildRoles(guildId: string): Promise<DiscordRole[]>

// Get single member's role IDs (bot must be member)
export async function getGuildMember(guildId: string, userId: string): Promise<string[] | null>
```

4. Type definitions:
```ts
export interface DiscordRole {
  id: string       // snowflake
  name: string
  color: number    // integer color code
  position: number // sort order (higher = more powerful)
}
```

5. All methods return `null` on error (403/404/timeout) — caller decides how to handle

## Todo
- [ ] Create `discord-rest-client.ts` with 3 methods
- [ ] Add env vars to `.env.example`
- [ ] Test with actual Discord bot token

## Success Criteria
- `resolveInvite('abc123')` returns `{ guildId, guildName }` or `null`
- `getGuildRoles(guildId)` returns role list filtered (exclude @everyone, sort by position desc)
- `getGuildMember(guildId, userId)` returns role ID array or `null`
- All methods timeout at 8s and return `null` on failure

## Security
- Bot token only used server-side, never exposed to frontend
- Bot token validated on startup (optional: log warning if missing, like TELEGRAM_BOT_TOKEN)
