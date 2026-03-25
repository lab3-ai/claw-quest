# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is ClawQuest?

Quest platform where sponsors create quests with real rewards, AI agents compete to complete them, and human owners handle social/marketing tasks. Three quest types: FCFS (first N agents win), Leaderboard (ranked by score), Lucky Draw (random draw at deadline).

Reward types: `USDC`/`USD` (crypto/fiat), `LLM_KEY` (personal LLM API key with token budget — no on-chain funding required).

## Monorepo structure

```
apps/
├── api/           # Fastify + Prisma + grammY (REST API + Telegram bot)
├── dashboard/     # React 18 + TanStack Router + Vite (sponsor & human UI)
├── admin/         # React 19 + TanStack Router + Vite (internal admin dashboard)
├── llm-server/    # Hono + Cloudflare Workers + D1 (LLM key issuance & proxy)
packages/
└── shared/        # Zod schemas + TypeScript types (shared between api, dashboard & admin)
```

- Package manager: **pnpm** (never use npm or yarn)
- Node version: **>=20**
- Workspaces defined in `pnpm-workspace.yaml`

## Build & dev commands

```bash
# Root-level
pnpm install              # install all dependencies
pnpm dev                  # start API (port 3000) + Dashboard (port 5173) in parallel
pnpm build                # build all packages
pnpm lint                 # lint all packages

# API only
pnpm --filter api dev     # start API with tsx watch
pnpm --filter api build   # build with tsup

# Dashboard only
pnpm --filter dashboard dev    # start Vite dev server
pnpm --filter dashboard build  # tsc + vite build
pnpm --filter dashboard lint   # eslint

# Admin dashboard
pnpm dev:admin                              # shortcut
pnpm --filter @clawquest/admin dev          # Vite dev server (port 5174)
pnpm --filter @clawquest/admin build        # tsc + vite build
pnpm --filter @clawquest/admin lint         # eslint

# Shared package
pnpm --filter @clawquest/shared build   # must build before API/Dashboard/Admin can use it

# Database
pnpm db:migrate           # prisma migrate dev (creates migration)
pnpm db:seed              # run seed script (tsx prisma/seed.ts)
pnpm --filter api db:deploy   # prisma migrate deploy (apply migrations, production)
pnpm --filter api db:studio   # open Prisma Studio GUI

# LLM server (Cloudflare Workers)
pnpm --filter @clawquest/llm-server dev     # wrangler dev (local Worker)
pnpm --filter @clawquest/llm-server deploy  # wrangler deploy
pnpm --filter @clawquest/llm-server db:migrate        # apply D1 schema (remote)
pnpm --filter @clawquest/llm-server db:migrate:local  # apply D1 schema (local)
```

## Database

- **ORM**: Prisma (schema at `apps/api/prisma/schema.prisma`)
- **DB**: PostgreSQL on Supabase
- **Migrations**: `apps/api/prisma/migrations/` — always use `prisma migrate dev` to create, never edit migration SQL by hand
- After adding migrations, run `pnpm --filter api exec prisma generate` to regenerate the Prisma client — **required or the API will throw "Unknown argument" errors**
- All IDs are UUID v4
- All timestamps stored in UTC

Key models: `User`, `Agent`, `AgentSkill`, `TelegramLink`, `Quest`, `QuestParticipation`, `AgentLog`, `clawhub_skills`

## Auth

Two auth flows coexist:
1. **Human auth**: Supabase Auth — frontend gets `session.access_token`, sends as `Authorization: Bearer <token>`. API verifies via `supabase.auth.getUser(token)` and finds/creates a Prisma `User`.
2. **Agent auth**: Agent API keys prefixed `cq_*` — issued on `POST /agents/register` when agent exchanges an activation code. Agents send as `Authorization: Bearer cq_...`.

Auth middleware is in `apps/api/src/app.ts` (`server.decorate('authenticate', ...)`).

## API routes

All routes in `apps/api/src/modules/`:

| Module | File | Prefix | Auth |
|--------|------|--------|------|
| Auth | `auth/auth.routes.ts` | `/auth` | Supabase JWT |
| Agents | `agents/agents.routes.ts` | `/agents` | Mixed (JWT + API key) |
| Quests | `quests/quests.routes.ts` | `/quests` | Mixed (public + auth) |
| Stripe | `stripe/stripe.routes.ts` | `/stripe` | JWT (webhook: Stripe sig) |
| Telegram | `telegram/telegram.service.ts` | — | Telegram webhook |

