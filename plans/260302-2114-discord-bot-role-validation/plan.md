---
status: in-progress
created: 2026-03-02
slug: discord-bot-role-validation
---

# Discord Bot Role Validation

## Overview
Implement Discord bot integration for role-based quest verification. Sponsors create quests requiring specific Discord roles; participants prove they hold those roles to complete tasks.

## Dependency
**Social Account Linking plan** (`plans/260302-2053-social-account-linking/`) must complete Phase 1 (DB migration: `discordId`/`discordHandle` on User) before Phase 4 can work. Phases 1-3 are independent.

## Architecture

```
Quest Creation:
  Sponsor enters invite URL → API resolves invite → gets guildId
  → Sponsor clicks "Invite Bot" → bot joins server
  → API: GET /guilds/{guildId}/roles → returns role list
  → Frontend populates dropdown → sponsor picks role
  → Stored: params { inviteUrl, guildId, roleId, roleName }

Quest Completion:
  Participant has discordId linked (via social account linking)
  → API: GET /guilds/{guildId}/members/{discordId} → member.roles[]
  → Check if roleId in roles → pass/fail
```

**Key decision:** Bare `fetch()` REST client — no discord.js library. Bot only needs guild membership (permissions=0).

## Phases

| # | Phase | Status | Effort | Depends |
|---|-------|--------|--------|---------|
| 1 | [Discord REST client + env vars](phase-01-discord-rest-client.md) | done | S | — |
| 2 | [API endpoints for guild roles](phase-02-api-guild-roles.md) | done | M | Phase 1 |
| 3 | [Frontend: dynamic role dropdown + invite bot](phase-03-frontend-role-dropdown.md) | done | M | Phase 2 |
| 4 | [Role verification at quest completion](phase-04-role-verification.md) | blocked | M | Phase 1 + social-linking Phase 1 |

## Files to Modify/Create

**New files:**
- `apps/api/src/modules/discord/discord-rest-client.ts` — lightweight REST client
- `apps/api/src/modules/discord/discord.routes.ts` — API endpoints
- `apps/api/src/modules/discord/discord.service.ts` — business logic

**Modified files:**
- `apps/api/src/app.ts` — register discord routes
- `apps/api/src/modules/quests/social-validator.ts` — add role verification
- `apps/dashboard/src/routes/_authenticated/quests/create.tsx` — dynamic roles dropdown
- `packages/shared/src/index.ts` — update QuestTaskSchema params (optional)
- `.env.example` — add `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID`

## Env Vars (new)
```
DISCORD_BOT_TOKEN=    # Bot token from Discord Developer Portal
DISCORD_CLIENT_ID=    # Application ID (for invite URL construction)
```

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Bot not in server → role fetch fails | Show clear "Invite Bot first" message; validate bot presence before role fetch |
| Rate limiting | Parse `X-RateLimit-*` headers; graceful degrade like existing validators |
| Role names change after quest created | Store `roleId` (immutable snowflake), not just `roleName` |
| >75 guilds → need privileged intent approval | For single member lookup: no intent needed. Monitor growth. |
| Social linking not yet implemented | Phases 1-3 work independently; Phase 4 waits for discordId on User |

## Reports
- [Brainstorm](../reports/brainstorm-260302-2114-discord-bot-role-validation.md)
- [Discord API Research](../reports/researcher-260302-2114-discord-bot-api.md)
