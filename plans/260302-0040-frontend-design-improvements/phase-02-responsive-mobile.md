# Phase 2: Responsive & Mobile

**Priority:** HIGH | **Status:** Pending | **Effort:** ~2h

## Overview

Add mobile support. Hamburger menu for topbar, responsive quest/agent tables, touch-friendly targets, form grid stacking. Currently zero responsive breakpoints exist.

## Files to Modify/Create

| File | Action |
|------|--------|
| `apps/dashboard/src/styles/topbar.css` | Add hamburger styles + `@media` rules |
| `apps/dashboard/src/styles/pages/dashboard.css` | Responsive quest list + agent table |
| `apps/dashboard/src/styles/forms.css` | Stack `.form-row` / `.form-row-3` on mobile |
| `apps/dashboard/src/styles/footer.css` | Stack footer on mobile |
| `apps/dashboard/src/routes/_public.tsx` | Add hamburger button + mobile menu state |
| `apps/dashboard/src/routes/_authenticated.tsx` | Same hamburger + mobile menu |

No new CSS files needed -- keep responsive rules co-located in existing files.

## Key Decisions

- **Breakpoint:** `640px` for hamburger, `768px` for table-to-card. Only 2 breakpoints, KISS.
- **Approach:** CSS-only for layout; minimal JS (toggle menu state) in layout components.
- **Touch target:** 44px minimum height for all tappable elements on mobile.

## Implementation Steps

### 2.1 Hamburger button + mobile nav in `topbar.css`

Append at end of `topbar.css`:

```css
/* Hamburger button -- hidden on desktop */
.topbar-hamburger {
  display: none;
  background: none;
  border: none;
  color: #bbc0c4;
  font-size: 20px;
  cursor: pointer;
  padding: 6px;
  margin-left: auto;
  line-height: 1;
}
.topbar-hamburger:hover { color: #fff; }

/* Mobile nav panel */
.topbar-mobile-nav {
  display: none;
  background: var(--fg);
  border-bottom: 1px solid rgba(255,255,255,0.1);
}
.topbar-mobile-nav.open { display: block; }
.topbar-mobile-nav a,
.topbar-mobile-nav button {
  display: block;
  width: 100%;
  padding: 12px 16px;
  color: #bbc0c4;
  text-decoration: none;
  font-size: 13px;
  border: none;
  background: none;
  text-align: left;
  font-family: var(--font);
  cursor: pointer;
  min-height: 44px;
  display: flex;
  align-items: center;
}
.topbar-mobile-nav a:hover,
.topbar-mobile-nav button:hover { background: rgba(255,255,255,0.08); color: #fff; }
.topbar-mobile-nav .mobile-nav-divider { border-top: 1px solid rgba(255,255,255,0.1); margin: 4px 0; }
.topbar-mobile-nav .logout { color: var(--red); }

@media (max-width: 640px) {
  .topbar-hamburger { display: block; }
  .topbar-nav { display: none; }
  .topbar-right { display: none; }
  .topbar-inner { padding: 0 12px; }
}
```

### 2.2 Layout TSX changes for hamburger

Both `_public.tsx` and `_authenticated.tsx` need the same pattern. Add state + hamburger button + mobile nav panel.

**In `_public.tsx`** -- add `mobileOpen` state and hamburger. Replace the topbar JSX:

```tsx
// Add state (alongside existing menuOpen):
const [mobileOpen, setMobileOpen] = useState(false)

// Inside .topbar-inner, after .topbar-nav, before .topbar-right:
<button
  className="topbar-hamburger"
  onClick={() => setMobileOpen(v => !v)}
  aria-label="Menu"
  aria-expanded={mobileOpen}
>
  {mobileOpen ? "\u2715" : "\u2630"}
</button>

// After closing </div> of .topbar, before .page-container:
{mobileOpen && (
  <div className="topbar-mobile-nav open">
    <Link to="/quests" onClick={() => setMobileOpen(false)}>Quests</Link>
    {isAuthenticated ? (
      <>
        <Link to="/dashboard" onClick={() => setMobileOpen(false)}>Dashboard</Link>
        <Link to="/quests/mine" onClick={() => setMobileOpen(false)}>My Quests</Link>
        <Link to="/agents" onClick={() => setMobileOpen(false)}>My Agents</Link>
        <div className="mobile-nav-divider" />
        <Link to="/account" onClick={() => setMobileOpen(false)}>Account</Link>
        <div className="mobile-nav-divider" />
        <button className="logout" onClick={() => { logout(); setMobileOpen(false); }}>Log out</button>
      </>
    ) : (
      <Link to="/login" onClick={() => setMobileOpen(false)}>Log in</Link>
    )}
  </div>
)}
```

