# API Performance Optimization Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate 300-600ms auth overhead per request and reduce repeated DB queries to ~10-30ms via in-memory caching.

**Architecture:** Two new utility modules — `ttl-cache.ts` (generic TTL cache) and `supabase-jwt.ts` (local JWT verifier + user cache) — integrated into `app.ts` (auth middleware) and `quests.routes.ts` (quest read/write cache layer). No new npm dependencies.

**Tech Stack:** Fastify, Prisma, `jose` (already installed), Vitest

**Spec:** `docs/superpowers/specs/2026-03-18-api-performance-optimization-design.md`

---

## Chunk 1: TtlCache Utility

### Task 1: Create `ttl-cache.ts` with tests

**Files:**
- Create: `apps/api/src/utils/ttl-cache.ts`
- Create: `apps/api/src/utils/__tests__/ttl-cache.test.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/api/src/utils/__tests__/ttl-cache.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TtlCache } from '../ttl-cache';

describe('TtlCache', () => {
  let cache: TtlCache<string>;

  beforeEach(() => {
    vi.useFakeTimers();
    cache = new TtlCache<string>();
  });

  afterEach(() => {
    cache.destroy();
    vi.useRealTimers();
  });

  it('returns undefined for missing key', () => {
    expect(cache.get('missing')).toBeUndefined();
  });

  it('returns value before TTL expires', () => {
    cache.set('key', 'value', 30_000);
    expect(cache.get('key')).toBe('value');
  });

  it('returns undefined after TTL expires', () => {
    cache.set('key', 'value', 30_000);
    vi.advanceTimersByTime(30_001);
    expect(cache.get('key')).toBeUndefined();
  });

  it('deletes a specific key', () => {
    cache.set('key', 'value', 30_000);
    cache.delete('key');
    expect(cache.get('key')).toBeUndefined();
  });

  it('deleteByPrefix removes all matching keys', () => {
    cache.set('quests:list:live::50:0', 'a', 30_000);
    cache.set('quests:list:::50:0', 'b', 30_000);
    cache.set('quests:detail:abc', 'c', 60_000);
    cache.deleteByPrefix('quests:list:');
    expect(cache.get('quests:list:live::50:0')).toBeUndefined();
    expect(cache.get('quests:list:::50:0')).toBeUndefined();
    expect(cache.get('quests:detail:abc')).toBe('c');
  });

  it('cleanup removes expired entries', () => {
    cache.set('key', 'value', 100);
    vi.advanceTimersByTime(101);
    // trigger cleanup interval (5 min default)
    vi.advanceTimersByTime(5 * 60_000);
    // key should be gone from internal store
    expect(cache.get('key')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/api && pnpm exec vitest run src/utils/__tests__/ttl-cache.test.ts
```

Expected: FAIL with "Cannot find module '../ttl-cache'"

- [ ] **Step 3: Implement `ttl-cache.ts`**

Create `apps/api/src/utils/ttl-cache.ts`:

