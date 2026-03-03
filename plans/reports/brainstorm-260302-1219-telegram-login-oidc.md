# Brainstorm: Telegram Login OIDC Integration

## Problem Statement

ClawQuest needs Telegram Login for both agents (owners) and humans to access dashboard + API. Currently only email + Google OAuth via Supabase. Telegram bot exists but doesn't bridge to dashboard auth.

## Requirements

- Both agent owners & human sponsors login via Telegram
- Auto-link agents to owner via `telegramId` match in `TelegramLink`
- Auto-link existing accounts by email (Direction A+B: optional prompt + settings link)
- `telegram:bot_access` scope for proactive DM notifications
- New Telegram users → auto-create account (no email required)
- Zero changes to AuthContext or API authenticate middleware

## Constraint: Supabase Has No Native Telegram OIDC

Supabase custom OIDC provider support "planned early 2026" — not yet stable. Issue: [supabase/auth#167](https://github.com/supabase/auth/issues/167). Must use server-side token exchange.

## Constraint: Telegram JWT Has No Email

Claims: `sub`, `name`, `preferred_username`, `picture`. No `email` field. Auto-link by email from Telegram side impossible → need combined strategy.

## Agreed Approach: Server-side OIDC + Placeholder Email

### Architecture

```
┌─────────────┐  1. Click "Login w/ Telegram"  ┌──────────────────┐
│  Dashboard   │ ─────────────────────────────→ │ oauth.telegram.org│
│  (Frontend)  │                                │  /auth            │
│              │ ←───── 2. Redirect w/ code ──── │  (OIDC + PKCE)   │
│              │                                └──────────────────┘
│              │  3. POST /auth/telegram
│              │     { code, codeVerifier }
│              │ ─────────────────────────────→ ┌──────────────────┐
│              │                                │  ClawQuest API   │
│              │                                │                  │
│              │                                │ 4. Exchange code │
│              │                                │    → Telegram    │
│              │                                │ 5. Verify JWT    │
│              │                                │    (JWKS)        │
│              │                                │ 6. Find/create   │
│              │                                │    User + Supa   │
│              │                                │ 7. Generate      │
│              │                                │    session       │
│              │ ←── 8. Return session tokens ── │                  │
│              │                                └──────────────────┘
│  9. Store session (standard Supabase)
│  10. AuthContext picks up → logged in
└─────────────┘
```

### Session Strategy

Placeholder email: `tg_{telegramId}@tg.clawquest.ai`

```
API verifies Telegram JWT
  → Creates Supabase user (admin.createUser, email_confirm: true)
  → admin.generateLink({ type: 'magiclink', email: placeholder })
  → verifyOtp({ token_hash, type: 'magiclink' }) → session
  → Return session to frontend
```

Result: Telegram users unified in Supabase auth. AuthContext + authenticate middleware unchanged.

### Linking Strategy (A+B Combined)

**Path 1 — New Telegram user (no existing account):**
1. Telegram OIDC → create account (placeholder email)
2. Optional modal: "Enter email to link existing account?" → skip or enter
3. If email entered + matches existing user → merge accounts
4. If skipped → new account, can link later in settings

**Path 2 — Existing user wants to add Telegram:**
1. Already logged in (email/Google)
2. Account Settings → "Link Telegram" button
3. Telegram OIDC → API adds `telegramId` to User
4. Auto-links agents via TelegramLink match

**Agent auto-linking (bonus):**
When `telegramId` set on User, check `TelegramLink` table:
```sql
-- Auto-link unowned agents
UPDATE "Agent" SET "ownerId" = user.id
WHERE id IN (SELECT "agentId" FROM "TelegramLink" WHERE "telegramId" = :telegramId)
AND "ownerId" IS NULL
```

## Implementation Components

### Database Changes

```prisma
model User {
  // ... existing
  telegramId       BigInt?   @unique
  telegramUsername  String?
}
```

### Backend (API)

| Component | Path | Purpose |
|-----------|------|---------|
| Telegram auth service | `modules/auth/telegram-auth.service.ts` | OIDC code exchange, JWT verify, user create/link |
| Auth routes (new) | `modules/auth/auth.routes.ts` | `POST /auth/telegram`, `POST /auth/telegram/link` |
| PKCE + JWKS utils | `modules/auth/telegram-oidc.utils.ts` | JWT verification, JWKS fetching, PKCE helpers |

**Endpoints:**

`POST /auth/telegram` — Login/register via Telegram
```
Body: { code, codeVerifier, redirectUri }
Response: { session: { access_token, refresh_token, expires_in }, user, isNewUser, linkedAgents[] }
```

`POST /auth/telegram/link` — Link Telegram to existing account (protected)
```
Body: { code, codeVerifier, redirectUri }
Response: { user, linkedAgents[] }
```

### Frontend (Dashboard)

| Component | Path | Purpose |
|-----------|------|---------|
| Telegram login button | `login.tsx`, `register.tsx` | Initiate OIDC flow |
| Telegram callback | `routes/auth/telegram-callback.tsx` | Handle redirect, send code to API |
| Email link prompt | `components/telegram-link-prompt.tsx` | Optional modal after first Telegram login |
| Account settings | Existing account page | "Link Telegram" button |
| PKCE client helper | `lib/telegram-oidc.ts` | Generate code_verifier + code_challenge, build auth URL |

### Scopes

```
openid profile telegram:bot_access
```

- `openid`: Required, returns `sub` (telegram user ID)
- `profile`: Name, username, photo
- `telegram:bot_access`: Bot can proactively DM user (quest notifications)

### BotFather Setup Required

1. Register dashboard domain as allowed URL (`dashboard.clawquest.ai`, `localhost:5173`)
2. Get Client ID (= bot ID) and Client Secret from BotFather
3. Set callback URL pattern

### Env Vars (new)

```
TELEGRAM_CLIENT_ID=       # Bot ID from BotFather
TELEGRAM_CLIENT_SECRET=   # From BotFather OIDC settings
TELEGRAM_REDIRECT_URI=    # https://dashboard.clawquest.ai/auth/telegram/callback
```

## Security Checklist

- [x] PKCE (S256) for auth code exchange
- [x] State parameter for CSRF prevention
- [x] JWT signature verification via JWKS endpoint
- [x] Server-side code exchange (client secret never exposed)
- [x] Nonce parameter for replay attack prevention
- [x] Token expiry validation (iat, exp claims)
- [x] Audience validation (aud = bot_id)
- [x] Issuer validation (iss = https://oauth.telegram.org)

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Supabase admin.generateLink + verifyOtp flow fails | Can't create sessions | Fallback: custom JWT with dual-auth middleware |
| Telegram OIDC endpoints unstable (new feature) | Login failures | Graceful error handling, keep email/Google as primary |
| Placeholder email confusion | User sees `tg_xxx@tg.clawquest.ai` | Hide in UI, prompt to add real email |
| Bot access scope rejected by user | Can't send proactive DMs | Graceful degrade, still allow login without bot_access |
| Account merge conflicts | Data inconsistency | Merge logic: keep older account, transfer assets from newer |

## Out of Scope (YAGNI)

- Phone number scope (not needed for identity)
- Telegram Mini App integration
- Telegram Payments
- Multi-bot support
- Telegram group/channel auth

## Success Metrics

- Telegram login works end-to-end (login → dashboard)
- Agent auto-linking via TelegramLink.telegramId match
- Account linking in both directions (Telegram→email, email→Telegram)
- Bot can DM users who granted bot_access
- Zero changes to existing AuthContext/authenticate middleware

## Next Steps

1. Register Telegram OIDC in BotFather (get client_id, client_secret)
2. DB migration: add telegramId + telegramUsername to User
3. Backend: telegram-auth service + routes
4. Frontend: login button + callback + link prompt
5. Test: full flow on localhost with bot test credentials
6. Deploy: update env vars on Railway + Vercel
