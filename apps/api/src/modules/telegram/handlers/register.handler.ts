import { Composer } from 'grammy';
import { FastifyInstance } from 'fastify';
import { BotContext } from '../types';
import { MSG } from '../content/messages';
import { registerSessions } from '../telegram.session';

export function registerHandler(server: FastifyInstance): Composer<BotContext> {
    const composer = new Composer<BotContext>();

    composer.command('register', async (ctx) => {
        const tgId = ctx.from?.id;
        if (!tgId) return ctx.reply(MSG.genericError);

        registerSessions.set(tgId, { step: 'email' });
        return ctx.reply(MSG.registerStart + '\n\n' + MSG.registerEmailPrompt);
    });

    return composer;
}

// Exported for use in fallback handler — handles text input during registration flow
export async function handleRegisterInput(
    server: FastifyInstance,
    ctx: BotContext,
    text: string
): Promise<boolean> {
    const tgId = ctx.from?.id;
    if (!tgId) return false;

    const session = registerSessions.get(tgId);
    if (!session) return false;

    if (session.step === 'email') {
        const email = text.trim().toLowerCase();
        session.email = email;
        session.step = 'code';
        registerSessions.set(tgId, session);
        await ctx.reply(MSG.registerCodePrompt);
        return true;
    }

    if (session.step === 'code') {
        await handleAgentRegistration(server, ctx, session.email!, text.trim());
        registerSessions.delete(tgId);
        return true;
    }

    return false;
}

async function handleAgentRegistration(
    server: FastifyInstance,
    ctx: BotContext,
    email: string,
    code: string
) {
    try {
        // 1. Find user by email
        const user = await server.prisma.user.findUnique({ where: { email } });
        if (!user) {
            return ctx.reply(MSG.registerNoUser);
        }

        // 2. Find agent by activation code + owner
        const agent = await server.prisma.agent.findFirst({
            where: { activationCode: code, ownerId: user.id },
        });
        if (!agent) {
            return ctx.reply(MSG.registerBadCode);
        }

        // 3. Check if already linked
        const existing = await server.prisma.telegramLink.findUnique({
            where: { agentId: agent.id },
        });
        if (existing) {
            return ctx.reply(MSG.registerAlreadyLinked);
        }

        // 4. Create TelegramLink
        await server.prisma.telegramLink.create({
            data: {
                agentId: agent.id,
                telegramId: BigInt(ctx.from?.id || 0),
                username: ctx.from?.username,
                firstName: ctx.from?.first_name,
            },
        });

        // 5. Clear activation code
        await server.prisma.agent.update({
            where: { id: agent.id },
            data: { activationCode: null },
        });

        return ctx.reply(MSG.registerSuccess(agent.agentname, agent.id));
    } catch (error) {
        server.log.error(error);
        return ctx.reply(MSG.genericError);
    }
}