```ts
interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}

/** Simple in-memory TTL cache. No external dependencies. */
export class TtlCache<T> {
    private store = new Map<string, CacheEntry<T>>();
    private interval: NodeJS.Timeout;

    constructor(cleanupIntervalMs = 5 * 60_000) {
        this.interval = setInterval(() => this.cleanup(), cleanupIntervalMs);
        // unref so this timer doesn't block process exit or slow down tests
        this.interval.unref();
    }

    get(key: string): T | undefined {
        const entry = this.store.get(key);
        if (!entry) return undefined;
        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return undefined;
        }
        return entry.data;
    }

    set(key: string, value: T, ttlMs: number): void {
        this.store.set(key, { data: value, expiresAt: Date.now() + ttlMs });
    }

    delete(key: string): void {
        this.store.delete(key);
    }

    /** Delete all keys that start with the given prefix. */
    deleteByPrefix(prefix: string): void {
        for (const key of this.store.keys()) {
            if (key.startsWith(prefix)) this.store.delete(key);
        }
    }

    /** Clear the cleanup interval. Call in tests and graceful shutdown. */
    destroy(): void {
        clearInterval(this.interval);
    }

    private cleanup(): void {
        const now = Date.now();
        for (const [key, entry] of this.store.entries()) {
            if (now > entry.expiresAt) this.store.delete(key);
        }
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/api && pnpm exec vitest run src/utils/__tests__/ttl-cache.test.ts
```

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/utils/ttl-cache.ts apps/api/src/utils/__tests__/ttl-cache.test.ts
git commit -m "feat(api): add TtlCache utility for in-memory TTL caching"
```

---

## Chunk 2: Supabase Local JWT Verifier

### Task 2: Create `supabase-jwt.ts` with tests

**Files:**
- Create: `apps/api/src/utils/supabase-jwt.ts`
- Create: `apps/api/src/utils/__tests__/supabase-jwt.test.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/api/src/utils/__tests__/supabase-jwt.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock jose before importing the module under test
vi.mock('jose', () => ({
    createRemoteJWKSet: vi.fn(() => 'mock-jwks'),
    jwtVerify: vi.fn(),
    errors: {
        JWTExpired: class JWTExpired extends Error { code = 'ERR_JWT_EXPIRED'; },
        JWTClaimValidationFailed: class extends Error { code = 'ERR_JWT_CLAIM_VALIDATION_FAILED'; },
        JWTInvalid: class JWTInvalid extends Error { code = 'ERR_JWT_INVALID'; },
        JOSEError: class JOSEError extends Error {},
    },
}));

import { createSupabaseJwtVerifier, isJwtError } from '../supabase-jwt';
import { jwtVerify } from 'jose';

const mockJwtVerify = vi.mocked(jwtVerify);

describe('SupabaseJwtVerifier', () => {
    let verifier: ReturnType<typeof createSupabaseJwtVerifier>;

    beforeEach(() => {
        vi.clearAllMocks();
        verifier = createSupabaseJwtVerifier('https://example.supabase.co');
    });

    it('returns payload on valid token', async () => {
        mockJwtVerify.mockResolvedValueOnce({
            payload: {
                sub: 'user-123',
                email: 'test@example.com',
                user_metadata: { full_name: 'Test User' },
                app_metadata: { provider: 'google' },
            },
        } as any);

        const result = await verifier.verifyToken('valid.jwt.token');

        expect(result.sub).toBe('user-123');
        expect(result.email).toBe('test@example.com');
        expect(result.user_metadata).toEqual({ full_name: 'Test User' });
    });

    it('throws JwtVerificationError on expired token', async () => {
        const { errors } = await import('jose');
        mockJwtVerify.mockRejectedValueOnce(new errors.JWTExpired('expired'));

        await expect(verifier.verifyToken('expired.token')).rejects.toThrow();
    });

    it('isJwtError returns true for JWT errors', async () => {
        const { errors } = await import('jose');
        expect(isJwtError(new errors.JWTExpired('test'))).toBe(true);
        expect(isJwtError(new errors.JWTInvalid('test'))).toBe(true);
        expect(isJwtError(new Error('network failure'))).toBe(false);
    });
});

