import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getDepositParams, getEscrowStatus, executeDistribute, executeRefund } from './escrow.service';
import { isEscrowConfigured, escrowConfig, isChainAllowed, getContractAddress } from './escrow.config';
import { getActiveEscrowChainIds } from '@clawquest/shared';
// ─── Escrow Routes ───────────────────────────────────────────────────────────

export async function escrowRoutes(server: FastifyInstance) {

    // ── GET /escrow/supported-chains ───────────────────────────────────────────
    // Returns the list of chains available in the current environment.
    server.get(
        '/supported-chains',
        {
            schema: {
                tags: ['Escrow'],
                summary: 'Get supported chains for the current environment',
                response: {
                    200: z.object({
                        chains: z.array(z.object({
                            id: z.number(),
                            name: z.string(),
                            isTestnet: z.boolean(),
                        })),
                        enableTestnets: z.boolean(),
                    }),
                },
            },
        },
        async () => {
            const { getActiveChains } = await import('@clawquest/shared');
            const chains = getActiveChains(escrowConfig.enableTestnets);
            return {
                chains: chains.map(c => ({ id: c.id, name: c.name, isTestnet: c.isTestnet })),
                enableTestnets: escrowConfig.enableTestnets,
            };
        }
    );

    // ── GET /escrow/deposit-params/:questId ──────────────────────────────────
    // Returns parameters needed by the frontend to construct deposit tx.
    // Public endpoint — no auth required (sponsor needs these to deposit).
    server.get(
        '/deposit-params/:questId',
        {
            schema: {
                tags: ['Escrow'],
                summary: 'Get deposit parameters for a quest',
                params: z.object({ questId: z.string().uuid() }),
                querystring: z.object({
                    chainId: z.coerce.number().optional(),
                }),
                response: {
                    200: z.object({
                        contractAddress: z.string(),
                        questIdBytes32: z.string(),
                        tokenAddress: z.string(),
                        tokenSymbol: z.string(),
                        tokenDecimals: z.number(),
                        amount: z.number(),
                        amountSmallestUnit: z.string(),
                        chainId: z.number(),
                        chainName: z.string(),
                        expiresAt: z.number(),
                        isNative: z.boolean(),
                    }),
                },
            },
        },
        async (request, reply) => {
            if (!isEscrowConfigured()) {
                return reply.status(503).send({ message: 'Escrow not configured' } as any);
            }

            const { questId } = request.params as any;
            const { chainId } = (request.query as any) || {};

            // Validate chain is allowed in current environment
            if (chainId && !isChainAllowed(chainId)) {
                return reply.status(400).send({
                    message: `Chain ${chainId} is not available in this environment`,
                } as any);
            }

            try {
                const params = await getDepositParams(server.prisma, questId, chainId);
                return params;
            } catch (err: any) {
                if (err.message === 'Quest not found') {
                    return reply.status(404).send({ message: err.message } as any);
                }
                if (err.message === 'Quest already funded') {
                    return reply.status(400).send({ message: err.message } as any);
                }
                throw err;
            }
        }
    );

    // ── GET /escrow/status/:questId ──────────────────────────────────────────
    // Returns on-chain escrow status for a quest.
    server.get(
        '/status/:questId',
        {
            schema: {
                tags: ['Escrow'],
                summary: 'Get on-chain escrow status for a quest',
                params: z.object({ questId: z.string().uuid() }),
                querystring: z.object({
                    chainId: z.coerce.number().optional(),
                }),
                response: {
                    200: z.object({
                        sponsor: z.string(),
                        token: z.string(),
                        deposited: z.string(),
                        distributed: z.string(),
                        refunded: z.string(),
                        remaining: z.string(),
                        createdAt: z.number(),
                        expiresAt: z.number(),
                        cancelled: z.boolean(),
                        depositedHuman: z.number(),
                        distributedHuman: z.number(),
                        refundedHuman: z.number(),
                        remainingHuman: z.number(),
                    }),
                },
            },
        },
        async (request, reply) => {
            if (!isEscrowConfigured()) {
                return reply.status(503).send({ message: 'Escrow not configured' } as any);
            }

            const { questId } = request.params as any;
            const { chainId } = (request.query as any) || {};
            const targetChainId = chainId || escrowConfig.defaultChainId;

            if (!isChainAllowed(targetChainId)) {
                return reply.status(400).send({
                    message: `Chain ${targetChainId} is not available in this environment`,
                } as any);
            }

            try {
                const status = await getEscrowStatus(questId, targetChainId);
                if (!status) {
                    return reply.status(404).send({ message: 'Quest not found on-chain' } as any);
                }
                return status;
            } catch (err: any) {
                throw err;
            }
        }
    );

    // ── POST /escrow/distribute/:questId ─────────────────────────────────────
    // Trigger on-chain distribution for a quest.
    // Creator or admin auth required.
    server.post(
        '/distribute/:questId',
        {
            schema: {
                tags: ['Escrow'],
                summary: 'Trigger on-chain distribution (creator or admin)',
                security: [{ bearerAuth: [] }],
                params: z.object({ questId: z.string().uuid() }),
                body: z.object({
                    chainId: z.number().optional(),
                }),
                response: {
                    200: z.object({
                        message: z.string(),
                        txHash: z.string(),
                    }),
                },
            },
            onRequest: [server.authenticate],
        },
        async (request, reply) => {
            if (!isEscrowConfigured()) {
                return reply.status(503).send({ message: 'Escrow not configured' } as any);
            }

            const { questId } = request.params as any;
            const { chainId } = request.body as any;

            const quest = await server.prisma.quest.findUnique({ where: { id: questId } });
            if (!quest) return reply.status(404).send({ message: 'Quest not found' } as any);

            // Creator or admin check
            const isCreator = quest.creatorUserId === request.user.id;
            const isAdmin = request.user.role === 'admin';
            if (!isCreator && !isAdmin) {
                return reply.status(403).send({ message: 'Only quest creator or admin can distribute' } as any);
            }

            if (quest.fundingStatus !== 'confirmed') {
                return reply.status(400).send({ message: 'Quest is not funded' } as any);
            }

            const targetChainId = chainId || quest.cryptoChainId || escrowConfig.defaultChainId;

            if (!isChainAllowed(targetChainId)) {
                return reply.status(400).send({
                    message: `Chain ${targetChainId} is not available in this environment`,
                } as any);
            }

            try {
                const txHash = await executeDistribute(server.prisma, questId, targetChainId);
                return { message: 'Distribution successful', txHash };
            } catch (err: any) {
                server.log.error({ err, questId }, 'Distribution failed');
                return reply.status(500).send({ message: `Distribution failed: ${err.message}` } as any);
            }
        }
    );

    // ── POST /escrow/refund/:questId ─────────────────────────────────────────
    // Trigger on-chain refund for a quest.
    // Creator or admin auth required.
    server.post(
        '/refund/:questId',
        {
            schema: {
                tags: ['Escrow'],
                summary: 'Trigger on-chain refund (creator or admin)',
                security: [{ bearerAuth: [] }],
                params: z.object({ questId: z.string().uuid() }),
                body: z.object({
                    chainId: z.number().optional(),
                }),
                response: {
                    200: z.object({
                        message: z.string(),
                        txHash: z.string(),
                    }),
                },
            },
            onRequest: [server.authenticate],
        },
        async (request, reply) => {
            if (!isEscrowConfigured()) {
                return reply.status(503).send({ message: 'Escrow not configured' } as any);
            }

            const { questId } = request.params as any;
            const { chainId } = request.body as any;

            const quest = await server.prisma.quest.findUnique({ where: { id: questId } });
            if (!quest) return reply.status(404).send({ message: 'Quest not found' } as any);

            // Creator or admin check
            const isCreator = quest.creatorUserId === request.user.id;
            const isAdmin = request.user.role === 'admin';
            if (!isCreator && !isAdmin) {
                return reply.status(403).send({ message: 'Only quest creator or admin can refund' } as any);
            }

            if (quest.fundingStatus !== 'confirmed') {
                return reply.status(400).send({ message: 'Quest is not funded' } as any);
            }

            const targetChainId = chainId || quest.cryptoChainId || escrowConfig.defaultChainId;

            if (!isChainAllowed(targetChainId)) {
                return reply.status(400).send({
                    message: `Chain ${targetChainId} is not available in this environment`,
                } as any);
            }

            try {
                const txHash = await executeRefund(server.prisma, questId, targetChainId);
                return { message: 'Refund successful', txHash };
            } catch (err: any) {
                server.log.error({ err, questId }, 'Refund failed');
                return reply.status(500).send({ message: `Refund failed: ${err.message}` } as any);
            }
        }
    );
}
