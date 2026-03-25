---
title: "Real Social Task Verification"
description: "Replace existence-only checks with real platform API verification for all social task types"
status: completed
priority: P1
effort: 14h
branch: feat/real-social-verification
tags: [social, verification, x-api, telegram, discord, oauth]
created: 2026-03-03
completed: 2026-03-03
---

# Real Social Task Verification

## Problem

Current `social-validator.ts` only checks target existence (tweet exists, invite valid) — never confirms user actually performed the action. Only `verify_role` has real verification. Users can click "Do it" then "Verify" without completing the task.

## Solution

Backend calls platform APIs with user's linked OAuth tokens to confirm each action. Three platform integrations: X (OAuth 2.0 PKCE), Discord (existing OAuth), Telegram (Bot API).

## Architecture

```
Frontend (detail.tsx)
  │
  ├─ POST /quests/:id/tasks/verify { proofUrls: { 2: "https://x.com/.../status/123" } }
  │
  ├─ social-validator.ts (dispatcher) ──→ verifySocialAction()
  │     ├─ x-rest-client.ts      (checkFollowing, getLikingUsers, getRetweetedBy, getTweet)
  │     ├─ discord-rest-client.ts (getUserGuildMember — existing)
  │     └─ Telegram Bot API       (getChatMember — existing bot token)
  │
  └─ Token refresh: x-rest-client auto-refreshes expired tokens, writes back to DB
```

## Phases

| # | Phase | Effort | Status |
|---|-------|--------|--------|
| 1 | [DB Migration + X Token Storage](./phase-01-db-migration-x-tokens.md) | 1.5h | completed |
| 2 | [X REST Client](./phase-02-x-rest-client.md) | 3h | completed |
| 3 | [Extend Social Validator](./phase-03-extend-social-validator.md) | 3h | completed |
| 4 | [Update Quest Verification Routes](./phase-04-update-quest-routes.md) | 2.5h | completed |
| 5 | [Frontend Updates](./phase-05-frontend-updates.md) | 2.5h | completed |
| 6 | [Testing](./phase-06-testing.md) | 1.5h | completed |

## Dependencies

- X API Basic tier subscription ($200/mo) — required for follow/like/retweet verification
- X OAuth app registered with correct redirect URIs and scopes
- Telegram bot must be admin in channels for `join_channel` verification
- Discord OAuth already working (tokens stored in User model)

## Key Decisions

1. **Token storage in User model** — mirrors Discord pattern, no new tables (YAGNI)
2. **URL-based proof for post/quote_post** — user pastes tweet URL, backend confirms author
3. **Graceful degradation** — rate limit or API error returns actionable message, never blocks UX permanently
4. **Two-function split in social-validator** — `validateSocialTarget()` (creation-time, exists-check) stays unchanged; new `verifySocialAction()` (completion-time, real check) added
5. **X OAuth: 2-step flow** — Supabase handles identity (xId/xHandle), separate custom OAuth PKCE flow for read tokens (scopes: tweet.read, users.read, follows.read, like.read, retweet.read, offline.access)
6. **Discord guildId: stored at quest creation** — auto-resolve invite → store guildId in task params, avoid extra API call at verify time
7. **Token refresh: lazy** — check expiry before each API call, refresh if <5min remaining, no cron
8. **Rate limit UX** — return error message + retry hint, no queue/webhook
9. **Telegram bot guidance** — quest creation wizard shows warning when sponsor selects join_channel

## New Environment Variables

```
X_CLIENT_ID=""           # X OAuth 2.0 app client ID
X_CLIENT_SECRET=""       # X OAuth 2.0 app client secret
```

## Files Changed (summary)

**New files:**
- `apps/api/src/modules/x/x-rest-client.ts` (~150 lines)

**Modified files:**
- `apps/api/prisma/schema.prisma` — add 3 X token fields to User
- `apps/api/src/modules/auth/auth.routes.ts` — store X tokens in /social/sync, clear in DELETE
- `apps/api/src/modules/quests/social-validator.ts` — add `verifySocialAction()` dispatcher
- `apps/api/src/modules/quests/quests.routes.ts` — extend check-tasks & tasks/verify for all types
- `apps/dashboard/src/routes/_public/quests/detail.tsx` — proof URL input + link-account warnings
- `apps/api/src/modules/quests/__tests__/social-validator.test.ts` — new verification tests
- `.env.example` — add X_CLIENT_ID, X_CLIENT_SECRET

## Risks

- X API rate limits (15 req/15min per user for engagement endpoints) — mitigated by per-user tokens
- X refresh token is one-time use — if refresh fails, user must re-link
- Telegram bot must be admin — sponsor friction, needs clear UX guidance
