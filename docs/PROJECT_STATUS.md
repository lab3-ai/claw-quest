# ClawQuest — Project Status
> Last updated: 2026-02-20. Single source of truth for AI sessions (Cowork, Claude Code, etc.)

---

## 🗺 Stack

| Layer | Tech |
|---|---|
| Monorepo | pnpm workspaces |
| Frontend | React 18 + TanStack Router + TanStack Query + plain CSS |
| Backend | Fastify + Prisma + PostgreSQL |
| Auth | JWT (custom) — `@fastify/jwt` |
| Telegram Bot | grammY (polling in dev) |
| Shared types | `packages/shared` — Zod schemas + TS types |
| Deployment | Dashboard → Vercel, API → Railway |

---

## 📁 Key File Map

```
clawquest/
├── apps/
│   ├── dashboard/src/
│   │   ├── main.tsx                          ← CSS imports + app bootstrap
│   │   ├── router.tsx                        ← all routes
│   │   ├── context/AuthContext.tsx           ← auth state (session, user, isAuthenticated)
│   │   ├── components/
│   │   │   ├── PlatformIcon.tsx              ← SVG brand icons (x, discord, telegram, openclaw, claude, chatgpt, cursor)
│   │   │   ├── QuestCard.tsx                 ← card view + avatar stack
│   │   │   ├── QuestersPopup.tsx             ← questers modal popup
│   │   │   └── avatarUtils.ts                ← AVATAR_COLORS, getInitials
│   │   ├── styles/
│   │   │   ├── (27 shared CSS files)         ← design system
│   │   │   ├── token-display.css             ← token icon/color chips
│   │   │   └── pages/
│   │   │       ├── quest-explore.css
│   │   │       ├── quest-detail.css
│   │   │       ├── create-quest.css
│   │   │       ├── questers.css
│   │   │       └── dashboard.css
│   │   └── routes/
│   │       ├── login.tsx
│   │       ├── register.tsx
│   │       ├── _public/quests/
│   │       │   ├── detail.tsx               ← Quest Detail (public)
│   │       │   └── questers.tsx             ← Full Questers page (public)
│   │       └── _authenticated/
│   │           ├── index.tsx                ← Agent List (legacy home)
│   │           ├── agents/new.tsx
│   │           ├── dashboard.tsx            ← User Dashboard (My Quests + My Agents tabs)
│   │           └── quests/
│   │               ├── index.tsx            ← Quest Explore
│   │               └── create.tsx           ← Create Quest wizard (3 steps)
│   └── api/src/
│       ├── app.ts                           ← Fastify server + plugin registration
│       └── modules/
│           ├── auth/auth.routes.ts
│           ├── agents/agents.routes.ts
│           ├── quests/quests.routes.ts
│           └── telegram/telegram.service.ts  ← grammY bot, /start activation flow
├── packages/shared/src/index.ts             ← Zod schemas + TS types
├── apps/api/prisma/schema.prisma            ← DB schema
└── docs/                                    ← All planning docs
```

---

## ✅ Completed Pages (Dashboard Frontend)

### `/` → Dashboard (`dashboard.tsx`)
- **My Quests tab**: filter bar (all/live/scheduled/pending/draft/completed), card + list toggle, quest cards, quest table
- **My Agents tab**: filter bar (all/claimed/pending), expandable agent rows (activation code / quest history)
- **Register Agent modal**: platform dropdown with SVG brand icons (OpenClaw, Claude Code, ChatGPT, Cursor) — Claude Code enabled with MCP install guide
- Page header: "+ Register Agent" + "+ Create Quest" buttons

### `/quests` → Quest Explore (`quests/index.tsx`)
- Card + List view toggle
- Tab bar: Featured / Highest Reward / Ending Soon / New
- Full quest table with all columns

### `/quests/:questId` → Quest Detail (`quests/detail.tsx`)
- 2-column layout (main + 280px sidebar)
- Human Tasks section (pink border) + Agent Tasks section (blue border)
- Live countdown timer, spots bar, CTA (login/agent select/accept)
- Avatar crowd with tooltip

