# Hiru — Design Plan

> Shared plan for UI/UX work. Team can see priorities, blockers, and coordination needs.
> Updated: 2026-03-12

---

## Current Sprint (March W2)

| Priority | Task | Team Plan | Status | Blocked by |
|----------|------|-----------|--------|------------|
| P0 | Agent detail page — redesign to design system v3 | `260302-0040` frontend-design-improvements | todo | — |
| P0 | Dashboard fund page — UI polish | `260301-1221` dashboard-fund-page | todo | — |
| P0 | Animated banner — responsive polish (mobile/tablet breakpoints) | — | in-progress | — |
| P1 | Frontend design improvements — UX polish pass | `260302-0040` frontend-design-improvements | todo | — |

## Next Up

| Task | Team Plan | Notes |
|------|-----------|-------|
| Quest table sort (Time Left, Reward) | — | Low priority — add when quests reach 100+. Client-side sort on existing columns |
| Leaderboard section on `/quests` | — | Needs new API endpoint + FE section. See details below |
| Escrow mainnet — frontend updates | `260302-1902` phase-03 | Waiting on backend completion |
| Reward distribution — UI for payout status | `260302-1947` | Needs API first |

### Leaderboard Section — Scope

**Goal**: Add a leaderboard section to `/quests` page showing top questers.

**Backend** (needs @Brian/@Ryan):
- New `GET /quests/leaderboard` endpoint
- Aggregate `QuestParticipation` by user/agent: count completed quests, sum earnings
- Support `?period=week|month|all` filter
- Return top 10-20 entries with user/agent identity

**Frontend** (Hiru):
- New section on `/quests` page (below tabs, above banner)
- Show rank, avatar, name, quests completed, total earned
- Period toggle (week/month/all-time)
- Responsive: horizontal scroll table on mobile
- Design system v3 compliant (Tailwind + shadcn/ui)

**Open questions**:
- Rank by quest count vs total earnings vs composite score?
- Show users, agents, or both?
- Need team input before implementation

## Completed (March)

| Task | Team Plan | Date |
|------|-----------|------|
| Design System v3 — terminal theme | `260302-0040` phase-01 | 03-05 |
| CSS → Tailwind full migration | `260302-0040` phase-01 | 03-04 |
| Waitlist page + brand assets | — | 03-06 |
| Mobile responsive polish | `260302-0040` phase-02 | 03-07 |
| Geist Mono font migration | — | 03-09 |
| Brand logo eye blink animation | — | 03-12 |
| Public navbar redesign (sliding indicator) | — | 03-12 |
| Animated banner on `/quests` (robot + floating elements) | — | 03-12 |

## Needs from Team

- @Vincent: Agent detail page API (`GET /agents/:id`) — is it stable? Need final response shape for UI
- @Ray: Coordinate on dashboard layout changes before fund page redesign
- @Ryan: Stripe Connect pages — any more UI changes needed?

## Notes

- Design system v3 docs: `docs/design-system/DESIGN_SYSTEM.md`
- All new pages must use Tailwind + shadcn/ui + MingCute icons
- No hardcoded hex colors — use CSS variable tokens
