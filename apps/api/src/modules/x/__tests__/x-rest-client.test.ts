import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  refreshXToken, ensureFreshToken, checkFollowing,
  getLikingUsers, getRetweetedBy, getTweet, lookupUserByUsername,
} from '../x-rest-client'

const mockPrisma = { user: { update: vi.fn().mockResolvedValue({}) } } as any

describe('x-rest-client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.X_CLIENT_ID = 'test-client-id'
    process.env.X_CLIENT_SECRET = 'test-secret'
  })
  afterEach(() => { vi.restoreAllMocks() })

  // ── refreshXToken ──
  describe('refreshXToken', () => {
    it('returns new tokens on success', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'new-access', refresh_token: 'new-refresh', expires_in: 7200 }),
      })
      const result = await refreshXToken('user-1', 'old-refresh', mockPrisma)
      expect(result).toEqual({ accessToken: 'new-access', refreshToken: 'new-refresh' })
      expect(mockPrisma.user.update).toHaveBeenCalledOnce()
    })

    it('returns null on API failure', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({ ok: false })
      expect(await refreshXToken('user-1', 'bad', mockPrisma)).toBeNull()
    })

    it('returns null when X_CLIENT_ID missing', async () => {
      delete process.env.X_CLIENT_ID
      expect(await refreshXToken('user-1', 'ref', mockPrisma)).toBeNull()
    })
  })

  // ── ensureFreshToken ──
  describe('ensureFreshToken', () => {
    it('returns existing token if still valid', async () => {
      const user = { id: 'u1', xAccessToken: 'tok', xRefreshToken: 'ref', xTokenExpiry: new Date(Date.now() + 3600000) }
      expect(await ensureFreshToken(user, mockPrisma)).toBe('tok')
    })

    it('refreshes expired token', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'fresh', refresh_token: 'new-ref', expires_in: 7200 }),
      })
      const user = { id: 'u1', xAccessToken: 'old', xRefreshToken: 'ref', xTokenExpiry: new Date(Date.now() - 1000) }
      expect(await ensureFreshToken(user, mockPrisma)).toBe('fresh')
    })

    it('returns null when no token', async () => {
      expect(await ensureFreshToken({ id: 'u1' }, mockPrisma)).toBeNull()
    })
  })

  // ── checkFollowing ──
  describe('checkFollowing', () => {
    it('returns true when target found', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true, json: async () => ({ data: [{ id: 'target-123' }], meta: {} }),
      })
      expect(await checkFollowing('tok', 'user-1', 'target-123')).toBe(true)
    })

    it('returns false when target not found', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true, json: async () => ({ data: [{ id: 'other' }], meta: {} }),
      })
      expect(await checkFollowing('tok', 'user-1', 'target-123')).toBe(false)
    })

    it('returns null on API error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({ ok: false })
      expect(await checkFollowing('tok', 'user-1', 'target-123')).toBeNull()
    })
  })

  // ── getLikingUsers ──
  describe('getLikingUsers', () => {
    it('returns true when user in liking list', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true, json: async () => ({ data: [{ id: 'user-x' }] }),
      })
      expect(await getLikingUsers('tok', 'tweet1', 'user-x')).toBe(true)
    })

    it('returns false when user not in list', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true, json: async () => ({ data: [{ id: 'other' }] }),
      })
      expect(await getLikingUsers('tok', 'tweet1', 'user-x')).toBe(false)
    })
  })

  // ── getRetweetedBy ──
  describe('getRetweetedBy', () => {
    it('returns true when user retweeted', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true, json: async () => ({ data: [{ id: 'user-x' }] }),
      })
      expect(await getRetweetedBy('tok', 'tweet1', 'user-x')).toBe(true)
    })

    it('returns null on error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({ ok: false })
      expect(await getRetweetedBy('tok', 'tweet1', 'user-x')).toBeNull()
    })
  })

  // ── getTweet ──
  describe('getTweet', () => {
    it('returns authorId and quotedTweetId', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { author_id: 'a1', referenced_tweets: [{ type: 'quoted', id: 'q1' }] },
        }),
      })
      expect(await getTweet('tok', '123')).toEqual({ authorId: 'a1', quotedTweetId: 'q1' })
    })

    it('returns null when tweet not found', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      expect(await getTweet('tok', '123')).toBeNull()
    })
  })

  // ── lookupUserByUsername ──
  describe('lookupUserByUsername', () => {
    it('resolves username to ID', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true, json: async () => ({ data: { id: 'uid-1' } }),
      })
      expect(await lookupUserByUsername('tok', '@testuser')).toBe('uid-1')
    })

    it('returns null on 404', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({ ok: false })
      expect(await lookupUserByUsername('tok', 'bad')).toBeNull()
    })
  })
})
