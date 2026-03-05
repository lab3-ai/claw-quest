import { PrismaClient } from '@prisma/client';
import { bytes32ToUuid, fromSmallestUnit, TOKEN_REGISTRY } from '@clawquest/shared';

// ─── Escrow Event Handlers ───────────────────────────────────────────────────
// Each handler processes one on-chain event and updates the DB.
// All handlers are idempotent — safe to call multiple times for the same tx.

/** Resolve token decimals from chain registry or stored quest data */
function resolveDecimals(chainId: number, tokenAddress: string | null, fallback: number | null): number {
    const tokenInfo = Object.values(TOKEN_REGISTRY[chainId] || {}).find(
        t => t.address.toLowerCase() === (tokenAddress || '').toLowerCase()
    );
    return tokenInfo?.decimals ?? fallback ?? 6;
}

/**
 * Resolve a logical questId from an on-chain bytes32.
 * Could be a direct UUID (owner deposit) or a sub-questId (sponsor deposit via keccak256).
 */
async function resolveLogicalQuestId(
    prisma: PrismaClient,
    questIdBytes32: string,
): Promise<{ questId: string; isSubQuestId: boolean } | null> {
    // Try direct UUID decode first (owner deposit)
    try {
        const directId = bytes32ToUuid(questIdBytes32);
        const quest = await prisma.quest.findUnique({ where: { id: directId }, select: { id: true } });
        if (quest) return { questId: quest.id, isSubQuestId: false };
    } catch { /* not a valid UUID — must be a sub-questId */ }

    // Look up by escrowQuestId in QuestDeposit table
    const depositRecord = await prisma.questDeposit.findFirst({
        where: { escrowQuestId: questIdBytes32 },
        select: { questId: true },
    });
    if (depositRecord) return { questId: depositRecord.questId, isSubQuestId: true };

    return null;
}

// ─── QuestFunded ─────────────────────────────────────────────────────────────

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
    const resolved = await resolveLogicalQuestId(prisma, questIdBytes32);
    if (!resolved) {
        console.warn(`[escrow:funded] Unknown escrowQuestId: ${questIdBytes32}`);
        return;
    }
    const { questId, isSubQuestId } = resolved;

    const quest = await prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) { console.warn(`[escrow:funded] Quest ${questId} not found`); return; }

    const tokenInfo = Object.values(TOKEN_REGISTRY[chainId] || {}).find(
        t => t.address.toLowerCase() === token.toLowerCase()
    );
    const decimals = tokenInfo?.decimals ?? 6;
    const humanAmount = tokenInfo ? fromSmallestUnit(amount, decimals) : Number(amount);

    // Update or create QuestDeposit record
    const depositRecord = await prisma.questDeposit.findFirst({
        where: { questId, escrowQuestId: questIdBytes32 },
    });
    if (depositRecord) {
        await prisma.questDeposit.update({
            where: { id: depositRecord.id },
            data: { status: 'confirmed', txHash, walletAddress: sponsor, amount: humanAmount },
        });
    } else if (quest.creatorUserId) {
        // Deposit arrived without prior pending record (e.g. direct on-chain)
        await prisma.questDeposit.create({
            data: {
                questId, escrowQuestId: questIdBytes32,
                userId: quest.creatorUserId,
                amount: humanAmount, tokenAddress: token,
                chainId, txHash, walletAddress: sponsor, status: 'confirmed',
            },
        });
    } else {
        console.warn(`[escrow:funded] Quest ${questId}: deposit without pending record and no creatorUserId — skipping QuestDeposit creation`);
    }

    // Recalculate totalFunded from all confirmed deposits
    const { _sum } = await prisma.questDeposit.aggregate({
        where: { questId, status: 'confirmed' },
        _sum: { amount: true },
    });
    const newTotalFunded = Number(_sum.amount ?? 0);
    const rewardAmount = Number(quest.rewardAmount);
    const newFundingStatus = newTotalFunded >= rewardAmount ? 'confirmed' : 'partial';

    // Status transition: draft → live/scheduled when fully funded
    let newStatus = quest.status;
    if (newFundingStatus === 'confirmed' && quest.status === 'draft') {
        newStatus = (quest.startAt && quest.startAt > new Date()) ? 'scheduled' : 'live';
    }

    await prisma.quest.update({
        where: { id: questId },
        data: {
            totalFunded: newTotalFunded,
            fundingStatus: newFundingStatus,
            fundingMethod: 'crypto',
            cryptoChainId: chainId,
            fundedAt: newFundingStatus === 'confirmed' ? new Date() : quest.fundedAt,
            tokenAddress: quest.tokenAddress ?? token,
            tokenDecimals: quest.tokenDecimals ?? decimals,
            // Only set sponsorWallet + escrowQuestId for owner (main) deposit
            ...(!isSubQuestId ? { sponsorWallet: sponsor, escrowQuestId: questIdBytes32, cryptoTxHash: txHash } : {}),
            status: newStatus,
        },
    });

    console.log(`[escrow:funded] Quest ${questId}: +${humanAmount} (total: ${newTotalFunded}/${rewardAmount}) ${newFundingStatus}`);
}

// ─── QuestDistributed ────────────────────────────────────────────────────────

