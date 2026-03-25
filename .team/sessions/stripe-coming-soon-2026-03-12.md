# Session: 2026-03-12 — Stripe Coming Soon

## Task
- Implemented "Coming Soon" for all Stripe: API returns 400 for every `/stripe/*` request; FE disables all Stripe actions and shows tooltip/text "Coming Soon".

## Files changed
- apps/api/src/modules/stripe/stripe.routes.ts (modified — onRequest hook 400)
- apps/dashboard/src/main.tsx (modified — TooltipProvider at root)
- apps/dashboard/src/routes/_authenticated/quests/$questId/fund.tsx (modified — disabled Pay with Card + tooltip)
- apps/dashboard/src/routes/_authenticated/quests/create-quest/StepReward.tsx (modified — disabled Fiat pill + tooltip)
- apps/dashboard/src/routes/_authenticated/quests/create-quest/StepPreview.tsx (modified — disabled fiat Pay button + tooltip)
- apps/dashboard/src/routes/_authenticated/stripe-connect.tsx (modified — banner, disabled buttons + tooltip; removed unused dashboard mutation)
- apps/dashboard/src/routes/_authenticated/quests/$questId/manage.tsx (modified — when fiat-funded, disabled Distribute/Refund + tooltip)
- apps/dashboard/src/routes/_authenticated/account.tsx (modified — FiatPayoutSection buttons disabled + tooltip; removed unused dashboard mutation)
- apps/dashboard/src/routes/_authenticated/github-bounties/mine.tsx (modified — disabled Fund for USD + tooltip)
- apps/dashboard/src/routes/_authenticated/quests/$questId/fund-success.tsx (modified — handle 400 Coming Soon, show friendly message)
- docs/CHANGELOG.md (modified — v0.15.1 entry)

## Notes
- Stripe webhook and all other Stripe routes now short-circuit with 400 before any handler runs.
- Re-enabling Stripe later: remove the onRequest hook in stripe.routes.ts and re-enable buttons (and restore dashboard mutation in account + stripe-connect if desired).

## Next
- None for this task.
