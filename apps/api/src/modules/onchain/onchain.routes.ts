import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { walletPortfolioQuerySchema, walletPortfolioResponseSchema } from './onchain.schemas';
import { getWalletPortfolio, isOnchainEnabled } from './onchain.service';

export async function onchainRoutes(app: FastifyInstance) {
    const server = app.withTypeProvider<ZodTypeProvider>();

    server.get(
        '/wallet-portfolio',
        {
            schema: {
                tags: ['Onchain'],
                summary: 'Get wallet portfolio via OKX OnchainOS (public)',
                querystring: walletPortfolioQuerySchema,
                response: { 200: walletPortfolioResponseSchema },
            },
        },
        async (request, reply) => {
            if (!isOnchainEnabled()) {
                return reply.send({ data: null, error: 'OnchainOS not configured' });
            }

            const { address, chainIds } = request.query;
            const result = await getWalletPortfolio(address, chainIds);

            return reply.send({
                data: result,
                ...(result ? {} : { error: 'Failed to fetch portfolio from OKX' }),
            });
        },
    );
}
