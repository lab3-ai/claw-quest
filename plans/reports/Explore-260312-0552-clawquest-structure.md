# ClawQuest Codebase Scout Report

**Date:** March 12, 2026  
**Status:** Complete  
**Scope:** Project structure, authentication, quest management, routing, API patterns, styling

---

## 1. Project Structure

### Monorepo Layout
```
clawquest/
├── apps/
│   ├── api/                    # Fastify REST API + Telegram bot
│   ├── dashboard/              # React 18 + TanStack Router frontend
│   └── llm-server/             # Hono on Cloudflare Workers (LLM key issuance)
├── packages/
│   ├── shared/                 # Zod schemas + TypeScript types
│   ├── cli/                    # CLI tools
│   └── clawquest-skill/        # Skill definition
├── prisma/                     # Prisma schema (located at root, NOT in apps/api)
└── docs/                       # Architecture & reference docs
```

**Key Detail:** Prisma schema is at `/Users/hd/clawquest/prisma/schema.prisma` (not under apps/api)

### Package Manager
- **pnpm** only (never npm or yarn)
- Workspaces: defined in `pnpm-workspace.yaml`

---

## 2. Frontend (Dashboard)

### Location & Structure
- **Path:** `/Users/hd/clawquest/apps/dashboard/`
- **Tech Stack:** React 18 + TypeScript + Vite + TanStack Router v1 + TanStack Query v5
- **Port (dev):** 5173

### Routing System
**File:** `src/router.tsx` — file-based convention  
**Key Structure:**
- Root route → redirects to `/` (waitlist gating)
- Public routes: `/login`, `/register`, `/quests`, `/quests/:questId`, `/quests/:questId/questers`
- Protected routes (require `useAuth()`):
  - `/dashboard` → User dashboard
  - `/quests/new` → Create quest
  - `/quests/mine` → My quests
  - `/quests/claim` → Claim quest
  - `/quests/:questId/manage` → Manage quest
  - `/quests/:questId/edit` → Edit quest
  - `/agents` → Agent list
  - `/verify` → Verify agent

**Protected Route Pattern:**
```typescript
// Example from _authenticated.tsx
const authenticatedRoute = createRoute({
  getParentRoute: () => rootRoute,
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
})
```

### Authentication Context
**File:** `src/context/AuthContext.tsx`  
**Pattern:**
- Wraps `useAuth()` hook with Supabase Auth
- Provides: `session`, `user`, `isAuthenticated`, `isLoading`, `logout()`
- No API key auth needed for frontend — uses Supabase JWT

**Usage:**
```typescript
const { session, user, isAuthenticated } = useAuth()
```

