# Project Memory

> Purpose: High-level context, tribal knowledge, and philosophical alignments.
> **For full current status → see `docs/PROJECT_STATUS.md`**
> **For Cowork session prompts → see `docs/COWORK_PROMPTS.md`**
> **Last updated: 2026-03-03 (v0.11.0 with Telegram OIDC + Social Validation)**

---

## 🧠 Core Beliefs
1. **Simplicity over Complexity**: `docker-compose` over Kubernetes at this stage.
2. **Type Safety is Non-Negotiable**: If it's not in Zod/TypeScript, it doesn't exist.
3. **Mobile First (Logic)**: Most users interact via Telegram — API must be chat-friendly.

## 🚫 Things to Avoid
- **Microservices**: Keep it Monolithic (Modulith) for now. One API service.
- **ORM Magic**: Use Prisma, but be wary of N+1. Prefer `findMany` over loop queries.
- **Premature Optimization**: Don't shard the DB yet.
- **Tailwind**: Dashboard uses plain CSS with design system variables.
- **npm/yarn**: Use `pnpm` exclusively.

## 📝 Key Agreements
- All timestamps are stored in UTC.
- All IDs are UUID v4.
- CSS variables: `--fg`, `--fg-muted`, `--border`, `--border-heavy`, `--link`, `--accent`, `--sidebar-bg`
- Auth token: `session?.access_token` from `useAuth()` context → `Authorization: Bearer <token>`
- Page-specific CSS: `src/styles/pages/[name].css`, imported at the top of the component file
- SVG brand icons: use `<PlatformIcon name="..." size={N} colored />` from `@/components/PlatformIcon`

## 📚 Recently Completed (v0.10.0 – v0.11.0)

- **v0.11.0**: Telegram OIDC login, social account linking, social task validation (X/Discord/Telegram)
- **v0.10.0**: Escrow mainnet integration (testnet/mainnet network mode switching)
- **v0.9.0**: Quest draft flow with localStorage, publish validator, reward distribution calculator

## 🗺 Docs Index
| File | Purpose |
|---|---|
| `PROJECT_STATUS.md` | Single source of truth — completed pages, file map, API, DB schema |
| `CHANGELOG.md` | Version history with feature details |
| `ARCHITECTURE.md` | System architecture, data flows, deployment strategy |
| `API.md` | High-level API overview (see developers/api-reference/ for detailed endpoints) |
| `DB_SCHEMA.md` | Prisma schema documentation + distribution calculator API |
| `PLAN_TASK1_FRONTEND.md` | Frontend remaining work: Agent Detail, Manage, Toast, Mobile |
| `PLAN_TASK2_TELEGRAM.md` | Telegram bot registration flow + /quests /accept commands |
| `PLAN_TASK3_SKILL.md` | ClawQuest MCP skill for ClawHub submission |
| `COWORK_PROMPTS.md` | Ready-to-paste prompts for Cowork parallel sessions |
| `PRODUCT_SPEC.md` | Original product vision |
