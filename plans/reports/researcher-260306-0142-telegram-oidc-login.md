# Telegram OIDC Login — Research Report

**Date:** 2026-03-06
**Status:** Implementation already complete in codebase. This report documents the spec and confirms what's built.

---

## 1. How Telegram OIDC Works

Telegram runs a standards-compliant OIDC Authorization Code flow on top of `oauth.telegram.org`. Not a login widget — full OIDC with PKCE support.

**Discovery document:** `https://oauth.telegram.org/.well-known/openid-configuration`

### Endpoints

| Endpoint | URL |
|----------|-----|
| Authorization | `https://oauth.telegram.org/auth` |
| Token | `https://oauth.telegram.org/token` |
| JWKS | `https://oauth.telegram.org/.well-known/jwks.json` |
| UserInfo | **None** — all claims in ID token |

No separate userinfo endpoint. Claims come directly from the ID token (JWT).

### Authorization request (PKCE, S256)

```
GET https://oauth.telegram.org/auth
  ?client_id=<BOT_ID>
  &redirect_uri=<REGISTERED_URI>
  &response_type=code
  &scope=openid profile telegram:bot_access
  &state=<RANDOM_32_HEX>
  &code_challenge=<SHA256_BASE64URL_OF_VERIFIER>
  &code_challenge_method=S256
```

### Token exchange

```
POST https://oauth.telegram.org/token
Content-Type: application/x-www-form-urlencoded
Authorization: Basic base64(client_id:client_secret)

grant_type=authorization_code
&code=<CODE>
&redirect_uri=<SAME_URI>
&code_verifier=<ORIGINAL_VERIFIER>
```

Response: `{ id_token, access_token }`. No refresh tokens documented.

---

## 2. Scopes & Claims

### Scopes (confirmed from live discovery document)

| Scope | Claims added | Notes |
|-------|-------------|-------|
| `openid` | `sub`, `iss`, `aud`, `iat`, `exp` | Required |
| `profile` | `name`, `preferred_username`, `picture` | Username = @handle, picture = CDN URL |
| `phone` | `phone_number` | Requires explicit user consent; avoid if not needed |
| `telegram:bot_access` | (none extra in token) | Grants bot permission to proactively DM the user |

### ID token claims

```json
{
  "iss": "https://oauth.telegram.org",
  "aud": "<BOT_ID>",
  "sub": "123456789",         // Telegram user ID (numeric string)
  "iat": 1709000000,
  "exp": 1709003600,
  "name": "Alice Smith",
  "preferred_username": "alicesmth",   // without @, may be absent
  "picture": "https://t.me/i/userpic/..."
}
```

Note: `sub` is the canonical user ID. No email claim — ever. `preferred_username` may be absent if user has no public @handle.

---

## 3. `telegram:bot_access` Scope

The scope is listed in the official discovery doc as supported. Official docs state: "Allows your bot to send direct messages to the user after login."

