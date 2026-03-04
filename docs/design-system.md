# ClawQuest Design System v2

> Modern Tech style — clean, professional with tech/gaming energy.
> Reference for all UI/UX implementation across the dashboard.

---

## Tech Stack

| Layer | Tool | Notes |
|-------|------|-------|
| **Styling** | Tailwind CSS | Primary styling method — utility-first |
| **Components** | shadcn/ui (Radix UI) | Expand beyond current 5 — add Dialog, Dropdown, Tabs, Skeleton, etc. |
| **Icons** | MingCute (`@mingcute/react`) | 24x24 grid, 2px stroke, outline + filled styles |
| **Brand icons** | Custom `<PlatformIcon>` | Keep for X, Discord, Telegram, OpenClaw SVGs |
| **Fonts** | Space Grotesk + DM Sans | Google Fonts import |

### Icon Usage

```tsx
import { SearchLine, HomeFill, Trophy2Line } from '@mingcute/react'

// Default: 24px, currentColor
<SearchLine />

// Custom size + color
<Trophy2Line size={20} color="var(--accent)" />
```

Naming convention: `{Name}{Style}` where Style = `Line` (outline) or `Fill` (filled).
Prefer `Line` (outline) for UI, `Fill` for active/selected states.

---

## Philosophy

**Like Linear meets Galxe** — professional SaaS clarity with quest/gaming personality.
Clean layouts, purposeful animations, bold accent color, clear information hierarchy.

Principles:
1. **Clarity first** — every element earns its place
2. **Consistent rhythm** — spacing, sizing, colors follow a scale
3. **Purposeful motion** — animations convey meaning, not decoration
4. **Actor identity** — humans (pink), agents (blue), quests (orange) always distinguishable

---

## Typography

**Font stack:** Space Grotesk (headings) + DM Sans (body)

```css
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');
```

### Scale

| Token | Size | Weight | Font | Use |
|-------|------|--------|------|-----|
| `--text-xs` | 11px | 400 | DM Sans | Captions, timestamps |
| `--text-sm` | 13px | 400 | DM Sans | Secondary text, labels |
| `--text-base` | 15px | 400 | DM Sans | Body text |
| `--text-md` | 16px | 500 | DM Sans | Emphasis, nav links |
| `--text-lg` | 18px | 600 | Space Grotesk | Section titles |
| `--text-xl` | 22px | 600 | Space Grotesk | Card headings |
| `--text-2xl` | 28px | 700 | Space Grotesk | Page titles |
| `--text-3xl` | 36px | 700 | Space Grotesk | Hero headings |
| `--text-mono` | 13px | 400 | Fira Code / monospace | Code, hashes, IDs |

### Line heights

- Body text: `1.6`
- Headings: `1.3`
- Compact (tables, badges): `1.2`

### Max line width

- Prose/descriptions: `65ch` (~600px)
- Full-width tables/cards: no limit

---

## Color Palette

### Core

| Token | Hex | Use |
|-------|-----|-----|
| `--bg` | `#FFFFFF` | Page background |
| `--bg-subtle` | `#F8FAFC` | Sidebar, card hover, section bg |
| `--bg-muted` | `#F1F5F9` | Disabled bg, skeleton loading |
| `--fg` | `#0F172A` | Primary text (slate-900) |
| `--fg-secondary` | `#475569` | Secondary text (slate-600) |
| `--fg-muted` | `#94A3B8` | Placeholder, disabled text (slate-400) |
| `--border` | `#E2E8F0` | Card borders, dividers (slate-200) |
| `--border-heavy` | `#CBD5E1` | Active borders, focus (slate-300) |

### Brand / Accent

| Token | Hex | Use |
|-------|-----|-----|
| `--accent` | `#F97316` | Primary CTA, brand orange (orange-500) |
| `--accent-hover` | `#EA580C` | CTA hover state (orange-600) |
| `--accent-light` | `#FFF7ED` | Orange tinted backgrounds (orange-50) |
| `--accent-border` | `#FDBA74` | Orange borders (orange-300) |

### Semantic

| Token | Hex | Use |
|-------|-----|-----|
| `--success` | `#16A34A` | Completed, funded, online (green-600) |
| `--success-light` | `#F0FDF4` | Success bg (green-50) |
| `--success-border` | `#86EFAC` | Success borders (green-300) |
| `--error` | `#DC2626` | Errors, failed, cancelled (red-600) |
| `--error-light` | `#FEF2F2` | Error bg (red-50) |
| `--error-border` | `#FCA5A5` | Error borders (red-300) |
| `--warning` | `#D97706` | Caution, expiring soon (amber-600) |
| `--warning-light` | `#FFFBEB` | Warning bg (amber-50) |
| `--warning-border` | `#FCD34D` | Warning borders (amber-300) |
| `--info` | `#2563EB` | Info, links (blue-600) |
| `--info-light` | `#EFF6FF` | Info bg (blue-50) |

### Actor Colors

| Actor | FG | BG | Border | Use |
|-------|----|----|--------|-----|
| Human | `#BE185D` | `#FCE7F3` | `#F9A8D4` | Human tasks, social tasks |
| Agent | `#2563EB` | `#EFF6FF` | `#BFDBFE` | Agent tasks, AI agents |
| Quest | `#F97316` | `#FFF7ED` | `#FDBA74` | Quest cards, rewards |
| Skill | `#059669` | `#D1FAE5` | `#6EE7B7` | Skills, tags |

### Platform Colors

| Platform | Color | Use |
|----------|-------|-----|
| Stripe | `#635BFF` | Payment badges |
| Telegram | `#229ED9` | TG link/badge |
| Discord | `#5865F2` | Discord link/badge |
| X/Twitter | `#0F1419` | X link/badge |

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

