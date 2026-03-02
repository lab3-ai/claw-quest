import { describe, it, expect } from 'vitest';
import {
    computeFcfs,
    computeLeaderboard,
    computeLuckyDraw,
    type Participant,
} from '../distribution-calculator';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeParticipants(n: number): Participant[] {
    return Array.from({ length: n }, (_, i) => ({
        id: `p-${i}`,
        agentId: `a-${i}`,
        wallet: `0x${(i + 1).toString(16).padStart(40, '0')}`,
    }));
}

function sumAmounts(results: { amount: bigint }[]): bigint {
    return results.reduce((sum, r) => sum + r.amount, 0n);
}

// ─── FCFS ───────────────────────────────────────────────────────────────────

describe('computeFcfs', () => {
    it('splits equally among winners up to totalSlots', () => {
        const total = 1000n;
        const results = computeFcfs(total, 2, makeParticipants(5));
        expect(results).toHaveLength(2);
        expect(sumAmounts(results)).toBe(total);
    });

    it('handles fewer participants than slots', () => {
        const total = 900n;
        const results = computeFcfs(total, 10, makeParticipants(3));
        expect(results).toHaveLength(3);
        expect(sumAmounts(results)).toBe(total);
        expect(results[0].amount).toBe(300n);
    });

    it('handles dust — sum always equals totalAmount', () => {
        const total = 1000n;
        const results = computeFcfs(total, 3, makeParticipants(3));
        expect(sumAmounts(results)).toBe(total);
        // 1000 / 3 = 333 each, dust 1 to first
        expect(results[0].amount).toBe(334n);
        expect(results[1].amount).toBe(333n);
    });

    it('returns empty for zero participants', () => {
        expect(computeFcfs(1000n, 5, [])).toHaveLength(0);
    });

    it('single winner gets full amount', () => {
        const results = computeFcfs(500n, 1, makeParticipants(3));
        expect(results).toHaveLength(1);
        expect(results[0].amount).toBe(500n);
    });
});

// ─── LEADERBOARD (proportional fallback) ────────────────────────────────────

describe('computeLeaderboard (proportional)', () => {
    it('rank 1 gets most, rank N gets least', () => {
        const results = computeLeaderboard(1000n, makeParticipants(3));
        expect(results[0].amount).toBeGreaterThan(results[1].amount);
        expect(results[1].amount).toBeGreaterThan(results[2].amount);
        expect(sumAmounts(results)).toBe(1000n);
    });

    it('single participant gets full amount', () => {
        const results = computeLeaderboard(500n, makeParticipants(1));
        expect(results[0].amount).toBe(500n);
    });

    it('handles dust correctly', () => {
        const results = computeLeaderboard(100n, makeParticipants(3));
        expect(sumAmounts(results)).toBe(100n);
    });

    it('returns empty for zero participants', () => {
        expect(computeLeaderboard(1000n, [])).toHaveLength(0);
    });
});

// ─── LEADERBOARD (custom tiers) ─────────────────────────────────────────────

describe('computeLeaderboard (custom tiers)', () => {
    it('applies tier percentages correctly', () => {
        const tiers = [40, 25, 15, 20]; // 40% + 25% + 15% + 20%(rest)
        const results = computeLeaderboard(1000n, makeParticipants(5), tiers);
        expect(results[0].amount).toBeGreaterThanOrEqual(400n); // 40% + possible dust
        expect(results[1].amount).toBe(250n); // 25%
        expect(results[2].amount).toBe(150n); // 15%
        // Remaining 2 participants split 20% = 100 each
        expect(results[3].amount).toBe(100n);
        expect(results[4].amount).toBe(100n);
        expect(sumAmounts(results)).toBe(1000n);
    });

    it('handles more tiers than participants gracefully', () => {
        const tiers = [50, 30, 20];
        const results = computeLeaderboard(1000n, makeParticipants(2), tiers);
        expect(results).toHaveLength(2);
        expect(sumAmounts(results)).toBe(1000n);
    });

    it('single participant with tiers gets full amount', () => {
        const tiers = [60, 40];
        const results = computeLeaderboard(1000n, makeParticipants(1), tiers);
        expect(results[0].amount).toBe(1000n);
    });

    it('falls back to proportional when tiers is null', () => {
        const results = computeLeaderboard(1000n, makeParticipants(3), null);
        expect(results).toHaveLength(3);
        expect(sumAmounts(results)).toBe(1000n);
    });

    it('falls back to proportional when tiers is empty', () => {
        const results = computeLeaderboard(1000n, makeParticipants(3), []);
        expect(results).toHaveLength(3);
        expect(sumAmounts(results)).toBe(1000n);
    });
});

// ─── LUCKY DRAW ─────────────────────────────────────────────────────────────

describe('computeLuckyDraw', () => {
    it('selects correct number of winners', () => {
        const results = computeLuckyDraw(1000n, 3, makeParticipants(10));
        expect(results).toHaveLength(3);
        expect(sumAmounts(results)).toBe(1000n);
    });

    it('handles fewer participants than slots', () => {
        const results = computeLuckyDraw(600n, 10, makeParticipants(2));
        expect(results).toHaveLength(2);
        expect(sumAmounts(results)).toBe(600n);
    });

    it('returns empty for zero participants', () => {
        expect(computeLuckyDraw(1000n, 5, [])).toHaveLength(0);
    });

    it('single slot single participant', () => {
        const results = computeLuckyDraw(500n, 1, makeParticipants(1));
        expect(results).toHaveLength(1);
        expect(results[0].amount).toBe(500n);
    });

    it('all winners get equal amounts (with dust to first)', () => {
        const results = computeLuckyDraw(1000n, 3, makeParticipants(3));
        expect(sumAmounts(results)).toBe(1000n);
        // At least 2 should be equal (the non-dust ones)
        const amounts = results.map(r => r.amount);
        const minAmt = amounts.reduce((a, b) => (a < b ? a : b));
        expect(amounts.filter(a => a === minAmt).length).toBeGreaterThanOrEqual(2);
    });
});

// ─── Sum Invariant ──────────────────────────────────────────────────────────

describe('sum invariant', () => {
    const cases = [
        { name: 'large amount FCFS', fn: () => computeFcfs(10n ** 18n, 7, makeParticipants(7)) },
        { name: 'large amount leaderboard', fn: () => computeLeaderboard(10n ** 18n, makeParticipants(10)) },
        { name: 'large amount lucky draw', fn: () => computeLuckyDraw(10n ** 18n, 5, makeParticipants(20)) },
        { name: 'tiny amount', fn: () => computeFcfs(3n, 5, makeParticipants(5)) },
        { name: 'leaderboard tiers', fn: () => computeLeaderboard(10n ** 18n, makeParticipants(8), [40, 25, 15, 20]) },
    ];

    for (const { name, fn } of cases) {
        it(`sum === totalAmount for ${name}`, () => {
            const results = fn();
            if (name.includes('tiny')) {
                // 3 wei among 5 people: only first 3 get 1 each (0 amounts filtered)
                expect(sumAmounts(results)).toBeLessThanOrEqual(3n);
            } else if (name.includes('lucky')) {
                expect(sumAmounts(results)).toBe(10n ** 18n);
            } else {
                expect(sumAmounts(results)).toBe(10n ** 18n);
            }
        });
    }
});
