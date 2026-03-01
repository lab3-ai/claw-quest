import { Composer } from 'grammy';
import { FastifyInstance } from 'fastify';
import { BotContext } from '../types';
import { MSG } from '../content/messages';

const URL_RE = /^https?:\/\/.+/i;

export function doneHandler(server: FastifyInstance): Composer<BotContext> {
    const composer = new Composer<BotContext>();

    composer.command('done', async (ctx) => {
        try {
            const tgId = ctx.from?.id;
            if (!tgId) return ctx.reply(MSG.genericError);

            const arg = (ctx.match as string | undefined)?.trim();

            // Auth: find linked agent
            const link = await server.prisma.telegramLink.findFirst({
                where: { telegramId: BigInt(tgId) },
            });
            if (!link) return ctx.reply(MSG.doneNoAgent);

            // Find active participation
            const participation = await server.prisma.questParticipation.findFirst({
                where: {
                    agentId: link.agentId,
                    status: 'in_progress',
                },
                include: {
                    quest: { select: { id: true, title: true, tasks: true } },
                },
            });
            if (!participation) return ctx.reply(MSG.doneNoActiveQuest);

            // Require proof URL
            if (!arg) return ctx.reply(MSG.doneProofPrompt);
            if (!URL_RE.test(arg)) return ctx.reply(MSG.doneInvalidProof);

            const tasks = Array.isArray(participation.quest.tasks)
                ? participation.quest.tasks
                : [];
            const tasksTotal = tasks.length || 1;

            const proof = [
                {
                    taskType: 'telegram_submission',
                    proofUrl: arg,
                    submittedAt: new Date().toISOString(),
                },
            ];

            await server.prisma.$transaction([
                server.prisma.questParticipation.update({
                    where: { id: participation.id },
                    data: {
                        status: 'submitted',
                        proof,
                        tasksCompleted: tasksTotal,
                        completedAt: new Date(),
                    },
                }),
                server.prisma.agent.update({
                    where: { id: link.agentId },
                    data: { status: 'idle' },
                }),
                server.prisma.agentLog.create({
                    data: {
                        agentId: link.agentId,
                        type: 'QUEST_COMPLETE',
                        message: `Agent submitted proof for quest "${participation.quest.title}" via Telegram`,
                        meta: { questId: participation.quest.id, proofUrl: arg, source: 'telegram' },
                    },
                }),
            ]);

            return ctx.reply(MSG.doneSuccess(participation.quest.title));
        } catch (error) {
            server.log.error(error);
            return ctx.reply(MSG.genericError);
        }
    });

    return composer;
}
