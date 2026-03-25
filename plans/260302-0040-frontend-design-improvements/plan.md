---
title: "Frontend Design Improvements"
description: "Polish dashboard UX: design tokens, responsive mobile, loading states"
status: pending
priority: P2
effort: 5h
branch: main
tags: [frontend, css, ux, responsive, design-system]
created: 2026-03-02
---

# Frontend Design Improvements Plan

**Scope:** Dashboard, Quest Management, Account pages + Design System gaps

---

## Phases

| # | Phase | Priority | Effort | Status | Detail |
|---|-------|----------|--------|--------|--------|
| 1 | [Design System Foundation](./phase-01-design-system-foundation.md) | HIGH | ~1h | Pending | CSS tokens, focus-visible, reduced-motion, skeleton, button states |
| 2 | [Responsive & Mobile](./phase-02-responsive-mobile.md) | HIGH | ~2h | Pending | Hamburger menu, responsive tables/cards, touch targets, form stacking |
| 3 | [UX Polish](./phase-03-ux-polish.md) | MEDIUM | ~2h | Pending | Loading skeletons, error states, hover transitions, modal focus trap |

**Execution order:** 1 > 2 > 3 (Phase 1 tokens used by all subsequent phases)

> **Note:** Phase 4 (Agent List Refactor) removed — `/agents` and `/agents/new` routes deleted. Dashboard already has My Agents tab + Register Agent modal, making standalone agent pages redundant.

---

## Current State Assessment

### Design System (index.css + 25 shared CSS files)
- **Strengths:** Consistent CSS variables, SO-inspired neutral palette, clean typography (system fonts), per-page CSS files
- **Weaknesses:** No responsive breakpoints, no transition/shadow/spacing/radius tokens, buttons lack `:focus-visible`, no `reduced-motion`, no skeleton utility

### Page-by-Page Issues

| Page | Key Issues |
|------|-----------|
| **Dashboard** | 600+ line monolith, no loading skeletons, quest table not responsive, modal lacks focus trap |
| **Agent List** (`index.tsx`) | ~~Removed~~ — redundant with Dashboard My Agents tab |
| **Account** | No loading state, no error state for profile/wallets fetch |
| **Layouts** | No mobile hamburger menu, topbar 36px too small for touch (44px min) |

---

## Files Changed (All Phases)

| File | Phases |
|------|--------|
| `apps/dashboard/src/index.css` | 1 |
| `apps/dashboard/src/styles/base.css` | 1 |
| `apps/dashboard/src/styles/buttons.css` | 1 |
| `apps/dashboard/src/styles/topbar.css` | 2 |
| `apps/dashboard/src/styles/pages/dashboard.css` | 2, 3 |
| `apps/dashboard/src/styles/forms.css` | 2 |
| `apps/dashboard/src/styles/footer.css` | 2 |
| `apps/dashboard/src/routes/_public.tsx` | 2 |
| `apps/dashboard/src/routes/_authenticated.tsx` | 2 |
| `apps/dashboard/src/routes/_authenticated/dashboard.tsx` | 3 |
| `apps/dashboard/src/routes/_authenticated/account.tsx` | 3 |
| `apps/dashboard/src/styles/pages/account.css` | 3 |
| `apps/dashboard/src/routes/_authenticated/index.tsx` | ~~Deleted~~ |
| `apps/dashboard/src/routes/_authenticated/agents/new.tsx` | ~~Deleted~~ |
| `apps/dashboard/src/router.tsx` | Route cleanup (redirects) |

---

## What This Plan Does NOT Cover
- Dark mode
- Complete redesign / glassmorphism
- Landing page / marketing pages
- Animations beyond micro-interactions
- i18n / multi-language
- Create Quest wizard keyboard navigation (separate effort)

---

## Design Recommendation

Keep the SO-inspired light theme. These improvements strengthen the existing system without replacing it. Optional future: `[data-theme="dark"]` CSS variable overrides.
