import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { verifySocialAction, VerificationContext } from '../social-action-verifier'

const mockPrisma = { user: { update: vi.fn().mockResolvedValue({}) } } as any

const baseCtx: VerificationContext = {
  userId: 'user-1',
  prisma: mockPrisma,
  telegramBotToken: 'bot-token',
}

describe('verifySocialAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.X_CLIENT_ID = 'test-id'
    process.env.X_CLIENT_SECRET = 'test-secret'
    process.env.RAPID_API_KEY = 'test-rapid-key'
    process.env.DISCORD_BOT_TOKEN = 'test-bot-token'
  })
  afterEach(() => { vi.restoreAllMocks() })

  // ── Link-check gates ──
  describe('link-check gates', () => {
    it('X: error when xId missing', async () => {
      const r = await verifySocialAction('x', 'follow_account', 0, { ...baseCtx })
      expect(r.valid).toBe(false)
      expect(r.error).toContain('Link your X')
    })

    it('Discord: error when discordId missing', async () => {
      const r = await verifySocialAction('discord', 'join_server', 0, { ...baseCtx, params: { guildId: 'g1' } })
      expect(r.valid).toBe(false)
      expect(r.error).toContain('Link your Discord')
    })

    it('Telegram: error when telegramId missing', async () => {
      const r = await verifySocialAction('telegram', 'join_channel', 0, { ...baseCtx, params: { channelUrl: '@test' } })
      expect(r.valid).toBe(false)
      expect(r.error).toContain('Link your Telegram')
    })
  })

  // ── X token gate ──
  it('X: error when xHandle missing', async () => {
    const ctx = { ...baseCtx, xId: 'x1' }
    const r = await verifySocialAction('x', 'follow_account', 0, ctx)
    expect(r.valid).toBe(false)
    expect(r.error).toContain('Link your X account')
  })

  // ── X follow_account ──
  describe('X follow_account', () => {
    it('returns true when user follows target', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true, text: async () => JSON.stringify({ is_follow: true }),
      })

      const ctx: VerificationContext = {
        ...baseCtx, xId: 'user-x', xHandle: 'user-x', xAccessToken: 'tok', xRefreshToken: 'ref',
        xTokenExpiry: new Date(Date.now() + 3600000), params: { accountHandle: '@target' },
      }
      expect((await verifySocialAction('x', 'follow_account', 0, ctx)).valid).toBe(true)
    })

    it('returns false when not following', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true, text: async () => JSON.stringify({ is_follow: false }),
      })

      const ctx: VerificationContext = {
        ...baseCtx, xId: 'user-x', xHandle: 'user-x', xAccessToken: 'tok', xRefreshToken: 'ref',
        xTokenExpiry: new Date(Date.now() + 3600000), params: { accountHandle: '@target' },
      }
      const r = await verifySocialAction('x', 'follow_account', 0, ctx)
      expect(r.valid).toBe(false)
      expect(r.error).toContain('not following')
    })
  })

  // ── X post ──
  describe('X post', () => {
    const xCtx: VerificationContext = {
      ...baseCtx, xId: 'user-x', xHandle: 'user-x', xAccessToken: 'tok', xRefreshToken: 'ref',
      xTokenExpiry: new Date(Date.now() + 3600000),
    }

    it('returns true when tweet author matches', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true, text: async () => JSON.stringify({ author: { screen_name: 'user-x', rest_id: 'user-x' }, text: 'test', entities: {} }),
      })
      const ctx = { ...xCtx, proofUrls: { 0: 'https://x.com/user/status/12345' } }
      expect((await verifySocialAction('x', 'post', 0, ctx)).valid).toBe(true)
    })

    it('error when no proof URL', async () => {
      const r = await verifySocialAction('x', 'post', 0, xCtx)
      expect(r.valid).toBe(false)
      expect(r.error).toContain('Paste your tweet URL')
    })

    it('error when author mismatch', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true, text: async () => JSON.stringify({ author: { screen_name: 'someone-else', rest_id: 'other-id' }, text: 'test', entities: {} }),
      })
      const ctx = { ...xCtx, proofUrls: { 0: 'https://x.com/u/status/1' } }
      const r = await verifySocialAction('x', 'post', 0, ctx)
      expect(r.valid).toBe(false)
      expect(r.error).toContain('not posted by your linked')
    })
  })

  // ── X quote_post ──
  it('X quote_post: error when wrong quoted tweet', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ author: { screen_name: 'user-x', rest_id: 'user-x' }, text: '', entities: {}, quoted: { tweet_id: 'wrong' } }),
    })
    const ctx: VerificationContext = {
      ...baseCtx, xId: 'user-x', xHandle: 'user-x', xAccessToken: 'tok', xRefreshToken: 'ref',
      xTokenExpiry: new Date(Date.now() + 3600000),
      proofUrls: { 0: 'https://x.com/u/status/1' },
      params: { targetUrl: 'https://x.com/a/status/999' },
    }
    const r = await verifySocialAction('x', 'quote_post', 0, ctx)
    expect(r.valid).toBe(false)
    expect(r.error).toContain('does not quote')
  })

  // ── Telegram join_channel ──
  describe('Telegram join_channel', () => {
    it('returns true when member', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true, json: async () => ({ ok: true, result: { status: 'member' } }),
      })
      const ctx = { ...baseCtx, telegramId: '123', params: { channelUrl: 'https://t.me/test' } }
      expect((await verifySocialAction('telegram', 'join_channel', 0, ctx)).valid).toBe(true)
    })

    it('returns false when left', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true, json: async () => ({ ok: true, result: { status: 'left' } }),
      })
      const ctx = { ...baseCtx, telegramId: '123', params: { channelUrl: '@test' } }
      const r = await verifySocialAction('telegram', 'join_channel', 0, ctx)
      expect(r.valid).toBe(false)
      expect(r.error).toContain('not joined')
    })
  })

  // ── Discord join_server ──
  it('Discord join_server: returns true via bot when member', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true, json: async () => ({ roles: ['r1'] }),
    })
    const ctx: VerificationContext = {
      ...baseCtx, discordId: 'd1',
      params: { guildId: 'g1' },
    }
    expect((await verifySocialAction('discord', 'join_server', 0, ctx)).valid).toBe(true)
  })

  it('Discord join_server: resolves guildId from inviteUrl when guildId missing', async () => {
    // 1st fetch: resolveInvite(abc) → guild
    // 2nd fetch: getGuildMember(resolvedGuildId, discordId) → member
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ guild: { id: 'resolved-guild-id', name: 'Test' } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ roles: ['r1'] }) })
    const ctx: VerificationContext = {
      ...baseCtx, discordId: 'd1',
      params: { inviteUrl: 'https://discord.gg/abc' },
    }
    expect((await verifySocialAction('discord', 'join_server', 0, ctx)).valid).toBe(true)
  })

  it('Discord join_server: error when neither guildId nor valid inviteUrl', async () => {
    const r = await verifySocialAction('discord', 'join_server', 0, {
      ...baseCtx, discordId: 'd1',
      params: {},
    })
    expect(r.valid).toBe(false)
    expect(r.error).toContain('missing guildId')
  })

  it('Discord join_server: returns error when user not a member', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({}) })
    const ctx: VerificationContext = {
      ...baseCtx, discordId: 'd1',
      params: { guildId: 'g1' },
    }
    const r = await verifySocialAction('discord', 'join_server', 0, ctx)
    expect(r.valid).toBe(false)
    expect(r.error).toContain('not joined this Discord server')
  })

  // ── Unknown platform ──
  it('returns valid for unknown platform', async () => {
    expect((await verifySocialAction('tiktok', 'follow', 0, baseCtx)).valid).toBe(true)
  })
})
