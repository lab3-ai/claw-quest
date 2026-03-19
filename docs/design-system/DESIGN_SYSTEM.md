# ClawQuest Design System v3 — Terminal Edition

> Monospace-first · Brand color `#FF574B` · Flat & high-contrast
> Reference for all UI/UX implementation across the dashboard.
> Source of truth: `apps/dashboard/src/index.css` `:root` block

---

## Tech Stack

| Layer | Tool | Notes |
|-------|------|-------|
| **Styling** | Tailwind CSS | Utility-first, all design tokens mapped |
| **Components** | shadcn/ui (Radix UI) | Accessible primitives |
| **Icons** | MingCute (`@mingcute/react`) | 24x24 grid, 2px stroke |
| **Brand icons** | Custom `<PlatformIcon>` | X, Discord, Telegram, OpenClaw SVGs |
| **Body font** | Geist Mono | Monospace body/UI text |
| **Heading font** | D-DIN Exp | Display headings (h1–h6) |

### Installed shadcn/ui Components

badge, button, card, dialog, dropdown-menu, input, label, radio-group, select, separator, sheet, skeleton, sonner (toast), switch, table, tabs, textarea, tooltip

To add more: `pnpm --filter dashboard dlx shadcn@latest add <component-name>`

---

## Philosophy

**Terminal meets SaaS** — developer-tool aesthetic with professional clarity.
Monospace typography, flat surfaces, high contrast, no decorative flourishes.

Principles:
1. **Monospace-first** — Geist Mono everywhere, code-like precision
2. **Flat & minimal** — no shadows, no gradients, borders define surfaces
3. **High contrast** — near-black on light gray, clear hierarchy
4. **Information density** — compact sizing, tight spacing, data-rich layouts

---

## Typography

**Two font families:** D-DIN Exp for headings, Geist Mono for body/UI.

- **D-DIN Exp** — self-hosted (`/fonts/D-DINExp.otf`, `D-DINExp-Bold.otf`). Weights: 400, 700.
- **Geist Mono** — monospace body font. All weights via system/CDN.

### CSS Variables

| Token | Value | Tailwind |
|-------|-------|----------|
| `--font` | `"Geist Mono", ui-monospace, ...` | `font-sans` |
| `--font-heading` | `"D-DIN Exp", "Geist Mono", ui-monospace, ...` | `font-heading` |
| `--font-mono` | `"Geist Mono", ui-monospace, ...` | `font-mono` |

**Note:** `font-sans` resolves to monospace — intentional. All `h1`–`h6` tags auto-apply `font-heading` via CSS rule.

### Scale

| Token | Size | Tailwind | Use |
|-------|------|----------|-----|
| `--text-2xs` | 10px | `text-2xs` | Micro labels, uppercase tracking |
| `--text-xs` | 12px | `text-xs` | Captions, timestamps, meta |
| `--text-sm` | 14px | `text-sm` | Labels, secondary text, nav |
| `--text-base` | 16px | `text-base` | Body text (default) |
| `--text-md` | 16px | `text-md` | Alias for base |
| `--text-lg` | 18px | `text-lg` | Section titles |
| `--text-xl` | 20px | `text-xl` | Card headings |
| `--text-2xl` | 24px | `text-2xl` | Page titles |
| `--text-3xl` | 28px | `text-3xl` | Hero headings |

### Font weights

| Weight | Tailwind | Use |
|--------|----------|-----|
| 400 | `font-normal` | Body text, descriptions |
| 500 | `font-medium` | Labels, badges, nav items |
| 600 | `font-semibold` | Headings, body emphasis, buttons — **max weight for all text** |

**Do NOT use `font-bold` (700).** Maximum weight across the entire UI is `font-semibold` (600). This applies to headings, body text, buttons, labels — everything.

### Typography demo

Live preview: `/concepts/demo/typography`

### Line heights

Each font size has a paired line height (see Scale table above). Override utilities:

| Tailwind | Value | Use |
|----------|-------|-----|
| `leading-none` | 1 | Single-line display text |
| `leading-tight` | 1.25 | Headings, card titles |
| `leading-snug` | 1.375 | Subheadings, multi-line titles |
| `leading-normal` | 1.5 | Default body text |
| `leading-relaxed` | 1.625 | Long-form descriptions |
| `leading-loose` | 2 | Spacious reading |

### Color demo

Live preview: `/concepts/demo/colors`

---

## Color Palette

### Core — Numbered Scale

