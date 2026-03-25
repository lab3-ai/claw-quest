# Phase 3: Extend Social Validator

## Context Links
- Current validator: `/Users/hd/clawquest/apps/api/src/modules/quests/social-validator.ts` (184 lines)
- Discord REST client: `/Users/hd/clawquest/apps/api/src/modules/discord/discord-rest-client.ts`
- X REST client (Phase 2): `apps/api/src/modules/x/x-rest-client.ts`
- Telegram research: `/Users/hd/clawquest/plans/reports/researcher-260303-telegram-getchatmember.md`

## Overview
- **Priority:** P1 (core feature)
- **Status:** completed
- **Effort:** 3h
- **Depends on:** Phase 1, Phase 2

Add `verifySocialAction()` — new exported function for completion-time real verification. Existing `validateSocialTarget()` stays unchanged (creation-time target existence checks).

## Key Insights
- Current file: 184 lines. Adding ~80 lines of new verification would push it over 200.
- **Split strategy:** Extract the new `verifySocialAction()` into a separate file `social-action-verifier.ts` to keep both files under 200 lines.
- `validateSocialTarget()` = "does this target exist?" (quest creation). Keep as-is.
- `verifySocialAction()` = "did this user do this action?" (quest completion). New function.
- Two distinct interfaces: target validation needs `value` (URL/handle), action verification needs user context (tokens, IDs, proofUrls).

## Requirements

### Functional
- Verify all 8 task types across 3 platforms with real API calls
- Link-check gate: return specific error if user hasn't linked required account
- Token-check gate: return specific error if user linked account but token expired/missing
- Accept `proofUrls` map for post/quote_post actions (user-submitted tweet URLs)
- Discord join_server: use stored guildId from task params (resolved at quest creation time) → getUserGuildMember
- Telegram join_channel: getChatMember with bot token

### Non-functional
- Graceful degradation: API failures return actionable error message, not silent pass
- Each file under 200 lines

## Architecture

```
social-validator.ts (existing, ~184 lines — NO changes)
  └── validateSocialTarget()  — creation-time, target existence

social-action-verifier.ts (NEW, ~160 lines)
  └── verifySocialAction()  — completion-time, real verification
      ├── verifyXAction()
      │     ├── follow_account → checkFollowing(token, userXId, targetXId)
      │     ├── like_post → getLikingUsers(token, tweetId, userXId)
      │     ├── repost → getRetweetedBy(token, tweetId, userXId)
      │     ├── post → getTweet(proofUrl tweetId) → authorId === userXId
      │     └── quote_post → getTweet(proofUrl tweetId) → authorId + quotedTweetId
      ├── verifyDiscordAction()
      │     ├── join_server → use stored guildId from params → getUserGuildMember
      │     └── verify_role → (existing validateDiscordRole, delegate)
      └── verifyTelegramAction()
            └── join_channel → getChatMember(chatId, telegramId)
```

## Related Code Files

### Create
- `apps/api/src/modules/quests/social-action-verifier.ts`

### Modify
- None (social-validator.ts stays unchanged)

## Implementation Steps

### 1. Define VerificationContext interface

```typescript
import { PrismaClient } from '@prisma/client'

export interface VerificationContext {
  userId: string
  prisma: PrismaClient
  // X identity
  xId?: string | null
  xAccessToken?: string | null
  xRefreshToken?: string | null
  xTokenExpiry?: Date | null
  // Discord identity
  discordId?: string | null
  discordAccessToken?: string | null
  // Telegram identity
  telegramId?: string | null
  // Proof URLs for post/quote_post (map of taskIndex → URL)
  proofUrls?: Record<number, string>
  // Task params from quest definition
  params?: Record<string, string>
  // Telegram bot token
  telegramBotToken?: string
}
```

### 2. Implement X action verification

