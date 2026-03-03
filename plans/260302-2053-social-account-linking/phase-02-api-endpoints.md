# Phase 02: API Endpoints

**Context:** [Brainstorm report](../reports/brainstorm-260302-2053-social-account-linking.md) | [plan.md](./plan.md)

## Overview

- **Priority:** P1 (blocks Phase 3 frontend)
- **Status:** Complete
- **Effort:** 1.5h

Add 2 new endpoints to `auth.routes.ts` + extend `/auth/me` response with social fields.

## Key Insights

- `app.supabase` is available in route handlers (Supabase admin client already decorated on fastify instance)
- `request.user.supabaseId` available via `app.authenticate` middleware
- Pattern: `app.supabase.auth.admin.getUserById(supabaseId)` → returns user with `identities[]`
- Each identity has: `{ provider, identity_data: { sub, user_name, full_name, avatar_url } }`
- Only Twitter and Discord need Prisma sync; Google/GitHub → return 200 with no DB write
- Unlink happens client-side (Supabase JS SDK); backend only clears Prisma fields

## Requirements

### POST /auth/social/sync
- Auth: Bearer (Supabase JWT)
- Body: `{ provider: 'twitter' | 'discord' | 'google' | 'github' }`
- Logic:
  - Get Supabase user via `app.supabase.auth.admin.getUserById(request.user.supabaseId)`
  - Find identity: `identities.find(i => i.provider === provider)`
  - If not found: 400 error (`provider not linked in Supabase`)
  - Twitter: update User `xId = identity.identity_data.sub`, `xHandle = identity.identity_data.user_name`
  - Discord: update User `discordId = identity.identity_data.sub`, `discordHandle = identity.identity_data.user_name`
  - Google/GitHub: skip Prisma update, return 200 immediately
- Returns: `{ ok: true }`

