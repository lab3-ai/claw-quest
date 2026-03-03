# Discord Bot API — Role Verification Research

Date: 2026-03-02 | Context: ClawQuest `verify_role` quest task implementation

---

## 1. Bot REST API — Key Endpoints

**Base URL:** `https://discord.com/api/v10`
**Auth header:** `Authorization: Bot <BOT_TOKEN>`
**Required User-Agent:** `DiscordBot (https://clawquest.ai, 1.0)` — Cloudflare blocks requests without it.

### Resolve invite → guild ID
```
GET /invites/{code}?with_counts=true
```
- No auth required (public endpoint) — already used in `social-validator.ts`
- Returns: `guild.id`, `guild.name`, `guild.member_count`, `approximate_presence_count`
- Rate limit: ~5 req/5s per route (parse headers, don't hardcode)

### Fetch guild roles (all roles with names)
```
GET /guilds/{guild_id}/roles
Authorization: Bot <token>
```
- Returns array of role objects: `{ id, name, permissions, color, position, ... }`
- Requires: bot must be a member of the guild
- Permission: none beyond being in the guild
- No `GUILD_MEMBERS` intent needed for this endpoint

### Check if user has a role
```
GET /guilds/{guild_id}/members/{user_id}
Authorization: Bot <token>
```
- Returns guild member object: `{ user, roles: string[], nick, joined_at, ... }`
- `roles` = array of role ID snowflakes
- Does **NOT** require `GUILD_MEMBERS` privileged intent (only the List All Members endpoint does)
- Requires: bot is in the guild; no special guild permissions needed beyond membership

---

## 2. Discord OAuth2 for User Account Linking

### Authorize URL
```
https://discord.com/oauth2/authorize
  ?client_id=YOUR_APP_ID
  &response_type=code
  &redirect_uri=https://app.clawquest.ai/auth/discord/callback
  &scope=identify%20guilds.members.read
```

| Scope | Used for |
|---|---|
| `identify` | Get user's Discord ID via `GET /users/@me` (no email needed) |
| `guilds` | List all guilds user belongs to (optional — not needed for role check) |
| `guilds.members.read` | `GET /users/@me/guilds/{guild_id}/member` → roles[] |

### Token exchange
```
POST https://discord.com/api/oauth2/token
Content-Type: application/x-www-form-urlencoded

client_id=...&client_secret=...&grant_type=authorization_code
&code=...&redirect_uri=...
```
Returns: `{ access_token, refresh_token, expires_in, token_type: "Bearer", scope }`

### Get user's Discord ID
```
GET /users/@me
Authorization: Bearer <access_token>
```
Returns: `{ id, username, discriminator, ... }` — store `id` as `discordId` on user.

### Check user's roles in a guild (OAuth2, no bot)
```
GET /users/@me/guilds/{guild_id}/member
Authorization: Bearer <access_token>
```
- Scope: `guilds.members.read`
- Returns same guild member object as bot endpoint — includes `roles[]`
- Works **without bot being in the guild** — user authenticates themselves
- This is the cleanest approach for role verification: user grants OAuth2, backend checks their roles

---

## 3. Bot Invite URL

```
https://discord.com/oauth2/authorize
  ?client_id=YOUR_APP_ID
  &scope=bot
  &permissions=0
```

### Permissions needed for role verification
To call `GET /guilds/{guild_id}/members/{user_id}` and `GET /guilds/{guild_id}/roles`:
- **No elevated permissions required** — bot just needs to be in the guild
- `permissions=0` works (the bot just needs guild membership, not channel perms)
- If you want to be explicit: permission `1` (CREATE_INSTANT_INVITE) is the lowest non-zero value

**Real minimum bitmask: `0`** — presence in guild is sufficient for member/role read via REST.

### GUILD_MEMBERS privileged intent
- Privileged for **Gateway events** (real-time join/leave) and **List All Members** endpoint
- `GET /guilds/{id}/members/{user_id}` (single user): does **not** require it
- Must enable in Discord Developer Portal (Bot → Privileged Gateway Intents) if using list endpoint
- Verification from Discord only required when bot is in **75+ guilds** (or 100+ servers for verified apps)
- For ClawQuest: sponsors add the bot to their server — likely stays under threshold initially

---

## 4. Rate Limits

- **Global:** 50 req/s per bot token
- **Per-route:** dynamic, parse `X-RateLimit-*` headers — don't hardcode
- **`/invites/{code}`:** no auth, relaxed — ~5 req/5s observed
- **`/users/@me/guilds/{guild_id}/member`:** OAuth2 per-user, separate bucket per user token
- Pattern: check `X-RateLimit-Remaining`, back off on `429`, retry after `X-RateLimit-Reset-After`

---

## 5. Implementation Strategy for ClawQuest

### Recommended approach: Hybrid (OAuth2 primary, bot secondary)

**Path A — OAuth2 only (preferred for role verification):**
1. User links Discord account: OAuth2 with `identify + guilds.members.read`
2. Store `discordId` + `discordAccessToken` on user profile
3. At verification: `GET /users/@me/guilds/{guild_id}/member` with user's Bearer token
4. Check if target `roleId` is in `member.roles[]`
5. Pro: bot doesn't need to be in every sponsor's server

**Path B — Bot token (if bot is in the guild):**
1. Sponsor invites bot to their server (invite URL with `scope=bot&permissions=0`)
2. Get `guild_id` from invite code resolution (already done in `validateDiscordInvite`)
3. At verification: `GET /guilds/{guild_id}/members/{user_discordId}` with `Authorization: Bot`
4. Pro: works even if user hasn't linked Discord; Con: bot must be in the guild

### Bare fetch() pattern (no discord.js needed)
```ts
const DISCORD_API = 'https://discord.com/api/v10'
const BOT_HEADERS = {
  'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
  'User-Agent': 'DiscordBot (https://clawquest.ai, 1.0)',
  'Content-Type': 'application/json',
}

// Bot: check member roles
async function getMemberRoles(guildId: string, userId: string): Promise<string[]> {
  const res = await fetch(`${DISCORD_API}/guilds/${guildId}/members/${userId}`, {
    headers: BOT_HEADERS,
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) return []
  const data = await res.json() as { roles?: string[] }
  return data.roles ?? []
}

// OAuth2: check member roles via user token
async function getMemberRolesOAuth(guildId: string, userToken: string): Promise<string[]> {
  const res = await fetch(`${DISCORD_API}/users/@me/guilds/${guildId}/member`, {
    headers: { 'Authorization': `Bearer ${userToken}`, 'User-Agent': 'DiscordBot (https://clawquest.ai, 1.0)' },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) return []
  const data = await res.json() as { roles?: string[] }
  return data.roles ?? []
}
```

### Token storage
- `discordAccessToken` + `discordRefreshToken` + `discordTokenExpiresAt` on `User` model
- Refresh before verification if `expiresAt < now + 5min`
- Never expose bot token to frontend

### Handling bot kicked from server (Path B)
- `GET /guilds/{id}/members/{userId}` returns `403` or `404` if bot left
- Return `{ valid: false, error: 'Bot not in server — sponsor must re-invite' }` and surface in admin
- Graceful degrade: same pattern as existing `social-validator.ts` (timeout → `{ valid: true }`)

---

## Unresolved Questions

1. **`verify_role` task params schema**: Does `params` include `guildId` + `roleId`, or just `inviteCode` + `roleName`? Role names can change; IDs are stable — recommend storing both.
2. **OAuth2 token expiry**: Discord tokens expire in 604800s (7 days). Need refresh token flow in background.
3. **Bot invite UX**: Who adds the bot — sponsor during quest creation? Need UI step if using Path B.
4. **`guilds.members.read` approval**: Confirmed available without Discord approval (differs from `dm_channels.read`), but worth testing with a new app registration.
5. **Existing `TelegramLink` model pattern**: Does a `DiscordLink` model follow the same shape? Needed for storing `discordId` + OAuth tokens.
