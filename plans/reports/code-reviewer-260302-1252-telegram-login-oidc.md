# Code Review: Telegram Login OIDC

**Date:** 2026-03-02 12:52
**Reviewer:** code-reviewer
**Scope:** Telegram OIDC login/register/link flow across API + Dashboard

## Files Reviewed

| File | Type | LOC |
|------|------|-----|
| `apps/api/src/modules/auth/telegram-oidc.utils.ts` | New | 87 |
| `apps/api/src/modules/auth/telegram-auth.service.ts` | New | 217 |
| `apps/dashboard/src/lib/telegram-oidc.ts` | New | 91 |
| `apps/dashboard/src/routes/auth/telegram-callback.tsx` | New | 137 |
| `apps/api/src/modules/auth/auth.routes.ts` | Modified | 109 |
| `apps/api/prisma/schema.prisma` | Modified | 243 |
| `apps/dashboard/src/routes/login.tsx` | Modified | 203 |
| `apps/dashboard/src/routes/register.tsx` | Modified | 147 |
| `apps/dashboard/src/routes/_authenticated/account.tsx` | Modified | 267 |
| `apps/dashboard/src/router.tsx` | Modified | 244 |
| `.env.example` | Modified | 55 |

**Total LOC reviewed:** ~1,800
**Focus:** Security (PKCE, JWT, state), correctness, edge cases

---

## Overall Assessment

Solid OIDC implementation. The PKCE flow is structurally correct, JWT verification uses `jose` with proper issuer/audience checks, state validation prevents CSRF. Code is well-organized and follows existing codebase patterns. However, there are **2 critical bugs** and several high-priority issues that need attention before merge.

---

## Critical Issues

### C1. BigInt serialization crash in `handleTelegramLink` response

**File:** `/Users/hd/clawquest/apps/api/src/modules/auth/telegram-auth.service.ts` line 157

The `handleTelegramLink` function returns `user.telegramId` (a Prisma `BigInt`) directly in the response object. Fastify uses `JSON.stringify()` internally, which throws `TypeError: Do not know how to serialize a BigInt` on BigInt values.

Compare with `handleTelegramLogin` (line 109) which correctly wraps it: `telegramId: String(user.telegramId)`.

```typescript
// BUG (line 153-160):
return {
    user: {
        id: user.id,
        email: user.email,
        telegramId: user.telegramId,        // <-- BigInt! Will crash JSON.stringify
        telegramUsername: user.telegramUsername,
    },
    linkedAgents,
};

// FIX:
return {
    user: {
        id: user.id,
        email: user.email,
        telegramId: user.telegramId ? String(user.telegramId) : null,
        telegramUsername: user.telegramUsername,
    },
    linkedAgents,
};
```

**Impact:** POST `/auth/telegram/link` will 500 every time. Any user trying to link their Telegram account from the Account page will get an error.

---

### C2. `listUsers()` without pagination fetches ALL Supabase users

**File:** `/Users/hd/clawquest/apps/api/src/modules/auth/telegram-auth.service.ts` line 56

When a Supabase `createUser` fails with "already been registered", the recovery path calls `supabaseAdmin.auth.admin.listUsers()` **with no filter or pagination**. This fetches ALL users from Supabase Auth.

```typescript
// PROBLEM:
const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
const existing = existingUsers?.users?.find(u => u.email === placeholderEmail);

// FIX: Use listUsers with email filter (Supabase GoTrue API supports it)
const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1,
});
// Or better: use getUserByEmail if available, or filter directly
```

**Impact:**
- Performance: O(n) users loaded into memory on a race condition recovery path.
- At scale (1000+ users), this adds seconds of latency and significant memory pressure.
- The `.find()` linear scan on the array makes it worse.

**Better fix:** Since we know the email, use `supabaseAdmin.auth.admin.listUsers()` with filter, or try `getUserById` on the Supabase user by querying with the email. Even simpler: catch the specific error and just look up by email in Prisma:

```typescript
if (createError.message?.includes('already been registered')) {
    // The Supabase user exists. Find their ID by looking them up.
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1,
    });
    // Filter in the query if Supabase API supports it, or use getUserByEmail
}
```

---

## High Priority

### H1. PKCE code verifier uses hex charset only -- non-compliant with RFC 7636

**File:** `/Users/hd/clawquest/apps/dashboard/src/lib/telegram-oidc.ts` lines 15-18

