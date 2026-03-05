import type { FastifyInstance } from 'fastify';
import { parseEventLogs } from 'viem';
import { ESCROW_ABI } from '@clawquest/shared';
import { escrowConfig, isEscrowConfigured, getContractAddress, isChainAllowed } from './escrow.config';
import { getPublicClient } from './escrow.client';
import {
    handleQuestFunded,
    handleQuestDistributed,
    handleQuestRefunded,
    handleEmergencyWithdrawal,
} from './escrow-event-handlers';

// ─── Escrow Event Poller ─────────────────────────────────────────────────────
// Polls ALL active chains for escrow events and updates the database.
// Uses DB-persisted cursor so restarts resume without gaps or re-scans.

/** Max block range per getLogs call (RPC rate-limit safety) */
const MAX_RANGE = 2000n;

interface ChainHealth {
    lastPollAt: Date | null;
    lastError: string | null;
    eventsProcessed: number;
}

/** Health state — exported for /escrow/health endpoint */
export const escrowPollerHealth = {
    running: false,
    lastPollAt: null as Date | null,
    lastError: null as string | null,
    eventsProcessed: 0,
    chains: {} as Record<number, ChainHealth>,
};

/** Initialize per-chain health entries */
function initChainHealth(chainIds: number[]): void {
    for (const id of chainIds) {
        escrowPollerHealth.chains[id] = {
            lastPollAt: null,
            lastError: null,
            eventsProcessed: 0,
        };
    }
}

/** Read persisted cursor from DB, or default to recent blocks on first run */
async function getCursor(server: FastifyInstance, chainId: number, currentBlock: bigint): Promise<bigint> {
    try {
        const row = await server.prisma.escrowCursor.findUnique({ where: { chainId } });
        if (row) {
            server.log.debug(`[escrow:poller] chain ${chainId} cursor from DB: block ${row.lastBlock}`);
            return row.lastBlock;
        }
        server.log.info(`[escrow:poller] chain ${chainId} no cursor in DB — first run, starting from block ${currentBlock - 100n}`);
    } catch (err: any) {
        // Table may not exist yet (migration pending) — fall through to default
        server.log.warn(`[escrow:poller] EscrowCursor table not available (${err.message}), using default cursor`);
    }
    // First run: start from last ~100 blocks to catch recent events
    return currentBlock > 100n ? currentBlock - 100n : 0n;
}

/** Persist the last processed block for a chain */
async function saveCursor(server: FastifyInstance, chainId: number, lastBlock: bigint): Promise<void> {
    try {
        await server.prisma.escrowCursor.upsert({
            where: { chainId },
            create: { chainId, lastBlock },
            update: { lastBlock },
        });
    } catch {
        // Table may not exist yet — skip persisting, will re-scan on next poll
        server.log.warn('[escrow:poller] Failed to save cursor (migration pending?)');
    }
}

/**
 * Poll for all escrow events on a specific chain.
 * Uses confirmation buffer to avoid processing re-org'd blocks.
 */
async function pollChain(server: FastifyInstance, chainId: number): Promise<void> {
    const client = getPublicClient(chainId);
    const chainHealth = escrowPollerHealth.chains[chainId];

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
            server.log.info(`[escrow:poller] Saving cursor for chain ${chainId} to block ${toBlock}`);
            await saveCursor(server, chainId, toBlock);
            if (chainHealth) {
                chainHealth.lastPollAt = new Date();
                chainHealth.lastError = null;
            }
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
            if (chainHealth) chainHealth.eventsProcessed += processed;
        }
        server.log.info(`[escrow:poller] Saving cursor for chain ${chainId} to block ${toBlock}`);

        await saveCursor(server, chainId, toBlock);

        const now = new Date();
        escrowPollerHealth.lastPollAt = now;
        escrowPollerHealth.lastError = null;
        if (chainHealth) {
            chainHealth.lastPollAt = now;
            chainHealth.lastError = null;
        }
    } catch (err: any) {
        escrowPollerHealth.lastError = `chain ${chainId}: ${err.message}`;
        if (chainHealth) chainHealth.lastError = err.message;
        server.log.error({ err, chainId }, '[escrow:poller] Error polling chain');
    }
}

/**
 * Poll all active chains in parallel.
 * Uses Promise.allSettled so one chain failing doesn't block others.
 */
async function pollAllChains(server: FastifyInstance, chainIds: number[]): Promise<void> {
    server.log.info(`[escrow:poller] Tick — polling chains [${chainIds.join(', ')}]`);
    await Promise.allSettled(
        chainIds.map(chainId => pollChain(server, chainId))
    );
}

/**
 * Start the escrow event poller.
 * Polls ALL active chains for escrow events at a regular interval.
 */
export async function startEscrowPoller(server: FastifyInstance): Promise<void> {
    if (!isEscrowConfigured()) {
        server.log.warn('[escrow:poller] Escrow not configured — skipping poller');
        return;
    }

    // Filter activeChainIds to only chains allowed in current networkMode
    const chainIds = escrowConfig.activeChainIds.filter(id => isChainAllowed(id));
    if (chainIds.length === 0) {
        server.log.warn('[escrow:poller] No active chains to poll');
        return;
    }

    server.log.info(
        `[escrow:poller] Starting for chains [${chainIds.join(', ')}] ` +
        `(interval: ${escrowConfig.pollingIntervalMs}ms, confirmations: ${escrowConfig.confirmationBlocks})`
    );

    initChainHealth(chainIds);
    escrowPollerHealth.running = true;
    let interval: NodeJS.Timeout | undefined;

    server.addHook('onClose', () => {
        escrowPollerHealth.running = false;
        if (interval) clearInterval(interval);
        server.log.info('[escrow:poller] Stopped');
    });

    // Initial poll
    await pollAllChains(server, chainIds);

    interval = setInterval(async () => {
        await pollAllChains(server, chainIds);
    }, escrowConfig.pollingIntervalMs);
}