Tokens use a **numbered scale** (1–4). The key rule: **`bg-1 + fg-1 = max contrast`**.

| Scale | Light mode | Dark mode | Rule |
|-------|-----------|-----------|------|
| **bg-base** | `#fafafa` | `#050505` | Body/page background |
| **bg-1** | `#ffffff` | `#0e0e0e` | Cards, popovers |
| **bg-4** | darkest | lightest | Muted bg, disabled |
| **fg-1** | darkest (`#111`) | lightest (`#e0e0e0`) | Primary text |
| **fg-4** | lightest | darkest | Disabled text |
| **border-1** | lightest | lightest | Subtle dividers |
| **border-4** | darkest | darkest | Strong contrast |

Direction flips between modes so that **the same class works in both**: `bg-bg-base` is always the page background, `bg-bg-1` is always the card/surface background, `text-fg-1` is always the strongest text.

#### Background

| Token | Tailwind | Hex (Light) | Hex (Dark) | Use |
|-------|----------|------|-------|-----|
| `--bg-base` | `bg-bg-base` | `#fafafa` | `#040404` | **Body/page background**, navbar |
| `--bg-1` | `bg-bg-1` | `#ffffff` | `#0a0a0a` | Card bg, popovers, inputs |
| `--bg-2` | `bg-bg-2` | `#f5f5f5` | `#171717` | Secondary surfaces, hover states |
| `--bg-3` | `bg-bg-3` | `#e5e5e5` | `#262626` | Sidebar, section bg, skeleton |
| `--bg-4` | `bg-bg-4` | `#d4d4d4` | `#404040` | Disabled bg, muted backgrounds |

#### Foreground

| Token | Tailwind | Hex (Light) | Hex (Dark) | Use |
|-------|----------|------|-------|-----|
| `--fg-1` | `text-fg-1` | `#171717` | `#e5e5e5` | Primary text |
| `--fg-2` | `text-fg-2` | `#404040` | `#d4d4d4` | Secondary text, badge labels |
| `--fg-3` | `text-fg-3` | `#737373` | `#a3a3a3` | Muted text, placeholders |
| `--fg-4` | `text-fg-4` | `#d4d4d4` | `#737373` | Disabled text |

#### Border

| Token | Tailwind | Hex (Light) | Hex (Dark) | Use |
|-------|----------|------|-------|-----|
| `--border-1` | `border-border-1` | `#f5f5f5` | `#171717` | Card borders, subtle dividers |
| `--border-2` | `border-border-2` | `#e5e5e5` | `#262626` | Default borders, dividers (shadcn `border`) |
| `--border-3` | `border-border-3` | `#d4d4d4` | `#404040` | Active borders, emphasis |
| `--border-4` | `border-border-4` | `#a3a3a3` | `#525252` | Strong contrast borders |

**Note:** Numbered scale tokens (bg-1/fg-1/etc) have migrated throughout codebase. Legacy shadcn aliases (`text-foreground`, `text-muted-foreground`, `bg-background`, `bg-card`, `border-input`) still work but point to numbered tokens.

### Dark Surfaces

For code blocks, dark cards, and inverted sections:

| Token | Hex (Light) | Hex (Dark) | Use |
|-------|-----|-------|-----|
| `--surface-dark` | `#1a1a1a` | `#111111` | Dark card background |
| `--surface-dark-subtle` | `#2a2a2a` | `#1a1a1a` | Dark card hover/secondary |
| `--surface-dark-fg` | `#ffffff` | `#ffffff` | Text on dark surfaces |
| `--surface-dark-muted` | `#999999` | `#777777` | Muted text on dark surfaces |

### Brand / Accent — `#FF574B` (Coral Red)

> **Brand color** used consistently across all themes. Each theme adapts light/dark variants while keeping the same hue.

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `--accent` | `#ff574b` | `#ff6b61` | Accent/highlight color |
| `--accent-hover` | `#e64a3f` | `#ff574b` | Accent hover state |
| `--accent-light` | `#fff0ef` | `#3d1512` | Accent tinted background |
| `--accent-border` | `#ff574b` | `#ff574b` | Accent borders |
| `--accent-fg` | `#ffffff` | `#000000` | Text on accent background |

### Primary (Buttons) — brand color

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `--primary` | `#ff574b` | `#ff6b61` | Button background |
| `--primary-hover` | `#e64a3f` | `#ff574b` | Button hover state |
| `--primary-fg` | `#ffffff` | `#000000` | Button text |

