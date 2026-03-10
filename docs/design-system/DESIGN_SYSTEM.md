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
| **Font** | Geist Mono | Single monospace font, all weights |

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

**Single font:** Geist Mono — monospace for everything.

```html
<link href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
```

### CSS Variables

| Token | Value | Tailwind |
|-------|-------|----------|
| `--font` | `"Geist Mono", ui-monospace, ...` | `font-sans` |
| `--font-heading` | `"Geist Mono", ui-monospace, ...` | `font-heading` |
| `--font-mono` | `"Geist Mono", ui-monospace, ...` | `font-mono` |

**Note:** All three font stacks resolve to the same monospace family. `font-sans` in Tailwind outputs monospace — this is intentional.

### Scale

| Token | Size | Use |
|-------|------|-----|
| `--text-xs` | 12px | Captions, timestamps, meta |
| `--text-sm` | 14px | Labels, secondary text, nav |
| `--text-base` | 16px | Body text (default) |
| `--text-md` | 16px | Alias for base |
| `--text-lg` | 18px | Section titles |
| `--text-xl` | 20px | Card headings |
| `--text-2xl` | 24px | Page titles |
| `--text-3xl` | 28px | Hero headings |

### Font weights

| Weight | Tailwind | Use |
|--------|----------|-----|
| 400 | `font-normal` | Body text, descriptions |
| 500 | `font-medium` | Labels, badges, nav items |
| 600 | `font-semibold` | Headings, titles, buttons, emphasis |

**Max weight is `font-semibold` (600).** Do not use `font-bold` (700) or `font-extrabold` (800) anywhere in the UI.

### Line heights

- Body text: `1.6`
- Headings: `1.3`
- Compact (tables, badges): `1.2`

---

## Color Palette

### Core

| Token | Hex | Use |
|-------|-----|-----|
| `--bg` | `#ffffff` | Page background (white) |
| `--bg-subtle` | `#e5e5e5` | Sidebar, section bg, card hover |
| `--bg-muted` | `#dcdcdc` | Disabled bg, skeleton loading |
| `--fg` | `#111111` | Primary text (near-black) |
| `--fg-secondary` | `#555555` | Secondary text |
| `--fg-muted` | `#888888` | Placeholder, disabled text |
| `--border` | `#e5e5e5` | Default borders, dividers |
| `--border-muted` | `#efefef` | Card borders, subtle dividers |
| `--border-heavy` | `#aaaaaa` | Active borders, emphasis |
| `--border-strong` | `#222222` | Strong contrast borders |

### Dark Surfaces

For code blocks, dark cards, and inverted sections:

| Token | Hex | Use |
|-------|-----|-----|
| `--surface-dark` | `#1a1a1a` | Dark card background |
| `--surface-dark-subtle` | `#2a2a2a` | Dark card hover/secondary |
| `--surface-dark-fg` | `#ffffff` | Text on dark surfaces |
| `--surface-dark-muted` | `#999999` | Muted text on dark surfaces |

### Brand / Accent — `#FF574B` (Coral Red)

> **Brand color** used consistently across all themes. Each theme adapts light/dark variants while keeping the same hue.

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `--accent` | `#FF574B` | `#FF6B61` | Accent/highlight color |
| `--accent-hover` | `#E64A3F` | `#FF574B` | Accent hover state |
| `--accent-light` | `#FFF0EF` | `#3D1512` | Accent tinted background |
| `--accent-border` | `#FF574B` | `#FF574B` | Accent borders |
| `--accent-fg` | `#ffffff` | `#000000` | Text on accent background |

### Primary (Buttons) — brand color

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `--primary` | `#FF574B` | `#FF6B61` | Button background |
| `--primary-hover` | `#E64A3F` | `#FF574B` | Button hover state |
| `--primary-fg` | `#ffffff` | `#000000` | Button text |

### Links

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `--link` | `#FF574B` | `#FF6B61` | Inline link text |
| `--link-visited` | `#E64A3F` | `#FF8A82` | Visited link text |

### Semantic

| Token | Hex | Use |
|-------|-----|-----|
| `--success` | `#16a34a` | Completed, funded, connected, rewards |
| `--success-light` | `#f0fdf4` | Success background |
| `--success-border` | `#86efac` | Success borders |
| `--error` | `#ff4444` | Errors, failed, cancelled |
| `--error-light` | `#fff0f0` | Error background |
| `--error-border` | `#ff8888` | Error borders |
| `--warning` | `#ffaa00` | Caution, expiring soon |
| `--warning-light` | `#fff8e6` | Warning background |
| `--warning-border` | `#ffcc66` | Warning borders |
| `--info` | `#4488ff` | Info, external links |
| `--info-light` | `#e6f0ff` | Info background |

### Actor Colors — monochrome

All actor colors use grayscale to match the monochromatic theme:

