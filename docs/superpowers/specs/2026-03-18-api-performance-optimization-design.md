# API Performance Optimization — Design Spec

**Date:** 2026-03-18
**Status:** Approved
**Author:** Brainstorming session

---

## Problem

All API endpoints on Railway Free plan are slow:
- `GET /quests` (public): 7.34s first call, 4-5s subsequent
- `GET /quests/:id` (auth): 7.38s first call, 7-8s subsequent

Root causes identified:
1. **Railway Free cold starts** — container sleeps after ~5 min idle (addressed separately, out of scope here)
2. **`supabaseAdmin.auth.getUser(token)` is an HTTP call** to Supabase Auth API on every authenticated request (+300-600ms)
3. **No response caching** — every request hits the DB with heavy Prisma `findMany`/`findUnique` + includes

---

## Solution Overview

Two complementary optimizations, zero new dependencies:

| Component | File | Impact |
|-----------|------|--------|
| Local JWT Verification | `src/utils/supabase-jwt.ts` | -300-600ms per auth'd request |
| In-memory TTL Cache | `src/utils/ttl-cache.ts` | -4-7s on cache hit |

---

## Component 1: Local JWT Verification

### Motivation

`supabaseAdmin.auth.getUser(token)` makes an HTTP round-trip to Supabase Auth API on every request that goes through `authenticate` middleware. Supabase JWTs are standard ES256 tokens — they can be verified locally using Supabase's public JWKS endpoint.

`jose` is already installed in `apps/api/package.json`.

### Design

**New file:** `apps/api/src/utils/supabase-jwt.ts`

```
SupabaseJwtVerifier (module-level singleton)
├── jwks = createRemoteJWKSet(SUPABASE_URL/auth/v1/.well-known/jwks.json)
│   └── jose handles JWKS caching + auto-refresh on key rotation transparently
├── verifySupabaseToken(token: string) → SupabaseJwtPayload
│   ├── jwtVerify(token, jwks, { issuer, audience: 'authenticated' })
│   ├── Returns: { sub, email, user_metadata, app_metadata }
│   └── Throws JWTError if invalid/expired (caller handles 401)
└── userCache: Map<supabaseId, { user: PrismaUser, cachedAt: number }>
    ├── TTL: 5 minutes
    └── Avoids repeated Prisma lookups for same user within a session
```

**JWKS fallback strategy:** `createRemoteJWKSet` is lazy — it fetches on first use. If `jwtVerify` throws a **network/JWKS error** (not `JWTExpired` or `JWTInvalid`), the `authenticate` middleware falls back to `supabaseAdmin.auth.getUser(token)` via per-request try/catch. JWT signature/expiry errors are **not** retried — they return 401 immediately.

```ts
try {
  payload = await verifySupabaseToken(token);
} catch (err) {
  if (isJwtError(err)) return reply.status(401).send(...);
  // network/JWKS failure — fall back to Supabase HTTP
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error) return reply.status(401).send(...);
  payload = data.user; // adapt shape
}
```

**Modified:** `apps/api/src/app.ts` — `authenticate` middleware

After local JWT verify, check user cache before Prisma lookup:
```ts
const cached = userCache.get(payload.sub);
if (cached && Date.now() - cached.cachedAt < 5 * 60_000) {
  request.user = toRequestUser(cached.user);
  return;
}
// else: Prisma findUnique → set cache → continue
```

User sync operations (displayName, githubHandle) run on cache miss only, not every request.

### Security Note: Banned/Disabled Users

**Known trade-off:** A Supabase-disabled user with a valid (not-yet-expired) JWT will pass local verification and may be served from the user cache for up to 5 minutes. This is an explicit, accepted trade-off for performance.

**Mitigation:** Sensitive write routes (escrow distribute, payout) already require additional ownership checks at the service layer, which limits exposure. Admin routes use a separate JWT path and are unaffected.

If immediate revocation is required in future, the user cache TTL can be reduced to 0 (disabling the cache entirely) without other code changes.

### Constraints

- Admin JWT path (`verifyAdminJwt`) is unchanged — it already verifies locally
- Agent API key path (`cq_*`) is unchanged — no JWT involved

---

## Component 2: In-memory TTL Cache

### Motivation

`GET /quests` runs a heavy `findMany` with `include: { _count, participations, llmModel }`. `GET /quests/:id` runs `findUnique` with same includes. These are the most-read endpoints with data that changes infrequently (quests are typically stable for hours/days after publish).

