# Phase 3: Frontend — Dynamic Role Dropdown + Invite Bot

## Context
- [Phase 2](./phase-02-api-guild-roles.md) — API endpoints must exist
- [plan.md](./plan.md)

## Overview
- **Priority:** High
- **Status:** pending
- **Effort:** Medium
- Replace hardcoded role dropdown with dynamic fetch from Discord API. Wire up "Invite Bot" button.

## Current State (in `create.tsx`)
- `discord_role` field (line 529-564): hardcoded select with 4 options (verified, member, og, contributor)
- "Invite Bot" button: `onClick={e => e.stopPropagation()}` — does nothing
- Task params stored as: `{ inviteUrl, roleName }` — no guildId or roleId
- ChipInput validates Discord invite URL format

## Requirements
- When invite URL chip is added → resolve invite → check bot presence
- If bot not present → "Invite Bot" button opens bot invite URL in new tab (with guild pre-selected)
- If bot present → auto-fetch roles → populate dropdown dynamically
- Store enhanced params: `{ inviteUrl, guildId, roleId, roleName }`
- Handle states: loading, bot-not-present, roles-loaded, error

## Related Code Files
- Modify: `apps/dashboard/src/routes/_authenticated/quests/create.tsx`
  - `discord_role` section (lines 529-564)
  - `socialEntriesToTasks` function (verify_role case, line 232-236)
  - `tasksToSocialEntries` function (verify_role case, line 308-310)
  - `SocialEntry.params` type — add guildId, roleId
  - Validation in `validateSocialEntries` (verify_role case, line 178-182)
- Reference: `apps/dashboard/src/hooks/use-social-validation.ts` (existing validation hook)

## Architecture
```
User enters invite URL chip
  → onAdd callback → fetch GET /discord/guild-info?inviteCode=...
  → if botPresent:
      → fetch GET /discord/guild-roles?guildId=...
      → populate <select> with real roles
      → store guildId in entry.params
  → if !botPresent:
      → show "Bot not in server" message
      → "Invite Bot" opens: GET /discord/bot-invite-url → window.open(url)
      → after invite: user re-adds chip or clicks "Refresh" to re-check

User selects role from dropdown
  → store roleId + roleName in entry.params
```

## Implementation Steps

1. Add state to `SocialEntry.params`:
   ```ts
   // Extend params type to include Discord-specific fields
   params: Record<string, string>
   // For verify_role: { role, guildId, roleId, roleName }
   ```

2. Add helper functions in create.tsx (or extract to hook):
   ```ts
   async function fetchGuildInfo(inviteCode: string)
   async function fetchGuildRoles(guildId: string)
   async function fetchBotInviteUrl(): Promise<string>
   ```

3. Update `discord_role` JSX section:
   - After chip added: auto-fetch guild info
   - Show bot status indicator (green dot = bot present, red = not present)
   - "Invite Bot" button: `onClick` → `window.open(botInviteUrl, '_blank')`
   - After bot invited: "Refresh" button to re-check bot presence
   - Replace hardcoded `<select>` with dynamic options from API
   - Loading spinner while fetching roles
   - Empty state: "No roles found" or "Invite bot first"

4. Update `socialEntriesToTasks` for verify_role:
   ```ts
   params: {
     inviteUrl: entry.chips[0].trim(),
     guildId: entry.params.guildId ?? '',
     roleId: entry.params.roleId ?? '',
     roleName: entry.params.roleName ?? '',
   }
   ```

5. Update `tasksToSocialEntries` for verify_role:
   ```ts
   entry.params.guildId = task.params?.guildId ?? ''
   entry.params.roleId = task.params?.roleId ?? ''
   entry.params.role = task.params?.roleName ?? ''
   ```

6. Update validation in `validateSocialEntries`:
   - Check `params.roleId` is not empty (instead of just `params.role`)

## Todo
- [ ] Add guild info fetch on chip add
- [ ] Wire "Invite Bot" button to open bot invite URL
- [ ] Replace hardcoded role dropdown with dynamic API fetch
- [ ] Update task serialization (socialEntriesToTasks / tasksToSocialEntries)
- [ ] Update validation to check roleId
- [ ] Add loading/error states for role fetch
- [ ] CSS: style bot status indicator + refresh button

## Success Criteria
- Adding invite URL → auto-checks bot presence → shows status
- "Invite Bot" opens Discord OAuth authorize page with correct client_id
- After bot is in server → roles populate dynamically
- Selected role stores both `roleId` and `roleName`
- Edit mode: loads existing guildId/roleId/roleName correctly
- Graceful degrade: if API unavailable, role dropdown still allows manual entry

## UX Edge Cases
- Bot kicked from server after quest created → admin sees error, not user
- Guild has 100+ roles → show scrollable dropdown, no pagination needed
- Role deleted after quest created → stored roleId no longer exists → handle at verification time