### DELETE /auth/social/:provider
- Auth: Bearer (Supabase JWT)
- Params: `provider: 'twitter' | 'discord'` (Google/GitHub don't need Prisma cleanup)
- Logic:
  - Twitter: set `xId = null`, `xHandle = null`
  - Discord: set `discordId = null`, `discordHandle = null`
  - Other: return 400 (`provider not supported for sync`)
- Returns: `{ ok: true }`

### GET /auth/me (extend)
- Add to response: `xHandle`, `xId`, `discordHandle`, `discordId`
- Read from Prisma User row (already present after sync)

## Related Code Files

| File | Action | Change |
|------|--------|--------|
| `apps/api/src/modules/auth/auth.routes.ts` | Modify | Add 2 endpoints + extend /me |

## Architecture

```
POST /auth/social/sync
  ├── authenticate (Bearer JWT)
  ├── validate body: { provider }
  ├── supabase.auth.admin.getUserById(supabaseId)
  ├── find identity by provider
  ├── if twitter → prisma.user.update({ xId, xHandle })
  ├── if discord → prisma.user.update({ discordId, discordHandle })
  └── return { ok: true }

DELETE /auth/social/:provider
  ├── authenticate (Bearer JWT)
  ├── if twitter → prisma.user.update({ xId: null, xHandle: null })
  ├── if discord → prisma.user.update({ discordId: null, discordHandle: null })
  └── return { ok: true }
```

## Implementation Steps

1. **Open `apps/api/src/modules/auth/auth.routes.ts`**

2. **Add Zod schema for sync body** (top of file, after imports):
   ```typescript
   const SocialSyncBody = z.object({
     provider: z.enum(['twitter', 'discord', 'google', 'github']),
   })
   const SocialProviderParam = z.object({
     provider: z.enum(['twitter', 'discord']),
   })
   ```

3. **Add `POST /auth/social/sync` endpoint** (after the `/telegram/link` route):
   ```typescript
   app.post('/social/sync', {
     onRequest: [app.authenticate],
     schema: {
       tags: ['Auth'],
       summary: 'Sync social identity handle to user profile',
       security: [{ bearerAuth: [] }],
       body: SocialSyncBody,
     },
   }, async (request, reply) => {
     const { provider } = SocialSyncBody.parse(request.body)

     // Skip Prisma update for Google/GitHub
     if (provider === 'google' || provider === 'github') {
       return { ok: true }
     }

     const { data: supabaseUser, error } = await app.supabase.auth.admin.getUserById(
       request.user.supabaseId!
     )
     if (error || !supabaseUser) {
       return reply.status(400).send({ error: { message: 'Failed to fetch Supabase user', code: 'SUPABASE_ERROR' } })
     }

     const identity = supabaseUser.user.identities?.find(i => i.provider === provider)
     if (!identity) {
       return reply.status(400).send({ error: { message: `Provider '${provider}' not linked`, code: 'PROVIDER_NOT_LINKED' } })
     }

     const sub = identity.identity_data?.sub as string
     const userName = identity.identity_data?.user_name as string | undefined

     if (provider === 'twitter') {
       await app.prisma.user.update({
         where: { id: request.user.id },
         data: { xId: sub, xHandle: userName ?? null },
       })
     } else if (provider === 'discord') {
       await app.prisma.user.update({
         where: { id: request.user.id },
         data: { discordId: sub, discordHandle: userName ?? null },
       })
     }

     return { ok: true }
   })
   ```

4. **Add `DELETE /auth/social/:provider` endpoint:**
   ```typescript
   app.delete('/social/:provider', {
     onRequest: [app.authenticate],
     schema: {
       tags: ['Auth'],
       summary: 'Clear social identity from user profile (after client-side unlink)',
       security: [{ bearerAuth: [] }],
       params: SocialProviderParam,
     },
   }, async (request, reply) => {
     const { provider } = SocialProviderParam.parse(request.params)

     if (provider === 'twitter') {
       await app.prisma.user.update({
         where: { id: request.user.id },
         data: { xId: null, xHandle: null },
       })
     } else if (provider === 'discord') {
       await app.prisma.user.update({
         where: { id: request.user.id },
         data: { discordId: null, discordHandle: null },
       })
     }

     return { ok: true }
   })
   ```

5. **Extend `GET /me` response** — add new fields to the return object:
   ```typescript
   return {
     // ...existing fields...
     xId: user.xId ?? null,
     xHandle: user.xHandle ?? null,
     discordId: user.discordId ?? null,
     discordHandle: user.discordHandle ?? null,
   }
   ```

6. **Compile check:**
   ```bash
   pnpm --filter api build
   ```

## Todo List

- [x] Add `SocialSyncBody` and `SocialProviderParam` Zod schemas
- [x] Add `POST /auth/social/sync` endpoint
- [x] Add `DELETE /auth/social/:provider` endpoint
- [x] Extend `GET /auth/me` to return `xId`, `xHandle`, `discordId`, `discordHandle`
- [x] Run `pnpm --filter api build` and fix any type errors

## Success Criteria

- `POST /auth/social/sync` with `{ provider: 'twitter' }` stores xHandle in Prisma
- `POST /auth/social/sync` with `{ provider: 'google' }` returns 200 with no DB write
- `DELETE /auth/social/twitter` sets xId/xHandle to null
- `GET /auth/me` returns new social fields
- API compiles without errors
- Swagger docs show new endpoints at `/docs`

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| `user_name` field absent in identity_data | Medium | Use `?? null` fallback |
| `supabaseId` null on User (legacy users) | Low | Handle gracefully, return 400 |
| Unique constraint on xId if user re-links same account | Low | `update` upserts — no conflict |

## Security Considerations

- Both endpoints protected by `app.authenticate` — Supabase Bearer token required
- Backend uses admin client (`app.supabase.auth.admin`) to read identity data — safe, server-side only
- Provider clearing on DELETE only affects requesting user (`where: { id: request.user.id }`)

## Next Steps

→ Phase 03: Frontend (Link/Unlink UI + callback handling)
