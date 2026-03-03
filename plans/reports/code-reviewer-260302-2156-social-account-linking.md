# Code Review: Social Account Linking (v0.12.0)

## Scope

- Files reviewed: 5 (schema, migration, auth.routes.ts, callback.tsx, account.tsx)
- LOC delta: ~180 added
- Build status: both API and dashboard build cleanly
- Lint: 1 lint error in account.tsx (see Medium)

## Overall Assessment

Solid implementation. The architecture is correct — client-side Supabase SDK for OAuth linking/unlinking, backend admin API for Prisma sync. Lockout prevention logic is reasonable. Main gaps are around the re-link account-stealing edge case (unique constraint collision), unverified Prisma sync on unlink, and one lint error.

---

## Critical Issues

None.

---

## High Priority

### 1. Account-stealing via re-link of an already-owned social identity

**File:** `apps/api/src/modules/auth/auth.routes.ts` lines 172–182

**Problem:** `POST /auth/social/sync` calls `prisma.user.update()` with `xId = sub` unconditionally. If User A linked `@alice_x` (xId stored), then User A unlinks it, and User B links the same `@alice_x` Twitter account, User B's sync will try to set `xId = alice_x_sub`. Prisma will throw a P2002 (unique constraint violation) because `xId` has `@unique` and it still points to User A if the Prisma DELETE was never completed (race, failure, or skipped).

More critically: if User A linked Twitter and never unlinked via the API (e.g., they directly unlinked in Supabase dashboard), User B attempting to link the same Twitter account will get an unhandled Prisma error that propagates as a 500.

**Fix:** Wrap the Prisma update in a try/catch for P2002 and return a 409:

```typescript
try {
    await app.prisma.user.update({ where: { id: request.user.id }, data: { xId: sub, xHandle: userName } });
} catch (err: any) {
    if (err.code === 'P2002') {
        return reply.status(409).send({ error: { message: 'This account is already linked to another user', code: 'IDENTITY_CONFLICT' } });
    }
    throw err;
}
```

---

### 2. DELETE /social/:provider does not verify Supabase unlink succeeded

**File:** `apps/dashboard/src/routes/_authenticated/account.tsx` lines 149–158

**Problem:** After `supabase.auth.unlinkIdentity()` succeeds on the client, the backend DELETE is called unconditionally. But if the DELETE call fails (network error, 500), the UI swallows the error silently for Twitter/Discord — the Prisma fields remain set, so `/auth/me` still returns the handle. The user sees "Connected" badge is gone (Supabase identity removed) but their profile page will show the stale handle if they refresh before the cache invalidates, creating confusion.

The fetch on line 154 has no error handling:
```typescript
await fetch(`${API_BASE}/auth/social/${providerKey}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
})
```

**Fix:** Check `res.ok` and surface the error to the user, or at minimum log it. The cache invalidation on line 160 happens regardless of whether the DELETE succeeded, which masks the stale state.

---

## Medium Priority

### 3. Lint error in account.tsx — unused eslint-disable directive

**File:** `apps/dashboard/src/routes/_authenticated/account.tsx` line 126

**Problem:** The ESLint directive on line 126 (`// eslint-disable-next-line @typescript-eslint/no-explicit-any`) is now a lint error because `supabase.auth.linkIdentity` accepts a typed `Provider` union, so the `as any` cast on line 127 is no longer needed. This causes `pnpm --filter dashboard lint` to exit with code 1 (1 error).

```
/Users/hd/clawquest/apps/dashboard/src/routes/_authenticated/account.tsx
  126:9  error  Unused eslint-disable directive
```

**Fix:** Remove lines 126–127's comment and the `as any`, and type `supabaseProvider` as `Provider` from `@supabase/supabase-js`, or simply remove the disable comment since the `any` cast is unnecessary given that Supabase's `linkIdentity` types accept the provider string union.

---

### 4. Discord `global_name` fallback order may store wrong handle

**File:** `apps/api/src/modules/auth/auth.routes.ts` line 170

```typescript
const userName = (identity.identity_data?.user_name ?? identity.identity_data?.global_name ?? null) as string | null;
```

**Problem:** For Discord, `user_name` is the discriminator-based username (e.g. `alice#1234` in old system, or `alice` in new). `global_name` is the display name (e.g. "Alice Smith") — a non-unique vanity name that cannot be used for social task verification. The plan doc notes `user_name` as the correct field; the `global_name` fallback would store an untrusted display name as the handle if `user_name` is absent. This matters downstream when the platform uses `discordHandle` to verify quest tasks.

**Fix:** Drop the `global_name` fallback. If `user_name` is absent, store `null` rather than a non-authoritative display name:

```typescript
const userName = (identity.identity_data?.user_name ?? null) as string | null;
```

Note: the same line is fine for Twitter where `user_name` is the @handle.

---

### 5. localStorage guard does not survive cross-tab link flows

**File:** `apps/dashboard/src/routes/auth/callback.tsx` lines 29–47

**Problem:** The `clawquest_linking_provider` localStorage guard works correctly in a same-tab flow. However, if Supabase triggers a `USER_UPDATED` event in a different tab (browser updates session across tabs), the callback in that tab would find the localStorage key and attempt to call `/auth/social/sync` with a stale key that was set in the originating tab. The guard removes the key on line 31 before the sync, so a second tab seeing USER_UPDATED would not double-sync — but if the sync in the first tab completes before the second tab fires, the guard will already be cleared and the second tab redirects to `/account` unexpectedly (line 47).

