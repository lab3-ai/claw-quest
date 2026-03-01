import { Composer } from 'grammy';
import { FastifyInstance } from 'fastify';
import { BotContext } from '../types';
import { MSG } from '../content/messages';
import { questsKeyboard } from '../keyboards/menus';

// Per-user cache: telegramId → ordered list of quest IDs
// Rebuilt on each /quests call. Enables numeric /accept shorthand.
export const questListCache = new Map<number, string[]>();

export function questsHandler(server: FastifyInstance): Composer<BotContext> {
    const composer = new Composer<BotContext>();

    composer.command('quests', async (ctx) => {
        return handleQuests(server, ctx);
    });

    composer.callbackQuery('cmd:quests', async (ctx) => {
        await ctx.answerCallbackQuery();
        return handleQuests(server, ctx);
    });

    return composer;
}

export async function handleQuests(server: FastifyInstance, ctx: BotContext) {
    try {
        const tgId = ctx.from?.id;

        const quests = await server.prisma.quest.findMany({
            where: { status: 'live' },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
                id: true,
                title: true,
                rewardAmount: true,
                rewardType: true,
                totalSlots: true,
                filledSlots: true,
            },
        });

        if (quests.length === 0) {
            return ctx.reply(MSG.noLiveQuests);
        }

        // Update per-user cache so /accept <n> works
        if (tgId) {
            questListCache.set(tgId, quests.map((q) => q.id));
        }

        let message = MSG.questListHeader;
        quests.forEach((quest, i) => {
            const slotsLeft = quest.totalSlots - quest.filledSlots;
            message += `${i + 1}. ${quest.title} \u2014 ${quest.rewardAmount} ${quest.rewardType} (${slotsLeft} slot${slotsLeft !== 1 ? 's' : ''} left)\n`;
        });
        message += MSG.questListFooter;

        return ctx.reply(message, { reply_markup: questsKeyboard() });
    } catch (error) {
        server.log.error(error);
        return ctx.reply(MSG.genericError);
    }
}