**In `_authenticated.tsx`** -- same pattern but always shows authenticated links. Add `mobileOpen` state, hamburger button, and mobile nav panel with the same links as the user-dropdown.

### 2.3 Responsive quest list in `dashboard.css`

Append at end of `dashboard.css`:

```css
/* === RESPONSIVE: QUEST LIST === */
@media (max-width: 768px) {
  .quest-item { flex-direction: column; gap: 8px; }
  .quest-stats { flex-direction: row; gap: 12px; min-width: 0; align-items: center; }
  .quest-stat { flex-direction: row; gap: 4px; align-items: baseline; }
  .quest-stats .questers { justify-content: flex-start; }
  .quest-time-col { flex-direction: row; gap: 8px; min-width: 0; align-items: baseline; }
  .quest-time-lbl { display: none; }
  .action-group { justify-content: flex-start; }
}

/* === RESPONSIVE: AGENT TABLE === */
@media (max-width: 768px) {
  .agent-table { display: block; }
  .agent-table thead { display: none; }
  .agent-table tbody { display: block; }
  .agent-table tr.agent-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 12px 0;
    border-bottom: 1px solid var(--border);
  }
  .agent-table td { display: inline; padding: 0; border: none; font-size: 12px; }
  .agent-table .col-agent { width: 100%; font-weight: 600; }
  .agent-table .col-skills { width: 100%; }
  .agent-table .col-quests,
  .agent-table .col-registered,
  .agent-table .col-expand { display: none; }
  .agent-detail-row td { display: block; }
}

/* === RESPONSIVE: TABS + FILTER === */
@media (max-width: 640px) {
  .tabs-row { flex-direction: column; align-items: stretch; }
  .inline-filter { flex-wrap: wrap; }
  .filter-bar { flex-direction: column; gap: 8px; align-items: stretch; }
  .dashboard-page.page-container { padding: 0 10px; }
}

/* === RESPONSIVE: MODAL === */
@media (max-width: 640px) {
  .modal { width: calc(100vw - 32px); max-height: 90vh; }
}
```

### 2.4 Form grid stacking in `forms.css`

Append at end of `forms.css`:

```css
/* === RESPONSIVE: FORM GRIDS === */
@media (max-width: 640px) {
  .form-row { grid-template-columns: 1fr; }
  .form-row-3 { grid-template-columns: 1fr; }
  .radio-group { flex-direction: column; }
  .radio-option label { border-right: none; border-bottom: 1px solid var(--border); }
  .radio-option:last-child label { border-bottom: none; }
}
```

### 2.5 Footer stacking in `footer.css`

Replace current content:

```css
/* Footer -- ClawQuest shared */
.footer { padding: 24px 0; margin-top: 24px; border-top: 1px solid var(--border); font-size: 11px; color: var(--fg-muted); display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
.footer a { color: var(--fg-muted); text-decoration: none; }

@media (max-width: 640px) {
  .footer { flex-direction: column; align-items: center; gap: 8px; padding: 16px 0; }
}
```

## Todo

- [ ] Add hamburger + mobile-nav styles to `topbar.css`
- [ ] Add `mobileOpen` state + hamburger button + mobile-nav panel to `_public.tsx`
- [ ] Add same hamburger pattern to `_authenticated.tsx`
- [ ] Add responsive quest list rules to `dashboard.css`
- [ ] Add responsive agent table rules to `dashboard.css`
- [ ] Add responsive tabs/filter/modal rules to `dashboard.css`
- [ ] Add responsive form grid rules to `forms.css`
- [ ] Add responsive footer rules to `footer.css`
- [ ] Run `pnpm --filter dashboard build` -- verify no errors
- [ ] Test in Chrome DevTools at 375px (iPhone SE) and 768px (iPad)

## Success Criteria

1. Build passes
2. At 375px width: hamburger visible, topbar-nav/right hidden, mobile menu opens/closes
3. At 375px: quest list stacks vertically, agent table shows name+skills only
4. At 375px: form grids stack to single column
5. All tappable elements in mobile nav are >= 44px height
6. Footer wraps gracefully at narrow widths

## Risk Assessment

- **Medium risk.** Layout TSX changes in both `_public.tsx` and `_authenticated.tsx`. Keep changes minimal (add state + JSX, no refactoring existing desktop logic).
- Quest list responsive relies on flex-direction change -- test that stat values remain readable.
- Agent table `display: block` override is aggressive -- hidden columns may need data visible elsewhere. Check that essential info (name, status, skills) is shown.
