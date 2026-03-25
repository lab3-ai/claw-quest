# Phase 3: Frontend Login + Callback

## Overview
- **Priority:** High
- **Effort:** Medium
- **Status:** Completed
- **Depends on:** Phase 2

Add Telegram login button to login/register pages, handle OIDC callback, optional email prompt for new users.

## Key Insights
- PKCE (code_verifier + code_challenge) generated client-side, stored in sessionStorage
- State param for CSRF, also in sessionStorage
- Callback receives `code` from Telegram → sends to API → gets Supabase session
- `supabase.auth.setSession()` triggers `onAuthStateChange` → AuthContext updated
- No changes needed to AuthContext.tsx

## Related Files
- Create: `apps/dashboard/src/lib/telegram-oidc.ts`
- Create: `apps/dashboard/src/routes/auth/telegram-callback.tsx`
- Create: `apps/dashboard/src/components/telegram-link-prompt.tsx`
- Modify: `apps/dashboard/src/routes/login.tsx`
- Modify: `apps/dashboard/src/routes/register.tsx`

## Implementation Steps

### 1. Create `telegram-oidc.ts` (client helper)

```typescript
// Generate PKCE pair (code_verifier + code_challenge S256)
export function generatePkce(): { codeVerifier: string; codeChallenge: string }

// Generate random state for CSRF prevention
export function generateState(): string

// Build Telegram authorization URL
export function buildTelegramAuthUrl(params: {
  clientId: string
  redirectUri: string
  codeChallenge: string
  state: string
  scope?: string  // default: "openid profile telegram:bot_access"
}): string
// → https://oauth.telegram.org/auth?client_id=...&redirect_uri=...&response_type=code&scope=...&code_challenge=...&code_challenge_method=S256&state=...

// Initiate Telegram login (generates PKCE, stores in sessionStorage, redirects)
export function startTelegramLogin(): void
```

Use `VITE_TELEGRAM_CLIENT_ID` env var. Redirect URI: `${window.location.origin}/auth/telegram/callback`.

### 2. Create `telegram-callback.tsx`

Route: `/auth/telegram/callback`

```
URL params: ?code=xxx&state=yyy
```

Flow:
1. Extract `code` and `state` from URL search params
2. Validate `state` matches sessionStorage value
3. Retrieve `codeVerifier` from sessionStorage
4. `POST /auth/telegram` with `{ code, codeVerifier, redirectUri }`
5. On success:
   a. `supabase.auth.setSession({ access_token, refresh_token })`
   b. If `isNewUser` → show email link prompt (optional)
   c. Redirect to saved URL or `/quests`
6. On error → show error + link back to login
7. Clean up sessionStorage (codeVerifier, state)

### 3. Add Telegram button to `login.tsx`

Below Google button, above divider. Same style pattern:

```tsx
<button type="button" className="btn btn-outline" onClick={startTelegramLogin}>
  <TelegramIcon /> Continue with Telegram
</button>
```

Use inline SVG for Telegram icon (paper plane). Match Google button style.

### 4. Add Telegram button to `register.tsx`

Same button, same pattern.

### 5. Create `telegram-link-prompt.tsx`

Modal shown after first Telegram login (`isNewUser = true`):

```
"Welcome! Want to link an existing email account?"
[Enter email] [Skip]
```

If email entered → check if account exists → if yes, prompt to login with that account to merge. If no → just continue.

Keep it simple — just a prompt, not a full merge flow. User can always link later in account settings.

### 6. Add env var

Dashboard `.env`:
```
VITE_TELEGRAM_CLIENT_ID=  # Bot ID
```

## Todo
- [x] Create `telegram-oidc.ts` (PKCE, state, auth URL builder)
- [x] Create `telegram-callback.tsx` (handle redirect, exchange code, set session)
- [x] Add Telegram button to `login.tsx`
- [x] Add Telegram button to `register.tsx`
- [x] Create `telegram-link-prompt.tsx` (optional email prompt for new users)
- [x] Add `VITE_TELEGRAM_CLIENT_ID` to dashboard env
- [x] Register route in TanStack Router config

## Success Criteria
- "Continue with Telegram" button visible on login + register pages
- Clicking button redirects to Telegram authorization
- After authorizing, redirected back → session set → logged in
- New users see optional email prompt
- Existing Telegram users log in without re-creating account
- AuthContext works without any modifications
