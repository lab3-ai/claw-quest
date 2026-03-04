Redesign a page following the ClawQuest design system v2.

Steps:
1. Read the current page file specified by the user
2. Read `docs/design-system/DESIGN_SYSTEM.md` for tokens, components, and guidelines
3. Read `docs/design-system/UI_PATTERNS.md` for layout patterns and interaction rules
4. Read `docs/design-system/ACCESSIBILITY.md` for a11y requirements

Then:
- Replace plain CSS classes with Tailwind utilities (use design tokens mapped in `tailwind.config.js`)
- Use MingCute (`@mingcute/react`) for UI icons — Line for default, Fill for active
- For internal component icons (close, check, chevron), use `@/components/ui/icons`
- Use shadcn/ui components: `<Button>` (variants: default/secondary/outline/ghost/quest/agent/danger), `<Badge>` (variants: fcfs/leaderboard/luckydraw/live/draft/completed/pending/etc.), Card, Dialog, Sheet, DropdownMenu, Select, Tabs, Table, etc.
- Use `<Button asChild>` pattern when wrapping `<Link>` or `<a>` elements
- Apply design system tokens (colors, spacing, typography, shadows, radius)
- Ensure responsive behavior (mobile-first: 1 col → 2 col → 3 col)
- Add proper ARIA attributes and keyboard navigation
- Add loading states (skeleton) and empty states
- Add error handling with user-friendly messages
- Remove corresponding CSS file from `src/styles/` and its import from `main.tsx` once fully migrated

After implementation:
- Run `pnpm --filter dashboard build` to check for compile errors
- Start preview server (`preview_start` → dashboard) and verify visually
- Check console for errors, take screenshot for user review
