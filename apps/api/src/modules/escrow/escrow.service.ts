import { PrismaClient } from '@prisma/client';
import {
    uuidToBytes32,
    toSmallestUnit,
    fromSmallestUnit,
    getTokenInfo,
    getChainById,
    isNativeToken,
    ESCROW_ABI,
    TOKEN_REGISTRY,
    SUPPORTED_CHAINS,
} from '@clawquest/shared';
import { escrowConfig, getContractAddress } from './escrow.config';

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
 */
export async function getDepositParams(
    prisma: PrismaClient,
    questId: string,
    chainId?: number,
): Promise<DepositParams> {
    const quest = await prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) throw new Error('Quest not found');

    const targetChainId = chainId || quest.cryptoChainId || resolveChainIdFromNetwork(quest.network) || escrowConfig.defaultChainId;
    const chain = getChainById(targetChainId);
    if (!chain) throw new Error(`Unsupported chain: ${targetChainId}`);

    const rewardType = quest.rewardType.toUpperCase();
    const tokenInfo = getTokenInfo(targetChainId, rewardType);
    if (!tokenInfo) {
        throw new Error(`Token ${rewardType} not available on chain ${targetChainId}`);
    }

    // Top-up mode: if already funded, calculate the difference needed
    let depositAmount = quest.rewardAmount;
    if (quest.fundingStatus === 'confirmed' && quest.cryptoChainId) {
        const onChain = await getEscrowStatus(questId, targetChainId);
        const alreadyDeposited = onChain?.depositedHuman ?? 0;
        const diff = quest.rewardAmount - alreadyDeposited;
        if (diff <= 0) throw new Error('Quest already fully funded');
        depositAmount = diff;
    }

    const questIdBytes32 = uuidToBytes32(questId);
    const amountSmallestUnit = toSmallestUnit(depositAmount, tokenInfo.decimals);
    const expiresAt = quest.expiresAt ? Math.floor(quest.expiresAt.getTime() / 1000) : 0;

    return {
        contractAddress: getContractAddress(targetChainId),
        questIdBytes32,
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
): Promise<PayoutEntry[]> {
    const quest = await prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) throw new Error('Quest not found');

    if (quest.status !== 'live' && quest.status !== 'completed') {
        throw new Error(`Cannot distribute: quest status is "${quest.status}"`);
    }

    const chainId = quest.cryptoChainId || resolveChainIdFromNetwork(quest.network) || escrowConfig.defaultChainId;
    const tokenInfo = getTokenInfo(chainId, quest.rewardType.toUpperCase());
    if (!tokenInfo) throw new Error(`Token ${quest.rewardType} not found for chain ${chainId}`);

    const totalAmount = toSmallestUnit(quest.rewardAmount, tokenInfo.decimals);

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
 * Submit on-chain distribute tx. Returns tx hash immediately (fire-and-forget).
 * Poller reconciles DB state when QuestDistributed event is picked up.
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
    const contractAddr = getContractAddress(chainId);

    // Simulate first to catch revert errors early
    await publicClient.simulateContract({
        address: contractAddr,
        abi: ESCROW_ABI,
        functionName: 'distribute',
        args: [questIdBytes32, recipients, amounts],
        account: walletClient.account!,
    });

    const txHash = await writeContractWithRetry(walletClient, {
        address: contractAddr,
        abi: ESCROW_ABI,
        functionName: 'distribute',
        args: [questIdBytes32, recipients, amounts],
    });

    // Mark pending — poller upgrades to 'paid' when QuestDistributed event arrives
    const questData = await prisma.quest.findUnique({ where: { id: questId } });
    const decimals = questData?.tokenDecimals || 6;
    for (const payout of payouts) {
        await prisma.questParticipation.update({
            where: { id: payout.participationId },
            data: { payoutAmount: fromSmallestUnit(payout.amount, decimals), payoutStatus: 'pending', payoutTxHash: txHash },
        });
    }

    console.log(`[escrow:distribute] Quest ${questId}: tx submitted ${txHash}`);
    return txHash;
}

// ─── Execute On-chain Refund ─────────────────────────────────────────────────

/**
 * Submit on-chain refund tx. Returns tx hash immediately (fire-and-forget).
 * Poller reconciles DB state when QuestRefunded event is picked up.
 */
export async function executeRefund(
    prisma: PrismaClient,
    questId: string,
    chainId: number,
): Promise<string> {
    const questIdBytes32 = uuidToBytes32(questId);
    const walletClient = getOperatorWalletClient(chainId);
    const publicClient = getPublicClient(chainId);
    const contractAddr = getContractAddress(chainId);

    await publicClient.simulateContract({
        address: contractAddr,
        abi: ESCROW_ABI,
        functionName: 'refund',
        args: [questIdBytes32],
        account: walletClient.account!,
    });

    const txHash = await writeContractWithRetry(walletClient, {
        address: contractAddr,
        abi: ESCROW_ABI,
        functionName: 'refund',
        args: [questIdBytes32],
    });

    // Mark pending — poller upgrades to 'completed' when QuestRefunded event arrives
    await prisma.quest.update({
        where: { id: questId },
        data: { refundStatus: 'pending', refundTxHash: txHash },
    });

    console.log(`[escrow:refund] Quest ${questId}: tx submitted ${txHash}`);
    return txHash;
}

// Re-export event handlers so existing importers keep working
export {
    handleQuestFunded,
    handleQuestDistributed,
    handleQuestRefunded,
    handleEmergencyWithdrawal,
} from './escrow-event-handlers';