### Links

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `--link` | `#ff574b` | `#ff6b61` | Inline link text |
| `--link-visited` | `#e64a3f` | `#ff8a82` | Visited link text |

### Semantic

Each semantic color has 3 tokens: **base** (text/icon), **light** (background), **border**. Light mode and dark mode values are identical for semantic colors across themes.

| Group | Token | Tailwind | Hex | Use |
|-------|-------|----------|-----|-----|
| Success | `--success` | `text-success` / `bg-success` | `#16a34a` (L), `#22c55e` (D) | Completed, funded, connected |
| | `--success-light` | `bg-success-light` | `#f0fdf4` (L), `#052e16` (D) | Success background |
| | `--success-border` | `border-border-success` | `#86efac` (L), `#166534` (D) | Success borders |
| Error | `--error` | `text-error` / `bg-error` | `#ff4444` (L), `#ef4444` (D) | Errors, failed, cancelled |
| | `--error-light` | `bg-error-light` | `#fff0f0` (L), `#450a0a` (D) | Error background |
| | `--error-border` | `border-border-error` | `#ff8888` (L), `#991b1b` (D) | Error borders |
| Warning | `--warning` | `text-warning` / `bg-warning` | `#ffaa00` (L), `#eab308` (D) | Caution, expiring soon |
| | `--warning-light` | `bg-warning-light` | `#fff8e6` (L), `#422006` (D) | Warning background |
| | `--warning-border` | `border-border-warning` | `#ffcc66` (L), `#854d0e` (D) | Warning borders |
| Info | `--info` | `text-info` / `bg-info` | `#4488ff` (L), `#3b82f6` (D) | Info, external links |
| | `--info-light` | `bg-info-light` | `#e6f0ff` (L), `#172554` (D) | Info background |
| | `--info-border` | `border-border-info` | `#88bbff` (L) | Info borders |

### Actor Colors — monochrome

All actor colors use grayscale to match the monochromatic theme. Light and dark mode values are independent per actor.

| Actor | FG (L) | BG (L) | Border (L) | FG (D) | BG (D) | Border (D) | Use |
|-------|--------|--------|-----------|--------|--------|-----------|-----|
| Human | `#555555` | `#f0f0f0` | `#cccccc` | `#a0a0a0` | `#1a1a1a` | `#333333` | Human tasks, social tasks |
| Agent | `#ff574b` | `#fff0ef` | `#ff574b` | `#ff6b61` | `#3d1512` | `#ff574b` | Agent tasks, AI agents |
| Skill | `#555555` | `#f0f0f0` | `#cccccc` | `#a0a0a0` | `#1a1a1a` | `#333333` | Skills, tags |
| Social | `#555555` | `#f0f0f0` | — | `#a0a0a0` | `#1a1a1a` | — | Social task text/bg |

### Platform Colors

| Platform | CSS Variable | Hex |
|----------|-------------|-----|
| Stripe | `--stripe-fg` / `--stripe-bg` | `#635bff` / `#f3f0ff` |
| Telegram | `--telegram` | `#229ed9` |
| Discord | `--discord` | `#5865f2` |
| X/Twitter | `--x-twitter` | `#111111` |

### Tone Colors — brand

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `--tone-quest` | `#ff574b` | `#ff6b61` | Quest-themed foreground |
| `--tone-quest-dark` | `#e64a3f` | `#ff574b` | Quest-themed hover |
| `--tone-quest-bg` | `#fff0ef` | `#3d1512` | Quest-themed background |
| `--tone-agent` | `#ff574b` | `#ff6b61` | Agent-themed foreground |
| `--tone-agent-dark` | `#e64a3f` | `#ff574b` | Agent-themed hover |
| `--tone-agent-bg` | `#fff0ef` | `#3d1512` | Agent-themed background |

### Legacy Color Aliases

> Map to new palette for backward compatibility. **Do not use in new code.**

| Token | Hex | Migrate to |
|-------|-----|-----------|
| `--green` | `#16a34a` | `--success` |
| `--green-bg` | `#f0fdf4` | `--success-light` |
| `--red` | `#ff4444` | `--error` |
| `--red-bg` | `#fff0f0` | `--error-light` |
| `--yellow` | `#ffaa00` | `--warning` |
| `--yellow-bg` | `#fff8e6` | `--warning-light` |
| `--tag-bg` | `#dcdcdc` | `--bg-4` |
| `--tag-fg` | `#555555` | `--fg-2` |
| `--code-bg` | `#1a1a1a` | `--surface-dark` |
| `--sidebar-bg` | `#e8e8e8` | `--bg-3` |