**Impact:** Low probability but can cause a spurious redirect to `/account` in an already-authenticated tab. Not a security issue.

**Fix:** No urgent action needed; acceptable as-is given the plan already acknowledges this risk. Document in code comment.

---

### 6. handleLinkProvider does not await errors or guard against double-click

**File:** `apps/dashboard/src/routes/_authenticated/account.tsx` lines 123–131

**Problem:** `handleLinkProvider` is `async` but the `onClick` handler calls it without awaiting or handling errors. If `linkIdentity` throws (e.g., provider already linked error from Supabase, rate limit), the error is swallowed silently. There is also no loading state, so a user can click "Link" multiple times before the redirect, setting localStorage multiple times.

**Fix:** Add a loading state (same pattern as `unlinkPending`) and wrap in try/catch to surface errors to `unlinkError` state.

---

## Low Priority

### 7. `sub` is cast without null-guard

**File:** `apps/api/src/modules/auth/auth.routes.ts` line 169

```typescript
const sub = identity.identity_data?.sub as string;
```

`identity.identity_data` is typed as `Record<string, unknown>` in Supabase types. If `sub` is absent (unlikely but possible for a misconfigured OAuth app), this casts `undefined` to `string`, then stores `undefined` as `xId`, which would violate the NOT NULL behavior expected by downstream consumers. The `@unique` constraint on a null-coerced string could also create subtle bugs.

**Fix:**

```typescript
const sub = identity.identity_data?.sub as string | undefined;
if (!sub) {
    return reply.status(400).send({ error: { message: 'Provider identity missing sub claim', code: 'IDENTITY_MISSING_SUB' } });
}
```

---

### 8. No Supabase identity refresh after unlinkIdentity on account page

**File:** `apps/dashboard/src/routes/_authenticated/account.tsx` lines 159–160

After a successful unlink, only the `["auth", "me"]` query is invalidated. The `supabaseUser` (from `useAuth`) still contains the old identities list in memory until a full page reload or the AuthContext re-fetches. This means `linkedProviders` is stale — the "Unlink" button disappears via Supabase's automatic session update through `onAuthStateChange` in AuthContext, but only if the session event fires. This is likely fine in practice (Supabase JS SDK auto-refreshes), but it creates a dependency on an implicit side-effect.

**Impact:** Cosmetic — stale UI for a brief moment. Low risk.

---

## Edge Cases Found by Scout

| Edge case | Severity | Status |
|-----------|----------|--------|
| Re-link same Twitter/Discord account (already owned by another user) — P2002 on `xId` unique | High | Unhandled, see issue #1 |
| Prisma sync fails but Supabase identity already removed → stale handle | Medium | Partially handled (silent swallow) |
| Discord `global_name` used as handle — not unique, breaks social verification | Medium | See issue #4 |
| `sub` claim absent in OAuth response → `undefined` cast as `string` stored in DB | Low | See issue #7 |
| LinkIdentity called before Supabase provider configured in dashboard → silent failure | Low | Acceptable per plan |

---

## Positive Observations

- The localStorage guard (`clawquest_linking_provider`) is a clean solution to the ambiguous `USER_UPDATED` trigger problem.
- Lockout prevention logic (lines 137–140) is correct: `nonTelegramIdentities.length <= 1 && !hasTelegram` — covers the edge case where Telegram is the only non-OAuth method.
- Google/GitHub are correctly identified as Supabase-only (no Prisma sync needed).
- The unique constraints on `xId` and `discordId` are correct Prisma/Postgres design — Postgres NULLs are not compared in unique indexes, so multiple users with `xId = null` is valid.
- Backend uses the admin client (`app.supabase.auth.admin`) for identity lookups — not the user JWT — which is the correct pattern.
- Both builds pass with zero errors.

---

## Recommended Actions

1. **[High]** Add try/catch around Prisma updates in `POST /auth/social/sync` to handle P2002 with a 409 response.
2. **[High]** Check `res.ok` on the DELETE fetch in `handleUnlinkProvider` and surface the error.
3. **[Medium]** Fix the lint error in account.tsx line 126 — remove the unused eslint-disable directive.
4. **[Medium]** Drop the `global_name` fallback in the `userName` extraction for Discord.
5. **[Low]** Add a null-guard on `sub` before casting and storing it.
6. **[Low]** Add a loading/disabled state and error handler for `handleLinkProvider`.

---

## Metrics

- Build: pass (API + Dashboard)
- Lint: 1 error (unused eslint-disable in account.tsx), 27 pre-existing warnings
- Type coverage: no new `any` casts introduced (the existing one is now redundant)
- Test coverage: no new tests for social linking endpoints

## Unresolved Questions

- Is `user_name` always present in Supabase's Twitter identity_data, or does it vary by OAuth scope configuration? The plan's risk table says "test in dev" — was this confirmed?
- Are there downstream services (social task verification) that already consume `xHandle`/`discordHandle`? If so, the `global_name` issue (#4) is more urgent.
