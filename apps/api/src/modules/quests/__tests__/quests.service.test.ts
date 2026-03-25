import { describe, it, expect } from 'vitest';
import {
    validateTaskParams,
    validateAllTasks,
    isValidTransition,
    generateClaimToken,
    generatePreviewToken,
    X_POST_URL_RE,
    X_USERNAME_RE,
    DISCORD_INVITE_RE,
    TELEGRAM_CHANNEL_RE,
} from '../quests.service';

// ─── validateTaskParams ──────────────────────────────────────────────────────

describe('validateTaskParams', () => {
    describe('follow_account', () => {
        it('returns null for valid X username', () => {
            const result = validateTaskParams({
                label: 'Follow us',
                platform: 'x',
                actionType: 'follow_account',
                params: { username: '@elonmusk' },
            } as any);
            expect(result).toBeNull();
        });

        it('returns null for username without @', () => {
            const result = validateTaskParams({
                label: 'Follow us',
                platform: 'x',
                actionType: 'follow_account',
                params: { username: 'elonmusk' },
            } as any);
            expect(result).toBeNull();
        });

        it('returns error for empty username', () => {
            const result = validateTaskParams({
                label: 'Follow us',
                platform: 'x',
                actionType: 'follow_account',
                params: { username: '' },
            } as any);
            expect(result).toBeTypeOf('string');
            expect(result).toContain('invalid X username');
        });

        it('returns error for missing username', () => {
            const result = validateTaskParams({
                label: 'Follow us',
                platform: 'x',
                actionType: 'follow_account',
                params: {},
            } as any);
            expect(result).toBeTypeOf('string');
        });
    });

    describe('like_post', () => {
        it('returns null for valid X post URL', () => {
            const result = validateTaskParams({
                label: 'Like post',
                platform: 'x',
                actionType: 'like_post',
                params: { postUrl: 'https://x.com/elonmusk/status/1234567890' },
            } as any);
            expect(result).toBeNull();
        });

        it('accepts twitter.com URLs', () => {
            const result = validateTaskParams({
                label: 'Like post',
                platform: 'x',
                actionType: 'like_post',
                params: { postUrl: 'https://twitter.com/user/status/9876543210' },
            } as any);
            expect(result).toBeNull();
        });

        it('returns error for invalid post URL', () => {
            const result = validateTaskParams({
                label: 'Like post',
                platform: 'x',
                actionType: 'like_post',
                params: { postUrl: 'https://example.com/not-a-tweet' },
            } as any);
            expect(result).toBeTypeOf('string');
            expect(result).toContain('invalid X post URL');
        });
    });

    describe('repost', () => {
        it('returns null for valid X post URL', () => {
            const result = validateTaskParams({
                label: 'Repost',
                platform: 'x',
                actionType: 'repost',
                params: { postUrl: 'https://x.com/user/status/123' },
            } as any);
            expect(result).toBeNull();
        });
    });

    describe('post', () => {
        it('returns null for valid content', () => {
            const result = validateTaskParams({
                label: 'Post a tweet',
                platform: 'x',
                actionType: 'post',
                params: { content: 'Hello world!' },
            } as any);
            expect(result).toBeNull();
        });

        it('returns error for empty content', () => {
            const result = validateTaskParams({
                label: 'Post a tweet',
                platform: 'x',
                actionType: 'post',
                params: { content: '' },
            } as any);
            expect(result).toBeTypeOf('string');
            expect(result).toContain('post content required');
        });

        it('returns error for content > 280 chars', () => {
            const result = validateTaskParams({
                label: 'Post a tweet',
                platform: 'x',
                actionType: 'post',
                params: { content: 'x'.repeat(281) },
            } as any);
            expect(result).toBeTypeOf('string');
        });
    });

    describe('join_server (Discord)', () => {
        it('returns null for valid discord.gg invite', () => {
            const result = validateTaskParams({
                label: 'Join Discord',
                platform: 'discord',
                actionType: 'join_server',
                params: { inviteUrl: 'https://discord.gg/abc123' },
            } as any);
            expect(result).toBeNull();
        });

        it('returns null for discord.com/invite URL', () => {
            const result = validateTaskParams({
                label: 'Join Discord',
                platform: 'discord',
                actionType: 'join_server',
                params: { inviteUrl: 'https://discord.com/invite/abc123' },
            } as any);
            expect(result).toBeNull();
        });

        it('returns error for invalid Discord invite', () => {
            const result = validateTaskParams({
                label: 'Join Discord',
                platform: 'discord',
                actionType: 'join_server',
                params: { inviteUrl: 'https://example.com/not-discord' },
            } as any);
            expect(result).toBeTypeOf('string');
            expect(result).toContain('invalid Discord invite URL');
        });
    });

    describe('verify_role (Discord)', () => {
        it('returns null for valid invite + role', () => {
            const result = validateTaskParams({
                label: 'Verify role',
                platform: 'discord',
                actionType: 'verify_role',
                params: { inviteUrl: 'https://discord.gg/abc123', roleId: 'role-123', roleName: 'Member' },
            } as any);
            expect(result).toBeNull();
        });

        it('returns error for missing role name', () => {
            const result = validateTaskParams({
                label: 'Verify role',
                platform: 'discord',
                actionType: 'verify_role',
                params: { inviteUrl: 'https://discord.gg/abc123', roleId: 'role-123', roleName: '' },
            } as any);
            expect(result).toBeTypeOf('string');
            expect(result).toContain('role name is required');
        });
    });

    describe('join_channel (Telegram)', () => {
        it('returns null for valid @channel', () => {
            const result = validateTaskParams({
                label: 'Join Telegram',
                platform: 'telegram',
                actionType: 'join_channel',
                params: { channelUrl: '@ClawQuest' },
            } as any);
            expect(result).toBeNull();
        });

        it('returns null for t.me URL', () => {
            const result = validateTaskParams({
                label: 'Join Telegram',
                platform: 'telegram',
                actionType: 'join_channel',
                params: { channelUrl: 'https://t.me/ClawQuest' },
            } as any);
            expect(result).toBeNull();
        });

        it('returns error for invalid channel', () => {
            const result = validateTaskParams({
                label: 'Join Telegram',
                platform: 'telegram',
                actionType: 'join_channel',
                params: { channelUrl: 'not-a-channel' },
            } as any);
            expect(result).toBeTypeOf('string');
            expect(result).toContain('invalid Telegram channel');
        });
    });

    describe('unknown action type', () => {
        it('returns error for unknown action type', () => {
            const result = validateTaskParams({
                label: 'Unknown task',
                platform: 'x',
                actionType: 'fly_to_moon',
                params: {},
            } as any);
            expect(result).toBeTypeOf('string');
            expect(result).toContain('unknown action type');
        });
    });
});

