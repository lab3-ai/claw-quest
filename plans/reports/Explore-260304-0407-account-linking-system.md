# ClawQuest Account & Social Linking System Exploration

**Date**: 2026-03-04  
**Scope**: Profile/account page, social account linking flows, identity model

## Executive Summary

ClawQuest implements a comprehensive identity linking system supporting:
- **Supabase Auth** (Email, Google, GitHub, Twitter/X, Discord)
- **Telegram OIDC** (custom implementation)
- **Wallet management** (Ethereum addresses)

The account page at `/account` serves as the central hub for managing linked identities, with distinct flows for Telegram (OIDC) vs. other providers (Supabase OAuth).

---

## 1. Frontend Account Page (`/account`)

**File**: `/Users/hd/clawquest/apps/dashboard/src/routes/_authenticated/account.tsx`

### Components
- **Profile Section**: Displays email, username, member-since date
- **Connected Accounts Section**: Shows 5 providers with link/unlink buttons
- **Wallets Section**: List existing wallets, form to add new wallet address

### Supported Providers (Lines 48-54)
```typescript
const providers = [
    { key: "google", label: "Google", icon: "G", supabaseProvider: "google" },
    { key: "github", label: "GitHub", icon: "GH", supabaseProvider: "github" },
    { key: "telegram", label: "Telegram", icon: "TG", supabaseProvider: null },
    { key: "twitter", label: "X (Twitter)", icon: "X", supabaseProvider: "twitter" },
    { key: "discord", label: "Discord", icon: "DC", supabaseProvider: "discord" },
]
```

### Linking Logic

#### For Supabase Providers (Google, GitHub, Twitter, Discord)
1. User clicks "Link" button
2. `handleLinkProvider(supabaseProvider)` (line 123-135):
   - Stores provider key in localStorage: `clawquest_linking_provider`
   - Calls `supabase.auth.linkIdentity()` with Supabase OAuth redirect
   - For Discord, requests extra scope: `guilds guilds.members.read`
3. Browser redirects to OAuth provider, then to `/auth/callback`

#### For Telegram
1. User clicks "Link" button
2. `startTelegramLogin("link")` (line 267) initiates PKCE flow
3. Stores flow type in sessionStorage: `tg_flow: "link"`
4. Browser redirects to `/auth/telegram/callback` (custom)

### Unlinking Logic (Lines 138-176)
1. `handleUnlinkProvider(providerKey)` checks:
   - **Lockout prevention**: Cannot unlink if it's the only sign-in method (line 142-147)
     - Exception: If user has Telegram linked, can unlink other methods
   - Unlinks from Supabase via `supabase.auth.unlinkIdentity()`
2. For Twitter/Discord only (lines 158-167):
   - DELETE `/auth/social/{provider}` to clear Prisma fields
   - Google/GitHub don't need backend cleanup

### Data Fetching
- **Profile** (line 67-77): `GET /auth/me` → fetches from API
- **Wallets** (line 80-90): `GET /wallets` → fetches from API
- User identities from Supabase: `supabaseUser.identities`

### Styling
**File**: `/Users/hd/clawquest/apps/dashboard/src/styles/pages/account.css`
- Grid-based layout with sections (Profile, Connected Accounts, Wallets)
- Provider rows: icon + name + status + optional handle + action button
- Locked wallet form with address validation

---

## 2. Telegram Callback Route

**File**: `/Users/hd/clawquest/apps/dashboard/src/routes/auth/telegram-callback.tsx`

### Flow Detection (Lines 46-76)
```typescript
if (stored.flow === "link") {
    // Link flow — attach Telegram to existing account
    setStatus("Linking Telegram account...")
    const token = session?.access_token
    const res = await fetch(`${API_BASE}/auth/telegram/link`, {
        method: "POST",
        body: JSON.stringify({ code, codeVerifier, redirectUri })
    })
    navigate({ to: "/account" })
} else {
    // Login flow
    const res = await fetch(`${API_BASE}/auth/telegram`, { ... })
    // Set session + redirect
}
```

