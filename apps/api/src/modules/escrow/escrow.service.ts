import { PrismaClient } from '@prisma/client';
import {
    uuidToBytes32,
    subQuestIdPreimage,
    toSmallestUnit,
    fromSmallestUnit,
    getTokenInfo,
    getChainById,
    isNativeToken,
    ESCROW_ABI,
    TOKEN_REGISTRY,
    SUPPORTED_CHAINS,
} from '@clawquest/shared';
import { keccak256 } from 'viem';

/** Generate a deterministic sub-questId for a sponsor deposit. */
function generateSubQuestId(questId: string, userId: string): `0x${string}` {
    return keccak256(subQuestIdPreimage(questId, userId));
}
import { escrowConfig, getContractAddress, isChainAllowed } from './escrow.config';

/** Resolve numeric chain ID from quest.network string (e.g. "Base" → 8453) */
function resolveChainIdFromNetwork(networkName: string | null | undefined): number | undefined {
    if (!networkName) return undefined;
    const chain = Object.values(SUPPORTED_CHAINS).find(
        c => c.name.toLowerCase() === networkName.toLowerCase()
    );
    return chain?.id;
}
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
 * @param depositorUserId - The user making the deposit. Owner gets original questId; sponsors get sub-questId.
 */
export async function getDepositParams(
    prisma: PrismaClient,
    questId: string,
    depositorUserId?: string,
    chainId?: number,
    tokenSymbol?: string,
): Promise<DepositParams & { escrowQuestId: string }> {
    const quest = await prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) throw new Error('Quest not found');

    const isOwner = !depositorUserId || quest.creatorUserId === depositorUserId;
    const escrowQuestId = isOwner
        ? uuidToBytes32(questId)
        : generateSubQuestId(questId, depositorUserId);

    let targetChainId = chainId ?? quest.cryptoChainId ?? resolveChainIdFromNetwork(quest.network) ?? escrowConfig.defaultChainId;
    if (!isChainAllowed(targetChainId)) {
        targetChainId = escrowConfig.defaultChainId;
    }
    const chain = getChainById(targetChainId);
    if (!chain) throw new Error(`Unsupported chain: ${targetChainId}`);

    const rewardType = quest.rewardType.toUpperCase();
    const tokenInfo = getTokenInfo(targetChainId, rewardType)
        ?? getTokenInfo(targetChainId, (tokenSymbol ?? 'USDC').toUpperCase());
    if (!tokenInfo) {
        throw new Error(`Token ${rewardType} not available on chain ${targetChainId}`);
    }

    const rewardAmountNum = Number(quest.rewardAmount);
    const totalFunded = Number(quest.totalFunded ?? 0);

    // Suggest the remaining needed amount (or full reward if nothing funded yet)
    let depositAmount = rewardAmountNum - totalFunded;
    if (depositAmount <= 0) depositAmount = rewardAmountNum; // already fully funded — show full amount as reference

    const amountSmallestUnit = toSmallestUnit(depositAmount, tokenInfo.decimals);
    const expiresAt = quest.expiresAt ? Math.floor(quest.expiresAt.getTime() / 1000) : 0;

    // Create pending QuestDeposit record if depositor is known
    if (depositorUserId) {
        const existingDeposit = await prisma.questDeposit.findFirst({
            where: { questId, userId: depositorUserId, status: 'pending' },
        });
        if (!existingDeposit) {
            await prisma.questDeposit.create({
                data: {
                    questId,
                    escrowQuestId,
                    userId: depositorUserId,
                    amount: depositAmount,
                    tokenAddress: tokenInfo.address,
                    chainId: targetChainId,
                    walletAddress: '',
                    status: 'pending',
                },
            });
        }
    }

    return {
        contractAddress: getContractAddress(targetChainId),
        questIdBytes32: escrowQuestId,
        escrowQuestId,
        tokenAddress: tokenInfo.address,
        tokenSymbol: tokenInfo.symbol,
        tokenDecimals: tokenInfo.decimals,
        amount: depositAmount,
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
    deposited: string;
    distributed: string;
    refunded: string;
    remaining: string;
    createdAt: number;
    expiresAt: number;
    cancelled: boolean;
    depositedHuman: number;
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
            address: getContractAddress(chainId),
            abi: ESCROW_ABI,
            functionName: 'getQuest',
            args: [questIdBytes32],
        }) as any;

        if (result.sponsor === '0x0000000000000000000000000000000000000000') return null;

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
        if (err.message?.includes('QuestNotFound')) return null;
        throw err;
    }
}

// ─── Payout Distribution Calculation ─────────────────────────────────────────

import {
    computeFcfs,
    computeLeaderboard,
    computeLuckyDraw,
    type PayoutResult,
    type Participant,
} from './distribution-calculator';

export interface PayoutEntry {
    participationId: string;
    agentId: string;
    wallet: string;
    amount: bigint;
}

/**
 * Calculate payout distribution for a quest based on its type.
 * Uses extracted calculator module for pure computation.
 */