---

## Spacing Scale

Based on 4px grid. Use consistently across all components.

| Token | Value | Use |
|-------|-------|-----|
| `--space-1` | `4px` | Tight gaps (icon-to-text) |
| `--space-2` | `8px` | Inline padding, small gaps |
| `--space-3` | `12px` | Button padding, card inner spacing |
| `--space-4` | `16px` | Section gaps, card padding |
| `--space-5` | `20px` | Card padding (comfortable) |
| `--space-6` | `24px` | Section separation |
| `--space-8` | `32px` | Page section gaps |
| `--space-10` | `40px` | Large section separation |
| `--space-12` | `48px` | Page top/bottom margins |
| `--space-16` | `64px` | Hero/landing sections |

---

## Border Radius

Terminal theme: all `2px` (subtly rounded). Other themes override these tokens.

| Token | Terminal | Use |
|-------|---------|-----|
| `--radius-base` | `2px` | Default radius |
| `--radius-sm` | `2px` | Badges, tags, small elements |
| `--radius-md` | `2px` | Buttons, inputs, small cards |
| `--radius-lg` | `2px` | Cards, modals, dropdowns |
| `--radius-xl` | `2px` | Large cards, featured items |
| `--radius-full` | `9999px` | Avatars, pills, toggles |
| `--radius-button` | `2px` | Button corners |
| **Progress bar** | `0` (no radius) | Quest progress indicators, no rounded corners |

---

## Shadows

Flat design — no decorative shadows.

| Token | Value | Use |
|-------|-------|-----|
| `--shadow-xs` | `none` | — |
| `--shadow-sm` | `none` | — |
| `--shadow-md` | `0 1px 3px rgba(0,0,0,0.06)` | Dropdowns, popovers only |
| `--shadow-lg` | `0 2px 8px rgba(0,0,0,0.08)` | Modals only |
| `--shadow-accent` | `none` | — |

---

## Animation

| Token | Value | Use |
|-------|-------|-----|
| `--duration-fast` | `80ms` | Tooltip hide, micro-feedback |
| `--duration-base` | `150ms` | Button hover/active, standard transitions |
| `--duration-input` | `200ms` | Input/textarea focus & hover border |
| `--duration-slow` | `250ms` | Modals, overlays, page transitions |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Enter animations |
| `--ease-in-out` | `cubic-bezier(0.45, 0, 0.55, 1)` | Symmetric transitions |

### Component Durations (Industry Standard)

| Component | Duration | Tailwind | Rationale |
|-----------|----------|----------|-----------|
| Button hover/active | 150ms | `duration-150` | Snappy response, no perceived delay |
| Input/textarea focus | 200ms | `duration-200` | Smooth border change when tabbing |
| Tooltip show | 150ms delay + 120ms fade | — | Avoids flash on quick mouse pass |
| Tooltip hide | 80ms | — | Disappear faster than appear |
| Dropdown/popover | 150–200ms | `duration-150` | Balanced between smooth and fast |
| Modal/dialog | 250ms | `duration-250` | Needs clear recognition |

### Shorthand Variables

| Token | Value | Use |
|-------|-------|-----|
| `--transition-fast` | `80ms ease-out` | Quick hover feedback, tooltip hide |
| `--transition-normal` | `150ms ease-out` | Buttons, dropdowns |
| `--transition-input` | `200ms ease-out` | Input/textarea state changes |

### CSS Animations

| Name | Keyframe | Use |
|------|----------|-----|
| `page-fade-in` | `opacity: 0 → 1`, 220ms ease-out | Route change transition (applied via `key={pathname}`) |
| `button-pop` | `scale(0.95) → scale(1.02) → scale(1)`, 250ms | Button click feedback (`.btn-pop:active`) |
| `blink` | `opacity: 1 → 0 → 1` | Cursor blink in typing animation |
| `skeleton-pulse` | `background-position: 200% → 0` | Loading skeleton shimmer |

### Rules

- All interactive elements: `transition: all` with appropriate duration
- **Buttons**: `transition-all duration-150` (150ms) — snappy hover/active
- **Inputs/textareas**: `transition-all duration-200` (200ms) — smooth focus/hover border
- **State transitions are mandatory**: Any UI element that changes visual state (variant swap, active/inactive, expand/collapse, show/hide) MUST have a CSS transition. No abrupt visual jumps.
- Respect `prefers-reduced-motion: reduce`
- No layout-shifting animations (use `transform` + `opacity` only)
- Loading states: skeleton shimmer or subtle spinner (no bouncing)
- Focus: `outline: none` globally — no accent ring on any element