// ─── validateAllTasks ────────────────────────────────────────────────────────

describe('validateAllTasks', () => {
    it('returns null for empty array', () => {
        expect(validateAllTasks([])).toBeNull();
    });

    it('returns null when all tasks are valid', () => {
        const tasks = [
            { label: 'Follow', platform: 'x', actionType: 'follow_account', params: { username: '@test' } },
            { label: 'Like', platform: 'x', actionType: 'like_post', params: { postUrl: 'https://x.com/user/status/123' } },
        ];
        expect(validateAllTasks(tasks as any)).toBeNull();
    });

    it('returns first error when one task is invalid', () => {
        const tasks = [
            { label: 'Follow', platform: 'x', actionType: 'follow_account', params: { username: '@test' } },
            { label: 'Bad', platform: 'x', actionType: 'like_post', params: { postUrl: 'not-a-url' } },
            { label: 'Also bad', platform: 'x', actionType: 'follow_account', params: { username: '' } },
        ];
        const result = validateAllTasks(tasks as any);
        expect(result).toBeTypeOf('string');
        expect(result).toContain('Bad'); // first invalid task
    });
});

// ─── isValidTransition ───────────────────────────────────────────────────────

describe('isValidTransition', () => {
    it('allows draft → live', () => {
        expect(isValidTransition('draft', 'live')).toBe(true);
    });

    it('allows draft → scheduled', () => {
        expect(isValidTransition('draft', 'scheduled')).toBe(true);
    });

    it('allows draft → cancelled', () => {
        expect(isValidTransition('draft', 'cancelled')).toBe(true);
    });

    it('rejects draft → completed (must go through live)', () => {
        expect(isValidTransition('draft', 'completed')).toBe(false);
    });

    it('allows live → completed', () => {
        expect(isValidTransition('live', 'completed')).toBe(true);
    });

    it('allows live → expired', () => {
        expect(isValidTransition('live', 'expired')).toBe(true);
    });

    it('allows live → cancelled', () => {
        expect(isValidTransition('live', 'cancelled')).toBe(true);
    });

    it('allows scheduled → live', () => {
        expect(isValidTransition('scheduled', 'live')).toBe(true);
    });

    it('allows scheduled → cancelled', () => {
        expect(isValidTransition('scheduled', 'cancelled')).toBe(true);
    });

    // Terminal states
    it('rejects transitions from completed (terminal)', () => {
        expect(isValidTransition('completed', 'live')).toBe(false);
        expect(isValidTransition('completed', 'draft')).toBe(false);
    });

    it('rejects transitions from cancelled (terminal)', () => {
        expect(isValidTransition('cancelled', 'live')).toBe(false);
        expect(isValidTransition('cancelled', 'draft')).toBe(false);
    });

    it('rejects transitions from expired (terminal)', () => {
        expect(isValidTransition('expired', 'live')).toBe(false);
        expect(isValidTransition('expired', 'draft')).toBe(false);
    });

    it('returns false for unknown source state', () => {
        expect(isValidTransition('nonexistent', 'live')).toBe(false);
    });
});

