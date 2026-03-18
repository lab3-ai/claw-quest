import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import scalarPlugin from '@scalar/fastify-api-reference';
import { serializerCompiler, validatorCompiler, ZodTypeProvider, jsonSchemaTransform } from 'fastify-type-provider-zod';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseJwtVerifier, isJwtError } from './utils/supabase-jwt';

// Load env vars
import 'dotenv/config';

// Import Routes
import { authRoutes } from './modules/auth/auth.routes';
import { agentsRoutes } from './modules/agents/agents.routes';
import { questsRoutes } from './modules/quests/quests.routes';
import { escrowRoutes } from './modules/escrow/escrow.routes';
import { walletsRoutes } from './modules/wallets/wallets.routes';
import { adminRoutes, adminLoginRoutes, verifyAdminJwt } from './modules/admin/admin.routes';
import { discordRoutes } from './modules/discord/discord.routes';
import { stripeRoutes } from './modules/stripe/stripe.routes';
import { seoRoutes } from './modules/seo/seo.routes';
import { statsRoutes } from './modules/stats/stats.routes';
import { waitlistRoutes } from './modules/waitlist/waitlist.routes';
import { githubBountyRoutes } from './modules/github-bounty/github-bounty.routes';
import { llmModelsRoutes } from './modules/llm-models/llm-models.routes';
import { web3SkillsRoutes } from './modules/web3-skills/web3-skills.routes';
import { challengesRoutes } from './modules/challenges/challenges.routes';
import { onchainRoutes } from './modules/onchain/onchain.routes';

// ─── Supabase Admin Client ──────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('⚠️  Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — administrative auth actions will not work');
}

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '');

// Initialize once at module load — jose caches JWKS internally
const jwtVerifier = SUPABASE_URL
    ? createSupabaseJwtVerifier(SUPABASE_URL)
    : null;

// ─── Type extensions ────────────────────────────────────────────────────────
declare module 'fastify' {
    interface FastifyInstance {
        authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
        prisma: PrismaClient;
        supabase: typeof supabaseAdmin;
        telegram: TelegramService;
    }
    interface FastifyRequest {
        user: { id: string; email: string; username: string | null; displayName: string | null; supabaseId: string; role: string };
    }
}

import rawBody from 'fastify-raw-body';

const server = Fastify({
    logger: true,
}).withTypeProvider<ZodTypeProvider>();

// Validation configuration
server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);

// Raw body support — required for Stripe webhook signature verification
server.register(rawBody, {
    field: 'rawBody',
    global: false,
    encoding: 'utf8',
    runFirst: true,
});

// Plugins
const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5174',
        'https://clawquest-nu.vercel.app',
        'https://clawquest-ai.vercel.app',
        'https://clawquest.ai',
        'https://www.clawquest.ai',
        'https://admin.clawquest.ai',
        'https://claw-quest-admin.pages.dev',
        'https://claw-quest-dashboard.pages.dev'
    ];

server.register(cors, {
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
});

