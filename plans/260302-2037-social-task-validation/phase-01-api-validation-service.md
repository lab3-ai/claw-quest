# Phase 1: API Validation Service + Route

## Context
- Existing proxy pattern: `GET /quests/skill-preview?url=...` in `quests.routes.ts` (line 339+)
- Existing format validation: `validateTaskParams()` in `quests.service.ts`
- Route prefix: `/quests` (registered in `app.ts` line 160)

## Overview
- **Priority**: High
- **Status**: Pending
- **Effort**: 2h

## Key Insights
- X oEmbed at `publish.twitter.com/oembed?url=...` returns 200 for existing content, 404 for missing. No auth needed.
- Discord `GET https://discord.com/api/v10/invites/{code}` is public, returns invite object or 404/10006 error.
- Telegram `getChat` requires bot token (already in env as `TELEGRAM_BOT_TOKEN`). Works for public channels via `@username`.
- All calls are server-side to avoid CORS. 8s timeout per call. Graceful degradation on timeout.

## Files to Create

### `apps/api/src/modules/quests/social-validator.ts` (~120 lines)
Core validation logic. Pure functions, no Fastify dependency.

```typescript
// Response type
export interface SocialValidationResult {
  valid: boolean
  error?: string
  meta?: Record<string, string> // e.g. { name: "Vitalik Buterin", avatar: "..." }
}

// Main dispatcher
export async function validateSocialTarget(
  platform: string, type: string, value: string, telegramBotToken?: string
): Promise<SocialValidationResult>

// Internal validators
async function validateXAccount(username: string): Promise<SocialValidationResult>
async function validateXPost(postUrl: string): Promise<SocialValidationResult>
async function validateDiscordInvite(inviteUrl: string): Promise<SocialValidationResult>
async function validateTelegramChannel(channel: string, botToken?: string): Promise<SocialValidationResult>
```

### Route addition in `apps/api/src/modules/quests/quests.routes.ts`
Add `GET /validate-social` endpoint (~30 lines). Auth required (same as quest creation).

## Architecture

```
Dashboard ChipInput → onAdd() → debounced fetch → GET /quests/validate-social?platform=x&type=follow_account&value=elonmusk
                                                    ↓
                                            quests.routes.ts → validateSocialTarget()
                                                    ↓
                                            social-validator.ts dispatches by platform+type:
                                              X account  → fetch publish.twitter.com/oembed?url=https://x.com/{username}
                                              X post     → fetch publish.twitter.com/oembed?url={postUrl}
                                              Discord    → fetch discord.com/api/v10/invites/{code}
                                              Telegram   → fetch api.telegram.org/bot{token}/getChat?chat_id=@{channel}
                                                    ↓
                                            Return { valid: true/false, error?, meta? }
```

## Implementation Steps

### 1. Create `social-validator.ts`

**X Account validation** (`follow_account`):
```
GET https://publish.twitter.com/oembed?url=https://x.com/{username}
- 200 → valid:true, extract author_name from response
- 404/non-200 → valid:false, "X account not found"
- Timeout → valid:true (graceful: don't block on slow network)
```

**X Post validation** (`like_post`, `repost`, `quote_post`):
```
GET https://publish.twitter.com/oembed?url={postUrl}
- 200 → valid:true, extract author_name
- 404/non-200 → valid:false, "Post not found or is private"
- Timeout → valid:true
```

**Discord invite** (`join_server`, `verify_role`):
```
Extract invite code from URL (after discord.gg/ or discord.com/invite/)
GET https://discord.com/api/v10/invites/{code}?with_counts=true
- 200 → valid:true, extract guild.name + approximate_member_count
- 404 or error code 10006 → valid:false, "Invite is invalid or expired"
- Timeout → valid:true
```

**Telegram channel** (`join_channel`):
```
Extract username from @channel or t.me/channel URL
GET https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getChat?chat_id=@{username}
- 200 + ok:true → valid:true, extract result.title
- Error → valid:false, "Channel not found or is private"
- No bot token → valid:true + meta.warning:"Telegram validation unavailable"
- Timeout → valid:true
```

### 2. Add route to `quests.routes.ts`

After the existing `/skill-preview` route (line ~450), add:

```typescript
server.get(
  '/validate-social',
  {
    schema: {
      tags: ['Quests'],
      summary: 'Validate social task target exists',
      querystring: z.object({
        platform: z.enum(['x', 'discord', 'telegram']),
        type: z.string(),
        value: z.string().min(1),
      }),
      response: {
        200: z.object({
          valid: z.boolean(),
          error: z.string().optional(),
          meta: z.record(z.string()).optional(),
        }),
      },
    },
    preHandler: [server.authenticate],  // require auth (same as quest create)
  },
  async (request, reply) => {
    const { platform, type, value } = request.query as any
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN
    const result = await validateSocialTarget(platform, type, value, telegramBotToken)
    return result
  }
)
```

## Todo List
- [ ] Create `apps/api/src/modules/quests/social-validator.ts`
  - [ ] `validateXAccount()` using oEmbed
  - [ ] `validateXPost()` using oEmbed
  - [ ] `validateDiscordInvite()` using Discord API
  - [ ] `validateTelegramChannel()` using Bot API getChat
  - [ ] `validateSocialTarget()` dispatcher
  - [ ] 8s AbortSignal.timeout on all fetches
  - [ ] Graceful degradation: timeout/network error returns valid:true
- [ ] Add `GET /validate-social` route in `quests.routes.ts`
  - [ ] Zod query schema
  - [ ] Auth guard (preHandler)
  - [ ] Import + call `validateSocialTarget()`

## Success Criteria
- `GET /quests/validate-social?platform=x&type=follow_account&value=elonmusk` returns `{ valid: true, meta: { name: "Elon Musk" } }`
- `GET /quests/validate-social?platform=x&type=follow_account&value=zzz_nonexistent_user_zzz` returns `{ valid: false, error: "X account not found" }`
- `GET /quests/validate-social?platform=discord&type=join_server&value=https://discord.gg/VALID` returns `{ valid: true, meta: { name: "Server Name" } }`
- `GET /quests/validate-social?platform=telegram&type=join_channel&value=@durov` returns `{ valid: true }` (if bot token set)
- Network timeouts return `{ valid: true }` (not blocking UX)

## Security Considerations
- SSRF: Values are constrained by platform type. X oEmbed only hits `publish.twitter.com`. Discord only hits `discord.com/api`. Telegram only hits `api.telegram.org`. No arbitrary URL fetching.
- Rate limiting: Consider adding per-user rate limit (e.g., 30 req/min) to prevent abuse. Can use existing Fastify rate-limit plugin if available.
- Auth required: endpoint is behind `server.authenticate`, preventing anonymous abuse.
