import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

export const llmModelsRoutes: FastifyPluginAsyncZod = async (server) => {
    // GET /llm-models — public, returns active models ordered by output price ascending
    server.get('/', {
        schema: {
            tags: ['LLM Models'],
            summary: 'List available LLM models for reward quests',
            response: {
                200: z.object({
                    data: z.array(z.object({
                        id: z.string(),
                        openrouterId: z.string(),
                        name: z.string(),
                        provider: z.string(),
                        tier: z.string(),
                        inputPricePer1M: z.number(),
                        outputPricePer1M: z.number(),
                        contextWindow: z.number(),
                    })),
                }),
            },
        },
    }, async (_request, reply) => {
        const models = await server.prisma.llmModel.findMany({
            where: { isActive: true },
            orderBy: [{ tier: 'asc' }, { outputPricePer1M: 'asc' }],
            select: {
                id: true,
                openrouterId: true,
                name: true,
                provider: true,
                tier: true,
                inputPricePer1M: true,
                outputPricePer1M: true,
                contextWindow: true,
            },
        });

        return reply.send({
            data: models.map(m => ({
                ...m,
                inputPricePer1M: Number(m.inputPricePer1M),
                outputPricePer1M: Number(m.outputPricePer1M),
            })),
        });
    });
};
