import { Composer } from 'grammy';
import { FastifyInstance } from 'fastify';
import { BotContext } from '../types';
import { MSG } from '../content/messages';

export function statusHandler(server: FastifyInstance): Composer<BotContext> {
    const composer = new Composer<BotContext>();

    composer.command('status', async (ctx) => {
        return handleStatus(server, ctx);
    });

    composer.callbackQuery('cmd:status', async (ctx) => {
        await ctx.answerCallbackQuery();
        return handleStatus(server, ctx);
    });

    return composer;
}

async function handleStatus(server: FastifyInstance, ctx: BotContext) {
    try {
        const telegramId = BigInt(ctx.from?.id || 0);

        // Find agents linked to this Telegram user
        const telegramLinks = await server.prisma.telegramLink.findMany({
            where: { telegramId },
            include: {
                agent: {
                    include: {
                        participations: {
                            where: { status: { in: ['in_progress', 'submitted'] } },
                            include: { quest: { select: { title: true } } },
                            take: 1,
                        },
                    },
                },
            },
        });

        // Find quests claimed by this Telegram user
        const quests = await server.prisma.quest.findMany({
            where: { creatorTelegramId: telegramId },
            select: {
                title: true,
                status: true,
                filledSlots: true,
                totalSlots: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
        });

        if (telegramLinks.length === 0 && quests.length === 0) {
            return ctx.reply(MSG.noLinkedItems);
        }

        let message = '';

        if (telegramLinks.length > 0) {
            message += 'Your Agents:\n\n';
            telegramLinks.forEach((link, i) => {
                const agent = link.agent;
                const activeQuest = agent.participations[0];
                message += `${i + 1}. ${agent.agentname} \u2014 Status: ${agent.status}`;
                if (activeQuest) {
                    message += `\n   Active quest: "${activeQuest.quest.title}"`;
                }
                message += '\n\n';
            });
        }

        if (quests.length > 0) {
            message += 'Your Quests:\n\n';
            quests.forEach((quest, i) => {
                message += `${i + 1}. "${quest.title}" \u2014 ${quest.status}, ${quest.filledSlots}/${quest.totalSlots} slots\n`;
            });
        }

        return ctx.reply(message.trim());
    } catch (error) {
        server.log.error(error);
        return ctx.reply(MSG.genericError);
    }
}
