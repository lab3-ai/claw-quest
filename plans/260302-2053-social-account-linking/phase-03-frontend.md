# Phase 03: Frontend

**Context:** [Brainstorm report](../reports/brainstorm-260302-2053-social-account-linking.md) | [plan.md](./plan.md)

## Overview

- **Priority:** P2
- **Status:** Complete
- **Effort:** 3h
- **Depends on:** Phase 01 (DB) + Phase 02 (API)

Two files to modify:
1. `auth/callback.tsx` — handle `USER_UPDATED` event + sync flow
2. `account.tsx` — Link/Unlink buttons for all providers

## Key Insights

- Supabase fires `USER_UPDATED` (not `SIGNED_IN`) when `linkIdentity()` completes
- Current `callback.tsx` only handles `SIGNED_IN` — identity linking silently falls through
- localStorage key `clawquest_linking_provider` guards against spurious `USER_UPDATED` triggers
- `supabase.auth.unlinkIdentity(identity)` is client-side; requires the full identity object from `getUser().identities`
- Lockout prevention: block unlink if `identities.length === 1` AND `profile.telegramId === null`
- Supabase provider names: `'google'`, `'github'`, `'twitter'`, `'discord'` (lowercase)
- `identity_data.email` for Google, `identity_data.user_name` for GitHub/Twitter/Discord

## Related Code Files

| File | Action | Change |
|------|--------|--------|
| `apps/dashboard/src/routes/auth/callback.tsx` | Modify | Handle USER_UPDATED + sync + redirect |
| `apps/dashboard/src/routes/_authenticated/account.tsx` | Modify | Link/Unlink buttons, updated UserProfile type |

## Architecture

### Callback Flow

```
USER_UPDATED event fires
  ├── Check localStorage: clawquest_linking_provider
  ├── If present (twitter|discord):
  │     ├── POST /auth/social/sync { provider }
  │     ├── clear localStorage key
  │     └── navigate to /account
  ├── If present (google|github):
  │     ├── clear localStorage key
  │     └── navigate to /account
  └── If absent: (other USER_UPDATED cause)
        └── no action (let existing logic handle)
```

### Account Page Provider State

```
providers.map(p):
  ├── isTelegram → existing logic (unchanged)
  ├── isLinked (Supabase identities) → show handle + Unlink button
  │     └── Twitter/Discord: also show @handle from profile.xHandle / profile.discordHandle
  └── not linked → show Link button
```

## Implementation Steps

### Step 1: Update `auth/callback.tsx`

Add `USER_UPDATED` handling inside the `onAuthStateChange` listener:

```typescript
const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === "SIGNED_IN" && session) {
    redirectAfterLogin()
  } else if (event === "USER_UPDATED" && session) {
    // Handle identity linking callback
    const linkingProvider = localStorage.getItem("clawquest_linking_provider")
    if (linkingProvider) {
      localStorage.removeItem("clawquest_linking_provider")
      // Sync handle to Prisma for Twitter/Discord
      if (linkingProvider === "twitter" || linkingProvider === "discord") {
        try {
          await fetch(`${API_BASE}/auth/social/sync`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ provider: linkingProvider }),
          })
        } catch {
          // Non-fatal: handle will be missing in profile but auth identity is linked
        }
      }
      navigate({ to: "/account" })
    }
  } else if (event === "SIGNED_OUT") {
    navigate({ to: "/login" })
  }
})
```

Add `API_BASE` constant at top of component (or import from lib):
```typescript
const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000"
```

### Step 2: Update `UserProfile` interface in `account.tsx`

```typescript
interface UserProfile {
  id: string
  email: string
  username: string | null
  role: string
  telegramId: string | null
  telegramUsername: string | null
  xId: string | null       // ADD
  xHandle: string | null   // ADD
  discordId: string | null        // ADD
  discordHandle: string | null    // ADD
  createdAt: string
}
```

### Step 3: Update providers array in `account.tsx`

```typescript
const providers = [
  { key: "google", label: "Google", icon: "G", supabaseProvider: "google" },
  { key: "github", label: "GitHub", icon: "GH", supabaseProvider: "github" },
  { key: "telegram", label: "Telegram", icon: "TG", supabaseProvider: null },  // custom OIDC
  { key: "twitter", label: "X (Twitter)", icon: "X", supabaseProvider: "twitter" },
  { key: "discord", label: "Discord", icon: "DC", supabaseProvider: "discord" },
]
```

### Step 4: Add `handleLinkProvider` function

```typescript
async function handleLinkProvider(provider: string, supabaseProvider: string) {
  // Store provider for callback detection
  if (supabaseProvider === "twitter" || supabaseProvider === "discord") {
    localStorage.setItem("clawquest_linking_provider", supabaseProvider)
  } else {
    localStorage.setItem("clawquest_linking_provider", supabaseProvider)
  }
  await supabase.auth.linkIdentity({
    provider: supabaseProvider as any,
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  })
}
```

### Step 5: Add `handleUnlinkProvider` function

