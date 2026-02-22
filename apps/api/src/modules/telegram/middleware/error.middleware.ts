import { BotError } from 'grammy';
import { FastifyInstance } from 'fastify';
import { BotContext } from '../types';
import { MSG } from '../content/messages';

export function errorMiddleware(server: FastifyInstance) {
    return (err: BotError<BotContext>) => {
        server.log.error({ err: err.error, update: err.ctx.update }, 'Telegram handler error');
        err.ctx.reply(MSG.genericError).catch(() => {});
    };
}
