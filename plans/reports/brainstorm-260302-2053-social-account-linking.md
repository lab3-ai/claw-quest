# Brainstorm: Social Account Linking for User Account Page

**Date:** 2026-03-02
**Status:** Agreed — proceed to plan

---

## Problem Statement

Account page shows 4 social providers (Google, GitHub, X, Discord) but:
- Google / GitHub: "Not linked" with no action button
- X (Twitter) / Discord: "Coming soon" (hardcoded, no implementation)
- Telegram: ✅ working (custom OIDC)

Users have no way to link any social provider except Telegram.
Need: full Link/Unlink support for all 4 providers.

---

## Requirements

1. **Platforms:** Google, GitHub, X (Twitter), Discord
2. **Purpose:** OAuth identity linking (login) + store handle in Prisma for social task verification
3. **Unlink support:** required (with lockout prevention)

---

## Evaluated Approaches

### Option A: Supabase linkIdentity (Recommended ✅)
Use Supabase's built-in `supabase.auth.linkIdentity({ provider })` for all OAuth providers.

**Pros:**
- Consistent with existing Supabase auth patterns
- Handles OAuth token exchange, deduplication, security
- No extra OAuth app setup beyond Supabase dashboard config
- `unlinkIdentity()` available client-side

**Cons:**
- Doesn't give us OAuth tokens for actual Twitter/Discord API calls (future limitation)
- Callback needs `USER_UPDATED` handling (currently ignored)

### Option B: Custom OAuth per-provider
Implement OAuth 2.0 flows manually for each provider.

**Cons:** Over-engineered, 4x more code, error-prone. Rejected.

---

## Final Architecture

```
Provider     OAuth Method               Prisma sync?
──────────────────────────────────────────────────────
Google       supabase.auth.linkIdentity    NO  (Supabase identities sufficient)
GitHub       supabase.auth.linkIdentity    NO  (Supabase identities sufficient)
X (Twitter)  supabase.auth.linkIdentity    YES (store xHandle/xId for verification)
Discord      supabase.auth.linkIdentity    YES (store discordHandle/discordId)
```

### Link Flow (X / Discord)
```
Account page → linkIdentity({ provider: 'twitter' })
  → localStorage.set('clawquest_linking_provider', 'twitter')
  → Twitter OAuth redirect
  → /auth/callback: USER_UPDATED event
  → POST /auth/social/sync { provider: 'twitter' }
  → backend: reads identity from Supabase admin, stores xHandle/xId in Prisma
  → redirect to /account → shows "@handle Connected"
```

### Link Flow (Google / GitHub)
```
Account page → linkIdentity({ provider: 'google' })
  → Google OAuth redirect
  → /auth/callback: USER_UPDATED event
  → no sync needed
  → redirect to /account → session.user.identities updated, shows "Connected"
```

### Unlink Flow
```
User clicks "Unlink" on provider
  → safety check: block if last auth method
  → supabase.auth.unlinkIdentity(identity)  [client-side, no service role needed]
  → DELETE /auth/social/:provider  [clears Prisma fields for x/discord]
  → invalidate queries → UI updates
```

---

## Implementation Phases

### Phase 1: DB Migration
Add to `User` model in `apps/api/prisma/schema.prisma`:
```prisma
xId           String?  @unique
xHandle       String?
discordId     String?  @unique
discordHandle String?
```
Run `pnpm db:migrate`.

### Phase 2: API (`apps/api/src/modules/auth/auth.routes.ts`)
- `POST /auth/social/sync` — reads identity from Supabase admin, updates Prisma xHandle/discordHandle
- `DELETE /auth/social/:provider` — clears Prisma fields
- Update `GET /auth/me` → include xHandle, discordHandle

### Phase 3: Frontend
- `apps/dashboard/src/routes/auth/callback.tsx` — handle `USER_UPDATED` + sync flow
- `apps/dashboard/src/routes/_authenticated/account.tsx` — Link/Unlink buttons for all providers

---

## Key Risks

| Risk | Mitigation |
|------|-----------|
| Twitter/Discord OAuth not configured in Supabase dashboard | Doc req; clear error message if provider not enabled |
| `USER_UPDATED` fires for non-link reasons | localStorage `clawquest_linking_provider` flag as guard |
| Unlinking last auth method → lockout | Block unlink if `identities.length === 1` AND no Telegram linked |
| Sync fails → Supabase has identity, Prisma doesn't | `/auth/me` can fallback to Supabase identity data |
| Twitter identity_data field names vary | Verify: `user_name` or `preferred_username` — test in dev |

---

## Success Criteria
- Google / GitHub: Link → "Connected {email}" ; Unlink → "Not linked"
- X / Discord: Link → "Connected @handle" ; Unlink → "Not linked"
- Cannot unlink last remaining auth method
- xHandle / discordHandle stored in Prisma and returned by `/auth/me`
- No regression in existing Telegram linking flow
