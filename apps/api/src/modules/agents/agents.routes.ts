import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { CreateAgentSchema, AgentSchema } from '@clawquest/shared';
import { z } from 'zod';

export async function agentsRoutes(app: FastifyInstance) {
    const server = app.withTypeProvider<ZodTypeProvider>();

    // List Agents
    server.get(
        '/',
        {
            onRequest: [app.authenticate],
            schema: {
                tags: ['Agents'],
                summary: 'List user agents',
                security: [{ bearerAuth: [] }],
                response: {
                    200: z.array(AgentSchema),
                },
            },
        },
        async (request) => {
            const agents = await server.prisma.agent.findMany({
                where: { ownerId: request.user.id },
                orderBy: { createdAt: 'desc' },
            });
            return agents.map(a => ({
                ...a,
                status: a.status as any,
                createdAt: a.createdAt.toISOString(),
                updatedAt: a.updatedAt.toISOString(),
            }));
        }
    );

    // Create Agent
    server.post(
        '/',
        {
            onRequest: [app.authenticate],
            schema: {
                tags: ['Agents'],
                summary: 'Create a new agent',
                security: [{ bearerAuth: [] }],
                body: CreateAgentSchema,
                response: {
                    201: AgentSchema,
                },
            },
        },
        async (request, reply) => {
            const { name } = request.body;
            const agent = await server.prisma.agent.create({
                data: {
                    name,
                    ownerId: request.user.id,
                    // Generate a random activation code (simple 6-char string)
                    activationCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
                },
            });
            return reply.code(201).send(agent as any);
        }
    );

    // Get Agent Details
    server.get(
        '/:id',
        {
            onRequest: [app.authenticate],
            schema: {
                tags: ['Agents'],
                summary: 'Get agent details',
                security: [{ bearerAuth: [] }],
                params: z.object({ id: z.string().uuid() }),
                response: {
                    200: AgentSchema,
                },
            },
        },
        async (request, reply) => {
            const { id } = request.params;
            const agent = await server.prisma.agent.findFirst({
                where: { id, ownerId: request.user.id },
            });

            if (!agent) {
                return reply.status(404).send({ message: 'Agent not found', code: 'NOT_FOUND' } as any);
            }

            return agent as any;
        }
    );
}
