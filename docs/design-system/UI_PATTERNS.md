# ClawQuest UI Patterns v3

> Common patterns, do/don't rules, and interaction guidelines.
> Aligned with Design System v3 — Terminal Edition.

---

## Page Layout Patterns

### Standard Page

```
[Topbar 56px, sticky]
[Page Header: title + actions]
[Content area, max-w-6xl centered]
[Footer]
```

- Topbar: sticky, `z-50`, `bg-bg-base` + bottom border, `h-14`
- Page header: `<PageTitle>` component — Geist Mono, `text-2xl` (24px), `font-semibold` + right-aligned actions
- Content: parent layout provides `max-w-6xl mx-auto px-6 py-5`
- Pages should NOT add their own max-width container — inherit from layout

### Two-Column Detail

Used by: Quest Detail, Agent Detail, Fund Quest

```
[Main content 1fr] [Sidebar 280px, sticky]
```

- Grid: `grid grid-cols-1 md:grid-cols-[1fr_280px] gap-6`
- Sidebar: sticky on desktop (`sticky top-6`), moves above main on mobile (`order-first`)
- Cards: `border border-border-muted bg-card` (matches `<Card>` component)

### Dashboard / Bento Grid

```
[Filter bar / Tabs]
[Grid: 3 cols desktop, 2 tablet, 1 mobile]
```

- Cards: equal height per row
- Gap: `16px`

---

## Component Patterns

### Quest Card — Grid View

```
+----------------------------------+
| [Icon] $500 USDC    2d 14h left |
| Quest Title (truncate 2 lines)   |
| Short description (2 lines)      |
|                                  |
| [FCFS Badge] [tag] [tag] +N     |
| [██████████] 8/10 slots (50%)   |
| by Sponsor  [Avatars]           |
+----------------------------------+
```

- Hover: `hover:border-fg-1` (border color shift, no bg change)
- Click: entire card is clickable (`cursor-pointer`)
- Type badge: `outline` variant with icon
- Tags: `pill` variant, truncated with +N counter
- Progress bar: 10-segment linear bar, no rounded corners
- Border: `border border-border-2` (1px)
- Radius: `rounded` (2px Terminal theme)

### Quest Card — Compact (Table) View

2-column layout: **left** (reward + timer + progress + questers) | **right** (title + desc + type + tags + sponsor)

```
+--------+------------------------------------+
| $USDC  | Quest Title                        |
| 2d 14h | Brief description one-line         |
| ██████ | [FCFS] [tag] [tag]                |
| [⚙⚙⚙] | by Sponsor                        |
+--------+------------------------------------+
```

- Hover: `hover:border-fg-1` (border color shift)
- Desktop: 2-column flex layout with `gap-8`
- Mobile: stacked layout with mobile-specific spacing
- Type badge: `outline` variant
- Progress: simplified bar with percentage label
- Border: `border border-border-2` (1px)
- Radius: `rounded` (2px Terminal theme)

#### Responsive Behavior

| Breakpoint | Grid View | Compact View |
|------------|-----------|------|
| Mobile (< 640px) | Single column, full-width cards | Stacked layout (reward above title) |
| Tablet (md: 768px) | 2-column grid | 2-column flex layout |
| Desktop (xl: 1280px) | 3-column grid | 2-column flex layout |

### Empty State

```
+----------------------------------+
|          [Icon 48px]             |
|    "No quests yet"               |
|    Short helpful description     |
|    [Primary CTA button]          |
+----------------------------------+
```

- Center-aligned, `py-12`
- Icon: MingCute (48px), `text-fg-3`
- Title: `text-sm font-semibold text-fg-1`
- Description: `text-xs text-fg-3`, max `45ch`
- CTA: `<Button variant="outline">` below

### Loading State

- **Page load:** Skeleton shimmer (not spinner), wrap in `aria-busy="true"`
- **Button async:** Disable + spinner icon inside button
- **List load:** 3-4 skeleton cards matching real card dimensions
- **Never:** Full-page blocking spinner

### Error State

```
+----------------------------------+
|     [AlertLine icon 48px]        |
|    "Something went wrong"        |
|    Specific error message        |
|    [Retry button]                |
+----------------------------------+
```

- Icon: MingCute `AlertLine` (48px), `text-error`
- Title: `text-sm font-semibold text-fg-1`
- Message: `text-xs text-fg-3`
- Action: `<Button variant="outline">Retry</Button>` with query invalidation
- Inline errors: `border-error` + `text-error` message below input
- Toast errors: brief, auto-dismiss 5s, `text-error` accent

---

## Interaction Patterns

### Buttons

| Pattern | Rule |
|---------|------|
| Default | `default` variant (bg-foreground). Used for most actions. |
| Primary CTA | One per visible area. `variant="primary"`. |
| Danger | Always requires confirmation dialog. `variant="danger"`. |
| Tonal | Softer emphasis. `variant="*-tonal"` (e.g. `primary-tonal`). |
| Outline | Tertiary actions. `variant="*-outline"` or `variant="outline"`. |
| Loading | Disable + show spinner. Never allow double-click. |
| Icon-only | `iconOnly` prop. Must have `aria-label`. Tooltip on hover. Min 44px touch target (use `size="lg"`). |
| Group | Max 3 buttons side-by-side. Primary rightmost. |

### Forms

