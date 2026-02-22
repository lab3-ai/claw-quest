import { PrismaClient } from '@prisma/client';
import {
    uuidToBytes32,
    bytes32ToUuid,
    toSmallestUnit,
    fromSmallestUnit,
    getTokenInfo,
    getChainById,
    isNativeToken,
    ESCROW_ABI,
    TOKEN_REGISTRY,
} from '@clawquest/shared';
import { escrowConfig } from './escrow.config';
import { getPublicClient, getOperatorWalletClient } from './escrow.client';

// ─── Deposit Params (for frontend) ──────────────────────────────────────────

export interface DepositParams {
    contractAddress: string;
    questIdBytes32: string;
    tokenAddress: string;
    tokenSymbol: string;
    tokenDecimals: number;
    amount: number;             // human-readable (e.g., 500)
    amountSmallestUnit: string; // bigint as string (e.g., "500000000")
    chainId: number;
    chainName: string;
    expiresAt: number;          // unix timestamp (0 = no expiry)
    isNative: boolean;
}

/**
 * Generate deposit parameters for a quest (frontend constructs tx from these).
 */
export async function getDepositParams(
    prisma: PrismaClient,
    questId: string,
    chainId?: number,
): Promise<DepositParams> {
    const quest = await prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) throw new Error('Quest not found');

    if (quest.fundingStatus === 'confirmed') {
        throw new Error('Quest already funded');
    }

    const targetChainId = chainId || quest.cryptoChainId || escrowConfig.defaultChainId;
    const chain = getChainById(targetChainId);
    if (!chain) throw new Error(`Unsupported chain: ${targetChainId}`);

    // Determine token from quest's rewardType
    const rewardType = quest.rewardType.toUpperCase();
    const tokenInfo = getTokenInfo(targetChainId, rewardType);
    if (!tokenInfo) {
        throw new Error(`Token ${rewardType} not available on chain ${targetChainId}`);
    }

    const questIdBytes32 = uuidToBytes32(questId);
    const amountSmallestUnit = toSmallestUnit(quest.rewardAmount, tokenInfo.decimals);
    const expiresAt = quest.expiresAt
        ? Math.floor(quest.expiresAt.getTime() / 1000)
        : 0;

    return {
        contractAddress: escrowConfig.contractAddress,
        questIdBytes32,
        tokenAddress: tokenInfo.address,
        tokenSymbol: tokenInfo.symbol,
        tokenDecimals: tokenInfo.decimals,
        amount: quest.rewardAmount,
        amountSmallestUnit: amountSmallestUnit.toString(),
        chainId: targetChainId,
        chainName: chain.name,
        expiresAt,
        isNative: isNativeToken(tokenInfo.address),
    };
}

// ─── On-chain Status ─────────────────────────────────────────────────────────

export interface EscrowStatus {
    sponsor: string;
    token: string;
    deposited: string;      // bigint as string
    distributed: string;
    refunded: string;
    remaining: string;
    createdAt: number;
    expiresAt: number;
    cancelled: boolean;
    depositedHuman: number; // human-readable
    distributedHuman: number;
    refundedHuman: number;
    remainingHuman: number;
}

/**
 * Read on-chain escrow status for a quest.
 */
export async function getEscrowStatus(
    questId: string,
    chainId: number,
): Promise<EscrowStatus | null> {
    const client = getPublicClient(chainId);
    const questIdBytes32 = uuidToBytes32(questId);

    try {
        const result = await client.readContract({
            address: escrowConfig.contractAddress,
            abi: ESCROW_ABI,
            functionName: 'getQuest',
            args: [questIdBytes32],
        }) as any;

        // Check if quest exists (sponsor is zero address = not funded)
        if (result.sponsor === '0x0000000000000000000000000000000000000000') {
            return null;
        }

        // Get token decimals for human-readable conversion
        const tokenInfo = Object.values(TOKEN_REGISTRY[chainId] || {}).find(
            t => t.address.toLowerCase() === result.token.toLowerCase()
        );
        const decimals = tokenInfo?.decimals || 18;

        const deposited = BigInt(result.deposited);
        const distributed = BigInt(result.distributed);
        const refunded = BigInt(result.refunded);
        const remaining = deposited - distributed - refunded;

        return {
            sponsor: result.sponsor,
            token: result.token,
            deposited: deposited.toString(),
            distributed: distributed.toString(),
            refunded: refunded.toString(),
            remaining: remaining.toString(),
            createdAt: Number(result.createdAt),
            expiresAt: Number(result.expiresAt),
            cancelled: result.cancelled,
            depositedHuman: fromSmallestUnit(deposited, decimals),
            distributedHuman: fromSmallestUnit(distributed, decimals),
            refundedHuman: fromSmallestUnit(refunded, decimals),
            remainingHuman: fromSmallestUnit(remaining, decimals),
        };
    } catch (err: any) {
        // Contract revert = quest not found on-chain
        if (err.message?.includes('QuestNotFound')) return null;
        throw err;
    }
}

