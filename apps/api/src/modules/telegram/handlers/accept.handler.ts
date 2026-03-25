import { Composer } from 'grammy';
import { FastifyInstance } from 'fastify';
import { BotContext } from '../types';
import { MSG } from '../content/messages';
import { questListCache } from '../telegram.session';

export function acceptHandler(server: FastifyInstance): Composer<BotContext> {
    const composer = new Composer<BotContext>();

    composer.command('accept', async (ctx) => {
        return handleAccept(server, ctx);
    });

    return composer;
}

async function handleAccept(server: FastifyInstance, ctx: BotContext) {
    try {
        const tgId = ctx.from?.id;
        if (!tgId) return ctx.reply(MSG.genericError);

        // Find linked agent
        const link = await server.prisma.telegramLink.findUnique({
            where: { telegramId: BigInt(tgId) },
        });

        if (!link) {
            return ctx.reply(MSG.acceptNoAgent);
        }

        // Parse argument: /accept 1 or /accept <uuid>
        const arg = ctx.match?.trim();
        if (!arg) {
            return ctx.reply(MSG.acceptInvalidArg);
        }

        let questId: string;

        // Check if it's a number (1-indexed position in cached list)
        const num = parseInt(arg, 10);
        if (!isNaN(num) && num > 0) {
            const cachedIds = questListCache.get(tgId);
            if (!cachedIds || num > cachedIds.length) {
                return ctx.reply(MSG.acceptInvalidArg);
            }
            questId = cachedIds[num - 1];
        } else {
            // Assume it's a UUID
            questId = arg;
        }

        // Find the quest
        const quest = await server.prisma.quest.findUnique({
            where: { id: questId },
        });

        if (!quest || quest.status !== 'live') {
            return ctx.reply(MSG.acceptNoQuest);
        }

        // Check if already joined
        const existing = await server.prisma.questParticipation.findFirst({
            where: {
                questId: quest.id,
                agentId: link.agentId,
            },
        });

        if (existing) {
            return ctx.reply(MSG.acceptAlreadyJoined(quest.title));
        }

        // Check if quest is full
        if (quest.filledSlots >= quest.totalSlots) {
            return ctx.reply(MSG.acceptQuestFull(quest.title));
        }

        // Create participation
        const participation = await server.prisma.questParticipation.create({
            data: {
                questId: quest.id,
                agentId: link.agentId,
                status: 'in_progress',
                tasksCompleted: 0,
                tasksTotal: 1, // Default to 1 task
            },
        });

        // Increment filled slots
        await server.prisma.quest.update({
            where: { id: quest.id },
            data: { filledSlots: quest.filledSlots + 1 },
        });

        // Update agent status to questing
        await server.prisma.agent.update({
            where: { id: link.agentId },
            data: { status: 'questing' },
        });

        // Log the event
        await server.prisma.agentLog.create({
            data: {
                agentId: link.agentId,
                event: 'quest_accepted',
                data: {
                    questId: quest.id,
                    questTitle: quest.title,
                    participationId: participation.id,
                },
            },
        });

        return ctx.reply(MSG.acceptSuccess(quest.title, participation.id));
    } catch (error) {
        server.log.error(error);
        return ctx.reply(MSG.genericError);
    }
}
