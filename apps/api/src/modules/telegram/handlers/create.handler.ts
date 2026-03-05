import { Composer, InlineKeyboard } from 'grammy';
import { FastifyInstance } from 'fastify';
import { BotContext } from '../types';
import { createSessions, CreateSession } from '../telegram.session';

const MSG_CREATE = {
    notLinked:
        'You need a linked ClawQuest account to create quests.\n\n' +
        'Use /start to link your account first.',
    askTitle: 'Let\'s create a quest draft!\n\nStep 1/3 — Enter a title for your quest:',
    askType: (title: string) =>
        `Title: "${title}"\n\nStep 2/3 — Choose the quest type:`,
    askReward: (title: string, type: string) =>
        `Title: "${title}"\nType: ${type}\n\nStep 3/3 — Enter the reward amount (USDC):`,
    invalidAmount: 'Please enter a valid number (e.g. 100, 500, 1000):',
    success: (title: string, questId: string) =>
        `Quest draft created!\n\n"${title}"\n\nContinue editing on the Dashboard:`,
    cancelled: 'Quest creation cancelled.',
} as const;

export function createHandler(server: FastifyInstance): Composer<BotContext> {
    const composer = new Composer<BotContext>();

    composer.command('create', async (ctx) => {
        const tgId = ctx.from?.id;
        if (!tgId) return;

        // Check if user has a linked account
        const user = await findLinkedUser(server, tgId);
        if (!user) {
            return ctx.reply(MSG_CREATE.notLinked);
        }

        // Start create session
        createSessions.set(tgId, { step: 'title' });
        return ctx.reply(MSG_CREATE.askTitle);
    });

    // Quest type selection via inline buttons
    composer.callbackQuery(/^create:type:(.+)$/, async (ctx) => {
        await ctx.answerCallbackQuery();
        const tgId = ctx.from?.id;
        if (!tgId) return;

        const session = createSessions.get(tgId);
        if (!session || session.step !== 'type') return;

        const type = ctx.match[1]; // FCFS, LEADERBOARD, or LUCKY_DRAW
        session.type = type;
        session.step = 'reward';
        createSessions.set(tgId, session);

        return ctx.reply(MSG_CREATE.askReward(session.title!, type));
    });

    return composer;
}

/** Handle text input during create session (called from fallback) */
export async function handleCreateInput(
    server: FastifyInstance,
    ctx: BotContext,
    text: string,
): Promise<boolean> {
    const tgId = ctx.from?.id;
    if (!tgId) return false;

    const session = createSessions.get(tgId);
    if (!session) return false;

    if (text.toLowerCase() === 'cancel' || text.toLowerCase() === '/cancel') {
        createSessions.delete(tgId);
        await ctx.reply(MSG_CREATE.cancelled);
        return true;
    }

    switch (session.step) {
        case 'title':
            return handleTitle(ctx, tgId, session, text);
        case 'reward':
            return handleReward(server, ctx, tgId, session, text);
        default:
            return false;
    }
}

function handleTitle(ctx: BotContext, tgId: number, session: CreateSession, text: string): true {
    session.title = text;
    session.step = 'type';
    createSessions.set(tgId, session);

    const keyboard = new InlineKeyboard()
        .text('FCFS', 'create:type:FCFS')
        .text('Leaderboard', 'create:type:LEADERBOARD')
        .text('Lucky Draw', 'create:type:LUCKY_DRAW');

    ctx.reply(MSG_CREATE.askType(text), { reply_markup: keyboard });
    return true;
}

async function handleReward(
    server: FastifyInstance,
    ctx: BotContext,
    tgId: number,
    session: CreateSession,
    text: string,
): Promise<true> {
    const amount = parseFloat(text);
    if (isNaN(amount) || amount <= 0) {
        await ctx.reply(MSG_CREATE.invalidAmount);
        return true;
    }

    // Find linked user
    const user = await findLinkedUser(server, tgId);
    if (!user) {
        createSessions.delete(tgId);
        await ctx.reply(MSG_CREATE.notLinked);
        return true;
    }

    try {
        const quest = await server.prisma.quest.create({
            data: {
                title: session.title!,
                description: 'Draft created via Telegram',
                type: session.type!,
                rewardAmount: amount,
                rewardType: 'USDC',
                status: 'draft',
                creatorUserId: user.id,
                totalSlots: 10,
            },
        });

        createSessions.delete(tgId);

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const editUrl = `${frontendUrl}/quests/${quest.id}/edit`;

        const keyboard = new InlineKeyboard().url('Continue on Dashboard', editUrl);
        await ctx.reply(MSG_CREATE.success(session.title!, quest.id), { reply_markup: keyboard });
    } catch (err) {
        server.log.error({ err }, 'Failed to create quest draft via Telegram');
        createSessions.delete(tgId);
        await ctx.reply('Failed to create quest. Please try again or use the Dashboard.');
    }

    return true;
}

async function findLinkedUser(
    server: FastifyInstance,
    tgId: number,
): Promise<{ id: string } | null> {
    // Check User.telegramId first
    const user = await server.prisma.user.findFirst({
        where: { telegramId: String(tgId) },
        select: { id: true },
    });
    if (user) return user;

    // Fallback: check TelegramLink → agent → owner
    const link = await server.prisma.telegramLink.findFirst({
        where: { telegramId: BigInt(tgId) },
        include: { agent: { select: { ownerId: true } } },
    });
    if (link?.agent?.ownerId) {
        return { id: link.agent.ownerId };
    }

    return null;
}
