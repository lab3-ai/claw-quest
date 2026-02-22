# Deployment — Vercel, Railway, Supabase

ClawQuest uses a three-platform deployment strategy, each chosen for its strengths.

## Architecture Overview

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Vercel     │     │   Railway    │     │   Supabase   │
│  (Dashboard) │     │  (API + Bot) │     │  (Database)  │
│  Static SPA  │────▶│  Always-on   │────▶│  PostgreSQL  │
└──────────────┘     └──────────────┘     └──────────────┘
```

## Frontend — Vercel

The dashboard (`apps/dashboard`) deploys as a static Vite SPA on Vercel.

| Setting | Value |
| --- | --- |
| Framework | Vite |
| Build command | `pnpm build` |
| Output directory | `dist` |
| Node version | 20 |

### Environment Variables

| Variable | Description |
| --- | --- |
| `VITE_API_URL` | Backend API URL (e.g., `https://api.clawquest.ai`) |

Vercel auto-deploys on push to `main`. Preview deployments are created for pull requests.

## Backend — Railway

The API server (`apps/api`) and Telegram bot deploy as an always-on service on Railway.

| Setting | Value |
| --- | --- |
| Service type | Web Service (always-on) |
| Build | Docker or `pnpm build` |
| Start command | `node dist/main.js` |
| Port | `$PORT` (default 3000) |

### Why Always-On?

The Telegram bot requires a persistent webhook handler. Serverless functions (like Vercel Functions) have cold starts and execution time limits that make them unsuitable for:

- Telegram webhook processing
- WebSocket connections
- Long-running bot operations

### Environment Variables

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | Supabase connection string (transaction pool) |
| `JWT_SECRET` | Random 32-character string for JWT signing |
| `TELEGRAM_BOT_TOKEN` | Token from BotFather |
| `FRONTEND_URL` | Dashboard URL for CORS (e.g., `https://clawquest.ai`) |

## Database — Supabase

PostgreSQL hosted on Supabase with connection pooling.

### Migrations

Prisma manages the database schema:

```bash
# Apply migrations in production
npx prisma migrate deploy

# Generate client after schema changes
npx prisma generate
```

Migrations can be applied via CI/CD pipeline (GitHub Actions) or manually.

## CI/CD Pipeline

### Stage 1 — Check

```bash
pnpm typecheck    # TypeScript type checking
pnpm lint         # ESLint
pnpm test         # Unit tests
```

### Stage 2 — Build & Push

```bash
docker build -t api .    # Build API Docker image
# Push to container registry
```

### Stage 3 — Deploy

- Railway pulls the new image and restarts the service
- Vercel auto-deploys from the `main` branch

## Domain Configuration

| Subdomain | Service | Platform |
| --- | --- | --- |
| `clawquest.ai` | Dashboard | Vercel |
| `api.clawquest.ai` | API Server | Railway |
| `docs.clawquest.ai` | Documentation | GitBook |

## CORS Configuration

The API server allows requests from:

- Production dashboard domain
- `http://localhost:5173` (local development)
- `http://127.0.0.1:5173` (local development)
