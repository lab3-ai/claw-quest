import { Composer } from 'grammy';
import { FastifyInstance } from 'fastify';
import { BotContext } from '../types';
import { MSG } from '../content/messages';
import { FAQ } from '../content/knowledge';
import { claimQuestKeyboard, aboutTopicsKeyboard } from '../keyboards/menus';
import { handleRegisterInput } from './register.handler';
import { handleCreateInput } from './create.handler';
import { registerSessions, createSessions } from '../telegram.session';
import { isRateLimited } from '../services/rate-limiter';
import { isClaudeChatAvailable, chatWithClaude, streamChatWithClaude } from '../services/claude-chat.service';
import { logMessage, getRecentMessages } from '../services/chat-log.service';
import { MENU_LABELS } from '../keyboards/reply-keyboard';
import { handleQuests } from './quests.handler';
import { handleStatus } from './status.handler';

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
            if (text.toLowerCase() === '/cancel' || text.toLowerCase() === 'cancel') {
                registerSessions.delete(tgId);
                return ctx.reply(MSG.registerCancelled);
            }
            const handled = await handleRegisterInput(server, ctx, text);
            if (handled) return;
        }

        // ── Delegate to create quest flow if session active ──
        if (tgId && createSessions.has(tgId)) {
            const handled = await handleCreateInput(server, ctx, text);
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

        // ── Reply keyboard button routing ──
        if (text === MENU_LABELS.browseQuests) {
            return handleQuests(server, ctx);
        }
        if (text === MENU_LABELS.myStatus) {
            return handleStatus(server, ctx);
        }
        if (text === MENU_LABELS.about) {
            return ctx.reply(MSG.aboutIntro, { reply_markup: aboutTopicsKeyboard() });
        }
        if (text === MENU_LABELS.createQuest) {
            const user = await server.prisma.user.findFirst({
                where: { telegramId: String(tgId) },
                select: { id: true },
            });
            if (!user) {
                return ctx.reply(
                    'You need a linked ClawQuest account to create quests.\n\nUse /start to link your account first.',
                );
            }
            createSessions.set(tgId!, { step: 'title' });
            return ctx.reply('Let\'s create a quest draft!\n\nStep 1/3 — Enter a title for your quest:');
        }

        // ── FAQ keyword matching ──
        const lower = text.toLowerCase();
        const match = FAQ.find((entry) =>
            entry.keywords.some((kw) => lower.includes(kw))
        );

        if (match) {
            await logMessage(server, tgId!, 'outbound', 'bot_response', match.answer, { source: 'faq' });
            return ctx.reply(match.answer);
        }

        // ── AI Chat (Claude Haiku) ──
        if (tgId && isClaudeChatAvailable()) {
            if (isRateLimited(tgId)) {
                return ctx.reply(MSG.rateLimited);
            }

            try {
                const recent = await getRecentMessages(server, tgId);

                // Try streaming first (sendMessageDraft), fall back to non-streaming
                let result = await streamChatWithClaude(tgId, ctx.api, text, recent);
                if (!result) {
                    await ctx.replyWithChatAction('typing');
                    result = await chatWithClaude(text, recent);
                }

                if (result?.reply) {
                    await logMessage(server, tgId, 'outbound', 'bot_response', result.reply, {
                        source: 'claude',
                        model: 'claude-haiku-4-5-20251001',
                        tokens: result.tokensUsed,
                        streamed: true,
                    });
                    return ctx.reply(result.reply);
                }
            } catch (err) {
                server.log.error({ err }, 'Claude chat error in fallback');
            }
        }

        return ctx.reply(MSG.fallbackNoMatch);
    });

    return composer;
}

async function handlePastedAgentToken(_server: FastifyInstance, ctx: BotContext, _token: string) {
    // Verification token flow has been removed — agent registration no longer uses this
    return ctx.reply(MSG.invalidLink);
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
