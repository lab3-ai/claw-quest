# Code Review — Discord Bot Role Validation

**Date:** 2026-03-02
**Slug:** discord-bot-integration
**Reviewer:** code-reviewer

---

## Scope

| File | Type | LOC |
|------|------|-----|
| `apps/api/src/modules/discord/discord-rest-client.ts` | New | 94 |
| `apps/api/src/modules/discord/discord.service.ts` | New | 48 |
| `apps/api/src/modules/discord/discord.routes.ts` | New | 86 |
| `apps/api/src/app.ts` | Modified | +2 lines |
| `apps/dashboard/src/routes/_authenticated/quests/create.tsx` | Modified | ~150 lines changed |
| `.env.example` | Modified | +2 vars |

**TypeScript:** Dashboard passes `tsc --noEmit` cleanly. API has 2 pre-existing errors (prisma scripts rootDir mismatch — unrelated to this diff).
**Lint:** 0 errors, 7 warnings in create.tsx (all pre-existing `no-explicit-any` on unrelated functions).

---

## Overall Assessment

Solid, minimal implementation. The three-file discord module is well-structured, follows existing patterns (social-validator.ts), and bot token never leaks to the frontend. The frontend `DiscordRoleFields` component handles loading/error states cleanly with cancellation via the `cancelled` flag. Most issues are medium/low priority. One medium-priority unhandled throw stands out.

---

## Critical Issues

None.

---

## High Priority

### 1. Missing `roleId` validation in API `validateTaskParams`

`apps/api/src/modules/quests/quests.service.ts` line 33–38 validates `verify_role` tasks:

```ts
case 'verify_role':
    if (!p.inviteUrl || !DISCORD_INVITE_RE.test(p.inviteUrl))
        return `Task "${task.label}": invalid Discord invite URL "${p.inviteUrl || ''}"`;
    if (!p.roleName)
        return `Task "${task.label}": role name is required`;
    break;
```

`guildId` and `roleId` are never validated here. A quest can be created with `guildId: ""` and `roleId: ""` — which will silently succeed now and cause Phase 4 role-checking to query Discord with empty snowflakes. Both fields should be validated:

```ts
case 'verify_role':
    if (!p.inviteUrl || !DISCORD_INVITE_RE.test(p.inviteUrl))
        return `Task "${task.label}": invalid Discord invite URL`;
    if (!p.guildId || !/^\d{17,20}$/.test(p.guildId))
        return `Task "${task.label}": invalid guild ID`;
    if (!p.roleId || !/^\d{17,20}$/.test(p.roleId))
        return `Task "${task.label}": role ID is required`;
    if (!p.roleName)
        return `Task "${task.label}": role name is required`;
    break;
```

The snowflake regex `^\d{17,20}$` matches Discord IDs and rejects empty strings or arbitrary input.

---

## Medium Priority

### 2. Unhandled throw in `/discord/bot-invite-url` handler

`discord.service.ts` `getBotInviteUrl()` throws `Error('DISCORD_CLIENT_ID not configured')` if `DISCORD_CLIENT_ID` is missing. The route handler in `discord.routes.ts` (lines 74–84) checks `process.env.DISCORD_CLIENT_ID` directly before calling `getBotInviteUrl`, so the throw is effectively unreachable — but only because the route duplicates the env-var check. The service function itself can also be called from future callers without the guard.

The current state:
```ts
// routes.ts — checks env var itself, then calls service
const clientId = process.env.DISCORD_CLIENT_ID  // checked here
if (!clientId) { return reply.status(503)... }
const url = getBotInviteUrl(guildId)  // throws if no clientId (redundant)
```

The service's `getBotInviteUrl` and `isDiscordConfigured` (`discord.service.ts` line 48) export the latter but only check `DISCORD_BOT_TOKEN`, not `DISCORD_CLIENT_ID`. A caller using `isDiscordConfigured()` as the guard and then calling `getBotInviteUrl()` would crash. Either:
- Have `isDiscordConfigured()` also check `DISCORD_CLIENT_ID`, or
- Wrap `getBotInviteUrl` call in try/catch in the route

### 3. `getGuildInfo` performs two sequential Discord API calls, wasting time on bot-absent guilds

`discord.service.ts`:
```ts
const guild = await resolveInvite(inviteCode)    // 1st call — public, fast
const roles = await getGuildRoles(guild.guildId) // 2nd call — always made
```

The second call (`getGuildRoles`) uses the bot token to detect bot presence. This is the intended design (per plan), but it means every invite check makes 2 API calls. When the bot is absent (the common case for new onboarding), the second call will always return 404 (bot not in guild), consuming rate limit budget unnecessarily.

