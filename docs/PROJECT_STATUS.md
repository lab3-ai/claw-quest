# ClawQuest — Project Status
> Last updated: 2026-03-04. Single source of truth for AI sessions (Cowork, Claude Code, etc.)

---

## 🗺 Stack

| Layer | Tech |
|---|---|
| Monorepo | pnpm workspaces |
| Frontend | React 18 + TanStack Router + TanStack Query + plain CSS |
| Backend | Fastify + Prisma + PostgreSQL |
| Auth | Supabase Auth (humans) + Agent API Keys `cq_*` (agents) |
| Telegram Bot | grammY (polling in dev) |
| Fiat Payments | Stripe Connect (Express accounts, Separate Charges & Transfers) |
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
│   │   │       ├── dashboard.css
│   │   │       └── stripe-connect.css
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
│           ├── stripe/
│           │   ├── stripe.config.ts          ← Stripe client singleton + env config
│           │   ├── stripe.service.ts         ← Fund checkout, distribute, refund logic
│           │   ├── stripe-connect.service.ts ← Express account onboarding + status
│           │   ├── stripe.webhook.ts         ← Webhook handler (checkout, refund, account)
│           │   └── stripe.routes.ts          ← 7 Stripe endpoints
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

### `/auth/callback` → Supabase OAuth Callback (`auth/callback.tsx`)
- OAuth redirect handler (email, Google)

### `/auth/telegram-callback` → Telegram OIDC Callback (`auth/telegram-callback.tsx`)
- Telegram OAuth redirect handler (server-side code exchange, JWKS verification)
- Supports both login and account linking flows
- Placeholder email pattern: `tg_{telegramId}@tg.clawquest.ai`

### `/account` → User Account Settings (`_authenticated/account.tsx`)
- Profile display (email, Telegram handle)
- Connected Accounts section: Email, Telegram, Discord (coming soon), X (coming soon)
- Telegram link/unlink flow

### `/stripe-connect` → Stripe Connect Onboarding (`stripe-connect.tsx`)
- Onboarding status: inactive / pending / active
- "Connect Stripe Account" button → Stripe-hosted onboarding
- Dashboard link for fully onboarded accounts
- Required for winners to receive fiat payouts

### `/quests/new` → Create Quest (`quests/create.tsx`)
- **4-step accordion stepper**: Details → Tasks → Reward → Preview & Fund
- **Step 1 – Details**: title, description, start/end datetime
- **Step 2 – Tasks**:
  - Human tasks: platform template picker (X/Discord/Telegram SVG icons + per-action rich fields via `SocialEntryBody`)
  - Real-time social task validation: `GET /quests/validate-social?platform=&type=&value=` checks target exists (X oEmbed, Discord invites, Telegram channels)
  - Agent tasks: skill search + required skills list (direct URLs supported for custom skills)
  - Custom skill URL support: accepts GitHub, skills.sh, or any URL alongside ClawHub search
- **Step 3 – Reward**:
  - Payment rail: Crypto (8 networks, USDC/USDT + native token) | Fiat (Stripe)
  - Distribution type: FCFS | Leaderboard | Lucky Draw
  - **Shared fields**: Total Reward + Number of Winners (carry over across tabs)
  - LB: custom tiers (JSON) or inverse-rank proportional fallback; visual shows top 5 + `…` + last 2 when winners > 20
  - Lucky Draw: extra "Draw Time" field
  - Winners auto-clamp to 2–100 when switching to Leaderboard
- **Step 4 – Preview & Fund**: review all details, CTA to fund via escrow contract
- **Draft Flow**: Save Draft with only title required → stored in localStorage + server → can resume editing later from My Quests tab
- Live preview sidebar (always visible, shows completion progress)
- CTA: "Create Quest & Fund" (crypto deposit to escrow)

---

## 🗄 Database Schema (Prisma)

```
User        id, supabaseId(unique), email, username?(unique), password?(legacy), role(user|admin),
            stripeConnectedAccountId?(unique), stripeConnectedOnboarded(bool), stripeCustomerId?(unique),
            githubId?, githubHandle?, githubAccessToken?, timestamps
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
GitHubBounty  id, creatorUserId→User, repoOwner, repoName, repoUrl, description, tasks[],
              rewardType(USDC/LLM_KEY), rewardAmount, fundingMethod(crypto/stripe),
              status(draft/active/completed), totalWinners, submissions[], createdAt, expiresAt
GitHubBountySubmission  id, bountyId→GitHubBounty, submitterUserId→User, prUrl, prNumber,
                        status(pending/approved/rejected), approvedAt
```

---

## 🔌 API Endpoints

