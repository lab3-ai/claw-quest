import { Composer } from 'grammy';
import { FastifyInstance } from 'fastify';
import { randomBytes } from 'crypto';
import { BotContext } from '../types';
import { MSG } from '../content/messages';

const WAITLIST_URL = process.env.FRONTEND_URL
    ? `${process.env.FRONTEND_URL}/waitlist`
    : 'https://clawquest.ai/waitlist';

function generateReferralCode(): string {
    return randomBytes(4).toString('hex'); // 8 hex chars e.g. "a3f9b2c1"
}

function buildReferralLink(code: string): string {
    return `${WAITLIST_URL}?ref=${code}`;
}

export async function handleWaitlistJoin(
    server: FastifyInstance,
    ctx: BotContext,
    referredByCode?: string
): Promise<void> {
    const tgId = ctx.from?.id;
    if (!tgId) return;

    const telegramHandle = ctx.from?.username ?? null;
    const firstName = ctx.from?.first_name ?? null;

    try {
        // Check if already on waitlist
        const existing = await server.prisma.waitlistEntry.findUnique({
            where: { telegramId: BigInt(tgId) },
        });

        if (existing) {
            const link = buildReferralLink(existing.referralCode);
            return void ctx.reply(MSG.waitlistAlreadyJoined(existing.position, link), {
                parse_mode: 'Markdown',
            });
        }

        // Resolve referrer (if any)
        let referrer = referredByCode
            ? await server.prisma.waitlistEntry.findUnique({
                where: { referralCode: referredByCode },
            })
            : null;

        // Assign position: current count + 1
        const count = await server.prisma.waitlistEntry.count();
        const basePosition = count + 1;

        // Referral bonus: referred users jump 10 spots ahead of their natural position,
        // but never below position 1.
        const position = referrer ? Math.max(1, basePosition - 10) : basePosition;

        const referralCode = generateReferralCode();

        await server.prisma.waitlistEntry.create({
            data: {
                telegramId: BigInt(tgId),
                telegramHandle,
                firstName,
                referralCode,
                referredBy: referrer?.referralCode ?? null,
                position,
            },
        });

        // Increment referrer's count
        if (referrer) {
            await server.prisma.waitlistEntry.update({
                where: { id: referrer.id },
                data: { referralCount: { increment: 1 } },
            });
        }

        const link = buildReferralLink(referralCode);
        await ctx.reply(MSG.waitlistJoined(position, link), { parse_mode: 'Markdown' });
    } catch (err) {
        server.log.error({ err }, 'Waitlist join error');
        await ctx.reply(MSG.genericError);
    }
}

export function waitlistHandler(server: FastifyInstance): Composer<BotContext> {
    const composer = new Composer<BotContext>();

    // /waitlist command — direct join without referral
    composer.command('waitlist', async (ctx) => {
        await handleWaitlistJoin(server, ctx);
    });

    return composer;
}
