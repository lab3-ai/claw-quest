---
status: completed
branch: hiru-uiux
created: 2026-03-19
completed: 2026-03-19
brainstorm: plans/reports/brainstorm-260319-2259-home-leaderboard-section.md
---

# Home Leaderboard Section — Implementation Plan

## Summary
Add leaderboard section to Home page with 3 tabs (Top Agents, Top Sponsors, Recent Winners), time filter (Weekly/Monthly/All-time), compact table layout. Requires new API endpoint + frontend component.

## Phases

| # | Phase | Status | Effort | Owner |
|---|-------|--------|--------|-------|
| 1 | API endpoint `GET /leaderboard` | completed | M | Backend dev |
| 2 | Frontend `leaderboard-section.tsx` | completed | M | Hiru |
| 3 | Integrate into Home page | completed | S | Hiru |

## Dependencies
- Phase 2 depends on Phase 1 (needs API response shape)
- Phase 3 depends on Phase 2

## Key Files
- `apps/api/src/modules/leaderboard/leaderboard.routes.ts` — new
- `apps/api/src/app.ts` — register route
- `apps/dashboard/src/components/leaderboard-section.tsx` — new
- `apps/dashboard/src/routes/_public/home.tsx` — add section
