# System Architecture

## Overview
ClawQuest uses a modern, type-safe stack designed for reliability and ease of deployment.

```ascii
+-----------------------+       +-------------------------+
|   Telegram User       |       |       Web Admin         |
|   (Mobile/Desktop)    |       |      (Browser)          |
+-----------+-----------+       +-----------+-------------+
            |                               |
            | TG Webhook                    | HTTPS / WSS
            v                               v
+-----------------------+       +-------------------------+
|   Telegram Bot API    |       |   Dashboard (Vite SPA)  |
+-----------+-----------+       +-----------+-------------+
            |                               |
            | Webhook Payload               | API Requests
            v                               v
+---------------------------------------------------------+
|                    API Server (Fastify)                 |
|  - Auth (JWT/Session)                                   |
|  - Bot Logic / Command Handler                          |
|  - Business Logic (Quests, Agents)                      |
|  - Realtime (WebSocket/SSE)                             |
+---------------------------+-----------------------------+
                            |
           +----------------+----------------+
           |                                 |
           v                                 v
+-----------------------+       +-------------------------+
|   Postgres DB         |       |   External LLM APIs     |
|   (Supabase)          |       |   (OpenAI/Anthropic)    |
+-----------------------+       +-------------------------+
```

## 🔄 Data Flows

### 1. Dashboard ↔ API ↔ Supabase
- **Dashboard** is a Vite SPA. It fetches data via **TanStack Query** from the Fastify API.
- **API** validates requests using **Zod**, checks auth, and interacts with **Postgres** via **Prisma**.
- **Supabase** hosts the Postgres DB. We use connection pooling (Supabase Transaction Pool or Prisma Accelerate) for efficiency.

### 2. Bot Flow: Telegram ↔ API
- Telegram sends updates via **Webhook** to the API.
- API validates the request signature (optional but recommended) or secret token.
- API processes the message, updates state in DB, and responds via Telegram API.

### 3. Realtime Flow
- **Dashboard** subscribes to specific events (e.g., "Quest Completed") via WebSocket/SSE exposed by Fastify.
- **API** broadcasts events when specific actions occur.

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
