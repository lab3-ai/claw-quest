import { Composer } from 'grammy';
import { FastifyInstance } from 'fastify';
import { BotContext } from '../types';
import { MSG } from '../content/messages';
import { questListCache } from './quests.handler';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function acceptHandler(server: FastifyInstance): Composer<BotContext> {
    const composer = new Composer<BotContext>();

    composer.command('accept', async (ctx) => {
        try {
            const tgId = ctx.from?.id;
            if (!tgId) return ctx.reply(MSG.genericError);

            const arg = (ctx.match as string | undefined)?.trim();
            if (!arg) return ctx.reply(MSG.acceptInvalidArg);

            // Resolve quest ID — numeric index from /quests cache or raw UUID
            let questId: string | undefined;
            const num = parseInt(arg, 10);
            if (!isNaN(num) && num > 0) {
                const cache = questListCache.get(tgId);
                questId = cache?.[num - 1];
                if (!questId) return ctx.reply(MSG.acceptInvalidArg);
            } else if (UUID_RE.test(arg)) {
                questId = arg;
            } else {
                return ctx.reply(MSG.acceptInvalidArg);
            }

            // Auth: find linked agent via TelegramLink
            const link = await server.prisma.telegramLink.findFirst({
                where: { telegramId: BigInt(tgId) },
                include: { agent: true },
            });
            if (!link) return ctx.reply(MSG.acceptNoAgent);

            const agentId = link.agentId;

            // Fetch quest
            const quest = await server.prisma.quest.findUnique({
                where: { id: questId },
                select: {
                    id: true,
                    title: true,
                    status: true,
                    totalSlots: true,
                    filledSlots: true,
                    tasks: true,
                },
            });
            if (!quest || quest.status !== 'live') return ctx.reply(MSG.acceptNoQuest);
            if (quest.filledSlots >= quest.totalSlots) return ctx.reply(MSG.acceptQuestFull);

            // Check for duplicate participation
            const existing = await server.prisma.questParticipation.findUnique({
                where: { questId_agentId: { questId: quest.id, agentId } },
            });
            if (existing) return ctx.reply(MSG.acceptAlreadyJoined);

            // Count tasks for tasksTotal
            const tasks = Array.isArray(quest.tasks) ? quest.tasks : [];
            const tasksTotal = tasks.length || 1;

            // Create participation + increment filledSlots + set agent to questing
            const [participation] = await server.prisma.$transaction([
                server.prisma.questParticipation.create({
                    data: { questId: quest.id, agentId, tasksTotal },
                }),
                server.prisma.quest.update({
                    where: { id: quest.id },
                    data: { filledSlots: { increment: 1 } },
                }),
                server.prisma.agent.update({
                    where: { id: agentId },
                    data: { status: 'questing' },
                }),
                server.prisma.agentLog.create({
                    data: {
                        agentId,
                        type: 'QUEST_START',
                        message: `Agent joined quest "${quest.title}" via Telegram`,
                        meta: { questId: quest.id, source: 'telegram' },
                    },
                }),
            ]);

            return ctx.reply(MSG.acceptSuccess(quest.title, participation.id));
        } catch (error) {
            server.log.error(error);
            return ctx.reply(MSG.genericError);
        }
    });

    return composer;
}
