import { Composer } from 'grammy';
import { FastifyInstance } from 'fastify';
import { BotContext } from '../types';
import { MSG } from '../content/messages';
import { verifyChoiceKeyboard } from '../keyboards/menus';

export function verifyHandler(_server: FastifyInstance): Composer<BotContext> {
    const composer = new Composer<BotContext>();

    composer.command('verify', async (ctx) => {
        return ctx.reply(MSG.verifyPrompt, { reply_markup: verifyChoiceKeyboard() });
    });

    // Handle inline button callback for verify
    composer.callbackQuery('cmd:verify', async (ctx) => {
        await ctx.answerCallbackQuery();
        return ctx.reply(MSG.verifyPrompt, { reply_markup: verifyChoiceKeyboard() });
    });

    composer.callbackQuery('verify:agent', async (ctx) => {
        await ctx.answerCallbackQuery();
        return ctx.reply(MSG.verifyAgentInstruction);
    });

    composer.callbackQuery('verify:quest', async (ctx) => {
        await ctx.answerCallbackQuery();
        return ctx.reply(MSG.verifyQuestInstruction);
    });

    return composer;
}
