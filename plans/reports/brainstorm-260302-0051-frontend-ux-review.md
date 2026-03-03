# Brainstorm: Frontend UX Review

**Date:** 2026-03-02 | **Status:** Agreed

## Problem Statement
ClawQuest dashboard built dev-first (SO-inspired theme). Mixed audience (sponsors, marketers) coming soon. Need to polish without redesigning. Current gaps: no responsive on core pages, no shared loading/error patterns, incomplete design tokens, Agent List breaks CSS conventions.

## Evaluated Approaches

### A. Full Redesign (glassmorphism/dark)
- **Pros:** Modern look, crypto-native feel
- **Cons:** Massive effort, breaks 25 CSS files, unnecessary for functional app
- **Verdict:** REJECTED — current theme is pragmatic and functional

### B. Incremental Polish (chosen)
- **Pros:** Low risk, builds on existing system, phased delivery
- **Cons:** Won't "wow" visually, but that's acceptable
- **Verdict:** APPROVED — strengthen existing design system

### C. Component Library Migration (shadcn everywhere)
- **Pros:** Consistent components out of box
- **Cons:** Contradicts established CSS-variable convention, large refactor
- **Verdict:** REJECTED — would create MORE inconsistency during migration

## Final Agreed Solution

4 phases in order, ref: `plans/260302-0040-frontend-design-improvements/plan.md`

1. **Design System Foundation** — tokens, global focus-visible, reduced-motion, skeleton utility
2. **Responsive & Mobile** — hamburger menu, responsive tables/cards, touch targets
3. **UX Polish** — loading skeletons, error states, hover transitions, focus trap
4. **Agent List Refactor** — CSS variables, wire Manage button, styled empty state

## Key Decisions
- Keep SO-inspired light theme (no dark mode for now)
- Agent List: full refactor to CSS design system (not keep as-is)
- Audience: mixed (sponsors + devs) — polish is mandatory, not optional
- Skeleton loaders considered foundational (Phase 1 utility, Phase 3 implementation)

## Risks
- Dashboard.tsx at 600+ lines — Phase 3 touches it, risk of regressions
- Agent List refactor removes shadcn/ui dependency for that page — test thoroughly

## Next Steps
Implement Phase 1 → 2 → 3 → 4 sequentially. Commit after each phase.
