---
name: update-ds
description: Update DESIGN_SYSTEM.md and UI_PATTERNS.md to sync with actual code. Use when user says "update ds", "update design system", "sync ds".
allowed-tools: Read, Write, Edit, Grep, Glob
---

Update `docs/design-system/DESIGN_SYSTEM.md` and `docs/design-system/UI_PATTERNS.md` to sync with actual code.

**Source of truth:** `apps/dashboard/src/index.css` (`:root` block + `@theme` block)

## Steps

1. **Read source of truth:**
   - Read `apps/dashboard/src/index.css` — extract all CSS variable values from `:root` block
   - Read `apps/dashboard/src/styles/themes/terminal.css` — extract dark mode overrides

2. **Read current docs:**
   - Read `docs/design-system/DESIGN_SYSTEM.md`
   - Read `docs/design-system/UI_PATTERNS.md`

3. **Cross-check tokens** — compare every hex/value in docs against actual CSS. Flag mismatches:
   - Colors (bg, fg, border, accent, semantic, actor, platform, tone)
   - Typography (font stacks, sizes)
   - Spacing, radius, shadows, animation, z-index

4. **Cross-check components** — scan actual component files for current styles:
   - `apps/dashboard/src/components/ui/card.tsx` — card border, hover, bg
   - `apps/dashboard/src/components/ui/badge.tsx` — badge variants
   - `apps/dashboard/src/components/ui/button.tsx` — button variants, sizes
   - Check any file path provided as argument

5. **Check consistency between docs:**
   - No duplicate specs between DESIGN_SYSTEM.md and UI_PATTERNS.md
   - DESIGN_SYSTEM = tokens + visual specs (WHAT). UI_PATTERNS = patterns + behavior (HOW)
   - Cross-refs in place, no contradictions

6. **Apply fixes** — update docs to match code. Report changes made.

## Rules
- DESIGN_SYSTEM.md owns: tokens, color tables, typography, spacing, radius, shadows, animation, z-index, Tailwind mapping, theme system, iconography, component visual specs
- UI_PATTERNS.md owns: page layouts, component patterns (quest card, empty/loading/error states), interaction rules, do/don't, responsive behavior
- Never duplicate the same spec in both files
- If a value conflict is found between docs and code, code wins
- Respond in Vietnamese
