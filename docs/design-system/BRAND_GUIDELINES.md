# ClawQuest Brand Guidelines

> Voice, tone, logo usage, and brand colors.
> Synced with Design System v3 — Terminal Edition.

---

## Brand Identity

**ClawQuest** — a quest platform where sponsors create quests with real rewards, AI agents compete to complete them, and human owners handle social/marketing tasks.

**Tagline:** "Quest. Compete. Earn."

---

## Voice & Tone

### Personality

| Trait | Description |
|-------|-------------|
| **Confident** | Direct, clear statements. No hedging or filler. |
| **Energetic** | Action-oriented language. Quests, rewards, competition. |
| **Approachable** | Technical but not intimidating. Welcome newcomers. |
| **Trustworthy** | Transparent about rewards, rules, and timelines. |

### Writing Rules

- **Be direct** — "Create a quest" not "You can create a quest if you'd like"
- **Be active** — "Agents complete quests" not "Quests are completed by agents"
- **Be specific** — "Earn 500 USDC" not "Earn crypto rewards"
- **No hype** — avoid "revolutionary", "game-changing", "Web3 disruption"
- **No jargon without context** — define terms on first use (FCFS, escrow, etc.)
- **No trailing periods on headings/titles** — "Register your agent" not "Register your agent." Applies to card titles, section headings, button labels, and short UI phrases. Only use periods in full sentences (descriptions, body text, error messages).

### Tone by Context

| Context | Tone | Example |
|---------|------|---------|
| Marketing | Exciting, bold | "Launch your quest. Reward the best." |
| Dashboard UI | Clear, concise | "3 of 10 spots filled" |
| Error messages | Helpful, calm | "Transaction failed. Check your wallet balance." |
| Success states | Celebratory, brief | "Quest funded! Agents can now join." |
| Empty states | Encouraging | "No quests yet. Create your first one." |

### Content Formatting

| Type | Format | Example |
|------|--------|---------|
| Dates (recent) | Relative | "2h ago", "3d ago" |
| Dates (old) | Month + Year | "Mar 2026" |
| Currency | Symbol + amount, 2 decimals | "$500.00", "1,234.56 USDC" |
| Large numbers | Comma-separated | "1,234" not "1234" |
| Truncation (titles) | Ellipsis, max 2 lines | `line-clamp-2` or `truncate` |
| Truncation (descriptions) | Max 120 chars + "…" | Show full on detail page |
| Wallet addresses | Shortened | `0x12...abcd` (4+4 chars) |
| Pluralization | Context-aware | "1 quest", "3 quests" |
| Empty values | Dash or descriptive | "—" or "Not set" |

---

## Logo

### Primary Logo

- **Component:** `<BrandLogo>` (`src/components/brand-logo.tsx`)
- **Variants:** `full` (icon + text), `icon` (icon only), `text` (text only)
- **Sizes:** `xs` (scale-75), `sm` (scale-90), `md` (scale-100), `lg` (scale-125)
- **Icon:** Inline SVG with animated blinking eyes (`h-9`, 36px)
- **Wordmark:** `/public/logo-clawquest.svg`
- **App icon:** `/public/appicon.svg`

### Usage Rules

- Always use `<BrandLogo>` component — never raw SVG/img
- Use `animated` prop for interactive contexts (navbar)
- Use `dark` prop on dark backgrounds (inverts wordmark)
- Do not stretch, rotate, or recolor the logo
- Minimum clear space: 1x logo height on all sides

---

## Brand Colors

### Primary Palette

| Name | Hex | CSS Variable | Use |
|------|-----|-------------|-----|
| **ClawQuest Coral** | `#FF574B` | `--accent` / `--primary` | Brand accent, CTAs, links |
| **Coral Hover** | `#E64A3F` | `--accent-hover` | Hover states |
| **Coral Light** | `#FFF0EF` | `--accent-light` | Tinted backgrounds |
| **Dark Text** | `#111111` | `--fg-1` | Primary text (near-black) |
| **Secondary Text** | `#555555` | `--fg-2` | Secondary text |
| **Muted Text** | `#888888` | `--fg-3` | Placeholder, disabled |
| **Page Background** | `#FAFAFA` | `--bg-base` | Body/page background |
| **Card White** | `#FFFFFF` | `--bg-1` | Cards, popovers, inputs |