Railway runs as a single instance → in-memory cache is sufficient (no Redis needed).

### Design

**New file:** `apps/api/src/utils/ttl-cache.ts`

```ts
class TtlCache<T> {
  private store: Map<string, { data: T; expiresAt: number }>
  private interval: NodeJS.Timeout

  constructor(cleanupIntervalMs = 5 * 60_000) {
    this.interval = setInterval(() => this.cleanup(), cleanupIntervalMs);
    this.interval.unref(); // does not block process exit
  }

  get(key: string): T | undefined
  set(key: string, value: T, ttlMs: number): void
  delete(key: string): void
  deleteByPrefix(prefix: string): void  // iterate store keys, delete matching
  destroy(): void                       // clearInterval for tests/graceful shutdown
  private cleanup(): void               // delete all expired entries
}
```

**Cache entries:**

| Cache key pattern | TTL | Rationale |
|-------------------|-----|-----------|
| `quests:list:{status ?? ''}:{type ?? ''}:{limit}:{offset}` | 30s | List changes on quest state transitions; 30s staleness acceptable for explore page |
| `quests:detail:{uuid}` | 60s | Detail changes less often than list; 60s balances freshness vs. DB load |

Undefined/absent query params serialize as empty string (`status ?? ''`) to produce clean keys like `quests:list:::50:0`.

### `myParticipation` Merge Strategy

`GET /quests/:id` includes a `myParticipation` field when the caller is authenticated. This field is **user-specific** and must never be cached.

Implementation flow:
1. Check `questCache.get('quests:detail:{id}')` for base quest data
2. On cache miss: run Prisma `findUnique` with includes → write only base quest to cache → continue
3. If authenticated: run separate `prisma.questParticipation.findFirst({ where: { questId: id, userId: request.user.id } })` → merge result as `myParticipation` field
4. Return merged object (base quest + myParticipation) to caller — **merged result is never written to cache**
5. If participation fetch fails: return base quest without `myParticipation` (non-fatal)

### Invalidation Rules

**Blanket rule (simpler and safe):** Any write operation on a quest `{id}` triggers:
1. `questCache.delete('quests:detail:{id}')`
2. `questCache.deleteByPrefix('quests:list:')`

Routes that must call invalidation:

| Route | Reason |
|-------|--------|
| `POST /quests` (create) | New quest may appear in list |
| `PATCH /quests/:id` (update) | Quest fields changed |
| `POST /quests/:id/publish` | Status draft→live, quest appears in public list |
| `POST /quests/:id/close` | Status live→completed, list visibility changes |
| `POST /quests/:id/cancel` | Status change |
| `POST /quests/:id/accept` | `filledSlots` increments |
| `POST /quests/:id/proof` | Participation count in `_count` changes |
| `POST /quests/:id/participations/:pid/verify` | Participation state changes |
| `POST /quests/:id/distribute-payouts` | Quest status → completed |

### Modified files

- `apps/api/src/modules/quests/quests.routes.ts`
  - `GET /` — check cache before Prisma query; set cache on miss
  - `GET /:id` — cache base quest, merge `myParticipation` after (see above)
  - All write routes listed above — call blanket invalidation after success

---

## Files Changed

| File | Change type |
|------|------------|
| `apps/api/src/utils/supabase-jwt.ts` | **NEW** — local JWT verifier + user cache |
| `apps/api/src/utils/ttl-cache.ts` | **NEW** — generic TTL cache with `.unref()` interval |
| `apps/api/src/app.ts` | **MODIFY** — use local JWT in authenticate middleware |
| `apps/api/src/modules/quests/quests.routes.ts` | **MODIFY** — cache GET /, GET /:id; invalidate on all writes |

**No new npm dependencies.**

---

## Expected Performance

| Endpoint | Before | After (cache hit) | After (cache miss) |
|----------|--------|-------------------|-------------------|
| `GET /quests` (public) | 4-7s | ~10-30ms | ~1-2s |
| `GET /quests/:id` (no auth) | 4-5s | ~10-30ms | ~500ms |
| `GET /quests/:id` (auth) | 7-8s | ~100-200ms | ~600ms-1s |

---

## Out of Scope

- Cold start prevention (Railway sleep) — handled separately
- Supabase connection pooler URL — recommended as follow-up env var change in Railway dashboard
- Caching for other endpoints (agents, stats, etc.) — future work