| Pattern | Rule |
|---------|------|
| Validation | Real-time on blur, not on every keystroke |
| Error messages | Below input, `text-error`, specific message, linked via `aria-describedby` |
| Required fields | Mark optional fields instead (fewer labels) |
| Submit button | Right-aligned, disabled until form is valid |
| Multi-step | Accordion stepper with progress indicator |

### Modals / Dialogs

- Use shadcn `Dialog` component
- Max width: `480px` (small), `640px` (medium)
- Always have close button (X) + escape key
- Destructive modals: title states the action, `bg-error` confirm button
- Focus trap: auto-managed by Radix Dialog

### Tables

| Pattern | Rule |
|---------|------|
| Header | `text-xs font-semibold text-muted-foreground uppercase tracking-wide` |
| Sortable columns | Click header to sort, show arrow indicator |
| Row actions | Dropdown menu (kebab icon) on hover/focus |
| Pagination | Bottom-right, "Page X of Y" with prev/next |
| Empty table | Full-width empty state inside table body |
| Responsive | Stack to cards on mobile (< 768px) |

### Navigation / Topbar

- Active link: `text-primary font-semibold` (color change, no underline/bg)
- Inactive link: `text-fg-1 font-semibold`, hover: `hover:text-primary`
- Divider: `h-4 w-px bg-border-2` between logo and nav (desktop only)
- **Desktop**: full nav tabs inline in header
- **Mobile**: bottom navigation bar (Apple HIG, 49px height, Line/Fill icon toggle)
- Mobile header: icon-only logo + action buttons (Create, Dashboard)
- Breadcrumbs: only on 3+ level deep pages
- Logo: `<BrandLogo animated />` — full on desktop, icon-only on mobile
- Theme toggle: sun/moon icon button (light↔dark)

---

## Do / Don't

### Layout

| Do | Don't |
|----|-------|
| Let parent layout handle `max-w-6xl` | Add extra max-width wrappers inside pages |
| Align content to 4px grid | Arbitrary spacing values |
| Stack columns on mobile | Horizontal scroll on mobile |
| Reserve space for async content (skeleton) | Layout shifts on load |

### Styling

| Do | Don't |
|----|-------|
| Use Tailwind design token classes (`text-base`, `text-error`) | Hardcode arbitrary values (`text-[14px]`, `text-red-600`) |
| Use `border border-border-1` for cards | Use heavy borders (`border-2 border-border-strong`) on cards |
| Use `border-border` for inner dividers | Hardcode border colors |
| Flat design — no shadows at rest | Add `shadow-sm/md` to cards |
| Use `cn()` for conditional classes | Ternary in className strings |

### Components

| Do | Don't |
|----|-------|
| Use shadcn components for standard UI | Build custom when shadcn exists |
| Use Tailwind utilities for styling | Raw CSS vars in JSX `style` props (except dynamic widths) |
| One primary CTA per visible area | Multiple primary buttons competing |
| Disable buttons during async | Let users double-click submit |
| Use semantic color tokens (`text-error`, `text-success`) | Use arbitrary Tailwind colors (`text-red-600`, `text-green-500`) |
| Pair semantic colors with icons | Use color alone to convey meaning |

### Content

| Do | Don't |
|----|-------|
| Truncate long titles with ellipsis | Let text overflow containers |
| Show relative time ("2h ago") for recent dates | Only absolute timestamps |
| Format numbers (1,234 not 1234) | Raw unformatted numbers |
| Show skeleton while loading | Blank screen during fetch |
| Use `Intl.DateTimeFormat` for dates | `toLocaleDateString()` without options |

### Interaction

| Do | Don't |
|----|-------|
| Confirm before destructive actions | Silent deletes |
| Smooth transitions (150ms ease-out) | Instant state changes |
| `cursor-pointer` on clickables | Default cursor on interactive elements |
| Visible focus rings (`outline: 2px solid var(--accent)`) | Remove outlines |
| Toast for success feedback | Alert boxes for confirmations |
| Include retry action on error states | Dead-end error messages |

---

## Responsive Breakpoints

> Token definitions in `DESIGN_SYSTEM.md`. Rules and per-component behavior below.

**Rules:**
- Mobile-first: base styles = mobile, then `md:` tablet, `xl:` desktop
- Use `sm:` (640px) only for minor tweaks (show/hide). Avoid `lg:`/`2xl:`
- Container: `max-w-6xl` (1152px) centered with `mx-auto px-6`

**Pattern examples:**
```
<div className="flex flex-col md:flex-row md:gap-4 xl:gap-6">
<div className="hidden md:block">
<div className="w-full xl:max-w-6xl xl:mx-auto">
```

### Per-Component Responsive

| Component | Mobile | Tablet (md:) | Desktop (xl:) |
|-----------|--------|-------------|---------------|
| Quest cards | 1 col, full width | 2 col grid | 3 col grid |
| Card layout | Grid only (compact hidden) | Grid + compact toggle visible | Same |
| Detail page | Stacked (sidebar on top) | 2-col `[1fr_280px]` | Same |
| Tables | Stack to card list | Full table | Same |
| Navbar | Bottom nav bar (Apple HIG) | Full nav in header | Same |
| Buttons | Full width (`w-full`) | Auto width | Same |
| Tabs | Horizontal scroll + fade mask | Full row | Same |
| View toggle | Hidden | Visible (grid + compact only) | Same |