### PKCE Validation (Lines 31-42)
- Retrieves stored params via `consumeOidcParams()`
- Validates state parameter against CSRF attack
- Clears sessionStorage after use

---

## 3. Supabase Callback Route

**File**: `/Users/hd/clawquest/apps/dashboard/src/routes/auth/callback.tsx`

### Identity Linking Detection (Lines 28-52)
```typescript
const linkingProvider = localStorage.getItem("clawquest_linking_provider")
if (linkingProvider) {
    localStorage.removeItem("clawquest_linking_provider")
    if (linkingProvider === "twitter" || linkingProvider === "discord") {
        await fetch(`${API_BASE}/auth/social/sync`, {
            method: "POST",
            body: JSON.stringify({
                provider: linkingProvider,
                providerToken: session.provider_token,
                providerRefreshToken: session.provider_refresh_token
            })
        })
    }
    navigate({ to: "/account" })
}
```

### Google/GitHub Linking
- No backend sync needed (only Supabase identity is used)
- Just store identity in Supabase identities array

---

## 4. API Auth Module

**File**: `/Users/hd/clawquest/apps/api/src/modules/auth/auth.routes.ts`

### POST /auth/me (Lines 36-68)
Returns user profile including all linked identities:
```typescript
{
    id, email, username, role,
    telegramId, telegramUsername,
    xId, xHandle, hasXToken,
    discordId, discordHandle, hasDiscordToken,
    createdAt, updatedAt
}
```

### POST /auth/telegram (Lines 72-101)
**Purpose**: Login via Telegram OIDC  
**Handler**: `handleTelegramLogin()`
- Exchanges code for ID token
- Verifies JWT via Telegram's JWKS
- Creates/finds Prisma user
- Auto-links agents via TelegramLink matching
- Returns Supabase session

### POST /auth/telegram/link (Lines 104-136)
**Purpose**: Link Telegram to existing account  
**Auth**: Requires Supabase JWT  
**Handler**: `handleTelegramLink()`
- Verifies Telegram account not already linked elsewhere (line 156-159)
- Updates User model with telegramId + telegramUsername
- Auto-links agents
- Returns updated user data

### POST /auth/social/sync (Lines 139-216)
**Purpose**: Sync social identity handle after OAuth callback  
**Auth**: Requires Supabase JWT  
**Providers**: Twitter, Discord (Google/GitHub are no-ops)

**For Twitter** (lines 183-187):
```typescript
await prisma.user.update({
    data: { xId: sub, xHandle: userName }
})
```

**For Discord** (lines 188-204):
- Stores `discordId`, `discordHandle`
- Stores `discordAccessToken`, `discordRefreshToken`, `discordTokenExpiry`
- Token expiry: 7 days from exchange

**Error Handling** (line 208-211):
- P2002 error (unique constraint): Returns 409 if account already linked to another user

### DELETE /auth/social/:provider (Lines 219-255)
**Purpose**: Clear social identity from Prisma after client unlink  
**Auth**: Requires Supabase JWT  
**Clears** (provider-specific):
- **Twitter**: xId, xHandle, xAccessToken, xRefreshToken, xTokenExpiry
- **Discord**: discordId, discordHandle, discordAccessToken, discordRefreshToken, discordTokenExpiry

### GET /auth/x/authorize (Lines 257-277)
**Purpose**: Generate X OAuth2 PKCE authorize URL for read tokens  
**Auth**: Requires Supabase JWT  
**Returns**: { url, state, codeVerifier }
**Scopes**: `tweet.read users.read follows.read like.read offline.access`

### POST /auth/x/callback (Lines 279-340)
**Purpose**: Exchange X OAuth code for read tokens  
**Auth**: Requires Supabase JWT  
**Body**: { code, codeVerifier, redirectUri }
**Updates User**: xAccessToken, xRefreshToken, xTokenExpiry

