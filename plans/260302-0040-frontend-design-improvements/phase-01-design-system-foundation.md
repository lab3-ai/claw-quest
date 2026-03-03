# Phase 1: Design System Foundation

**Priority:** HIGH | **Status:** Pending | **Effort:** ~1h

## Overview

Complete the CSS design token system. Add missing tokens (radius, shadow, spacing, transition), global focus-visible, reduced-motion support, skeleton utility, and button state improvements.

## Files to Modify

| File | Action |
|------|--------|
| `apps/dashboard/src/index.css` | Add new CSS custom properties to `:root` |
| `apps/dashboard/src/styles/base.css` | Add global `focus-visible`, `reduced-motion`, `.skeleton` utility |
| `apps/dashboard/src/styles/buttons.css` | Add `:focus-visible`, `:disabled`, transition |

## Implementation Steps

### 1.1 Add tokens to `index.css` `:root`

Insert after the `--font-mono` line (line 49), before closing `}`:

```css
/* Radius */
--radius-sm: 3px;
--radius-md: 6px;
--radius-lg: 12px;

/* Shadows */
--shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
--shadow-md: 0 4px 12px rgba(0,0,0,0.08);
--shadow-lg: 0 8px 24px rgba(0,0,0,0.12);

/* Transitions */
--transition-fast: 150ms ease;
--transition-normal: 200ms ease;

/* Spacing scale */
--space-xs: 4px;
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
--space-xl: 32px;
```

**Note:** Do NOT change existing border-radius values across the codebase (most use `3px` which matches `--radius-sm`). These tokens are for new code going forward.

### 1.2 Global focus-visible in `base.css`

Append after the `.tab-panel.active` rule (end of file):

```css
/* Global focus ring — accessible keyboard navigation */
:focus-visible {
  outline: 2px solid var(--link);
  outline-offset: 2px;
}

/* Opt out for elements that define their own focus style */
.user-menu-btn:focus-visible,
.form-input:focus-visible,
.form-select:focus-visible,
.form-textarea:focus-visible {
  outline: none;
}
```

**Why opt-outs:** `user-menu-btn` already has custom focus in `user-dropdown.css`. Form inputs already use `box-shadow` focus in `forms.css`. The global rule catches everything else (nav links, buttons, cards).

### 1.3 Reduced-motion in `base.css`

Append after the focus-visible block:

```css
/* Respect motion preferences */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### 1.4 Skeleton utility in `base.css`

Append after reduced-motion:

```css
/* Skeleton loading placeholder */
.skeleton {
  background: linear-gradient(90deg, var(--sidebar-bg) 25%, var(--border) 50%, var(--sidebar-bg) 75%);
  background-size: 200% 100%;
  animation: skeleton-pulse 1.5s ease-in-out infinite;
  border-radius: var(--radius-sm);
  color: transparent !important;
}

.skeleton * { visibility: hidden; }

@keyframes skeleton-pulse {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

Usage example (for Phase 3):
```html
<div class="skeleton" style="height: 40px; width: 100%; margin-bottom: 8px;"></div>
```

### 1.5 Button states in `buttons.css`

**Before** (current full file):
```css
/* Buttons -- ClawQuest shared */
.btn { display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; font-size: 12px; font-weight: 600; border-radius: 3px; border: 1px solid; cursor: pointer; text-decoration: none; font-family: var(--font); white-space: nowrap; }
```

**After** -- add `transition` to `.btn` base rule:
```css
.btn { display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; font-size: 12px; font-weight: 600; border-radius: 3px; border: 1px solid; cursor: pointer; text-decoration: none; font-family: var(--font); white-space: nowrap; transition: background var(--transition-fast, 150ms ease), box-shadow var(--transition-fast, 150ms ease); }
```

Append at end of `buttons.css`:

```css
/* Focus + Disabled states */
.btn:focus-visible { outline: 2px solid var(--link); outline-offset: 2px; }
.btn:disabled, .btn[aria-disabled="true"] { opacity: 0.5; cursor: not-allowed; pointer-events: none; }
```

**Note:** Using `var(--transition-fast, 150ms ease)` with fallback so buttons still work if tokens haven't loaded (defensive).

## Todo

- [ ] Add radius/shadow/transition/spacing tokens to `index.css` `:root`
- [ ] Add global `:focus-visible` to `base.css` with opt-outs for inputs/user-menu
- [ ] Add `@media (prefers-reduced-motion)` to `base.css`
- [ ] Add `.skeleton` utility + keyframes to `base.css`
- [ ] Add `transition` to `.btn` base rule in `buttons.css`
- [ ] Add `.btn:focus-visible` + `.btn:disabled` to `buttons.css`
- [ ] Run `pnpm --filter dashboard build` -- verify no errors

## Success Criteria

1. `pnpm --filter dashboard build` passes
2. Tab through page -- all interactive elements show blue outline ring
3. Open DevTools > Rendering > prefers-reduced-motion: reduce -- verify no animations
4. Add `class="skeleton"` to any div in DevTools -- verify shimmer animation appears
5. Buttons with `disabled` attr appear faded and non-clickable

## Risk Assessment

- **Low risk.** Only additive CSS changes. No existing selectors modified except `.btn` (adding `transition`).
- Existing elements with custom focus styles already have `:focus-visible` (user-menu-btn, form inputs) -- the opt-out selectors prevent double-ring.