RFC 7636 Section 4.1 specifies the code verifier MUST use characters from `[A-Z] / [a-z] / [0-9] / "-" / "." / "_" / "~"` with 43-128 characters. The current `randomString()` generates hex only (`[0-9a-f]`), limiting entropy to 4 bits per character instead of ~6.

```typescript
// CURRENT (hex only, 4 bits/char):
function randomString(length: number): string {
    const bytes = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('').slice(0, length);
}

// BETTER (base64url, ~6 bits/char, RFC 7636 compliant):
function randomString(length: number): string {
    const bytes = crypto.getRandomValues(new Uint8Array(length));
    return btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')
        .slice(0, length);
}
```

**Impact:** Functional -- Telegram's OIDC server will accept hex. But the entropy of a 64-char hex string is 256 bits (64 * 4), whereas base64url would give 384 bits. For a code verifier, 256 bits is still sufficient, so this is more of a correctness/best-practice issue than a security vulnerability. However, if Telegram's server ever validates the charset strictly per RFC, this would break.

### H2. Open redirect via `localStorage` saved redirect

**File:** `/Users/hd/clawquest/apps/dashboard/src/routes/auth/telegram-callback.tsx` lines 109-112

```typescript
const savedRedirect = localStorage.getItem("clawquest_redirect_after_login")
if (savedRedirect) {
    localStorage.removeItem("clawquest_redirect_after_login")
    window.location.href = savedRedirect  // <-- No validation!
}
```

This is a pre-existing pattern (also in `login.tsx`, `callback.tsx`) where `clawquest_redirect_after_login` is set from `detail.tsx` (line 13). An attacker who can write to localStorage (via XSS or same-origin script) could redirect users to a phishing site after login.

**Recommendation:** Validate that `savedRedirect` is a relative path or same-origin URL:

```typescript
function isSafeRedirect(url: string): boolean {
    try {
        const parsed = new URL(url, window.location.origin);
        return parsed.origin === window.location.origin;
    } catch { return false; }
}

if (savedRedirect && isSafeRedirect(savedRedirect)) {
    window.location.href = savedRedirect;
}
```

**Note:** This is a pre-existing issue, not introduced by this PR, but this PR copies the pattern. Worth fixing across all callback files.

### H3. `redirectUri` accepted from client without server-side validation

**File:** `/Users/hd/clawquest/apps/api/src/modules/auth/auth.routes.ts` line 8

The `TelegramAuthBody` schema validates `redirectUri` as `z.string().url()` but does not validate it against an allowlist. An attacker could provide any URL as `redirectUri`, potentially redirecting the token exchange to an attacker-controlled endpoint.

While Telegram's OIDC server should reject mismatched redirect URIs (if properly configured), defense-in-depth says validate server-side too:

```typescript
const ALLOWED_REDIRECT_URIS = new Set([
    'http://localhost:5173/auth/telegram/callback',
    'https://clawquest.ai/auth/telegram/callback',
    'https://clawquest-ai.vercel.app/auth/telegram/callback',
]);

// In route handler:
if (!ALLOWED_REDIRECT_URIS.has(redirectUri)) {
    return reply.status(400).send({ error: { message: 'Invalid redirect URI', code: 'INVALID_REDIRECT_URI' } });
}
```

Or derive it from `FRONTEND_URL` env var:
```typescript
const expectedRedirectUri = `${process.env.FRONTEND_URL}/auth/telegram/callback`;
```

### H4. Race condition: Prisma user creation without transaction

**File:** `/Users/hd/clawquest/apps/api/src/modules/auth/telegram-auth.service.ts` lines 33-95

The login flow does: (1) find user by telegramId, (2) if not found, create Supabase user, (3) create Prisma user. If two concurrent logins happen for the same Telegram user, both could pass step 1 (no user found), both create Supabase users (one fails), and depending on timing, the Prisma `user.create` could fail with a unique constraint violation on `telegramId`.

The error handling at line 54 partially addresses this for the Supabase side, but the Prisma create at line 60/77 is unguarded.

**Recommendation:** Wrap the find-or-create in a Prisma transaction with `upsert`:

```typescript
user = await prisma.user.upsert({
    where: { telegramId },
    update: { telegramUsername: claims.username ?? undefined },
    create: {
        supabaseId: supabaseUser.user.id,
        email: placeholderEmail,
        username: claims.username ?? `tg_${claims.telegramId}`,
        telegramId,
        telegramUsername: claims.username ?? null,
    },
});
```