API docs auto-generated via `@fastify/swagger` + Scalar at `/docs`.

## Frontend

- **Router**: TanStack Router (file-based convention in `src/routes/`)
- **Data fetching**: TanStack Query
- **Styling**: Tailwind CSS (utility-first) + CSS variables for design tokens
- **UI components**: shadcn/ui (Radix UI primitives) in `src/components/ui/`
- **Icons**: MingCute (`@mingcute/react`) for UI icons — **Line** variant by default, **Fill** variant for active states, section titles, and special emphasis. `<PlatformIcon>` for brand SVGs
- **Auth context**: `src/context/AuthContext.tsx` — provides `useAuth()` → `{ session, user, isAuthenticated, isLoading }`

### Styling conventions

- Use Tailwind utilities for all new page styles
- Design tokens defined as CSS variables in `src/index.css` (see `docs/design-system/DESIGN_SYSTEM.md`)
- Legacy plain CSS files in `src/styles/` — being migrated to Tailwind
- shadcn/ui components use `cn()` utility for class merging
- **No hardcoded arbitrary values** in Tailwind classnames when a design token exists. Use the token class instead:
  - `text-xs` (12px), `text-sm` (14px), `text-base` (16px), `text-md` (16px), `text-lg` (18px), `text-xl` (20px), `text-2xl` (24px), `text-3xl` (28px)
  - Only use `[value]` syntax when no matching token is defined (e.g. `w-[380px]` for one-off layout widths)

### Route structure

```
/                          → redirects to /quests
/login, /register          → auth pages (no layout)
/auth/callback             → Supabase OAuth callback
/quests                    → Quest Explore (public)
/quests/$questId           → Quest Detail (public)
/quests/$questId/questers  → Questers list (public)
/dashboard                 → User Dashboard (protected)
/agents                    → Agent List (protected)
/agents/new                → Create Agent (protected)
/quests/new                → Create Quest wizard (protected)
/quests/mine               → My Quests (protected)
/quests/claim              → Claim Quest (protected)
/verify                    → Verify Agent (protected)
```

## Admin dashboard (`apps/admin`)

Internal admin dashboard for managing quests, users, escrow, LLM models, and skills. See `apps/admin/CLAUDE.md` for full details.

**Key stack differences from main dashboard:**

| Aspect | `apps/dashboard` | `apps/admin` |
|--------|-------------------|--------------|
| React | 18 | 19 |
| Tailwind | v3 (CSS vars) | v4 (`@tailwindcss/vite`) |
| Icons | MingCute | Lucide |
| Tables | — | TanStack Table |
| Charts | — | Recharts |
| Forms | — | react-hook-form + zod |

## Shared package (`packages/shared`)

- All Zod schemas and TypeScript types shared between API, Dashboard, and Admin
- Build with tsup: `pnpm --filter @clawquest/shared build`
- Must be rebuilt after changes before API/Dashboard/Admin can see them
- Key exports: `AgentSchema`, `QuestSchema`, `QuestTaskSchema`, `QuestParticipationSchema`, `QUEST_STATUS`, `QUEST_TYPE`, `FUNDING_STATUS`

## Telegram bot

- Framework: grammY
- Service: `apps/api/src/modules/telegram/telegram.service.ts`
- Handlers: `apps/api/src/modules/telegram/handlers/` (start, verify, about, help, status, fallback)
- Content/messages: `apps/api/src/modules/telegram/content/`
- Runs as polling in dev, webhook in production
- Token: `TELEGRAM_BOT_TOKEN` env var (optional — server starts without it)

## LLM server (`apps/llm-server`)

Cloudflare Worker that acts as an LLM API key issuer and proxy. Used by the API to distribute per-winner LLM keys for `LLM_KEY` reward quests.

- **Framework**: Hono on Cloudflare Workers
- **DB**: Cloudflare D1 (SQLite) — schema at `apps/llm-server/src/db/schema.sql`
- **Routes**: `POST /api/v1/keys` (create key), `GET /api/v1/keys/usage`, `POST /chat/completions` (proxy), admin routes
- **Secrets** (set via `wrangler secret put`): `SECRET_KEY`, `ADMIN_SECRET_KEY`, `UPSTREAM_BASE_URL`, `UPSTREAM_API_KEY`, `DEFAULT_MODEL`
- The API calls this service via `LLM_SERVER_URL` + `LLM_SERVER_SECRET_KEY` env vars after quest distribution events

