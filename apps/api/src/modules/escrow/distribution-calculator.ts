import { randomBytes } from 'crypto';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Participant {
    id: string;
    agentId: string;
    wallet: string;
}

export interface PayoutResult {
    participantId: string;
    agentId: string;
    wallet: string;
    amount: bigint;
}

// ─── FCFS ───────────────────────────────────────────────────────────────────

/** First N completed agents split reward equally. */
export function computeFcfs(
    totalAmount: bigint,
    totalSlots: number,
    participants: Participant[],
): PayoutResult[] {
    const winners = participants.slice(0, totalSlots);
    if (winners.length === 0) return [];
    return splitEqual(totalAmount, winners);
}

// ─── LEADERBOARD ────────────────────────────────────────────────────────────

/**
 * Distribute by custom tier percentages.
 * tiers = [40, 25, 15, 20] means rank1=40%, rank2=25%, rank3=15%, rest split 20%.
 * If tiers is null/empty, falls back to inverse-rank proportional.
 */
export function computeLeaderboard(
    totalAmount: bigint,
    participants: Participant[],
    tiers?: number[] | null,
): PayoutResult[] {
    if (participants.length === 0) return [];
    if (tiers && tiers.length > 0) {
        return computeLeaderboardTiers(totalAmount, participants, tiers);
    }
    return computeLeaderboardProportional(totalAmount, participants);
}

function computeLeaderboardTiers(
    totalAmount: bigint,
    participants: Participant[],
    tiers: number[],
): PayoutResult[] {
    const results: PayoutResult[] = [];
    let distributed = 0n;

    for (let i = 0; i < participants.length; i++) {
        let amount: bigint;

        if (i < tiers.length - 1) {
            // Named tier: exact percentage
            amount = (totalAmount * BigInt(tiers[i])) / 100n;
        } else if (tiers.length > 0 && participants.length > tiers.length - 1) {
            // "Rest" bucket: last tier % split among remaining participants
            const restPercent = tiers[tiers.length - 1];
            const restPool = (totalAmount * BigInt(restPercent)) / 100n;
            const restCount = participants.length - (tiers.length - 1);
            amount = restPool / BigInt(restCount);
        } else {
            amount = 0n;
        }

        distributed += amount;
        results.push({
            participantId: participants[i].id,
            agentId: participants[i].agentId,
            wallet: participants[i].wallet,
            amount,
        });
    }

    // Dust to first winner
    const dust = totalAmount - distributed;
    if (dust > 0n && results.length > 0) {
        results[0].amount += dust;
    }

    return results;
}

function computeLeaderboardProportional(
    totalAmount: bigint,
    participants: Participant[],
): PayoutResult[] {
    const n = participants.length;
    // rank 1 gets n shares, rank 2 gets n-1, ... rank n gets 1
    const totalShares = BigInt((n * (n + 1)) / 2);
    const results: PayoutResult[] = [];
    let distributed = 0n;

    for (let i = 0; i < n; i++) {
        const shares = BigInt(n - i);
        const amount = (totalAmount * shares) / totalShares;
        distributed += amount;
        results.push({
            participantId: participants[i].id,
            agentId: participants[i].agentId,
            wallet: participants[i].wallet,
            amount,
        });
    }

    // Dust to first winner
    const dust = totalAmount - distributed;
    if (dust > 0n && results.length > 0) {
        results[0].amount += dust;
    }

    return results;
}

// ─── LUCKY DRAW ─────────────────────────────────────────────────────────────

/** Crypto-safe random selection of N winners, equal split. */
export function computeLuckyDraw(
    totalAmount: bigint,
    totalSlots: number,
    participants: Participant[],
): PayoutResult[] {
    if (participants.length === 0) return [];
    const maxWinners = Math.min(totalSlots, participants.length);
    const winners = cryptoShuffle([...participants]).slice(0, maxWinners);
    return splitEqual(totalAmount, winners);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Equal split with dust to first recipient. */
function splitEqual(totalAmount: bigint, participants: Participant[]): PayoutResult[] {
    const perPerson = totalAmount / BigInt(participants.length);
    const results: PayoutResult[] = participants.map(p => ({
        participantId: p.id,
        agentId: p.agentId,
        wallet: p.wallet,
        amount: perPerson,
    }));

    // Dust to first winner
    const dust = totalAmount - perPerson * BigInt(participants.length);
    if (dust > 0n && results.length > 0) {
        results[0].amount += dust;
    }

    return results;
}

/** Fisher-Yates shuffle using crypto.randomBytes for unbiased randomness. */
function cryptoShuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = cryptoRandomInt(i + 1);
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/** Generate a crypto-safe random integer in [0, max). */
function cryptoRandomInt(max: number): number {
    const bytes = randomBytes(4);
    const val = bytes.readUInt32BE(0);
    return val % max;
}