### Styling System
**CSS Framework:** Tailwind CSS v4.2 (new @tailwindcss/postcss plugin)  
**PostCSS Config:** `postcss.config.js`
```javascript
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

**Design Tokens:** CSS variables in `src/index.css`
- Colors: `--bg`, `--fg`, `--primary`, `--error`, `--success`, `--warning`, `--accent`, etc.
- Sizes: `--text-xs`, `--text-sm`, `--text-base`, `--text-lg`, `--text-xl`, `--text-2xl`, `--text-3xl`
- Spacing: Tailwind defaults with CSS variable overrides

**Component Library:** shadcn/ui (Radix UI primitives)
- Location: `src/components/ui/`
- Components use `cva()` for class variants + `cn()` utility for merging
- Example: `button.tsx` uses CVA with variants (default, destructive, outline, quest, agent, danger, ghost)

**Icons:** MingCute (`@mingcute/react`)
- Line variant for default/hover state
- Fill variant for active state
- Example: `<FlashLine />` vs `<FlashFill />`

**Data Fetching:** TanStack Query (`@tanstack/react-query`)

---

## 3. Backend API (Fastify)

### Location & Structure
- **Path:** `/Users/hd/clawquest/apps/api/`
- **Tech Stack:** Fastify 4 + Prisma ORM + Zod validation + grammY (Telegram bot)
- **Port (dev):** 3000
- **API Docs:** Auto-generated at `/docs` via @fastify/swagger + Scalar

### Modular Architecture
All business logic in `src/modules/`:
- `auth/` — Supabase JWT validation
- `agents/` — Agent registration & management
- **`quests/`** — Quest CRUD, participation, verification
- `stripe/` — Payment processing
- `telegram/` — Bot handlers
- `escrow/` — On-chain escrow management
- `wallets/` — Wallet linking
- `admin/` — Admin routes
- `stats/` — Analytics
- `github-bounty/` — GitHub bounty system

### Quest Module Files
```
quests/
├── quests.routes.ts              # 96KB — Main route handlers
├── quests.service.ts             # 21KB — Business logic
├── quests.publish-validator.ts   # 2.5KB — Publish validation
├── social-action-verifier.ts     # 11KB — Verify social task completion
├── social-validator.ts           # 6.4KB — Validate task params
├── openrouter.service.ts         # 4.4KB — OpenRouter LLM integration
├── llm-key-reward.service.ts     # 2.8KB — LLM key issuance
└── __tests__/                    # Unit tests
```

### Authentication Middleware
**File:** `src/app.ts` — `server.decorate('authenticate', ...)`

**Pattern:** Mixed auth (Supabase JWT + Agent API key)
1. Check Authorization header: `Bearer <token>`
2. Try admin JWT first
3. Fall back to Supabase token verification
4. Find/create Prisma User record
5. Set `request.user` = `{ id, email, username, displayName, supabaseId, role }`

**Code Pattern:**
```typescript
server.decorate('authenticate', async (request, reply) => {
  const token = request.headers.authorization?.slice(7)
  const { data } = await supabaseAdmin.auth.getUser(token)
  // Find/create user in Prisma
  request.user = { id, email, ... }
})
```

### Route Structure Example
From `quests.routes.ts`:
- `GET /` — List quests (public, paginated)
- `GET /:id` — Quest details (supports draft preview via token)
- `POST /` — Create quest (authenticated)
- `PATCH /:id` — Update quest (owner/sponsor only)
- `POST /:id/participate` — Join quest (authenticated)
- `POST /:id/verify` — Verify task completion (authenticated)
- `POST /:id/distribute` — Distribute rewards (owner/admin)

### API Response Pattern
```typescript
// Success
{ data: Quest[] }

// Error
{ error: { message: string, code: string } }
```

### Type Validation
**Framework:** Zod with fastify-type-provider-zod
```typescript
const CreateQuestSchema = QuestSchema.omit({ id: true, ... })
  .extend({ ... })
  .refine(...)

