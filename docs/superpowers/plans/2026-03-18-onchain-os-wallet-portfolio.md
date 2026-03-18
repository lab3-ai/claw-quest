# OnchainOS Agent Wallet Portfolio — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate OKX OnchainOS wallet portfolio API so agent profile pages show cross-chain portfolio (total USD value + top 5 tokens).

**Architecture:** New `onchain` API module with OKX HMAC-SHA256 client + TtlCache (300s). Dashboard adds `WalletPortfolio` component to agent detail sidebar. All failures degrade gracefully.

**Tech Stack:** Fastify + Zod (API), React + TanStack Query (Dashboard), OKX OnchainOS REST API

**Spec:** `docs/superpowers/specs/2026-03-18-onchain-os-integration-design.md`

---

## File Structure

```
NEW files:
  apps/api/src/modules/onchain/onchain.routes.ts     — 1 GET route: /onchain/wallet-portfolio
  apps/api/src/modules/onchain/onchain.service.ts     — OKX API client (HMAC auth + cache)
  apps/api/src/modules/onchain/onchain.schemas.ts     — Zod request/response schemas
  apps/dashboard/src/components/WalletPortfolio.tsx    — Portfolio card component

MODIFIED files:
  apps/api/src/app.ts                                 — Register onchain routes
  apps/api/.env.sample                                — Add OKX env vars
  apps/dashboard/src/routes/_authenticated/agents/$agentId.tsx — Add WalletPortfolio to sidebar
```

---

## Chunk 1: API — OnchainOS Service + Route

### Task 1: Add OKX env vars to .env.sample

**Files:**
- Modify: `apps/api/.env.sample`

- [ ] **Step 1: Add OKX section to .env.sample**

Append to end of file:

```env
# ── OKX OnchainOS ───────────────────────────
# Get keys at https://web3.okx.com/onchain-os/dev-portal
OKX_API_KEY=""
OKX_API_SECRET=""
OKX_API_PASSPHRASE=""
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/.env.sample
git commit -m "chore(api): add OKX OnchainOS env vars to .env.sample"
```

---

### Task 2: Create Zod schemas for onchain module

**Files:**
- Create: `apps/api/src/modules/onchain/onchain.schemas.ts`

- [ ] **Step 1: Write schemas file**

```typescript
import { z } from 'zod';

// ─── Request schemas ────────────────────────────────────────────────────────

export const walletPortfolioQuerySchema = z.object({
    address: z.string().min(1, 'Wallet address required'),
    chainIds: z.string().optional().default('1,8453,56'), // Ethereum, Base, BSC
});

// ─── Response schemas ───────────────────────────────────────────────────────

export const portfolioTokenSchema = z.object({
    symbol: z.string(),
    chainName: z.string(),
    balance: z.string(),
    valueUsd: z.string(),
    logoUrl: z.string().nullable(),
});

export const walletPortfolioResponseSchema = z.object({
    data: z.object({
        totalValueUsd: z.string(),
        tokens: z.array(portfolioTokenSchema),
    }).nullable(),
    error: z.string().optional(),
});

// ─── Types ──────────────────────────────────────────────────────────────────

export type WalletPortfolioQuery = z.infer<typeof walletPortfolioQuerySchema>;
export type PortfolioToken = z.infer<typeof portfolioTokenSchema>;
export type WalletPortfolioResponse = z.infer<typeof walletPortfolioResponseSchema>;
```

- [ ] **Step 2: Verify file compiles**

```bash
cd apps/api && npx tsc --noEmit src/modules/onchain/onchain.schemas.ts
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/onchain/onchain.schemas.ts
git commit -m "feat(api): add Zod schemas for onchain wallet portfolio"
```

---

### Task 3: Create OnchainOS API service

**Files:**
- Create: `apps/api/src/modules/onchain/onchain.service.ts`

- [ ] **Step 1: Write the OnchainOS service**

