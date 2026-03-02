---
title: "Real-Time Social Task Existence Validation"
description: "API proxy + frontend integration to verify X accounts/posts, Discord invites, and Telegram channels actually exist during quest creation"
status: pending
priority: P2
effort: 6h
branch: main
tags: [quests, validation, social, ux]
created: 2026-03-02
---

# Real-Time Social Task Existence Validation

## Summary

Add server-side existence checks for social task targets (X accounts, X posts, Discord invites, Telegram channels) called from the quest creation wizard. Currently only regex format validation exists. This adds a second layer: does the target actually exist?

## Architecture Decision

**Single endpoint** `GET /quests/validate-social?platform=x&type=follow_account&value=@handle`

Rationale: Follows existing proxy pattern (`/quests/skill-preview?url=...`). One endpoint is simpler than 4 separate ones, routes internally by platform+type. Response shape is uniform: `{ valid: boolean, error?: string, meta?: Record<string,string> }`.

## Platform Validation Strategies

| Platform | Action | Method | Auth Required? | Reliability |
|----------|--------|--------|---------------|-------------|
| X | follow_account | `publish.twitter.com/oembed?url=https://x.com/{username}` | No | High (free, no key) |
| X | like_post/repost/quote_post | `publish.twitter.com/oembed?url={postUrl}` | No | High (returns 404 for missing) |
| X | post | N/A (user creates new) | - | - |
| Discord | join_server/verify_role | `GET https://discord.com/api/v10/invites/{code}` | No | High (public endpoint) |
| Telegram | join_channel | `GET https://api.telegram.org/bot{token}/getChat?chat_id=@{username}` | Bot token | High (existing bot) |

**Key insight**: X oEmbed endpoint (`publish.twitter.com/oembed`) requires NO API key and returns 404 for non-existent users/posts. Discord invite lookup is also unauthenticated. Only Telegram requires the existing bot token.

## Phases

| # | Phase | Status | Effort | File |
|---|-------|--------|--------|------|
| 1 | API validation service + route | pending | 2h | [phase-01](./phase-01-api-validation-service.md) |
| 2 | Frontend hook + ChipInput integration | pending | 3h | [phase-02](./phase-02-frontend-integration.md) |
| 3 | Tests + error handling polish | pending | 1h | [phase-03](./phase-03-tests-and-polish.md) |

## Key Dependencies

- Telegram bot token (`TELEGRAM_BOT_TOKEN`) already exists in env
- No new env vars needed (all methods use free/existing credentials)
- No DB changes needed
- No shared package changes needed

## Risk Assessment

- **X oEmbed rate limiting**: Unlikely during quest creation (few calls). Add 8s timeout + graceful degradation (treat timeout as "unverified" not "invalid")
- **Discord rate limiting**: Their API has generous public limits. Same timeout strategy.
- **Telegram bot token absent in dev**: Already optional. If missing, skip Telegram validation with warning.
