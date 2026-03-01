# ClawQuest — Project Status
> Last updated: 2026-03-01. Single source of truth for AI sessions (Cowork, Claude Code, etc.)

---

## 🗺 Stack

| Layer | Tech |
|---|---|
| Monorepo | pnpm workspaces |
| Frontend | React 18 + TanStack Router + TanStack Query + plain CSS |
| Backend | Fastify + Prisma + PostgreSQL |
| Auth | Supabase Auth (humans) + Agent API Keys `cq_*` (agents) |
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
User        id, supabaseId(unique), email, username?(unique), password?(legacy), role(user|admin), timestamps
Agent       id, ownerId→User, agentname, status(idle/questing/offline),
            activationCode?(unique), agentApiKey?(unique, cq_*)
AgentSkill  id, agentId→Agent, name, version?, source(clawhub/mcp/manual),
            publisher?, meta(JSON), lastSeenAt  @@unique([agentId, name])
TelegramLink  id, agentId→Agent, telegramId(BigInt), username, firstName
Quest       id, creatorUserId→User, title, description, sponsor, type(FCFS/LEADERBOARD/LUCKY_DRAW),
            status(draft/live/scheduled/pending/completed), rewardAmount, rewardType,
            totalSlots, filledSlots, tags[], expiresAt, humanTasks, agentTasks
QuestParticipation  id, questId, agentId, status, proof(JSON), tasksCompleted,
                    tasksTotal, payoutAmount, payoutStatus
AgentLog    id, agentId, type(QUEST_START/QUEST_COMPLETE/ERROR/INFO), message, meta(JSON)
EscrowCursor  chainId(unique), lastBlock, updatedAt — DB-persisted block cursor for escrow event polling
```

---

## 🔌 API Endpoints

```
── Human Auth ──────────────────────────────────────────────
GET  /auth/me                → current user profile (JWT) + role field

── Admin API (JWT + admin role, ?env=mainnet|testnet) ──────
GET  /admin/env-status       → current environment status
GET  /admin/quests           → all quests (filtered by env)
GET  /admin/quests/:id/participations → quest participants
GET  /admin/users/:id/agents → user's agents
GET  /admin/users/:id/quests → user's quests
GET  /escrow/tx-status/:txHash → transaction status
GET  /escrow/health          → poller health, blocks, pending events

── Human Agent Management ──────────────────────────────────
GET  /agents                 → list user's agents
POST /agents                 → create agent, generates activationCode
GET  /agents/:id             → agent detail

── Agent Self-Service (API Key: Bearer cq_*) ───────────────
POST /agents/register        → exchange activationCode for agentApiKey
GET  /agents/me              → agent self-info + active quests
GET  /agents/logs            → agent activity log
POST /agents/me/log          → write activity log entry
POST /agents/me/skills       → report installed skills (upsert)
GET  /agents/me/skills       → list agent's installed skills

── Quests (public + auth) ──────────────────────────────────
GET  /quests                 → list quests (public, excludes draft)
GET  /quests/:id             → quest detail (public)
GET  /quests/:id/questers    → paginated questers (public)
GET  /quests/skill-preview?url=... → fetch custom skill from URL
POST /quests                 → create draft quest (human JWT)
POST /quests/:id/accept      → accept quest (human JWT or agent API key)
POST /quests/:id/proof       → submit completion proof (agent API key)
POST /quests/:id/claim       → claim quest ownership (JWT + claimToken)
```

---

## 🤖 Telegram Bot (current state)

File: `apps/api/src/modules/telegram/telegram.service.ts`

**Existing commands:**
- `/start <CODE>` → find Agent by activationCode, create TelegramLink
- `/register` → conversational agent registration flow (in-memory session store)
- `/quests` — list available quests
- `/accept <questId>` — accept a quest
- `/done` — mark quest complete
- `/cancel` — cancel active quest
- `/status` → agent + quest progress
- `/help`, `/about` → command list and knowledge base

---

## 🚧 Remaining Work (v0.9.0+)

### Dashboard Fund Page
- [x] Multi-env admin API support (`?env=mainnet|testnet`)
- [x] Contract verified on Base Sepolia (`0xe1d2b3d041934e2f245d5a366396e4787d3802c1`)
- [x] Dashboard fund page with allowance, balance checks, error decoding
- [x] Mobile responsive layout (9 focused components)
- [ ] Deploy to mainnet (contract upgrade, USDC allowlist, operator role)

### Edit Quest Page
- [x] Edit button for draft quests in My Quests tab
- [ ] Full edit form (Details, Reward, Tasks)

### Admin Dashboard (separate repo)
- [x] Multi-env switcher, escrow health monitoring, TX status lookup
- [x] Quest participations table, user agents/quests tabs
- [ ] Integration testing with Base Sepolia

### Backend Escrow Module
- [x] DB-persisted block cursor (5-block confirmation buffer)
- [x] All 4 event types polled: QuestFunded, QuestDistributed, QuestRefunded, EmergencyWithdrawal
- [x] Fire-and-forget distribute/refund (async, poller reconciles)
- [x] writeContractWithRetry for nonce errors
- [ ] Payout reconciliation for stuck transactions
- [ ] Emergency withdrawal handling

### Testing & Deployment
- [ ] Browser test claim flow end-to-end
- [ ] Deploy to mainnet (Base, Optimism, Arbitrum)
- [ ] Load test escrow poller
