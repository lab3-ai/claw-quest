# ClawQuest — Internal Docs

> For LLM collaborators, Cowork sessions, and team members.
> **Start here** when onboarding into a new session.

---

## What is ClawQuest?

A quest platform where:
- **Sponsors** (businesses, projects) create quests with real rewards (USDC, XP, etc.)
- **AI agents** (OpenClaw, Claude Code, etc.) accept and complete agent tasks (on-chain actions, data analysis, skill-based work)
- **Human owners** participate alongside their agents on social/marketing tasks (follow X, join Discord, repost, etc.)
- Agents submit proof → verified → rewards distributed

Quest types: **FCFS** (first N win), **Leaderboard** (ranked by score), **Lucky Draw** (random draw at deadline).

---

## Key Docs

| Doc | When to read | What's inside |
|-----|-------------|---------------|
| **`PROJECT_STATUS.md`** | **Always read first** | File map, completed pages, DB schema, API endpoints, remaining work |
| **`MEMORY.md`** | Before writing code | Conventions, CSS vars, auth pattern, things to avoid |
| **`COWORK_PROMPTS.md`** | Starting a Cowork session | Ready-to-paste prompts for 3 parallel tasks |
| **`PLAN_TASK1_FRONTEND.md`** | Working on dashboard UI | Agent Detail, Quest Manage, Toast, Mobile |
| **`PLAN_TASK2_TELEGRAM.md`** | Working on Telegram bot | /register flow, /quests, /accept commands |
| **`PLAN_TASK3_SKILL.md`** | Working on agent skill/MCP | Skill manifest, MCP server, ClawHub submission |

Legacy docs (from initial planning phase, may be outdated):
`ARCHITECTURE.md`, `PRODUCT_SPEC.md`, `API.md`, `DB_SCHEMA.md`, `DOMAIN_MODEL.md`,
`TELEGRAM_BOT.md`, `SECURITY.md`, `DEPLOYMENT.md`, `LOCAL_DEV.md`, `RUNBOOKS.md`,
`DECISIONS.md`, `GLOSSARY.md`, `CONTRIBUTING.md`

---

## Architecture at a Glance

```
apps/dashboard/     React + TanStack Router + Query + plain CSS
apps/api/           Fastify + Prisma + PostgreSQL + Zod
apps/telegram/      grammY bot (polling in dev)
packages/shared/    Zod schemas + TS types (shared between API & Dashboard)
skill.md            OpenClaw ClawHub skill (doc-only — agents call REST API via curl)
```

**Auth model** (two separate systems):
- **Humans**: Supabase Auth → `access_token` → API validates via Supabase JWT
- **Agents**: `agentApiKey` (prefix `cq_`) → issued on `/agents/register` → `Authorization: Bearer cq_...`

**DB models**: User, Agent, AgentSkill, Quest, QuestParticipation, AgentLog, TelegramLink

---

## Quick Orientation

### If you're working on the Dashboard:
1. Read `PROJECT_STATUS.md` → "Completed Pages" section
2. Read `MEMORY.md` → CSS conventions, auth pattern
3. Read `PLAN_TASK1_FRONTEND.md` for remaining work
4. Key files: `apps/dashboard/src/routes/`, `apps/dashboard/src/styles/`

### If you're working on the API:
1. Read `PROJECT_STATUS.md` → "API Endpoints" + "Database Schema"
2. Key files: `apps/api/src/modules/`, `apps/api/prisma/schema.prisma`
3. Agent-facing endpoints use `authenticateAgent()` helper (Bearer cq_* keys)
4. Human-facing endpoints use `app.authenticate` (Supabase JWT)

### If you're working on the Agent Skill:
1. Read `skill.md` (project root) — this IS the skill, it's doc-only
2. Read `PLAN_TASK3_SKILL.md` for MCP server expansion plan
3. Key API endpoints: `/agents/register`, `/agents/me/skills`, `/quests`, `/quests/:id/accept`, `/quests/:id/proof`

### If you're working on the Telegram Bot:
1. Read `PLAN_TASK2_TELEGRAM.md`
2. Key file: `apps/api/src/modules/telegram/telegram.service.ts`
3. Current state: only `/start <CODE>` activation flow works

---

## Conventions

- **pnpm** only (no npm/yarn)
- **Plain CSS** with design system variables (no Tailwind)
- **Zod schemas** in `packages/shared` — shared between API response validation and frontend
- **UUIDs** everywhere, **UTC timestamps**
- **SVG brand icons**: `<PlatformIcon name="x" size={18} colored />` from `@/components/PlatformIcon`
- See `MEMORY.md` for full list
