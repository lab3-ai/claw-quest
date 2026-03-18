import { createRemoteJWKSet, jwtVerify, errors as joseErrors } from 'jose';
import type { User } from '@prisma/client';

export interface SupabaseJwtPayload {
    sub: string;
    email: string;
    user_metadata: Record<string, unknown>;
    app_metadata: Record<string, unknown>;
}

interface UserCacheEntry {
    user: User;
    cachedAt: number;
}

const USER_CACHE_TTL_MS = 5 * 60_000; // 5 minutes

export class JwtVerificationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'JwtVerificationError';
    }
}

/** Returns true if error is a JWT signature/expiry problem (→ 401, no retry). */
export function isJwtError(err: unknown): boolean {
    return (
        err instanceof joseErrors.JWTExpired ||
        err instanceof joseErrors.JWTInvalid ||
        err instanceof joseErrors.JWTClaimValidationFailed ||
        err instanceof joseErrors.JOSEError
    );
}

export interface SupabaseJwtVerifier {
    verifyToken(token: string): Promise<SupabaseJwtPayload>;
    getCachedUser(supabaseId: string): User | undefined;
    cacheUser(supabaseId: string, user: User): void;
}

/** Factory — call once at startup, reuse the returned verifier. */
export function createSupabaseJwtVerifier(supabaseUrl: string): SupabaseJwtVerifier {
    const jwksUrl = new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`);
    // jose caches JWKS internally and handles key rotation transparently
    const jwks = createRemoteJWKSet(jwksUrl);

    const userCache = new Map<string, UserCacheEntry>();

    return {
        async verifyToken(token: string): Promise<SupabaseJwtPayload> {
            const { payload } = await jwtVerify(token, jwks, {
                issuer: `${supabaseUrl}/auth/v1`,
                audience: 'authenticated',
            });

            return {
                sub: payload.sub as string,
                email: (payload as any).email as string,
                user_metadata: ((payload as any).user_metadata ?? {}) as Record<string, unknown>,
                app_metadata: ((payload as any).app_metadata ?? {}) as Record<string, unknown>,
            };
        },

        getCachedUser(supabaseId: string): User | undefined {
            const entry = userCache.get(supabaseId);
            if (!entry) return undefined;
            if (Date.now() - entry.cachedAt > USER_CACHE_TTL_MS) {
                userCache.delete(supabaseId);
                return undefined;
            }
            return entry.user;
        },

        cacheUser(supabaseId: string, user: User): void {
            userCache.set(supabaseId, { user, cachedAt: Date.now() });
        },
    };
}
