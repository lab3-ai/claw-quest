# System Architecture

## Overview
ClawQuest uses a modern, type-safe stack designed for reliability and ease of deployment.

```ascii
Telegram User      Web User      Web Admin      Smart Contract     Stripe
     |                |              |              |                 |
     | Webhook        | HTTPS/WSS     | HTTPS/WSS    | JSON-RPC       | Webhook
     |                |              |              |                 |
     +----------------+-------+------+-------+------+--------+-------+
                              |
                    +---------+----------+
                    |                    |
                    v                    v
            +------------------+    +------------------+
            |  API (Fastify)   |    | Escrow Poller    |
            |  - Auth (JWT)    |    | - Block cursor   |
            |  - Routes        |    | - Event handlers |
            |  - Stripe module |    | - Reconciliation |
            |  - Admin API     |    |                  |
            +--------+---------+    +--------+---------+
                     |                       |
          +----------+----------+            |
          |          |          |            |
          v          v          v            v
    +----------+ +----------+ +-------------------+
    | Postgres | | Stripe   | | Blockchain (Base) |
    | Supabase | | Connect  | | - Contracts       |
    | - Schema | | - Express| | - Events          |
    | - Cursor | | - Payouts| | - Balances        |
    +----------+ +----------+ +-------------------+
```

## 🔄 Data Flows

### 1. Dashboard ↔ API ↔ Supabase
- **Dashboard** is a Vite SPA. It fetches data via **TanStack Query** from the Fastify API.
- **API** validates requests using **Zod**, checks auth, and interacts with **Postgres** via **Prisma**.
- **Supabase** hosts the Postgres DB. We use connection pooling (Supabase Transaction Pool or Prisma Accelerate) for efficiency.

### 2. Bot Flow: Telegram ↔ API
- **Telegram Bot** sends updates via **Webhook** to the API (`POST /telegram`).
- API validates the request signature (optional but recommended) or secret token.
- API processes the message, updates state in DB, and responds via Telegram API.

### 2b. Telegram OAuth (OIDC): User Auth ↔ Telegram ↔ API
- User clicks "Login with Telegram" button on dashboard
- Frontend initiates OIDC flow with Telegram (PKCE + state for CSRF protection)
- Telegram redirects to `/auth/telegram-callback` with authorization code
- Frontend exchanges code for ID token at `POST /auth/telegram`
- API verifies JWT via Telegram's JWKS, extracts `sub` (telegramId) and `preferred_username`
- API finds or creates user, returns Supabase session
- Frontend stores session → user is logged in
- **Account Linking**: Same flow but POST to `/auth/telegram/link` (protected endpoint)

### 3. Escrow Module: Blockchain ↔ API ↔ Database
- **Network Mode**: `ESCROW_NETWORK_MODE` env var controls active chains (testnet|mainnet)
  - **Testnet**: Base Sepolia (84532) + BSC Testnet (97)
  - **Mainnet**: Base (8453) + BNB Chain (56)
- **Poller** runs continuously in background, querying blockchain events on active chains
- **Block Cursor**: DB-persisted (`EscrowCursor`) per chain to track latest block processed
- **5-block Confirmation Buffer**: Re-org safety — only process events confirmed 5+ blocks deep
- **Event Polling**: All 4 event types (QuestFunded, QuestDistributed, QuestRefunded, EmergencyWithdrawal)
- **Idempotent Handlers**: Same event processed multiple times = same result
- **Fire-and-Forget**: Distribute/refund calls fire async, poller reconciles status on next sync
- **Health Endpoint**: `GET /escrow/health` reports poller status, latest blocks per chain, pending events

### Reward Distribution Logic
Distribution is computed based on quest type and participant rankings:
- **FCFS** (`apps/api/src/modules/escrow/distribution-calculator.ts`): First N completed agents split reward equally. Rounding dust goes to first winner.
- **LEADERBOARD**:
  - **With Custom Tiers** (Quest.rewardTiers): Each tier percentage applied to ranked participants (e.g., [40, 25, 15, 20] = 1st=40%, 2nd=25%, 3rd=15%, rest=20% split equally)
  - **Without Tiers** (null/empty): Inverse-rank proportional (rank 1 gets N shares, rank 2 gets N-1, ... rank N gets 1)
