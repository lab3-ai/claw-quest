# Monorepo Restructure: Integrate clawquest-admin into pnpm workspace

**Date**: 2026-03-17
**Status**: Draft
**Author**: Claude (brainstorming session)

## Problem

`clawquest-admin` is a standalone React app (npm, separate git repo) that connects to the same API and Supabase project as the main monorepo. This creates friction:

- No shared types between admin and the rest of the platform
- Separate dependency management (npm vs pnpm)
- No unified CI/CD strategy
- Code duplication for common schemas/types

## Goal

Integrate `clawquest-admin` into the `clawquest` pnpm monorepo as `apps/admin`, with independent CI/CD per app via GitHub Actions path-based triggers.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Account | Keep `leeknowsai` | No need for new org |
| Approach | Monorepo + path-based CI/CD | Best DX, simplest, CI/CD independence via GitHub Actions |
| Shared package | Keep in monorepo workspace | Direct workspace reference, no publishing overhead |
| Admin integration | Merge into pnpm workspace | Unified tooling, shared types access |
| Git history | Fresh start | Copy code, archive old repo |
| Shared types | Add `@clawquest/shared` dep | Enable type sharing between admin and API |

## Final Structure

```
clawquest/
├── apps/
│   ├── api/              # Fastify API → Railway
│   ├── dashboard/        # React 18 + Tailwind v3 → Vercel
│   ├── admin/            # React 19 + Tailwind v4 → Vercel (separate project)
│   ├── llm-server/       # Hono → Cloudflare Workers
│   ├── mcp/              # MCP server
│   ├── clawquest-skill/  # Skill app
│   └── exports/          # Exports
├── packages/
│   ├── shared/           # Zod schemas + TypeScript types
│   ├── cli/              # CLI tool
│   └── clawquest-skill/  # Skill package
├── contracts/            # Solidity (submodules: forge-std, openzeppelin)
├── .github/
│   └── workflows/
│       ├── api-deploy.yml
│       ├── dashboard-deploy.yml
│       ├── admin-deploy.yml
│       └── shared-build.yml
├── pnpm-workspace.yaml   # already has apps/* and packages/*
└── package.json
```

## Admin App Migration Details

### What changes

1. **Location**: `clawquest-admin/` → `clawquest/apps/admin/`
2. **Package manager**: npm → pnpm (delete `package-lock.json`)
3. **Package name**: → `@clawquest/admin`
4. **New dependency**: `@clawquest/shared: "workspace:*"`
5. **Vercel**: Separate Vercel project, `vercel.json` in `apps/admin/` (must add monorepo-aware build commands)
6. **`.npmrc`**: Create root `.npmrc` with `strict-peer-dependencies=false` to handle React 18 vs 19 coexistence

### Known version differences (intentional)

| Package | Dashboard | Admin | Risk |
|---------|-----------|-------|------|
| React | 18 | 19 | pnpm isolates per-app, `.npmrc` ensures peer deps don't conflict |
| Tailwind | v3 | v4 | Separate configs, no conflict |
| Vite | 5.x | 7.x | Separate configs, no conflict |
| ESLint | 8 (legacy) | 9 (flat) | Each app runs own eslint, no conflict |
| TypeScript | ^5.3.3 | ~5.9.3 | Shared package outputs compiled `.d.ts`, compatible |

### What stays the same

- React 19, Tailwind v4, Lucide icons (different from dashboard — intentional)
- All source code, components, pages, API client
- Auth flow (Supabase + admin role check)
- Environment variables (.env in apps/admin/)
- TanStack Router/Query/Table, Recharts, react-hook-form + zod

### Files to copy

```
From clawquest-admin/        → To clawquest/apps/admin/
├── src/                     → src/
├── public/                  → public/
├── index.html               → index.html
├── vite.config.ts           → vite.config.ts
├── tsconfig.json            → tsconfig.json
├── tsconfig.app.json        → tsconfig.app.json
├── tsconfig.node.json       → tsconfig.node.json
├── eslint.config.js         → eslint.config.js
├── components.json          → components.json
├── vercel.json              → vercel.json (modified for monorepo)
├── .env.sample              → .env.sample
└── package.json             → package.json (modified)
```

