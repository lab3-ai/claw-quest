Redesign a page following the ClawQuest design system v2.

Steps:
1. Read the current page file specified by the user
2. Read `docs/design-system.md` for tokens, components, and guidelines
3. Read `docs/ui-patterns.md` for layout patterns and interaction rules
4. Read `docs/accessibility.md` for a11y requirements

Then:
- Replace plain CSS classes with Tailwind utilities
- Replace Lucide icons with MingCute (`@mingcute/react`) — Line for default, Fill for active
- Use shadcn/ui components where applicable (Button, Card, Badge, Dialog, etc.)
- Apply design system tokens (colors, spacing, typography, shadows, radius)
- Ensure responsive behavior (mobile-first: 1 col → 2 col → 3 col)
- Add proper ARIA attributes and keyboard navigation
- Add loading states (skeleton) and empty states
- Add error handling with user-friendly messages

After implementation:
- Run `pnpm --filter dashboard build` to check for compile errors
- Preview the result and take a screenshot for user review