// ─── Payout Distribution Calculation ─────────────────────────────────────────

export interface PayoutEntry {
    participationId: string;
    agentId: string;
    wallet: string;
    amount: bigint;
}

/**
 * Calculate payout distribution for a quest based on its type.
 * Returns array of { wallet, amount } entries.
 */
export async function calculateDistribution(
    prisma: PrismaClient,
    questId: string,
): Promise<PayoutEntry[]> {
    const quest = await prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) throw new Error('Quest not found');

    const chainId = quest.cryptoChainId || escrowConfig.defaultChainId;
    const tokenInfo = getTokenInfo(chainId, quest.rewardType.toUpperCase());
    if (!tokenInfo) throw new Error(`Token ${quest.rewardType} not found for chain ${chainId}`);

    const totalAmount = toSmallestUnit(quest.rewardAmount, tokenInfo.decimals);

    // Get completed participations with wallet addresses
    const participations = await prisma.questParticipation.findMany({
        where: {
            questId,
            status: { in: ['completed', 'submitted'] },
            payoutWallet: { not: null },
        },
        orderBy: [{ completedAt: 'asc' }, { joinedAt: 'asc' }],
    });

    if (participations.length === 0) return [];

    const entries: PayoutEntry[] = [];

    switch (quest.type) {
        case 'FCFS': {
            // Equal split among all completed participants
            const perPerson = totalAmount / BigInt(participations.length);
            for (const p of participations) {
                entries.push({
                    participationId: p.id,
                    agentId: p.agentId,
                    wallet: p.payoutWallet!,
                    amount: perPerson,
                });
            }
            break;
        }
        case 'LEADERBOARD': {
            // Weighted by rank (1st gets more, decreasing)
            // Simple linear weighting: rank 1 gets N shares, rank 2 gets N-1, etc.
            const n = participations.length;
            const totalShares = BigInt((n * (n + 1)) / 2);
            for (let i = 0; i < n; i++) {
                const shares = BigInt(n - i);
                const amount = (totalAmount * shares) / totalShares;
                entries.push({
                    participationId: participations[i].id,
                    agentId: participations[i].agentId,
                    wallet: participations[i].payoutWallet!,
                    amount,
                });
            }
            break;
        }
        case 'LUCKY_DRAW': {
            // Random selection — pick min(totalSlots, participations.length) winners
            const maxWinners = Math.min(quest.totalSlots, participations.length);
            const shuffled = [...participations].sort(() => Math.random() - 0.5);
            const winners = shuffled.slice(0, maxWinners);
            const perWinner = totalAmount / BigInt(winners.length);
            for (const p of winners) {
                entries.push({
                    participationId: p.id,
                    agentId: p.agentId,
                    wallet: p.payoutWallet!,
                    amount: perWinner,
                });
            }
            break;
        }
        default:
            throw new Error(`Unknown quest type: ${quest.type}`);
    }

    return entries;
}

// ─── Execute On-chain Distribute ─────────────────────────────────────────────

/**
 * Execute on-chain distribute for a quest.
 * Calls the escrow contract's distribute() function.
 */
