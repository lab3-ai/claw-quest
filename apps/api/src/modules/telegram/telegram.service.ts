import { Bot } from 'grammy';
import { FastifyInstance } from 'fastify';

export class TelegramService {
    public bot: Bot;

    constructor(private server: FastifyInstance, token: string) {
        this.bot = new Bot(token);
        this.initializeCommands();
    }

    private initializeCommands() {
        this.bot.command('start', async (ctx) => {
            const activationCode = ctx.match; // Payload from /start <code_payload>

            if (!activationCode) {
                return ctx.reply('Welcome to ClawQuest! 🦁\nTo link your agent, go to the Dashboard and get your Activation Code, then send: /start <CODE>');
            }

            await ctx.reply('🔍 Searching for your agent...');

            try {
                // Find agent by activation code
                const agent = await this.server.prisma.agent.findUnique({
                    where: { activationCode: activationCode.toUpperCase() },
                    include: { TelegramLink: true },
                });

                if (!agent) {
                    return ctx.reply('❌ Invalid activation code. Please check and try again.');
                }

                if (agent.TelegramLink) {
                    // Already linked?
                    // Optional: Check if it's the same user. If so, just say hi.
                    return ctx.reply(`⚠️ This agent is already linked to a Telegram account.`);
                }

                // Link Agent
                await this.server.prisma.telegramLink.create({
                    data: {
                        agentId: agent.id,
                        telegramId: BigInt(ctx.from?.id || 0),
                        username: ctx.from?.username,
                        firstName: ctx.from?.first_name,
                    },
                });

                // Clear activation code so it can't be reused? 
                // Or keep it? Privacy wise better to clear or rotate. 
                // For MVP, let's keep it simple, maybe rotate it optionally. 
                // But strict security => clear it.
                // Let's clear it to prevent re-use.
                await this.server.prisma.agent.update({
                    where: { id: agent.id },
                    data: { activationCode: null }
                });

                return ctx.reply(`✅ Success! You are now linked to Agent: *${agent.name}*`, { parse_mode: 'Markdown' });

            } catch (error) {
                this.server.log.error(error);
                return ctx.reply('❌ An error occurred while linking your agent.');
            }
        });

        // /verify <TOKEN> — redirect user to Dashboard verify page
        this.bot.command('verify', async (ctx) => {
            const token = ctx.match;
            if (!token) {
                return ctx.reply('Usage: /verify <TOKEN>\n\nOr click the verification link sent to you.');
            }

            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            const verifyUrl = `${frontendUrl}/verify?token=${token}`;

            return ctx.reply(
                `🔗 Click here to claim your agent:\n${verifyUrl}`,
            );
        });
    }

    public async startPolling() {
        console.log('🤖 Telegram Bot starting in Polling mode...');
        this.bot.catch((err) => {
            console.error('Telegram bot error (non-fatal):', err.message);
        });
        await this.bot.start({
            onStart: () => console.log('🤖 Telegram Bot polling active'),
        });
    }
}
