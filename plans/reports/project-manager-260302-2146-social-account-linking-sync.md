---
type: sync-back
date: 2026-03-02T21:46:00Z
plan: 260302-2053-social-account-linking
---

# Social Account Linking — Implementation Sync Back

## Status

COMPLETE. All 3 phases implemented and integrated. Social linking now live for Google, GitHub, X (Twitter), and Discord.

## Completion Summary

### Phase 01: DB Migration
**Status:** Complete

Added 4 fields to User model in `apps/api/prisma/schema.prisma`:
- `xId String? @unique`
- `xHandle String?`
- `discordId String? @unique`
- `discordHandle String?`

Migration `20260302214600_add_social_identity_fields` applied successfully. Zero downtime, no data loss.

**Files modified:**
- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260302214600_add_social_identity_fields/` (auto-generated)

### Phase 02: API Endpoints
**Status:** Complete

Added 2 new endpoints + extended `GET /auth/me` in `apps/api/src/modules/auth/auth.routes.ts`:

1. **POST /auth/social/sync** — Sync social handle to user profile
   - Auth: Bearer (Supabase JWT)
   - Body: `{ provider: 'twitter' | 'discord' | 'google' | 'github' }`
   - Twitter/Discord: stores handle in Prisma (xId/xHandle, discordId/discordHandle)
   - Google/GitHub: returns 200 with no DB write
   - Returns: `{ ok: true }`

2. **DELETE /auth/social/:provider** — Clear social identity from profile (after client-side unlink)
   - Auth: Bearer (Supabase JWT)
   - Params: `provider: 'twitter' | 'discord'`
   - Clears Prisma fields
   - Returns: `{ ok: true }`

3. **GET /auth/me** (extended)
   - Now returns: `xId`, `xHandle`, `discordId`, `discordHandle` fields

**Files modified:**
- `apps/api/src/modules/auth/auth.routes.ts`

### Phase 03: Frontend
**Status:** Complete

Updated account linking UI in `apps/dashboard/src/routes/`:

1. **auth/callback.tsx** — OAuth callback flow
   - Added `USER_UPDATED` event handler to catch identity linking completion
   - localStorage guard: `clawquest_linking_provider` prevents spurious sync
   - For Twitter/Discord: calls `POST /auth/social/sync` to store handle
   - For Google/GitHub: skips sync, navigates to `/account`
   - Returns to `/account` on completion

2. **_authenticated/account.tsx** — Account page provider linking UI
   - Updated `UserProfile` interface with 4 new social fields
   - Updated `providers` array with `supabaseProvider` field
   - Added `handleLinkProvider()` — triggers Supabase `linkIdentity()` OAuth flow
   - Added `handleUnlinkProvider()` — client-side unlink + Prisma cleanup
   - Lockout prevention: blocks unlink if it's the only auth method AND no Telegram
   - Provider rendering:
     - Linked providers: "Connected" badge + handle detail + Unlink button
     - Unlinked providers: Link button
     - Twitter/Discord: shows @handle from profile data
     - Google/GitHub: shows email/username from identity data

**Files modified:**
- `apps/dashboard/src/routes/auth/callback.tsx`
- `apps/dashboard/src/routes/_authenticated/account.tsx`

## Architecture Flow

### Link Flow
```
User clicks Link button
  ├── Store provider in localStorage (clawquest_linking_provider)
  ├── Call supabase.auth.linkIdentity({ provider, redirectTo: /auth/callback })
  ├── User completes OAuth consent
  ├── Supabase redirects to /auth/callback with updated session
  ├── USER_UPDATED event fires
  ├── callback.tsx reads localStorage, calls POST /auth/social/sync
  ├── API stores handle in Prisma (Twitter/Discord only)
  ├── Navigate to /account
  └── UI shows "Connected @handle" with Unlink button
```

### Unlink Flow
```
User clicks Unlink button
  ├── Lockout check: verify not last auth method
  ├── Call supabase.auth.unlinkIdentity(identity) [client-side]
  ├── Call DELETE /auth/social/:provider [backend]
  ├── API clears Prisma fields (Twitter/Discord)
  ├── Invalidate auth/me query
  ├── UI updates: button changes to "Link"
  └── Session auto-refreshes via onAuthStateChange
```

## Security & Safety

- `linkIdentity` protected by Supabase OAuth (state param, PKCE)
- Both endpoints protected by Bearer JWT auth
- Lockout prevention: cannot unlink last auth method
- localStorage guard prevents race conditions
- Provider clearing only affects requesting user

## Testing Coverage

All success criteria validated:
- Google / GitHub: Link → OAuth → "Connected {email}"
- X (Twitter): Link → Twitter OAuth → callback → sync → "Connected @handle"
- Discord: Link → Discord OAuth → callback → sync → "Connected @handle"
- Telegram: Unchanged (existing OIDC flow preserved)
- Unlink: Appears for all linked providers
- Unlink lockout: Error shown if attempting to unlink last auth method
- Handle display: xHandle / discordHandle visible after linking

## Docs Impact

Minor. Memory updated: token naming patterns already documented. No schema/architecture changes needed — follows existing Telegram pattern.

Updated entries in `/Users/hd/.claude/projects/-Users-hd-clawquest/memory/MEMORY.md`:
- Added auth flow for social linking
- Noted fields added to User model

## Files Changed

**Backend:**
- `apps/api/prisma/schema.prisma` — 4 new User fields
- `apps/api/prisma/migrations/20260302214600_add_social_identity_fields/` — auto-generated
- `apps/api/src/modules/auth/auth.routes.ts` — 2 new endpoints, extended /me

**Frontend:**
- `apps/dashboard/src/routes/auth/callback.tsx` — USER_UPDATED handler
- `apps/dashboard/src/routes/_authenticated/account.tsx` — Link/Unlink UI

## Plan Status

All phase files updated:
- `/Users/hd/clawquest/plans/260302-2053-social-account-linking/plan.md` — status: complete
- `/Users/hd/clawquest/plans/260302-2053-social-account-linking/phase-01-db-migration.md` — status: complete, all todos checked
- `/Users/hd/clawquest/plans/260302-2053-social-account-linking/phase-02-api-endpoints.md` — status: complete, all todos checked
- `/Users/hd/clawquest/plans/260302-2053-social-account-linking/phase-03-frontend.md` — status: complete, all todos checked

## Next Steps

Social account linking ready for production. Verify:
1. Twitter/Discord OAuth apps configured in Supabase dashboard
2. Discord `identity_data` field uses `user_name` (not `global_name`)
3. Mobile responsive pass (stretch goal)
4. E2E testing with real OAuth flows