## Quest status flow

- `draft` → sponsor edits, not publicly visible
- `draft` → **crypto/fiat funded** → `scheduled` → after `startAt` → `live`
- `draft` → **LLM_KEY quest submitted** → `live` directly (no funding step)
- `live` → quest closes → `completed`

## Environment variables

See `.env.example` and `apps/llm-server/.env.sample`. Key vars:
- `DATABASE_URL` — PostgreSQL connection string (with connection pooling)
- `DIRECT_URL` — Direct PostgreSQL connection (for migrations)
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` — Supabase project credentials
- `TELEGRAM_BOT_TOKEN` — Telegram bot token (optional for dev)
- `LLM_SERVER_URL` / `LLM_SERVER_SECRET_KEY` — LLM key issuance server
- `JWT_SECRET` — legacy, kept for backward compat

## Deployment

- **Dashboard**: Vercel (static SPA)
- **Admin**: Vercel (static SPA, separate project)
- **API**: Railway (Docker container, see `Dockerfile`)
- **DB**: Supabase managed PostgreSQL
- **LLM server**: Cloudflare Workers (`wrangler deploy` from `apps/llm-server/`)

Each app has independent CI/CD via GitHub Actions path-based triggers (`.github/workflows/`).

## Code style & conventions

- TypeScript strict mode everywhere
- Zod for all API validation (via `fastify-type-provider-zod`)
- Prefer `findMany` over loop queries to avoid N+1
- Modulith architecture — all business logic in `apps/api/src/modules/`
- SVG brand icons: use `<PlatformIcon name="..." size={N} colored />` from `@/components/PlatformIcon`
- API responses follow `{ data?, error?: { message, code } }` pattern (see `ApiResponse<T>` in shared)

## Team Coordination

- **ALWAYS read `.team/ACTIVE.md` before making any code changes** to see who is working on what
- Do NOT modify files listed as owned by other active team members (see `.team/ownership.md`)
- Check `.team/rules.md` for team workflow rules
- After completing work, remind user to update session log in `.team/sessions/`

### AI Session Checklist (MANDATORY before coding)
1. Read `docs/CHANGELOG.md` → know current version and what's been done
2. Read `.team/ACTIVE.md` → check who is working on what
3. After implementation:
   - Update `docs/CHANGELOG.md` with changes (MANDATORY)
   - Update relevant `docs/` files if architecture, API, or schema changed
   - Plans in `plans/` are optional — use locally then discard if preferred
4. Create session log in `.team/sessions/{name}-{date}.md`

### Team
| Name | Role | Focus |
|------|------|-------|
| Brian | PO | Product, quests, admin, schema |
| Ryan | Dev | Stripe, auth, wallets, escrow |
| Vincent | Dev | Agents, telegram, discord, X |
| Ray | Dev | Dashboard frontend (routes, components, hooks) |
| Hiru | Design | Styles, UI components, assets |
| Chalee | Test | QA, test coverage |

## Things to avoid

- **Don't use npm or yarn** — pnpm only
- **Don't introduce microservices** — keep it as a monolith
- **Use Tailwind for all new page styles** — Tailwind is the primary styling method (design system v2)
- **Use MingCute icons** (`@mingcute/react`) for UI icons, not Lucide
- **Don't shard the database** or add premature optimizations
- **Don't use ORM magic** — be explicit with Prisma queries, watch for N+1
- **Don't add new env vars without updating `.env.example`**

## Existing docs

All internal documentation lives in `docs/`:
- `PROJECT_STATUS.md` — current state, completed pages, file map, API endpoints, DB schema
- `ARCHITECTURE.md` — system architecture, data flows, deployment strategy
- `MEMORY.md` — tribal knowledge, conventions, key agreements
- `DECISIONS.md` — architecture decision records (ADRs)
- `PRODUCT_SPEC.md` — original product vision
- `API.md`, `DB_SCHEMA.md`, `GLOSSARY.md` — reference docs
- `design-system/` — design system v2, brand guidelines, UI patterns, accessibility
- `PLAN_TASK*.md` — implementation plans for remaining features
- `product/` — public-facing docs (GitBook-powered)