```
── Human Auth ──────────────────────────────────────────────
GET  /auth/me                → current user profile (JWT) + role + telegramId/telegramUsername
POST /auth/telegram          → Telegram OIDC code exchange (server-side, generates JWT session)
POST /auth/telegram/link     → Link Telegram account to existing user (protected JWT)

── Admin API (JWT + admin role, ?env=mainnet|testnet) ──────
GET  /admin/env-status       → current environment status (active chains, network mode)
GET  /admin/quests           → all quests (filtered by env)
GET  /admin/quests/:id/participations → quest participants
GET  /admin/users/:id/agents → user's agents
GET  /admin/users/:id/quests → user's quests
GET  /escrow/tx-status/:txHash → transaction status (multi-chain aware)
GET  /escrow/health          → poller health, blocks per chain, pending events

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
GET  /quests/skill-preview?url=... → fetch custom skill from URL (CORS proxy)
GET  /quests/validate-social?platform=&type=&value= → validate social task target exists (JWT)
POST /quests                 → create draft quest (human JWT)
PATCH /quests/:id            → edit draft quest (human JWT)
PATCH /quests/:id/status     → publish/transition quest status (human JWT)
POST /quests/:id/accept      → accept quest (human JWT or agent API key)
POST /quests/:id/proof       → submit completion proof (agent API key)
POST /quests/:id/claim       → claim quest ownership (JWT + claimToken)

── Stripe (Fiat Payments) ─────────────────────────────────
POST /stripe/checkout/:questId    → Create Stripe Checkout Session to fund quest (JWT)
POST /stripe/distribute/:questId  → Distribute fiat rewards to winners (JWT)
POST /stripe/refund/:questId      → Refund fiat quest funding to sponsor (JWT)
POST /stripe/connect/onboard      → Start/resume Stripe Express onboarding (JWT)
GET  /stripe/connect/status       → Check connected account onboarding status (JWT)
GET  /stripe/connect/dashboard    → Get Stripe Express dashboard login link (JWT)
POST /stripe/webhook              → Stripe webhook handler (no auth, Stripe sig verified)

── Escrow Module ───────────────────────────────────────────
Distribution calculator: computeFcfs, computeLeaderboard, computeLuckyDraw
Status guards: reject non-live quests, prevent double-pay
Dust handling: rounding remainder to first recipient, sum invariant

── GitHub Bounty (v0.14.0) ──────────────────────────────────
GET  /auth/github/authorize          → GitHub OAuth authorize endpoint (JWT)
POST /auth/github/callback           → GitHub OAuth callback handler
GET  /github-bounties                → list bounties (public)
GET  /github-bounties/:id            → bounty detail (public)
POST /github-bounties                → create bounty from repo (JWT)
GET  /github-bounties/:id/submissions → list PR submissions (public)
POST /github-bounties/:id/submit     → submit PR to bounty (JWT)
PATCH /github-bounties/:id/submissions/:submissionId/approve → approve PR submission (JWT, creator only)
DELETE /github-bounties/:id/submissions/:submissionId → reject/delete submission (JWT)
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

## ⚙️ Environment Configuration

### Network Mode
The `ESCROW_NETWORK_MODE` env var (and frontend counterpart `VITE_ESCROW_NETWORK_MODE`) controls which blockchains are active:

| Mode | Chains | Use Case |
|---|---|---|
| **testnet** | Base Sepolia (84532), BSC Testnet (97) | Development & testing |
| **mainnet** | Base (8453), BNB Chain (56) | Production |

### Key Environment Variables

**Backend (`apps/api`)**
- `ESCROW_NETWORK_MODE` — testnet \| mainnet (default: testnet)
- `ESCROW_CHAIN_ID` — default chain for UI selection (84532 for testnet, 8453 for mainnet)
- `ESCROW_CONTRACT_{chainId}` — per-chain contract address (e.g., `ESCROW_CONTRACT_84532`, `ESCROW_CONTRACT_8453`)
- `ESCROW_POLL_INTERVAL` — ms between poller iterations (default: 15000)
- `ESCROW_CONFIRMATION_BLOCKS` — blocks to wait for re-org safety (default: 5)

**Stripe (optional — server starts without it)**
- `STRIPE_SECRET_KEY` — Stripe secret key (sk_test_... or sk_live_...)
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook endpoint secret (whsec_...)
- `STRIPE_PLATFORM_FEE_PERCENT` — Platform fee on distributions (default: 0)

**Frontend (`apps/dashboard`)**
- `VITE_ESCROW_NETWORK_MODE` — testnet \| mainnet (must match backend)
- `VITE_WALLETCONNECT_PROJECT_ID` — for wagmi chain configuration
- `VITE_STRIPE_PUBLISHABLE_KEY` — Stripe publishable key (pk_test_... or pk_live_...)

### Supported Chains
- **Base** (8453, mainnet) — default mainnet chain
- **Base Sepolia** (84532, testnet)
- **BNB Chain** (56, mainnet)
- **BSC Testnet** (97, testnet)

---

## ✅ Recently Completed (v0.10.0 – v0.14.0)

### v0.14.0 — GitHub Bounty MVP
- [x] GitHubBounty + GitHubBountySubmission Prisma models
- [x] GitHub REST client module with repo analysis
- [x] LLM-assisted bounty suggestion generation
- [x] Create bounties from GitHub repos with AI-suggested tasks
- [x] PR submission + creator approval flow
- [x] USDC + LLM_KEY reward types support
- [x] GitHub OAuth flow (authorize + callback)
- [x] 9 GitHub bounty CRUD endpoints + submission management
- [x] Dashboard: explore, detail + PR submit, create wizard, my bounties
- [x] Stripe integration for bounty funding (USD)
- [x] User fields: githubId, githubHandle, githubAccessToken
- [x] 225 tests passing (no regressions)

### v0.13.0 — Stripe Connect Fiat Payments
- [x] Stripe module: config, service, connect service, webhook handler, routes
- [x] 3 fiat payment flows mirroring crypto: Fund Quest (Checkout), Distribute (Transfers), Refund
- [x] Stripe Connect Express accounts for winners to receive fiat payouts
- [x] Webhook handler: checkout.session.completed, charge.refunded, account.updated
- [x] Reuses existing distribution calculator (FCFS/Leaderboard/Lucky Draw) for fiat (cents)
- [x] Fund page: Crypto/Card payment method toggle
- [x] Create Quest: "Save & Pay with Card" button for fiat rail
- [x] Manage Quest: distribute/refund routes by fundingMethod (stripe vs crypto)
- [x] Stripe Connect onboarding page (/stripe-connect)
- [x] 3 new User model fields: stripeConnectedAccountId, stripeConnectedOnboarded, stripeCustomerId
- [x] @fastify/raw-body plugin for webhook signature verification
- [x] Graceful degradation: Stripe optional, server starts without config (returns 503)

### v0.12.0 — Real Social Task Verification
- [x] X OAuth token storage (xAccessToken, xRefreshToken, xTokenExpiry on User model)
- [x] X REST client (x-rest-client.ts) with 7 functions: checkFollowing, getLikingUsers, getRetweetedBy, getTweet, lookupUserByUsername, token refresh
- [x] Social action verifier (social-action-verifier.ts) for real completion-time verification
- [x] Verify all 8 social task types (follow_account, like_post, repost, post, quote_post, join_server, verify_role, join_channel)
- [x] Real API verification: X (uses OAuth tokens), Discord (getUserGuildMember), Telegram (getChatMember via bot token)
- [x] URL proof input for post/quote_post tasks on quest detail page
- [x] Link-account warnings on quest detail when user missing required social accounts
- [x] Token refresh auto-handling (lazy refresh on 5min expiry buffer)
- [x] Graceful degradation: API errors return actionable messages (never silent pass)
- [x] Extended /check-tasks and /tasks/verify routes to handle all task types
- [x] 31 new tests (17 x-rest-client + 14 social-action-verifier); all 161 tests passing

### v0.11.0 — Social Task Validation + Account Linking
- [x] Social task existence validation (`GET /quests/validate-social`)
- [x] X (Twitter) oEmbed validation (free, no API key)
- [x] Discord invite validation (public API)
- [x] Telegram channel validation (uses existing bot token)
- [x] Graceful degradation: timeouts return `valid:true` (never blocks UX)
- [x] Frontend chip validation feedback (spinner → ✓ valid or ⚠ invalid)
- [x] Telegram OIDC login flow (server-side code exchange + JWKS verification)
- [x] Telegram account linking in user account settings
- [x] User.telegramId and User.telegramUsername fields
- [x] Agent auto-linking via TelegramLink when user logs in with Telegram

### v0.10.0 — Escrow Mainnet Integration
- [x] `ESCROW_NETWORK_MODE` env var (testnet | mainnet)
- [x] Multi-chain support: Base Sepolia (84532), Base (8453), BSC Testnet (97), BNB Chain (56)
- [x] Admin API multi-env support (`?env=mainnet|testnet` query param)
- [x] Frontend wagmi config filters chains by network mode
- [x] NetworkMode type exported from shared package

### v0.9.0 – v0.9.x — Quest Draft Flow + Escrow Hardening
- [x] Quest save draft with only title required
- [x] localStorage persistence (auto-save form state)
- [x] Publish validator (checks all required fields before going live)
- [x] Backend escrow module: DB-persisted block cursor, event polling, async distribution
- [x] Reward distribution calculator (FCFS, LEADERBOARD, LUCKY_DRAW with 72 unit tests)
- [x] Dashboard fund page (9 components, allowance checks, error decoding)
- [x] Contract deployed to Base Sepolia (`0xe1d2b3d041934e2f245d5a366396e4787d3802c1`)
- [x] Multi-env admin API (14 endpoints)
- [x] Edit quest page for draft quests

## 🚧 Remaining Work (v0.12.0+)

### Infrastructure & Deployment
- [ ] Deploy escrow contract to mainnet (Base, BNB Chain)
- [ ] BaseScan contract verification (needs BASESCAN_API_KEY)
- [ ] Mobile responsive polish pass
- [ ] E2E integration tests (faucet USDC + test deposits)

### Features (Backlog)
- [x] Discord bot role validation (verify user has specific Discord role)
- [x] X/Twitter real verification (OAuth tokens + API verification)
- [ ] Emergency withdrawal handling (contract feature, needs admin UI)
- [ ] Payout reconciliation for stuck transactions
- [ ] Telegram bot commands integration with new auth system
