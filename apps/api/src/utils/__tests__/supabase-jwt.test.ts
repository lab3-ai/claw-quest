import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock jose before importing the module under test
vi.mock('jose', () => ({
    createRemoteJWKSet: vi.fn(() => 'mock-jwks'),
    jwtVerify: vi.fn(),
    errors: {
        JWTExpired: class JWTExpired extends Error { code = 'ERR_JWT_EXPIRED'; },
        JWTClaimValidationFailed: class extends Error { code = 'ERR_JWT_CLAIM_VALIDATION_FAILED'; },
        JWTInvalid: class JWTInvalid extends Error { code = 'ERR_JWT_INVALID'; },
        JOSEError: class JOSEError extends Error {},
    },
}));

import { createSupabaseJwtVerifier, isJwtError } from '../supabase-jwt';
import { jwtVerify } from 'jose';

const mockJwtVerify = vi.mocked(jwtVerify);

describe('SupabaseJwtVerifier', () => {
    let verifier: ReturnType<typeof createSupabaseJwtVerifier>;

    beforeEach(() => {
        vi.clearAllMocks();
        verifier = createSupabaseJwtVerifier('https://example.supabase.co');
    });

    it('returns payload on valid token', async () => {
        mockJwtVerify.mockResolvedValueOnce({
            payload: {
                sub: 'user-123',
                email: 'test@example.com',
                user_metadata: { full_name: 'Test User' },
                app_metadata: { provider: 'google' },
            },
        } as any);

        const result = await verifier.verifyToken('valid.jwt.token');

        expect(result.sub).toBe('user-123');
        expect(result.email).toBe('test@example.com');
        expect(result.user_metadata).toEqual({ full_name: 'Test User' });
    });

    it('throws JwtVerificationError on expired token', async () => {
        const { errors } = await import('jose');
        mockJwtVerify.mockRejectedValueOnce(new errors.JWTExpired('expired'));

        await expect(verifier.verifyToken('expired.token')).rejects.toThrow();
    });

    it('isJwtError returns true for JWT errors', async () => {
        const { errors } = await import('jose');
        expect(isJwtError(new errors.JWTExpired('test'))).toBe(true);
        expect(isJwtError(new errors.JWTInvalid('test'))).toBe(true);
        expect(isJwtError(new Error('network failure'))).toBe(false);
    });
});

describe('UserCache in verifier', () => {
    it('caches and returns user within TTL', () => {
        const verifier = createSupabaseJwtVerifier('https://example.supabase.co');
        const fakeUser = { id: 'u1', email: 'a@b.com' } as any;

        verifier.cacheUser('supabase-id-1', fakeUser);
        const cached = verifier.getCachedUser('supabase-id-1');
        expect(cached).toEqual(fakeUser);
    });

    it('returns undefined for unknown supabaseId', () => {
        const verifier = createSupabaseJwtVerifier('https://example.supabase.co');
        expect(verifier.getCachedUser('nonexistent')).toBeUndefined();
    });
});