**What this means in practice:**
- Without this scope: bot can only message users who have first-messaged the bot (standard Telegram rule — bots can't initiate)
- With `telegram:bot_access` granted: bot bypasses the "user must message first" requirement — it can initiate a conversation
- The `access_token` returned by the token endpoint is the mechanism for this; the bot uses it server-side to send the initial message

**Important caveat:** This scope's server-side behavior (how to actually use the access_token to send messages) is not documented publicly by Telegram beyond the statement above. No grammY-specific API for this exists — it's likely a raw Bot API call using the access_token instead of/alongside the bot token. This is partially unexplored territory.

**Graceful fallback:** If user denies `telegram:bot_access` (or scope is unsupported), login still completes — just the proactive DM capability is lost. The `openid profile` claims are still returned.

---

## 4. Data You Get Back

From a `openid profile telegram:bot_access` login:

| Field | Source | Notes |
|-------|--------|-------|
| Telegram user ID | `sub` | Numeric string, stable forever |
| Display name | `name` | May be first-name-only |
| @username | `preferred_username` | Optional — not all users have one |
| Profile photo URL | `picture` | Telegram CDN URL; may expire |
| Phone number | `phone_number` | Only if `phone` scope added |

No email. No bio. No follower count. Nothing else.

---

## 5. BotFather Setup

1. Open @BotFather → select bot → **Bot Settings > Web Login**
2. Register all allowed origin URLs: `http://localhost:5173`, `https://clawquest.ai`, `https://clawquest-nu.vercel.app`, etc.
3. BotFather provides: **Client ID** (= bot numeric ID) and **Client Secret** (long string)
4. Client ID is also in the bot's token before the colon: `8530415054:AABB...`

Both `TELEGRAM_CLIENT_ID` and `TELEGRAM_CLIENT_SECRET` are already set in `.env.product` and `.env.backup`.

Token endpoint supports two auth methods:
- `client_secret_basic` — `Authorization: Basic base64(id:secret)` header (preferred)
- `client_secret_post` — send in POST body

Current implementation (`telegram-oidc.utils.ts`) uses `client_secret_post` (sends in body). This is valid per the discovery doc.

---

## 6. grammY Integration

grammY is NOT involved in the OIDC auth flow. The OIDC flow is entirely web-based:

```
Browser → oauth.telegram.org → redirect back → API code exchange → JWT verify
```

grammY runs independently as a bot server (polling/webhook). The connection between OIDC login and grammY is:

1. OIDC gives you Telegram `sub` (= `telegramId`)
2. Store `telegramId` on the User record in Prisma (done: `User.telegramId`)
3. When grammY receives a message from a user, `ctx.from.id` = their Telegram ID
4. Match `ctx.from.id` to `User.telegramId` to identify the ClawQuest user
5. Use `bot.api.sendMessage(ctx.from.id, text)` to DM them — grammY standard call

No special grammY plugins or integration points needed. The OIDC tokens are not passed to grammY.

**For proactive DMs:** Once you have `telegramId` on the User record (from OIDC login), the bot can DM any user who has previously interacted with the bot. If they haven't, `telegram:bot_access` should theoretically unlock this — but the mechanism for using the `access_token` to trigger that first-message permission is undocumented.

---

## 7. Supabase Integration

Supabase has no native Telegram OIDC provider (it's planned/not yet stable as of early 2026). The approach already implemented:

**Strategy: Server-side bridge with placeholder email**

```
1. Frontend PKCE flow → code
2. API exchanges code → Telegram ID token
3. API verifies JWT (jose + JWKS)
4. Placeholder email: tg_{telegramId}@tg.clawquest.ai
5. supabaseAdmin.auth.admin.createUser({ email: placeholder, email_confirm: true })
6. supabaseAdmin.auth.admin.generateLink({ type: 'magiclink', email })
7. supabaseAdmin.auth.verifyOtp({ token_hash, type: 'magiclink' }) → session
8. Return { access_token, refresh_token } to frontend
9. Frontend: supabase.auth.setSession({ access_token, refresh_token })
10. AuthContext picks up → logged in
```

This keeps AuthContext + authenticate middleware unchanged. Telegram users are fully Supabase citizens.

**Account linking (implemented):**
- New Telegram login → creates account with placeholder email
- Existing email/Google user → "Link Telegram" in account settings → adds `telegramId` to existing User
- If same `telegramId` already on another user → 409 conflict
- Auto-link: on login/link, query `TelegramLink` table by `telegramId`, claim any unowned agents

---

## 8. What's Already Implemented

Everything is already built:

| File | Purpose |
|------|---------|
| `apps/api/src/modules/auth/telegram-oidc.utils.ts` | JWKS verification via `jose`, code exchange |
| `apps/api/src/modules/auth/telegram-auth.service.ts` | Login flow, user creation, agent auto-link, session generation |
| `apps/api/src/modules/auth/auth.routes.ts` | `POST /auth/telegram` (login) + `POST /auth/telegram/link` (link) |
| `apps/dashboard/src/lib/telegram-oidc.ts` | Frontend: PKCE generation, auth URL builder, sessionStorage helpers |
| `apps/dashboard/src/routes/auth/telegram-callback.tsx` | Handles redirect, calls API, sets Supabase session |

All 4 phases in `plans/260302-1219-telegram-login-oidc/` are marked `completed`.

---

## 9. Known Bugs & Issues (from code-reviewer-260302-1252)

Two critical bugs were found but it's unclear if they were fixed post-review:

| # | Severity | File | Issue |
|---|----------|------|-------|
| C1 | Critical | `telegram-auth.service.ts:157` | BigInt serialization crash in `/auth/telegram/link` — `user.telegramId` not wrapped with `String()` |
| C2 | Critical | `telegram-auth.service.ts:56` | `listUsers()` without pagination fetches ALL Supabase users on race recovery path (now fixed: current code uses `generateLink` directly, no `listUsers` call visible) |
| H1 | Medium | `telegram-oidc.ts:15-18` | PKCE verifier uses hex-only charset (compliant but sub-optimal entropy) |
| H2 | Low | `telegram-callback.tsx:109` | Open redirect via localStorage (pre-existing pattern) |
| H3 | Medium | `auth.routes.ts` | `redirectUri` now has allowlist validation — appears fixed |

Looking at current `telegram-auth.service.ts`: C2 is fixed (no `listUsers` call, uses `generateLink` + `verifyOtp` directly). C1 should be verified — current code still returns `user.telegramId` in `handleTelegramLink` return without `String()` wrap.

---

## 10. Gotchas & Best Practices

1. **No UserInfo endpoint** — all OIDC libs that auto-fetch userinfo will fail. Must configure to skip it. `jose`-based manual verification avoids this entirely.

2. **`sub` is a numeric string** — Telegram user IDs can exceed JavaScript's safe integer range (> 2^53). Store as `TEXT` in DB (current implementation uses `TEXT` after migration from `BigInt`). But `TelegramLink.telegramId` is still `BigInt` in Prisma — mismatch handled in `autoLinkAgents` with explicit `BigInt()` conversion and bounds check.

3. **`picture` URL expiry** — Telegram CDN photo URLs expire. Don't cache indefinitely; re-fetch on each login.

4. **`preferred_username` is optional** — fallback to `tg_{telegramId}` for username generation.

5. **`telegram:bot_access` is user-facing** — Telegram shows a permission screen. Some users may decline. The login should complete anyway (scope is not required for identity).

6. **No refresh tokens** — Telegram OIDC doesn't issue refresh tokens. The ID token is short-lived (1 hour `exp`). This doesn't matter for ClawQuest because we convert to a Supabase session immediately and discard the Telegram tokens.

7. **Redirect URI must be pre-registered** — Telegram rejects any unregistered redirect. Must register all environments in BotFather (localhost:5173 + clawquest.ai + Vercel preview URLs).

8. **Token endpoint auth method** — current code sends `client_id`/`client_secret` in POST body (`client_secret_post`). Both methods work per discovery doc. `client_secret_basic` (header) is more standard but body is fine.

9. **State parameter** — generated client-side, stored in sessionStorage, validated in callback. Must match exactly. Protects against CSRF.

10. **grammY doesn't know about OIDC** — the bot and the web auth are completely independent systems. The bridge is `telegramId` stored in the `User` model.

---

## Unresolved Questions

1. **`telegram:bot_access` access_token usage** — how exactly to use the `access_token` returned from token exchange to enable proactive bot DMs? Telegram docs don't specify the API call. Is it a special Bot API endpoint? Is it a header passed to `sendMessage`? Needs experimentation or Telegram support contact.

2. **C1 bug status** — is the BigInt crash in `handleTelegramLink` fixed? Current code in `telegram-auth.service.ts` line 178 still shows `telegramId: user.telegramId` — needs `String()` wrap.

3. **Telegram photo URL expiry** — no documented TTL. Empirically expires in hours to days. Should we store the URL or just re-fetch on each login?

4. **Vercel preview URL registration** — preview URLs are dynamic (`clawquest-xxx.vercel.app`). BotFather requires exact or pattern matching? If exact only, preview deploys won't support Telegram login.

---

Sources:
- [Log In With Telegram (official docs)](https://core.telegram.org/bots/telegram-login)
- [Telegram OIDC Discovery Document](https://oauth.telegram.org/.well-known/openid-configuration)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [grammY docs](https://grammy.dev/)
- Internal: `apps/api/src/modules/auth/telegram-oidc.utils.ts`
- Internal: `apps/api/src/modules/auth/telegram-auth.service.ts`
- Internal: `apps/dashboard/src/lib/telegram-oidc.ts`
- Internal: `plans/reports/brainstorm-260302-1219-telegram-login-oidc.md`
- Internal: `plans/reports/code-reviewer-260302-1252-telegram-login-oidc.md`
