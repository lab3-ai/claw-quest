# Planner Report: Social Task Existence Validation

**Date**: 2026-03-02 | **Plan**: `plans/260302-2037-social-task-validation/`

## What Was Planned

Real-time existence validation for social task targets during quest creation. Currently only regex format validation exists (`validateTaskParams()` in `quests.service.ts`). This adds a second layer: server-side check that the target (X account, X post, Discord server, Telegram channel) actually exists.

## Research Findings

### X (Twitter) — No API Key Needed
- **oEmbed endpoint**: `https://publish.twitter.com/oembed?url=https://x.com/{username}` — free, unauthenticated
- Returns 200 + JSON (with `author_name`) for existing users/posts, 404 for missing
- Works for both user profiles and individual tweet URLs
- No rate limit concerns at quest-creation volume

### Discord — Public API
- `GET https://discord.com/api/v10/invites/{code}?with_counts=true` — unauthenticated
- Returns invite object with `guild.name`, `approximate_member_count` on success
- Returns 404 / error code 10006 for invalid/expired invites

### Telegram — Uses Existing Bot Token
- `GET https://api.telegram.org/bot{token}/getChat?chat_id=@{username}` — requires `TELEGRAM_BOT_TOKEN` (already in env)
- Returns channel `title` on success, error for private/non-existent channels
- Graceful skip if bot token not configured (dev environments)

## Architecture Decision

Single endpoint: `GET /quests/validate-social?platform=x&type=follow_account&value=@handle`

Rationale: mirrors existing `/quests/skill-preview` proxy pattern. One route dispatches internally by platform+type. Uniform response: `{ valid, error?, meta? }`.

**Graceful degradation**: network timeouts return `valid:true` (don't block UX for slow external APIs).

## File Impact

| Action | File | Lines |
|--------|------|-------|
| Create | `apps/api/src/modules/quests/social-validator.ts` | ~120 |
| Create | `apps/dashboard/src/hooks/use-social-validation.ts` | ~80 |
| Create | `apps/api/src/modules/quests/__tests__/social-validator.test.ts` | ~100 |
| Modify | `apps/api/src/modules/quests/quests.routes.ts` | +30 (new route) |
| Modify | `apps/dashboard/src/routes/_authenticated/quests/create.tsx` | +40 (hook init, ChipInput enhancement) |
| Modify | `apps/dashboard/src/styles/pages/create-quest.css` | +15 (chip states) |

**No changes to**: DB schema, shared package, env vars, app.ts

## Phases

1. **API validation service + route** (2h) — `social-validator.ts` + route in `quests.routes.ts`
2. **Frontend hook + ChipInput integration** (3h) — `use-social-validation.ts` hook, chip status rendering
3. **Tests + polish** (1h) — unit tests with mocked fetch, compile checks

**Total effort**: ~6h

## Risks

- `create.tsx` already ~1660 lines. Changes are minimal (+40 lines) but file needs future refactor (extract ChipInput)
- X oEmbed could add rate limits in future. Timeout + graceful degradation handles this
- Telegram validation unavailable when bot token missing (dev). Acceptable — returns valid:true with warning

## Unresolved Questions

1. Should invalid chips block quest publish, or just show a warning? Current plan: **warning only** (red indicator, not a blocker). Sponsor may know the account will exist by launch time.
2. Should validation results be cached client-side (e.g., 5min TTL)? Current plan: no cache, since validation only fires once per chip add. Revisit if users report slowness.
