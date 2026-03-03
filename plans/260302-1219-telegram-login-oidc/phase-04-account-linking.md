# Phase 4: Account Linking

## Overview
- **Priority:** Medium
- **Effort:** Small
- **Status:** Completed
- **Depends on:** Phase 2, Phase 3

Add "Link Telegram" button in account settings for users who logged in via email/Google. Display linked Telegram info.

## Key Insights
- Account page already has "Connected Accounts" section with Telegram row showing "Coming soon"
- Replace "Coming soon" with functional "Link" button for Telegram
- Reuse `startTelegramLogin()` from `telegram-oidc.ts` but target `/auth/telegram/link` API
- After linking, display Telegram username + "Connected" status
- Profile section should hide placeholder email (`tg_*@tg.clawquest.ai`)

## Related Files
- Modify: `apps/dashboard/src/routes/_authenticated/account.tsx`
- Modify: `apps/api/src/modules/auth/auth.routes.ts` (already created POST /auth/telegram/link in Phase 2)

## Implementation Steps

### 1. Update account.tsx Connected Accounts section

For Telegram provider row:
- If `user.telegramId` exists → show "Connected" + `@username`
- If not → show "Link" button that initiates Telegram OIDC (link flow variant)

Link flow uses same PKCE + redirect but callback distinguishes link vs login via a sessionStorage flag (`telegram_flow: "link"`).

Callback route checks this flag:
- If `"link"` → `POST /auth/telegram/link` (with existing auth token)
- If `"login"` → `POST /auth/telegram` (no auth needed)

### 2. Update profile display

Hide placeholder email pattern:
```typescript
const displayEmail = profile?.email?.match(/^tg_\d+@tg\.clawquest\.ai$/)
  ? null  // Show "Add email" link instead
  : profile?.email
```

If Telegram user with no real email → show "Add email" option.

### 3. Add telegramId to /auth/me response (Phase 1 overlap)

Ensure `/auth/me` returns `telegramId` and `telegramUsername` so account page can check linked status without extra API calls.

## Todo
- [x] Replace Telegram "Coming soon" with functional Link/Connected status
- [x] Add link flow variant to telegram-callback.tsx
- [x] Hide placeholder email in profile display
- [x] Show "Add email" for Telegram-only users
- [x] Display @username when Telegram linked

## Success Criteria
- Telegram row shows "Link" button for unlinked users
- Clicking "Link" → Telegram OIDC → account linked → shows "Connected @username"
- Agents auto-linked after Telegram link
- Placeholder email hidden in profile UI
- Telegram-only users prompted to add real email
