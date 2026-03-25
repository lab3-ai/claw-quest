import { Composer } from 'grammy';
import { FastifyInstance } from 'fastify';
import { BotContext } from '../types';
import { MSG } from '../content/messages';

export function helpHandler(_server: FastifyInstance): Composer<BotContext> {
    const composer = new Composer<BotContext>();

    composer.command('help', async (ctx) => {
        return ctx.reply(MSG.help);
    });

    // Handle inline button callback for help
    composer.callbackQuery('cmd:help', async (ctx) => {
        await ctx.answerCallbackQuery();
        return ctx.reply(MSG.help);
    });

    return composer;
}
