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
    const questId = bytes32ToUuid(questIdBytes32);
    const quest = await prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) {
        console.warn(`[escrow:funded] Unknown quest: ${questId}`);
        return;
    }
    if (quest.fundingStatus === 'confirmed') return; // idempotent

    const tokenInfo = Object.values(TOKEN_REGISTRY[chainId] || {}).find(
        t => t.address.toLowerCase() === token.toLowerCase()
    );
    const humanAmount = tokenInfo ? fromSmallestUnit(amount, tokenInfo.decimals) : Number(amount);

    let newStatus = quest.status;
    if (quest.status === 'draft') {
        newStatus = (quest.startAt && quest.startAt > new Date()) ? 'scheduled' : 'live';
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

    console.log(`[escrow:funded] Quest ${questId}: ${humanAmount} ${tokenInfo?.symbol || 'tokens'} on chain ${chainId} (tx: ${txHash})`);
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
    const questId = bytes32ToUuid(questIdBytes32);
    const quest = await prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) {
        console.warn(`[escrow:distributed] Unknown quest: ${questId}`);
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
    const questId = bytes32ToUuid(questIdBytes32);
    const quest = await prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) { console.warn(`[escrow:refunded] Unknown quest: ${questId}`); return; }
    if (quest.refundStatus === 'completed') return; // idempotent

    const decimals = resolveDecimals(chainId, quest.tokenAddress, quest.tokenDecimals);
    const humanAmount = fromSmallestUnit(amount, decimals);

    await prisma.quest.update({
        where: { id: questId },
        data: {
            refundStatus: 'completed',
            refundTxHash: txHash,
            refundedAt: new Date(),
            refundAmount: Math.round(humanAmount),
            status: quest.status !== 'cancelled' ? 'cancelled' : quest.status,
        },
    });

    console.log(`[escrow:refunded] Quest ${questId}: ${humanAmount} refunded to ${sponsor} (tx: ${txHash})`);
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
    const questId = bytes32ToUuid(questIdBytes32);
    const quest = await prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) { console.warn(`[escrow:emergency] Unknown quest: ${questId}`); return; }
    if (quest.refundStatus === 'completed') return; // idempotent

    const decimals = resolveDecimals(chainId, quest.tokenAddress, quest.tokenDecimals);
    const humanAmount = fromSmallestUnit(amount, decimals);

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