```typescript
import { ensureFreshToken, checkFollowing, getLikingUsers, getRetweetedBy, getTweet, lookupUserByUsername } from '../x/x-rest-client'
import { SocialValidationResult } from './social-validator'

/** Extract tweet ID from X URL: https://x.com/user/status/123456 → 123456 */
function extractTweetId(url: string): string | null {
  const match = url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/)
  return match?.[1] ?? null
}

async function verifyXAction(
  actionType: string,
  ctx: VerificationContext,
  taskIndex: number,
): Promise<SocialValidationResult> {
  if (!ctx.xId) return { valid: false, error: 'Link your X account to verify this task' }

  // Ensure fresh token
  const token = await ensureFreshToken(
    { id: ctx.userId, xAccessToken: ctx.xAccessToken, xRefreshToken: ctx.xRefreshToken, xTokenExpiry: ctx.xTokenExpiry },
    ctx.prisma,
  )
  if (!token) return { valid: false, error: 'X account token expired — please re-link your X account' }

  const targetValue = ctx.params?.targetUrl || ctx.params?.accountHandle || ''

  switch (actionType) {
    case 'follow_account': {
      // Resolve target handle to ID
      const targetHandle = targetValue.replace(/^@/, '').replace(/^https?:\/\/(x|twitter)\.com\//, '')
      const targetId = await lookupUserByUsername(token, targetHandle)
      if (!targetId) return { valid: false, error: 'Could not resolve target X account' }
      const following = await checkFollowing(token, ctx.xId, targetId)
      if (following === null) return { valid: false, error: 'X API unavailable — try again in a few minutes' }
      return following ? { valid: true } : { valid: false, error: 'You are not following this account' }
    }

    case 'like_post': {
      const tweetId = extractTweetId(targetValue)
      if (!tweetId) return { valid: false, error: 'Invalid tweet URL in task' }
      const liked = await getLikingUsers(token, tweetId, ctx.xId)
      if (liked === null) return { valid: false, error: 'X API unavailable — try again in a few minutes' }
      return liked ? { valid: true } : { valid: false, error: 'You have not liked this post' }
    }

    case 'repost': {
      const tweetId = extractTweetId(targetValue)
      if (!tweetId) return { valid: false, error: 'Invalid tweet URL in task' }
      const reposted = await getRetweetedBy(token, tweetId, ctx.xId)
      if (reposted === null) return { valid: false, error: 'X API unavailable — try again in a few minutes' }
      return reposted ? { valid: true } : { valid: false, error: 'You have not reposted this post' }
    }

    case 'post':
    case 'quote_post': {
      const proofUrl = ctx.proofUrls?.[taskIndex]
      if (!proofUrl) return { valid: false, error: 'Paste your tweet URL to verify' }
      const proofTweetId = extractTweetId(proofUrl)
      if (!proofTweetId) return { valid: false, error: 'Invalid tweet URL — use format: https://x.com/.../status/...' }
      const tweet = await getTweet(token, proofTweetId)
      if (!tweet) return { valid: false, error: 'Tweet not found — is it public?' }
      if (tweet.authorId !== ctx.xId) return { valid: false, error: 'This tweet was not posted by your linked X account' }
      // For quote_post: also verify it quotes the target tweet
      if (actionType === 'quote_post') {
        const targetTweetId = extractTweetId(targetValue)
        if (targetTweetId && tweet.quotedTweetId !== targetTweetId) {
          return { valid: false, error: 'This tweet does not quote the required post' }
        }
      }
      return { valid: true }
    }

    default:
      return { valid: true }
  }
}
```

### 3. Implement Discord action verification

```typescript
import { getUserGuildMember, resolveInvite } from '../discord/discord-rest-client'
import { validateSocialTarget } from './social-validator'

async function verifyDiscordAction(
  actionType: string,
  ctx: VerificationContext,
): Promise<SocialValidationResult> {
  if (!ctx.discordId) return { valid: false, error: 'Link your Discord account to verify this task' }

  if (actionType === 'join_server') {
    // guildId stored at quest creation time (auto-resolved from invite URL)
    const guildId = ctx.params?.guildId
    if (!guildId) return { valid: false, error: 'Quest task missing guildId — please contact quest creator' }

    // Check membership via user OAuth token (preferred, no bot needed)
    if (ctx.discordAccessToken) {
      const roles = await getUserGuildMember(ctx.discordAccessToken, guildId)
      if (roles !== null) return { valid: true }
    }
    // Fallback: bot check
    const botRoles = await getGuildMember(guildId, ctx.discordId!)
    if (botRoles !== null) return { valid: true }

    return { valid: false, error: 'You have not joined this Discord server' }
  }

  if (actionType === 'verify_role') {
    // Delegate to existing implementation
    return validateSocialTarget('discord', 'verify_role', '', undefined, {
      discordId: ctx.discordId,
      discordAccessToken: ctx.discordAccessToken,
      params: ctx.params,
    })
  }

  return { valid: true }
}
```