| Actor | FG | BG | Border | Use |
|-------|----|----|--------|-----|
| Human | `#555555` | `#f0f0f0` | `#cccccc` | Human tasks, social tasks |
| Agent | `#FF574B` | `#FFF0EF` | `#FF574B` | Agent tasks, AI agents |
| Skill | `#555555` | `#f0f0f0` | `#cccccc` | Skills, tags |
| Social | `#555555` | `#f0f0f0` | — | Social task text/bg |

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
| `--tone-quest` | `#FF574B` | `#FF6B61` | Quest-themed foreground |
| `--tone-quest-dark` | `#E64A3F` | `#FF574B` | Quest-themed hover |
| `--tone-quest-bg` | `#FFF0EF` | `#3D1512` | Quest-themed background |
| `--tone-agent` | `#FF574B` | `#FF6B61` | Agent-themed foreground |
| `--tone-agent-dark` | `#E64A3F` | `#FF574B` | Agent-themed hover |
| `--tone-agent-bg` | `#FFF0EF` | `#3D1512` | Agent-themed background |

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
| `--tag-bg` | `#dcdcdc` | `--bg-muted` |
| `--tag-fg` | `#555555` | `--fg-secondary` |
| `--code-bg` | `#1a1a1a` | `--surface-dark` |
| `--sidebar-bg` | `#e8e8e8` | `--bg-subtle` (`#e5e5e5`) |

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

Terminal theme: all `0px` (square corners). Other themes override these tokens.

| Token | Terminal | Use |
|-------|---------|-----|
| `--radius-base` | `0px` | Default radius |
| `--radius-sm` | `0px` | Badges, tags, small elements |
| `--radius-md` | `0px` | Buttons, inputs, small cards |
| `--radius-lg` | `0px` | Cards, modals, dropdowns |
| `--radius-xl` | `0px` | Large cards, featured items |
| `--radius-full` | `9999px` | Avatars, pills, toggles |
| `--radius-button` | `0px` | Button corners |

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
| `--duration-fast` | `80ms` | Hover color changes |
| `--duration-base` | `150ms` | Most transitions |
| `--duration-slow` | `250ms` | Modals, overlays |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Enter animations |
| `--ease-in-out` | `cubic-bezier(0.45, 0, 0.55, 1)` | Symmetric transitions |

### Shorthand Variables

| Token | Value | Use |
|-------|-------|-----|
| `--transition-fast` | `80ms ease-out` | Quick hover feedback |
| `--transition-normal` | `150ms ease-out` | Standard transitions |

### Rules

- All interactive elements: `transition: all var(--transition-normal)`
- Respect `prefers-reduced-motion: reduce`
- No layout-shifting animations (use `transform` + `opacity` only)
- Loading states: skeleton shimmer or subtle spinner (no bouncing)

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

| Variant | Style | Use |
|---------|-------|-----|
| **Default** | `bg-primary text-primary-foreground` | Main CTA |
| **Outline** | `border-border`, hover: `bg-muted` | Secondary actions |
| **Ghost** | No border/bg, hover: `bg-muted` | Tertiary, icon buttons |
| **Destructive** | `bg-error text-white` | Delete, destructive |
| **Quest** | `bg-primary border-border-heavy` | Quest-specific CTAs |
| **Agent** | `bg-tone-agent border-tone-agent-dark` | Agent-specific CTAs |
| **Danger** | `text-error border-error` (transparent bg) | Soft destructive |

Sizing: `sm` (32px h), `default` (36px h), `lg` (44px h), `icon` (36x36). All `font-semibold`, monospace.

### Cards

- Border: `border border-border-muted` (1px, lightest border token)
- Background: `bg-card` (`--bg`)
- Hover: `hover:bg-background` (lightest bg). Glass theme: CSS override to `rgba(255,255,255,0.85)`
- Radius: `--radius-base` (0px Terminal)
- Padding: `--space-4` to `--space-5`
- No box-shadow at rest

### Badges / Tags

- Radius: `--radius-full` (9999px)
- Padding: `4px 8px`
- Font: `text-xs font-medium`
- Variants: filled (bg + text) or outline (border + text)

### Form Inputs

- Height: 36px (default), 44px (lg)
- Border: `border border-border`
- Focus: `outline: 2px solid var(--accent)`, `outline-offset: 2px`
- Error: `border-error`
- Font: monospace, `text-base` (16px)

### Topbar

- Height: `64px` (default)
- Background: `bg-background` + bottom border
- Logo: `CLAWQUEST`, `text-base font-semibold`
- Active link: `border-b-2 border-foreground` (underline indicator)
- Nav font: `text-sm`

### Tabs

- Sliding indicator: `bg-foreground` behind active tab
- Active: `text-background font-semibold` (inverted)
- Inactive: `text-muted-foreground`, hover: `text-foreground`
- Icons: Fill variant active, Line variant inactive

### View Toggle

