import { Composer } from 'grammy';
import { FastifyInstance } from 'fastify';
import { BotContext } from '../types';
import { MSG } from '../content/messages';
import { linkAccountKeyboard, claimAgentKeyboard, claimQuestKeyboard } from '../keyboards/menus';
import { mainReplyKeyboard } from '../keyboards/reply-keyboard';

export function startHandler(server: FastifyInstance): Composer<BotContext> {
    const composer = new Composer<BotContext>();

    composer.command('start', async (ctx) => {
        const payload = ctx.match;

        if (!payload) {
            return handleBareStart(server, ctx);
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

async function handleVerifyDeeplink(server: FastifyInstance, ctx: BotContext, token: string) {
    try {
        const agent = await server.prisma.agent.findUnique({
            where: { verificationToken: token },
        });

        if (!agent) {
            return ctx.reply(MSG.invalidLink);
        }

        if (agent.ownerId) {
            return ctx.reply(MSG.agentAlreadyClaimed(agent.agentname));
        }

        if (agent.verificationExpiresAt && agent.verificationExpiresAt < new Date()) {
            return ctx.reply(MSG.linkExpired);
        }

        // Link Telegram user to agent
        const existingLink = await server.prisma.telegramLink.findUnique({
            where: { agentId: agent.id },
        });
        if (!existingLink) {
            await server.prisma.telegramLink.create({
                data: {
                    agentId: agent.id,
                    telegramId: BigInt(ctx.from?.id || 0),
                    username: ctx.from?.username,
                    firstName: ctx.from?.first_name,
                },
            });
        }

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const verifyUrl = `${frontendUrl}/verify?token=${token}`;

        return ctx.reply(MSG.agentLinked(agent.agentname), {
            reply_markup: claimAgentKeyboard(verifyUrl),
        });
    } catch (error) {
        server.log.error(error);
        return ctx.reply(MSG.genericError);
    }
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

async function handleActivationCode(server: FastifyInstance, ctx: BotContext, code: string) {
    await ctx.reply(MSG.searchingAgent);

    try {
        const agent = await server.prisma.agent.findUnique({
            where: { activationCode: code.toUpperCase() },
            include: { TelegramLink: true },
        });

        if (!agent) {
            return ctx.reply(MSG.invalidCode);
        }

        if (agent.TelegramLink) {
            return ctx.reply(MSG.agentAlreadyLinked);
        }

        await server.prisma.telegramLink.create({
            data: {
                agentId: agent.id,
                telegramId: BigInt(ctx.from?.id || 0),
                username: ctx.from?.username,
                firstName: ctx.from?.first_name,
            },
        });

        await server.prisma.agent.update({
            where: { id: agent.id },
            data: { activationCode: null },
        });

        return ctx.reply(MSG.activationSuccess(agent.agentname));
    } catch (error) {
        server.log.error(error);
        return ctx.reply(MSG.genericError);
    }
}
