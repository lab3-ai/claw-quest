import Fastify from 'fastify';
import {
  ZodTypeProvider,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { authRoutes } from '../../modules/auth/auth.routes';
import { questsRoutes } from '../../modules/quests/quests.routes';
import { stripeRoutes } from '../../modules/stripe/stripe.routes';
import { agentsRoutes } from '../../modules/agents/agents.routes';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: any, reply: any) => Promise<void>;
    prisma: PrismaClient;
    supabase: ReturnType<typeof createClient>;
  }
  interface FastifyRequest {
    user: {
      id: string;
      email: string;
      username: string | null;
      displayName: string | null;
      supabaseId: string;
      role: string;
    };
  }
}

export async function createTestServer(prisma: PrismaClient, supabase?: any) {
  const server = Fastify({ logger: false }).withTypeProvider<ZodTypeProvider>();

  // Set up Zod validation
  server.setValidatorCompiler(validatorCompiler);
  server.setSerializerCompiler(serializerCompiler);

  // Mock supabase if not provided
  const mockSupabase = supabase || {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      }),
    },
  };

  server.decorate('prisma', prisma);
  server.decorate('supabase', mockSupabase);

  // Auth middleware
  server.decorate('authenticate', async (request: any, reply: any) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ message: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.slice(7);

    // Check if it's an agent API key format
    if (token.startsWith('agent_key_')) {
      const agent = await prisma.agent.findUnique({
        where: { agentApiKey: token },
        include: { owner: true },
      });

      if (!agent || !agent.owner) {
        return reply.status(401).send({ message: 'Invalid agent API key' });
      }

      request.user = {
        id: agent.owner.id,
        email: agent.owner.email,
        username: agent.owner.username,
        displayName: agent.owner.displayName,
        supabaseId: agent.owner.supabaseId || '',
        role: agent.owner.role || 'user',
      };
      return;
    }

    // Otherwise treat as Supabase JWT
    const { data, error } = await server.supabase.auth.getUser(token);

    if (error || !data.user) {
      return reply.status(401).send({ message: 'Invalid or expired token' });
    }

    const supabaseUser = data.user;
    let user = await prisma.user.findUnique({
      where: { supabaseId: supabaseUser.id },
    });

    if (!user) {
      user = await prisma.user.findUnique({
        where: { email: supabaseUser.email! },
      });

      if (user) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { supabaseId: supabaseUser.id },
        });
      } else {
        user = await prisma.user.create({
          data: {
            supabaseId: supabaseUser.id,
            email: supabaseUser.email!,
            displayName: supabaseUser.user_metadata?.full_name || null,
          },
        });
      }
    }

    request.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      supabaseId: supabaseUser.id,
      role: user.role ?? 'user',
    };
  });

  // Register routes
  server.register(authRoutes, { prefix: '/auth' });
  server.register(questsRoutes, { prefix: '/quests' });
  server.register(stripeRoutes, { prefix: '/stripe' });
  server.register(agentsRoutes, { prefix: '/agents' });

  await server.ready();
  return server;
}
