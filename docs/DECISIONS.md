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

## ADR-005: Auth Strategy
- **Context**: Need to authenticate web users and link them to Telegram users.
- **Decision**: Custom JWT auth on API.
- **Reason**: Maximizes portability. We are not locked into Supabase Auth or Clerk.
- **Linking**: "Activation Code" flow (Web -> Code -> Bot).
