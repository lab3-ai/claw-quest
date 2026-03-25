---
name: Use numbered design tokens
description: Prefer project's numbered color tokens (bg-1/2/3, fg-1/2/3, border, border-2) over shadcn/Tailwind defaults
type: feedback
---

Use the project's numbered design token palette instead of shadcn defaults or raw Tailwind colors.

**Token system:**
- Backgrounds: `bg-1` (base), `bg-2` (elevated), `bg-3` (subtle/muted)
- Foreground/text: `fg-1` (primary), `fg-2` (secondary), `fg-3` (tertiary/muted)
- Borders: `border` (default), `border-2` (stronger)
- Semantic: `text-success`, `text-error`, `text-warning`, `text-primary`

**Why:** The project uses CSS variable-based numbered tokens for consistent theming across light/dark modes. Using shadcn defaults (`bg-muted`, `text-muted-foreground`) or raw Tailwind (`bg-gray-100`, `text-zinc-500`) bypasses the design system and breaks theme consistency.

**How to apply:** When styling components, reach for `bg-1/2/3`, `fg-1/2/3`, `border/border-2` first. Only use semantic colors (`text-success`, `text-error`) for their intended purpose. Avoid `bg-muted`, `text-foreground` from shadcn when a numbered token exists.
