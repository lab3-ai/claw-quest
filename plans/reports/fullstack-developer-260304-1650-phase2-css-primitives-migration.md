# Phase Implementation Report

## Executed Phase
- Phase: Phase 2 — Replace shared CSS primitives with shadcn/Tailwind
- Plan: /Volumes/NNTH-DATA/Workspace/Works/clawquest/plans/
- Status: completed

## Files Modified

| File | Changes |
|------|---------|
| `apps/dashboard/src/main.tsx` | Removed 5 CSS imports (badges, buttons, status-dots, breadcrumb, pager) |
| `apps/dashboard/src/routes/login.tsx` | Added Button import, replaced 5x `btn btn-outline` + 1x `btn btn-primary` |
| `apps/dashboard/src/routes/register.tsx` | Added Button import, replaced 1x `btn btn-outline` + 1x `btn btn-primary` |
| `apps/dashboard/src/routes/_authenticated/account.tsx` | Added Button import, replaced 10x button usages (btn-sm, btn-outline, btn-secondary variants) |
| `apps/dashboard/src/routes/_authenticated/dashboard.tsx` | Added Button+Badge imports, replaced btn-agent, btn-quest header buttons, badge+status-dot in card/list views, draft-action Link buttons, agent status-dots |
| `apps/dashboard/src/routes/_authenticated/quests/index.tsx` | Added Button+Badge imports, replaced btn-primary create button and 2x badge usages in table |
| `apps/dashboard/src/routes/_authenticated/quests/create.tsx` | Added Button+Badge imports, replaced breadcrumb (x2), btn usages (InviteBot, tab-nav x4, preview save/fund buttons), badge usages (draft/type/social/skill x4) |
| `apps/dashboard/src/routes/_authenticated/quests/$questId/manage.tsx` | Added Button+Badge imports, replaced breadcrumb, 2x btn-primary/secondary action buttons, 2x badge usages in sidebar |
| `apps/dashboard/src/routes/_authenticated/quests/$questId/fund.tsx` | Added Button import, replaced breadcrumb, 3x btn usages (back-to-dashboard, switch-network, try-again) |
| `apps/dashboard/src/routes/_public/quests/detail.tsx` | Added Button+Badge imports, replaced breadcrumb, 2x claim-banner buttons, 6x badge usages in header/sidebar/task-cards |
| `apps/dashboard/src/routes/_public/quests/questers.tsx` | Added Button+Badge imports, replaced breadcrumb, 1x badge usage, pager → Tailwind+Button |
| `apps/dashboard/src/components/escrow/fund-success.tsx` | Added Button import, replaced `Link.btn btn-primary` → `Button asChild` |
| `apps/dashboard/src/components/escrow/fund-approve-deposit.tsx` | Added Button import, replaced 2x `btn btn-primary fund-btn` → `Button className="fund-btn"` |

## CSS Files Deleted
- `apps/dashboard/src/styles/badges.css`
- `apps/dashboard/src/styles/buttons.css`
- `apps/dashboard/src/styles/status-dots.css`
- `apps/dashboard/src/styles/breadcrumb.css`
- `apps/dashboard/src/styles/pager.css`

## Tasks Completed
- [x] All 12 route/component files processed
- [x] `.btn` → `<Button>` with correct variants (default, secondary, outline, ghost, agent, quest, danger)
- [x] `.badge` → `<Badge>` with correct variants (fcfs, leaderboard, luckydraw, crypto, fiat, skill, social, live, completed, draft, pending-claim, etc.)
- [x] `.status-dot` → Tailwind inline-block span with CSS variable colors
- [x] `.breadcrumb` → `<nav className="flex items-center gap-1.5 py-3 text-xs text-muted-foreground">`
- [x] `.pager` + `.pager-buttons` → Tailwind flex layout + `<Button variant="outline" size="sm">`
- [x] 5 CSS imports removed from main.tsx
- [x] 5 CSS files deleted
- [x] `Button asChild` pattern used for all `<Link>` wrapping
- [x] Excluded classes untouched: `cta-btn`, `task-action-btn`, `copy-btn`, `fund-btn` (kept as extra className), `btn-approve`, `btn-reject`, `btn-action-row`, `actor-badge`, `badge-soon`

## Tests Status
- Type check: pass (tsc compiled without errors)
- Build: pass (`pnpm --filter dashboard build` — ✓ built in 11.22s)
- Unit tests: N/A (no test suite for dashboard components)

## Issues Encountered
- `fund-btn` class in `fund-approve-deposit.tsx` was in exclusion list but the element also had `btn btn-primary` — resolved by converting to `<Button className="fund-btn">` preserving the page-specific class
- `QuestersPopup.tsx` has remaining `badge badge-X` usage — NOT in scope for this phase (not in files list), left untouched
- `badge-expired` variant used dynamically in `typeBadgeClass`/`statusBadgeClass` helpers — converted using `.replace("badge-", "")` pattern cast to `any` for type compatibility

## Next Steps
- Phase 3 can proceed: migrate page-specific CSS classes (cta-btn, task-action-btn, copy-btn, actor-badge, payout-badge, custom-skill-badge, badge-soon)
- `QuestersPopup.tsx` badge migration should be included in a subsequent phase
