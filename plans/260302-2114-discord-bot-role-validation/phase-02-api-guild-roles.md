# Phase 2: API Endpoints for Guild Roles

## Context
- [Phase 1](./phase-01-discord-rest-client.md) — REST client must exist
- [plan.md](./plan.md)

## Overview
- **Priority:** High
- **Status:** pending
- **Effort:** Medium
- API endpoints for frontend to fetch guild roles during quest creation

## Requirements
- Resolve invite URL → guild info + check bot presence
- Fetch roles for a guild (only works if bot is in server)
- Bot invite URL generation (frontend needs client ID + permissions)

## Related Code Files
- Create: `apps/api/src/modules/discord/discord.routes.ts`
- Create: `apps/api/src/modules/discord/discord.service.ts`
- Modify: `apps/api/src/app.ts` — register `/discord` routes
- Reference: `apps/api/src/modules/quests/quests.routes.ts` (pattern)

## Architecture
```
GET /discord/guild-info?inviteCode=abc123
  → resolveInvite(code) → { guildId, guildName, botPresent }
  → botPresent = try getGuildRoles → success = true, fail = false

GET /discord/guild-roles?guildId=123456
  → getGuildRoles(guildId) → [{ id, name, color, position }]
  → 403 if bot not in server

GET /discord/bot-invite-url
  → returns constructed URL with client_id + scope=bot + permissions=0
```

## Implementation Steps

1. Create `discord.service.ts`:
   - `getGuildInfo(inviteCode)` — resolve invite + check bot presence
   - `fetchGuildRoles(guildId)` — wrapper around REST client with error mapping
   - `getBotInviteUrl()` — construct OAuth2 URL from DISCORD_CLIENT_ID

2. Create `discord.routes.ts` with Fastify + Zod:
   ```ts
   // GET /discord/guild-info — public (used during quest creation)
   querystring: z.object({ inviteCode: z.string().min(1) })
   response: { guildId, guildName, botPresent: boolean }

   // GET /discord/guild-roles — requires auth (sponsor creating quest)
   querystring: z.object({ guildId: z.string().min(1) })
   response: { roles: DiscordRole[] }

   // GET /discord/bot-invite-url — public
   response: { url: string }
   ```

3. Register in `app.ts`:
   ```ts
   server.register(discordRoutes, { prefix: '/discord' })
   ```

4. All endpoints should be functional even without bot token (return appropriate error messages)

## Todo
- [ ] Create `discord.service.ts` with 3 service functions
- [ ] Create `discord.routes.ts` with 3 endpoints + Zod schemas
- [ ] Register routes in `app.ts`
- [ ] Handle missing `DISCORD_BOT_TOKEN` gracefully (503 with message)

## Success Criteria
- `GET /discord/guild-info?inviteCode=validCode` → `{ guildId, guildName, botPresent: true/false }`
- `GET /discord/guild-roles?guildId=123` → `{ roles: [{id, name, color, position}] }` (sorted by position desc)
- `GET /discord/bot-invite-url` → `{ url: "https://discord.com/oauth2/authorize?..." }`
- Invalid invite → 400; bot not in server → 403 with message; no bot token → 503

## Security
- `guild-roles` endpoint requires auth (prevents enumeration)
- Rate limiting inherits from Fastify global config
- Bot token never leaked in responses
