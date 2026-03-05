import { Composer } from 'grammy';
import { FastifyInstance } from 'fastify';
import { BotContext } from '../types';
import { logMessage } from '../services/chat-log.service';

export function chatLogMiddleware(server: FastifyInstance): Composer<BotContext> {
    const composer = new Composer<BotContext>();

    composer.use(async (ctx, next) => {
        const tgId = ctx.from?.id;
        const text = ctx.message?.text;

        if (tgId && text) {
            const type = text.startsWith('/')
                ? 'command'
                : text.startsWith('agent_') || text.startsWith('quest_') || text.startsWith('verify_')
                  ? 'token'
                  : 'chat';

            await logMessage(server, tgId, 'inbound', type, text, type === 'command' ? { command: text.split(' ')[0] } : undefined);
        }

        await next();
    });

    return composer;
}
