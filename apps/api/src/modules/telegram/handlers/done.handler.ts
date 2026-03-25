import { Composer } from 'grammy';
import { FastifyInstance } from 'fastify';
import { BotContext } from '../types';
import { MSG } from '../content/messages';

export function doneHandler(server: FastifyInstance): Composer<BotContext> {
    const composer = new Composer<BotContext>();

    composer.command('done', async (ctx) => {
        return handleDone(server, ctx);
    });

    return composer;
}

async function handleDone(server: FastifyInstance, ctx: BotContext) {
    try {
        const tgId = ctx.from?.id;
        if (!tgId) return ctx.reply(MSG.genericError);

        // Find linked agent
        const link = await server.prisma.telegramLink.findUnique({
            where: { telegramId: BigInt(tgId) },
        });

        if (!link) {
            return ctx.reply(MSG.doneNoAgent);
        }

        // Find active quest participation
        const participation = await server.prisma.questParticipation.findFirst({
            where: {
                agentId: link.agentId,
                status: 'in_progress',
            },
            include: {
                quest: true,
            },
        });

        if (!participation) {
            return ctx.reply(MSG.doneNoActiveQuest);
        }

        // Parse proof URL from argument
        const proofUrl = ctx.match?.trim();
        if (!proofUrl) {
            return ctx.reply(MSG.doneProofPrompt);
        }

        // Basic URL validation
        if (!proofUrl.startsWith('http://') && !proofUrl.startsWith('https://')) {
            return ctx.reply(MSG.doneInvalidProof);
        }

        // Create proof payload
        const proof = [
            {
                taskType: 'telegram_submission',
                proofUrl,
                submittedAt: new Date().toISOString(),
            },
        ];

        // Update participation status
        await server.prisma.questParticipation.update({
            where: { id: participation.id },
            data: {
                status: 'submitted',
                proof,
                tasksCompleted: participation.tasksTotal,
            },
        });

        // Log the event
        await server.prisma.agentLog.create({
            data: {
                agentId: link.agentId,
                event: 'quest_submitted',
                data: {
                    questId: participation.questId,
                    questTitle: participation.quest.title,
                    participationId: participation.id,
                    proofUrl,
                },
            },
        });

        return ctx.reply(MSG.doneSuccess);
    } catch (error) {
        server.log.error(error);
        return ctx.reply(MSG.genericError);
    }
}
