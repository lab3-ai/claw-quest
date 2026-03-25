---
title: "Social Account Linking"
description: "Add Link/Unlink for Google, GitHub, X (Twitter), Discord on user account page via Supabase linkIdentity."
status: complete
priority: P2
effort: 5h
issue:
branch: main
tags: [feature, frontend, backend, auth]
created: 2026-03-02
---

# Social Account Linking

## Overview

Account page shows 4 social providers (Google, GitHub, X, Discord) but none are actionable:
- Google / GitHub: "Not linked" with no button
- X / Discord: "Coming soon" placeholder

Goal: full Link + Unlink flow for all 4 providers. X/Discord handles stored in Prisma for social task verification.

## Architecture

```
Provider   OAuth Method               Prisma sync?
──────────────────────────────────────────────────
Google     supabase.auth.linkIdentity  NO
GitHub     supabase.auth.linkIdentity  NO
Twitter    supabase.auth.linkIdentity  YES (xHandle, xId)
Discord    supabase.auth.linkIdentity  YES (discordHandle, discordId)
```

**Link flow (Twitter/Discord):**
```
Link button → localStorage.set linking_provider → linkIdentity()
→ OAuth redirect → /auth/callback (USER_UPDATED event)
→ POST /auth/social/sync → store handle in Prisma → redirect /account
```

**Link flow (Google/GitHub):**
```
Link button → linkIdentity() → OAuth redirect → /auth/callback
→ USER_UPDATED → no sync → redirect /account (session identities auto-updated)
```

**Unlink flow:**
```
Unlink button → safety check (lockout prevention)
→ supabase.auth.unlinkIdentity() [client-side]
→ DELETE /auth/social/:provider [backend, clears Prisma for x/discord]
→ invalidate queries
```

## Phases

| # | Phase | Status | Effort | Link |
|---|-------|--------|--------|------|
| 1 | DB Migration | Complete | 30m | [phase-01](./phase-01-db-migration.md) |
| 2 | API Endpoints | Complete | 1.5h | [phase-02](./phase-02-api-endpoints.md) |
| 3 | Frontend | Complete | 3h | [phase-03-frontend.md](./phase-03-frontend.md) |

## Dependencies

- Supabase Twitter OAuth app configured in Supabase dashboard
- Supabase Discord OAuth app configured in Supabase dashboard
- `@supabase/supabase-js` v2.39+ (supports `linkIdentity` / `unlinkIdentity`)
- Existing `/auth/me` endpoint (Phase 2 extends it)
- Existing `/auth/callback` route (Phase 3 extends it)

## Key Risks

| Risk | Mitigation |
|------|-----------|
| Twitter/Discord OAuth not configured in Supabase | Clear error message + setup docs |
| USER_UPDATED fires for non-link reasons | localStorage `clawquest_linking_provider` as guard |
| Unlink last auth method → lockout | Block if `identities.length === 1` AND no Telegram |
| Sync fails → handle not stored in Prisma | `/auth/me` fallback to Supabase identity data |
| Twitter identity_data field names | Use `user_name` (Supabase standard); test in dev |
