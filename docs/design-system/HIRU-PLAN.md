# Hiru — Design Plan

> Shared plan for UI/UX work. Team can see priorities, blockers, and coordination needs.
> Updated: 2026-03-10

---

## Current Sprint (March W2)

| Priority | Task | Team Plan | Status | Blocked by |
|----------|------|-----------|--------|------------|
| P0 | Agent detail page — redesign to design system v3 | `260302-0040` frontend-design-improvements | todo | — |
| P0 | Dashboard fund page — UI polish | `260301-1221` dashboard-fund-page | todo | — |
| P1 | Frontend design improvements — UX polish pass | `260302-0040` frontend-design-improvements | todo | — |

## Next Up

| Task | Team Plan | Notes |
|------|-----------|-------|
| Escrow mainnet — frontend updates | `260302-1902` phase-03 | Waiting on backend completion |
| Reward distribution — UI for payout status | `260302-1947` | Needs API first |

## Completed (March)

| Task | Team Plan | Date |
|------|-----------|------|
| Design System v3 — terminal theme | `260302-0040` phase-01 | 03-05 |
| CSS → Tailwind full migration | `260302-0040` phase-01 | 03-04 |
| Waitlist page + brand assets | — | 03-06 |
| Mobile responsive polish | `260302-0040` phase-02 | 03-07 |
| Geist Mono font migration | — | 03-09 |

## Needs from Team

- @Vincent: Agent detail page API (`GET /agents/:id`) — is it stable? Need final response shape for UI
- @Ray: Coordinate on dashboard layout changes before fund page redesign
- @Ryan: Stripe Connect pages — any more UI changes needed?

## Notes

- Design system v3 docs: `docs/design-system/DESIGN_SYSTEM.md`
- All new pages must use Tailwind + shadcn/ui + MingCute icons
- No hardcoded hex colors — use CSS variable tokens
