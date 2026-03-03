---
status: completed
created: 2026-03-02
completed: 2026-03-02
branch: main
brainstorm: plans/reports/brainstorm-260302-1219-telegram-login-oidc.md
---

# Telegram Login OIDC Implementation Plan

## Summary

Add "Login with Telegram" to ClawQuest dashboard using server-side OIDC exchange. Telegram users get Supabase sessions via placeholder emails, keeping AuthContext + authenticate middleware unchanged.

## Key Decisions (from brainstorm)

- Server-side OIDC (Supabase has no native Telegram provider)
- Placeholder email: `tg_{telegramId}@tg.clawquest.ai`
- Scopes: `openid profile telegram:bot_access`
- Auto-create accounts (no email required for new users)
- Linking: optional email prompt after first login + link from account settings
- Agent auto-linking via TelegramLink.telegramId match

## Phases

| # | Phase | Status | Priority | Effort | Depends |
|---|-------|--------|----------|--------|---------|
| 1 | [DB Migration](./phase-01-db-migration.md) | completed | high | small | — |
| 2 | [Backend OIDC Service](./phase-02-backend-oidc-service.md) | completed | high | medium | 1 |
| 3 | [Frontend Login + Callback](./phase-03-frontend-login-callback.md) | completed | high | medium | 2 |
| 4 | [Account Linking](./phase-04-account-linking.md) | completed | medium | small | 2,3 |

## File Ownership Matrix

| Phase | Creates | Modifies |
|-------|---------|----------|
| 1 | migration SQL | `schema.prisma` |
| 2 | `telegram-auth.service.ts`, `telegram-oidc.utils.ts` | `auth.routes.ts`, `.env.example` |
| 3 | `telegram-callback.tsx`, `telegram-oidc.ts`, `telegram-link-prompt.tsx` | `login.tsx`, `register.tsx` |
| 4 | — | `account.tsx`, `auth.routes.ts` (new endpoint) |

## Architecture

```
Browser → Telegram OIDC (oauth.telegram.org)
  → redirect with code → /auth/telegram/callback (frontend)
  → POST /auth/telegram (API)
  → exchange code → verify JWT (JWKS) → find/create user
  → admin.createUser + generateLink + verifyOtp → session
  → return session → supabase.auth.setSession() → AuthContext picks up
```

## Env Vars (new)

```
TELEGRAM_CLIENT_ID=       # Bot ID
TELEGRAM_CLIENT_SECRET=   # From BotFather OIDC
```

## Prerequisites (manual)

- [ ] Register dashboard domains in BotFather (localhost:5173 + clawquest.ai)
- [ ] Get Client ID + Client Secret from BotFather OIDC settings
