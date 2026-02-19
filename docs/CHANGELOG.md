# Changelog

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