- **LUCKY_DRAW**: Crypto-safe random selection (Fisher-Yates with crypto.randomBytes) of N winners, equal split
- **Dust Handling**: Any rounding remainder (from integer division) is added to first recipient; sum invariant always enforced
- **Status Guards**: Only live quests can distribute; reject double-pay (idempotent via DB constraints)

### 4. Stripe Fiat Payment Flow: Sponsor → Platform → Winners
- **Architecture**: Stripe Connect with **Separate Charges and Transfers** model
- **Account type**: Express connected accounts for winners (Stripe handles KYC)
- **Parallel to crypto**: Same 3 flows (Fund, Distribute, Refund) — `fundingMethod` field routes to correct handler

**Flow 4a — Fund Quest (Fiat)**:
- Sponsor selects "Pay with Card" on fund page → API creates Stripe Checkout Session
- Sponsor redirected to Stripe-hosted checkout → pays
- Stripe fires `checkout.session.completed` webhook → API confirms funding, sets quest live

**Flow 4b — Distribute Rewards (Fiat)**:
- Creator/admin triggers distribute → API uses same distribution calculator (FCFS/Leaderboard/Lucky Draw)
- Amounts computed in cents (BigInt), same dust handling as crypto
- For each winner with a connected Stripe account: `stripe.transfers.create()` to their Express account
- `payoutTxHash` field reused for Stripe transfer IDs (differentiated by `fundingMethod`)

**Flow 4c — Refund (Fiat)**:
- Creator/admin triggers refund → API calculates remaining (total - already distributed)
- Issues partial Stripe refund via `stripe.refunds.create()` against original payment_intent
- Webhook `charge.refunded` confirms refund completion

**Winner Onboarding**:
- Winners must connect a Stripe Express account to receive fiat payouts
- `POST /stripe/connect/onboard` creates account + returns Stripe-hosted onboarding URL
- `account.updated` webhook fires when onboarding completes → `stripeConnectedOnboarded = true`
- Winners without connected accounts are skipped during distribution

**Graceful Degradation**: Stripe is optional. If `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` are not set, all Stripe endpoints return 503. Server starts normally.

### 5. Realtime Flow (Future)
- **Dashboard** can subscribe to quest status updates via WebSocket/SSE
- **API** broadcasts events when quests fund, distribute, or refund

## 🏗 Monorepo Layout
We use a **pnpm workspace** monorepo to share types and configuration.

```
/
├── apps/
│   ├── dashboard/       # Vite + React + Tailwind + TanStack Router
│   └── api/             # Fastify + Prisma + Bot Logic
├── packages/
│   └── shared/          # Shared Zod schemas, Types, Utils
├── infra/               # Docker-compose, deployment scripts
├── docs/                # Project documentation
├── package.json         # Root scripts
└── pnpm-workspace.yaml  # Workspace config
```

### Why this layout?
- **Shared Types**: The `shared` package ensures the API and Frontend use the EXACT same validation schemas (Zod).
- **Isolation**: Frontend and Backend are separate apps, deployment is decoupled.
- **Efficiency**: `pnpm` handles dependencies efficiently, saving disk space and install time.
- **Context**: Claude/AI context is clearer when code is separated by domain.

## 🚀 Deployment Strategy

### Frontend
- **Vercel**: Deploys `apps/dashboard` as a static site.
- **Env Vars**: `VITE_API_URL` points to the backend.

### Backend (Always-on)
- **Railway/Fly.io/Render**: Deploys `apps/api` as a Docker container or Node service.
- **Reason**: We need a long-running process for the Telegram bot webhook handler (or poller) and WebSocket connections. Serverless (Vercel functions) is ill-suited for long-lived bot processes or stateful socket connections.

### Database
- **Supabase**: Managed Postgres.
- **Migrations**: Applied via GitHub Actions or locally using `prisma migrate deploy`.

## 🌐 Networking
- **API** listens on `$PORT` (default 3000).
- **Dashboard** runs on port 5173 locally.
- **CORS**: Configured on API to allow Dashboard domain.