```typescript
const [unlinkError, setUnlinkError] = useState<string>("")
const [unlinkPending, setUnlinkPending] = useState<string>("")

async function handleUnlinkProvider(providerKey: string) {
  setUnlinkError("")
  // Lockout prevention
  const nonTelegramIdentities = identities.filter(i => i.provider !== "telegram")
  const hasTelegram = !!profile?.telegramId
  if (!hasTelegram && nonTelegramIdentities.length <= 1) {
    setUnlinkError("Cannot unlink — this is your only sign-in method.")
    return
  }

  const identity = identities.find(i => i.provider === providerKey)
  if (!identity) return

  setUnlinkPending(providerKey)
  try {
    const { error } = await supabase.auth.unlinkIdentity(identity)
    if (error) throw error

    // Clear Prisma fields for Twitter/Discord
    if (providerKey === "twitter" || providerKey === "discord") {
      await fetch(`${API_BASE}/auth/social/${providerKey}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
    }

    queryClient.invalidateQueries({ queryKey: ["auth", "me"] })
    // Supabase session will auto-update via onAuthStateChange (USER_UPDATED)
  } catch (err: any) {
    setUnlinkError(err.message ?? "Failed to unlink provider")
  } finally {
    setUnlinkPending("")
  }
}
```

### Step 6: Update provider rendering in `account.tsx`

Replace the existing `providers.map()` block. Key changes:
- Remove `isPlaceholder` check (no more "Coming soon")
- Add Link button for all unlinked providers (except Telegram — keep existing OIDC flow)
- Add Unlink button for linked providers
- Show handle detail for Twitter/Discord from profile data

```typescript
{providers.map(p => {
  const identity = identities.find(i => i.provider === p.key)
  const isLinked = linkedProviders.has(p.key)
  const isTelegram = p.key === "telegram"
  const telegramLinked = isTelegram && !!profile?.telegramId

  // Detail text per provider
  let detail = ""
  if (p.key === "twitter" && profile?.xHandle) detail = `@${profile.xHandle}`
  else if (p.key === "discord" && profile?.discordHandle) detail = `@${profile.discordHandle}`
  else if (identity?.identity_data?.email) detail = identity.identity_data.email as string
  else if (identity?.identity_data?.user_name) detail = identity.identity_data.user_name as string

  return (
    <div key={p.key} className="account-provider" style={{ minWidth: 0 }}>
      <span className="account-provider-icon">{p.icon}</span>
      <span className="account-provider-name">{p.label}</span>

      {isTelegram ? (
        telegramLinked ? (
          <>
            <span className="account-provider-status-linked">Connected</span>
            <span className="account-provider-detail">
              {profile?.telegramUsername ? `@${profile.telegramUsername}` : ""}
            </span>
          </>
        ) : (
          <button
            className="btn btn-sm btn-outline"
            style={{ marginLeft: "auto", fontSize: "12px", padding: "4px 10px" }}
            onClick={() => startTelegramLogin("link")}
          >
            Link
          </button>
        )
      ) : isLinked ? (
        <>
          <span className="account-provider-status-linked">Connected</span>
          {detail && <span className="account-provider-detail">{detail}</span>}
          <button
            className="btn btn-sm btn-outline"
            style={{ marginLeft: "8px", fontSize: "12px", padding: "4px 10px" }}
            disabled={unlinkPending === p.key}
            onClick={() => handleUnlinkProvider(p.key)}
          >
            {unlinkPending === p.key ? "Unlinking…" : "Unlink"}
          </button>
        </>
      ) : (
        <button
          className="btn btn-sm btn-outline"
          style={{ marginLeft: "auto", fontSize: "12px", padding: "4px 10px" }}
          onClick={() => handleLinkProvider(p.key, p.supabaseProvider!)}
        >
          Link
        </button>
      )}
    </div>
  )
})}

{unlinkError && (
  <div className="account-error" style={{ marginTop: "8px" }}>{unlinkError}</div>
)}
```

### Step 7: Compile & verify

```bash
pnpm --filter dashboard build
# or dev and test manually
pnpm --filter dashboard dev
```

## Todo List

- [x] Update `auth/callback.tsx`: handle `USER_UPDATED` event + sync flow
- [x] Update `UserProfile` interface: add `xId`, `xHandle`, `discordId`, `discordHandle`
- [x] Update `providers` array: add `supabaseProvider` field, remove `isPlaceholder` logic
- [x] Add `handleLinkProvider()` function
- [x] Add `handleUnlinkProvider()` function with lockout prevention
- [x] Update `providers.map()` rendering: Link/Unlink buttons + handle display
- [x] Add `unlinkError` state display
- [x] Run `pnpm --filter dashboard build` and fix type errors

## Success Criteria

- Google / GitHub: "Link" button → OAuth flow → "Connected {email}"
- X (Twitter): "Link" button → Twitter OAuth → callback → sync → "Connected @handle"
- Discord: "Link" button → Discord OAuth → callback → sync → "Connected @handle"
- Telegram: unchanged (existing OIDC flow)
- Unlink button appears for all linked providers
- Cannot unlink last auth method (error shown)
- xHandle / discordHandle visible after linking

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| `supabase.auth.linkIdentity` API not on installed version | Medium | Check `package.json` for `@supabase/supabase-js` >= 2.39 |
| `USER_UPDATED` fires on profile update (not link) | Low | localStorage guard prevents spurious sync |
| Unlink triggers another `USER_UPDATED` → recursive | Low | No `clawquest_linking_provider` in localStorage → guard blocks |
| Discord handle uses different field than `user_name` | Medium | Test: may be `global_name` for Discord 2.0+ usernames |

## Security Considerations

- `linkIdentity` call happens client-side via Supabase (OAuth state param protection, PKCE)
- `unlinkIdentity` is safe — Supabase validates the request against current session
- Lockout check prevents account recovery being lost
- `POST /auth/social/sync` uses server session token — no client-side forgery possible

## Next Steps

- Test with real Twitter/Discord OAuth apps configured in Supabase dashboard
- Verify Discord `identity_data` field: `user_name` vs `global_name` (Discord 2.0)
- Mobile responsive pass (stretch goal)
