import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { fetchTweetById, checkFollowRelationship, checkUserRetweeted } from '../x-twitterapio-client'

describe('x-twitterapio-client', () => {
  beforeEach(() => {
    process.env.TWITTER_API_IO_KEY = 'test-key'
  })
  afterEach(() => {
    vi.restoreAllMocks()
    delete process.env.TWITTER_API_IO_KEY
  })

  // ── fetchTweetById ──
  describe('fetchTweetById', () => {
    it('returns authorId, authorHandle and quotedTweetId on success', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'success',
          tweets: [{
            id: '123',
            author: { id: 'uid-1', userName: 'TestUser', name: 'Test' },
            quoted_tweet: { id: 'q-99' },
          }],
        }),
      })
      const result = await fetchTweetById('123')
      expect(result).toEqual({ authorId: 'uid-1', authorHandle: 'testuser', quotedTweetId: 'q-99' })
    })

    it('returns null when tweets array is empty', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success', tweets: [] }),
      })
      expect(await fetchTweetById('123')).toBeNull()
    })

    it('returns null on HTTP error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({ ok: false })
      expect(await fetchTweetById('123')).toBeNull()
    })

    it('returns null when TWITTER_API_IO_KEY missing', async () => {
      delete process.env.TWITTER_API_IO_KEY
      global.fetch = vi.fn()
      expect(await fetchTweetById('123')).toBeNull()
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('normalises authorHandle to lowercase', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tweets: [{ id: '1', author: { id: 'u1', userName: 'MIXEDCASE', name: 'X' } }],
        }),
      })
      const result = await fetchTweetById('1')
      expect(result?.authorHandle).toBe('mixedcase')
    })
  })

  // ── checkFollowRelationship ──
  describe('checkFollowRelationship', () => {
    it('returns true when source follows target', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success', data: { following: true, followed_by: false } }),
      })
      expect(await checkFollowRelationship('alice', 'bob')).toBe(true)
    })

    it('returns false when source does not follow target', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success', data: { following: false, followed_by: false } }),
      })
      expect(await checkFollowRelationship('alice', 'bob')).toBe(false)
    })

    it('returns null on HTTP error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({ ok: false })
      expect(await checkFollowRelationship('alice', 'bob')).toBeNull()
    })

    it('returns null when status is not success', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'error', message: 'User not found' }),
      })
      expect(await checkFollowRelationship('alice', 'bob')).toBeNull()
    })

    it('strips @ from handles before calling API', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success', data: { following: true, followed_by: false } }),
      })
      await checkFollowRelationship('@alice', '@bob')
      const url = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
      expect(url).toContain('source_user_name=alice')
      expect(url).toContain('target_user_name=bob')
    })
  })

  // ── checkUserRetweeted ──
  describe('checkUserRetweeted', () => {
    it('returns true when user in retweeters', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'success',
          users: [{ userName: 'TargetUser' }],
          has_next_page: false,
          next_cursor: '',
        }),
      })
      expect(await checkUserRetweeted('tweet-1', 'targetuser')).toBe(true)
    })

    it('returns false when user not found in single page', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          users: [{ userName: 'OtherUser' }],
          has_next_page: false,
          next_cursor: '',
        }),
      })
      expect(await checkUserRetweeted('tweet-1', 'targetuser')).toBe(false)
    })

    it('paginates until user found', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            users: [{ userName: 'page1user' }],
            has_next_page: true,
            next_cursor: 'cursor-2',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            users: [{ userName: 'TargetUser' }],
            has_next_page: false,
            next_cursor: '',
          }),
        })
      expect(await checkUserRetweeted('tweet-1', 'targetuser')).toBe(true)
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })

    it('returns null on HTTP error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({ ok: false })
      expect(await checkUserRetweeted('tweet-1', 'user')).toBeNull()
    })

    it('returns null when TWITTER_API_IO_KEY missing', async () => {
      delete process.env.TWITTER_API_IO_KEY
      global.fetch = vi.fn()
      expect(await checkUserRetweeted('tweet-1', 'user')).toBeNull()
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('stops paginating after 5 pages and returns false', async () => {
      const page = {
        ok: true,
        json: async () => ({
          users: [{ userName: 'otheruser' }],
          has_next_page: true,
          next_cursor: 'next',
        }),
      }
      global.fetch = vi.fn().mockResolvedValue(page)
      expect(await checkUserRetweeted('tweet-1', 'targetuser')).toBe(false)
      expect(global.fetch).toHaveBeenCalledTimes(5)
    })

    it('returns null when fetch throws inside pagination loop', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('network'))
      expect(await checkUserRetweeted('tweet-1', 'user')).toBeNull()
    })
  })
})
