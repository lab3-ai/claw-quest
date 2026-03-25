---
status: completed
created: 2026-03-02
completed: 2026-03-02
branch: main
brainstorm: plans/reports/brainstorm-260302-1248-quest-save-draft-flow.md
---

# Quest Save Draft Flow — Backend & API Integration

## Summary

Improve quest draft creation by: relaxing validation (only title required), adding missing DB fields (`network`, `drawTime`, `rewardAmount` default), localStorage form persistence, and publish validation gate (frontend + backend).

## Key Decisions

- LocalStorage persistence only (no auto-save to server)
- Manual Save Draft button to create/update on server
- Only `title` required for draft, full validate on `draft→live`
- Keep existing My Quests filter tabs, improve draft card UI
- `rewardAmount` stays `Int` (whole tokens), default 0

## Phases

| # | Phase | Status | Priority | Effort | Depends |
|---|-------|--------|----------|--------|---------|
| 1 | [DB Migration](./phase-01-db-migration.md) | completed | high | small | — |
| 2 | [Shared Schema + API](./phase-02-shared-schema-api.md) | completed | high | medium | 1 |
| 3 | [Frontend Draft Flow](./phase-03-frontend-draft-flow.md) | completed | high | medium | 2 |

## File Ownership Matrix

| Phase | Creates | Modifies |
|-------|---------|----------|
| 1 | migration SQL | `schema.prisma` |
| 2 | `quests.publish-validator.ts` | `packages/shared/src/index.ts`, `quests.routes.ts`, `quests.service.ts` |
| 3 | `use-draft-persistence.ts` | `create.tsx`, `dashboard.tsx`, `create-quest.css`, `dashboard.css` |

## Architecture

```
Frontend                          API                           DB
─────────                         ───                           ──
localStorage ←→ Form State
Save Draft → POST/PATCH /quests → skip task validation       → Quest row
                (relaxed)         if status='draft'             rewardAmount=0 ok
Publish    → validate locally
           → PATCH /status     → FULL validation              → status='live'
             { status: 'live' }   (title, desc, reward,
                                   tasks, dates)
```
