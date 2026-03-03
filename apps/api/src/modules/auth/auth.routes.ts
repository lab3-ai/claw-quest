import crypto from 'node:crypto';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { handleTelegramLogin, handleTelegramLink } from './telegram-auth.service';

const SocialSyncBody = z.object({
    provider: z.enum(['twitter', 'discord', 'google', 'github']),
    providerToken: z.string().optional(),         // Discord/X OAuth access token
    providerRefreshToken: z.string().optional(),  // Discord OAuth refresh token
});

const SocialProviderParam = z.object({
    provider: z.enum(['twitter', 'discord', 'telegram']),
});

const ALLOWED_REDIRECT_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://clawquest.ai',
    'https://www.clawquest.ai',
    'https://clawquest-nu.vercel.app',
    'https://clawquest-ai.vercel.app',
];

const TelegramAuthBody = z.object({
    code: z.string(),
    codeVerifier: z.string(),
    redirectUri: z.string().url().refine(
        (uri) => ALLOWED_REDIRECT_ORIGINS.some(origin => uri.startsWith(origin)),
        { message: 'Invalid redirect URI' }
    ),
});

export async function authRoutes(app: FastifyInstance) {
    // ── GET /me — current user profile ──
    app.get(
        '/me',
        {
            onRequest: [app.authenticate],
            schema: {
                tags: ['Auth'],
                summary: 'Get current user profile (requires Supabase access_token)',
                security: [{ bearerAuth: [] }],
            },
        },
        async (request) => {
            const user = await app.prisma.user.findUniqueOrThrow({
                where: { id: request.user.id },
            });

            return {
                id: user.id,
                email: user.email,
                username: user.username,
                displayName: user.displayName ?? null,
                role: user.role ?? 'user',
                supabaseId: user.supabaseId,
                telegramId: user.telegramId ? String(user.telegramId) : null,
                telegramUsername: user.telegramUsername,
                xId: user.xId ?? null,
                xHandle: user.xHandle ?? null,
                hasXToken: !!user.xAccessToken,
                discordId: user.discordId ?? null,
                discordHandle: user.discordHandle ?? null,
                hasDiscordToken: !!user.discordAccessToken,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            };
        }
    );

    // ── PATCH /me — Update display name and/or username ──
    const UpdateProfileBody = z.object({
        displayName: z.string().max(50).transform(s => s.trim()).optional(),
        username: z.string().regex(/^[a-z0-9][a-z0-9_-]{1,18}[a-z0-9]$/, 'Username must be 3-20 chars: lowercase letters, numbers, hyphens').optional(),
    });

    app.patch(
        '/me',
        {
            onRequest: [app.authenticate],
            schema: {
                tags: ['Auth'],
                summary: 'Update current user profile (displayName, username)',
                security: [{ bearerAuth: [] }],
                body: UpdateProfileBody,
            },
        },
        async (request, reply) => {
            const { displayName, username } = UpdateProfileBody.parse(request.body);
            const data: Record<string, any> = {};

            if (displayName !== undefined) data.displayName = displayName || null;
            if (username !== undefined) {
                // Check uniqueness
                const existing = await app.prisma.user.findUnique({ where: { username } });
                if (existing && existing.id !== request.user.id) {
                    return reply.status(409).send({ error: { message: 'Username is already taken', code: 'USERNAME_TAKEN' } });
                }
                data.username = username;
            }

            if (Object.keys(data).length === 0) {
                return reply.status(400).send({ error: { message: 'No fields to update', code: 'EMPTY_UPDATE' } });
            }

            const user = await app.prisma.user.update({
                where: { id: request.user.id },
                data,
            });

            return {
                id: user.id,
                email: user.email,
                username: user.username,
                displayName: user.displayName ?? null,
                role: user.role ?? 'user',
            };
        }
    );

    // ── POST /telegram — Login/register via Telegram OIDC (public) ──
    app.post(
        '/telegram',
        {
            schema: {
                tags: ['Auth'],
                summary: 'Login or register via Telegram OIDC',
                body: TelegramAuthBody,
            },
        },
        async (request, reply) => {
            try {
                const { code, codeVerifier, redirectUri } = TelegramAuthBody.parse(request.body);

                const result = await handleTelegramLogin({
                    code,
                    codeVerifier,
                    redirectUri,
                    prisma: app.prisma,
                    supabaseAdmin: app.supabase,
                });

                return result;
            } catch (err: any) {
                app.log.error(err, 'Telegram login failed');
                return reply.status(400).send({
                    error: { message: err.message ?? 'Telegram login failed', code: 'TELEGRAM_AUTH_ERROR' },
                });
            }
        }
    );

    // ── POST /telegram/link — Link Telegram to existing account (protected) ──
    app.post(
        '/telegram/link',
        {
            onRequest: [app.authenticate],
            schema: {
                tags: ['Auth'],
                summary: 'Link Telegram account to current user',
                security: [{ bearerAuth: [] }],
                body: TelegramAuthBody,
            },
        },
        async (request, reply) => {
            try {
                const { code, codeVerifier, redirectUri } = TelegramAuthBody.parse(request.body);

                const result = await handleTelegramLink({
                    code,
                    codeVerifier,
                    redirectUri,
                    userId: request.user.id,
                    prisma: app.prisma,
                });

                return result;
            } catch (err: any) {
                app.log.error(err, 'Telegram link failed');
                const status = err.message?.includes('already linked') ? 409 : 400;
                return reply.status(status).send({
                    error: { message: err.message ?? 'Telegram link failed', code: 'TELEGRAM_LINK_ERROR' },
                });
            }
        }
    );

    // ── POST /social/sync — Sync social identity handle to Prisma after OAuth callback ──
    app.post(
        '/social/sync',
        {
            onRequest: [app.authenticate],
            schema: {
                tags: ['Auth'],
                summary: 'Sync social identity handle to user profile after OAuth link',
                security: [{ bearerAuth: [] }],
                body: SocialSyncBody,
            },
        },
        async (request, reply) => {
            const { provider, providerToken, providerRefreshToken } = SocialSyncBody.parse(request.body);

            // Google/GitHub don't need Prisma sync — Supabase identities are sufficient
            if (provider === 'google' || provider === 'github') {
                return { ok: true };
            }

            if (!request.user.supabaseId) {
                return reply.status(400).send({ error: { message: 'No Supabase ID on user', code: 'NO_SUPABASE_ID' } });
            }

            const { data: supabaseUser, error } = await app.supabase.auth.admin.getUserById(
                request.user.supabaseId
            );
            if (error || !supabaseUser) {
                return reply.status(400).send({ error: { message: 'Failed to fetch Supabase user', code: 'SUPABASE_ERROR' } });
            }

            const identity = supabaseUser.user.identities?.find(i => i.provider === provider);
            if (!identity) {
                return reply.status(400).send({ error: { message: `Provider '${provider}' not linked in Supabase`, code: 'PROVIDER_NOT_LINKED' } });
            }

            const sub = identity.identity_data?.sub as string | undefined;
            if (!sub) {
                return reply.status(400).send({ error: { message: 'Missing sub claim in identity data', code: 'MISSING_SUB' } });
            }

            // user_name is the stable @handle; do not fall back to global_name (non-unique display name)
            const userName = (identity.identity_data?.user_name ?? null) as string | null;

            try {
                if (provider === 'twitter') {
                    await app.prisma.user.update({
                        where: { id: request.user.id },
                        data: { xId: sub, xHandle: userName },
                    });
                } else if (provider === 'discord') {
                    // Token expiry: Discord tokens last 7 days
                    const tokenExpiry = providerToken
                        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                        : undefined;
                    await app.prisma.user.update({
                        where: { id: request.user.id },
                        data: {
                            discordId: sub,
                            discordHandle: userName,
                            ...(providerToken && {
                                discordAccessToken: providerToken,
                                discordRefreshToken: providerRefreshToken ?? null,
                                discordTokenExpiry: tokenExpiry,
                            }),
                        },
                    });
                }
            } catch (err: any) {
                // P2002: unique constraint — this social account is already linked to another user
                if (err?.code === 'P2002') {
                    return reply.status(409).send({ error: { message: 'This social account is already linked to another user', code: 'SOCIAL_ALREADY_LINKED' } });
                }
                throw err;
            }

            return { ok: true };
        }
    );

    // ── DELETE /social/:provider — Clear social identity from Prisma after client-side unlink ──
    app.delete(
        '/social/:provider',
        {
            onRequest: [app.authenticate],
            schema: {
                tags: ['Auth'],
                summary: 'Clear social identity from user profile after client-side unlink',
                security: [{ bearerAuth: [] }],
                params: SocialProviderParam,
            },
        },
        async (request, reply) => {
            const { provider } = SocialProviderParam.parse(request.params);

            if (provider === 'twitter') {
                await app.prisma.user.update({
                    where: { id: request.user.id },
                    data: {
                        xId: null, xHandle: null,
                        xAccessToken: null, xRefreshToken: null, xTokenExpiry: null,
                    },
                });
            } else if (provider === 'discord') {
                await app.prisma.user.update({
                    where: { id: request.user.id },
                    data: {
                        discordId: null, discordHandle: null,
                        discordAccessToken: null, discordRefreshToken: null, discordTokenExpiry: null,
                    },
                });
            } else if (provider === 'telegram') {
                await app.prisma.user.update({
                    where: { id: request.user.id },
                    data: {
                        telegramId: null, telegramUsername: null,
                    },
                });
            } else {
                return reply.status(400).send({ error: { message: 'Provider not supported for sync', code: 'UNSUPPORTED_PROVIDER' } });
            }

            return { ok: true };
        }
    );

    // ── GET /x/authorize — Generate X OAuth2 PKCE authorize URL for read tokens ──
    app.get(
        '/x/authorize',
        {
            onRequest: [app.authenticate],
            schema: {
                tags: ['Auth'],
                summary: 'Get X OAuth authorize URL for read tokens (PKCE)',
                security: [{ bearerAuth: [] }],
            },
        },
        async (request) => {
            const codeVerifier = crypto.randomBytes(64).toString('base64url');
            const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
            const state = crypto.randomBytes(16).toString('hex');
            const scopes = 'tweet.read users.read follows.read like.read offline.access';
            const redirectUri = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/x/callback`;
            const url = `https://x.com/i/oauth2/authorize?response_type=code&client_id=${process.env.X_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`;
            return { url, state, codeVerifier };
        }
    );

    // ── POST /x/callback — Exchange X OAuth code for read tokens ──
    const XCallbackBody = z.object({
        code: z.string(),
        codeVerifier: z.string(),
        redirectUri: z.string().url(),
    });

    app.post(
        '/x/callback',
        {
            onRequest: [app.authenticate],
            schema: {
                tags: ['Auth'],
                summary: 'Exchange X OAuth code for read tokens',
                security: [{ bearerAuth: [] }],
                body: XCallbackBody,
            },
        },
        async (request, reply) => {
            const { code, codeVerifier, redirectUri } = XCallbackBody.parse(request.body);
            const clientId = process.env.X_CLIENT_ID;
            if (!clientId) {
                return reply.status(500).send({ error: { message: 'X_CLIENT_ID not configured', code: 'X_NOT_CONFIGURED' } });
            }

            const body = new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: clientId,
                redirect_uri: redirectUri,
                code_verifier: codeVerifier,
                code,
            });

            const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' };
            const clientSecret = process.env.X_CLIENT_SECRET;
            if (clientSecret) {
                headers['Authorization'] = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
            }

            try {
                const res = await fetch('https://api.x.com/2/oauth2/token', {
                    method: 'POST', headers, body: body.toString(),
                });
                if (!res.ok) {
                    return reply.status(400).send({ error: { message: 'X token exchange failed', code: 'X_TOKEN_EXCHANGE_FAILED' } });
                }
                const data = await res.json() as { access_token: string; refresh_token: string; expires_in: number };
                await app.prisma.user.update({
                    where: { id: request.user.id },
                    data: {
                        xAccessToken: data.access_token,
                        xRefreshToken: data.refresh_token,
                        xTokenExpiry: new Date(Date.now() + data.expires_in * 1000),
                    },
                });
                return { ok: true };
            } catch (err: any) {
                app.log.error(err, 'X token exchange error');
                return reply.status(500).send({ error: { message: 'X token exchange error', code: 'X_TOKEN_ERROR' } });
            }
        }
    );
}
