import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { handleTelegramLogin, handleTelegramLink } from './telegram-auth.service';

const SocialSyncBody = z.object({
    provider: z.enum(['twitter', 'discord', 'google', 'github']),
});

const SocialProviderParam = z.object({
    provider: z.enum(['twitter', 'discord']),
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
                role: user.role ?? 'user',
                supabaseId: user.supabaseId,
                telegramId: user.telegramId ? String(user.telegramId) : null,
                telegramUsername: user.telegramUsername,
                xId: user.xId ?? null,
                xHandle: user.xHandle ?? null,
                discordId: user.discordId ?? null,
                discordHandle: user.discordHandle ?? null,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
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
            const { provider } = SocialSyncBody.parse(request.body);

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
                    await app.prisma.user.update({
                        where: { id: request.user.id },
                        data: { discordId: sub, discordHandle: userName },
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
                    data: { xId: null, xHandle: null },
                });
            } else if (provider === 'discord') {
                await app.prisma.user.update({
                    where: { id: request.user.id },
                    data: { discordId: null, discordHandle: null },
                });
            } else {
                return reply.status(400).send({ error: { message: 'Provider not supported for sync', code: 'UNSUPPORTED_PROVIDER' } });
            }

            return { ok: true };
        }
    );
}