**Excluded**: `.git/`, `node_modules/`, `dist/`, `.env`, `package-lock.json`

### package.json modifications

```jsonc
{
  "name": "@clawquest/admin",
  // keep all existing dependencies
  "dependencies": {
    // ... existing deps unchanged ...
    "@clawquest/shared": "workspace:*"  // ADD
  }
}
```

### vercel.json modifications (for monorepo context)

```jsonc
{
  "framework": "vite",
  "installCommand": "pnpm install --frozen-lockfile",
  "buildCommand": "pnpm --filter @clawquest/shared build && pnpm --filter @clawquest/admin build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### .env.sample (must include all vars)

```
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_LLM_SERVER_URL=
VITE_LLM_ADMIN_KEY=
```

### Root .npmrc (create if not exists)

```ini
strict-peer-dependencies=false
```

## CI/CD Design

### Principle

Each app deploys independently. A change to `apps/api/` does NOT trigger dashboard or admin deploys. Changes to `packages/shared/` trigger all dependent apps.

### Workflow: api-deploy.yml

```yaml
name: Deploy API
on:
  push:
    branches: [main]
    paths:
      - 'apps/api/**'
      - 'packages/shared/**'
      - 'pnpm-lock.yaml'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @clawquest/shared build
      - run: pnpm --filter @clawquest/api build
      # Deploy to Railway via railway CLI or webhook
```

### Workflow: dashboard-deploy.yml

```yaml
name: Deploy Dashboard
on:
  push:
    branches: [main]
    paths:
      - 'apps/dashboard/**'
      - 'packages/shared/**'
      - 'pnpm-lock.yaml'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @clawquest/shared build
      - run: pnpm --filter @clawquest/dashboard build
      # Deploy to Vercel via vercel CLI
```

### Workflow: admin-deploy.yml

```yaml
name: Deploy Admin
on:
  push:
    branches: [main]
    paths:
      - 'apps/admin/**'
      - 'packages/shared/**'
      - 'pnpm-lock.yaml'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @clawquest/shared build
      - run: pnpm --filter @clawquest/admin build
      # Deploy to Vercel (separate project) via vercel CLI
```

### Workflow: shared-build.yml

```yaml
name: Build Shared
on:
  push:
    branches: [main]
    paths:
      - 'packages/shared/**'
  pull_request:
    paths:
      - 'packages/shared/**'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @clawquest/shared build
      - run: pnpm --filter @clawquest/shared test
```

## Documentation Updates

### Root CLAUDE.md

Add `apps/admin` section with:
- Dev command: `pnpm --filter @clawquest/admin dev`
- Stack differences table (already exists, extend)
- Note about separate Vercel project

### apps/admin/CLAUDE.md

Create from existing `clawquest-admin/CLAUDE.md`, update:
- Commands use `pnpm` instead of `npm`
- Reference `@clawquest/shared` workspace dependency
- Note path-based CI/CD trigger rules

## Verification

1. `pnpm install` from root — no errors
2. `pnpm --filter @clawquest/shared build` — shared types build
3. `pnpm --filter @clawquest/admin dev` — admin dev server starts on port 5174
4. `pnpm --filter @clawquest/admin build` — production build succeeds
5. `pnpm --filter @clawquest/admin lint` — no lint errors
6. All existing apps still work: `pnpm dev` runs api + dashboard
7. Verify admin can import from `@clawquest/shared` (optional, for future use)

## Additional tasks

- Add `"dev:admin": "pnpm --filter @clawquest/admin dev"` to root `package.json` scripts
- Fix existing dashboard `vercel.json` bug: change `"buildCommand": "npm run build"` → use pnpm
- Verify `components.json` (shadcn config) paths resolve correctly after relocation
- Archive `leeknowsai/clawquest-admin` repo on GitHub after migration verified

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| React 18 vs 19 peer dep conflicts | `.npmrc` with `strict-peer-dependencies=false`, pnpm per-app isolation |
| Tailwind v3 vs v4 conflict | Each app has own config, no conflict |
| Vercel auto-detect wrong app | `vercel.json` per-app with monorepo-aware build commands |
| Shared package breaking changes | `shared-build.yml` runs on both PRs and pushes |
| shadcn component paths break after move | Verify `components.json` aliases still resolve |