### 4. Implement Telegram action verification

```typescript
async function verifyTelegramAction(
  actionType: string,
  ctx: VerificationContext,
): Promise<SocialValidationResult> {
  if (actionType !== 'join_channel') return { valid: true }

  if (!ctx.telegramId) return { valid: false, error: 'Link your Telegram account to verify this task' }
  if (!ctx.telegramBotToken) return { valid: false, error: 'Telegram verification unavailable' }

  const channelUrl = ctx.params?.channelUrl || ''
  // Extract @username or chat ID
  let chatId: string
  const urlMatch = channelUrl.match(/t\.me\/([A-Za-z0-9_]+)/)
  if (urlMatch) chatId = `@${urlMatch[1]}`
  else if (channelUrl.startsWith('@')) chatId = channelUrl
  else chatId = `@${channelUrl.replace(/^https?:\/\//, '')}`

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${ctx.telegramBotToken}/getChatMember?chat_id=${encodeURIComponent(chatId)}&user_id=${ctx.telegramId}`,
      { signal: AbortSignal.timeout(8000) },
    )
    if (!res.ok) {
      return { valid: false, error: 'Bot cannot check this channel — it must be added as admin' }
    }
    const data = await res.json() as { ok: boolean; result?: { status: string } }
    if (!data.ok) return { valid: false, error: 'Could not check membership' }

    const joined = ['creator', 'administrator', 'member', 'restricted'].includes(data.result?.status ?? '')
    return joined
      ? { valid: true }
      : { valid: false, error: 'You have not joined this channel' }
  } catch {
    return { valid: false, error: 'Telegram API unavailable — try again later' }
  }
}
```

### 5. Main dispatcher

```typescript
/** Completion-time verification: did user actually do this action? */
export async function verifySocialAction(
  platform: string,
  actionType: string,
  taskIndex: number,
  ctx: VerificationContext,
): Promise<SocialValidationResult> {
  switch (platform) {
    case 'x': return verifyXAction(actionType, ctx, taskIndex)
    case 'discord': return verifyDiscordAction(actionType, ctx)
    case 'telegram': return verifyTelegramAction(actionType, ctx)
    default: return { valid: true }
  }
}
```

## Todo List

- [ ] Create `social-action-verifier.ts` with VerificationContext interface
- [ ] Implement verifyXAction with all 5 X task types
- [ ] Implement verifyDiscordAction (join_server + verify_role delegation)
- [ ] Implement verifyTelegramAction (join_channel via getChatMember)
- [ ] Implement verifySocialAction dispatcher
- [ ] Export SocialValidationResult from social-validator.ts (if not already exported)
- [ ] Compile check

## Success Criteria
- All 8 task types verified via real platform API calls
- Link-check gate returns "Link your X/Discord/Telegram account" when identity missing
- Token-check gate returns "token expired" when refresh fails
- post/quote_post accept proofUrls[taskIndex] as input
- File under 200 lines

## Risk Assessment
- **Discord join_server:** `getUserGuildMember` returns roles array when user is member. If OAuth token expired, returns null → we report "not joined" which might be a false negative. Mitigation: check if Discord token is expired first and show re-link message.
- **Telegram bot not admin:** Returns 403 → clear error message to sponsor about adding bot as admin.
- **X rate limit (15/15min):** Per-user token limits. If user spams verify, they'll get "API unavailable" message. Acceptable UX.

## Security Considerations
- Never expose raw tokens in API responses
- proofUrls are user-supplied — validate URL format before extracting tweet IDs
- Telegram user_id must match user's linked telegramId — no spoofing

## Next Steps
- Phase 4 wires `verifySocialAction()` into quest routes