| Token | Value | Use |
|-------|-------|-----|
| `--radius-sm` | `6px` | Badges, tags, small elements |
| `--radius-md` | `8px` | Buttons, inputs, small cards |
| `--radius-lg` | `12px` | Cards, modals, dropdowns |
| `--radius-xl` | `16px` | Large cards, featured items |
| `--radius-full` | `9999px` | Avatars, pills, toggles |

---

## Shadows

| Token | Value | Use |
|-------|-------|-----|
| `--shadow-xs` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle depth (badges) |
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)` | Cards at rest |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.08)` | Cards on hover, dropdowns |
| `--shadow-lg` | `0 8px 24px rgba(0,0,0,0.12)` | Modals, floating panels |
| `--shadow-accent` | `0 4px 14px rgba(249,115,22,0.25)` | CTA button hover glow |

---

## Animation

| Token | Value | Use |
|-------|-------|-----|
| `--duration-fast` | `100ms` | Hover color changes |
| `--duration-base` | `200ms` | Most transitions |
| `--duration-slow` | `300ms` | Modals, overlays |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Enter animations |
| `--ease-in-out` | `cubic-bezier(0.45, 0, 0.55, 1)` | Symmetric transitions |

### Rules

- All interactive elements: `transition: all var(--duration-base) var(--ease-out)`
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
| **Primary** | `bg: --accent`, white text, `--radius-md` | Main CTA (Create Quest, Accept, Fund) |
| **Secondary** | `bg: transparent`, `border: --border`, `--fg` text | Cancel, Back, secondary actions |
| **Ghost** | No border, no bg, `--fg-secondary` text | Tertiary actions, icon buttons |
| **Danger** | `bg: --error`, white text | Delete, Leave, destructive |
| **Actor** | Quest=orange, Agent=blue, Human=pink bg | Actor-specific CTAs |

Sizing: `sm` (32px h), `md` (40px h), `lg` (48px h)

All buttons: `cursor: pointer`, `font-weight: 500`, `transition: all 200ms`

### Cards

- Background: `--bg` (white)
- Border: `1px solid var(--border)`
- Radius: `--radius-lg` (12px)
- Padding: `--space-5` (20px)
- Hover: `--shadow-md` + subtle border darken
- Active/selected: `border-color: --accent`

### Badges / Tags

- Radius: `--radius-sm` (6px)
- Padding: `4px 8px`
- Font: `--text-xs`, `font-weight: 500`
- Variants: filled (bg + text) or outline (border + text)

Status badges:
| Status | BG | FG |
|--------|----|----|
| Live | `--success-light` | `--success` |
| Scheduled | `--info-light` | `--info` |
| Draft | `--bg-muted` | `--fg-muted` |
| Completed | `--bg-subtle` | `--fg-secondary` |
| Cancelled | `--error-light` | `--error` |
| Expired | `--warning-light` | `--warning` |

### Form Inputs

- Height: 40px (md), 48px (lg)
- Border: `1px solid var(--border)`
- Radius: `--radius-md` (8px)
- Focus: `border-color: --accent`, `box-shadow: 0 0 0 3px rgba(249,115,22,0.15)`
- Error: `border-color: --error`
- Label: `--text-sm`, `font-weight: 500`, `--fg`

### Tables

- Header: `--bg-subtle`, `--text-sm`, `font-weight: 600`, uppercase optional
- Row hover: `--bg-subtle`
- Cell padding: `--space-3` vertical, `--space-4` horizontal
- Border: bottom only, `--border`
- Sticky header on scroll

### Navigation / Topbar

- Height: `56px`
- Background: `--bg` with subtle bottom border
- Logo + nav links (left), auth/user menu (right)
- Active link: `--accent` color, `font-weight: 600`
- Mobile: hamburger menu at < 768px

---

## Layout

### Breakpoints

| Name | Width | Use |
|------|-------|-----|
| `sm` | 640px | Mobile landscape |
| `md` | 768px | Tablet |
| `lg` | 1024px | Desktop |
| `xl` | 1280px | Wide desktop |
| `2xl` | 1440px | Large screens |

### Container

- Max width: `1200px` (content area)
- Padding: `--space-4` on mobile, `--space-8` on desktop
- Centered with `margin: 0 auto`

### Grid

- Quest cards: 3 columns (desktop), 2 (tablet), 1 (mobile)
- Dashboard: Bento grid with flexible card sizes
- Gap: `--space-4` to `--space-6`

---

## Icon System

- **Primary set**: MingCute (`@mingcute/react`) — 24x24 grid, 2px stroke
- **Brand icons**: Custom `<PlatformIcon>` for X, Discord, Telegram, OpenClaw, etc.
- **Sizes**: `16` (inline text), `18` (buttons), `20` (nav), `24` (standalone)
- **Style**: `Line` (outline) default, `Fill` for active/selected states
- **Color**: `currentColor` (inherits from parent)
- **No emojis** in UI — always use SVG icons

---

## Accessibility Checklist

- [ ] Color contrast: minimum 4.5:1 for text, 3:1 for large text
- [ ] Focus rings: visible on all interactive elements (`3px --accent` outline)
- [ ] Touch targets: minimum 44x44px on mobile
- [ ] Alt text on all meaningful images
- [ ] `aria-label` on icon-only buttons
- [ ] Tab order matches visual order
- [ ] Form labels linked with `for` attribute
- [ ] `prefers-reduced-motion` respected
- [ ] Error messages near the problem field
- [ ] No color-only indicators (always pair with icon/text)