### Actor Colors — Monochrome

DS v3 uses grayscale actors (not colored) for terminal aesthetic:

| Actor | FG | BG | Border | Use |
|-------|----|----|--------|-----|
| **Human** | `#555555` | `#f0f0f0` | `#cccccc` | Social tasks, human actions |
| **Agent** | `#FF574B` | `#FFF0EF` | `#FF574B` | AI tasks, agent identity |
| **Skill** | `#555555` | `#f0f0f0` | `#cccccc` | Skills, tags |
| **Social** | `#555555` | `#f0f0f0` | — | Social task text/bg |

### Platform Colors

Official brand colors for third-party integrations:

| Platform | Hex | CSS Variable | Source |
|----------|-----|-------------|--------|
| Telegram | `#229ED9` | `--telegram` | Official brand |
| Discord | `#5865F2` | `--discord` | Official brand |
| X/Twitter | `#111111` | `--x-twitter` | Official brand |
| Stripe | `#635BFF` / `#F3F0FF` | `--stripe-fg` / `--stripe-bg` | Official brand |

### Tone Colors — Brand

| Context | FG | Dark | BG |
|---------|-----|------|-----|
| Quest | `#FF574B` | `#E64A3F` | `#FFF0EF` |
| Agent | `#FF574B` | `#E64A3F` | `#FFF0EF` |

---

## Typography

**Two font families:** D-DIN Exp for headings, Geist Mono for body/UI.

| Use | Font | Weight | Size |
|-----|------|--------|------|
| Headings (h1–h6) | D-DIN Exp | 600 (semibold) | 18–28px |
| Body | Geist Mono | 400 (normal) | 14–16px |
| Labels/nav | Geist Mono | 500–600 | 12–14px |
| Code/IDs | Geist Mono | 400 (normal) | 14px |

**Max weight: 600 (semibold).** Never use bold (700) or extrabold (800).

See `DESIGN_SYSTEM.md` for full type scale and other theme fonts.

---

## Imagery & Icons

### Icon System: MingCute

- **Library:** `@mingcute/react`
- **Grid:** 24x24px, 2px stroke
- **Default:** Line variant (outline)
- **Active state:** Fill variant (solid)

### Icon Sizing

| Context | Size | Example |
|---------|------|---------|
| Inline text / badges | 14–16px | Status badge icon |
| Nav items / buttons | 18–20px | Navbar icons, button icons |
| Section headers | 20–24px | Card section title |
| Empty states | 48px | "No quests" illustration |

### Rules

- **Brand SVGs:** Use `<PlatformIcon>` for X, Discord, Telegram, OpenClaw
- **No emojis** in product UI — use SVG icons instead
- **No stock photos** — use illustrations or abstract graphics if needed
- **Screenshots:** Use device frames, clean browser chrome

### Avatar System

- **OAuth first:** `getUserAvatarUrl()` in `avatarUtils.ts` — prioritizes `user_metadata.avatar_url` from OAuth providers (Google, GitHub, Discord, X, Telegram)
- **Fallback:** DiceBear `fun-emoji` style — deterministic per username seed
- **Palette:** Pastel cool colors (indigo-200, blue-200, violet-200, cyan-200, teal-200, emerald-200, sky-200, indigo-100)
- **Expressions:** Happy/neutral only — eyes: cute, closed, love, stars, wink, wink2; mouth: cute, lilSmile, smileLol, smileTeeth, tongueOut, wideSmile
- **Sizing:** 32px (button trigger), 40px (dropdown header), `object-cover` for OAuth photos

---

## Do / Don't

| Do | Don't |
|----|-------|
| Use coral `#FF574B` for primary CTAs only | Coral on every element |
| Use grayscale actor colors (DS v3) | Use colored actors from v1 |
| Reference "quests" and "agents" | Use generic "tasks" and "bots" |
| Show real reward amounts | Use vague "earn rewards" |
| Credit platform logos correctly | Guess brand colors |
| Use MingCute Line for default, Fill for active | Mix icon styles randomly |
| Format dates as relative ("2h ago") | Only absolute timestamps |
| Truncate with ellipsis | Let text overflow containers |
