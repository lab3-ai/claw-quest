# Brainstorm: Real Social Task Verification

**Date**: 2026-03-03
**Status**: Agreed — ready for implementation plan

## Problem Statement

Current social task validation only checks if targets exist (tweet exists, invite valid, channel exists) — does NOT verify user actually performed the action (followed, joined, liked). Only `verify_role` has real verification.

## Requirements

- Backend must verify user actually completed each social task
- User must link social account before verification is possible
- Support all existing task types across Discord, Telegram, X

## Decisions

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Verification approach | Real verification | Backend calls platform APIs to confirm action |
| 2 | X/Twitter API tier | Basic ($100/mo) | 10k reads/month, sufficient for early stage |
| 3 | Telegram constraint | Sponsor must add bot to channel | Required for getChatMember API |
| 4 | Token storage | User model fields | YAGNI — only 2 platforms need tokens (Discord, X) |
| 5 | X post/quote_post | URL-based proof | User pastes tweet URL, backend verifies author = xId |

## Verification Matrix

| Platform | Task | Method | Link required | Token required |
|----------|------|--------|---------------|----------------|
| Discord | join_server | OAuth getUserGuildMember | discordId | discordAccessToken |
| Discord | verify_role | Already implemented | discordId | discordAccessToken |
| Telegram | join_channel | Bot API getChatMember | telegramId | Bot token (existing) |
| X | follow_account | GET /2/users/:id/following | xId | xAccessToken |
| X | like_post | GET /2/tweets/:id/liking_users | xId | xAccessToken |
| X | repost | GET /2/tweets/:id/retweeted_by | xId | xAccessToken |
| X | post | User submit URL → verify author | xId | xAccessToken |
| X | quote_post | User submit URL → verify author + quoted | xId | xAccessToken |

## Implementation Scope

1. DB Migration: add xAccessToken, xRefreshToken, xTokenExpiry to User
2. X OAuth flow: exchange code → store tokens (mirror Discord pattern)
3. X REST client: `modules/x/x-rest-client.ts`
4. Extend social-validator: real verification for all task types
5. Link-check gate: block verify if account not linked
6. Telegram getChatMember: add verification (bot must be admin)
7. Token refresh: auto-refresh X token (2h TTL)
8. Frontend: URL-based proof UI for post/quote_post tasks

## Evaluated Alternatives

### Token Storage
- **SocialToken table**: More extensible but adds JOIN complexity, migration effort. Rejected per YAGNI.
- **User model** (chosen): Simple, consistent with Discord pattern. Only 2 platforms need tokens.

### X post/quote_post Verification
- **Search user tweets**: Expensive rate limit, unreliable matching. Rejected.
- **Honor system**: Doesn't meet real verification requirement. Rejected.
- **URL-based proof** (chosen): User provides tweet URL, backend confirms author identity. Accurate, low rate cost.

### X API Tier
- **Free**: No read access. Useless.
- **Basic** (chosen): $100/mo, 10k reads. Sufficient for early stage.
- **Pro**: $5k/mo. Overkill.

## Rate Limit Strategy (X Basic)

- Cache verification results (5-10 min TTL)
- Queue retry if rate limited
- Graceful degradation: notify "try again in X minutes"

## Risks

- X API rate limits may bottleneck during high quest activity
- Telegram bot must be admin in channel — sponsor friction
- Discord OAuth tokens expire 7 days — need refresh handling
- X OAuth tokens expire 2 hours — need robust refresh

## Next Steps

→ Create detailed implementation plan with phases
