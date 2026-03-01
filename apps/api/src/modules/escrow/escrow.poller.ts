import type { FastifyInstance } from 'fastify';
import { parseEventLogs } from 'viem';
import { ESCROW_ABI } from '@clawquest/shared';
import { escrowConfig, isEscrowConfigured, getContractAddress } from './escrow.config';
import { getPublicClient } from './escrow.client';
import {
    handleQuestFunded,
    handleQuestDistributed,
    handleQuestRefunded,
    handleEmergencyWithdrawal,
} from './escrow-event-handlers';

// ─── Escrow Event Poller ─────────────────────────────────────────────────────
// Polls for all escrow events and updates the database.
// Uses DB-persisted cursor so restarts resume without gaps or re-scans.

/** Max block range per getLogs call (RPC rate-limit safety) */
const MAX_RANGE = 2000n;

/** Health state — exported for /escrow/health endpoint */
export const escrowPollerHealth = {
    running: false,
    lastPollAt: null as Date | null,
    lastError: null as string | null,
    eventsProcessed: 0,
};

/** Read persisted cursor from DB, or default to recent blocks on first run */
async function getCursor(server: FastifyInstance, chainId: number, currentBlock: bigint): Promise<bigint> {
    const row = await server.prisma.escrowCursor.findUnique({ where: { chainId } });
    if (row) return row.lastBlock;
    // First run: start from last ~100 blocks to catch recent events
    return currentBlock > 100n ? currentBlock - 100n : 0n;
}

/** Persist the last processed block for a chain */
async function saveCursor(server: FastifyInstance, chainId: number, lastBlock: bigint): Promise<void> {
    await server.prisma.escrowCursor.upsert({
        where: { chainId },
        create: { chainId, lastBlock },
        update: { lastBlock },
    });
}

/**
 * Poll for all escrow events on a specific chain.
 * Uses confirmation buffer to avoid processing re-org'd blocks.
 */
async function pollChain(server: FastifyInstance, chainId: number): Promise<void> {
    const client = getPublicClient(chainId);

    try {
        const currentBlock = await client.getBlockNumber();
        // Safe block = tip minus confirmation buffer (re-org protection)
        const safeBlock = currentBlock > BigInt(escrowConfig.confirmationBlocks)
            ? currentBlock - BigInt(escrowConfig.confirmationBlocks)
            : currentBlock;

        const cursorBlock = await getCursor(server, chainId, currentBlock);
        const fromBlock = cursorBlock + 1n;

        // No new safe blocks to process
        if (fromBlock > safeBlock) return;

        // Cap range to avoid RPC rate limits
        const toBlock = fromBlock + MAX_RANGE - 1n < safeBlock
            ? fromBlock + MAX_RANGE - 1n
            : safeBlock;

        // Fetch all escrow event logs in one call
        const rawLogs = await client.getLogs({
            address: getContractAddress(chainId),
            fromBlock,
            toBlock,
        });

        if (rawLogs.length === 0) {
            await saveCursor(server, chainId, toBlock);
            return;
        }

        // Decode logs using the full ABI — unknown events are filtered out
        const events = parseEventLogs({ abi: ESCROW_ABI, logs: rawLogs });
        let processed = 0;

        for (const event of events) {
            const txHash = event.transactionHash;
            if (!txHash) continue;

            try {
                switch (event.eventName) {
                    case 'QuestFunded': {
                        const { questId, sponsor, token, amount, expiresAt } = event.args as any;
                        await handleQuestFunded(server.prisma, questId, sponsor, token, BigInt(amount), BigInt(expiresAt), txHash, chainId);
                        break;
                    }
                    case 'QuestDistributed': {
                        const { questId, recipients, amounts, totalPayout } = event.args as any;
                        await handleQuestDistributed(server.prisma, questId, recipients, amounts.map(BigInt), BigInt(totalPayout), txHash, chainId);
                        break;
                    }
                    case 'QuestRefunded': {
                        const { questId, sponsor, amount } = event.args as any;
                        await handleQuestRefunded(server.prisma, questId, sponsor, BigInt(amount), txHash, chainId);
                        break;
                    }
                    case 'EmergencyWithdrawal': {
                        const { questId, sponsor, amount } = event.args as any;
                        await handleEmergencyWithdrawal(server.prisma, questId, sponsor, BigInt(amount), txHash, chainId);
                        break;
                    }
                    default:
                        continue; // skip non-quest events (Paused, TokenAllowlist, etc.)
                }
                processed++;
            } catch (err: any) {
                server.log.error({ err, eventName: event.eventName, txHash }, '[escrow:poller] Error handling event');
            }
        }

        if (processed > 0) {
            server.log.info(`[escrow:poller] Processed ${processed} events on chain ${chainId} (blocks ${fromBlock}-${toBlock})`);
            escrowPollerHealth.eventsProcessed += processed;
        }

        await saveCursor(server, chainId, toBlock);
        escrowPollerHealth.lastPollAt = new Date();
        escrowPollerHealth.lastError = null;
    } catch (err: any) {
        escrowPollerHealth.lastError = err.message;
        server.log.error({ err, chainId }, '[escrow:poller] Error polling chain');
    }
}

/**
 * Start the escrow event poller.
 * Polls the default chain for all escrow events at a regular interval.
 */
export async function startEscrowPoller(server: FastifyInstance): Promise<void> {
    if (!isEscrowConfigured()) {
        server.log.warn('[escrow:poller] Escrow not configured — skipping poller');
        return;
    }

    const chainId = escrowConfig.defaultChainId;
    server.log.info(`[escrow:poller] Starting for chain ${chainId} (interval: ${escrowConfig.pollingIntervalMs}ms, confirmations: ${escrowConfig.confirmationBlocks})`);

    escrowPollerHealth.running = true;
    let interval: NodeJS.Timeout | undefined;

    server.addHook('onClose', () => {
        escrowPollerHealth.running = false;
        if (interval) clearInterval(interval);
        server.log.info('[escrow:poller] Stopped');
    });

    // Initial poll
    await pollChain(server, chainId);

    interval = setInterval(async () => {
        await pollChain(server, chainId);
    }, escrowConfig.pollingIntervalMs);
}