export async function executeDistribute(
    prisma: PrismaClient,
    questId: string,
    chainId: number,
): Promise<string> {
    const payouts = await calculateDistribution(prisma, questId);
    if (payouts.length === 0) throw new Error('No eligible participants for distribution');

    const questIdBytes32 = uuidToBytes32(questId);
    const recipients = payouts.map(p => p.wallet as `0x${string}`);
    const amounts = payouts.map(p => p.amount);

    const walletClient = getOperatorWalletClient(chainId);
    const publicClient = getPublicClient(chainId);

    // Simulate first
    await publicClient.simulateContract({
        address: escrowConfig.contractAddress,
        abi: ESCROW_ABI,
        functionName: 'distribute',
        args: [questIdBytes32, recipients, amounts],
        account: walletClient.account!,
    });

    // Execute
    const txHash = await walletClient.writeContract({
        address: escrowConfig.contractAddress,
        abi: ESCROW_ABI,
        functionName: 'distribute',
        args: [questIdBytes32, recipients, amounts],
    });

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    if (receipt.status !== 'success') {
        throw new Error(`Distribute tx reverted: ${txHash}`);
    }

    // Update DB — mark payouts
    for (const payout of payouts) {
        await prisma.questParticipation.update({
            where: { id: payout.participationId },
            data: {
                payoutAmount: fromSmallestUnit(
                    payout.amount,
                    (await prisma.quest.findUnique({ where: { id: questId } }))?.tokenDecimals || 6,
                ),
                payoutStatus: 'paid',
                payoutTxHash: txHash,
            },
        });
    }

    // Update quest status
    await prisma.quest.update({
        where: { id: questId },
        data: { status: 'completed' },
    });

    return txHash;
}

// ─── Execute On-chain Refund ─────────────────────────────────────────────────

/**
 * Execute on-chain refund for a quest (returns remaining funds to sponsor).
 */
export async function executeRefund(
    prisma: PrismaClient,
    questId: string,
    chainId: number,
): Promise<string> {
    const questIdBytes32 = uuidToBytes32(questId);
    const walletClient = getOperatorWalletClient(chainId);
    const publicClient = getPublicClient(chainId);

    // Simulate first
    await publicClient.simulateContract({
        address: escrowConfig.contractAddress,
        abi: ESCROW_ABI,
        functionName: 'refund',
        args: [questIdBytes32],
        account: walletClient.account!,
    });

    // Execute
    const txHash = await walletClient.writeContract({
        address: escrowConfig.contractAddress,
        abi: ESCROW_ABI,
        functionName: 'refund',
        args: [questIdBytes32],
    });

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    if (receipt.status !== 'success') {
        throw new Error(`Refund tx reverted: ${txHash}`);
    }

    // Update DB
    await prisma.quest.update({
        where: { id: questId },
        data: {
            refundStatus: 'completed',
            refundTxHash: txHash,
            refundedAt: new Date(),
        },
    });

    return txHash;
}

// ─── Handle QuestFunded Event ────────────────────────────────────────────────

/**
 * Process a QuestFunded event: update DB, transition quest status.
 */
export async function handleQuestFunded(
    prisma: PrismaClient,
    questIdBytes32: string,
    sponsor: string,
    token: string,
    amount: bigint,
    expiresAt: bigint,
    txHash: string,
    chainId: number,
): Promise<void> {
    const questId = bytes32ToUuid(questIdBytes32);

    const quest = await prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) {
        console.warn(`[escrow] QuestFunded event for unknown quest: ${questId}`);
        return;
    }

    if (quest.fundingStatus === 'confirmed') {
        console.warn(`[escrow] Quest ${questId} already confirmed, skipping duplicate event`);
        return;
    }

    // Determine token info
    const tokenInfo = Object.values(TOKEN_REGISTRY[chainId] || {}).find(
        t => t.address.toLowerCase() === token.toLowerCase()
    );

    const humanAmount = tokenInfo
        ? fromSmallestUnit(amount, tokenInfo.decimals)
        : Number(amount);

    // Determine new quest status
    let newStatus = quest.status;
    if (quest.status === 'draft') {
        if (quest.startAt && quest.startAt > new Date()) {
            newStatus = 'scheduled';
        } else {
            newStatus = 'live';
        }
    }

    await prisma.quest.update({
        where: { id: questId },
        data: {
            fundingMethod: 'crypto',
            fundingStatus: 'confirmed',
            cryptoTxHash: txHash,
            cryptoChainId: chainId,
            fundedAt: new Date(),
            fundedAmount: Math.round(humanAmount),
            sponsorWallet: sponsor,
            tokenAddress: token,
            tokenDecimals: tokenInfo?.decimals || null,
            escrowQuestId: questIdBytes32,
            status: newStatus,
        },
    });

    console.log(`[escrow] Quest ${questId} funded: ${humanAmount} ${tokenInfo?.symbol || 'tokens'} on chain ${chainId} (tx: ${txHash})`);
}