// ─── Token Generators ────────────────────────────────────────────────────────

describe('generateClaimToken', () => {
    it('starts with quest_ prefix', () => {
        const token = generateClaimToken();
        expect(token.startsWith('quest_')).toBe(true);
    });

    it('has correct length (quest_ + 64 hex chars = 70)', () => {
        const token = generateClaimToken();
        // 'quest_' = 6 chars, randomBytes(32).toString('hex') = 64 chars
        expect(token.length).toBe(70);
    });

    it('generates unique tokens', () => {
        const tokens = new Set(Array.from({ length: 10 }, () => generateClaimToken()));
        expect(tokens.size).toBe(10);
    });
});

describe('generatePreviewToken', () => {
    it('starts with pv_ prefix', () => {
        const token = generatePreviewToken();
        expect(token.startsWith('pv_')).toBe(true);
    });

    it('has correct length (pv_ + 48 hex chars = 51)', () => {
        const token = generatePreviewToken();
        // 'pv_' = 3 chars, randomBytes(24).toString('hex') = 48 chars
        expect(token.length).toBe(51);
    });

    it('generates unique tokens', () => {
        const tokens = new Set(Array.from({ length: 10 }, () => generatePreviewToken()));
        expect(tokens.size).toBe(10);
    });
});

// ─── Regex patterns ──────────────────────────────────────────────────────────

describe('Regex patterns', () => {
    describe('X_POST_URL_RE', () => {
        it('matches x.com post URLs', () => {
            expect(X_POST_URL_RE.test('https://x.com/user/status/123456')).toBe(true);
        });
        it('matches twitter.com post URLs', () => {
            expect(X_POST_URL_RE.test('https://twitter.com/user/status/789')).toBe(true);
        });
        it('rejects non-tweet URLs', () => {
            expect(X_POST_URL_RE.test('https://example.com/post/123')).toBe(false);
        });
    });

    describe('X_USERNAME_RE', () => {
        it('matches @username', () => {
            expect(X_USERNAME_RE.test('@elonmusk')).toBe(true);
        });
        it('matches username without @', () => {
            expect(X_USERNAME_RE.test('elonmusk')).toBe(true);
        });
        it('rejects username > 15 chars', () => {
            expect(X_USERNAME_RE.test('a'.repeat(16))).toBe(false);
        });
    });

    describe('DISCORD_INVITE_RE', () => {
        it('matches discord.gg links', () => {
            expect(DISCORD_INVITE_RE.test('https://discord.gg/abc123')).toBe(true);
        });
        it('matches discord.com/invite links', () => {
            expect(DISCORD_INVITE_RE.test('https://discord.com/invite/abc123')).toBe(true);
        });
        it('rejects non-Discord links', () => {
            expect(DISCORD_INVITE_RE.test('https://example.com/invite/abc')).toBe(false);
        });
    });

    describe('TELEGRAM_CHANNEL_RE', () => {
        it('matches @channel format', () => {
            expect(TELEGRAM_CHANNEL_RE.test('@ClawQuest')).toBe(true);
        });
        it('matches t.me URL format', () => {
            expect(TELEGRAM_CHANNEL_RE.test('https://t.me/ClawQuest')).toBe(true);
        });
        it('rejects short @handles (< 5 chars)', () => {
            expect(TELEGRAM_CHANNEL_RE.test('@abc')).toBe(false);
        });
    });
});
