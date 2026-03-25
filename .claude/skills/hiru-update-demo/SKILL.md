---
name: update-demo
description: Update /concepts/demo pages to reflect design system changes from current session. Use when user says "update demo", "sync demo", "update demo pages".
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

Update the design system demo pages (`/concepts/demo/*`) to reflect any changes made during the current session.

**Demo pages location:** `apps/dashboard/src/routes/concepts.demo.*.tsx`

## Current Demo Pages

| Route | File | Shows |
|-------|------|-------|
| `/concepts/demo` | `concepts.demo.index.tsx` | Demo index — links to all demo pages |
| `/concepts/demo/buttons` | `_public/concepts.demo.buttons.tsx` | Button variants, sizes, colors |
| `/concepts/demo/typography` | `concepts.demo.typography.tsx` | Font families, sizes, weights |
| `/concepts/demo/badges` | `concepts.demo.badges.tsx` | Badge variants (semantic, pill, filled, outline, count) |
| `/concepts/demo/colors` | `concepts.demo.colors.tsx` | Design tokens resolved from current theme |

## Steps

1. **Identify session changes** — check what was modified this session:
   - `git diff --name-only` to see changed files
   - Focus on: `index.css`, `terminal.css`, component files (`button.tsx`, `badge.tsx`, `card.tsx`, `brand-logo.tsx`, `theme-switcher.tsx`)

2. **Read affected demo pages** — only read demos that relate to changed components/tokens

3. **Cross-check demos against code:**
   - **Colors demo**: verify all token groups (bg-base→bg-4, fg-1→fg-4, border, accent, semantic, actor, platform, tone, dark surfaces) are shown
   - **Typography demo**: verify font families, size scale, weights match `index.css`
   - **Badges demo**: verify all badge variants from `badge.tsx` are demonstrated (especially count variants)
   - **Buttons demo**: verify all button variants/sizes from `button.tsx` are shown
   - **Index page**: verify all demo cards listed, links correct

4. **Apply fixes** — update demo pages to show new/changed tokens, variants, or components

5. **Check router** — if new demo pages added, verify they're registered in `router.tsx`

6. **Build check** — run `pnpm --filter dashboard build` to verify no errors

## Rules
- Demo pages are for visual verification — show real rendered components, not just text
- Each token/variant should be visible and labeled
- Use grid layouts for compact comparison
- Group related items (e.g., all bg tokens together, all count badge variants together)
- If a new component category was added (e.g., cards, inputs), suggest creating a new demo page
- Respond in Vietnamese
