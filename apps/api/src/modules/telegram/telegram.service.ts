import { Bot } from 'grammy';
import { FastifyInstance } from 'fastify';
import { BotContext } from './types';
import { errorMiddleware } from './middleware/error.middleware';
import { startHandler } from './handlers/start.handler';
import { helpHandler } from './handlers/help.handler';
import { aboutHandler } from './handlers/about.handler';
import { statusHandler } from './handlers/status.handler';
import { verifyHandler } from './handlers/verify.handler';
import { fallbackHandler } from './handlers/fallback.handler';

export class TelegramService {
    public bot: Bot<BotContext>;

    constructor(private server: FastifyInstance, token: string) {
        this.bot = new Bot<BotContext>(token);
        this.registerHandlers();
    }

    private registerHandlers() {
        // Error boundary
        this.bot.catch(errorMiddleware(this.server));

        // Command handlers (order matters — specific before generic)
        this.bot.use(startHandler(this.server));
        this.bot.use(helpHandler(this.server));
        this.bot.use(aboutHandler(this.server));
        this.bot.use(statusHandler(this.server));
        this.bot.use(verifyHandler(this.server));

        // Fallback must be last — catches unmatched messages
        this.bot.use(fallbackHandler(this.server));
    }

    public async startPolling() {
        // Register bot menu commands with Telegram
        await this.bot.api.setMyCommands([
            { command: 'start', description: 'Welcome to ClawQuest' },
            { command: 'help', description: 'Show available commands' },
            { command: 'verify', description: 'Verify agent or quest ownership' },
            { command: 'status', description: 'Check your linked agents & quests' },
            { command: 'about', description: 'Learn about ClawQuest' },
        ]);

        console.log('🤖 Telegram Bot starting in Polling mode...');
        await this.bot.start({
            onStart: () => console.log('🤖 Telegram Bot polling active'),
        });
    }
}