server.post('/quests', { schema: { body: CreateQuestSchema } }, handler)
```

---

## 4. Database Schema (Prisma)

**Location:** `/Users/hd/clawquest/prisma/schema.prisma`  
**ORM:** Prisma 5  
**DB:** PostgreSQL on Supabase  
**Connection:** DATABASE_URL (with pooling) + DIRECT_URL (for migrations)

### Key Models for Quest System

#### Quest
```prisma
model Quest {
  id: String @id @default(uuid())
  title: String
  description: String
  
  type: String // FCFS | LEADERBOARD | LUCKY_DRAW
  status: String // draft | scheduled | live | completed | cancelled | expired
  
  rewardAmount: Decimal
  rewardType: String // USDC | USDT | NATIVE | USD | LLMTOKEN_OPENROUTER | LLM_KEY
  tokenProvider: String? // "openrouter"
  tokenAmount: Decimal?
  
  totalSlots: Int
  filledSlots: Int
  
  tasks: Json // QuestTask[] — social task definitions
  requiredSkills: String[]
  requireVerified: Boolean
  
  // Creator identity (multiple patterns supported)
  creatorUserId: String?
  creatorAgentId: String?
  creatorTelegramId: BigInt?
  creatorEmail: String?
  
  // Ownership & claim tokens
  claimToken: String? @unique
  claimTokenExpiresAt: DateTime?
  claimedAt: DateTime?
  previewToken: String? @unique
  
  // Funding
  fundingMethod: String? // "stripe" | "crypto"
  fundingStatus: String // unfunded | pending | confirmed | refunded
  stripeSessionId: String? @unique
  cryptoTxHash: String?
  cryptoChainId: Int?
  
  // Crypto escrow data
  tokenAddress: String?
  tokenDecimals: Int?
  sponsorWallet: String?
  escrowQuestId: String?
  
  startAt: DateTime?
  expiresAt: DateTime?
  drawTime: DateTime? // LUCKY_DRAW deadline
  
  participations: QuestParticipation[]
  collaborators: QuestCollaborator[]
  deposits: QuestDeposit[]
}
```

#### QuestParticipation
```prisma
model QuestParticipation {
  id: String @id
  questId: String
  userId: String? // null for agent-only
  agentId: String? // null until linked
  
  status: String // in_progress | submitted | completed | failed
  proof: Json?
  tasksCompleted: Int
  tasksTotal: Int
  
  // Reward payout
  payoutAmount: Float?
  payoutStatus: String // na | pending | paid
  payoutTxHash: String?
  payoutWallet: String?
  
  // LLM token reward
  payoutTokenProvider: String? // "openrouter"
  payoutTokenAmount: Decimal?
  payoutTokenApiKey: String?
  payoutTokenStatus: String? // pending_key_creation | key_sent | used | expired
  
  @@unique([questId, userId])
  @@unique([questId, agentId])
}
```

#### QuestCollaborator
```prisma
model QuestCollaborator {
  questId: String
  userId: String?
  inviteToken: String @unique // "collab_<hex>"
  acceptedAt: DateTime? // null = pending
  expiresAt: DateTime // 7-day expiry
}
```

#### User
- `supabaseId` — Linked Supabase auth user
- `telegramId`, `telegramUsername` — Telegram identity
- `xId`, `xHandle`, `xAccessToken`, `xRefreshToken` — X/Twitter OAuth
- `discordId`, `discordHandle` — Discord OAuth
- `githubId`, `githubHandle` — GitHub OAuth
- `stripeConnectedAccountId` — Stripe Connect for payouts
- `stripeCustomerId` — Stripe customer for charges

#### Agent
- `agentApiKey` — Issued on registration (cq_* prefix)
- `activationCode` — For agent claiming
- `verificationToken` — 48h expiry for claim flow
- `TelegramLink` — One-to-one with agent
- `AgentSkill[]` — Skills inventory

### Database Indexes
Quest model has strategic indexes:
- `(status, createdAt)` — For listing by status
- `claimToken`, `previewToken` — For token-based lookups
- `creatorTelegramId`, `creatorAgentId`, `creatorUserId` — For creator queries

---

## 5. Shared Package (Types & Schemas)

**Location:** `/Users/hd/clawquest/packages/shared/src/`

### Key Exports
- `QuestSchema` — Zod schema for Quest model
- `QuestTaskSchema` — Social task definition schema
- `AgentSchema` — Agent data
- `QuestParticipationSchema` — Participation record
- `QUEST_STATUS`, `QUEST_TYPE`, `FUNDING_STATUS` — Enums
- `REWARD_TYPE` — Reward type enum

### Build
```bash
pnpm --filter @clawquest/shared build  # tsup build
```

---

## 6. Quest Lifecycle & Status Flow

### Status Transitions
```
draft → [crypto/fiat funded] → scheduled → [after startAt] → live → completed
  OR
draft → [LLM_KEY reward, no funding] → live → completed
```

### Creator Flows
**Flow A (Human Sponsor):**
1. Create quest (draft)
2. Invite collaborators (sponsors)
3. Fund via Stripe or crypto
4. Quest transitions to scheduled/live
5. Manage & distribute rewards

**Flow B (Agent Creator):**
1. Agent can create quests via activation code
2. Telegram/email claim flow
3. Linked to Prisma User

### Participation Lifecycle
1. User joins quest (POST `/quests/:id/participate`)
2. Complete social tasks (X follow, Discord join, etc.)
3. Submit proof (status = submitted)
4. Verification (manual or automatic)
5. Approved → status = completed
6. Distribution → payoutStatus = pending → paid

---

## 7. Key Patterns & Conventions

### Service Exports
From `quests.service.ts`:
```typescript
export async function isQuestOwnerOrSponsor(prisma, questId, userId, userRole)
export function generateClaimToken(): string
export function generatePreviewToken(): string
export function generateCollabToken(): string
export async function isQuestSponsor(prisma, questId, userId): boolean
export function validateTaskParams(task): string | null
export function validateAllTasks(tasks): string | null
```

### Regex Patterns for Task Validation
```typescript
X_POST_URL_RE = /^https?:\/\/(x\.com|twitter\.com)\/\w+\/status\/\d+/i
X_USERNAME_RE = /^@?[\w]{1,15}$/
DISCORD_INVITE_RE = /^https?:\/\/(discord\.gg|discord\.com\/invite)\/[\w-]+$/i
TELEGRAM_CHANNEL_RE = /^(@[\w]{5,32}|https?:\/\/t\.me\/[\w]+)$/i
```

### Error Handling
Custom error classes in `quests.service.ts`:
- `QuestValidationError`
- `QuestNotFoundError`
- `QuestNotEditableError`
- `QuestForbiddenError`

### Component Patterns (Frontend)
**Data Fetching:**
```typescript
const { data: quests } = useQuery({
  queryKey: ['quests'],
  queryFn: () => fetch('/api/quests').then(r => r.json())
})
```

**Protected Route:**
```typescript
beforeLoad: ({ context }) => {
  if (!context.auth.isAuthenticated) {
    throw redirect({ to: '/login' })
  }
}
```

---

## 8. Styling Approach

### Tailwind First
- New pages use Tailwind utilities exclusively
- Design tokens as CSS variables (no hardcoded arbitrary values)
- Example: Use `text-sm` (14px) instead of `text-[14px]`

### Component Styling
**shadcn/ui pattern:**
```typescript
const buttonVariants = cva("base-classes", {
  variants: {
    variant: { default: "...", outline: "..." },
    size: { sm: "...", lg: "..." }
  }
})

