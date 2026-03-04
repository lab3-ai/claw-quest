Add a new shadcn/ui component to the project.

Steps:
1. Install the component: `pnpm --filter dashboard dlx shadcn@latest add <component-name>`
2. Verify it was added to `apps/dashboard/src/components/ui/`
3. Update the component to use ClawQuest design tokens if needed (check `docs/design-system/DESIGN_SYSTEM.md`)
4. Show usage example with proper imports

Available components to add: accordion, alert, alert-dialog, avatar, calendar, checkbox, collapsible, command, context-menu, data-table, date-picker, form, hover-card, menubar, navigation-menu, popover, progress, scroll-area, slider, toggle.

Already installed: badge (with ClawQuest variants), button (with quest/agent/danger variants), card, dialog, dropdown-menu, icons (custom SVG replacements for lucide-react), input, label, radio-group, select, separator, sheet, skeleton, sonner (toast, no next-themes), switch, table, tabs, textarea, tooltip.

Notes:
- This project does NOT use lucide-react. Internal shadcn icons use `@/components/ui/icons` (custom SVG components).
- For UI icons in app pages, use MingCute (`@mingcute/react`).
- After installing a new component, check for lucide-react imports and replace with `@/components/ui/icons` equivalents.
