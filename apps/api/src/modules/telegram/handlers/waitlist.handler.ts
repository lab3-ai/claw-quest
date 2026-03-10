import { Composer } from 'grammy';
import { FastifyInstance } from 'fastify';
import { randomBytes } from 'crypto';
import { BotContext } from '../types';
import { MSG } from '../content/messages';

const WAITLIST_URL = process.env.FRONTEND_URL
    ? `${process.env.FRONTEND_URL}/waitlist`
    : 'https://clawquest.ai/waitlist';

const REFERRAL_BONUS_PER_FRIEND = 10;

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
            return void ctx.reply(
                MSG.waitlistAlreadyJoined(existing.effectivePosition, link),
                { parse_mode: 'Markdown' }
            );
        }

        // Resolve referrer (if any)
        let referrer = referredByCode
            ? await server.prisma.waitlistEntry.findUnique({
                where: { referralCode: referredByCode },
            })
            : null;

        // Assign base position: current count + 1
        const count = await server.prisma.waitlistEntry.count();
        const basePosition = count + 1;

        // New joiner gets a 10-spot bonus if they came via referral link
        const joinerBonus = referrer ? REFERRAL_BONUS_PER_FRIEND : 0;
        const effectivePosition = Math.max(1, basePosition - joinerBonus);

        const referralCode = generateReferralCode();

        await server.prisma.waitlistEntry.create({
            data: {
                telegramId: BigInt(tgId),
                telegramHandle,
                firstName,
                referralCode,
                referredBy: referrer?.referralCode ?? null,
                position: basePosition,
                referralBonus: joinerBonus,
                effectivePosition,
            },
        });

        // Reward referrer: +10 bonus spots per friend who joins
        if (referrer) {
            const newReferralBonus = referrer.referralBonus + REFERRAL_BONUS_PER_FRIEND;
            const newEffectivePosition = Math.max(1, referrer.position - newReferralBonus);

            await server.prisma.waitlistEntry.update({
                where: { id: referrer.id },
                data: {
                    referralCount: { increment: 1 },
                    referralBonus: newReferralBonus,
                    effectivePosition: newEffectivePosition,
                },
            });
        }

        const link = buildReferralLink(referralCode);
        await ctx.reply(MSG.waitlistJoined(effectivePosition, link), { parse_mode: 'Markdown' });
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
