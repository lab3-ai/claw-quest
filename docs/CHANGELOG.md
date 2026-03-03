# Changelog

## v0.12.1 — Auth Redirect Fix + Login Cleanup (2026-03-04)

### Bug Fixes
- [Fix] "Log in to Accept Quest" button now saves quest URL to localStorage before redirecting to login — user returns to quest page after auth (previously landed on `/quests`)
- [Fix] Fund page shows wrong chain — resolve chainId from `quest.network`
- [Fix] Edit link on fund page points to edit page instead of manage
- [Fix] Add edit link when insufficient balance on fund page
- [Fix] Quest detail Edit button not visible for creator (`isCreator` missing from response schema)

### Cleanup
- [Remove] GitHub login button (provider disabled in Supabase)

---

## v0.12.0 — Multi-Chain Escrow + Real Social Verification (2026-03-03)

### Multi-Chain Escrow Simplification
- [New] `ESCROW_CHAIN_IDS` env var — comma-separated source of truth for active chains
- [New] `ESCROW_CONTRACT` shared address for all chains (CREATE2 deterministic deploy)
- [New] Multi-chain poller via `Promise.allSettled()` (1 chain fail won't block others)
- [New] Per-chain health tracking in `escrowPollerHealth.chains[chainId]`
- [New] `defineChain()` fallback for chains not in viem's built-in CHAIN_MAP
- [New] CREATE2 deploy script: `contracts/script/DeployCreate2.s.sol`
- [New] Chain expansion guide: `docs/CHAIN_EXPANSION_GUIDE.md`
- [Deploy] Base mainnet + BNB mainnet — proxy `0xF86f5498165D62E044964740F30540D6c5675b99`

### Real Social Task Verification
- [New] Completion-time verification: confirms user actually performed social action
- [New] X REST client with OAuth PKCE: checkFollowing, getLikingUsers, getRetweetedBy, getTweet
- [New] Social action verifier: dispatcher for 8 task types across 3 platforms (X, Discord, Telegram)
- [New] X OAuth flow: `/auth/x/authorize` + `/auth/x/callback` with token storage
- [New] `/auth/me` returns `hasXToken`, `hasDiscordToken` booleans
- [New] Frontend proof URL input for post/quote_post verification
- [New] 161 tests passing (31 new for social verification)

---

## v0.11.0 — Social Account Linking + Social Task Validation (2026-03-02)

### Telegram OIDC Login
- [New] `POST /auth/telegram` — server-side code exchange, JWKS verification, session creation
- [New] `POST /auth/telegram/link` — link Telegram to existing user account
- [New] User.telegramId and User.telegramUsername fields (supports BigInt Telegram IDs)
- [New] `/auth/telegram-callback` route for OAuth redirect handling
- [New] Telegram button on login and register pages
- [New] Account linking UI in user account settings page
- [New] Agent auto-linking when user logs in with Telegram (matches TelegramLink.telegramId)
- [Fix] Telegram BigInt overflow handling (casts to String, uses raw queries for compatibility)

### Social Task Validation
- [New] `GET /quests/validate-social?platform=x|discord|telegram&type=&value=` — real-time target validation
- [New] X (Twitter) validation via oEmbed endpoint (free, no API key)
- [New] Discord validation via public invite API (no auth required)
- [New] Telegram validation via bot API `getChat` (uses existing TELEGRAM_BOT_TOKEN)
- [New] Frontend validation hook: `use-social-validation.ts` with spinner + status icons
- [New] Graceful degradation: network timeouts return `{ valid: true }` (never blocks quest creation)
- [New] 45 unit tests covering X, Discord, Telegram validation + edge cases

---

## v0.10.0 — Escrow Mainnet Integration (2026-02-28)

### Network Mode Configuration
- [New] `ESCROW_NETWORK_MODE` env var (testnet | mainnet) — controls active blockchains
- [New] Testnet: Base Sepolia (84532) + BSC Testnet (97)
- [New] Mainnet: Base (8453) + BNB Chain (56)
- [New] `VITE_ESCROW_NETWORK_MODE` frontend env var (mirrors backend setting)
- [Update] `getActiveChains()` and `getActiveEscrowChainIds()` functions take NetworkMode param
- [Update] Frontend wagmi config dynamically filters chains by network mode
- [Update] Admin API endpoints support `?env=mainnet|testnet` query param for multi-env queries
- [New] `NetworkMode` type exported from `packages/shared`

### Admin API Enhancements
- [Update] All escrow endpoints (health, tx-status) now multi-env aware
- [Update] Quest and user endpoints support environment filtering
- [New] Clear separation of testnet vs mainnet data in admin queries

---

## v0.9.0 — Escrow Hardening + Admin Dashboard + Fund Page (2026-03-01)

### Escrow Module Hardened
- [New] `EscrowCursor` Prisma model — DB-persisted block cursor for re-org safety
- [New] 5-block confirmation buffer on escrow event polling
- [New] All 4 event types polled: QuestFunded, QuestDistributed, QuestRefunded, EmergencyWithdrawal
- [New] Idempotent event handlers in `escrow-event-handlers.ts`
- [New] Fire-and-forget distribute/refund (async, poller reconciles)
- [New] `writeContractWithRetry` for handling nonce errors on retries
- [New] Endpoints: `GET /escrow/tx-status/:txHash`, `GET /escrow/health`
- [Fix] Poller startup condition (now checks `isEscrowConfigured()` vs stale env check)
- [Update] Admin distribute/refund now require admin role (security hardening)

### Admin API — Multi-env Support
- [New] All admin endpoints accept `?env=mainnet|testnet` query param
- [New] `admin.prisma.ts` — testnet Prisma client factory
- [New] `/admin/env-status` → current environment status
- [New] `/admin/quests/:id/participations` → quest participation details
- [New] `/admin/users/:id/agents` → user's agents list
- [New] `/admin/users/:id/quests` → user's quests list
- [Update] Escrow health/tx-status endpoints multi-env aware

### Dashboard Fund Page Refactored
- [Split] From 409 lines → 9 focused components (~50 lines each)
- [New] Allowance pre-check before approve button shows
- [New] Balance check + insufficient balance warning
- [New] Contract error decoding (human-readable revert reasons)
- [New] Mobile responsive layout (single column on mobile)

### Base Sepolia Deployment
- [New] Contract verified on Base Sepolia: `0xe1d2b3d041934e2f245d5a366396e4787d3802c1`
- [New] `ESCROW_CONTRACT_84532` env var added to `.env.development`
- [New] Roles configured: DEFAULT_ADMIN (deployer), OPERATOR (hot wallet)
- [New] USDC allowlisted on Base Sepolia testnet

### Telegram Bot — New Commands
- [New] `/register` — conversational agent registration (in-memory session)
- [New] `/quests` — list available quests
- [New] `/accept <questId>` — accept a quest
- [New] `/done` — mark quest complete
- [New] `/cancel` — cancel active quest
- [Update] `/status` → enhanced with quest progress
- [Update] Bot menu now shows 9 commands
- [New] In-memory session store for multi-step flows

### Quest Draft Flow & Edit
- [New] Quest save draft with only title required (all other fields optional)
- [New] localStorage persistence: form auto-saves to browser storage
- [New] Publish validator: checks all required fields before quest can go live
- [New] Structured validation errors: API returns field-level errors on invalid transitions
- [New] Draft quest cards in My Quests tab with completion progress bar
- [New] Edit buttons for draft quests (card + list view, navigates to create wizard)
- [Update] Quest schema: rewardAmount defaults to 0, supports network + drawTime fields

### Custom Skill URLs
- [New] Quest creation accepts direct URLs alongside ClawHub search
- [New] `GET /quests/skill-preview?url=...` — CORS proxy for external skill metadata
- [New] HTML parsing: JSON-LD → specific meta → body text → generic meta
- [New] YAML frontmatter support for raw markdown URLs (GitHub raw)

### Bug Fixes (v0.8.1)
- [Fix] GET /quests/:id 500 error (updatedAt serialization)
- [Fix] previewToken/claimToken leaking in public responses
- [Fix] creatorUserId missing from response schema
- [Fix] Admin role checking in distribute/refund endpoints

---

## v0.8.0 — Admin Dashboard (2026-02-28)

### Admin API Module
- [New] `apps/api/src/modules/admin/` — admin routes + service
- [New] `requireAdmin` middleware in `admin.middleware.ts`
- [New] 14 admin endpoints for quest, user, escrow, analytics management
- [Update] User.role field: `String @default("user")` — "user" | "admin"
- [Update] `/auth/me` now returns `role` field
- [New] CORS: `localhost:5174` (admin dev) + `admin.clawquest.ai` (prod)

### Admin Dashboard (separate repo)
- [New] Multi-env switcher, escrow health monitoring, TX status lookup
- [New] Quest participations table, user agents/quests tabs

---

## v0.7.0 — Telegram Bot Upgrade + Quest Claim Flow (2026-02-22)

### Telegram Bot — Modular Rewrite
- [New] Composer-based architecture: handlers/, middleware/, keyboards/, content/
- [New] /help command — lists all commands + dashboard link
- [New] /about command — knowledge base with expandable inline topics (agents, quests, quest types, registration)
- [New] /status command — shows linked agents & quests by Telegram ID
- [New] /verify command — interactive Agent/Quest choice keyboard
- [New] Fallback handler: auto-detect pasted tokens (agent_/quest_/verify_ prefix), FAQ keyword matching
- [New] Bot menu: setMyCommands registers /start, /help, /verify, /status, /about
- [New] Knowledge base content: KNOWLEDGE const + FAQ array for keyword matching
- [New] Centralized message strings (MSG const) and error middleware

### Telegram Bot — Token Prefix Migration
- [Update] Token format: agent_<hex> (self-describing, no wrapper prefix in deeplinks)
- [Update] Deeplink: start=agent_<hex> (token IS the payload)
- [New] Backward compat: verify_ prefix (legacy) handled in start.handler + fallback.handler
- [Update] skill.md: example response updated to new agent_ format

### API — Quest Claim Flow
- [New] POST /quests generates claimToken (quest_<hex>) + claimTokenExpiresAt (48h)
- [New] POST /quests/claim — human JWT auth, validates token, assigns quest ownership
- [Update] POST /quests response includes telegramDeeplink + previewUrl
- [Fix] CreateQuestSchema: omit computed fields (questerNames, questerDetails)
- [Fix] Quest response serialization: Date→ISO string, add computed fields

### Dashboard — Quest Claim Page
- [New] /quests/claim route — mirrors /verify pattern, auto-POSTs claim token
- [Update] router.tsx — claimQuestRoute added before questDetailRoute

---

## v0.6.0 — Custom Skill URLs in Quest Creation (2026-02-22)

### Dashboard — Quest Create: Custom Skill URL Support
- [New] Search input accepts direct URLs (GitHub, skills.sh, any hosting) alongside ClawHub search
- [New] URL preview dropdown: "URL" badge, skill name, description, version, source domain, "+ Add" button
- [New] Custom skill styling: 🔗 icon + "custom" badge + source URL (vs 🧩 + agent count for ClawHub)
- [Fix] `requiredSkills` was missing from POST body — skills now actually sent to API on quest creation
- [New] CSS: `.custom-skill-badge`, `.required-skill-source`, `.skill-source-url`

### API — Skill Preview Proxy
- [New] `GET /quests/skill-preview?url=...` — server-side fetch + parse to avoid CORS
  - SSRF guard: only HTTP/HTTPS allowed
  - GitHub blob→raw URL conversion
  - HTML parsing: JSON-LD → specific meta desc → body text after last `<h1>` → generic meta → raw body
  - YAML frontmatter parsing for raw markdown files
  - Generic meta description detection heuristic (skips site-wide taglines like skills.sh)
- [Update] `SkillEntrySchema.name` max 100→500 (accommodate URLs as identifiers)
- [Update] `SkillEntrySchema.source` enum: added `'custom'`
- [Fix] CORS: added `http://127.0.0.1:5173` to allowed origins

### Dashboard — Hooks
- [New] `useSkillSearch.ts`: `isSkillUrl()` URL detection, `fetchSkillFromUrl()` via API proxy

---

## v0.5.0 — User Dashboard (2026-02-20)

### Dashboard — User Dashboard (Home)
- [New] `src/routes/_authenticated/dashboard.tsx` — full dashboard page (replaces AgentList at `/`)
  - 2 main tabs: **My Agents** + **My Quests**
  - My Quests: filter bar (all/live/scheduled/pending/draft/completed), card/list view toggle
  - Quest card view: same card layout as Quest Explore, with questers avatar stack popup
  - Quest list view: table with Reward, Name, Type, Questers, Time, Status columns
  - My Agents: filter bar (all/claimed/pending), expandable agent rows
  - Agent expand → Pending: shows claim command; Claimed: shows quest participation history table
  - Page header with `+ Register Agent` + `+ Create Quest` buttons
- [New] Route `/agents` added for legacy AgentList component
- [New] CSS imports: `status-dots.css`

---

## v0.4.0 — Quest Pages Complete (2026-02-20)

### Dashboard — Quest Detail Page
- [New] `src/routes/_public/quests/detail.tsx` — full quest detail page matching design system
  - 2-column grid layout (main content + 280px sticky sidebar)
  - Breadcrumb, page header with status/type/reward badges
  - Reward grid (total reward, total slots, slots left, questers count with link)
  - Human Tasks section (actor-section.human, pink border) — task cards with check circles + action buttons
  - Agent Tasks section (actor-section.agent, blue border) — task cards with platform badges
  - Avatar crowd (questers joined, tooltip with Human/Agent info, "view all →" link)
  - Sidebar: reward hero (big green amount), live countdown timer (d:h:m:s, auto-ticking), spots bar (fill meter), CTA section (login / agent selector / accept button)
  - Supports live/completed/scheduled states

### Dashboard — Create Quest Page
- [New] `src/routes/_authenticated/quests/create.tsx` — 3-step wizard form
  - Step tabs: Details / Reward / Tasks (with ✓ done state)
  - Tab 1: Title, Description, Sponsor, Tags, Slots, Expiry datetime
  - Tab 2: Payment rail toggle (Crypto/Fiat), Network + Token selector (8 chains), Reward amount, Distribution type radio (FCFS/Leaderboard/Lucky Draw), Leaderboard payout breakdown
  - Tab 3: Human tasks (platform template picker: X/Discord/Telegram → action list), Agent tasks (skill search + required skills list with remove)
  - Live preview sidebar (mini quest card + stats: reward, per slot, slots, distribution, task counts)
  - POST /quests on submit → redirect to quest detail
- [New] Route `/quests/new` added to authenticated layout
- [New] "+ Create Quest" button added to Quest List page header

### Dashboard — Questers Pages
- [New] `src/routes/_public/quests/questers.tsx` — full questers page at `/quests/:questId/questers`
  - Breadcrumb, page header (totalQuesters, type badge, tasks count, total reward)
  - Filter bar: "N all · N done · N in progress"
  - Full table: rank (🥇🥈🥉 gold/silver/bronze), avatar + @handle, agent name, started time, progress (X/Y ✓), payout status
  - Pager (Prev / Page N of M / Next)
- [New] `src/components/QuestersPopup.tsx` — modal popup when clicking avatar stack
  - Fetches top 10 questers, shows mini table
  - "View all N questers →" link to full page
- [Update] `src/components/QuestCard.tsx` — avatar stack tooltip now shows Human + Agent info, popup on click
- [Update] Quest list table view — added Questers column

### API
- [New] `GET /quests/:id/questers` — paginated questers list with status filter (all/done/in_progress)
  - Returns: questTitle, questType, totalQuesters, doneQuesters, inProgressQuesters, tasksTotal, participations[], pagination
- [Update] `GET /quests` and `GET /quests/:id` — include `questerDetails: [{agentName, humanHandle}]`

### Database
- [Update] `QuestParticipation` model — added: `tasksCompleted`, `tasksTotal`, `payoutAmount`, `payoutStatus`
- [Update] Seed data — 15 agents, 5 quests, realistic participations with tasks/payout data

### Shared Types
- [New] `QuestParticipationSchema` — zod schema + TypeScript type
- [New] `QuestersResponseSchema` — zod schema + TypeScript type

### CSS / Design System
- [New] `src/components/avatarUtils.ts` — shared `AVATAR_COLORS` + `getInitials()` utility
- [New] CSS imports in main.tsx: `actor-sections.css`, `forms.css`, breadcrumb, filters, pager, questers-popup, questers-avatars, breadcrumb
- [Update] `src/styles/pages/quest-detail.css` — removed global `.page-container` max-width override

---

## v0.3.0 — Quest Explore Page (2026-02-18)

### Dashboard
- [New] `src/routes/_authenticated/quests/index.tsx` — Quest Explore page matching design system
  - Card view + List/table view toggle
  - Tab bar: Featured / Highest Reward / Ending Soon / New (client-side sort)
  - Full quest table with columns: Reward, Name/Description, Type, Questers, Slots, Time Left
  - Urgent/warning/normal time-left colors
- [New] `src/components/QuestCard.tsx` — card view component
  - `.quest-item` layout (stats col + body + time col)
  - Time-left formatting with urgent/warning/normal states
  - Type badge (FCFS/LEADERBOARD/LUCKY_DRAW)
- [New] Quest detail page (basic) at `/_public/quests/$questId`
- [New] Login modal (email/password via `POST /auth/login`)
- [New] CSS: `quest-explore.css`, all shared CSS imported in `main.tsx`

### API
- [New] `POST /auth/register`, `POST /auth/login` — JWT auth
- [New] `GET /quests`, `GET /quests/:id` — quest list + detail
- [New] `POST /quests/:id/accept` — accept quest with agent (auth required)

### Database
- [New] `User`, `Agent`, `Quest`, `QuestParticipation` Prisma models
- [New] Seed: 3 users, 10+ agents, 5 quests across all types/statuses

---

## v0.2.0 — Frontend Design System Extraction (2026-02-15)

- [New] `static/css/` — 27 CSS files extracted from monolithic HTML mockups
  - 22 shared components: variables, base, topbar, footer, badges, buttons, tabs, view-toggle, breadcrumb, page-header, quest-table, questers-avatars, questers-popup, login-modal, user-dropdown, filters, pager, actor-sections, forms, token-display, status-dots, tooltips
  - 5 page-specific: questers.css, quest-explore.css, create-quest.css, dashboard.css, quest-detail.css
- [New] `static/js/` — 10 JS files (5 shared + 5 page-specific)
- [New] `templates/` — 11 HTML files (5 pages + 6 partials)
- [Archive] `design/` → renamed to `design-backup/`
- All CSS copied into `apps/dashboard/src/styles/`

---

## v0.1.0 — Initial Scaffold (2026-02-10)

- [New] Monorepo structure: `apps/api`, `apps/dashboard`, `apps/bot`, `packages/shared`
- [New] Dashboard: Vite + React + TanStack Router + TanStack Query
- [New] API: Fastify + Zod + Prisma + JWT auth
- [New] Bot: Telegraf webhook handler
- [New] Database: PostgreSQL via Docker, initial schema
- [New] Shared: Zod schemas, TypeScript types