### `/quests/:questId/questers` → Questers Page (`quests/questers.tsx`)
- Filter bar, full rank table, pager

### `/quests/new` → Create Quest (`quests/create.tsx`)
- **3-step wizard**: Details → Reward → Tasks
- **Step 1 – Details**: title, description, start/end datetime
- **Step 2 – Reward**:
  - Payment rail: Crypto (8 networks, USDC/USDT + native token) | Fiat (Stripe)
  - Distribution type: FCFS | Leaderboard | Lucky Draw
  - **Shared fields**: Total Reward + Number of Winners (carry over across tabs)
  - LB: linear decay payout (`weights[i] = n - i`), visual shows top 5 + `…` + last 2 when winners > 20
  - Lucky Draw: extra "Draw Time" field
  - Winners auto-clamp to 2–100 when switching to Leaderboard
- **Step 3 – Tasks**:
  - Human tasks: platform template picker (X/Discord/Telegram SVG icons + per-action rich fields via `SocialEntryBody`)
  - Agent tasks: skill search + required skills list
- Live preview sidebar (always visible)
- CTA: "Create Quest & Pay with Stripe" (fiat) vs "Create Quest & Fund" (crypto)

---

## 🗄 Database Schema (Prisma)

```
User        id, email, password, timestamps
Agent       id, ownerId→User, name, status(idle/questing/offline), activationCode
TelegramLink  id, agentId→Agent, telegramId(BigInt), username, firstName
Quest       id, title, description, sponsor, type(FCFS/LEADERBOARD/LUCKY_DRAW),
            status(draft/live/scheduled/pending/completed), rewardAmount, rewardType,
            totalSlots, filledSlots, tags[], expiresAt
QuestParticipation  id, questId, agentId, status, proof(JSON), tasksCompleted,
                    tasksTotal, payoutAmount, payoutStatus
AgentLog    id, agentId, type, message, meta(JSON)
```

---

## 🔌 API Endpoints

```
POST /auth/register          → create user
POST /auth/login             → returns JWT
GET  /auth/me                → current user (auth)

GET  /agents                 → list user's agents (auth)
POST /agents                 → create agent, generates activationCode (auth)
GET  /agents/:id             → agent detail (auth)

GET  /quests                 → list quests (public, excludes draft)
GET  /quests/:id             → quest detail (public)
GET  /quests/:id/questers    → paginated questers (public)
POST /quests                 → create quest (no auth – MVP)
POST /quests/:id/accept      → accept quest with agentId (auth)
```

---

## 🤖 Telegram Bot (current state)

File: `apps/api/src/modules/telegram/telegram.service.ts`

**Existing flow:**
- `/start <CODE>` → finds Agent by `activationCode`, creates `TelegramLink`, clears `activationCode`

**What's missing (Task 2 target):**
- `/register` conversational flow (no code needed — bot-initiated agent registration)
- `/quests` — list available quests
- `/accept <questId>` — accept a quest
- `/status` — agent + active quest status
- Quest completion + proof submission via chat

---

## 🚧 Remaining Work

### Task 1 — UI/UX Improvements
- [ ] Agent Detail page `/agents/:agentId` (logs, status, active quest)
- [ ] Quest Manage page `/quests/:questId/manage` (operator: edit/publish/fund/close)
- [ ] Auth pages design polish (login, register)
- [ ] Global Toast notifications
- [ ] Quest status update (operator: verify tasks, trigger payout)
- [ ] Mobile responsive pass

### Task 2 — Telegram Bot Registration Flow
- [ ] Conversational `/register` flow (see `docs/PLAN_TASK2_TELEGRAM.md`)
- [ ] `/quests`, `/accept`, `/status`, `/done` commands
- [ ] Quest proof submission

### Task 3 — ClawQuest Skill for ClawHub
- [ ] Skill manifest + implementation (see `docs/PLAN_TASK3_SKILL.md`)
