import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { handleTelegramLogin, handleTelegramLink } from './telegram-auth.service';

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
}