---

## Medium Priority

### M1. Error messages leak internal details

**File:** `/Users/hd/clawquest/apps/api/src/modules/auth/auth.routes.ts` lines 65-68

The catch block returns `err.message` directly to the client, which could include internal Supabase errors, Prisma errors, or stack trace fragments:

```typescript
return reply.status(400).send({
    error: { message: err.message ?? 'Telegram login failed', code: 'TELEGRAM_AUTH_ERROR' },
});
```

**Recommendation:** Map known error types to user-friendly messages; log the full error server-side:

```typescript
const clientMessage = err.message?.includes('already linked')
    ? 'This Telegram account is already linked to another user'
    : 'Telegram login failed. Please try again.';
return reply.status(400).send({
    error: { message: clientMessage, code: 'TELEGRAM_AUTH_ERROR' },
});
```

### M2. `autoLinkAgents` has N+1 update pattern

**File:** `/Users/hd/clawquest/apps/api/src/modules/auth/telegram-auth.service.ts` lines 174-183

The function loops through `telegramLinks` and does individual `prisma.agent.update()` calls. For users with many agents, this creates N database round-trips.

```typescript
// CURRENT:
for (const link of telegramLinks) {
    if (!link.agent.ownerId) {
        await prisma.agent.update({ ... });
        linked.push(link.agent.agentname);
    }
}

// BETTER (single query):
const unownedAgentIds = telegramLinks
    .filter(l => !l.agent.ownerId)
    .map(l => l.agent.id);

if (unownedAgentIds.length > 0) {
    await prisma.agent.updateMany({
        where: { id: { in: unownedAgentIds } },
        data: { ownerId: userId, claimedAt: new Date(), claimedVia: 'telegram' },
    });
}
```

**Impact:** Low for now (most users have 0-2 agents), but good practice per CLAUDE.md ("Prefer findMany over loop queries to avoid N+1").

### M3. Unused `supabaseAdmin` parameter in `handleTelegramLink`

**File:** `/Users/hd/clawquest/apps/api/src/modules/auth/telegram-auth.service.ts` line 128

```typescript
const { code, codeVerifier, redirectUri, userId, prisma, supabaseAdmin: _admin } = params;
```

The `supabaseAdmin` parameter is destructured as `_admin` and never used. Either remove it from the interface or document why it might be needed in the future.

### M4. Telegram button SVG duplicated in login.tsx and register.tsx

**Files:**
- `/Users/hd/clawquest/apps/dashboard/src/routes/login.tsx` lines 119-145
- `/Users/hd/clawquest/apps/dashboard/src/routes/register.tsx` lines 63-89

The Telegram button (SVG icon + click handler + loading state) is copy-pasted across both files. Extract to a shared component:

```typescript
// components/TelegramLoginButton.tsx
export function TelegramLoginButton({ flow = 'login' }: { flow?: 'login' | 'link' }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    // ...
}
```

### M5. `consumeOidcParams` clears storage before validation

**File:** `/Users/hd/clawquest/apps/dashboard/src/lib/telegram-oidc.ts` lines 74-90

The function unconditionally removes all items from sessionStorage, then checks if they existed. This means if the callback page is refreshed (e.g., user hits F5 after an error), the params are gone and the user gets a "Session expired" message. This is actually correct behavior (consume-once pattern), but worth noting that refreshing the callback page will always fail.

This is acceptable for security (prevents replay), but consider showing a more specific message like "Please start the login flow again" instead of "Session expired".

---

## Low Priority

### L1. `TelegramCallback` component doesn't use `createRoute` file-based convention

The component is defined in `routes/auth/telegram-callback.tsx` but manually wired in `router.tsx` rather than using TanStack Router's file-based routing. This is consistent with how `callback.tsx` works, so it follows the existing pattern. No action needed.

### L2. Missing `nonce` claim in OIDC verification

The OIDC spec recommends using a `nonce` to prevent token replay attacks. The current implementation does not generate or verify a nonce. For PKCE flows, the nonce is less critical since the code_verifier already binds the token to the session, but it would be an additional defense layer. Low priority since PKCE is the primary protection mechanism.

### L3. `generateSupabaseSession` uses magiclink OTP workaround

**File:** `/Users/hd/clawquest/apps/api/src/modules/auth/telegram-auth.service.ts` lines 189-217