export async function calculateDistribution(
    prisma: PrismaClient,
    questId: string,
    overrideTotalFunded?: number,
): Promise<PayoutEntry[]> {
    const quest = await prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) throw new Error('Quest not found');

    const distributionAllowed = ['live', 'completed', 'expired'].includes(quest.status);
    if (!distributionAllowed) {
        throw new Error(`Cannot distribute: quest status is "${quest.status}"`);
    }

    const chainId = quest.cryptoChainId || resolveChainIdFromNetwork(quest.network) || escrowConfig.defaultChainId;
    const tokenInfo = getTokenInfo(chainId, quest.rewardType.toUpperCase());
    if (!tokenInfo) throw new Error(`Token ${quest.rewardType} not found for chain ${chainId}`);

    const totalAmountHuman = overrideTotalFunded ?? Number(quest.rewardAmount);
    const totalAmount = toSmallestUnit(totalAmountHuman, tokenInfo.decimals);

    const participations = await prisma.questParticipation.findMany({
        where: {
            questId,
            status: { in: ['completed', 'submitted', 'verified'] },
            payoutWallet: { not: null },
        },
        orderBy: [{ completedAt: 'asc' }, { joinedAt: 'asc' }],
    });

    if (participations.length === 0) return [];

    // Check for already-distributed payouts
    const alreadyPaid = participations.some(p => p.payoutStatus === 'paid');
    if (alreadyPaid) throw new Error('Quest already has paid distributions');

    const participants: Participant[] = participations.map(p => ({
        id: p.id,
        agentId: p.agentId,
        wallet: p.payoutWallet!,
    }));

    let results: PayoutResult[];

    switch (quest.type) {
        case 'FCFS':
            results = computeFcfs(totalAmount, quest.totalSlots, participants);
            break;
        case 'LEADERBOARD':
            results = computeLeaderboard(totalAmount, participants, quest.rewardTiers as number[] | null);
            break;
        case 'LUCKY_DRAW':
            results = computeLuckyDraw(totalAmount, quest.totalSlots, participants);
            break;
        default:
            throw new Error(`Unknown quest type: ${quest.type}`);
    }

    return results.map(r => ({
        participationId: r.participantId,
        agentId: r.agentId,
        wallet: r.wallet,
        amount: r.amount,
    }));
}

// ─── Write Contract With Retry ────────────────────────────────────────────────

/**
 * Write a contract call with one automatic retry on nonce/replacement errors.
 */
async function writeContractWithRetry(
    walletClient: ReturnType<typeof getOperatorWalletClient>,
    params: Parameters<ReturnType<typeof getOperatorWalletClient>['writeContract']>[0],
    maxRetries = 1,
): Promise<`0x${string}`> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await walletClient.writeContract(params as any);
        } catch (err: any) {
            const isNonceError = err.message?.includes('nonce') || err.message?.includes('replacement');
            if (isNonceError && attempt < maxRetries) {
                await new Promise(r => setTimeout(r, 2000));
                continue;
            }
            throw err;
        }
    }
    throw new Error('Unreachable');
}

// ─── Execute On-chain Distribute ─────────────────────────────────────────────

/**
 * Submit on-chain distribute txs. Returns array of tx hashes (one per sub-escrow).
 * For single-deposit quests, this is backward-compatible (returns 1 hash).
 */
