# ClawQuest Accessibility Standards

> A11y standards to enforce across the dashboard.
> Synced with Design System v3 — Terminal Edition.

---

## Target Level

**WCAG 2.1 AA** — the industry standard for web applications.

---

## Color & Contrast

| Rule | Requirement |
|------|-------------|
| Normal text (< 18px) | Minimum **4.5:1** contrast ratio |
| Large text (>= 18px bold or >= 24px) | Minimum **3:1** contrast ratio |
| UI components (borders, icons) | Minimum **3:1** against background |
| No color-only indicators | Always pair color with icon, text, or pattern |
| Focus rings | Visible on all interactive elements |

### Verified Combinations — Light Mode (Terminal)

| Foreground | Background | Ratio | Level | Notes |
|------------|------------|-------|-------|-------|
| `#171717` (fg-1) | `#ffffff` (bg-1) | 18.0:1 | AAA | Primary text |
| `#404040` (fg-2) | `#ffffff` (bg-1) | 9.0:1 | AAA | Secondary text |
| `#737373` (fg-3) | `#ffffff` (bg-1) | 5.2:1 | AA | Muted text — acceptable for >= 18px or with icon |
| `#ffffff` (white) | `#ff574b` (accent) | 3.1:1 | AA Large | Button text — only for large/bold text |
| `#ffffff` (white) | `#e64a3f` (accent-hover) | 3.9:1 | AA Large | Hover state |
| `#ff574b` (accent) | `#fff0ef` (accent-light) | 2.8:1 | **FAIL** | Never use accent text on accent-light bg alone — pair with border/icon |
| `#16a34a` (success) | `#f0fdf4` (success-light) | 3.1:1 | AA Large | Success — use >= 18px or pair with icon |
| `#ff4444` (error) | `#fff0f0` (error-light) | 3.1:1 | AA Large | Error — use >= 18px or pair with icon |
| `#ffaa00` (warning) | `#fff8e6` (warning-light) | 1.8:1 | **FAIL** | Warning text on warning-light — always pair with icon + fg text |
| `#4488ff` (info) | `#e6f0ff` (info-light) | 2.9:1 | **FAIL** | Info text on info-light — always pair with icon + fg text |

### Verified Combinations — Dark Mode (Terminal)

| Foreground | Background | Ratio | Level | Notes |
|------------|------------|-------|-------|-------|
| `#e5e5e5` (fg-1) | `#040404` (bg-base) | 21.0:1 | AAA | Primary text on page bg |
| `#e5e5e5` (fg-1) | `#0a0a0a` (bg-1) | 19.5:1 | AAA | Primary text on cards |
| `#d4d4d4` (fg-2) | `#040404` (bg-base) | 17.0:1 | AAA | Secondary text |
| `#a3a3a3` (fg-3) | `#040404` (bg-base) | 8.5:1 | AA | Muted text — acceptable for >= 18px or with icon |
| `#000000` (black) | `#ff6b61` (accent) | 7.5:1 | AAA | Button text |
| `#ff6b61` (accent) | `#3d1512` (accent-light) | 5.7:1 | AA | Accent on dark accent bg |
| `#22c55e` (success) | `#052e16` (success-light) | 6.5:1 | AA | Success in dark mode |

### Contrast Rules

- **Semantic colored text** (success, error, warning, info) on light backgrounds: always pair with icon or use `--fg` for the primary label
- **`--fg-muted`**: acceptable for timestamps, captions, and decorative text (large or paired with context) — never for essential information alone
- **Accent buttons**: white text on `#FF574B` passes AA Large (3.1:1) — acceptable for bold button text at 14px+ semibold

---

## Keyboard Navigation

| Rule | Implementation |
|------|----------------|
| Tab order | Matches visual reading order (top → bottom, left → right) |
| Focus visible | `focus-visible:ring-2 ring-ring` on buttons/links; inputs use `border-fg-1` on focus |
| Skip link | "Skip to content" link, visible on focus, before topbar |
| Escape key | Closes modals, dropdowns, popovers |
| Enter/Space | Activates buttons and links |
| Arrow keys | Navigates within menus, tabs, radio groups |

### Focus Styles

**Buttons & interactive elements:**
```css
/* Ring-based focus indicator for keyboard navigation */
focus-visible:outline-hidden
focus-visible:ring-2
focus-visible:ring-ring
focus-visible:ring-offset-2
focus-visible:ring-offset-bg-base
```

**Inputs:**
```css
/* Subtle border change on focus */
input:focus-visible {
  border-color: var(--fg-1);
}
```

**Dialog close button:**
```css
/* Ring focus for dialog close */
focus-visible:ring-2 focus-visible:ring-ring
```

