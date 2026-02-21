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
            const payload = ctx.match; // Payload from /start <payload>

            if (!payload) {
                return ctx.reply(
                    'Welcome to ClawQuest! 🦁\n\n' +
                    'I help you claim AI agents registered on ClawQuest.\n\n' +
                    'Your agent will give you a link — click it and I\'ll handle the rest!'
                );
            }

            // ── Handle verify_<token> deeplink (agent-first flow) ───────
            if (payload.startsWith('verify_')) {
                const token = payload.slice(7); // strip "verify_"
                return this.handleVerifyDeeplink(ctx, token);
            }

            // ── Handle activation code (human-first flow) ───────────────
            return this.handleActivationCode(ctx, payload);
        });
    }

    private async handleVerifyDeeplink(ctx: any, token: string) {
        try {
            const agent = await this.server.prisma.agent.findUnique({
                where: { verificationToken: token },
            });

            if (!agent) {
                return ctx.reply('❌ Invalid or expired verification link. Ask your agent to register again.');
            }

            if (agent.ownerId) {
                return ctx.reply(`✅ Agent *${agent.name}* is already claimed!`, { parse_mode: 'Markdown' });
            }

            if (agent.verificationExpiresAt && agent.verificationExpiresAt < new Date()) {
                return ctx.reply('❌ This verification link has expired. Ask your agent to register again.');
            }

            // Create TelegramLink if not exists
            const existingLink = await this.server.prisma.telegramLink.findUnique({
                where: { agentId: agent.id },
            });
            if (!existingLink) {
                await this.server.prisma.telegramLink.create({
                    data: {
                        agentId: agent.id,
                        telegramId: BigInt(ctx.from?.id || 0),
                        username: ctx.from?.username,
                        firstName: ctx.from?.first_name,
                    },
                });
            }

            // Send Dashboard verify link
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            const verifyUrl = `${frontendUrl}/verify?token=${token}`;

            return ctx.reply(
                `🤖 Agent *${agent.name}* wants to join you on ClawQuest!\n\n` +
                `👉 [Click here to claim this agent](${verifyUrl})\n\n` +
                `_Log in to ClawQuest Dashboard to complete verification._`,
                { parse_mode: 'Markdown' },
            );
        } catch (error) {
            this.server.log.error(error);
            return ctx.reply('❌ An error occurred. Please try again.');
        }
    }

    private async handleActivationCode(ctx: any, code: string) {
        await ctx.reply('🔍 Searching for your agent...');

        try {
            const agent = await this.server.prisma.agent.findUnique({
                where: { activationCode: code.toUpperCase() },
                include: { TelegramLink: true },
            });

            if (!agent) {
                return ctx.reply('❌ Invalid activation code. Please check and try again.');
            }

            if (agent.TelegramLink) {
                return ctx.reply(`⚠️ This agent is already linked to a Telegram account.`);
            }

            await this.server.prisma.telegramLink.create({
                data: {
                    agentId: agent.id,
                    telegramId: BigInt(ctx.from?.id || 0),
                    username: ctx.from?.username,
                    firstName: ctx.from?.first_name,
                },
            });

            await this.server.prisma.agent.update({
                where: { id: agent.id },
                data: { activationCode: null },
            });

            return ctx.reply(`✅ Success! You are now linked to Agent: *${agent.name}*`, { parse_mode: 'Markdown' });
        } catch (error) {
            this.server.log.error(error);
            return ctx.reply('❌ An error occurred while linking your agent.');
        }
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
