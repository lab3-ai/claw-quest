# ClawQuest UI Patterns v3

> Common patterns, do/don't rules, and interaction guidelines.
> Aligned with Design System v3 — Terminal Edition.

---

## Page Layout Patterns

### Standard Page

```
[Topbar 44px, sticky]
[Page Header: title + actions]
[Content area, max-w 1100px centered]
[Footer]
```

- Topbar: sticky, `z-50`, `bg-background` + bottom border, `h-11`
- Page header: title (JetBrains Mono, `text-2xl` 24px, `font-bold`) + right-aligned action buttons
- Content: `.page-container` = `max-w-[1100px] mx-auto px-6 py-5`

### Two-Column Detail

Used by: Quest Detail, Fund Quest

```
[Main content 65%] [Sidebar 35%, max 320px]
```

- Sidebar: sticky on desktop, collapses below main on mobile
- Gap: `24px`

### Dashboard / Bento Grid

```
[Filter bar / Tabs]
[Grid: 3 cols desktop, 2 tablet, 1 mobile]
```

- Cards: equal height per row
- Gap: `16px`

---

## Component Patterns

### Quest Card

```
+----------------------------------+
| [Badge: FCFS] [Badge: Live]     |
| Quest Title (truncate 2 lines)   |
| Sponsor name · 2d 14h left      |
|                                  |
| [Progress bar: 8/10 spots]      |
| [Reward: 500 USDC]  [→ View]   |
+----------------------------------+
```

- Hover: subtle border darken (no shadow — flat design)
- Click: entire card is clickable (`cursor-pointer`)
- Badge colors: status-based (see DESIGN_SYSTEM.md)
- Border radius: `rounded` (0px — square corners)

### Empty State

```
+----------------------------------+
|          [Icon 48px]             |
|    "No quests yet"               |
|    Short helpful description     |
|    [Primary CTA button]          |
+----------------------------------+
```

- Center-aligned, `py-16`
- Icon: MingCute, `text-fg-muted`
- Description: `text-fg-secondary`, max `45ch`

### Loading State

- **Page load:** Skeleton shimmer (not spinner)
- **Button async:** Disable + spinner icon inside button
- **List load:** 3-4 skeleton cards matching real card dimensions
- **Never:** Full-page blocking spinner

### Error State

```
+----------------------------------+
|     [AlertCircle icon]           |
|    "Something went wrong"        |
|    Specific error message        |
|    [Retry button]                |
+----------------------------------+
```

- Inline errors: `border-error` + `text-error` message below input
- Page errors: centered card with retry action
- Toast errors: brief, auto-dismiss 5s, `text-error` accent

---

## Interaction Patterns

### Buttons

| Pattern | Rule |
|---------|------|
| Primary CTA | One per visible area. Solid black (`bg-primary text-primary-foreground`). |
| Destructive | Always requires confirmation dialog. `text-error` or `bg-error`. |
| Loading | Disable + show spinner. Never allow double-click. |
| Icon-only | Must have `aria-label`. Show tooltip on hover. |
| Group | Max 3 buttons side-by-side. Primary rightmost. |

### Forms

| Pattern | Rule |
|---------|------|
| Validation | Real-time on blur, not on every keystroke |
| Error messages | Below input, `text-error`, specific message |
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
| Responsive | Stack to cards on mobile (< 640px) |

### Navigation

- Active route: `bg-secondary font-medium text-foreground`
- Hover: `hover:bg-muted hover:text-foreground`
- Mobile: hamburger icon, Sheet slide-in from right
- Breadcrumbs: only on 3+ level deep pages
- Logo: `claw` (normal weight) + `quest` (extrabold) — weight contrast, no color

---

## Do / Don't

### Layout

| Do | Don't |
|----|-------|
| Consistent `max-w-[1100px]` across pages | Mix container widths |
| Align content to 4px grid | Arbitrary spacing values |
| Stack columns on mobile | Horizontal scroll on mobile |
| Reserve space for async content | Layout shifts on load |

### Styling

| Do | Don't |
|----|-------|
| Use Tailwind design token classes (`text-base`, `text-error`) | Hardcode arbitrary values (`text-[14px]`, `text-red-600`) |
| Use `rounded` (0px) everywhere, `rounded-full` for avatars only | Mix border radius sizes |
| Use `border-border` for all borders | Hardcode border colors |
| Flat design — no shadows at rest | Add `shadow-sm/md` to cards |
| Use `cn()` for conditional classes | Ternary in className strings |

### Components

| Do | Don't |
|----|-------|
| Use shadcn components for standard UI | Build custom when shadcn exists |
| Use Tailwind utilities for styling | Raw CSS vars in JSX `style` props |
| One primary CTA per visible area | Multiple primary buttons competing |
| Disable buttons during async | Let users double-click submit |
| Use semantic color tokens (`text-error`, `text-success`) | Use arbitrary Tailwind colors (`text-red-600`, `text-green-500`) |

### Content

| Do | Don't |
|----|-------|
| Truncate long titles with ellipsis | Let text overflow containers |
| Show relative time ("2h ago") | Only absolute timestamps |
| Format numbers (1,234 not 1234) | Raw unformatted numbers |
| Show skeleton while loading | Blank screen during fetch |

### Interaction

| Do | Don't |
|----|-------|
| Confirm before destructive actions | Silent deletes |
| Smooth transitions (150ms ease-out) | Instant state changes |
| `cursor-pointer` on clickables | Default cursor on interactive elements |
| Visible focus rings (`outline: 2px solid var(--accent)`) | Remove outlines |
| Toast for success feedback | Alert boxes for confirmations |

---

## Responsive Breakpoints

| Breakpoint | Behavior |
|------------|----------|
| < 640px (mobile) | Single column, stacked cards, Sheet nav, full-width buttons |
| 640-768px (tablet portrait) | 2-column grids, full nav visible |
| 768-1024px (tablet landscape) | 2-column detail layout, full nav |
| 1024-1280px (desktop) | 3-column grids, full layout |
| > 1280px (wide) | Max-width container, centered content |
