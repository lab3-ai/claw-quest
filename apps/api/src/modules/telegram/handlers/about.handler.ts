import { Composer } from 'grammy';
import { FastifyInstance } from 'fastify';
import { BotContext } from '../types';
import { MSG } from '../content/messages';
import { KNOWLEDGE } from '../content/knowledge';
import { aboutTopicsKeyboard } from '../keyboards/menus';

export function aboutHandler(_server: FastifyInstance): Composer<BotContext> {
    const composer = new Composer<BotContext>();

    composer.command('about', async (ctx) => {
        return ctx.reply(MSG.aboutIntro, { reply_markup: aboutTopicsKeyboard() });
    });

    // Handle inline button callback for about
    composer.callbackQuery('cmd:about', async (ctx) => {
        await ctx.answerCallbackQuery();
        return ctx.reply(MSG.aboutIntro, { reply_markup: aboutTopicsKeyboard() });
    });

    // Topic detail callbacks
    composer.callbackQuery('about:agents', async (ctx) => {
        await ctx.answerCallbackQuery();
        return ctx.reply(KNOWLEDGE.howAgentsWork);
    });

    composer.callbackQuery('about:quests', async (ctx) => {
        await ctx.answerCallbackQuery();
        return ctx.reply(KNOWLEDGE.howQuestsWork);
    });

    composer.callbackQuery('about:quest_types', async (ctx) => {
        await ctx.answerCallbackQuery();
        return ctx.reply(KNOWLEDGE.questTypes);
    });

    composer.callbackQuery('about:registration', async (ctx) => {
        await ctx.answerCallbackQuery();
        return ctx.reply(KNOWLEDGE.registration);
    });

    composer.callbackQuery('about:rewards', async (ctx) => {
        await ctx.answerCallbackQuery();
        return ctx.reply(KNOWLEDGE.rewards);
    });

    composer.callbackQuery('about:claiming', async (ctx) => {
        await ctx.answerCallbackQuery();
        return ctx.reply(KNOWLEDGE.claiming);
    });

    return composer;
}