---

## Z-Index Scale

| Token | Value | Use |
|-------|-------|-----|
| `--z-base` | `0` | Default |
| `--z-dropdown` | `10` | Dropdowns, tooltips |
| `--z-sticky` | `20` | Sticky headers |
| `--z-overlay` | `30` | Modal backdrops |
| `--z-modal` | `40` | Modals, dialogs |
| `--z-toast` | `50` | Toast notifications |

---

## Component Visual Specs

> Interaction rules, do/don't, and behavioral patterns → see `UI_PATTERNS.md`

### Buttons

Each color has 3 styles: **fill** (solid bg), **tonal** (12% opacity bg), **outline** (border + /10 opacity hover).

| Color | Fill | Tonal | Outline |
|-------|------|-------|---------|
| **default** | `bg-foreground text-background hover:bg-fg-2` | `bg-bg-2 text-foreground hover:bg-bg-3` | `border border-border-2 bg-transparent hover:bg-bg-2` |
| **primary** | `bg-primary text-primary-foreground` | `bg-primary/12 text-primary hover:bg-primary/20` | `border border-primary/40 text-primary hover:bg-primary/10` |
| **danger** | `bg-destructive text-destructive-foreground` | `bg-destructive/12 text-destructive hover:bg-destructive/20` | `border border-destructive/40 text-destructive hover:bg-destructive/10` |
| **success** | `bg-emerald-600 text-white` | `bg-emerald-600/12 text-emerald-600` | `border border-emerald-600/40 text-emerald-600 hover:bg-emerald-600/10` |
| **warning** | `bg-amber-500 text-white` | `bg-amber-500/12 text-amber-500` | `border border-amber-500/40 text-amber-500 hover:bg-amber-500/10` |
| **info** | `bg-sky-500 text-white` | `bg-sky-500/12 text-sky-500` | `border border-sky-500/40 text-sky-500 hover:bg-sky-500/10` |

Utility variants: **ghost** (`hover:bg-bg-4`), **link** (`text-foreground underline-offset-4 hover:underline`), **outline** (neutral border, alias for `default-outline`).

Naming: `variant="primary"`, `variant="primary-tonal"`, `variant="primary-outline"`.

| Size | Height | Padding | Font |
|------|--------|---------|------|
| `sm` | 26px | px-2.5 | text-xs |
| `default` | 36px | px-4 | text-sm |
| `lg` | 44px | px-6 | text-sm |
| `xl` | 52px | px-8 | text-base |

**Icon button**: `iconOnly` prop — square (w=h), follows size. Use with any variant. All buttons: `font-semibold`, `rounded-button` (2px), `btn-pop` (scale bounce on click), **min `gap-2`** for icon+text spacing. No focus ring — `focus-visible:outline-hidden`.

### Cards

- Border: `border border-border-1` (1px, `--border-1`)
- Background: `bg-bg-1`
- Hover: `hover:bg-bg-2` (subtle bg shift, no border change)
- Radius: `rounded` (uses `--radius-base`, 2px Terminal)
- Padding: `--space-4` to `--space-5`
- No box-shadow at rest

### Badges / Tags

- Radius: `--radius-md` (2px) for all badges except count badges
- Padding: `px-2 py-0.5`
- Font: `text-xs font-semibold`, inline-flex with `gap-1`
- Variant groups:
  - **Semantic** (text only): `default` (fg-1), `success`, `error`, `warning`, `info`, `muted` (fg-3)
  - **Pill** (border + rounded): `pill` — border-border-2, text-fg-2, `uppercase text-2xs font-normal`, px-2 py-0.5, rounded-md. Pills auto-uppercase with smaller text and regular weight
  - **Filled** (solid bg): `filled-success`, `filled-error`, `filled-warning`, `filled-muted` (bg-bg-3 text-fg-3)
  - **Outline** (border + light bg): `outline` (border-border-2 bg-bg-2 text-fg-1), `outline-success`, `outline-error`, `outline-warning`, `outline-primary` (new variant)
  - **Count** (small filled pill for numbers): `count` (bg-fg-1 text-bg-1), `count-muted` (bg-bg-3 text-fg-2), `count-outline`, `count-primary`, `count-primary-inverted`, `count-success`, `count-error`, `count-warning`, `count-info`
