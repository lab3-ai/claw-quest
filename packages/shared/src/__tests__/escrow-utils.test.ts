import { describe, it, expect } from 'vitest';
import {
    uuidToBytes32,
    bytes32ToUuid,
    toSmallestUnit,
    fromSmallestUnit,
} from '../escrow-utils';

// ─── uuidToBytes32 ──────────────────────────────────────────────────────────

describe('uuidToBytes32', () => {
    it('converts a valid UUID to the correct bytes32', () => {
        const uuid = '007d6b1e-59a5-481d-91d9-55442ca40898';
        const expected = '0x00000000000000000000000000000000007d6b1e59a5481d91d955442ca40898';
        expect(uuidToBytes32(uuid)).toBe(expected);
    });

    it('produces a 66-char string (0x + 64 hex chars)', () => {
        const result = uuidToBytes32('550e8400-e29b-41d4-a716-446655440000');
        expect(result).toMatch(/^0x[0-9a-f]{64}$/);
        expect(result.length).toBe(66);
    });

    it('throws for an invalid UUID (wrong length)', () => {
        expect(() => uuidToBytes32('abc')).toThrow('Invalid UUID');
        expect(() => uuidToBytes32('007d6b1e-59a5-481d-91d9')).toThrow('Invalid UUID');
    });

    it('throws for empty string', () => {
        expect(() => uuidToBytes32('')).toThrow('Invalid UUID');
    });
});

// ─── bytes32ToUuid ──────────────────────────────────────────────────────────

describe('bytes32ToUuid', () => {
    it('converts a valid bytes32 back to UUID format', () => {
        const bytes32 = '0x00000000000000000000000000000000007d6b1e59a5481d91d955442ca40898';
        const expected = '007d6b1e-59a5-481d-91d9-55442ca40898';
        expect(bytes32ToUuid(bytes32)).toBe(expected);
    });

    it('throws for invalid hex length', () => {
        expect(() => bytes32ToUuid('0xabc')).toThrow('Invalid bytes32');
        expect(() => bytes32ToUuid('abc')).toThrow('Invalid bytes32');
    });

    it('roundtrips correctly: bytes32ToUuid(uuidToBytes32(uuid)) === uuid', () => {
        const uuids = [
            '007d6b1e-59a5-481d-91d9-55442ca40898',
            '550e8400-e29b-41d4-a716-446655440000',
            'ffffffff-ffff-ffff-ffff-ffffffffffff',
            '00000000-0000-0000-0000-000000000001',
        ];
        for (const uuid of uuids) {
            expect(bytes32ToUuid(uuidToBytes32(uuid))).toBe(uuid);
        }
    });
});

// ─── toSmallestUnit ─────────────────────────────────────────────────────────

describe('toSmallestUnit', () => {
    it('converts 500 USDC (6 decimals) to 500000000n', () => {
        expect(toSmallestUnit(500, 6)).toBe(500_000_000n);
    });

    it('converts 1 USDC to 1000000n', () => {
        expect(toSmallestUnit(1, 6)).toBe(1_000_000n);
    });

    it('converts 1.5 ETH (18 decimals) to correct bigint', () => {
        expect(toSmallestUnit(1.5, 18)).toBe(1_500_000_000_000_000_000n);
    });

    it('converts 0.001 USDC to 1000n', () => {
        expect(toSmallestUnit(0.001, 6)).toBe(1_000n);
    });

    it('handles integer amounts with no fractional part', () => {
        expect(toSmallestUnit(100, 18)).toBe(100_000_000_000_000_000_000n);
    });

    it('handles zero', () => {
        expect(toSmallestUnit(0, 6)).toBe(0n);
        expect(toSmallestUnit(0, 18)).toBe(0n);
    });
});

// ─── fromSmallestUnit ────────────────────────────────────────────────────────

describe('fromSmallestUnit', () => {
    it('converts 500000000n with 6 decimals to 500', () => {
        expect(fromSmallestUnit(500_000_000n, 6)).toBe(500);
    });

    it('converts 1000000n with 6 decimals to 1', () => {
        expect(fromSmallestUnit(1_000_000n, 6)).toBe(1);
    });

    it('converts 1.5 ETH smallest unit back to 1.5', () => {
        expect(fromSmallestUnit(1_500_000_000_000_000_000n, 18)).toBe(1.5);
    });

    it('accepts string input', () => {
        expect(fromSmallestUnit('500000000', 6)).toBe(500);
    });

    it('handles zero', () => {
        expect(fromSmallestUnit(0n, 6)).toBe(0);
        expect(fromSmallestUnit(0n, 18)).toBe(0);
    });

    it('roundtrips with toSmallestUnit for common values', () => {
        const cases: [number, number][] = [
            [500, 6],
            [1, 6],
            [0.5, 6],
            [100, 18],
            [1.5, 18],
        ];
        for (const [amount, decimals] of cases) {
            const smallest = toSmallestUnit(amount, decimals);
            const back = fromSmallestUnit(smallest, decimals);
            expect(back).toBeCloseTo(amount, 6);
        }
    });
});