export async function handleQuestDistributed(
    prisma: PrismaClient,
    questIdBytes32: string,
    recipients: string[],
    amounts: bigint[],
    totalPayout: bigint,
    txHash: string,
    chainId: number,
): Promise<void> {
    const resolved = await resolveLogicalQuestId(prisma, questIdBytes32);
    if (!resolved) {
        console.warn(`[escrow:distributed] Unknown escrowQuestId: ${questIdBytes32}`);
        return;
    }
    const { questId } = resolved;
    const quest = await prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) {
        console.warn(`[escrow:distributed] Quest ${questId} not found`);
        return;
    }

    const decimals = resolveDecimals(chainId, quest.tokenAddress, quest.tokenDecimals);

    for (let i = 0; i < recipients.length; i++) {
        const wallet = recipients[i].toLowerCase();
        const participation = await prisma.questParticipation.findFirst({
            where: { questId, payoutWallet: { equals: wallet, mode: 'insensitive' } },
        });
        if (!participation) {
            console.warn(`[escrow:distributed] No participation for wallet ${wallet} on quest ${questId}`);
            continue;
        }
        if (participation.payoutStatus === 'paid') continue; // idempotent

        await prisma.questParticipation.update({
            where: { id: participation.id },
            data: {
                payoutAmount: fromSmallestUnit(amounts[i], decimals),
                payoutStatus: 'paid',
                payoutTxHash: txHash,
            },
        });
    }

    if (quest.status !== 'completed') {
        await prisma.quest.update({ where: { id: questId }, data: { status: 'completed' } });
    }

    console.log(`[escrow:distributed] Quest ${questId}: ${fromSmallestUnit(totalPayout, decimals)} to ${recipients.length} recipients (tx: ${txHash})`);
}

// ─── QuestRefunded ───────────────────────────────────────────────────────────

export async function handleQuestRefunded(
    prisma: PrismaClient,
    questIdBytes32: string,
    sponsor: string,
    amount: bigint,
    txHash: string,
    chainId: number,
): Promise<void> {
    const resolved = await resolveLogicalQuestId(prisma, questIdBytes32);
    if (!resolved) {
        console.warn(`[escrow:refunded] Unknown escrowQuestId: ${questIdBytes32}`);
        return;
    }
    const { questId } = resolved;

    const quest = await prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) { console.warn(`[escrow:refunded] Quest ${questId} not found`); return; }

    const decimals = resolveDecimals(chainId, quest.tokenAddress, quest.tokenDecimals);
    const humanAmount = fromSmallestUnit(amount, decimals);

    // Mark this specific deposit as refunded
    await prisma.questDeposit.updateMany({
        where: { escrowQuestId: questIdBytes32 },
        data: { status: 'refunded' },
    });

    // Check if all confirmed deposits are now refunded
    const remainingConfirmed = await prisma.questDeposit.count({
        where: { questId, status: 'confirmed' },
    });

    if (remainingConfirmed === 0) {
        // All deposits refunded — mark quest as fully refunded
        await prisma.quest.update({
            where: { id: questId },
            data: {
                refundStatus: 'completed',
                refundTxHash: txHash,
                refundedAt: new Date(),
                refundAmount: Math.round(humanAmount),
                totalFunded: 0,
                fundingStatus: 'refunded',
                status: quest.status !== 'cancelled' ? 'cancelled' : quest.status,
            },
        });
    } else {
        // Partial refund — recalculate totalFunded
        const { _sum } = await prisma.questDeposit.aggregate({
            where: { questId, status: 'confirmed' },
            _sum: { amount: true },
        });
        await prisma.quest.update({
            where: { id: questId },
            data: {
                totalFunded: Number(_sum.amount ?? 0),
                refundStatus: 'pending',
                refundTxHash: txHash,
            },
        });
    }

    console.log(`[escrow:refunded] Quest ${questId}: ${humanAmount} refunded to ${sponsor} (remaining: ${remainingConfirmed} deposits)`);
}

// ─── EmergencyWithdrawal ─────────────────────────────────────────────────────

export async function handleEmergencyWithdrawal(
    prisma: PrismaClient,
    questIdBytes32: string,
    sponsor: string,
    amount: bigint,
    txHash: string,
    chainId: number,
): Promise<void> {
    const resolved = await resolveLogicalQuestId(prisma, questIdBytes32);
    if (!resolved) {
        console.warn(`[escrow:emergency] Unknown escrowQuestId: ${questIdBytes32}`);
        return;
    }
    const { questId } = resolved;

    const quest = await prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) { console.warn(`[escrow:emergency] Quest ${questId} not found`); return; }

    const decimals = resolveDecimals(chainId, quest.tokenAddress, quest.tokenDecimals);
    const humanAmount = fromSmallestUnit(amount, decimals);

    // Mark matching deposit as refunded
    await prisma.questDeposit.updateMany({
        where: { escrowQuestId: questIdBytes32 },
        data: { status: 'refunded' },
    });

    await prisma.quest.update({
        where: { id: questId },
        data: {
            refundStatus: 'completed',
            refundTxHash: txHash,
            refundedAt: new Date(),
            refundAmount: Math.round(humanAmount),
            status: 'cancelled',
        },
    });

    console.log(`[escrow:emergency] EMERGENCY Quest ${questId}: ${humanAmount} withdrawn by ${sponsor} (tx: ${txHash})`);
}
