---
name: update-ds
description: Update all design system docs (DESIGN_SYSTEM, UI_PATTERNS, ACCESSIBILITY, BRAND_GUIDELINES) to sync with actual code. Use when user says "update ds", "update design system", "sync ds".
allowed-tools: Read, Write, Edit, Grep, Glob
---

Update all docs in `docs/design-system/` to sync with actual code changes from the current session.

**Source of truth:** `apps/dashboard/src/index.css` (`:root` block + `@theme` block)

## Target Files

| Doc | Owns |
|-----|------|
| `DESIGN_SYSTEM.md` | Tokens, color tables, typography, spacing, radius, shadows, animation, z-index, Tailwind mapping, theme system, iconography, component visual specs |
| `UI_PATTERNS.md` | Page layouts, component patterns (quest card, empty/loading/error states), interaction rules, do/don't, responsive behavior |
| `ACCESSIBILITY.md` | Contrast ratios, keyboard nav, ARIA rules, touch targets, focus styles |
| `BRAND_GUIDELINES.md` | Voice/tone, logo usage, brand colors, actor/platform colors, typography summary |

## Steps

1. **Read source of truth:**
   - Read `apps/dashboard/src/index.css` — extract all CSS variable values from `:root` block
   - Read `apps/dashboard/src/styles/themes/terminal.css` — extract dark mode overrides

2. **Read current docs:**
   - Read `docs/design-system/DESIGN_SYSTEM.md`
   - Read `docs/design-system/UI_PATTERNS.md`
   - Read `docs/design-system/ACCESSIBILITY.md`
   - Read `docs/design-system/BRAND_GUIDELINES.md`

3. **Cross-check tokens** — compare every hex/value in docs against actual CSS. Flag mismatches:
   - Colors (bg-base, bg, fg, border, accent, semantic, actor, platform, tone)
   - Typography (font stacks, sizes)
   - Spacing, radius, shadows, animation, z-index

4. **Cross-check components** — scan actual component files for current styles:
   - `apps/dashboard/src/components/ui/card.tsx` — card border, hover, bg
   - `apps/dashboard/src/components/ui/badge.tsx` — badge variants
   - `apps/dashboard/src/components/ui/button.tsx` — button variants, sizes
   - `apps/dashboard/src/components/brand-logo.tsx` — logo component, variants, sizes
   - `apps/dashboard/src/components/theme-switcher.tsx` — theme toggle behavior
   - `apps/dashboard/src/routes/_public.tsx` — topbar, nav, footer
   - Check any file path provided as argument

5. **Cross-check ACCESSIBILITY.md:**
   - Verify contrast ratio table uses correct bg/fg hex values from actual CSS
   - Check dark mode bg values match terminal.css (bg-base, bg-1, etc.)
   - Verify focus ring spec matches index.css

6. **Cross-check BRAND_GUIDELINES.md:**
   - Verify brand color hex values match CSS variables
   - Verify token names use current naming (--fg-1 not --fg, --bg-base not --bg)
   - Verify logo section matches `<BrandLogo>` component
   - Verify typography mentions both D-DIN Exp (headings) and Geist Mono (body)

7. **Check consistency between docs:**
   - No duplicate specs across any of the 4 files
   - DESIGN_SYSTEM = tokens + visual specs (WHAT)
   - UI_PATTERNS = patterns + behavior (HOW)
   - ACCESSIBILITY = a11y standards + contrast verification
   - BRAND_GUIDELINES = brand identity + voice + logo rules
   - Cross-refs in place, no contradictions

8. **Apply fixes** — update docs to match code. Report changes made.

## Rules
- Never duplicate the same spec in multiple files
- If a value conflict is found between docs and code, **code wins**
- When updating contrast tables in ACCESSIBILITY.md, recalculate ratios if hex values changed
- Respond in Vietnamese