Not a blocker, but if rate limiting becomes a concern, consider returning `botPresent: false` without attempting `getGuildRoles` when `DISCORD_BOT_TOKEN` is not configured. Currently `isDiscordConfigured()` is checked at the route level before calling the service, so this is handled — but the check in `getGuildInfo` is unconditional.

### 4. `handleRefresh` uses `setTimeout(50ms)` to force re-render — fragile

`create.tsx` line 490–491:
```ts
removeChip(idx, 0)
setTimeout(() => addChip(idx, currentChip), 50)
```

This is a state-cycle hack to re-trigger the `useEffect([currentChip])`. It relies on React's batching and 50ms being enough for the removal to flush. If the event loop is slow (e.g., on a low-end device during a heavy render), `addChip` fires before the chips state reflects the removal, and `useEffect` may not re-trigger because `currentChip` never actually changed from the component's perspective.

A more reliable pattern is a separate `refreshCounter` state:
```ts
const [refreshCount, setRefreshCount] = useState(0)
const handleRefresh = () => setRefreshCount(c => c + 1)
// useEffect deps: [currentChip, refreshCount]
```

This is deterministic and doesn't depend on timing.

### 5. `eslint-disable react-hooks/exhaustive-deps` suppresses a real warning

`create.tsx` line 471:
```ts
}, [currentChip]) // eslint-disable-line react-hooks/exhaustive-deps
```

