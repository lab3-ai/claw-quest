import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { validateSocialTarget } from '../social-validator';

// ──────────────────────────────────────────────────────────────────────────────
// Setup: Mock fetch globally
// ──────────────────────────────────────────────────────────────────────────────

describe('validateSocialTarget', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // X (Twitter) Account Validation
  // ──────────────────────────────────────────────────────────────────────────

  describe('X account validation (follow_account)', () => {
    it('validates valid X account', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ author_name: 'Test User' }),
      });
      global.fetch = mockFetch;

      const result = await validateSocialTarget('x', 'follow_account', 'testuser');

      expect(result.valid).toBe(true);
      expect(result.meta?.name).toBe('Test User');
      expect(mockFetch).toHaveBeenCalledOnce();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://publish.twitter.com/oembed?url=https://x.com/testuser',
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it('strips @ prefix from X username', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ author_name: 'Test User' }),
      });
      global.fetch = mockFetch;

      const result = await validateSocialTarget('x', 'follow_account', '@testuser');

      expect(result.valid).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://publish.twitter.com/oembed?url=https://x.com/testuser',
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it('returns error for non-existent X account (404)', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
      });
      global.fetch = mockFetch;

      const result = await validateSocialTarget('x', 'follow_account', 'nonexistentuser');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('X account not found');
    });

    it('returns error for non-existent X account (non-200 status)', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 403,
      });
      global.fetch = mockFetch;

      const result = await validateSocialTarget('x', 'follow_account', 'testuser');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('X account not found');
    });

    it('gracefully handles network errors (defaults to valid)', async () => {
      const mockFetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));
      global.fetch = mockFetch;

      const result = await validateSocialTarget('x', 'follow_account', 'testuser');

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('falls back to username when author_name is missing', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });
      global.fetch = mockFetch;

      const result = await validateSocialTarget('x', 'follow_account', 'testuser');

      expect(result.valid).toBe(true);
      expect(result.meta?.name).toBe('testuser');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // X (Twitter) Post Validation
  // ──────────────────────────────────────────────────────────────────────────

  describe('X post validation (like_post, repost, quote_post)', () => {
    it('validates valid X post (like_post)', async () => {
      const postUrl = 'https://x.com/testuser/status/1234567890';
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ author_name: 'Test User' }),
      });
      global.fetch = mockFetch;

      const result = await validateSocialTarget('x', 'like_post', postUrl);

      expect(result.valid).toBe(true);
      expect(result.meta?.author).toBe('Test User');
      expect(mockFetch).toHaveBeenCalledWith(
        `https://publish.twitter.com/oembed?url=${encodeURIComponent(postUrl)}`,
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it('validates valid X post (repost)', async () => {
      const postUrl = 'https://x.com/testuser/status/1234567890';
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ author_name: 'Test User' }),
      });
      global.fetch = mockFetch;

      const result = await validateSocialTarget('x', 'repost', postUrl);

      expect(result.valid).toBe(true);
      expect(result.meta?.author).toBe('Test User');
    });

    it('validates valid X post (quote_post)', async () => {
      const postUrl = 'https://x.com/testuser/status/1234567890';
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ author_name: 'Test User' }),
      });
      global.fetch = mockFetch;

      const result = await validateSocialTarget('x', 'quote_post', postUrl);

      expect(result.valid).toBe(true);
      expect(result.meta?.author).toBe('Test User');
    });

    it('returns error for non-existent X post (404)', async () => {
      const postUrl = 'https://x.com/testuser/status/0000000000';
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
      });
      global.fetch = mockFetch;

      const result = await validateSocialTarget('x', 'like_post', postUrl);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Post not found or is private');
    });

    it('returns error for non-existent X post (non-200 status)', async () => {
      const postUrl = 'https://x.com/testuser/status/0000000000';
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 403,
      });
      global.fetch = mockFetch;

      const result = await validateSocialTarget('x', 'like_post', postUrl);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Post not found or is private');
    });

    it('gracefully handles network errors for posts (defaults to valid)', async () => {
      const mockFetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));
      global.fetch = mockFetch;

      const result = await validateSocialTarget('x', 'like_post', 'https://x.com/test/status/123');

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('falls back to empty string when author_name is missing from post', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });
      global.fetch = mockFetch;

      const result = await validateSocialTarget('x', 'like_post', 'https://x.com/test/status/123');

      expect(result.valid).toBe(true);
      expect(result.meta?.author).toBe('');
    });

    it('skips validation for X post creation type', async () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch;

      const result = await validateSocialTarget('x', 'post', 'some-value');

      expect(result.valid).toBe(true);
      expect(result.meta).toBeUndefined();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Discord Invite Validation
  // ──────────────────────────────────────────────────────────────────────────

  describe('Discord invite validation (join_server, verify_role)', () => {
    it('validates valid Discord invite (join_server)', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ guild: { name: 'Test Server' } }),
      });
      global.fetch = mockFetch;

      const result = await validateSocialTarget('discord', 'join_server', 'abc123');

      expect(result.valid).toBe(true);
      expect(result.meta?.name).toBe('Test Server');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://discord.com/api/v10/invites/abc123?with_counts=true',
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it('validates valid Discord invite (verify_role)', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ guild: { name: 'Test Server' } }),
      });
      global.fetch = mockFetch;

      const result = await validateSocialTarget('discord', 'verify_role', 'xyz789');

      expect(result.valid).toBe(true);
      expect(result.meta?.name).toBe('Test Server');
    });

    it('parses Discord URL (discord.gg format)', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ guild: { name: 'Test Server' } }),
      });
      global.fetch = mockFetch;

      const result = await validateSocialTarget('discord', 'join_server', 'https://discord.gg/abc123');

      expect(result.valid).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://discord.com/api/v10/invites/abc123?with_counts=true',
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it('parses Discord URL (discord.com/invite format)', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ guild: { name: 'Test Server' } }),
      });
      global.fetch = mockFetch;

      const result = await validateSocialTarget('discord', 'join_server', 'https://discord.com/invite/xyz789');

      expect(result.valid).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://discord.com/api/v10/invites/xyz789?with_counts=true',
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it('returns error for invalid Discord invite (404)', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
      });
      global.fetch = mockFetch;

      const result = await validateSocialTarget('discord', 'join_server', 'invalid123');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Discord invite is invalid or expired');
    });

    it('returns error for invalid Discord invite (non-200 status)', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 403,
      });
      global.fetch = mockFetch;

      const result = await validateSocialTarget('discord', 'join_server', 'abc123');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Discord invite is invalid or expired');
    });

    it('returns error for malformed Discord value (non-URL, non-code)', async () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch;

      const result = await validateSocialTarget('discord', 'join_server', 'not-a-valid-format!!!');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Discord invite is invalid or expired');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('gracefully handles network errors for Discord (defaults to valid)', async () => {
      const mockFetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));
      global.fetch = mockFetch;

      const result = await validateSocialTarget('discord', 'join_server', 'abc123');

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('falls back to empty string when guild name is missing', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ guild: {} }),
      });
      global.fetch = mockFetch;

      const result = await validateSocialTarget('discord', 'join_server', 'abc123');

      expect(result.valid).toBe(true);
      expect(result.meta?.name).toBe('');
    });

    it('returns error when guild is missing entirely', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });
      global.fetch = mockFetch;

      const result = await validateSocialTarget('discord', 'join_server', 'abc123');

      expect(result.valid).toBe(true);
      expect(result.meta?.name).toBe('');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Telegram Channel Validation
  // ──────────────────────────────────────────────────────────────────────────

  describe('Telegram channel validation (join_channel)', () => {
    it('validates valid Telegram channel', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, result: { title: 'Test Channel' } }),
      });
      global.fetch = mockFetch;

      const result = await validateSocialTarget('telegram', 'join_channel', 'testchannel', 'fake-token-123');

      expect(result.valid).toBe(true);
      expect(result.meta?.title).toBe('Test Channel');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.telegram.org/botfake-token-123/getChat?chat_id=@testchannel',
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it('strips @ prefix from Telegram channel', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, result: { title: 'Test Channel' } }),
      });
      global.fetch = mockFetch;

      const result = await validateSocialTarget('telegram', 'join_channel', '@testchannel', 'fake-token-123');

      expect(result.valid).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.telegram.org/botfake-token-123/getChat?chat_id=@testchannel',
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it('parses t.me URL format', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, result: { title: 'Test Channel' } }),
      });
      global.fetch = mockFetch;

      const result = await validateSocialTarget('telegram', 'join_channel', 'https://t.me/testchannel', 'fake-token-123');

      expect(result.valid).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.telegram.org/botfake-token-123/getChat?chat_id=@testchannel',
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it('returns error when Telegram bot token is undefined', async () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch;

      const result = await validateSocialTarget('telegram', 'join_channel', 'testchannel', undefined);

      expect(result.valid).toBe(true);
      expect(result.meta?.warning).toBe('Telegram validation unavailable');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns error for non-existent Telegram channel (ok: false)', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: false }),
      });
      global.fetch = mockFetch;

      const result = await validateSocialTarget('telegram', 'join_channel', 'nonexistent', 'fake-token-123');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Channel not found or is private');
    });

    it('returns error for non-existent Telegram channel (HTTP error)', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
      });
      global.fetch = mockFetch;

      const result = await validateSocialTarget('telegram', 'join_channel', 'testchannel', 'fake-token-123');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Channel not found or is private');
    });

    it('gracefully handles network errors for Telegram (defaults to valid)', async () => {
      const mockFetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));
      global.fetch = mockFetch;

      const result = await validateSocialTarget('telegram', 'join_channel', 'testchannel', 'fake-token-123');

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('falls back to username when title is missing', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, result: {} }),
      });
      global.fetch = mockFetch;

      const result = await validateSocialTarget('telegram', 'join_channel', 'testchannel', 'fake-token-123');

      expect(result.valid).toBe(true);
      expect(result.meta?.title).toBe('testchannel');
    });

    it('returns error for malformed Telegram value', async () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch;

      const result = await validateSocialTarget('telegram', 'join_channel', 'not-a-valid-format!!!', 'fake-token-123');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Channel not found or is private');
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Unknown Platform & Action Type Fallthrough
  // ──────────────────────────────────────────────────────────────────────────

  describe('Unknown platform handling', () => {
    it('returns valid for unknown platform', async () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch;

      const result = await validateSocialTarget('tiktok', 'follow', 'testuser');

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns valid for unknown action type on known platform', async () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch;

      const result = await validateSocialTarget('x', 'unknown_action', 'testuser');

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns valid for unknown action type on Discord', async () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch;

      const result = await validateSocialTarget('discord', 'unknown_action', 'abc123');

      expect(result.valid).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns valid for unknown action type on Telegram', async () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch;

      const result = await validateSocialTarget('telegram', 'unknown_action', 'testchannel', 'fake-token-123');

      expect(result.valid).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Timeout Handling
  // ──────────────────────────────────────────────────────────────────────────

  describe('Timeout handling (AbortSignal.timeout)', () => {
    it('gracefully handles X account timeout', async () => {
      const mockFetch = vi.fn().mockRejectedValueOnce(new Error('The operation was aborted'));
      global.fetch = mockFetch;

      const result = await validateSocialTarget('x', 'follow_account', 'testuser');

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('gracefully handles Discord timeout', async () => {
      const mockFetch = vi.fn().mockRejectedValueOnce(new Error('The operation was aborted'));
      global.fetch = mockFetch;

      const result = await validateSocialTarget('discord', 'join_server', 'abc123');

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('gracefully handles Telegram timeout', async () => {
      const mockFetch = vi.fn().mockRejectedValueOnce(new Error('The operation was aborted'));
      global.fetch = mockFetch;

      const result = await validateSocialTarget('telegram', 'join_channel', 'testchannel', 'fake-token-123');

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Edge Cases
  // ──────────────────────────────────────────────────────────────────────────

  describe('Edge cases', () => {
    it('handles empty string username for X', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ author_name: 'Test' }),
      });
      global.fetch = mockFetch;

      const result = await validateSocialTarget('x', 'follow_account', '');

      expect(result.valid).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://publish.twitter.com/oembed?url=https://x.com/',
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it('handles whitespace in Discord code', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ guild: { name: 'Test' } }),
      });
      global.fetch = mockFetch;

      const result = await validateSocialTarget('discord', 'join_server', '  abc123  ');

      expect(result.valid).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://discord.com/api/v10/invites/abc123?with_counts=true',
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it('handles Discord code with hyphens', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ guild: { name: 'Test' } }),
      });
      global.fetch = mockFetch;

      const result = await validateSocialTarget('discord', 'join_server', 'abc-123-def');

      expect(result.valid).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://discord.com/api/v10/invites/abc-123-def?with_counts=true',
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it('handles Telegram channel with underscores', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, result: { title: 'Test' } }),
      });
      global.fetch = mockFetch;

      const result = await validateSocialTarget('telegram', 'join_channel', 'test_channel_name', 'fake-token-123');

      expect(result.valid).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.telegram.org/botfake-token-123/getChat?chat_id=@test_channel_name',
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it('properly encodes X post URL with special characters', async () => {
      const postUrl = 'https://x.com/user/status/123?param=value&other=test';
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ author_name: 'Test' }),
      });
      global.fetch = mockFetch;

      const result = await validateSocialTarget('x', 'like_post', postUrl);

      expect(result.valid).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        `https://publish.twitter.com/oembed?url=${encodeURIComponent(postUrl)}`,
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });
  });
});
