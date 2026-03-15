import { Composer } from 'grammy';
import { FastifyInstance } from 'fastify';
import { BotContext } from '../types';
import { MSG } from '../content/messages';
import { linkAccountKeyboard, claimQuestKeyboard } from '../keyboards/menus';
import { mainReplyKeyboard } from '../keyboards/reply-keyboard';
import { handleWaitlistJoin, handleWaitlistJoinByToken } from './waitlist.handler';

export function startHandler(server: FastifyInstance): Composer<BotContext> {
    const composer = new Composer<BotContext>();

    composer.command('start', async (ctx) => {
        const payload = ctx.match;

        if (!payload) {
            return handleBareStart(server, ctx);
        }

        // Waitlist join: ?start=waitlist or ?start=ref_<code>
        if (payload === 'waitlist') {
            return handleWaitlistJoin(server, ctx);
        }

        if (payload.startsWith('ref_')) {
            const referralCode = payload.slice(4); // strip "ref_" prefix
            return handleWaitlistJoin(server, ctx, referralCode);
        }

        // Web-initiated join: wl_<accessToken> — links pending entry to Telegram user
        if (payload.startsWith('wl_')) {
            const accessToken = payload.slice(3);
            return handleWaitlistJoinByToken(server, ctx, accessToken);
        }

        // Token prefix is the routing key — no wrapper needed
        if (payload.startsWith('agent_')) {
            return handleVerifyDeeplink(server, ctx, payload);
        }

        if (payload.startsWith('quest_')) {
            return handleQuestClaimDeeplink(server, ctx, payload);
        }

        // Legacy backward compatibility: old deeplinks used verify_ wrapper prefix
        if (payload.startsWith('verify_')) {
            const rawToken = payload.slice(7); // strip "verify_" prefix → raw hex
            return handleVerifyDeeplink(server, ctx, rawToken);
        }

        // Treat anything else as activation code
        return handleActivationCode(server, ctx, payload);
    });

    return composer;
}

async function handleBareStart(server: FastifyInstance, ctx: BotContext) {
    const tgId = ctx.from?.id;
    if (!tgId) {
        return ctx.reply(MSG.welcome, { reply_markup: mainReplyKeyboard() });
    }

    try {
        // Check if user has a linked account via telegramId on User model
        const user = await server.prisma.user.findFirst({
            where: { telegramId: String(tgId) },
            select: { displayName: true, email: true },
        });

        if (user) {
            const name = user.displayName || user.email || 'there';
            return ctx.reply(MSG.welcomeBack(name), { reply_markup: mainReplyKeyboard() });
        }

        // Also check TelegramLink (agent ownership)
        const link = await server.prisma.telegramLink.findFirst({
            where: { telegramId: BigInt(tgId) },
            select: { firstName: true },
        });

        if (link) {
            const name = link.firstName || 'there';
            return ctx.reply(MSG.welcomeBack(name), { reply_markup: mainReplyKeyboard() });
        }
    } catch (err) {
        server.log.error({ err }, 'Error checking linked account on /start');
    }

    // Not linked — send reply keyboard first, then inline link button
    await ctx.reply(MSG.welcomeUnlinked, { reply_markup: mainReplyKeyboard() });
    return ctx.reply('\ud83d\udc47 Link your account to get started:', {
        reply_markup: linkAccountKeyboard(tgId),
    });
}

async function handleVerifyDeeplink(_server: FastifyInstance, ctx: BotContext, _token: string) {
    // Verification token flow has been removed — agent registration no longer uses this
    return ctx.reply(MSG.invalidLink);
}

async function handleQuestClaimDeeplink(server: FastifyInstance, ctx: BotContext, token: string) {
    try {
        const quest = await server.prisma.quest.findUnique({
            where: { claimToken: token },
        });

        if (!quest) {
            return ctx.reply(MSG.invalidQuestLink);
        }

        if (quest.claimedAt) {
            return ctx.reply(MSG.questAlreadyClaimed(quest.title));
        }

        if (quest.claimTokenExpiresAt && quest.claimTokenExpiresAt < new Date()) {
            return ctx.reply(MSG.questLinkExpired);
        }

        // Link Telegram user to quest
        await server.prisma.quest.update({
            where: { id: quest.id },
            data: {
                creatorTelegramId: BigInt(ctx.from?.id || 0),
            },
        });

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const claimUrl = `${frontendUrl}/quests/claim?token=${token}`;

        return ctx.reply(MSG.questLinked(quest.title), {
            reply_markup: claimQuestKeyboard(claimUrl),
        });
    } catch (error) {
        server.log.error(error);
        return ctx.reply(MSG.genericError);
    }
}

async function handleActivationCode(_server: FastifyInstance, ctx: BotContext, _code: string) {
    // Activation code flow has been removed — agent registration no longer uses this
    return ctx.reply(MSG.invalidCode);
}
