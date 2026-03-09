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
| `--bg-subtle` | `#e8e8e8` | Sidebar, section bg, card hover |
| `--bg-muted` | `#dcdcdc` | Disabled bg, skeleton loading |
| `--fg` | `#111111` | Primary text (near-black) |
| `--fg-secondary` | `#555555` | Secondary text |
| `--fg-muted` | `#888888` | Placeholder, disabled text |
| `--border` | `#d0d0d0` | Card borders, dividers |
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
| `--sidebar-bg` | `#e8e8e8` | `--bg-subtle` |

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

Tight, minimal — no rounded corners.

| Token | Value | Use |
|-------|-------|-----|
| `--radius-sm` | `3px` | Badges, tags, small elements |
| `--radius-md` | `4px` | Buttons, inputs, small cards |
| `--radius-lg` | `6px` | Cards, modals, dropdowns |
| `--radius-xl` | `8px` | Large cards, featured items |
| `--radius-full` | `9999px` | Avatars, pills, toggles |
| `--radius-base` | `0px` | Avatars, pills, toggles |

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

## Component Guidelines

### Buttons

| Variant | Style | Use |
|---------|-------|-----|
| **Default** | `bg: --primary` (black), white text, `--radius-md` | Main CTA |
| **Outline** | `border: --border`, no bg, hover: `bg-muted` | Secondary actions |
| **Ghost** | No border, no bg, hover: `bg-muted` | Tertiary, icon buttons |
| **Destructive** | `bg: --error`, white text | Delete, destructive |
| **Quest** | `bg: --primary`, `border: --border-heavy` | Quest-specific CTAs |
| **Agent** | `bg: --tone-agent`, `border: --tone-agent-dark` | Agent-specific CTAs |
| **Danger** | `bg: transparent`, `text/border: --error` | Soft destructive |

Sizing: `sm` (32px h), `default` (36px h), `lg` (44px h), `icon` (36x36)

All buttons: `font-weight: 600`, monospace, tight radius.

### Cards

- Background: `--bg` (white)
- Border: `1px solid var(--border)`
- Radius: `--radius-lg` (6px)
- Padding: `--space-4` to `--space-5`
- Hover: subtle border darken (no shadow)
- No box-shadow at rest

### Badges / Tags

- Radius: `--radius-full` (999px)
- Padding: `4px 8px`
- Font: `--text-xs`, `font-weight: 500`, monospace
- Variants: filled (bg + text) or outline (border + text)

### Form Inputs

- Height: 36px (default), 44px (lg)
- Border: `1px solid var(--border)`
- Radius: `--radius-md` (4px)
- Focus: `outline: 2px solid var(--accent)`, `outline-offset: 2px`
- Error: `border-color: --error`
- Font: monospace, `--text-base` (13px)

### Navigation / Topbar

- Height: `54px` (default), `44px` (compact)
- Background: `--bg` with bottom border
- Logo: text `CLAWQUEST`, `text-base font-semibold`
- Active link: `border-b-2 border-foreground` (underline indicator, not bg fill)
- Auth buttons (Dashboard, User): `variant="outline"`, same size as primary CTAs
- Font: `--text-sm` (12-13px) for nav items

### Tabs (Quest Explore)

- Style: pill/chip with sliding indicator (`bg-foreground` behind active tab)
- Active tab: `text-background font-semibold` (inverted)
- Inactive tab: `text-muted-foreground`, hover: `text-foreground`
- Icons: MingCute — Fill variant for active, Line variant for inactive
- Radius: `--radius-base` on each tab button
- Animation: `transition-all duration-200 ease-out` on sliding indicator

### View Toggle

- Container: `border border-border p-0.5 rounded` with sliding indicator (`bg-accent`)
- Active button: `text-accent-foreground`
- Inactive button: `text-muted-foreground`, hover: `text-foreground`
- Each button has a Tooltip (shadcn) on hover
- Radius: `--radius-base` on buttons

---

## Layout

### Container

- Max width: `1100px` (via `.page-container`)
- Padding: `20px 24px`
- Centered with `margin: 0 auto`

### Responsive Breakpoints

3 supported breakpoints (mobile-first):

| Breakpoint | Tailwind | Width | Target |
|------------|----------|-------|--------|
| Mobile | default | < 640px | Phone (portrait) |
| Tablet | `md:` | >= 768px | Tablet / small laptop |
| Desktop | `xl:` | >= 1280px | Desktop / wide screens |

**Rules:**
- Write mobile-first: base styles = mobile, then `md:` for tablet, `xl:` for desktop
- Use `sm:` (640px) only for minor tweaks (show/hide elements), not as a primary breakpoint
- Container: `max-w-7xl` (1280px) centered with `mx-auto px-6`
- Avoid `lg:` and `2xl:` — keep breakpoints to 3 for consistency

**Pattern examples:**
```
// Stack on mobile, side-by-side on tablet, wider gaps on desktop
<div className="flex flex-col md:flex-row md:gap-4 xl:gap-6">

// Hide on mobile, show from tablet
<div className="hidden md:block">

// Full-width mobile, constrained on desktop
<div className="w-full xl:max-w-7xl xl:mx-auto">
```

### Grid

- Quest cards: responsive columns with gap `--space-4`
- Dashboard: compact card grid
- Mobile: sheet menu (not hamburger dropdown)

---

## Tailwind ↔ CSS Variable Mapping

All CSS variables mapped in `tailwind.config.js`. Use Tailwind classes in JSX.

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
| `input` | `--border` | `#d0d0d0` |
| `ring` | `--accent` | `#FF574B` |

### CSS Variable Source

All tokens defined in `apps/dashboard/src/index.css` `:root` block.
Tailwind mapping in `apps/dashboard/tailwind.config.js`.

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

## Accessibility Checklist

- [ ] Color contrast: minimum 4.5:1 for text, 3:1 for large text
- [ ] Focus rings: `2px solid var(--accent)`, `outline-offset: 2px`
- [ ] Touch targets: minimum 44x44px on mobile
- [ ] `aria-label` on icon-only buttons
- [ ] Tab order matches visual order
- [ ] `prefers-reduced-motion` respected (global rule in `index.css`)
- [ ] Semantic colors: never use color alone — pair with icon/text
- [ ] Success green (`--success`) used for rewards/status, not accent