The session generation uses `generateLink(type: 'magiclink')` + `verifyOtp()` as a workaround to create Supabase sessions for Telegram-authenticated users. This is a known pattern when Supabase doesn't natively support the auth provider. It works, but:

- Each login generates a magiclink + verifies it, adding 2 Supabase API calls.
- If Supabase ever rate-limits magiclink generation, this could fail.

This is acceptable for now but worth monitoring.

---

## Edge Cases Found by Scout

1. **Existing user with same email:** If someone already has a Prisma user with email `tg_123@tg.clawquest.ai` (e.g., from a previous partial registration), the `prisma.user.create` at line 60 would fail with a unique constraint violation on `email`. The recovery at line 54-71 handles the Supabase side but could still fail on the Prisma side.

2. **Username collision:** `username: claims.username ?? 'tg_${claims.telegramId}'` -- if a Telegram username like `john` already exists as a Prisma username for another user, the create will fail with a unique constraint violation. Need either a retry with a suffix or use `upsert`.

3. **`telegramId` returned as `String(null)` when user exists without telegramId:** In `handleTelegramLogin` line 109, `String(user.telegramId)` where `telegramId` could be null would produce the string `"null"` instead of null. However, since the code only reaches this point after setting `telegramId = BigInt(claims.telegramId)` and either creating a new user with it or finding by it, this specific path should always have a non-null telegramId. Still, defensive coding would be: `telegramId: user.telegramId ? String(user.telegramId) : null`.

4. **Session storage cleared by browser:** If sessionStorage is cleared between the redirect to Telegram and the callback (e.g., browser settings, incognito session ended), the user gets "Session expired" with no clear path forward. The error UI correctly links back to `/login`.

5. **Account page Telegram link button is fire-and-forget:** In `account.tsx` line 198, `startTelegramLogin("link")` is called without try/catch or loading state. If the PKCE generation fails (e.g., `crypto.subtle` not available in HTTP context), the error is unhandled.

---

## Positive Observations

- Clean separation of concerns: OIDC utils, auth service, route handlers, frontend OIDC client
- Proper use of `jose` library with issuer + audience verification
- PKCE S256 challenge correctly implemented
- State parameter validated to prevent CSRF
- sessionStorage used correctly (not localStorage) for PKCE params -- clears on tab close
- BigInt telegramId conversion follows existing codebase pattern (compare with Telegram bot handlers)
- Migration file is clean and minimal
- `.env.example` updated with new vars and clear comments
- Account page correctly hides placeholder `tg_*@tg.clawquest.ai` emails
- Consistent error handling pattern with existing auth callback

---

## Recommended Actions (Priority Order)

1. **[C1] Fix BigInt serialization** in `handleTelegramLink` return -- change `telegramId: user.telegramId` to `telegramId: user.telegramId ? String(user.telegramId) : null`
2. **[C2] Replace `listUsers()` with paginated/filtered query** -- avoid loading all Supabase users into memory
3. **[H3] Validate `redirectUri` against allowlist** server-side
4. **[H4] Use `prisma.user.upsert`** instead of find + create to prevent race conditions
5. **[H1] Upgrade code verifier charset** to base64url for RFC compliance (optional but recommended)
6. **[M1] Sanitize error messages** returned to client
7. **[M2] Replace N+1 agent updates** with `updateMany`
8. **[M4] Extract Telegram button** into shared component
9. **[H2] Add open redirect validation** to `savedRedirect` (pre-existing, cross-cutting)

---

## Metrics

- **Type Coverage:** Good -- interfaces defined for all return types, Zod schema for request validation
- **Test Coverage:** No tests included in this review scope (unit tests for OIDC utils and service recommended)
- **Linting Issues:** 0 (based on code review; not lint-tool-verified)
- **Security Issues:** 2 high (redirectUri validation, open redirect), 1 medium (error message leaking)

---

## Unresolved Questions

1. Is Telegram's OIDC production-ready? The `oauth.telegram.org` endpoints may still be in beta. Need to verify stability guarantees.
2. Should the `TELEGRAM_CLIENT_SECRET` be required at startup, or should the server gracefully skip Telegram auth when not configured? Currently it throws at request time, which is fine for dev but noisy in logs.
3. The magiclink-OTP session generation workaround -- is there a Supabase Admin API to create sessions directly? `signInWithIdToken` might work if Supabase supports custom providers.
4. Username collision handling strategy needs a decision: suffix with number? Use telegramId as fallback? Currently it will crash.
