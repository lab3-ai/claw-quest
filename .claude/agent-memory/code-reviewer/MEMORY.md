# Code Reviewer Memory

## Project Patterns
- Auth: Supabase JWT for humans, `cq_*` API keys for agents. Auth middleware in `apps/api/src/app.ts`
- `request.user.role` defaults to `'user'`, check `=== 'admin'` for admin access
- Creator-or-admin pattern: `isQuestCreatorOrAdmin()` in `quests.service.ts` -- reusable helper
- Escrow routes were admin-only, now creator-or-admin (changed in quest-ops-flow feature)

## Known Issues (as of 2026-03-02)
- `calculateDistribution` in `escrow.service.ts` line 183 filters `status: { in: ['completed', 'submitted'] }` but does NOT include `'verified'` -- the new verify flow sets status to `verified`. Distribution will skip approved participants. CRITICAL.
- `executeDistribute` has N+1 reads: queries `quest.findUnique` inside a loop for `tokenDecimals` (same value each iteration)
- QuestParticipation schema comment says `// in_progress, submitted, completed, failed` but `verified` and `rejected` are now valid statuses -- schema comment is stale
- `handleTelegramLink` returns raw BigInt `user.telegramId` -- crashes Fastify JSON serialization. Needs `String()` wrapper.
- `telegram-auth.service.ts` line 56: `listUsers()` with no pagination loads ALL Supabase users on race-condition recovery path
- `clawquest_redirect_after_login` in localStorage is used via `window.location.href` without origin validation -- open redirect risk (pre-existing across login, callback, telegram-callback)
- Username collision: Telegram login creates username `claims.username ?? 'tg_{id}'` without checking uniqueness -- will crash on duplicate

## Telegram OIDC Notes
- Auth files: `apps/api/src/modules/auth/telegram-oidc.utils.ts` (JWKS/JWT), `telegram-auth.service.ts` (login/link)
- Frontend: `apps/dashboard/src/lib/telegram-oidc.ts` (PKCE/state), `routes/auth/telegram-callback.tsx`
- Session generation uses magiclink+OTP workaround (2 Supabase API calls per login)
- User.telegramId is BigInt in Prisma -- ALWAYS use String() before returning in API responses
- Placeholder email pattern: `tg_{telegramId}@tg.clawquest.ai`

## Review Conventions
- Report output: `/Users/hd/clawquest/plans/reports/`
- Naming: `code-review-{date}-{time}-{slug}.md`
- Focus: security > correctness > performance > code quality > style
- Escrow amounts: API returns both raw BigInt strings AND `*Human` numbers -- frontends should use `*Human` fields

## File Structure Notes
- Quest routes: `apps/api/src/modules/quests/quests.routes.ts` (large file, ~1293 lines)
- Quest service: `apps/api/src/modules/quests/quests.service.ts` (validation, CRUD, verify logic)
- Escrow service: `apps/api/src/modules/escrow/escrow.service.ts` (distribution calc, on-chain ops)
- Prisma schema: `apps/api/prisma/schema.prisma`
