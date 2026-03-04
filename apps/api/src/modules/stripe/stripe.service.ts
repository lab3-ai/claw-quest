import { PrismaClient } from '@prisma/client';
import { stripe, stripeConfig } from './stripe.config';
import {
    computeFcfs,
    computeLeaderboard,
    computeLuckyDraw,
    type Participant,
} from '../escrow/distribution-calculator';

// ─── FLOW 1: FUND QUEST (Sponsor pays via Stripe Checkout) ─────────────────

/**
 * Create a Stripe Checkout Session for quest funding.
 * Sponsor clicks "Pay with Card" → redirect to Stripe hosted page → pays → webhook confirms.
 */
export async function createFundCheckout(
    prisma: PrismaClient,
    questId: string,
    successUrl: string,
    cancelUrl: string,
): Promise<{ checkoutUrl: string; sessionId: string }> {
    const quest = await prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) throw new Error('Quest not found');
    if (quest.fundingStatus === 'confirmed') throw new Error('Quest already funded');

    // Stripe uses smallest currency unit (cents for USD)
    const amountCents = quest.rewardAmount * 100;

    const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [{
            price_data: {
                currency: stripeConfig.currency,
                unit_amount: amountCents,
                product_data: {
                    name: `Fund Quest: ${quest.title}`,
                    description: `Reward pool for "${quest.title}" (${quest.type}, ${quest.totalSlots} slots)`,
                    metadata: { questId },
                },
            },
            quantity: 1,
        }],
        metadata: {
            questId,
            type: 'quest_funding',
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
    });

    // Persist session → quest link
    await prisma.quest.update({
        where: { id: questId },
        data: {
            stripeSessionId: session.id,
            fundingMethod: 'stripe',
            fundingStatus: 'pending',
        },
    });

    return { checkoutUrl: session.url!, sessionId: session.id };
}

// ─── FLOW 2: DISTRIBUTE REWARDS (Platform → Winners via Stripe Transfer) ───

/**
 * Transfer funds from platform balance to winners' Stripe connected accounts.
 * Reuses the same distribution calculator as crypto (FCFS/Leaderboard/LuckyDraw).
 *
 * Prerequisites:
 *   - Quest fundingMethod = 'stripe' and fundingStatus = 'confirmed'
 *   - Winners must have stripeConnectedAccountId set and onboarded
 */
export async function distributeFiat(
    prisma: PrismaClient,
    questId: string,
): Promise<{ transfers: Array<{ participationId: string; transferId: string; amount: number }> }> {
    const quest = await prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) throw new Error('Quest not found');
    if (quest.fundingMethod !== 'stripe') throw new Error('Quest is not fiat-funded');
    if (quest.fundingStatus !== 'confirmed') throw new Error('Quest is not funded');

    // Fetch eligible participations with user's Stripe account
    const participations = await prisma.questParticipation.findMany({
        where: {
            questId,
            status: { in: ['completed', 'submitted', 'verified'] },
            payoutStatus: { not: 'paid' },
        },
        include: {
            user: { select: { id: true, stripeConnectedAccountId: true, stripeConnectedOnboarded: true } },
        },
        orderBy: [{ completedAt: 'asc' }, { joinedAt: 'asc' }],
    });

    if (participations.length === 0) throw new Error('No eligible participants');

    // Only those with fully onboarded Stripe accounts
    const eligible = participations.filter(
        p => p.user?.stripeConnectedAccountId && p.user?.stripeConnectedOnboarded,
    );
    if (eligible.length === 0) {
        throw new Error('No winners have onboarded Stripe accounts for fiat payout');
    }

    // Check for already-paid
    const alreadyPaid = eligible.some(p => p.payoutStatus === 'paid');
    if (alreadyPaid) throw new Error('Quest already has paid distributions');

    // Build participants for calculator (reuse wallet field for Stripe account ID)
    const participants: Participant[] = eligible.map(p => ({
        id: p.id,
        agentId: p.agentId || '',
        wallet: p.user.stripeConnectedAccountId!,
    }));

    // Calculate distribution in cents
    const totalCents = BigInt(quest.rewardAmount * 100);

    let results;
    switch (quest.type) {
        case 'FCFS':
            results = computeFcfs(totalCents, quest.totalSlots, participants);
            break;
        case 'LEADERBOARD':
            results = computeLeaderboard(totalCents, participants, quest.rewardTiers as number[] | null);
            break;
        case 'LUCKY_DRAW':
            results = computeLuckyDraw(totalCents, quest.totalSlots, participants);
            break;
        default:
            throw new Error(`Unknown quest type: ${quest.type}`);
    }

    // Execute Stripe transfers
    const transfers: Array<{ participationId: string; transferId: string; amount: number }> = [];

    for (const result of results) {
        const amountCents = Number(result.amount);
        if (amountCents <= 0) continue;

        const participation = eligible.find(p => p.id === result.participantId);
        if (!participation) continue;

        const transfer = await stripe.transfers.create({
            amount: amountCents,
            currency: stripeConfig.currency,
            destination: participation.user.stripeConnectedAccountId!,
            source_transaction: quest.stripePaymentId || undefined,
            metadata: {
                questId,
                participationId: participation.id,
                type: 'quest_reward',
            },
        });

        await prisma.questParticipation.update({
            where: { id: participation.id },
            data: {
                payoutAmount: amountCents / 100,
                payoutStatus: 'paid',
                payoutTxHash: transfer.id, // reuse field for Stripe transfer ID
            },
        });

        transfers.push({
            participationId: participation.id,
            transferId: transfer.id,
            amount: amountCents / 100,
        });
    }

    // Mark quest completed
    await prisma.quest.update({
        where: { id: questId },
        data: { status: 'completed' },
    });

    return { transfers };
}

// ─── FLOW 3: REFUND (Platform → Sponsor via Stripe Refund) ─────────────────

/**
 * Refund the original Stripe payment back to sponsor's card.
 * Supports partial refund (if some winners already paid out).
 */
export async function refundFiat(
    prisma: PrismaClient,
    questId: string,
    reason?: string,
): Promise<{ refundId: string; amount: number }> {
    const quest = await prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) throw new Error('Quest not found');
    if (quest.fundingMethod !== 'stripe') throw new Error('Quest is not fiat-funded');
    if (!quest.stripePaymentId) throw new Error('No Stripe payment found to refund');

    // Calculate how much has already been distributed
    const paidOut = await prisma.questParticipation.aggregate({
        where: { questId, payoutStatus: 'paid' },
        _sum: { payoutAmount: true },
    });

    const totalPaidDollars = paidOut._sum.payoutAmount || 0;
    const refundDollars = quest.rewardAmount - totalPaidDollars;

    if (refundDollars <= 0) {
        throw new Error('All funds have been distributed — nothing to refund');
    }

    const refundCents = Math.round(refundDollars * 100);

    const refund = await stripe.refunds.create({
        payment_intent: quest.stripePaymentId,
        amount: refundCents,
        reason: 'requested_by_customer',
        metadata: {
            questId,
            type: 'quest_refund',
            internalReason: reason || 'Quest cancelled',
        },
    });

    await prisma.quest.update({
        where: { id: questId },
        data: {
            refundStatus: 'completed',
            refundAmount: refundDollars,
            refundedAt: new Date(),
            refundTxHash: refund.id, // reuse field for Stripe refund ID
            status: 'cancelled',
        },
    });

    return { refundId: refund.id, amount: refundDollars };
}
