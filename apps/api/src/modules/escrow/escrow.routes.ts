import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getDepositParams, getEscrowStatus, executeDistribute, executeRefund } from './escrow.service';
import { isEscrowConfigured, escrowConfig, isChainAllowed } from './escrow.config';
import { issueLlmKeysForQuest } from '../quests/llm-key-reward.service';
import { getPublicClient } from './escrow.client';
import { escrowPollerHealth } from './escrow.poller';
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
                        networkMode: z.enum(['testnet', 'mainnet']),
                    }),
                },
            },
        },
        async () => {
            const { getChainById } = await import('@clawquest/shared');
            const chains = escrowConfig.activeChainIds
                .map(id => getChainById(id))
                .filter((c): c is NonNullable<typeof c> => !!c);
            return {
                chains: chains.map(c => ({ id: c.id, name: c.name, isTestnet: c.isTestnet })),
                networkMode: escrowConfig.networkMode,
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
                    tokenSymbol: z.string().optional(),
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
            const { chainId, tokenSymbol } = (request.query as any) || {};

            // Validate chain is allowed in current environment
            if (chainId && !isChainAllowed(chainId)) {
                return reply.status(400).send({
                    message: `Chain ${chainId} is not available in this environment`,
                } as any);
            }

            try {
                // Pass depositor userId if authenticated (for sub-questId generation)
                let depositorUserId: string | undefined;
                try {
                    const authHeader = request.headers.authorization;
                    if (authHeader?.startsWith('Bearer ') && !authHeader.startsWith('Bearer cq_')) {
                        await (server as any).authenticate(request, reply);
                        depositorUserId = (request as any).user?.id;
                    }
                } catch { /* public access — no user */ }

                const params = await getDepositParams(server.prisma, questId, depositorUserId, chainId, tokenSymbol);
                return params;
            } catch (err: any) {
                if (err.message === 'Quest not found') {
                    return reply.status(404).send({ message: err.message } as any);
                }
                if (err.message === 'Quest already fully funded') {
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
                summary: 'Distribute rewards (on-chain for crypto, LLM keys for LLM quests)',
                security: [{ bearerAuth: [] }],
                params: z.object({ questId: z.string().uuid() }),
                body: z.object({
                    chainId: z.number().optional(),
                }),
                response: {
                    200: z.object({
                        message: z.string(),
                        txHash: z.string().optional(),
                        issued: z.number().optional(),
                        failed: z.number().optional(),
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

            const questEnded =
                ['completed', 'expired', 'cancelled'].includes(quest.status) ||
                (quest.expiresAt != null && new Date() >= quest.expiresAt);
            if (!questEnded) {
                return reply.status(400).send({ message: 'Quest has not ended yet' } as any);
            }

            // LLM reward quests: issue API keys instead of on-chain distribution
            const isLlmReward = quest.rewardType === 'LLMTOKEN_OPENROUTER' || quest.rewardType === 'LLM_KEY';
            if (isLlmReward) {
                try {
                    const result = await issueLlmKeysForQuest(server.prisma, questId);
                    // Mark quest as distributed
                    await server.prisma.quest.update({
                        where: { id: questId },
                        data: { fundingStatus: 'distributed', status: 'completed' },
                    });
                    return {
                        message: `LLM keys issued: ${result.issued} success, ${result.failed} failed`,
                        issued: result.issued,
                        failed: result.failed,
                    };
                } catch (err: any) {
                    server.log.error({ err, questId }, '[escrow:distribute] LLM key issuance failed');
                    return reply.status(500).send({ message: `Distribution failed: ${err.message}` } as any);
                }
            }

            // Crypto quests: on-chain distribution
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
                return { message: 'Distribution submitted — poller will confirm', txHash };
            } catch (err: any) {
                server.log.error({ err, questId }, '[escrow:distribute] failed');
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

            // Refund is allowed after distribution, OR immediately if quest ended with no winners
            const isDistributed = quest.fundingStatus === 'distributed';
            const questEnded =
                ['completed', 'expired', 'cancelled'].includes(quest.status) ||
                (quest.expiresAt != null && new Date() >= quest.expiresAt);
            const noWinners = questEnded && await server.prisma.questParticipation.count({
                where: {
                    questId,
                    status: { in: ['completed', 'submitted', 'verified'] },
                    payoutWallet: { not: null },
                },
            }) === 0;

            if (!isDistributed && !noWinners) {
                return reply.status(400).send({ message: 'Rewards must be distributed before a refund can be issued' } as any);
            }

            const targetChainId = chainId || quest.cryptoChainId || escrowConfig.defaultChainId;

            if (!isChainAllowed(targetChainId)) {
                return reply.status(400).send({
                    message: `Chain ${targetChainId} is not available in this environment`,
                } as any);
            }

            try {
                const txHash = await executeRefund(server.prisma, questId, targetChainId);
                return { message: 'Refund submitted — poller will confirm', txHash };
            } catch (err: any) {
                server.log.error({ err, questId }, '[escrow:refund] failed');
                return reply.status(500).send({ message: `Refund failed: ${err.message}` } as any);
            }
        }
    );

    // ── GET /escrow/tx-status/:txHash ─────────────────────────────────────────
    // Check on-chain receipt status for a given tx hash.
    server.get(
        '/tx-status/:txHash',
        {
            schema: {
                tags: ['Escrow'],
                summary: 'Check transaction receipt status',
                security: [{ bearerAuth: [] }],
                params: z.object({ txHash: z.string() }),
                querystring: z.object({ chainId: z.coerce.number().optional() }),
                response: {
                    200: z.object({
                        txHash: z.string(),
                        status: z.enum(['pending', 'confirmed', 'failed']),
                        blockNumber: z.number().optional(),
                        gasUsed: z.string().optional(),
                    }),
                },
            },
            onRequest: [server.authenticate],
        },
        async (request, reply) => {
            const { txHash } = request.params as any;
            const { chainId } = request.query as any;
            const targetChainId = chainId || escrowConfig.defaultChainId;

            if (!isChainAllowed(targetChainId)) {
                return reply.status(400).send({
                    message: `Chain ${targetChainId} is not available in this environment`,
                } as any);
            }

            const client = getPublicClient(targetChainId);

            try {
                const receipt = await client.getTransactionReceipt({ hash: txHash as `0x${string}` });
                return {
                    txHash,
                    status: receipt.status === 'success' ? 'confirmed' as const : 'failed' as const,
                    blockNumber: Number(receipt.blockNumber),
                    gasUsed: receipt.gasUsed.toString(),
                };
            } catch {
                // Not mined yet
                return { txHash, status: 'pending' as const };
            }
        }
    );

    // ── GET /escrow/health ────────────────────────────────────────────────────
    // Returns poller health state. Admin auth required.
    server.get(
        '/health',
        {
            schema: {
                tags: ['Escrow'],
                summary: 'Escrow poller health status',
                security: [{ bearerAuth: [] }],
                response: {
                    200: z.object({
                        configured: z.boolean(),
                        defaultChainId: z.number(),
                        activeChainIds: z.array(z.number()),
                        poller: z.object({
                            running: z.boolean(),
                            lastPollAt: z.string().nullable(),
                            lastError: z.string().nullable(),
                            eventsProcessed: z.number(),
                            chains: z.record(z.string(), z.object({
                                lastPollAt: z.string().nullable(),
                                lastError: z.string().nullable(),
                                eventsProcessed: z.number(),
                            })),
                        }),
                    }),
                },
            },
            onRequest: [server.authenticate],
        },
        async () => {
            const chainStatuses: Record<string, { lastPollAt: string | null; lastError: string | null; eventsProcessed: number }> = {};
            for (const [chainId, status] of Object.entries(escrowPollerHealth.chains)) {
                chainStatuses[chainId] = {
                    lastPollAt: status.lastPollAt?.toISOString() ?? null,
                    lastError: status.lastError,
                    eventsProcessed: status.eventsProcessed,
                };
            }
            return {
                configured: isEscrowConfigured(),
                defaultChainId: escrowConfig.defaultChainId,
                activeChainIds: [...escrowConfig.activeChainIds],
                poller: {
                    running: escrowPollerHealth.running,
                    lastPollAt: escrowPollerHealth.lastPollAt?.toISOString() ?? null,
                    lastError: escrowPollerHealth.lastError,
                    eventsProcessed: escrowPollerHealth.eventsProcessed,
                    chains: chainStatuses,
                },
            };
        }
    );
}