- Count badges only: `min-w-5 h-5 px-1.5 text-2xs font-semibold rounded-full` (fully rounded)

### Form Inputs

- Height: 36px (default), 44px (lg)
- Border: `border border-input` (`--border-2`)
- Focus: `focus-visible:border-foreground` (subtle border change, no ring/outline)
- Error: `border-error`
- Font: monospace, `text-base` (16px)

### Topbar

- Component: `<Navbar>` (`src/components/navbar.tsx`)
- Height: `56px` (`h-14`)
- Background: `bg-bg-base` (`--bg-base`)
- **On scroll**: `border-b border-border` + `backdrop-blur-md` + `bg-bg-base/80` (glass effect)
- **At rest**: `border-b border-border-1` (subtle)
- Logo: `<BrandLogo animated />` — full logo on desktop, icon-only on mobile
- Divider: `h-4 w-px bg-border-2` between logo and nav (desktop only)
- Active link: `text-primary font-semibold` (color change, no underline/bg)
- Inactive link: `text-fg-1 font-semibold`, hover: `text-primary`
- Nav font: `text-sm font-semibold`
- Theme switcher: simple sun/moon toggle button (`variant="outline" iconOnly`)
- **Mobile**: action buttons (Create, Dashboard) in header; navigation moves to bottom nav

### Bottom Navigation (Mobile)

- Component: `<BottomNav>` inside `navbar.tsx`, visible `lg:hidden`
- Height: `52px` (`h-13`) — Apple HIG tab bar standard
- Touch target: `44px` minimum per item
- 3 items: Quests (`Compass3`), Web3 Skills (`Code`), Bounties (`Trophy`)
- Icons: MingCute **Line** variant inactive, **Fill** variant active (`[&.active]` class toggle)
- Labels: `text-2xs font-medium`
- **On scroll**: `border-t border-border backdrop-blur-md bg-bg-base/80` (glass effect)
- **At rest**: `bg-bg-base` (no border, no glass)
- Safe area: `env(safe-area-inset-bottom)` padding for iPhone home indicator
- Layout padding: parent container `pb-[52px] lg:pb-0`

### Footer

- Component: `<Footer>` (`src/components/footer.tsx`)
- Data-driven: `LINKS` array with `href`, `label`, `external?`
- Separator: `h-1 w-1 rounded-full bg-border-2` bullet dots between nav links
- Desktop: single row — logo+copyright left, nav links right with bullet separators
- Mobile: 2-row stacked — logo+copyright on top, links below

### Tabs

- Active: `border-b-3 border-fg-1 text-fg-1 font-semibold`
- Inactive: `border-b-3 border-transparent text-fg-3`, hover: `text-fg-1`
- Gap: `gap-4 lg:gap-6` between tab items
- No padding-x on tab items
- Active badge: `count` variant, inactive badge: `count-outline` variant
- Font: `text-base`
- **Mobile**: `overflow-x-auto scrollbar-hide` horizontal scroll
- **Fade mask**: right-side gradient (`bg-gradient-to-l from-bg-base to-transparent`), auto-hides when scrolled to end
- **Sliding underline**: `h-[3px] bg-fg-1 rounded-full` with `transition-all duration-200 ease-out`, positioned via JS `tabIndicatorStyle`

### View Toggle

- Container: `border border-border-2 p-0.5` with sliding indicator (`bg-bg-3`)
- Active: `text-fg-1` (strong text on highlight)
- Inactive: `text-fg-3`, hover: `text-fg-1`
- **2 views only**: grid + compact (table). List view removed
- **Hidden on mobile**: `max-lg:hidden` — mobile uses grid view only

---

## Layout & Responsive

> See `UI_PATTERNS.md` for page layouts, container rules, grid patterns, and per-component responsive behavior.

3 breakpoints (mobile-first):

| Breakpoint | Tailwind | Width |
|------------|----------|-------|
| Mobile | default | < 640px |
| Tablet | `md:` | >= 768px |
| Desktop | `xl:` | >= 1280px |

Rules: mobile-first, avoid `lg:`/`2xl:`, use `sm:` only for minor tweaks.

---

## Tailwind ↔ CSS Variable Mapping

All CSS variables mapped via `@theme` block in `apps/dashboard/src/index.css` (Tailwind v4). Use Tailwind classes in JSX.

### Numbered Scale (primary system)

