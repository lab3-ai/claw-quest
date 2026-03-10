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

/**
 * Recalculate effectivePosition for all waitlist entries based on actual ranking.
 * effectivePosition = rank when sorted by (position - referralBonus) ascending.
 * This ensures unique, accurate positions that reflect referral bonuses.
 */
async function recalculateEffectivePositions(prisma: any): Promise<void> {
    // Get all entries sorted by (position - referralBonus) ascending
    const entries = await prisma.waitlistEntry.findMany({
        orderBy: [
            {
                position: 'asc',
            },
        ],
        select: {
            id: true,
            position: true,
            referralBonus: true,
        },
    });

    // Calculate effective position for each entry
    // Sort by (position - referralBonus) and assign rank starting from 1
    const entriesWithEffectivePosition = entries
        .map((entry: any) => ({
            ...entry,
            adjustedPosition: entry.position - entry.referralBonus,
        }))
        .sort((a: any, b: any) => a.adjustedPosition - b.adjustedPosition)
        .map((entry: any, index: number) => ({
            id: entry.id,
            effectivePosition: index + 1,
        }));

    // Update all entries in a transaction
    await prisma.$transaction(
        entriesWithEffectivePosition.map((entry: any) =>
            prisma.waitlistEntry.update({
                where: { id: entry.id },
                data: { effectivePosition: entry.effectivePosition },
            })
        )
    );
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

        const referralCode = generateReferralCode();

        // Create new entry (effectivePosition will be recalculated)
        await server.prisma.waitlistEntry.create({
            data: {
                telegramId: BigInt(tgId),
                telegramHandle,
                firstName,
                referralCode,
                referredBy: referrer?.referralCode ?? null,
                position: basePosition,
                referralBonus: joinerBonus,
                effectivePosition: basePosition, // Temporary, will be recalculated
            },
        });

        // Reward referrer: +10 bonus spots per friend who joins
        if (referrer) {
            await server.prisma.waitlistEntry.update({
                where: { id: referrer.id },
                data: {
                    referralCount: { increment: 1 },
                    referralBonus: { increment: REFERRAL_BONUS_PER_FRIEND },
                },
            });
        }

        // Recalculate effectivePosition for all entries to ensure accurate ranking
        await recalculateEffectivePositions(server.prisma);

        // Get the updated entry to get the correct effectivePosition
        const newEntry = await server.prisma.waitlistEntry.findUnique({
            where: { telegramId: BigInt(tgId) },
            select: { effectivePosition: true },
        });

        const link = buildReferralLink(referralCode);
        const effectivePos = newEntry?.effectivePosition ?? basePosition;

        // Send different message if joined via referral
        if (referrer) {
            const referrerName = referrer.firstName || referrer.telegramHandle || 'a friend';
            await ctx.reply(
                MSG.waitlistJoinedViaReferral(effectivePos, link, referrerName),
                { parse_mode: 'Markdown' }
            );

            // Notify referrer that someone joined via their link
            if (server.telegram?.bot) {
                const updatedReferrer = await server.prisma.waitlistEntry.findUnique({
                    where: { id: referrer.id },
                    select: { effectivePosition: true, referralCount: true },
                });

                const joinerName = firstName || telegramHandle || 'Someone';
                try {
                    await server.telegram.bot.api.sendMessage(
                        String(referrer.telegramId),
                        MSG.waitlistReferralReward(
                            joinerName,
                            updatedReferrer?.effectivePosition ?? referrer.position,
                            updatedReferrer?.referralCount ?? referrer.referralCount
                        ),
                        { parse_mode: 'Markdown' }
                    );
                } catch (err) {
                    // Silently fail if can't notify referrer (user might have blocked bot)
                    server.log.debug({ err, telegramId: String(referrer.telegramId) }, 'Failed to notify referrer');
                }
            }
        } else {
            await ctx.reply(
                MSG.waitlistJoined(effectivePos, link),
                { parse_mode: 'Markdown' }
            );
        }
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
