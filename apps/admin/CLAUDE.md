# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# From monorepo root:
pnpm --filter @clawquest/admin dev      # Vite dev server on port 5174
pnpm --filter @clawquest/admin build    # tsc + vite build
pnpm --filter @clawquest/admin lint     # ESLint check
pnpm dev:admin                           # shortcut for dev

# Or from this directory:
pnpm dev
pnpm build
pnpm lint
```

No test runner is configured — linting is the primary quality gate.

## Workspace

This app is part of the `clawquest` pnpm monorepo workspace (`apps/admin`). It depends on `@clawquest/shared` for shared Zod schemas and types. After changes to the shared package, rebuild it: `pnpm --filter @clawquest/shared build`.

**CI/CD**: Deploys independently via `.github/workflows/admin-deploy.yml`, triggered only when `apps/admin/**` or `packages/shared/**` changes on `main`.

## Environment

Create `.env` with:
```
VITE_API_URL="http://localhost:3000"
VITE_SUPABASE_URL="..."
VITE_SUPABASE_ANON_KEY="..."
VITE_LLM_SERVER_URL="..."
VITE_LLM_ADMIN_KEY="..."
```

The API URL points to the monorepo's API server. Supabase credentials connect to the same project as the main platform.

## Architecture

### Provider Stack (`src/main.tsx`)

Providers wrap the app in this order:
1. `QueryClientProvider` (staleTime: 30s, retry: 1)
2. `ThemeProvider` (next-themes)
3. `AuthProvider` → `EnvProvider` → `RouterProvider`

### Routing (`src/router.tsx`)

TanStack Router with two route trees:
- Public: `/login` (redirects to `/` if authenticated)
- Protected layout (`AppLayout`): `/`, `/quests`, `/quests/$questId`, `/users`, `/users/$userId`, `/escrow`, `/analytics`

Auth guard uses `beforeLoad` → checks `getToken()` from localStorage, redirects to `/login` if missing.

### API Client (`src/lib/api.ts`)

Single `api` object with typed methods for all endpoints. Key behaviors:
- Token stored in `localStorage` under key `clawquest-admin-token`
- All requests include `Authorization: Bearer {token}`
- Paths matching `/admin/*` automatically receive `?env=mainnet|testnet` query param (injected from `EnvContext`)
- Escrow endpoints (`/escrow/*`) do NOT get auto-env injection — pass `chainId` explicitly

### Environment Switching (`src/context/EnvContext.tsx`)

Mainnet/testnet toggle stored in `localStorage` (`clawquest-admin-env`). On switch, `invalidateQueries` flushes all cached data. `testnetAvailable` is fetched from `api.envStatus()` — the UI disables testnet if unavailable.

### Authentication (`src/context/AuthContext.tsx`)

On mount, validates token via `api.me()` and checks `role === 'admin'`. Non-admin users are signed out immediately. Login stores token to localStorage; logout removes it.

### Styling

Tailwind CSS v4 with CSS custom properties as design tokens (defined in `src/index.css`). Use `--bg-base`, `--bg-secondary`, `--text-primary`, `--border`, etc. rather than hardcoded colors. Dark mode handled by `next-themes` via class strategy.

Badge/status colors use `--badge-{color}-bg` / `--badge-{color}-text` vars — see `src/components/shared/StatusBadge.tsx` for the full mapping of quest statuses, funding states, roles, and participation states.

### Data Fetching Patterns

All data fetching uses TanStack Query. Standard pattern:
```tsx
const { data, isLoading } = useQuery({
  queryKey: ['resource', id, env],  // include env in key for env-aware queries
  queryFn: () => api.getResource(id),
});
```

Mutations use `useMutation` + `queryClient.invalidateQueries` on success, with `toast.success`/`toast.error` from Sonner.

### Adding UI Components

Use shadcn/ui CLI to add new primitives (config in `components.json`, style: new-york, icons: lucide). Existing primitives live in `src/components/ui/`. Shared app-level components (reused across pages) go in `src/components/shared/`.