This service handles:
1. HMAC-SHA256 signing for OKX API auth
2. Fetching wallet total value + token balances
3. TtlCache (300s) to avoid hammering OKX API
4. Graceful error handling (returns null on failure)

```typescript
import crypto from 'node:crypto';
import { TtlCache } from '../../utils/ttl-cache';
import type { PortfolioToken } from './onchain.schemas';

// ─── Config ─────────────────────────────────────────────────────────────────

const OKX_API_KEY = process.env.OKX_API_KEY || '';
const OKX_API_SECRET = process.env.OKX_API_SECRET || '';
const OKX_API_PASSPHRASE = process.env.OKX_API_PASSPHRASE || '';
const OKX_BASE_URL = 'https://web3.okx.com';
const PORTFOLIO_CACHE_TTL_MS = 300_000; // 5 minutes

if (!OKX_API_KEY) {
    console.warn('⚠️  Missing OKX_API_KEY — OnchainOS features disabled');
}

// ─── Types (OKX API response shapes) ────────────────────────────────────────

interface OkxTokenBalance {
    symbol: string;
    tokenContractAddress: string;
    balance: string;
    tokenPrice: string;
    chainIndex: string;
    logoUrl?: string;
}

interface OkxTotalValueResponse {
    code: string;
    data: Array<{ totalValue: string }>;
}

interface OkxAllBalancesResponse {
    code: string;
    data: Array<{ tokenAssets: OkxTokenBalance[] }>;
}

// ─── Cache ──────────────────────────────────────────────────────────────────

interface PortfolioData {
    totalValueUsd: string;
    tokens: PortfolioToken[];
}

const portfolioCache = new TtlCache<PortfolioData>();

// ─── Chain ID → name mapping ────────────────────────────────────────────────

const CHAIN_NAMES: Record<string, string> = {
    '1': 'Ethereum',
    '56': 'BSC',
    '8453': 'Base',
    '42161': 'Arbitrum',
    '137': 'Polygon',
    '196': 'XLayer',
    '501': 'Solana',
    '10': 'Optimism',
    '43114': 'Avalanche',
};

// ─── HMAC-SHA256 signing ────────────────────────────────────────────────────

function signRequest(timestamp: string, method: string, path: string, body = ''): string {
    const prehash = timestamp + method.toUpperCase() + path + body;
    return crypto
        .createHmac('sha256', OKX_API_SECRET)
        .update(prehash)
        .digest('base64');
}

function buildHeaders(method: string, path: string, body = ''): Record<string, string> {
    const timestamp = new Date().toISOString();
    return {
        'OK-ACCESS-KEY': OKX_API_KEY,
        'OK-ACCESS-SIGN': signRequest(timestamp, method, path, body),
        'OK-ACCESS-TIMESTAMP': timestamp,
        'OK-ACCESS-PASSPHRASE': OKX_API_PASSPHRASE,
        'Content-Type': 'application/json',
    };
}

// ─── OKX API helpers ────────────────────────────────────────────────────────

async function okxGet<T>(path: string): Promise<T | null> {
    if (!OKX_API_KEY) return null;

    try {
        const res = await fetch(`${OKX_BASE_URL}${path}`, {
            method: 'GET',
            headers: buildHeaders('GET', path),
            signal: AbortSignal.timeout(5000), // 5s timeout
        });

        if (!res.ok) {
            console.error(`OKX API error: ${res.status} ${res.statusText} for ${path}`);
            return null;
        }

        return await res.json() as T;
    } catch (err) {
        console.error(`OKX API request failed for ${path}:`, err);
        return null;
    }
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function isOnchainEnabled(): boolean {
    return !!OKX_API_KEY;
}

export async function getWalletPortfolio(
    address: string,
    chainIds: string,
): Promise<PortfolioData | null> {
    const cacheKey = `portfolio:${address}:${chainIds}`;
    const cached = portfolioCache.get(cacheKey);
    if (cached) return cached;

    // Fetch total value
    const totalPath = `/api/v5/wallet/asset/total-value?address=${address}&chains=${chainIds}`;
    const totalRes = await okxGet<OkxTotalValueResponse>(totalPath);

    // Fetch all token balances
    const balancePath = `/api/v5/wallet/asset/all-token-balances?address=${address}&chains=${chainIds}`;
    const balanceRes = await okxGet<OkxAllBalancesResponse>(balancePath);

    if (!totalRes?.data?.[0] || !balanceRes?.data?.[0]) return null;

    const totalValueUsd = totalRes.data[0].totalValue || '0';

    // Sort by USD value descending, take top 5
    const tokenAssets = balanceRes.data[0].tokenAssets || [];
    const top5 = tokenAssets
        .filter(t => parseFloat(t.tokenPrice) > 0 && parseFloat(t.balance) > 0)
        .sort((a, b) => {
            const aVal = parseFloat(a.balance) * parseFloat(a.tokenPrice);
            const bVal = parseFloat(b.balance) * parseFloat(b.tokenPrice);
            return bVal - aVal;
        })
        .slice(0, 5)
        .map((t): PortfolioToken => ({
            symbol: t.symbol,
            chainName: CHAIN_NAMES[t.chainIndex] || `Chain ${t.chainIndex}`,
            balance: t.balance,
            valueUsd: (parseFloat(t.balance) * parseFloat(t.tokenPrice)).toFixed(2),
            logoUrl: t.logoUrl || null,
        }));

    const result: PortfolioData = { totalValueUsd, tokens: top5 };
    portfolioCache.set(cacheKey, result, PORTFOLIO_CACHE_TTL_MS);
    return result;
}
```