describe('UserCache in verifier', () => {
    it('caches and returns user within TTL', () => {
        const verifier = createSupabaseJwtVerifier('https://example.supabase.co');
        const fakeUser = { id: 'u1', email: 'a@b.com' } as any;

        verifier.cacheUser('supabase-id-1', fakeUser);
        const cached = verifier.getCachedUser('supabase-id-1');
        expect(cached).toEqual(fakeUser);
    });

    it('returns undefined for unknown supabaseId', () => {
        const verifier = createSupabaseJwtVerifier('https://example.supabase.co');
        expect(verifier.getCachedUser('nonexistent')).toBeUndefined();
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/api && pnpm exec vitest run src/utils/__tests__/supabase-jwt.test.ts
```

Expected: FAIL with "Cannot find module '../supabase-jwt'"

- [ ] **Step 3: Implement `supabase-jwt.ts`**

Create `apps/api/src/utils/supabase-jwt.ts`:

```ts
import { createRemoteJWKSet, jwtVerify, errors as joseErrors } from 'jose';
import type { User } from '@prisma/client';

export interface SupabaseJwtPayload {
    sub: string;
    email: string;
    user_metadata: Record<string, unknown>;
    app_metadata: Record<string, unknown>;
}

interface UserCacheEntry {
    user: User;
    cachedAt: number;
}

const USER_CACHE_TTL_MS = 5 * 60_000; // 5 minutes

export class JwtVerificationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'JwtVerificationError';
    }
}

/** Returns true if error is a JWT signature/expiry problem (→ 401, no retry). */
export function isJwtError(err: unknown): boolean {
    return (
        err instanceof joseErrors.JWTExpired ||
        err instanceof joseErrors.JWTInvalid ||
        err instanceof joseErrors.JWTClaimValidationFailed ||
        err instanceof joseErrors.JOSEError
    );
}

export interface SupabaseJwtVerifier {
    verifyToken(token: string): Promise<SupabaseJwtPayload>;
    getCachedUser(supabaseId: string): User | undefined;
    cacheUser(supabaseId: string, user: User): void;
}

/** Factory — call once at startup, reuse the returned verifier. */
export function createSupabaseJwtVerifier(supabaseUrl: string): SupabaseJwtVerifier {
    const jwksUrl = new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`);
    // jose caches JWKS internally and handles key rotation transparently
    const jwks = createRemoteJWKSet(jwksUrl);

    const userCache = new Map<string, UserCacheEntry>();

    return {
        async verifyToken(token: string): Promise<SupabaseJwtPayload> {
            const { payload } = await jwtVerify(token, jwks, {
                issuer: `${supabaseUrl}/auth/v1`,
                audience: 'authenticated',
            });

            return {
                sub: payload.sub as string,
                email: (payload as any).email as string,
                user_metadata: ((payload as any).user_metadata ?? {}) as Record<string, unknown>,
                app_metadata: ((payload as any).app_metadata ?? {}) as Record<string, unknown>,
            };
        },

        getCachedUser(supabaseId: string): User | undefined {
            const entry = userCache.get(supabaseId);
            if (!entry) return undefined;
            if (Date.now() - entry.cachedAt > USER_CACHE_TTL_MS) {
                userCache.delete(supabaseId);
                return undefined;
            }
            return entry.user;
        },

        cacheUser(supabaseId: string, user: User): void {
            userCache.set(supabaseId, { user, cachedAt: Date.now() });
        },
    };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/api && pnpm exec vitest run src/utils/__tests__/supabase-jwt.test.ts
```

Expected: All tests PASS

- [ ] **Step 5: Compile check**

```bash
cd apps/api && pnpm exec tsc --noEmit
```

Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/utils/supabase-jwt.ts apps/api/src/utils/__tests__/supabase-jwt.test.ts
git commit -m "feat(api): add local Supabase JWT verifier with user cache"
```

---

## Chunk 3: Integrate Local JWT in Auth Middleware

### Task 3: Modify `app.ts` authenticate middleware

**Files:**
- Modify: `apps/api/src/app.ts`

> **Note:** `test-server.ts` has its own auth middleware that mocks `supabase.auth.getUser` — do NOT modify it. Only `app.ts` (production path) changes.

- [ ] **Step 1: Add import and verifier singleton to `app.ts`**

At the top of `apps/api/src/app.ts`, after the existing imports, add:

```ts
import { createSupabaseJwtVerifier, isJwtError } from './utils/supabase-jwt';

// Initialize once at module load — jose caches JWKS internally
const jwtVerifier = SUPABASE_URL
    ? createSupabaseJwtVerifier(SUPABASE_URL)
    : null;
```

Place this after the `SUPABASE_URL` constant is defined (line ~30).

- [ ] **Step 2: Replace `supabaseAdmin.auth.getUser` in `authenticate` with local verify**

Find the `authenticate` decorator (around line 104). Replace the Supabase HTTP call section:

**Before** (lines ~127-163):
```ts
// ── Fall back to Supabase token verification ──────────────────────────────
const { data, error } = await supabaseAdmin.auth.getUser(token);

if (error || !data.user) {
    return reply.status(401).send({ message: 'Invalid or expired token' });
}

const supabaseUser = data.user;

// Find or create local Prisma user
let user = await server.prisma.user.findUnique({
    where: { supabaseId: supabaseUser.id },
});
// ... (user create/update logic) ...
```

**After:**
```ts
// ── Local JWT verification (no network call) ──────────────────────────────
let supabaseId: string;
let supabaseEmail: string;
let supabaseUserMetadata: Record<string, unknown> = {};
let supabaseAppMetadata: Record<string, unknown> = {};

if (jwtVerifier) {
    try {
        const payload = await jwtVerifier.verifyToken(token);
        supabaseId = payload.sub;
        supabaseEmail = payload.email;
        supabaseUserMetadata = payload.user_metadata;
        supabaseAppMetadata = payload.app_metadata;
    } catch (err) {
        if (isJwtError(err)) {
            return reply.status(401).send({ message: 'Invalid or expired token' });
        }
        // Network/JWKS failure — fall back to Supabase HTTP API
        const { data, error } = await supabaseAdmin.auth.getUser(token);
        if (error || !data.user) {
            return reply.status(401).send({ message: 'Invalid or expired token' });
        }
        supabaseId = data.user.id;
        supabaseEmail = data.user.email!;
        supabaseUserMetadata = data.user.user_metadata ?? {};
        supabaseAppMetadata = data.user.app_metadata ?? {};
    }
} else {
    // No SUPABASE_URL — fall back to HTTP (dev/test without env vars)
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) {
        return reply.status(401).send({ message: 'Invalid or expired token' });
    }
    supabaseId = data.user.id;
    supabaseEmail = data.user.email!;
    supabaseUserMetadata = data.user.user_metadata ?? {};
}

// ── Check user cache before DB lookup ─────────────────────────────────────
const cachedUser = jwtVerifier?.getCachedUser(supabaseId);
if (cachedUser) {
    request.user = {
        id: cachedUser.id,
        email: cachedUser.email,
        username: cachedUser.username,
        displayName: cachedUser.displayName,
        supabaseId,
        role: cachedUser.role ?? 'user',
    };
    return;
}

// ── Find or create local Prisma user ──────────────────────────────────────
let user = await server.prisma.user.findUnique({
    where: { supabaseId },
});

if (!user) {
    user = await server.prisma.user.findUnique({
        where: { email: supabaseEmail },
    });

    if (user) {
        user = await server.prisma.user.update({
            where: { id: user.id },
            data: { supabaseId },
        });
    } else {
        const fullName = (supabaseUserMetadata?.full_name as string) || null;
        user = await server.prisma.user.create({
            data: {
                supabaseId,
                email: supabaseEmail,
                displayName: fullName,
            },
        });
    }
}

// Sync displayName from metadata if not yet set
const metaFullName = (supabaseUserMetadata?.full_name as string) || null;
if (!user.displayName && metaFullName) {
    user = await server.prisma.user.update({
        where: { id: user.id },
        data: { displayName: metaFullName },
    });
}

// Cache user for subsequent requests
jwtVerifier?.cacheUser(supabaseId, user);

request.user = {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    supabaseId,
    role: user.role ?? 'user',
};
```

> **Note on GitHub identity sync:** The existing code reads `supabaseUser.identities` to sync `githubHandle` — this field is not in the JWT payload. It will continue to work on cache miss via the HTTP fallback path (network errors). As a trade-off, the first-ever GitHub login may not sync `githubHandle` on the local JWT path. This is acceptable; it will sync on the next cache miss.

- [ ] **Step 3: Compile check**

```bash
cd apps/api && pnpm exec tsc --noEmit
```

Expected: No errors

- [ ] **Step 4: Run all existing tests to verify no regression**

```bash
cd apps/api && pnpm test
```

Expected: All tests pass (test-server.ts uses its own mock authenticate — unaffected)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/app.ts
git commit -m "perf(api): replace supabase.auth.getUser with local JWT verification"
```

---

## Chunk 4: Quest Cache Layer

### Task 4: Add cache to quest read routes + invalidation on writes

**Files:**
- Modify: `apps/api/src/modules/quests/quests.routes.ts`

- [ ] **Step 1: Add cache imports and module-level cache instances to `quests.routes.ts`**

Add the import at the top of `apps/api/src/modules/quests/quests.routes.ts` alongside existing imports:

```ts
import { TtlCache } from '../../utils/ttl-cache';
```

Add these declarations at **module scope** (outside `questsRoutes`, after the imports):

```ts
// Quest cache — module-level singletons, shared across all requests
// TTL: 30s for list (changes on quest state transitions), 60s for detail
const questListCache = new TtlCache<any[]>();
const questDetailCache = new TtlCache<any>();

/** Build cache key for quest list from query params. */
function listCacheKey(status?: string, type?: string, limit?: number, offset?: number): string {
    return `quests:list:${status ?? ''}:${type ?? ''}:${limit ?? 50}:${offset ?? 0}`;
}

/** Invalidate all cache entries for a quest (call after any write). */
function invalidateQuestCache(questId: string): void {
    questDetailCache.delete(questId);
    questListCache.deleteByPrefix('quests:list:');
}
```

- [ ] **Step 2: Cache `GET /` (quest list)**

Find `GET /` handler (around line 92). Replace the Prisma `findMany` call block:

**Before:**
```ts
const quests = await server.prisma.quest.findMany({ ... });
return quests.map(({ _count, participations, ...q }) =>
    formatQuestResponse(q, participations, _count.participations)
);
```

**After:**
```ts
const cacheKey = listCacheKey(status, type, limit, offset);
const cached = questListCache.get(cacheKey);
if (cached) return cached;

const quests = await server.prisma.quest.findMany({ ... }); // unchanged
const result = quests.map(({ _count, participations, ...q }) =>
    formatQuestResponse(q, participations, _count.participations)
);

questListCache.set(cacheKey, result, 30_000); // 30s TTL
return result;
```

- [ ] **Step 3: Cache `GET /:id` (quest detail)**

Find `GET /:id` handler (around line 179). The response shape includes a user-specific `myParticipation` field when authenticated. Cache only the base quest, then merge `myParticipation` after.

Wrap the main Prisma `findUnique` + format logic:

```ts
// ── Base quest: check cache first ─────────────────────────────────────────
let baseQuest = questDetailCache.get(id);

if (!baseQuest) {
    const quest = await server.prisma.quest.findUnique({
        where: { id },
        include: {
            _count: { select: { participations: true } },
            participations: {
                take: 5,
                include: {
                    user: { select: USER_IDENTITY_SELECT },
                    agent: { select: { agentname: true } },
                },
                orderBy: { joinedAt: 'asc' },
            },
            llmModel: true,
        },
    });

    if (!quest) {
        return reply.status(404).send({ message: 'Quest not found', code: 'NOT_FOUND' } as any);
    }

    // ... existing draft/token check logic (keep as-is) ...
    // ... existing Stripe session background check (keep as-is) ...

    const { _count, participations, ...q } = quest;
    baseQuest = formatQuestResponse(q, participations, _count.participations);

    // Only cache public (non-draft) quests; drafts are user-specific previews
    if (quest.status !== 'draft') {
        questDetailCache.set(id, baseQuest, 60_000); // 60s TTL
    }
}

// ── Merge user-specific myParticipation (never cached) ────────────────────
let myParticipation = undefined;
if (request.headers.authorization) {
    try {
        // authenticate may have already set request.user via preHandler
        // but this route has no preHandler — attempt auth manually
        // (The existing code already does this — keep the existing logic below)
    } catch (_) { /* non-fatal */ }
}

// ... rest of existing myParticipation fetch and merge logic (keep as-is) ...
```

> **Important:** Read the existing `GET /:id` handler carefully. It has complex logic for draft previews (token), `isCreator`/`isSponsor` flags, Stripe session background check, and `myParticipation`. Keep ALL of that logic. Only wrap the `findUnique` call with the cache check/set. The `myParticipation` fetch must remain outside the cache.

- [ ] **Step 4: Add invalidation to write routes**

Find these routes and add `invalidateQuestCache(id)` call after the successful DB operation in each:

| Route | Where to add |
|-------|-------------|
| `POST /` (create, line ~1117) | After `createQuest(...)` — call `questListCache.deleteByPrefix('quests:list:')` only (no detail id yet) |
| `PATCH /:id` (update, line ~1466) | After `updateQuest(...)` — call `invalidateQuestCache(id)` |
| `PATCH /:id/status` (line ~1538) | After status update query — call `invalidateQuestCache(id)` |
| `POST /:id/publish` (line ~1604) | After publish query — call `invalidateQuestCache(id)` |
| `POST /:id/close` (line ~1669) | After close query — call `invalidateQuestCache(id)` |
| `POST /:id/cancel` (line ~1993) | After cancel query — call `invalidateQuestCache(id)` |
| `POST /:id/accept` (line ~1249) | After accept query — call `invalidateQuestCache(id)` |
| `POST /:id/proof` (line ~1392) | After proof query — call `invalidateQuestCache(id)` |
| `POST /:id/participations/:pid/verify` (line ~2273) | After verify query — call `invalidateQuestCache(id)` |
| `POST /:id/participations/verify-bulk` (line ~2329) | After `bulkVerifyParticipations` — call `invalidateQuestCache(id)` |
| `POST /:id/distribute-payouts` (line ~2453) | After distribute query — call `invalidateQuestCache(id)` |

Pattern for each (example for `PATCH /:id`):
```ts
const updated = await updateQuest(server.prisma, id, userId, input);
invalidateQuestCache(id); // ← add this line
return formatQuestResponse(updated);
```

- [ ] **Step 5: Compile check**

```bash
cd apps/api && pnpm exec tsc --noEmit
```

Expected: No errors

- [ ] **Step 6: Run all tests**

```bash
cd apps/api && pnpm test
```

Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/quests/quests.routes.ts
git commit -m "perf(api): add in-memory TTL cache for quest list and detail endpoints"
```

---

## Final Verification

- [ ] **Run full test suite one more time**

```bash
cd apps/api && pnpm test
```

Expected: All tests pass

- [ ] **Build check (production build)**

```bash
pnpm --filter @clawquest/api build
```

Expected: No errors

- [ ] **Manual smoke test (after deploy)**

```bash
# Public list — first call (cache miss)
time curl -s https://api.clawquest.ai/quests > /dev/null

# Second call — should be near-instant (cache hit)
time curl -s https://api.clawquest.ai/quests > /dev/null
```

Expected: First call ~1-2s, second call <100ms

---

## Notes

- **Test server is unaffected:** `test-server.ts` has its own auth middleware that mocks `supabase.auth.getUser` — it does NOT use `supabase-jwt.ts`. All integration tests continue to work as before.
- **GitHub identity sync trade-off:** `githubHandle` sync requires `supabaseUser.identities` which is only available from the Supabase HTTP API, not the JWT payload. It will sync on the next HTTP fallback (network error) or the next cache miss after 5 minutes. Acceptable for a social handle.
- **Follow-up (not in scope):** Change `DATABASE_URL` in Railway env vars to Supabase Transaction Pooler URL (port 6543) for faster DB connection establishment.
