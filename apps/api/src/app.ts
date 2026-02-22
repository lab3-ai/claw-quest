import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import scalarPlugin from '@scalar/fastify-api-reference';
import { serializerCompiler, validatorCompiler, ZodTypeProvider, jsonSchemaTransform } from 'fastify-type-provider-zod';
import { createClient } from '@supabase/supabase-js';

// Load env vars
import 'dotenv/config';

// Import Routes
import { authRoutes } from './modules/auth/auth.routes';
import { agentsRoutes } from './modules/agents/agents.routes';
import { questsRoutes } from './modules/quests/quests.routes';
import { escrowRoutes } from './modules/escrow/escrow.routes';
import { walletsRoutes } from './modules/wallets/wallets.routes';
import { adminRoutes } from './modules/admin/admin.routes';

// ─── Supabase Admin Client ──────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('⚠️  Missing SUPABASE_URL / SUPABASE_ANON_KEY — auth will not work');
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Type extensions ────────────────────────────────────────────────────────
declare module 'fastify' {
    interface FastifyInstance {
        authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
        prisma: PrismaClient;
        supabase: typeof supabaseAdmin;
        telegram: TelegramService;
    }
    interface FastifyRequest {
        user: { id: string; email: string; username: string | null; supabaseId: string; role: string };
    }
}

const server = Fastify({
    logger: true,
}).withTypeProvider<ZodTypeProvider>();

// Validation configuration
server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);

// Plugins
server.register(cors, {
    origin: [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5174',
        'https://clawquest-nu.vercel.app',
        'https://clawquest-ai.vercel.app',
        'https://clawquest.ai',
        'https://www.clawquest.ai',
        'https://admin.clawquest.ai',
    ],
});

// ─── Supabase Auth Middleware ────────────────────────────────────────────────
// Verifies the Supabase access_token sent by the frontend,
// then finds-or-creates a Prisma User row so route handlers get `request.user.id`.

server.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ message: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.slice(7);

    // Verify the token with Supabase Auth API
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
        return reply.status(401).send({ message: 'Invalid or expired token' });
    }

    const supabaseUser = data.user;

    // Find or create local Prisma user
    let user = await server.prisma.user.findUnique({
        where: { supabaseId: supabaseUser.id },
    });

    if (!user) {
        // Also check by email (for legacy seeded users)
        user = await server.prisma.user.findUnique({
            where: { email: supabaseUser.email! },
        });

        if (user) {
            // Link existing user to Supabase
            user = await server.prisma.user.update({
                where: { id: user.id },
                data: { supabaseId: supabaseUser.id },
            });
        } else {
            // Create new Prisma user
            user = await server.prisma.user.create({
                data: {
                    supabaseId: supabaseUser.id,
                    email: supabaseUser.email!,
                    username: supabaseUser.email!.split('@')[0],
                },
            });
        }
    }

    request.user = {
        id: user.id,
        email: user.email,
        username: user.username,
        supabaseId: supabaseUser.id,
        role: user.role ?? 'user',
    };
});

// ─── Database ───────────────────────────────────────────────────────────────
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
server.decorate('prisma', prisma);
server.decorate('supabase', supabaseAdmin);

server.register(swagger, {
    openapi: {
        info: {
            title: 'ClawQuest API',
            description: 'API for ClawQuest Agent Platform',
            version: '0.1.0',
        },
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
    },
    transform: jsonSchemaTransform,
});

server.register(scalarPlugin, {
    routePrefix: '/docs',
});

// Routes
server.register(authRoutes, { prefix: '/auth' });
server.register(agentsRoutes, { prefix: '/agents' });
server.register(questsRoutes, { prefix: '/quests' });
server.register(escrowRoutes, { prefix: '/escrow' });
server.register(walletsRoutes, { prefix: '/wallets' });
server.register(adminRoutes, { prefix: '/admin' });

// Telegram Bot (Polling for local dev)
import { TelegramService } from './modules/telegram/telegram.service';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (TELEGRAM_BOT_TOKEN) {
    const telegramService = new TelegramService(server, TELEGRAM_BOT_TOKEN);
    server.decorate('telegram', telegramService);
    telegramService.startPolling().catch((err) => {
        console.error('⚠️  Telegram bot polling failed (non-fatal):', err.message);
        // Don't crash the server — bot can still send messages via API
    });
} else {
    console.warn('⚠️  Missing TELEGRAM_BOT_TOKEN — Telegram bot will not start');
}

// Escrow Event Poller (detect on-chain deposits)
import { startEscrowPoller } from './modules/escrow/escrow.poller';

if (process.env.ESCROW_CONTRACT) {
    startEscrowPoller(server).catch((err) => {
        console.error('⚠️  Escrow poller failed (non-fatal):', err.message);
    });
} else {
    console.warn('⚠️  Missing ESCROW_CONTRACT — escrow poller will not start');
}

// Serve skill.md for agents to read
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const skillPaths = [
    resolve(process.cwd(), '../../skill.md'),   // Railway: /app/apps/api -> /app/skill.md
    resolve(process.cwd(), 'skill.md'),          // if cwd is repo root
    resolve(__dirname, '../../../skill.md'),      // relative to dist/
];
const skillPath = skillPaths.find(p => existsSync(p));
const skillContent = skillPath ? readFileSync(skillPath, 'utf-8') : '# skill.md not found';

server.get('/skill.md', async (_request, reply) => {
    reply.type('text/plain; charset=utf-8').send(skillContent);
});

// Health Check
server.get('/health', async () => {
    return { status: 'ok', datetime: new Date().toISOString() };
});

// Main
const start = async () => {
    try {
        const port = parseInt(process.env.PORT || '3000', 10);
        await server.listen({ port, host: '0.0.0.0' });
        console.log(`Server listening on http://localhost:${port}`);
        console.log(`Docs available at http://localhost:${port}/docs`);
    } catch (err) {
        server.log.error(err);
        await prisma.$disconnect();
        process.exit(1);
    }
};

start();
