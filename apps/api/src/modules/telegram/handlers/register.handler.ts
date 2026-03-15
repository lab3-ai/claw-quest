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
    _server: FastifyInstance,
    ctx: BotContext,
    _email: string,
    _code: string
) {
    // Activation code registration flow has been removed
    return ctx.reply(MSG.registerBadCode);
}
