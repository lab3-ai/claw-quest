import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { randomBytes } from 'crypto';

function generateReferralCode(): string {
    return randomBytes(4).toString('hex');
}

export async function waitlistRoutes(server: FastifyInstance) {
    const s = server.withTypeProvider<ZodTypeProvider>();

    /**
     * POST /waitlist/token
     * Called when user clicks "Join via Telegram" on the web.
     * Creates a pending WaitlistEntry with just the accessToken (no telegramId yet).
     * Returns the accessToken to be stored in localStorage.
     */
    s.post(
        '/token',
        {
            schema: {
                tags: ['Waitlist'],
                summary: 'Generate an access token for a pending waitlist entry',
                body: z.object({
                    referredBy: z.string().optional(), // referralCode of the referrer
                }),
                response: {
                    200: z.object({
                        accessToken: z.string(),
                    }),
                },
            },
        },
        async (request, _reply) => {
            const { referredBy } = request.body;

            // Validate referrer exists
            let referrerExists = false;
            if (referredBy) {
                const referrer = await server.prisma.waitlistEntry.findUnique({
                    where: { referralCode: referredBy },
                    select: { id: true },
                });
                referrerExists = !!referrer;
            }

            const accessToken = randomBytes(16).toString('hex'); // 32 hex chars
            const referralCode = generateReferralCode();

            await server.prisma.waitlistEntry.create({
                data: {
                    accessToken,
                    referralCode,
                    referredBy: referrerExists ? referredBy : null,
                    position: 0,
                    effectivePosition: 0,
                },
            });

            return { accessToken };
        }
    );

    /**
     * GET /waitlist/me?token=<accessToken>
     * Polls after user joins via Telegram bot.
     * Returns entry data once telegramId is set (bot has processed the join).
     */
    s.get(
        '/me',
        {
            schema: {
                tags: ['Waitlist'],
                summary: 'Get waitlist entry by access token',
                querystring: z.object({
                    token: z.string(),
                }),
                response: {
                    200: z.object({
                        joined: z.boolean(),
                        position: z.number().optional(),
                        referralCode: z.string().optional(),
                        role: z.string().nullable().optional(),
                        firstName: z.string().nullable().optional(),
                    }),
                },
            },
        },
        async (request, _reply) => {
            const { token } = request.query;

            const entry = await server.prisma.waitlistEntry.findUnique({
                where: { accessToken: token },
                select: {
                    telegramId: true,
                    effectivePosition: true,
                    referralCode: true,
                    role: true,
                    firstName: true,
                },
            });

            if (!entry) {
                return { joined: false };
            }

            // Not yet joined via Telegram bot
            if (!entry.telegramId) {
                return { joined: false };
            }

            return {
                joined: true,
                position: entry.effectivePosition,
                referralCode: entry.referralCode,
                role: entry.role,
                firstName: entry.firstName,
            };
        }
    );

    /**
     * PATCH /waitlist/me
     * Update role for a waitlist entry (called from web popup).
     */
    s.patch(
        '/me',
        {
            schema: {
                tags: ['Waitlist'],
                summary: 'Update role for a waitlist entry',
                body: z.object({
                    token: z.string(),
                    role: z.enum(['agent-owner', 'sponsor']),
                }),
                response: {
                    200: z.object({ ok: z.boolean() }),
                },
            },
        },
        async (request, _reply) => {
            const { token, role } = request.body;

            const entry = await server.prisma.waitlistEntry.findUnique({
                where: { accessToken: token },
                select: { id: true, telegramId: true },
            });

            if (!entry || !entry.telegramId) {
                return _reply.status(404).send({ ok: false } as any);
            }

            await server.prisma.waitlistEntry.update({
                where: { id: entry.id },
                data: { role },
            });

            return { ok: true };
        }
    );
}
