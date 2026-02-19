import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

// Load env vars
import 'dotenv/config';

// Import Routes
import { authRoutes } from './modules/auth/auth.routes';
import { agentsRoutes } from './modules/agents/agents.routes';
import { questsRoutes } from './modules/quests/quests.routes';

// Type extensions
declare module 'fastify' {
    interface FastifyInstance {
        authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
        prisma: PrismaClient;
    }
}

declare module '@fastify/jwt' {
    interface FastifyJWT {
        payload: { id: string; email: string };
        user: { id: string; email: string };
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
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
});

server.register(jwt, {
    secret: process.env.JWT_SECRET || 'supersecret',
});

server.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        await request.jwtVerify();
    } catch (err) {
        reply.send(err);
    }
});

// Database
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
server.decorate('prisma', prisma);

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
});

server.register(swaggerUi, {
    routePrefix: '/docs',
});

// Routes
server.register(authRoutes, { prefix: '/auth' });
server.register(agentsRoutes, { prefix: '/agents' });
server.register(questsRoutes, { prefix: '/quests' });

// Telegram Bot (Polling for local dev)
import { TelegramService } from './modules/telegram/telegram.service';

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