| CSS Variable | Tailwind Class | Use |
|-------------|----------------|-----|
| `--bg-base` | `bg-bg-base` | Body/page bg, navbar |
| `--bg-1` | `bg-bg-1` | Cards, popovers, inputs |
| `--bg-2` | `bg-bg-2` | Secondary surfaces, hover states |
| `--bg-3` | `bg-bg-3` | Sidebar, section bg, skeleton |
| `--bg-4` | `bg-bg-4` | Disabled bg, muted backgrounds |
| `--fg-1` | `text-fg-1` | Primary text |
| `--fg-2` | `text-fg-2` | Secondary text |
| `--fg-3` | `text-fg-3` | Muted text, placeholders |
| `--fg-4` | `text-fg-4` | Disabled text |
| `--border-1` | `border-border-1` | Card borders, subtle dividers |
| `--border-2` | `border-border-2` | Default borders |
| `--border-3` | `border-border-3` | Active/emphasis borders |
| `--border-4` | `border-border-4` | Strong contrast borders |

### Semantic Colors

| CSS Variable | Tailwind Class | Use |
|-------------|----------------|-----|
| `--success` | `text-success` / `bg-success` | Completed, funded, connected |
| `--success-light` | `bg-success-light` | Success background |
| `--success-border` | `border-border-success` | Success borders |
| `--error` | `text-error` / `bg-error` | Error states |
| `--error-light` | `bg-error-light` | Error background |
| `--error-border` | `border-border-error` | Error borders |
| `--warning` | `text-warning` / `bg-warning` | Caution states |
| `--warning-light` | `bg-warning-light` | Warning background |
| `--warning-border` | `border-border-warning` | Warning borders |
| `--info` | `text-info` / `bg-info` | Info states |
| `--info-light` | `bg-info-light` | Info background |
| `--info-border` | `border-border-info` | Info borders |
| `--primary` | `bg-primary` / `text-primary` | Buttons, CTA |
| `--accent` | `bg-accent` / `text-accent` | Accent highlights |
| `--accent-border` | `border-border-accent` | Accent borders |

### shadcn Token Aliases

> shadcn/ui classes still work — they point to numbered tokens internally.

| shadcn Token | Maps To | Use |
|-------------|---------|-----|
| `background` | `--bg-base` | `bg-background` → body/page bg |
| `foreground` | `--fg-1` | `text-foreground` → darkest fg |
| `card` | `--bg-1` | `bg-card` → card background |
| `muted` | `--bg-4` | `bg-muted` → muted background |
| `muted-foreground` | `--fg-3` | `text-muted-foreground` → muted text |
| `secondary` | `--bg-4` | `bg-secondary` → secondary bg |
| `secondary-foreground` | `--fg-1` | `text-secondary-foreground` |
| `primary` | `--primary` | `bg-primary` → brand buttons |
| `primary-foreground` | `--primary-fg` | `text-primary-foreground` |
| `destructive` | `--error` | `text-destructive` → error states |
| `accent` | `--accent` | `bg-accent` → accent color |
| `accent-foreground` | `--accent-fg` | `text-accent-foreground` |
| `border` | `--border-2` | `border-border` → default border |
| `input` | `--border-2` | `border-input` → form inputs |
| `ring` | `--accent` | Focus ring color |

### CSS Variable Source

All tokens defined in `apps/dashboard/src/index.css` — `:root` block for values, `@theme` block for Tailwind mapping.
No separate `tailwind.config.js` — uses Tailwind v4 CSS-first configuration.

---

## Multi-Theme System

Currently **only Terminal theme is active** (light/dark). Other themes (Glass, Brutalist, Minimal, Bauhaus) are temporarily disabled — CSS imports commented out, THEMES array reduced.

| Theme | Font | Style | Status |
|-------|------|-------|--------|
| **Terminal** (default) | Geist Mono | Flat, monospace, high-contrast | **Active** |
| Glass | Inter | Frosted blur, translucent | Disabled (TODO) |
| Brutalist | Space Grotesk | Heavy borders, offset shadows | Disabled (TODO) |
| Minimal | Inter | Clean, airy, subtle | Disabled (TODO) |
| Bauhaus | DM Sans | Geometric, warm palette | Disabled (TODO) |

### Theme Architecture

- CSS variables + `[data-theme="x"]` selector on `<html>`
- Dark mode via `.dark` class on `<html>`
- Theme definitions: `src/styles/themes/` (one file per theme, imports in `themes/index.css`)
- Base tokens (Terminal light): `src/index.css` `:root`
- Context: `src/context/ThemeContext.tsx` (localStorage + system preference)
- Switcher UI: `src/components/theme-switcher.tsx` — simple sun/moon toggle (light↔dark)
- FOUC prevention: inline `<script>` in `index.html`