export function Button({ variant, size, className, ...props }) {
  return <button className={cn(buttonVariants({ variant, size }), className)} />
}
```

### CSS Variables
Located in `src/index.css` (Tailwind v4 @theme syntax):
- `--bg`, `--fg` — Base colors
- `--primary`, `--accent` — Brand colors
- `--error`, `--success`, `--warning` — Status colors
- `--border`, `--border-muted`, `--border-heavy` — Border colors
- `--text-xs` through `--text-3xl` — Typography scale

---

## 9. Development Commands

### Root Level
```bash
pnpm dev              # Start API (3000) + Dashboard (5173)
pnpm build            # Build all packages
pnpm lint             # Lint all packages
pnpm db:migrate       # Create migration
pnpm db:seed          # Run seed script
```

### API Specific
```bash
pnpm --filter api dev              # Start with tsx watch
pnpm --filter api build            # Build with tsup
pnpm --filter api db:studio        # Open Prisma Studio GUI
pnpm --filter api db:deploy        # Deploy migrations
```

### Dashboard Specific
```bash
pnpm --filter dashboard dev        # Vite dev server
pnpm --filter dashboard build      # tsc + vite build
pnpm --filter dashboard lint       # ESLint
```

---

## 10. Key Dependencies

### API
- **Fastify 4.26** — Web framework
- **Prisma 5.10** — ORM
- **Zod 3.22** — Validation
- **Supabase 2.45** — Auth backend
- **grammY 1.40** — Telegram bot framework
- **Stripe 20.4** — Payment processing
- **viem 2.46** — Ethereum utilities

### Dashboard
- **React 18.2** — UI framework
- **TanStack Router 1.19** — File-based routing
- **TanStack Query 5.24** — Data fetching
- **Tailwind CSS 4.2** — Styling
- **Vite 5.1** — Build tool
- **Supabase JS 2.97** — Auth client
- **Wagmi 2.19** — Web3 hooks
- **MingCute Icons** — Icon set

---

## Summary

### Frontend Architecture
- **Router:** TanStack Router (file-based)
- **Auth:** Supabase JWT via useAuth()
- **Styling:** Tailwind CSS v4 + shadcn/ui + CSS variables
- **Data:** TanStack Query
- **Icons:** MingCute (Line/Fill variants)

### Backend Architecture
- **Framework:** Fastify with Zod validation
- **Auth:** Supabase JWT + Agent API keys
- **ORM:** Prisma (PostgreSQL)
- **Modules:** Modulith pattern (business logic in modules/)
- **Validation:** Regex patterns for social tasks

### Key Locations
- Routes: `apps/dashboard/src/routes/`
- API: `apps/api/src/modules/`
- Schemas: `packages/shared/src/`
- Prisma: `/prisma/schema.prisma`
- Styling: `apps/dashboard/src/index.css` + components/ui/
- Components: `apps/dashboard/src/components/`

---

## Unresolved Questions

1. Where is tailwind.config.js exactly? (components.json references it but file not found in typical locations)
2. How is the LLM reward key issuance workflow exactly integrated with OpenRouter?
3. What is the exact validation flow for social task proofs?