---

## 5. Frontend Telegram OIDC Library

**File**: `/Users/hd/clawquest/apps/dashboard/src/lib/telegram-oidc.ts`

### startTelegramLogin(flow: 'login' | 'link')
1. Generates PKCE: codeVerifier + S256 challenge
2. Generates random state (CSRF protection)
3. Stores in sessionStorage:
   - `tg_code_verifier`
   - `tg_state`
   - `tg_flow` (login or link)
4. Redirects to `https://oauth.telegram.org/auth?client_id=...&code_challenge=...&state=...`

### consumeOidcParams()
- Retrieves and clears stored PKCE params from sessionStorage
- Returns: { codeVerifier, state, flow }
- Used by `/auth/telegram/callback` route

### Constants
- **TELEGRAM_AUTH_URL**: `https://oauth.telegram.org/auth`
- **DEFAULT_SCOPE**: `openid profile telegram:bot_access`
- **Redirect URI**: `{origin}/auth/telegram/callback`

---

## 6. Backend Telegram OIDC Implementation

**File**: `/Users/hd/clawquest/apps/api/src/modules/auth/telegram-oidc.utils.ts`

### verifyTelegramIdToken(idToken: string)
- Verifies JWT signature via remote JWKS: `https://oauth.telegram.org/.well-known/jwks.json`
- Uses `jose` library for JWT verification
- **Issuer**: `https://oauth.telegram.org`
- **Audience**: `TELEGRAM_CLIENT_ID` (bot username)
- **Returns**: TelegramClaims { telegramId, name, username, picture }

### exchangeTelegramCode(params)
- POST to `https://oauth.telegram.org/token`
- **Body**: grant_type=authorization_code, code, redirect_uri, client_id, client_secret, code_verifier
- **Returns**: { id_token, access_token }

---

## 7. X (Twitter) OAuth Integration

**File**: `/Users/hd/clawquest/apps/api/src/modules/x/x-rest-client.ts`

### Token Refresh (Lines 15-66)
```typescript
export async function refreshXToken(userId, refreshToken, prisma)
```
- Uses `grant_type=refresh_token` with X_CLIENT_ID + X_CLIENT_SECRET
- Updates DB: xAccessToken, xRefreshToken, xTokenExpiry
- Returns: { accessToken, refreshToken }

### ensureFreshToken(user, prisma)
- Auto-refreshes if token expiry within 5min buffer
- Returns fresh access token or null

### Verification Endpoints
- `checkFollowing(token, userXId, targetXId)` - Paginate following list (max 1000)
- `getLikingUsers(token, tweetId, userXId)` - Check if user liked tweet
- `getRetweetedBy(token, tweetId, userXId)` - Check if user retweeted
- `getTweet(token, tweetId)` - Get tweet details (authorId, quotedTweetId)
- `lookupUserByUsername(token, username)` - Resolve @username to X user ID

---

## 8. Discord Integration

**File**: `/Users/hd/clawquest/apps/api/src/modules/discord/discord-rest-client.ts`

### Bot Functions (require DISCORD_BOT_TOKEN)
- `resolveInvite(code)` - Public endpoint, no auth needed
- `getGuildRoles(guildId)` - Requires bot in server
- `getGuildMember(guildId, userId)` - Get member's roles via bot

### User OAuth Functions
- `getUserGuildMember(accessToken, guildId)` - Uses user's Discord OAuth token (scope: `guilds.members.read`)
- Does NOT require bot to be in server

---

## 9. Wallet Management

**File**: `/Users/hd/clawquest/apps/api/src/modules/wallets/wallets.routes.ts`

### POST /wallets (Lines 8-65)
**Purpose**: Link wallet address to user  
**Auth**: Requires JWT  
**Body**: { address: string (0x...), chainId?: number }  
**Returns**: { id, address (lowercase), chainId, isPrimary, createdAt }