- Container: `border border-border p-0.5` with sliding indicator (`bg-accent`)
- Active: `text-accent-foreground`
- Inactive: `text-muted-foreground`, hover: `text-foreground`

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

| CSS Variable | Tailwind Class | Example |
|-------------|----------------|---------|
| `--bg` | `bg-background` | `<div className="bg-background">` |
| `--bg-subtle` | `bg-bg-subtle` | `<div className="bg-bg-subtle">` |
| `--bg-muted` | `bg-muted` / `bg-secondary` | `<div className="bg-muted">` |
| `--fg` | `text-foreground` | `<p className="text-foreground">` |
| `--fg-secondary` | `text-fg-secondary` | `<span className="text-fg-secondary">` |
| `--fg-muted` | `text-muted-foreground` | `<span className="text-muted-foreground">` |
| `--primary` | `bg-primary` / `text-primary` | Buttons |
| `--primary-fg` | `text-primary-foreground` | Button text |
| `--accent` | `bg-accent` / `text-accent` | Accent highlights |
| `--border` | `border-border` | `<div className="border border-border">` |
| `--border-muted` | `border-border-muted` | `<div className="border border-border-muted">` (cards) |
| `--success` | `text-success` / `bg-success` | Rewards, connected status |
| `--error` | `text-error` / `bg-error` / `text-destructive` | Error states |

### shadcn Token Aliases

| shadcn Token | Maps To | Hex |
|-------------|---------|-----|
| `background` | `--bg` | `#ffffff` |
| `foreground` | `--fg` | `#111111` |
| `primary` | `--primary` | `#FF574B` (brand) |
| `primary-foreground` | `--primary-fg` | `#ffffff` |
| `secondary` | `--bg-muted` | `#dcdcdc` |
| `secondary-foreground` | `--fg` | `#111111` |
| `muted` | `--bg-muted` / `--fg-muted` | `#dcdcdc` / `#888888` |
| `destructive` | `--error` | `#ff4444` |
| `destructive-foreground` | `--accent-fg` | `#ffffff` |
| `accent` | `--accent` | `#FF574B` |
| `accent-foreground` | `--accent-fg` | `#ffffff` |
| `card` | `--bg` | `#ffffff` |
| `popover` | `--bg` | `#ffffff` |
| `input` | `--border` | `#e5e5e5` |
| `ring` | `--accent` | `#FF574B` |

### CSS Variable Source

All tokens defined in `apps/dashboard/src/index.css` — `:root` block for values, `@theme` block for Tailwind mapping.
No separate `tailwind.config.js` — uses Tailwind v4 CSS-first configuration.

---

## Multi-Theme System

5 themes x 2 modes (light/dark) = 10 variants. All themes share the brand color `#FF574B`.

| Theme | Font | Style | Radius | Shadows |
|-------|------|-------|--------|---------|
| **Terminal** (default) | Geist Mono | Flat, monospace, high-contrast | 0–8px | None (light), subtle + brand glow (dark) |
| **Glass** | Inter | Frosted blur, translucent, rounded, backdrop-filter on popover/topbar | 8–20px | Soft layered (light), deeper translucent (dark) |
| **Brutalist** | Space Grotesk | Heavy borders, hard offset shadows | 0px all | Black offset (light), white offset (dark) |
| **Minimal** | Inter | Clean, airy, subtle | 4–12px | Very subtle (light), slightly stronger (dark) |
| **Bauhaus** | DM Sans | Geometric, warm palette, bold | 0px + 50px xl | None (both modes) |

### Theme Architecture

- CSS variables + `[data-theme="x"]` selector on `<html>`
- Dark mode via `.dark` class on `<html>`
- Theme definitions: `src/styles/themes/` (one file per theme: `terminal.css`, `glass.css`, `brutalist.css`, `minimal.css`, `bauhaus.css`)
- Base tokens (Terminal light): `src/index.css` `:root`
- Context: `src/context/ThemeContext.tsx` (localStorage + system preference)
- Switcher UI: `src/components/theme-switcher.tsx`
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

### Sizing

| Context | Size | Example |
|---------|------|---------|
| Inline (badges, meta) | 14–16px | `<WifiLine size={14} />` in status badge |
| Nav / buttons | 18–20px | `<AddLine size={20} />` in navbar |
| Section headers | 20–24px | Card section title icon |
| Empty states / errors | 48px | `<Search2Line size={48} />` centered |

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
- [ ] Focus rings: `2px solid var(--accent)`, `outline-offset: 2px`
- [ ] Touch targets: 44x44px mobile, 36x36px desktop
- [ ] `aria-label` on icon-only buttons
- [ ] `aria-busy="true"` on loading skeletons
- [ ] `aria-hidden="true"` on decorative elements
- [ ] Tab order matches visual order
- [ ] `prefers-reduced-motion` respected (global rule in `index.css`)