- [ ] **Step 2: Verify file compiles**

```bash
cd apps/api && npx tsc --noEmit src/modules/onchain/onchain.service.ts
```

Expected: No errors. If TtlCache import path is wrong, fix it.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/onchain/onchain.service.ts
git commit -m "feat(api): add OnchainOS wallet portfolio service with HMAC auth and cache"
```

---

### Task 4: Create onchain routes

**Files:**
- Create: `apps/api/src/modules/onchain/onchain.routes.ts`

- [ ] **Step 1: Write route file**

Follow existing pattern from `wallets.routes.ts` — Fastify plugin with Zod type provider.

```typescript
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { walletPortfolioQuerySchema, walletPortfolioResponseSchema } from './onchain.schemas';
import { getWalletPortfolio, isOnchainEnabled } from './onchain.service';

export async function onchainRoutes(app: FastifyInstance) {
    const server = app.withTypeProvider<ZodTypeProvider>();

    // GET /onchain/wallet-portfolio?address=0x...&chainIds=1,8453,56
    server.get(
        '/wallet-portfolio',
        {
            onRequest: [app.authenticate],
            schema: {
                tags: ['Onchain'],
                summary: 'Get wallet portfolio via OKX OnchainOS',
                security: [{ bearerAuth: [] }],
                querystring: walletPortfolioQuerySchema,
                response: { 200: walletPortfolioResponseSchema },
            },
        },
        async (request, reply) => {
            if (!isOnchainEnabled()) {
                return reply.send({ data: null, error: 'OnchainOS not configured' });
            }

            const { address, chainIds } = request.query;
            const result = await getWalletPortfolio(address, chainIds);

            return reply.send({
                data: result,
                ...(result ? {} : { error: 'Failed to fetch portfolio from OKX' }),
            });
        },
    );
}
```

- [ ] **Step 2: Verify file compiles**

```bash
cd apps/api && npx tsc --noEmit src/modules/onchain/onchain.routes.ts
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/onchain/onchain.routes.ts
git commit -m "feat(api): add GET /onchain/wallet-portfolio route"
```

---

### Task 5: Register onchain routes in app.ts

**Files:**
- Modify: `apps/api/src/app.ts`

- [ ] **Step 1: Add import**

After the existing route imports (around line 30-50 area where other route imports are), add:

```typescript
import { onchainRoutes } from './modules/onchain/onchain.routes';
```

- [ ] **Step 2: Register route**

After line `server.register(challengesRoutes);` (line ~303), add:

```typescript
server.register(onchainRoutes, { prefix: '/onchain' });
```

- [ ] **Step 3: Verify API compiles**

```bash
cd apps/api && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Test manually (if API running)**

