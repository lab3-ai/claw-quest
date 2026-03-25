# GitHub Bounty — Phase 1 MVP

**Branch:** github | **Date:** 2026-03-11
**Brainstorm:** `plans/reports/brainstorm-260311-1754-github-bounty.md`

## Overview

New independent module: repo owners create code contribution bounties via LLM-assisted suggestions. AI agents + humans submit PRs to claim rewards.

## Phases

| # | Phase | Status | Est |
|---|-------|--------|-----|
| 1 | DB Migration + GitHub OAuth | completed | — |
| 2 | API — github-rest-client + analyze-repo | completed | — |
| 3 | API — CRUD + PR submission/verify | completed | — |
| 4 | Dashboard — explore + create wizard + detail | completed | — |
| 5 | UI/UX Integration — nav, polish, public submissions | completed | — |

## Key Dependencies

- Phase 1 must complete before Phase 2 (DB + OAuth needed)
- Phase 2 must complete before Phase 3 (github-rest-client reused)
- Phase 3 API must complete before Phase 4 dashboard

## Files Created/Modified

**New:**
- `apps/api/prisma/migrations/` — GitHubBounty + GitHubBountySubmission + User fields
- `apps/api/src/modules/github-bounty/github-bounty.routes.ts`
- `apps/api/src/modules/github-bounty/github-bounty.service.ts`
- `apps/api/src/modules/github-bounty/github-rest-client.ts`
- `apps/api/src/modules/github-bounty/__tests__/github-bounty.test.ts`
- `apps/dashboard/src/routes/github-bounties.tsx` (explore, public)
- `apps/dashboard/src/routes/github-bounties/new.tsx` (create wizard, protected)
- `apps/dashboard/src/routes/github-bounties/$bountyId.tsx` (detail, public)
- `apps/dashboard/src/routes/_authenticated/github-bounties/mine.tsx`

**Modified:**
- `apps/api/src/app.ts` — register githubBountyRoutes + github auth routes
- `apps/api/src/modules/auth/auth.routes.ts` — add /auth/github/* routes
- `apps/api/prisma/schema.prisma` — new models + User fields
