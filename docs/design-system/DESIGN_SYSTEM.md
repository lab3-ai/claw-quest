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

| Token | Size | Line height | Tailwind | Use |
|-------|------|-------------|----------|-----|
| `--text-2xs` | 10px | 14px | `text-2xs` | Micro labels, uppercase tracking |
| `--text-xs` | 12px | 16px | `text-xs` | Captions, timestamps, meta |
| `--text-sm` | 14px | 20px | `text-sm` | Labels, secondary text, nav |
| `--text-base` | 16px | 24px | `text-base` | Body text (default) |
| `--text-md` | 16px | 24px | `text-md` | Alias for base |
| `--text-lg` | 18px | 28px | `text-lg` | Section titles |
| `--text-xl` | 20px | 28px | `text-xl` | Card headings |
| `--text-2xl` | 24px | 32px | `text-2xl` | Page titles |
| `--text-3xl` | 28px | 36px | `text-3xl` | Hero headings |

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
| **bg-1** | lightest (`#fff`) | darkest (`#0a0a0a`) | Page bg, cards |
| **bg-4** | darkest | lightest | Muted bg, disabled |
| **fg-1** | darkest (`#111`) | lightest (`#e0e0e0`) | Primary text |
| **fg-4** | lightest | darkest | Disabled text |
| **border-1** | lightest | lightest | Subtle dividers |
| **border-4** | darkest | darkest | Strong contrast |

Direction flips between modes so that **the same class works in both**: `bg-bg-1` is always the base surface, `text-fg-1` is always the strongest text.

#### Background

| Token | Tailwind | Hex | Use |
|-------|----------|-----|-----|
| `--bg-1` | `bg-bg-1` | `#ffffff` | Page background, card bg |
| `--bg-2` | `bg-bg-2` | `#f5f5f5` | **Body background**, navbar, secondary surfaces |
| `--bg-3` | `bg-bg-3` | `#e5e5e5` | Sidebar, section bg, card hover, skeleton |
| `--bg-4` | `bg-bg-4` | `#dcdcdc` | Disabled bg, muted backgrounds |

#### Foreground

| Token | Tailwind | Hex | Use |
|-------|----------|-----|-----|
| `--fg-1` | `text-fg-1` | `#111111` | Primary text (near-black) |
| `--fg-2` | `text-fg-2` | `#555555` | Secondary text, badge labels |
| `--fg-3` | `text-fg-3` | `#888888` | Muted text, placeholders |
| `--fg-4` | `text-fg-4` | `#aaaaaa` | Disabled text, lightest foreground |

#### Border

| Token | Tailwind | Hex | Use |
|-------|----------|-----|-----|
| `--border-1` | `border-border-1` | `#efefef` | Card borders, subtle dividers |
| `--border-2` | `border-border-2` | `#e5e5e5` | Default borders, dividers (shadcn `border`) |
| `--border-3` | `border-border-3` | `#aaaaaa` | Active borders, emphasis |
| `--border-4` | `border-border-4` | `#222222` | Strong contrast borders |

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

Each semantic color has 3 tokens: **base** (text/icon), **light** (background), **border**.

| Group | Token | Tailwind | Hex | Use |
|-------|-------|----------|-----|-----|
| Success | `--success` | `text-success` / `bg-success` | `#16a34a` | Completed, funded, connected |
| | `--success-light` | `bg-success-light` | `#f0fdf4` | Success background |
| | `--success-border` | `border-border-success` | `#86efac` | Success borders |
| Error | `--error` | `text-error` / `bg-error` | `#ff4444` | Errors, failed, cancelled |
| | `--error-light` | `bg-error-light` | `#fff0f0` | Error background |
| | `--error-border` | `border-border-error` | `#ff8888` | Error borders |
| Warning | `--warning` | `text-warning` / `bg-warning` | `#ffaa00` | Caution, expiring soon |
| | `--warning-light` | `bg-warning-light` | `#fff8e6` | Warning background |
| | `--warning-border` | `border-border-warning` | `#ffcc66` | Warning borders |
| Info | `--info` | `text-info` / `bg-info` | `#4488ff` | Info, external links |
| | `--info-light` | `bg-info-light` | `#e6f0ff` | Info background |
| | `--info-border` | `border-border-info` | `#88bbff` | Info borders |

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

Each color has 3 styles: **fill** (solid bg), **tonal** (20% opacity bg), **outline** (border + transparent bg).

| Color | Fill | Tonal | Outline |
|-------|------|-------|---------|
| **default** | `bg-foreground text-background` | `bg-secondary text-secondary-foreground` | `border-input bg-background` |
| **primary** | `bg-primary text-primary-foreground` | `bg-primary/20 text-primary` | `border-primary/30 text-primary` |
| **danger** | `bg-destructive text-destructive-foreground` | `bg-destructive/20 text-destructive` | `border-destructive/30 text-destructive` |
| **success** | `bg-emerald-600 text-white` | `bg-emerald-600/20 text-emerald-600` | `border-emerald-600/30 text-emerald-600` |
| **warning** | `bg-amber-500 text-white` | `bg-amber-500/20 text-amber-500` | `border-amber-500/30 text-amber-500` |
| **info** | `bg-sky-500 text-white` | `bg-sky-500/20 text-sky-500` | `border-sky-500/30 text-sky-500` |

Utility variants: **ghost** (no bg, hover only), **link** (underline), **outline** (neutral border, alias for `default-outline`).

Naming: `variant="primary"`, `variant="primary-tonal"`, `variant="primary-outline"`.

| Size | Height | Padding | Font |
|------|--------|---------|------|
| `sm` | 26px | px-2.5 | text-xs |
| `default` | 36px | px-4 | text-sm |
| `lg` | 44px | px-6 | text-sm |
| `xl` | 52px | px-8 | text-base |

**Icon button**: `iconOnly` prop — square (w=h), follows size. Use with any variant.

All buttons: `font-semibold`, `rounded-button`, `active:scale-95`, **min `gap-2`** for icon+text spacing. Demo: `/concepts/demo/buttons`.

### Cards

- Border: `border border-border` (1px, `--border-2`)
- Background: `bg-background` (`--bg-1`)
- Hover: `hover:border-foreground`. Glass theme: CSS override to `rgba(255,255,255,0.85)`
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
- Border: `border border-input` (`--border-2`)
- Focus: `outline: 2px solid var(--accent)`, `outline-offset: 2px`
- Error: `border-error`
- Font: monospace, `text-base` (16px)

### Topbar

- Height: `64px` (default)
- Background: `bg-bg-2` (`--bg-2`)
- **On scroll**: `border-b border-border` + `backdrop-blur-md` + `bg-bg-2/80` (glass effect)
- Logo: `CLAWQUEST`, `text-base font-semibold`
- Active link: sliding `bg-foreground` underline indicator (2px)
- Nav font: `text-sm font-semibold`

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

### Numbered Scale (primary system)

| CSS Variable | Tailwind Class | Use |
|-------------|----------------|-----|
| `--bg-1` | `bg-bg-1` | Page bg, cards |
| `--bg-2` | `bg-bg-2` | Body bg, navbar, secondary surfaces |
| `--bg-3` | `bg-bg-3` | Sidebar, section bg, card hover |
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
| `background` | `--bg-1` | `bg-background` → lightest bg |
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
