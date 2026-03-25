# Phase 6: Testing

## Context Links
- Existing tests: `/Users/hd/clawquest/apps/api/src/modules/quests/__tests__/social-validator.test.ts` (763 lines, 45 tests)
- Social action verifier (Phase 3): `apps/api/src/modules/quests/social-action-verifier.ts`
- X REST client (Phase 2): `apps/api/src/modules/x/x-rest-client.ts`

## Overview
- **Priority:** P2
- **Status:** completed
- **Effort:** 1.5h
- **Depends on:** Phase 3, Phase 4

Unit tests for x-rest-client.ts and social-action-verifier.ts. Extend existing test patterns (mock fetch, mock prisma).

## Key Insights
- Existing test file (social-validator.test.ts) is 763 lines — already large. New verification tests should go in separate files.
- Pattern: mock `global.fetch`, assert on call args and return values
- x-rest-client needs prisma mock for token refresh (update call)
- social-action-verifier needs both fetch mock and prisma mock

## Requirements

### Functional
- Test all X REST client functions (refresh, checkFollowing, getLikingUsers, getRetweetedBy, getTweet, lookupUserByUsername)
- Test all verification paths in social-action-verifier (X 5 types, Discord 2, Telegram 1)
- Test link-check gates (missing xId, discordId, telegramId)
- Test token refresh flow (expired → refresh → success)
- Test error/rate-limit handling

### Non-functional
- Keep each test file under 200 lines
- Follow existing test patterns (vi.fn(), global.fetch mock)

## Architecture

```
__tests__/
├── social-validator.test.ts       (existing, 763 lines — NO changes)
├── x-rest-client.test.ts          (NEW, ~120 lines)
└── social-action-verifier.test.ts (NEW, ~180 lines)
```

## Related Code Files

### Create
- `apps/api/src/modules/x/__tests__/x-rest-client.test.ts`
- `apps/api/src/modules/quests/__tests__/social-action-verifier.test.ts`

## Implementation Steps

### 1. x-rest-client.test.ts

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  refreshXToken, ensureFreshToken, checkFollowing,
  getLikingUsers, getRetweetedBy, getTweet, lookupUserByUsername,
} from '../x-rest-client'

const mockPrisma = {
  user: { update: vi.fn().mockResolvedValue({}) },
} as any

