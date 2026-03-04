Review the current page/component for design system compliance.

Check against:
1. Read `docs/design-system.md` — verify colors, typography, spacing, shadows match tokens
2. Read `docs/ui-patterns.md` — verify layout patterns, interaction rules, do/don't
3. Read `docs/brand-guidelines.md` — verify voice/tone, brand colors, icon usage
4. Read `docs/accessibility.md` — verify a11y standards (contrast, ARIA, keyboard, touch targets)

For each file mentioned above, list violations as:
- **[DESIGN]** Design system violations (wrong color, spacing, font)
- **[PATTERN]** UI pattern violations (wrong layout, missing states)
- **[BRAND]** Brand guideline violations (wrong tone, logo misuse)
- **[A11Y]** Accessibility violations (contrast, ARIA, keyboard)

If the user provides a file path, review that specific file. Otherwise, ask which page/component to review.

Output a brief report with specific line numbers and suggested fixes.
