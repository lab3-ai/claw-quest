# Brainstorm: Discord Bot Role Validation

## Problem
Quest creators need to set Discord role requirements for tasks. Participants must prove they have specific role in a Discord server to complete quest tasks.

## Current State
- `social-validator.ts` only validates Discord invite links (valid/expired check)
- No Discord bot exists in ClawQuest
- No Discord OAuth2 / account linking for users
- UI mockup shows: invite link input + role dropdown + "Invite Bot" banner

## Solution: Full Discord Bot Integration

### Components Needed
1. **Discord Bot Application** — new bot on Discord Developer Portal
2. **Bot invite flow** — sponsor adds bot to their server
3. **Fetch roles API** — bot reads server roles for dropdown
4. **Discord OAuth2** — participants link Discord accounts
5. **Role verification** — bot checks participant has required role

### Architecture
```
Quest Creation:
  Sponsor invites bot → bot joins server → API fetches guild roles → dropdown populated

Quest Completion:
  Participant has Discord linked → API calls bot to check guild member roles → pass/fail
```

### Key Dependencies
- `DISCORD_BOT_TOKEN` + `DISCORD_CLIENT_ID` + `DISCORD_CLIENT_SECRET` env vars
- Discord.js or bare REST API (lightweight preferred)
- `GUILD_MEMBERS` privileged intent (needs Discord approval if >100 servers)
- Social account linking system (currently only Telegram exists)

### Complexity: Medium-High
- Bot setup + fetch roles: straightforward
- OAuth2 + account linking: significant work (new auth flow)
- Role verification: moderate (API call once linking exists)

### Decision
User chose: Plan full implementation, build Discord bot end-to-end.