The suppressed deps are `session`, `idx`, and `setTaskParam`. These are stable in practice (session doesn't change during quest creation; `idx` and `setTaskParam` are stable callback references), but the suppress is a code smell. The missing dep `session` is the most dangerous: if the user's session expires mid-fill and they add an invite chip, the guild-info fetch will work (unauthenticated) but the guild-roles fetch will fail silently with no feedback (the inner fetch passes an expired token). The UI just shows the roles spinner and never resolves. Adding `session` to the dep array would cause the effect to re-run on session refresh, which is safe.

---

## Low Priority

### 6. `guild-info` endpoint is unauthenticated — minor enumeration risk

`GET /discord/guild-info?inviteCode=...` requires no auth. Anyone can use it to probe Discord invite codes and get back `{ guildId, guildName, botPresent }`. This is fine for the current use case (UX during quest creation), but the endpoint could be abused to probe invite validity at scale. Discord's own `/invites/{code}` is public, so this isn't worse than direct Discord API access — but it does expose `botPresent` which is specific to ClawQuest. Low risk; document it.

### 7. No Discord-specific input validation regex on route inputs

`discord.routes.ts` uses `z.string().min(1)` for both `inviteCode` and `guildId`. For `guildId`, accepting any string means an attacker can pass `../../../../etc/passwd` — which `encodeURIComponent` will encode safely before hitting the Discord API URL. The defense is in place (encodeURIComponent is used consistently), but adding format constraints gives defense in depth:

```ts
// inviteCode: Discord codes are alphanumeric + hyphens
querystring: z.object({ inviteCode: z.string().regex(/^[A-Za-z0-9-]{2,20}$/) })

// guildId: Discord snowflakes are numeric, 17-20 digits
querystring: z.object({ guildId: z.string().regex(/^\d{17,20}$/) })
```

### 8. Edit mode does not re-fetch roles when loading existing `verify_role` task

`questTasksToSocialEntries` (line 310–315) correctly restores `guildId`, `roleId`, `roleName` into `entry.params`. However, `DiscordRoleFields` only runs the API fetch on chip add (via `useEffect([currentChip])`). On initial render with an existing chip, `currentChip` is set and the effect does fire — so roles ARE re-fetched. The previously selected role will appear in the dropdown. But since `task.params.roleId` is pre-set, the selected role label in the `<select>` may show `"— No roles available —"` until the async fetch completes (roles list is empty until fetch finishes). This is technically a flash of wrong UI state, not a functional bug.

### 9. `fetchGuildRoles` in service is a one-liner passthrough

```ts
export async function fetchGuildRoles(guildId: string): Promise<DiscordRole[] | null> {
  return getGuildRoles(guildId)
}
```

This adds no value over importing `getGuildRoles` directly from the REST client in the route. Either add logic here or remove the indirection. YAGNI applies — but it's currently just noise.

### 10. Missing `scope` on `getBotInviteUrl` output

The bot invite URL uses `scope: 'bot'` only. Discord recommends also including `applications.commands` for bot integrations, though ClawQuest doesn't currently use slash commands. Not a bug, just worth noting for the Discord bot onboarding docs.

---

## Edge Cases Found During Scouting

1. **Bot kicked after quest is live** — `verify_role` params include `guildId`/`roleId` but Phase 4 will call `getGuildMember`. If the bot is kicked between quest creation and completion, `getGuildMember` returns `null`. This needs to be handled as a "can't verify" error (not "role not held"). The plan's risk matrix acknowledges this ("admin sees error") — ensure Phase 4 differentiates between `null` (bot absent) and an empty roles array (member present, role absent).

2. **Managed roles filtered on creation, but not on verification** — `getGuildRoles` filters `r.managed = true` (integration-managed roles like Nitro Booster). A sponsor cannot select a managed role. However, if a user somehow has only managed roles, `getGuildMember` will return those IDs too. This is fine — the stored `roleId` won't be a managed role so the check is correct.

3. **Invite expires after quest is saved** — The `inviteUrl` stored in task params may expire. Phase 4 shouldn't re-validate the invite URL; it should use the stored `guildId` directly for member lookup.

4. **Multiple `verify_role` tasks for same guild** — The `questTasksToSocialEntries` grouping key is `${platform}-${actionType}`. Two `verify_role` tasks for different roles in the same server will be collapsed into one entry (since they share the key `discord-verify_role`). This would cause data loss on quest edit. The dedup logic for multi-task quest editing appears to be a broader pre-existing issue, but it's particularly acute for role tasks.

---

## Positive Observations

- Bot token is server-side only — never exposed to frontend, no `VITE_DISCORD_*` env vars.
- `encodeURIComponent` used consistently on all URL parameters passed to Discord API.
- `AbortSignal.timeout(TIMEOUT_MS)` pattern matches existing `social-validator.ts` convention.
- `cancelled` flag in `useEffect` correctly prevents state updates after unmount / chip change.
- `getGuildRoles` filters `@everyone` and `managed` roles — good UX (no Nitro Booster in dropdown).
- 503 fallback when Discord is not configured — server stays up, clear error message returned.
- Auth guard on `guild-roles` endpoint prevents open role enumeration.
- `maxChips={1}` on the invite URL chip input correctly enforces single-server constraint.

---

## Plan TODO Status

Phases 1, 2, 3 are implemented and marked `done` in `plan.md`. Phase 4 is correctly marked `blocked` pending social account linking.

Plan checklist items from phase files:
- [x] `discord-rest-client.ts` with 3 methods
- [x] Env vars in `.env.example`
- [x] `discord.service.ts` with 3 service functions
- [x] `discord.routes.ts` with 3 endpoints + Zod schemas
- [x] Routes registered in `app.ts`
- [x] Guild info fetch on chip add
- [x] "Invite Bot" button wired to open bot invite URL
- [x] Dynamic role dropdown
- [x] Task serialization (socialEntriesToTasks / tasksToSocialEntries)
- [x] Validation checks roleId
- [x] Loading/error states
- [ ] Test with actual Discord bot token (manual, not automated)

---

## Recommended Actions

1. **(High)** Add `guildId` and `roleId` snowflake validation to `validateTaskParams` in `quests.service.ts` — prevents degenerate quest data before Phase 4 is built.
2. **(Medium)** Replace `setTimeout(50)` in `handleRefresh` with a `refreshCount` state variable.
3. **(Medium)** Add `session?.access_token` to `useEffect` deps (remove `eslint-disable` comment) — makes expired-session behavior explicit.
4. **(Medium)** Either make `isDiscordConfigured()` check both env vars, or wrap `getBotInviteUrl()` in try/catch in the route (remove the duplicated env check).
5. **(Low)** Add snowflake regex to `guildId` Zod schema in routes for defense in depth.
6. **(Low)** Remove the `fetchGuildRoles` passthrough in `discord.service.ts` or add meaningful logic.
7. **(Future / Phase 4)** When `getGuildMember` returns `null`, distinguish "bot not in guild" from "member not in guild" — use different error codes so the admin UX can surface actionable messages.

---

## Metrics

- TypeScript errors (new): 0
- Lint errors (new): 0
- Lint warnings (new): 0
- Pre-existing TS errors (unrelated): 2 (prisma rootDir)
- Discord bot token exposure risk: None

---

## Unresolved Questions

1. Will `verify_role` tasks be blocked from quest submission if `guildId`/`roleId` are empty? The frontend `validateSocialTasks` checks `roleId` (line 181), but the API `validateTaskParams` only checks `roleName`. If someone bypasses the UI and POSTs directly, they can create a quest with empty guildId/roleId. Fix is in recommended action #1.
2. Should `/discord/guild-info` be rate-limited separately from other endpoints given it's unauthenticated?
3. Does storing the invite URL in task params make sense long-term if invites expire? Consider storing just `guildId` and a display invite URL separately.