// ─── Rate Limiting (security) ────────────────────────────────────────────────
import rateLimit from '@fastify/rate-limit';
server.register(rateLimit, {
    global: false, // Opt-in per route via config.rateLimit
    max: 100,
    timeWindow: '1 minute',
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

    // ── Try admin JWT first (admin dashboard tokens) ──────────────────────────
    const adminPayload = verifyAdminJwt(token);
    if (adminPayload) {
        request.user = {
            id: adminPayload.id,
            email: adminPayload.email,
            role: adminPayload.role,
            username: null,
            displayName: null,
            supabaseId: '',
        };
        return;
    }

    // ── Local JWT verification (no network call) ──────────────────────────────
    let supabaseId: string;
    let supabaseEmail: string;
    let supabaseUserMetadata: Record<string, unknown> = {};

    if (jwtVerifier) {
        try {
            const payload = await jwtVerifier.verifyToken(token);
            supabaseId = payload.sub;
            supabaseEmail = payload.email;
            supabaseUserMetadata = payload.user_metadata;
        } catch (err) {
            if (isJwtError(err)) {
                return reply.status(401).send({ message: 'Invalid or expired token' });
            }
            // Network/JWKS failure — fall back to Supabase HTTP API
            const { data, error } = await supabaseAdmin.auth.getUser(token);
            if (error || !data.user) {
                return reply.status(401).send({ message: 'Invalid or expired token' });
            }
            supabaseId = data.user.id;
            supabaseEmail = data.user.email!;
            supabaseUserMetadata = data.user.user_metadata ?? {};
        }
    } else {
        // No SUPABASE_URL configured — fall back to HTTP (dev without env vars)
        const { data, error } = await supabaseAdmin.auth.getUser(token);
        if (error || !data.user) {
            return reply.status(401).send({ message: 'Invalid or expired token' });
        }
        supabaseId = data.user.id;
        supabaseEmail = data.user.email!;
        supabaseUserMetadata = data.user.user_metadata ?? {};
    }

    // ── Check user cache before DB lookup ─────────────────────────────────────
    const cachedUser = jwtVerifier?.getCachedUser(supabaseId);
    if (cachedUser) {
        request.user = {
            id: cachedUser.id,
            email: cachedUser.email,
            username: cachedUser.username,
            displayName: cachedUser.displayName,
            supabaseId,
            role: cachedUser.role ?? 'user',
        };
        return;
    }

    // ── Find or create local Prisma user ──────────────────────────────────────
    let user = await server.prisma.user.findUnique({
        where: { supabaseId },
    });

    if (!user) {
        // Also check by email (for legacy seeded users)
        user = await server.prisma.user.findUnique({
            where: { email: supabaseEmail },
        });

        if (user) {
            // Link existing user to Supabase
            user = await server.prisma.user.update({
                where: { id: user.id },
                data: { supabaseId },
            });
        } else {
            // Create new Prisma user
            const fullName = (supabaseUserMetadata?.full_name as string) || null;
            user = await server.prisma.user.create({
                data: {
                    supabaseId,
                    email: supabaseEmail,
                    displayName: fullName,
                },
            });
        }
    }

    // Sync displayName from metadata if not yet set
    const metaFullName = (supabaseUserMetadata?.full_name as string) || null;
    if (!user.displayName && metaFullName) {
        user = await server.prisma.user.update({
            where: { id: user.id },
            data: { displayName: metaFullName },
        });
    }

    // Cache user for subsequent requests (5-min TTL)
    jwtVerifier?.cacheUser(supabaseId, user);

    request.user = {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        supabaseId,
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
// ─── Health check endpoints ─────────────────────────────────────────────────
// Legacy endpoint (keep for backwards compatibility)
server.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

// Liveness probe - simple check that app is running
server.get('/healthz/live', async (_request, reply) => {
    reply.code(204).send();
});

// Readiness probe - tests database connectivity
server.get('/healthz/ready', async (_request, reply) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        reply.code(200).send({ status: 'ready', timestamp: new Date().toISOString() });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        reply.code(503).send({
            status: 'not_ready',
            error: errorMessage,
            timestamp: new Date().toISOString()
        });
    }
});

server.register(authRoutes, { prefix: '/auth' });
server.register(agentsRoutes, { prefix: '/agents' });
server.register(questsRoutes, { prefix: '/quests' });
server.register(escrowRoutes, { prefix: '/escrow' });
server.register(walletsRoutes, { prefix: '/wallets' });
server.register(adminLoginRoutes); // public, no prefix
server.register(adminRoutes, { prefix: '/admin' });
server.register(discordRoutes, { prefix: '/discord' });
server.register(stripeRoutes, { prefix: '/stripe' });
server.register(seoRoutes, { prefix: '/seo' });
server.register(statsRoutes, { prefix: '/stats' });
server.register(waitlistRoutes, { prefix: '/waitlist' });
server.register(githubBountyRoutes, { prefix: '/github-bounties' });
server.register(llmModelsRoutes, { prefix: '/llm-models' });
server.register(web3SkillsRoutes, { prefix: '/web3-skills' });
server.register(challengesRoutes);
server.register(onchainRoutes, { prefix: '/onchain' });

// Telegram Bot (Polling for local dev)
import { TelegramService } from './modules/telegram/telegram.service';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
let telegramService: TelegramService | null = null;

if (TELEGRAM_BOT_TOKEN) {
    telegramService = new TelegramService(server, TELEGRAM_BOT_TOKEN);
    server.decorate('telegram', telegramService);
} else {
    console.warn('⚠️  Missing TELEGRAM_BOT_TOKEN — Telegram bot will not start');
}

// ClawHub daily skill sync job
import { startClawhubSyncJob } from './modules/clawhub/clawhub-sync.job';

// Escrow Event Poller (detect on-chain deposits)
import { startEscrowPoller } from './modules/escrow/escrow.poller';
import { isEscrowConfigured } from './modules/escrow/escrow.config';
import { rpcManager } from './modules/escrow/rpc-manager.service';
import { invalidateClientCache } from './modules/escrow/escrow.client';

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

// Main
const start = async () => {
    try {
        // Load RPC registry from DB before starting escrow poller or accepting requests
        if (isEscrowConfigured()) {
            try {
                await rpcManager.load(prisma);
                invalidateClientCache(); // ensure clients are rebuilt with DB-sourced RPCs
                startEscrowPoller(server).catch((err) => {
                    console.error('⚠️  Escrow poller failed (non-fatal):', err.message);
                });
            } catch (err: any) {
                console.warn('⚠️  RPC manager load failed (non-fatal) — escrow poller will not start:', err.message);
            }
        } else {
            console.warn('⚠️  Escrow not configured (missing contract address or operator key) — poller will not start');
        }

        // // ClawHub skill catalog sync (runs on startup + every 24h)
        // startClawhubSyncJob(server).catch((err) => {
        //     console.error('⚠️  ClawHub sync job failed (non-fatal):', err.message);
        // });

        // Backfill verification_config for skills missing it (startup + every 6h)
        const { startVerificationConfigBackfillJob } = await import('./modules/clawhub/verification-config-backfill.job');
        startVerificationConfigBackfillJob(server).catch((err) => {
            console.error('⚠️  Verification config backfill failed (non-fatal):', err.message);
        });

        const port = parseInt(process.env.PORT || '3000', 10);
        // Railway requires :: (IPv6) to expose service on public/private network
        await server.listen({ port, host: '::' });
        console.log(`Server listening on http://localhost:${port}`);
        console.log(`Docs available at http://localhost:${port}/docs`);

        // Start Telegram bot polling after server is ready
        if (telegramService) {
            telegramService.startPolling().catch((err) => {
                console.error('⚠️  Telegram bot polling failed (non-fatal):', err.message);
                // Don't crash the server — bot can still send messages via API
            });
        }
    } catch (err) {
        server.log.error(err);
        await prisma.$disconnect();
        const { disconnectTestnetPrisma } = await import('./modules/admin/admin.prisma');
        await disconnectTestnetPrisma();
        process.exit(1);
    }
};

start();
