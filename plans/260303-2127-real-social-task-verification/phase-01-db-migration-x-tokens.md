# Phase 1: DB Migration + X Token Storage

## Context Links
- Prisma schema: `/Users/hd/clawquest/apps/api/prisma/schema.prisma`
- Auth routes: `/Users/hd/clawquest/apps/api/src/modules/auth/auth.routes.ts`
- Env example: `/Users/hd/clawquest/.env.example`
- Discord token pattern (lines 186-201 of auth.routes.ts)

## Overview
- **Priority:** P1 (blocks all X verification)
- **Status:** completed
- **Effort:** 1.5h

Add X OAuth token fields to User model, update /social/sync to store them, update /social/:provider DELETE to clear them, add env vars.

## Key Insights
- Discord pattern already exists: `discordAccessToken`, `discordRefreshToken`, `discordTokenExpiry` — mirror exactly
- X access token: 2h lifetime, refresh token: 6 months (one-time use, rotates on refresh)
- **2-step X auth flow**: Supabase handles identity linking (xId/xHandle via `/social/sync`). Separate custom X OAuth PKCE flow handles read tokens with correct scopes.
- `/social/sync` stays as-is for X (only xId/xHandle). New `/auth/x/authorize` + `/auth/x/callback` endpoints handle read tokens.
- `/auth/me` should expose `hasXToken: boolean` (not raw token) so frontend knows if read token grant needed

## Requirements

### Functional
- Store X OAuth tokens (access, refresh, expiry) on User model
- **New endpoint**: `GET /auth/x/authorize` — generate PKCE challenge, return redirect URL with read scopes
- **New endpoint**: `POST /auth/x/callback` — exchange auth code for tokens, store in User model
- /social/sync unchanged for X (still only xId/xHandle from Supabase identity)
- /social/:provider DELETE clears X token fields alongside xId/xHandle
- /auth/me returns `hasXToken` boolean indicator

### Non-functional
- Tokens encrypted at rest via Supabase Vault (future — out of scope, document as TODO)
- Migration must be non-destructive (nullable fields only)

## Architecture

```
User model additions:
  xAccessToken    String?    // X OAuth2 access token
  xRefreshToken   String?    // X OAuth2 refresh token (one-time use)
  xTokenExpiry    DateTime?  // When access token expires
```

## Related Code Files

### Modify
- `apps/api/prisma/schema.prisma` — add 3 fields after `xHandle`
- `apps/api/src/modules/auth/auth.routes.ts` — update twitter branch in /social/sync + DELETE
- `.env.example` — add X_CLIENT_ID, X_CLIENT_SECRET

## Implementation Steps

### 1. Add fields to Prisma schema (schema.prisma)

After line 21 (`xHandle`), add:

```prisma
  xAccessToken    String?                   // X OAuth2 access token (2h lifetime)
  xRefreshToken   String?                   // X OAuth2 refresh token (one-time use, 6mo)
  xTokenExpiry    DateTime?                 // When the X access token expires
```

### 2. Run migration

```bash
pnpm --filter api db:migrate -- --name add_x_oauth_tokens
```

### 3. Add X OAuth endpoints (auth.routes.ts)

**Note:** /social/sync twitter branch stays as-is (only xId/xHandle from Supabase identity). X read tokens come from separate OAuth flow below.

**GET /auth/x/authorize** — generate PKCE params, return redirect URL:
```typescript
app.get('/x/authorize', {
    onRequest: [app.authenticate],
    schema: { tags: ['Auth'], summary: 'Get X OAuth authorize URL for read tokens' },
}, async (request) => {
    const codeVerifier = crypto.randomBytes(64).toString('base64url')
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url')
    const state = crypto.randomBytes(16).toString('hex')
    // Store verifier in user session (or short-lived DB field)
    // For simplicity: store in a memory cache keyed by state (or use user.id)
    const scopes = 'tweet.read users.read follows.read like.read retweet.read offline.access'
    const redirectUri = `${process.env.API_BASE_URL || 'http://localhost:3000'}/auth/x/callback`
    const url = `https://x.com/i/oauth2/authorize?response_type=code&client_id=${process.env.X_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`
    return { url, state, codeVerifier } // Frontend stores codeVerifier temporarily
})
```

**POST /auth/x/callback** — exchange code for tokens:
```typescript
app.post('/x/callback', {
    onRequest: [app.authenticate],
    schema: { tags: ['Auth'], summary: 'Exchange X OAuth code for read tokens', body: z.object({ code: z.string(), codeVerifier: z.string(), redirectUri: z.string() }) },
}, async (request, reply) => {
    const { code, codeVerifier, redirectUri } = request.body as any
    const body = new URLSearchParams({
        grant_type: 'authorization_code', client_id: process.env.X_CLIENT_ID!,
        redirect_uri: redirectUri, code_verifier: codeVerifier, code,
    })
    const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' }
    if (process.env.X_CLIENT_SECRET) {
        headers['Authorization'] = `Basic ${Buffer.from(`${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`).toString('base64')}`
    }
    const res = await fetch('https://api.x.com/2/oauth2/token', { method: 'POST', headers, body: body.toString() })
    if (!res.ok) return reply.status(400).send({ error: { message: 'X token exchange failed' } })
    const data = await res.json() as { access_token: string; refresh_token: string; expires_in: number }
    await app.prisma.user.update({
        where: { id: request.user.id },
        data: { xAccessToken: data.access_token, xRefreshToken: data.refresh_token, xTokenExpiry: new Date(Date.now() + data.expires_in * 1000) },
    })
    return { ok: true }
})
```

### 4. Update DELETE /social/:provider (auth.routes.ts)

Current twitter block (line 230-233):
```typescript
if (provider === 'twitter') {
    await app.prisma.user.update({
        where: { id: request.user.id },
        data: { xId: null, xHandle: null },
    });
}
```

Change to:
```typescript
if (provider === 'twitter') {
    await app.prisma.user.update({
        where: { id: request.user.id },
        data: {
            xId: null, xHandle: null,
            xAccessToken: null, xRefreshToken: null, xTokenExpiry: null,
        },
    });
}
```

### 5. Update GET /me (auth.routes.ts)

Add to response object (after line 61):
```typescript
hasXToken: !!user.xAccessToken,
hasDiscordToken: !!user.discordAccessToken,
```

### 6. Update .env.example

Add after `DISCORD_CLIENT_ID=""`:
```
X_CLIENT_ID=""             # X OAuth 2.0 app client ID (for token refresh)
X_CLIENT_SECRET=""         # X OAuth 2.0 app client secret
```

## Todo List

- [ ] Add xAccessToken, xRefreshToken, xTokenExpiry to User in schema.prisma
- [ ] Run `prisma migrate dev --name add_x_oauth_tokens`
- [ ] Add GET /auth/x/authorize endpoint (PKCE + scopes)
- [ ] Add POST /auth/x/callback endpoint (exchange code → store tokens)
- [ ] Update DELETE /social/:provider twitter branch to clear token fields
- [ ] Update GET /me to return hasXToken + hasDiscordToken booleans
- [ ] Add X_CLIENT_ID, X_CLIENT_SECRET to .env.example
- [ ] Compile check: `pnpm --filter api build`

## Success Criteria
- Migration applies cleanly, no data loss
- /social/sync stores X tokens when provided
- DELETE /social/twitter clears all X fields
- /me returns hasXToken boolean

## Risk Assessment
- **Low:** nullable fields = zero risk to existing data
- **Token storage in plaintext:** acceptable for MVP; document Vault encryption as future TODO

## Next Steps
- Phase 2 uses xAccessToken/xRefreshToken for X API calls