export async function executeDistribute(
    prisma: PrismaClient,
    questId: string,
    chainId: number,
): Promise<string | string[]> {
    const quest = await prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) throw new Error('Quest not found');

    // Guard: check quest status — allow live/completed/expired (ended quests)
    const allowedStatuses = ['live', 'completed', 'expired'];
    if (!allowedStatuses.includes(quest.status)) {
        throw new Error(`Quest must have ended to distribute (status: "${quest.status}")`);
    }
    if (quest.fundingStatus !== 'confirmed') throw new Error('Quest is not funded');

    // Guard: check no existing pending/paid payouts
    const existingPayouts = await prisma.questParticipation.count({
        where: { questId, payoutStatus: { in: ['pending', 'paid'] } },
    });
    if (existingPayouts > 0) throw new Error('Distribution already in progress');

    const totalFunded = Number(quest.totalFunded ?? quest.rewardAmount);
    const payouts = await calculateDistribution(prisma, questId, totalFunded);

    // No eligible participants — mark as distributed (no payouts) so refund can proceed
    if (payouts.length === 0) {
        await prisma.quest.update({
            where: { id: questId },
            data: { status: 'completed', fundingStatus: 'distributed' },
        });
        console.log(`[escrow:distribute] Quest ${questId}: no eligible participants — marked as distributed`);
        return [];
    }

    // Get all confirmed deposits
    const deposits = await prisma.questDeposit.findMany({
        where: { questId, status: 'confirmed' },
    });
    const walletClient = getOperatorWalletClient(chainId);
    const publicClient = getPublicClient(chainId);
    const contractAddr = getContractAddress(chainId);
    const txHashes: string[] = [];

    if (deposits.length === 0) {
        // Legacy path: no QuestDeposit records, use original questIdBytes32
        const questIdBytes32 = uuidToBytes32(questId);
        const recipients = payouts.map(p => p.wallet as `0x${string}`);
        const amounts = payouts.map(p => p.amount);

        await publicClient.simulateContract({
            address: contractAddr, abi: ESCROW_ABI,
            functionName: 'distribute',
            args: [questIdBytes32, recipients, amounts],
            account: walletClient.account!,
        });
        const txHash = await writeContractWithRetry(walletClient, {
            address: contractAddr,
            abi: ESCROW_ABI,
            chain: walletClient.chain!,
            account: walletClient.account!,
            functionName: 'distribute',
            args: [questIdBytes32, recipients, amounts],
        });
        txHashes.push(txHash);
    } else {
        // Multi-deposit: proportional distribution per sub-escrow
        // Use BigInt arithmetic to avoid precision loss with 18-decimal tokens
        const totalPayoutAmount = payouts.reduce((sum, p) => sum + p.amount, 0n);

        for (const deposit of deposits) {
            const depositAmountBig = toSmallestUnit(Number(deposit.amount), quest.tokenDecimals || 6);
            const recipients = payouts.map(p => p.wallet as `0x${string}`);
            // Proportional: (payout.amount * depositAmount) / totalPayoutAmount
            const amounts = payouts.map(p => (p.amount * depositAmountBig) / totalPayoutAmount);

            await publicClient.simulateContract({
                address: contractAddr, abi: ESCROW_ABI,
                functionName: 'distribute',
                args: [deposit.escrowQuestId as `0x${string}`, recipients, amounts],
                account: walletClient.account!,
            });
            const txHash = await writeContractWithRetry(walletClient, {
                address: contractAddr,
                abi: ESCROW_ABI,
                chain: walletClient.chain!,
                account: walletClient.account!,
                functionName: 'distribute',
                args: [deposit.escrowQuestId as `0x${string}`, recipients, amounts],
            });
            txHashes.push(txHash);
            console.log(`[escrow:distribute] deposit ${deposit.id} tx: ${txHash}`);
        }
    }

    // Mark pending — poller upgrades to 'paid' when QuestDistributed event arrives
    const decimals = quest.tokenDecimals || 6;
    for (const payout of payouts) {
        await prisma.questParticipation.update({
            where: { id: payout.participationId },
            data: { payoutAmount: fromSmallestUnit(payout.amount, decimals), payoutStatus: 'pending', payoutTxHash: txHashes[0] },
        });
    }

    console.log(`[escrow:distribute] Quest ${questId}: ${txHashes.length} tx(s) submitted`);
    return txHashes.length === 1 ? txHashes[0] : txHashes;
}

// ─── Execute On-chain Refund ─────────────────────────────────────────────────

/**
 * Submit on-chain refund txs. Returns array of tx hashes (one per sub-escrow).
 */
export async function executeRefund(
    prisma: PrismaClient,
    questId: string,
    chainId: number,
): Promise<string | string[]> {
    const deposits = await prisma.questDeposit.findMany({
        where: { questId, status: 'confirmed' },
    });

    const walletClient = getOperatorWalletClient(chainId);
    const publicClient = getPublicClient(chainId);
    const contractAddr = getContractAddress(chainId);
    const txHashes: string[] = [];

    if (deposits.length === 0) {
        // Legacy path: no QuestDeposit records, use original questIdBytes32
        const questIdBytes32 = uuidToBytes32(questId);
        await publicClient.simulateContract({
            address: contractAddr, abi: ESCROW_ABI,
            functionName: 'refund', args: [questIdBytes32],
            account: walletClient.account!,
        });
        const txHash = await writeContractWithRetry(walletClient, {
            address: contractAddr,
            abi: ESCROW_ABI,
            chain: walletClient.chain!,
            account: walletClient.account!,
            functionName: 'refund',
            args: [questIdBytes32],
        });
        txHashes.push(txHash);
    } else {
        for (const deposit of deposits) {
            await publicClient.simulateContract({
                address: contractAddr, abi: ESCROW_ABI,
                functionName: 'refund',
                args: [deposit.escrowQuestId as `0x${string}`],
                account: walletClient.account!,
            });
            const txHash = await writeContractWithRetry(walletClient, {
                address: contractAddr,
                abi: ESCROW_ABI,
                chain: walletClient.chain!,
                account: walletClient.account!,
                functionName: 'refund',
                args: [deposit.escrowQuestId as `0x${string}`],
            });
            txHashes.push(txHash);
            console.log(`[escrow:refund] deposit ${deposit.id} tx: ${txHash}`);
        }
    }

    await prisma.quest.update({
        where: { id: questId },
        data: { refundStatus: 'pending', refundTxHash: txHashes[0] },
    });

    console.log(`[escrow:refund] Quest ${questId}: ${txHashes.length} refund tx(s) submitted`);
    return txHashes.length === 1 ? txHashes[0] : txHashes;
}

// Re-export event handlers so existing importers keep working
export {
    handleQuestFunded,
    handleQuestDistributed,
    handleQuestRefunded,
    handleEmergencyWithdrawal,
} from './escrow-event-handlers';