```bash
# Start API
pnpm --filter api dev &

# Test endpoint (should return error if no OKX keys configured)
curl -s http://localhost:3000/onchain/wallet-portfolio?address=0x123 \
  -H "Authorization: Bearer <your-jwt>" | jq .
```

Expected: `{ "data": null, "error": "OnchainOS not configured" }` (if no OKX env vars set)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/app.ts
git commit -m "feat(api): register onchain routes at /onchain prefix"
```

---

## Chunk 2: Dashboard — WalletPortfolio Component

### Task 6: Create WalletPortfolio component

**Files:**
- Create: `apps/dashboard/src/components/WalletPortfolio.tsx`

- [ ] **Step 1: Write the component**

This component:
1. Fetches wallet portfolio from `/onchain/wallet-portfolio`
2. Shows total USD value + top 5 tokens table
3. Handles loading, error, and "no wallet" states gracefully
4. Uses existing UI patterns (Badge, Skeleton) and Tailwind classes from the codebase

```tsx
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/context/AuthContext"
import { Skeleton } from "@/components/ui/skeleton"

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

// ─── Types ──────────────────────────────────────────────────────────────────

interface PortfolioToken {
    symbol: string
    chainName: string
    balance: string
    valueUsd: string
    logoUrl: string | null
}

interface PortfolioData {
    totalValueUsd: string
    tokens: PortfolioToken[]
}

interface PortfolioResponse {
    data: PortfolioData | null
    error?: string
}

// ─── Fetcher ────────────────────────────────────────────────────────────────

async function fetchPortfolio(
    address: string,
    session: unknown,
): Promise<PortfolioData | null> {
    const headers: HeadersInit = { "Content-Type": "application/json" }
    if (session && typeof session === "object" && "access_token" in session) {
        headers.Authorization = `Bearer ${(session as { access_token: string }).access_token}`
    }

    const res = await fetch(
        `${API_BASE}/onchain/wallet-portfolio?address=${encodeURIComponent(address)}`,
        { headers },
    )
    if (!res.ok) return null

    const json: PortfolioResponse = await res.json()
    return json.data
}

// ─── Component ──────────────────────────────────────────────────────────────

interface WalletPortfolioProps {
    walletAddress: string | null
}

