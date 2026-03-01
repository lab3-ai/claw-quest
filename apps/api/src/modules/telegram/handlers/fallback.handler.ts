import { Composer } from 'grammy';
import { FastifyInstance } from 'fastify';
import { BotContext } from '../types';
import { MSG } from '../content/messages';
import { FAQ } from '../content/knowledge';
import { claimAgentKeyboard, claimQuestKeyboard } from '../keyboards/menus';
import { handleRegisterInput } from './register.handler';
import { registerSessions } from '../telegram.session';

export function fallbackHandler(server: FastifyInstance): Composer<BotContext> {
    const composer = new Composer<BotContext>();

    // Handle /cancel command — clears any active session
    composer.command('cancel', async (ctx) => {
        const tgId = ctx.from?.id;
        if (tgId && registerSessions.has(tgId)) {
            registerSessions.delete(tgId);
            return ctx.reply(MSG.registerCancelled);
        }
        return ctx.reply('Nothing to cancel.');
    });

    // Catch all non-command text messages
    composer.on('message:text', async (ctx) => {
        const text = ctx.message.text.trim();
        const tgId = ctx.from?.id;

        // ── Delegate to register flow if session active ──
        if (tgId && registerSessions.has(tgId)) {
            // Allow /cancel text to clear session
            if (text.toLowerCase() === '/cancel' || text.toLowerCase() === 'cancel') {
                registerSessions.delete(tgId);
                return ctx.reply(MSG.registerCancelled);
            }
            const handled = await handleRegisterInput(server, ctx, text);
            if (handled) return;
        }

        // ── Auto-detect pasted tokens by prefix ──
        if (text.startsWith('agent_')) {
            return handlePastedAgentToken(server, ctx, text);
        }
        if (text.startsWith('quest_')) {
            return handlePastedQuestToken(server, ctx, text);
        }
        // Legacy: old format tokens used verify_ wrapper prefix
        if (text.startsWith('verify_')) {
            const rawToken = text.slice(7); // strip "verify_" prefix → raw hex
            return handlePastedAgentToken(server, ctx, rawToken);
        }

        // ── FAQ keyword matching ──
        const lower = text.toLowerCase();
        const match = FAQ.find((entry) =>
            entry.keywords.some((kw) => lower.includes(kw))
        );

        if (match) {
            return ctx.reply(match.answer);
        }

        return ctx.reply(MSG.fallbackNoMatch);
    });

    return composer;
}

async function handlePastedAgentToken(server: FastifyInstance, ctx: BotContext, token: string) {
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

async function handlePastedQuestToken(server: FastifyInstance, ctx: BotContext, token: string) {
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
