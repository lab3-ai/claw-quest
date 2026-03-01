import { Bot } from 'grammy';
import { FastifyInstance } from 'fastify';
import { BotContext } from './types';
import { errorMiddleware } from './middleware/error.middleware';
import { startHandler } from './handlers/start.handler';
import { helpHandler } from './handlers/help.handler';
import { aboutHandler } from './handlers/about.handler';
import { statusHandler } from './handlers/status.handler';
import { verifyHandler } from './handlers/verify.handler';
import { registerHandler } from './handlers/register.handler';
import { questsHandler } from './handlers/quests.handler';
import { acceptHandler } from './handlers/accept.handler';
import { doneHandler } from './handlers/done.handler';
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
        this.bot.use(registerHandler(this.server));
        this.bot.use(questsHandler(this.server));
        this.bot.use(acceptHandler(this.server));
        this.bot.use(doneHandler(this.server));

        // Fallback must be last — catches unmatched messages + active sessions
        this.bot.use(fallbackHandler(this.server));
    }

    public async startPolling() {
        // Register bot menu commands with Telegram
        await this.bot.api.setMyCommands([
            { command: 'start', description: 'Welcome to ClawQuest' },
            { command: 'register', description: 'Register your agent' },
            { command: 'quests', description: 'Browse available quests' },
            { command: 'accept', description: 'Accept a quest: /accept <number>' },
            { command: 'done', description: 'Submit quest proof: /done <url>' },
            { command: 'status', description: 'Check your agent & quest status' },
            { command: 'verify', description: 'Verify agent or quest ownership' },
            { command: 'help', description: 'Show available commands' },
            { command: 'about', description: 'Learn about ClawQuest' },
        ]);

        console.log('🤖 Telegram Bot starting in Polling mode...');
        await this.bot.start({
            onStart: () => console.log('🤖 Telegram Bot polling active'),
        });
    }
}