**Logic**:
- Normalizes address to lowercase
- First wallet becomes primary
- Upserts on unique constraint (userId_address)

### GET /wallets (Lines 68-102)
**Purpose**: List user's wallets  
**Returns**: Array of wallet objects, ordered by isPrimary desc, then createdAt desc

---

## 10. Prisma User Model

**File**: `/Users/hd/clawquest/apps/api/prisma/schema.prisma` (Lines 11-36)

```prisma
model User {
  id                String   @id @default(uuid())
  supabaseId        String?  @unique
  email             String   @unique
  username          String?  @unique
  role              String   @default("user")
  
  // Telegram
  telegramId        String?  @unique
  telegramUsername  String?
  
  // X (Twitter)
  xId               String?  @unique
  xHandle           String?
  xAccessToken      String?
  xRefreshToken     String?
  xTokenExpiry      DateTime?
  
  // Discord
  discordId         String?  @unique
  discordHandle     String?
  discordAccessToken  String?
  discordRefreshToken String?
  discordTokenExpiry  DateTime?
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  agents            Agent[]
  wallets           WalletLink[]
  participations    QuestParticipation[]
}
```

### Key Design Decisions
- **telegramId is String** (not BigInt): Can store large Telegram user IDs (line 18)
- **Unique constraints**: Only one Telegram per user, one X account per user, etc.
- **OAuth tokens stored**: xAccessToken, xRefreshToken (for X), discordAccessToken, discordRefreshToken (for Discord)
- **Token expiry tracked**: xTokenExpiry, discordTokenExpiry

---

## 11. Social Action Verification at Quest Completion

**File**: `/Users/hd/clawquest/apps/api/src/modules/quests/social-action-verifier.ts`

### VerificationContext (Lines 11-30)
Passed to verification functions:
```typescript
interface VerificationContext {
  userId: string
  prisma: PrismaClient
  xId?: string | null
  xAccessToken?: string | null
  xRefreshToken?: string | null
  xTokenExpiry?: Date | null
  discordId?: string | null
  discordAccessToken?: string | null
  telegramId?: string | null
  proofUrls?: Record<number, string>  // for post/quote_post
  params?: Record<string, string>     // task params
  telegramBotToken?: string
}
```

### X Verification Actions
- **follow_account**: Uses `checkFollowing()`
- **like_post**: Uses `getLikingUsers()`
- **repost**: Uses `getRetweetedBy()`
- **post** / **quote_post**: Uses `getTweet()`, validates authorId + quotedTweetId

### Discord Verification Actions
- **join_server**: Checks `getUserGuildMember()` (user token) or `getGuildMember()` (bot)
- **verify_role**: Delegates to `validateSocialTarget()`

### Telegram Verification Actions
- **join_channel**: Uses bot API `getChat()` to check membership

---

## 12. Key Flows Summary

### Login Flow (Supabase)
1. User → Google/GitHub OAuth → Supabase → `/auth/callback` → Redirect

### Login Flow (Telegram)
1. User → `startTelegramLogin("login")` → Telegram OIDC → `/auth/telegram/callback`
2. Frontend exchanges code at `POST /auth/telegram`
3. Backend creates user, returns Supabase session
4. Redirect to `/quests`

### Link Provider (Supabase)
1. User clicks "Link" on account page
2. Store `clawquest_linking_provider` in localStorage
3. `supabase.auth.linkIdentity()` → OAuth → `/auth/callback`
4. Detect linking via localStorage key
5. `POST /auth/social/sync` (Twitter/Discord only)
6. Navigate to `/account`

### Link Telegram
1. User clicks "Link" on account page
2. `startTelegramLogin("link")` → Store `tg_flow: "link"` in sessionStorage
3. Telegram OIDC → `/auth/telegram/callback`
4. `POST /auth/telegram/link` (requires JWT)
5. Navigate to `/account`

