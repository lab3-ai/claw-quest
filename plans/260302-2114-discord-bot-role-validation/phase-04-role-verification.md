# Phase 4: Role Verification at Quest Completion

## Context
- [Phase 1](./phase-01-discord-rest-client.md) — REST client
- [Social Account Linking](../260302-2053-social-account-linking/plan.md) — `discordId` on User model
- [plan.md](./plan.md)

## Overview
- **Priority:** Medium
- **Status:** complete
- **Effort:** Medium
- When participant submits quest with `verify_role` task, backend checks Discord role via bot API.

## Dependencies
- `User.discordId` must exist in DB (from social account linking plan Phase 1)
- Discord REST client (Phase 1 of this plan)
- Bot must be in sponsor's guild

## Requirements
- Verify participant holds required Discord role in sponsor's guild
- Uses bot token: `GET /guilds/{guildId}/members/{discordId}` → check roles[]
- Fallback: if bot not in server or user not in server → clear error message
- Integrate into existing `social-validator.ts` dispatcher

## Related Code Files
- Modify: `apps/api/src/modules/quests/social-validator.ts`
  - Add `validateDiscordRole()` function
  - Update dispatcher: `verify_role` → use new function instead of invite check
- Reference: `discord-rest-client.ts` → `getGuildMember()`

## Architecture
```
Agent/participant submits quest completion
  → Backend iterates quest.tasks[]
  → For verify_role task:
      → Extract guildId, roleId from task.params
      → Get participant's discordId from User record
      → Call getGuildMember(guildId, discordId)
      → If roleId in member.roles → pass
      → If not → fail with "You don't have the required role"
      → If discordId missing → fail with "Link your Discord account first"
      → If bot not in server → fail with "Bot not in server"
```

## Implementation Steps

1. Add new validator function in `social-validator.ts`:
   ```ts
   async function validateDiscordRole(
     params: Record<string, string>,
     discordId: string | null,
   ): Promise<SocialValidationResult> {
     if (!discordId) return { valid: false, error: 'Link your Discord account to verify role' }
     const { guildId, roleId, roleName } = params
     if (!guildId || !roleId) return { valid: false, error: 'Quest task missing guild/role data' }

     const memberRoles = await getGuildMember(guildId, discordId)
     if (!memberRoles) return { valid: false, error: 'Not a member of the Discord server' }
     if (!memberRoles.includes(roleId)) {
       return { valid: false, error: `Missing required role: ${roleName}` }
     }
     return { valid: true, meta: { roleName } }
   }
   ```

2. Update `validateSocialTarget` dispatcher:
   ```ts
   case 'discord': {
     if (type === 'verify_role') {
       // params contains guildId, roleId, roleName
       // discordId passed from caller
       return validateDiscordRole(params, discordId)
     }
     if (type === 'join_server') return validateDiscordInvite(value)
     return { valid: true }
   }
   ```

3. Update `validateSocialTarget` signature to accept optional context:
   ```ts
   export async function validateSocialTarget(
     platform: string,
     type: string,
     value: string,
     context?: { telegramBotToken?: string; discordId?: string; params?: Record<string, string> },
   ): Promise<SocialValidationResult>
   ```

4. Update caller(s) of `validateSocialTarget` to pass `discordId` from authenticated user

## Todo
- [ ] Add `validateDiscordRole()` to social-validator.ts
- [ ] Update dispatcher to route verify_role to new function
- [ ] Update function signature to accept user context (discordId)
- [ ] Update callers to pass discordId
- [ ] Test: user with role → pass
- [ ] Test: user without role → fail with message
- [ ] Test: user not in server → fail
- [ ] Test: user hasn't linked Discord → fail with link prompt
- [ ] Test: bot not in server → fail gracefully

## Success Criteria
- Participant with correct role → task verified successfully
- Participant without role → clear error: "Missing required role: X"
- Participant without Discord linked → "Link your Discord account to verify role"
- Bot not in server → "Unable to verify role — bot not in server"
- All failures are non-fatal (don't crash, return structured error)

## Security
- Bot token used server-side only
- User's discordId validated against their authenticated session
- No way for user to spoof another user's discordId
- Rate limit: one verification per task submission (no retry spam)

## Next Steps
- After social account linking is implemented, this phase can proceed
- Integration testing with real Discord server + bot
- Consider caching guild member data (TTL 5min) to reduce API calls