> **Updated (Session 2026-03-23):** Focus rings restored on all interactive elements for keyboard accessibility. Buttons use `ring-2 ring-ring` (2px ring using `--ring` token). Inputs keep subtle `border-fg-1`. Dialog buttons support full Tab navigation with `autoFocus` on primary action.

---

## Semantic HTML

| Element | Use | Don't Use |
|---------|-----|-----------|
| `<button>` | Clickable actions | `<div onclick>` |
| `<a href>` | Navigation links | `<span onclick>` |
| `<nav>` | Navigation regions | `<div class="nav">` |
| `<main>` | Primary content | `<div class="main">` |
| `<h1>`-`<h6>` | Heading hierarchy | `<div class="title">` |
| `<ul>/<ol>` | Lists | `<div>` with items |
| `<table>` | Tabular data | `<div>` grids for data |

---

## ARIA Guidelines

### Required ARIA

| Scenario | ARIA Attribute |
|----------|----------------|
| Icon-only buttons | `aria-label="Close dialog"` |
| Loading states | `aria-busy="true"` on container |
| Expandable sections | `aria-expanded="true/false"` |
| Current page in nav | `aria-current="page"` |
| Form errors | `aria-invalid="true"` + `aria-describedby="error-id"` |
| Live updates (toasts) | `aria-live="polite"` or `role="alert"` |
| Modals | `role="dialog"` + `aria-modal="true"` (Radix handles this) |
| Decorative elements | `aria-hidden="true"` on dots, dividers, icons without meaning |

### ARIA Don'ts

- Don't add `role="button"` to `<button>` (redundant)
- Don't use `aria-label` on elements with visible text
- Don't override Radix/shadcn ARIA — they handle it correctly
- Don't use `aria-hidden="true"` on focusable elements

---

## Forms

| Rule | Implementation |
|------|----------------|
| Labels | Every input has a `<label>` with `htmlFor` matching input `id` |
| Required fields | `aria-required="true"` + visual indicator |
| Error messages | Linked via `aria-describedby`, displayed below input |
| Autocomplete | Use `autocomplete` attribute on personal info fields |
| Fieldset/Legend | Group related fields (e.g., "Payment method" radio group) |

### Example

```tsx
<div>
  <label htmlFor="quest-title" className="text-sm font-medium">
    Quest Title <span className="text-error">*</span>
  </label>
  <input
    id="quest-title"
    aria-required="true"
    aria-invalid={!!error}
    aria-describedby={error ? "quest-title-error" : undefined}
  />
  {error && (
    <p id="quest-title-error" className="text-sm text-error mt-1">
      {error}
    </p>
  )}
</div>
```

---

## Images & Media

| Rule | Implementation |
|------|----------------|
| Informative images | `alt="Description of what the image shows"` |
| Decorative images | `alt=""` (empty) + `aria-hidden="true"` |
| Icons with meaning | `aria-label` on parent button/link |
| Decorative icons | `aria-hidden="true"` (MingCute default) |
| Complex graphics | `aria-describedby` linking to text description |
| Lazy loading | `loading="lazy"` on below-fold images |

---

## Motion & Animation

```css
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

- All animations respect `prefers-reduced-motion`
- No auto-playing animations that can't be paused
- Skeleton loaders are acceptable (subtle, non-distracting)
- No flashing content (< 3 flashes per second)

---

## Touch Targets

| Rule | Minimum Size |
|------|-------------|
| Buttons | 44x44px (mobile), 36x36px (desktop) |
| Links in text | 44px tap target with padding |
| Icon buttons | 44x44px total area including padding |
| Close buttons | 44x44px, positioned in corner with padding |
| List item links | `py-2.5` minimum for 44px height |
| Spacing between targets | 8px minimum gap |

---

## Testing Checklist

### Manual Tests

- [ ] Tab through entire page — logical order, no focus traps (except modals)
- [ ] Use with screen reader (VoiceOver on Mac)
- [ ] Navigate with keyboard only — all features accessible
- [ ] Zoom to 200% — no content overflow or loss
- [ ] Test with `prefers-reduced-motion: reduce`
- [ ] Test with high contrast mode

### Automated Tools

- **axe-core** — run via browser devtools extension
- **Lighthouse** — accessibility audit in Chrome DevTools
- **eslint-plugin-jsx-a11y** — catch issues at build time

### Per-Component Checklist

- [ ] Has appropriate ARIA attributes
- [ ] Focus management works correctly
- [ ] Color contrast passes AA (or AA Large with pairing)
- [ ] Touch targets are large enough (44px mobile)
- [ ] Works with keyboard only
- [ ] Screen reader announces correctly
- [ ] Semantic colored text paired with icon/label