### What themes customize

- Fonts (`--font`, `--font-heading`)
- Border radius (`--radius-*`)
- Shadows (`--shadow-*`)
- Core colors (bg, fg, border palettes)
- Dark mode colors and shadow overrides

### What stays constant across themes

- Brand color: `#FF574B` (accent, primary, link, tone-quest, tone-agent)
- Semantic colors: success, error, warning, info
- Typography scale, spacing, z-index, animation tokens
- Platform colors (Stripe, Telegram, Discord, X)

---

## Iconography

**Library:** MingCute (`@mingcute/react`) — 24x24 grid, 2px stroke.

### Icon Sizing Standard

Only use these sizes. No arbitrary values (13px, 15px, 17px, etc.).

| Size | Tailwind | Context | Example |
|------|----------|---------|---------|
| **12px** | `size={12}` | Badge/tag inline, micro indicators | Icon inside `<Badge>` |
| **14px** | `size={14}` | Compact buttons, quest type badge | `<RunLine size={14} />` in type badge |
| **16px** | `size={16}` | **Default** — buttons, nav items, general UI | `<AddLine size={16} />` |
| **20px** | `size={20}` | Section headers, CTA buttons | Card section title icon |
| **24px** | `size={24}` | Nav active state, hero elements | Active nav icon |
| **48px** | `size={48}` | Empty states, error states only | `<Search2Line size={48} />` centered |

### Avatar Sizing Standard

Always request **2x display size** from DiceBear for crisp rendering on retina.
Use `bottts-neutral` style with transparent background.

| Display | Tailwind | DiceBear request | Context |
|---------|----------|-----------------|---------|
| **24px** | `w-6 h-6` | `getDiceBearUrl(seed, 48)` | Avatar stack (overlap) |
| **32px** | `w-8 h-8` | `getDiceBearUrl(seed, 64)` | Table row, popup list, detail list |
| **36px** | `w-9 h-9` | `getDiceBearUrl(seed, 72)` | Navbar user profile |
| **64px** | `w-16 h-16` | `getDiceBearUrl(seed, 128)` | Profile header, agent detail |

**Avatar stack overlap:** `-ml-2 first:ml-0` for 24px avatars.
**DiceBear style:** `bottts-neutral` (robot style, deterministic per seed, transparent bg)

### Variant Rules

| State | Variant | Example |
|-------|---------|---------|
| Default / inactive | **Line** (outline) | `<StarLine />` |
| Active / selected | **Fill** (solid) | `<StarFill />` |
| Decorative (no meaning) | Line + `aria-hidden="true"` | Activity dots, dividers |

### Brand Icons

Use `<PlatformIcon name="..." size={N} colored />` for third-party logos (X, Discord, Telegram, OpenClaw). Never use MingCute for brand logos.

---

## Motion & Transitions

### Enter/Exit Patterns

| Pattern | Properties | Duration | Use |
|---------|-----------|----------|-----|
| Fade in | `opacity: 0→1` | `--duration-base` (150ms) | Component mount |
| Slide up | `translateY(8px)→0` + fade | `--duration-slow` (250ms) | Modals, sheets |
| Scale | `scale(0.95)→1` + fade | `--duration-slow` (250ms) | Dropdowns, popovers |
| Collapse | `height: 0→auto` | `--duration-slow` (250ms) | Expandable sections |

### Rules

- All transitions: use `transform` + `opacity` only (no layout-shifting)
- `prefers-reduced-motion: reduce` — all animations disabled globally
- Skeleton loaders: acceptable (subtle pulse, non-distracting)
- No stagger delays > 500ms total for lists
- No auto-playing animations that can't be paused

---

## Accessibility Checklist

See `ACCESSIBILITY.md` for full standards.

- [ ] Color contrast: 4.5:1 normal text, 3:1 large text (see verified table)
- [ ] Semantic colors: always pair with icon/text — never color alone
- [x] Focus rings: disabled globally (`outline: none`), inputs use `border-foreground` on focus
- [ ] Touch targets: 44x44px mobile, 36x36px desktop
- [ ] `aria-label` on icon-only buttons
- [ ] `aria-busy="true"` on loading skeletons
- [ ] `aria-hidden="true"` on decorative elements
- [ ] Tab order matches visual order
- [ ] `prefers-reduced-motion` respected (global rule in `index.css`)
