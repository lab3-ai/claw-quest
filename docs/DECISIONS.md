# Architecture Decision Records (ADR)

## ADR-001: Monorepo Structure
- **Context**: We need to share types between API and Frontend to ensure type safety.
- **Decision**: Use `pnpm` workspace with `apps/` and `packages/` folders.
- **Alternatives**: Separate repos (harder to sync types), Nx (too complex for MVP).
- **Consequences**: Easy dependency management, single lint/build process, better DX.

## ADR-002: Backend Runtime
- **Context**: Telegram Bot requires long-polling or webhook handling, and we need WebSocket support for realtime updates.
- **Decision**: "Always-on" Node.js server (Fastify) instead of Serverless Functions.
- **Alternatives**: Vercel Functions (cold starts, execution time limits, no WebSocket).
- **Consequences**: Slightly higher cost ($5/mo on Railway/Fly vs Free tier Vercel), but much more reliable for bots.

## ADR-003: Database
- **Context**: Need relational data, strong consistency, and ease of use.
- **Decision**: Supabase (Postgres).
- **Alternatives**: PlanetScale (MySQL - no foreign keys enforce), Firebase (NoSQL - hard to query complex relationships).
- **Consequences**: Great DX, built-in Auth if we want it (handling custom auth via JWT for now for portability), powerful SQL.

## ADR-004: Telegram Integration
- **Context**: Need to receive messages from Telegram.
- **Decision**: Webhook for Production, Polling for Local Dev.
- **Reason**: Webhooks are more efficient (push vs pull) but require a public URL (SSL). Polling is easier locally without `ngrok`.

## ADR-005: Fiat Payment Provider — Stripe Connect
- **Context**: Need fiat payments alongside existing crypto escrow. 3 flows required: fund quest, distribute to winners, refund to sponsor.
- **Decision**: Stripe Connect with **Express** connected accounts and **Separate Charges and Transfers** model.
- **Alternatives considered**:
  - **Polar.sh**: Can collect payments but cannot distribute to third-party users (winners). Only supports payouts to account owner. Covers 1/3 required flows.
  - **Basic Stripe (no Connect)**: Can collect + refund but cannot transfer to winners. Would require manual payouts. Covers 2/3 required flows.
  - **Stripe Connect with Destination Charges**: Less control over multi-party splits and timing. Not ideal for FCFS/Leaderboard/Lucky Draw distribution patterns.
- **Consequences**: Full control over fund → hold → distribute → refund lifecycle. Winners must complete Stripe Express KYC onboarding to receive payouts. Platform fee configurable via `STRIPE_PLATFORM_FEE_PERCENT`. Express accounts mean Stripe handles all compliance/KYC.

## ADR-006: Auth Strategy
- **Context**: Need to authenticate web users and link them to Telegram users.
- **Decision**: Custom JWT auth on API.
- **Reason**: Maximizes portability. We are not locked into Supabase Auth or Clerk.
- **Linking**: "Activation Code" flow (Web -> Code -> Bot).
