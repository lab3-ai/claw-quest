import type { FastifyInstance } from 'fastify';
import { parseEventLogs, type Log } from 'viem';
import { ESCROW_ABI } from '@clawquest/shared';
import { escrowConfig, isEscrowConfigured, getContractAddress } from './escrow.config';
import { getPublicClient } from './escrow.client';
import { handleQuestFunded } from './escrow.service';

// ─── Escrow Event Poller ─────────────────────────────────────────────────────
// Polls for QuestFunded events on-chain and updates the database.
// Runs as a background process alongside the API server.

/** Track last processed block per chain to avoid duplicate processing */
const lastProcessedBlock = new Map<number, bigint>();

/**
 * Poll for QuestFunded events on a specific chain.
 */
async function pollChain(server: FastifyInstance, chainId: number): Promise<void> {
    const client = getPublicClient(chainId);

    try {
        const currentBlock = await client.getBlockNumber();

        // First run: start from recent blocks (last ~100 blocks)
        let fromBlock = lastProcessedBlock.get(chainId);
        if (fromBlock === undefined) {
            fromBlock = currentBlock > 100n ? currentBlock - 100n : 0n;
        } else {
            fromBlock = fromBlock + 1n; // Start after last processed
        }

        // No new blocks to process
        if (fromBlock > currentBlock) return;

        // Cap range to avoid RPC limits (usually 2000-10000 blocks)
        const maxRange = 2000n;
        const toBlock = fromBlock + maxRange < currentBlock
            ? fromBlock + maxRange
            : currentBlock;

        // Fetch QuestFunded event logs
        const logs = await client.getLogs({
            address: getContractAddress(chainId),
            event: {
                type: 'event',
                name: 'QuestFunded',
                inputs: [
                    { name: 'questId', type: 'bytes32', indexed: true },
                    { name: 'sponsor', type: 'address', indexed: true },
                    { name: 'token', type: 'address', indexed: false },
                    { name: 'amount', type: 'uint128', indexed: false },
                    { name: 'expiresAt', type: 'uint64', indexed: false },
                ],
            },
            fromBlock,
            toBlock,
        });

        // Process each event
        for (const log of logs) {
            const { questId, sponsor, token, amount, expiresAt } = log.args as any;
            const txHash = log.transactionHash;

            if (!questId || !sponsor || !txHash) {
                server.log.warn({ log }, '[escrow-poller] Incomplete QuestFunded event');
                continue;
            }

            try {
                await handleQuestFunded(
                    server.prisma,
                    questId,
                    sponsor,
                    token,
                    BigInt(amount),
                    BigInt(expiresAt),
                    txHash,
                    chainId,
                );
            } catch (err: any) {
                server.log.error({ err, questId, txHash }, '[escrow-poller] Error handling QuestFunded');
            }
        }

        if (logs.length > 0) {
            server.log.info(`[escrow-poller] Processed ${logs.length} QuestFunded events on chain ${chainId} (blocks ${fromBlock}-${toBlock})`);
        }

        lastProcessedBlock.set(chainId, toBlock);
    } catch (err: any) {
        server.log.error({ err, chainId }, '[escrow-poller] Error polling chain');
    }
}

/**
 * Start the escrow event poller.
 * Polls the default chain for QuestFunded events at a regular interval.
 */
export async function startEscrowPoller(server: FastifyInstance): Promise<void> {
    if (!isEscrowConfigured()) {
        server.log.warn('[escrow-poller] Escrow not configured (missing ESCROW_CONTRACT or OPERATOR_PRIVATE_KEY), skipping poller');
        return;
    }

    const chainId = escrowConfig.defaultChainId;
    server.log.info(`[escrow-poller] Starting event poller for chain ${chainId} (interval: ${escrowConfig.pollingIntervalMs}ms)`);

    let interval: NodeJS.Timeout | undefined;

    // Cleanup on server close
    server.addHook('onClose', () => {
        if (interval) clearInterval(interval);
        server.log.info('[escrow-poller] Stopped');
    });

    // Initial poll
    await pollChain(server, chainId);

    // Start interval
    interval = setInterval(async () => {
        await pollChain(server, chainId);
    }, escrowConfig.pollingIntervalMs);
}