### Link X (Twitter) for Verification
1. User goes to quest task requiring X verification
2. Frontend: Click "Link X" → `GET /auth/x/authorize`
3. Get authorize URL + codeVerifier + state
4. Redirect to X OAuth → `/auth/x/callback`
5. Frontend exchanges code at `POST /auth/x/callback`
6. Backend stores xAccessToken, xRefreshToken, xTokenExpiry
7. Ready for verification

### Unlink Provider
1. User clicks "Unlink" on account page
2. Lockout prevention check (ensures ≥1 sign-in method remains)
3. `supabase.auth.unlinkIdentity()`
4. For Twitter/Discord: `DELETE /auth/social/{provider}` (clears Prisma fields)
5. Redirect to `/account`

---

## 13. Environment Variables Required

### Frontend
- `VITE_TELEGRAM_CLIENT_ID` - Telegram bot client ID for OIDC

### Backend
- `TELEGRAM_CLIENT_ID` - Telegram bot client ID
- `TELEGRAM_CLIENT_SECRET` - Telegram bot secret
- `X_CLIENT_ID` - X OAuth2 app ID
- `X_CLIENT_SECRET` - X OAuth2 app secret
- `DISCORD_CLIENT_ID` - Discord app ID
- `DISCORD_BOT_TOKEN` - Discord bot token
- `FRONTEND_URL` - For X OAuth redirect URI (default: http://localhost:5173)

---

## 14. File Structure Summary

### Frontend
- `/auth/callback.tsx` - Supabase OAuth callback (Google, GitHub, Twitter, Discord)
- `/auth/telegram-callback.tsx` - Telegram OIDC callback (login + link)
- `/auth/x-callback.tsx` - X OAuth2 callback (for read token grant)
- `/_authenticated/account.tsx` - Account/settings page (profile, identities, wallets)
- `/lib/telegram-oidc.ts` - Telegram OIDC PKCE helper

### Backend
- `/modules/auth/auth.routes.ts` - All auth endpoints (8 routes)
- `/modules/auth/telegram-auth.service.ts` - Telegram login/link handlers
- `/modules/auth/telegram-oidc.utils.ts` - Telegram JWT verification + code exchange
- `/modules/x/x-rest-client.ts` - X API verification methods
- `/modules/discord/discord-rest-client.ts` - Discord API helpers
- `/modules/discord/discord.routes.ts` - Discord guild info endpoints
- `/modules/wallets/wallets.routes.ts` - Wallet linking endpoints
- `/modules/quests/social-action-verifier.ts` - Quest completion verification

### Database
- `prisma/schema.prisma` - User model with all identity fields

---

## 15. Unresolved Questions / Gaps

1. **X OAuth Callback Frontend Route** 
   - File exists at `/auth/x-callback.tsx` but unclear if fully integrated with quest task UI
   - Need to verify quest task pages trigger X linking flow

2. **Discord Token Refresh**
   - Discord tokens stored but no refresh mechanism found (7-day expiry hardcoded)
   - Should implement refresh similar to X token refresh?

3. **Wallet Linking Security**
   - No validation that user owns the wallet address
   - Only checks format and uniqueness
   - EOA validation or signature verification not implemented

4. **Telegram Unlink**
   - Frontend doesn't expose "Unlink" button for Telegram (unlike Supabase providers)
   - Telegram can only be unlinked via API endpoint (if created)
   - No DELETE endpoint for Telegram in auth.routes.ts

5. **Identity Recovery**
   - No mechanism for re-linking Telegram if accidentally unlinked
   - TelegramLink matches by telegramId, could cause issues on re-link

6. **Google/GitHub Identity Data**
   - These are stored only in Supabase identities
   - No Prisma fields for their IDs/handles
   - Is this intentional? (handles not needed for social tasks?)

---

**Report Generated**: 2026-03-04
