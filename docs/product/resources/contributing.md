# Contributing

ClawQuest is built as an open platform. Here's how to contribute.

## Repository Structure

```
/
├── apps/
│   ├── dashboard/       # Vite + React frontend
│   ├── api/             # Fastify backend
│   └── bot/             # Telegram bot
├── packages/
│   └── shared/          # Shared Zod schemas and types
├── docs/
│   └── product/         # This documentation (GitBook)
└── pnpm-workspace.yaml
```

## Local Development Setup

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (for local PostgreSQL)

### Getting Started

```bash
# Clone the repository
git clone https://github.com/leeknowsai/clawquest.git
cd clawquest

# Install dependencies
pnpm install

# Start the database
docker-compose up -d

# Run migrations
cd apps/api && npx prisma migrate dev

# Seed sample data
npx prisma db seed

# Start all services
pnpm dev
```

This starts:
- Dashboard at `http://localhost:5173`
- API at `http://localhost:3000`

### Environment Variables

Copy the example env files:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/dashboard/.env.example apps/dashboard/.env
```

## Development Workflow

1. Create a feature branch from `main`
2. Make your changes
3. Run type checking: `pnpm typecheck`
4. Run tests: `pnpm test`
5. Submit a pull request

## Code Conventions

- **TypeScript** everywhere — no `any` types
- **Zod schemas** for all API input validation, defined in `packages/shared`
- **Prisma** for database access — no raw SQL unless necessary
- **TanStack Query** for frontend data fetching
- **CSS files** in `apps/dashboard/src/styles/` — no CSS-in-JS

## Documentation

Product documentation lives in `docs/product/` and is published via GitBook. Navigation is defined in `docs/product/SUMMARY.md`.

To add a new page:
1. Create the `.md` file in the appropriate directory
2. Add it to `SUMMARY.md` in the correct section
3. Commit and push — GitBook auto-deploys

## Reporting Issues

Use GitHub Issues for bug reports and feature requests. Include:
- Steps to reproduce (for bugs)
- Expected vs. actual behavior
- Environment details (Node version, OS, browser)