export function WalletPortfolio({ walletAddress }: WalletPortfolioProps) {
    const { session } = useAuth()

    const { data: portfolio, isLoading } = useQuery({
        queryKey: ["walletPortfolio", walletAddress],
        queryFn: () => fetchPortfolio(walletAddress!, session),
        enabled: !!session && !!walletAddress,
        staleTime: 5 * 60_000, // 5 min (matches API cache TTL)
        retry: 1,
    })

    // No wallet linked
    if (!walletAddress) {
        return (
            <div className="p-5 border border-border-1 bg-card">
                <h3 className="text-sm font-semibold text-foreground mb-2">
                    Cross-Chain Portfolio
                </h3>
                <p className="text-xs text-muted-foreground">
                    No wallet linked
                </p>
            </div>
        )
    }

    // Loading
    if (isLoading) {
        return (
            <div className="p-5 border border-border-1 bg-card">
                <h3 className="text-sm font-semibold text-foreground mb-3">
                    Cross-Chain Portfolio
                </h3>
                <Skeleton className="h-8 w-24 mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
            </div>
        )
    }

    // API failed or no data — hide silently
    if (!portfolio) return null

    return (
        <div className="p-5 border border-border-1 bg-card hover:bg-bg-2 transition-colors">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">
                    Cross-Chain Portfolio
                </h3>
                <span className="text-xs text-muted-foreground">
                    via OKX OnchainOS
                </span>
            </div>

            {/* Total value */}
            <p className="text-2xl font-bold text-foreground mb-4">
                ${parseFloat(portfolio.totalValueUsd).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                })}
            </p>

            {/* Top tokens */}
            {portfolio.tokens.length > 0 && (
                <div className="flex flex-col gap-2">
                    {portfolio.tokens.map((token, i) => (
                        <div
                            key={`${token.symbol}-${token.chainName}-${i}`}
                            className="flex items-center justify-between py-1.5"
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                {token.logoUrl ? (
                                    <img
                                        src={token.logoUrl}
                                        alt={token.symbol}
                                        className="w-5 h-5 rounded-full shrink-0"
                                    />
                                ) : (
                                    <div className="w-5 h-5 rounded-full bg-muted shrink-0" />
                                )}
                                <span className="text-sm text-foreground font-medium truncate">
                                    {token.symbol}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {token.chainName}
                                </span>
                            </div>
                            <div className="text-right shrink-0 ml-2">
                                <p className="text-sm font-medium text-foreground">
                                    ${parseFloat(token.valueUsd).toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {parseFloat(token.balance).toLocaleString(undefined, {
                                        maximumFractionDigits: 6,
                                    })}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
```

- [ ] **Step 2: Verify dashboard compiles**

```bash
pnpm --filter dashboard build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/src/components/WalletPortfolio.tsx
git commit -m "feat(dashboard): add WalletPortfolio component for agent profile"
```

---

### Task 7: Add WalletPortfolio to agent detail page

**Files:**
- Modify: `apps/dashboard/src/routes/_authenticated/agents/$agentId.tsx`

- [ ] **Step 1: Add import**

At the top of the file, after existing imports (around line 9), add:

```typescript
import { WalletPortfolio } from "@/components/WalletPortfolio"
```

- [ ] **Step 2: Update Agent type to include wallet address**

The `Agent` interface (line 15-22) needs to include wallet info. Update the `fetchAgent` response to include primary wallet address. Modify the `Agent` interface:

```typescript
interface Agent {
    id: string
    agentname: string
    status: "idle" | "questing" | "offline"
    platform: string | null
    createdAt: string
    participations?: Participation[]
    owner?: {
        primaryWalletAddress: string | null
    }
}
```

**Note:** The API's `GET /agents/:id` route needs to include the owner's primary wallet. Check the agents route — if it doesn't already return owner wallet info, we need to modify the API query in `agents.routes.ts` to include:

```typescript
include: {
    // existing includes...
    owner: {
        select: {
            walletLinks: {
                where: { isPrimary: true },
                select: { address: true },
                take: 1,
            },
        },
    },
}
```

Then map `owner.walletLinks[0]?.address` to `owner.primaryWalletAddress` in the response.

- [ ] **Step 3: Add WalletPortfolio to sidebar**

In the main component JSX (around line 337), add the WalletPortfolio component in the sidebar `<aside>`, right after `<AgentStatsPanel>`:

```tsx
{/* Sidebar */}
<aside className="md:order-last order-first flex flex-col gap-4">
    <AgentStatsPanel agent={agent} />
    <WalletPortfolio
        walletAddress={agent.owner?.primaryWalletAddress ?? null}
    />
</aside>
```

Note: The existing `<aside>` doesn't have `flex flex-col gap-4` — add those classes so both cards stack with spacing.

- [ ] **Step 4: Verify dashboard compiles**

```bash
pnpm --filter dashboard build
```

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/src/routes/_authenticated/agents/\$agentId.tsx
git commit -m "feat(dashboard): add wallet portfolio to agent detail sidebar"
```

---

### Task 8: Update API agents route to include owner wallet

**Files:**
- Modify: `apps/api/src/modules/agents/agents.routes.ts`

- [ ] **Step 1: Find the GET /:id route handler**

Locate the `findUnique` query for the single agent endpoint. Add `owner.walletLinks` to the include/select.

- [ ] **Step 2: Update Prisma query to include owner's primary wallet**

In the `GET /:id` handler, update the Prisma query to include:

```typescript
owner: {
    select: {
        walletLinks: {
            where: { isPrimary: true },
            select: { address: true },
            take: 1,
        },
    },
},
```

- [ ] **Step 3: Map wallet address in response**

After the Prisma query, map the response to include `owner.primaryWalletAddress`:

```typescript
const result = {
    ...agent,
    owner: agent.owner ? {
        primaryWalletAddress: agent.owner.walletLinks?.[0]?.address ?? null,
    } : undefined,
};
```

- [ ] **Step 4: Verify API compiles**

```bash
cd apps/api && npx tsc --noEmit
```

- [ ] **Step 5: Test endpoint**

```bash
curl -s http://localhost:3000/agents/<agent-id> \
  -H "Authorization: Bearer <jwt>" | jq '.owner'
```

Expected: `{ "primaryWalletAddress": "0x..." }` or `{ "primaryWalletAddress": null }`

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/agents/agents.routes.ts
git commit -m "feat(api): include owner primary wallet address in agent detail response"
```

---

## Chunk 3: Final Integration & Verification

### Task 9: End-to-end verification

- [ ] **Step 1: Start API and Dashboard**

```bash
pnpm dev
```

- [ ] **Step 2: Verify API health**

```bash
curl -s http://localhost:3000/health | jq .
```

Expected: `{ "status": "ok", ... }`

- [ ] **Step 3: Test wallet portfolio endpoint**

```bash
# Without OKX keys (should degrade gracefully)
curl -s "http://localhost:3000/onchain/wallet-portfolio?address=0x1234" \
  -H "Authorization: Bearer <jwt>" | jq .
```

Expected: `{ "data": null, "error": "OnchainOS not configured" }`

- [ ] **Step 4: Test with real OKX keys (if available)**

Add `OKX_API_KEY`, `OKX_API_SECRET`, `OKX_API_PASSPHRASE` to `apps/api/.env`, then:

```bash
curl -s "http://localhost:3000/onchain/wallet-portfolio?address=<real-wallet>&chainIds=1,8453,56" \
  -H "Authorization: Bearer <jwt>" | jq .
```

Expected: `{ "data": { "totalValueUsd": "...", "tokens": [...] } }`

- [ ] **Step 5: Verify dashboard renders correctly**

Open http://localhost:5173, navigate to an agent detail page. Check:
1. If agent owner has a linked wallet → WalletPortfolio card shows in sidebar
2. If no wallet → shows "No wallet linked" message
3. If OKX API not configured → card is hidden (graceful degradation)

- [ ] **Step 6: Run lint**

```bash
pnpm lint
```

Fix any lint errors.

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat: integrate OKX OnchainOS wallet portfolio on agent profile"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Add OKX env vars | `.env.sample` |
| 2 | Zod schemas | `onchain.schemas.ts` (new) |
| 3 | OKX API service | `onchain.service.ts` (new) |
| 4 | API route | `onchain.routes.ts` (new) |
| 5 | Register route | `app.ts` (modify) |
| 6 | Portfolio component | `WalletPortfolio.tsx` (new) |
| 7 | Wire into agent page | `$agentId.tsx` (modify) |
| 8 | API: include wallet | `agents.routes.ts` (modify) |
| 9 | E2E verification | Manual testing |

**Total new files:** 4
**Total modified files:** 3
**Estimated effort:** 3-4 hours
