# Phase 3: Tests + Error Handling Polish

## Context
- Existing test: `apps/api/src/modules/quests/__tests__/quests.service.test.ts`
- New service: `apps/api/src/modules/quests/social-validator.ts`
- No existing test framework setup issues (tests already run)

## Overview
- **Priority**: Medium
- **Status**: Pending
- **Effort**: 1h

## Files to Create

### `apps/api/src/modules/quests/__tests__/social-validator.test.ts` (~100 lines)

Unit tests for `social-validator.ts`. Mock `fetch` globally to avoid real network calls.

## Implementation Steps

### 1. Unit tests for `social-validator.ts`

Test each validator function with mocked fetch:

```typescript
// Test cases for validateXAccount
- returns valid:true + meta.name when oEmbed returns 200
- returns valid:false when oEmbed returns 404
- returns valid:true on network timeout (graceful degradation)
- strips @ prefix from username before calling

// Test cases for validateXPost
- returns valid:true for valid post URL
- returns valid:false for 404 post
- returns valid:true on timeout

// Test cases for validateDiscordInvite
- extracts invite code from discord.gg URL
- extracts invite code from discord.com/invite URL
- returns valid:true + meta.name with guild info
- returns valid:false for expired/invalid invite
- returns valid:true on timeout

// Test cases for validateTelegramChannel
- returns valid:true with channel title
- returns valid:false for non-existent channel
- returns valid:true with warning when no bot token provided
- handles @username and t.me/username formats

// Test cases for validateSocialTarget dispatcher
- routes x/follow_account to validateXAccount
- routes x/like_post to validateXPost
- routes discord/join_server to validateDiscordInvite
- routes telegram/join_channel to validateTelegramChannel
- returns valid:true for unsupported platform+type combos (e.g. x/post)
```

### 2. Error handling polish in `social-validator.ts`

Review and harden:
- [ ] All fetch calls wrapped in try/catch
- [ ] AbortSignal.timeout(8000) on every fetch
- [ ] JSON parse errors caught (Discord/Telegram return JSON)
- [ ] Non-JSON responses handled (X oEmbed returns JSON but could fail)
- [ ] Empty/null values return early with `valid:false`

### 3. Edge case handling

- X username with special chars that pass regex but fail oEmbed
- Discord invite URLs with query params (e.g. `?event=123`)
- Telegram channels with unusual unicode usernames
- Very long values (cap at 200 chars before sending to external API)

### 4. Compile check

```bash
pnpm --filter api build
pnpm --filter dashboard build
```

## Todo List
- [ ] Create `apps/api/src/modules/quests/__tests__/social-validator.test.ts`
  - [ ] Mock global fetch
  - [ ] X account tests (valid, invalid, timeout)
  - [ ] X post tests (valid, invalid, timeout)
  - [ ] Discord invite tests (valid, expired, timeout, URL parsing)
  - [ ] Telegram channel tests (valid, invalid, no token, formats)
  - [ ] Dispatcher routing tests
- [ ] Review `social-validator.ts` error handling
  - [ ] All fetches have try/catch + timeout
  - [ ] JSON parse safety
  - [ ] Input sanitization (trim, length cap)
- [ ] Run `pnpm --filter api build` to verify no type errors
- [ ] Run `pnpm --filter dashboard build` to verify frontend compiles
- [ ] Manual smoke test of each platform validation via Scalar docs UI

## Success Criteria
- All unit tests pass
- Both API and Dashboard compile without errors
- Manual test via `/docs` (Scalar) confirms each platform works
- Timeout behavior verified (no hanging requests)

## Security Considerations
- Input length capped before forwarding to external APIs
- No user-controlled URLs passed to arbitrary fetch (each validator constructs its own URL from extracted identifiers)
