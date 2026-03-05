import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isRateLimited } from '../services/rate-limiter';

describe('isRateLimited', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    it('allows first message', () => {
        expect(isRateLimited(111)).toBe(false);
    });

    it('allows up to 10 messages in 1 minute', () => {
        for (let i = 0; i < 10; i++) {
            expect(isRateLimited(222)).toBe(false);
        }
    });

    it('blocks 11th message within 1 minute', () => {
        for (let i = 0; i < 10; i++) {
            isRateLimited(333);
        }
        expect(isRateLimited(333)).toBe(true);
    });

    it('resets after window expires', () => {
        for (let i = 0; i < 10; i++) {
            isRateLimited(444);
        }
        expect(isRateLimited(444)).toBe(true);

        // Advance past 1-minute window
        vi.advanceTimersByTime(61_000);

        expect(isRateLimited(444)).toBe(false);
    });

    it('tracks users independently', () => {
        for (let i = 0; i < 10; i++) {
            isRateLimited(555);
        }
        expect(isRateLimited(555)).toBe(true);
        expect(isRateLimited(666)).toBe(false); // different user
    });
});