describe('x-rest-client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.X_CLIENT_ID = 'test-client-id'
    process.env.X_CLIENT_SECRET = 'test-secret'
  })
  afterEach(() => { vi.restoreAllMocks() })

  // Test groups:
  // 1. refreshXToken — success, failure, missing client ID
  // 2. ensureFreshToken — token valid, token expired → refresh, no token
  // 3. checkFollowing — found, not found, pagination, API error
  // 4. getLikingUsers — found, not found, API error
  // 5. getRetweetedBy — found, not found, API error
  // 6. getTweet — success with quoted, success without, not found
  // 7. lookupUserByUsername — found, not found, strips @

  describe('refreshXToken', () => {
    it('returns new tokens on success', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'new-access',
          refresh_token: 'new-refresh',
          expires_in: 7200,
        }),
      })
      const result = await refreshXToken('user-1', 'old-refresh', mockPrisma)
      expect(result).toEqual({ accessToken: 'new-access', refreshToken: 'new-refresh' })
      expect(mockPrisma.user.update).toHaveBeenCalledOnce()
    })

    it('returns null on API failure', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({ ok: false })
      const result = await refreshXToken('user-1', 'bad-refresh', mockPrisma)
      expect(result).toBeNull()
    })

    it('returns null when X_CLIENT_ID missing', async () => {
      delete process.env.X_CLIENT_ID
      const result = await refreshXToken('user-1', 'refresh', mockPrisma)
      expect(result).toBeNull()
    })
  })

  describe('checkFollowing', () => {
    it('returns true when target found in first page', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ id: 'target-123' }], meta: {} }),
      })
      expect(await checkFollowing('tok', 'user-1', 'target-123')).toBe(true)
    })

    it('returns false when target not in list', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ id: 'other' }], meta: {} }),
      })
      expect(await checkFollowing('tok', 'user-1', 'target-123')).toBe(false)
    })

    it('returns null on API error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({ ok: false })
      expect(await checkFollowing('tok', 'user-1', 'target-123')).toBeNull()
    })
  })

  // ... similar patterns for getLikingUsers, getRetweetedBy, getTweet, lookupUserByUsername
})
```

### 2. social-action-verifier.test.ts

Test structure:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { verifySocialAction, VerificationContext } from '../social-action-verifier'

const mockPrisma = {
  user: { update: vi.fn().mockResolvedValue({}) },
} as any

const baseCtx: VerificationContext = {
  userId: 'user-1',
  prisma: mockPrisma,
  telegramBotToken: 'bot-token',
}

describe('verifySocialAction', () => {
  beforeEach(() => { vi.clearAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  // --- Link-check gates ---
  describe('link-check gates', () => {
    it('X: returns error when xId missing', async () => {
      const result = await verifySocialAction('x', 'follow_account', 0, { ...baseCtx })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Link your X')
    })

    it('Discord: returns error when discordId missing', async () => {
      const result = await verifySocialAction('discord', 'join_server', 0, { ...baseCtx })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Link your Discord')
    })

    it('Telegram: returns error when telegramId missing', async () => {
      const result = await verifySocialAction('telegram', 'join_channel', 0, { ...baseCtx })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Link your Telegram')
    })
  })

  // --- X verification ---
  describe('X follow_account', () => {
    it('returns true when user follows target', async () => {
      // Mock lookupUserByUsername → target-id
      // Mock checkFollowing → true
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { id: 'target-id' } }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: 'target-id' }], meta: {} }) })

      const ctx = {
        ...baseCtx,
        xId: 'user-x-id',
        xAccessToken: 'valid-token',
        xRefreshToken: 'refresh',
        xTokenExpiry: new Date(Date.now() + 60 * 60 * 1000),
        params: { accountHandle: '@target' },
      }
      const result = await verifySocialAction('x', 'follow_account', 0, ctx)
      expect(result.valid).toBe(true)
    })
  })

  // --- X post/quote_post ---
  describe('X post verification', () => {
    it('returns true when tweet author matches xId', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { author_id: 'user-x-id' } }),
      })
      const ctx = {
        ...baseCtx,
        xId: 'user-x-id',
        xAccessToken: 'valid-token',
        xRefreshToken: 'refresh',
        xTokenExpiry: new Date(Date.now() + 60 * 60 * 1000),
        proofUrls: { 0: 'https://x.com/user/status/12345' },
      }
      const result = await verifySocialAction('x', 'post', 0, ctx)
      expect(result.valid).toBe(true)
    })

    it('returns error when no proof URL provided', async () => {
      const ctx = {
        ...baseCtx,
        xId: 'user-x-id',
        xAccessToken: 'tok',
        xRefreshToken: 'ref',
        xTokenExpiry: new Date(Date.now() + 60 * 60 * 1000),
      }
      const result = await verifySocialAction('x', 'post', 0, ctx)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Paste your tweet URL')
    })
  })

  // --- Telegram ---
  describe('Telegram join_channel', () => {
    it('returns true when user is member', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, result: { status: 'member' } }),
      })
      const ctx = {
        ...baseCtx,
        telegramId: '12345',
        params: { channelUrl: 'https://t.me/testchannel' },
      }
      const result = await verifySocialAction('telegram', 'join_channel', 0, ctx)
      expect(result.valid).toBe(true)
    })

    it('returns false when user left channel', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, result: { status: 'left' } }),
      })
      const ctx = {
        ...baseCtx,
        telegramId: '12345',
        params: { channelUrl: '@testchannel' },
      }
      const result = await verifySocialAction('telegram', 'join_channel', 0, ctx)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('not joined')
    })
  })

  // --- Discord ---
  describe('Discord join_server', () => {
    it('returns true when user is guild member', async () => {
      global.fetch = vi.fn()
        // resolveInvite
        .mockResolvedValueOnce({ ok: true, json: async () => ({ guild: { id: 'g1', name: 'Test' } }) })
        // getUserGuildMember
        .mockResolvedValueOnce({ ok: true, json: async () => ({ roles: ['role1'] }) })

      const ctx = {
        ...baseCtx,
        discordId: 'discord-123',
        discordAccessToken: 'disc-token',
        params: { inviteUrl: 'https://discord.gg/abc123' },
      }
      const result = await verifySocialAction('discord', 'join_server', 0, ctx)
      expect(result.valid).toBe(true)
    })
  })

  // --- Unknown platform ---
  it('returns valid for unknown platform', async () => {
    const result = await verifySocialAction('tiktok', 'follow', 0, baseCtx)
    expect(result.valid).toBe(true)
  })
})
```

## Todo List

- [ ] Create `apps/api/src/modules/x/__tests__/x-rest-client.test.ts`
- [ ] Create `apps/api/src/modules/quests/__tests__/social-action-verifier.test.ts`
- [ ] Run tests: `pnpm --filter api test`
- [ ] Verify existing social-validator tests still pass (no regressions)

## Success Criteria
- All new tests pass
- Existing 45 tests in social-validator.test.ts still pass
- Coverage: link-check gates, success paths, error/null paths for each verification type
- Each test file under 200 lines

## Risk Assessment
- **Mock complexity:** X verification involves multiple sequential fetch calls (lookupUser then checkFollowing). Mock ordering must be exact.
- **Prisma mock:** Only need `user.update` for token refresh tests. Simple mock sufficient.

## Next Steps
- All 6 phases complete. Manual E2E testing with real X/Discord/Telegram accounts.
