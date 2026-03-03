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
  it('X: error when token missing/expired', async () => {
    const ctx = { ...baseCtx, xId: 'x1' }
    const r = await verifySocialAction('x', 'follow_account', 0, ctx)
    expect(r.valid).toBe(false)
    expect(r.error).toContain('token expired')
  })

  // ── X follow_account ──
  describe('X follow_account', () => {
    it('returns true when user follows target', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { id: 'target-id' } }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: 'target-id' }], meta: {} }) })

      const ctx: VerificationContext = {
        ...baseCtx, xId: 'user-x', xAccessToken: 'tok', xRefreshToken: 'ref',
        xTokenExpiry: new Date(Date.now() + 3600000), params: { accountHandle: '@target' },
      }
      expect((await verifySocialAction('x', 'follow_account', 0, ctx)).valid).toBe(true)
    })

    it('returns false when not following', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { id: 'target-id' } }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: 'other' }], meta: {} }) })

      const ctx: VerificationContext = {
        ...baseCtx, xId: 'user-x', xAccessToken: 'tok', xRefreshToken: 'ref',
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
      ...baseCtx, xId: 'user-x', xAccessToken: 'tok', xRefreshToken: 'ref',
      xTokenExpiry: new Date(Date.now() + 3600000),
    }

    it('returns true when tweet author matches', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true, json: async () => ({ data: { author_id: 'user-x' } }),
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
        ok: true, json: async () => ({ data: { author_id: 'someone-else' } }),
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
      json: async () => ({ data: { author_id: 'user-x', referenced_tweets: [{ type: 'quoted', id: 'wrong' }] } }),
    })
    const ctx: VerificationContext = {
      ...baseCtx, xId: 'user-x', xAccessToken: 'tok', xRefreshToken: 'ref',
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
  it('Discord join_server: returns true via OAuth', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true, json: async () => ({ roles: ['r1'] }),
    })
    const ctx: VerificationContext = {
      ...baseCtx, discordId: 'd1', discordAccessToken: 'disc-tok',
      params: { guildId: 'g1' },
    }
    expect((await verifySocialAction('discord', 'join_server', 0, ctx)).valid).toBe(true)
  })

  // ── Unknown platform ──
  it('returns valid for unknown platform', async () => {
    expect((await verifySocialAction('tiktok', 'follow', 0, baseCtx)).valid).toBe(true)
  })
})
