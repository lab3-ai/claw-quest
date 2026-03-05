// In-memory sliding window rate limiter
// Same pattern as registerSessions — single-process Map, no Redis needed

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 10;

// Map<telegramId, timestamp[]>
const windows = new Map<number, number[]>();

export function isRateLimited(telegramId: number): boolean {
    const now = Date.now();
    const timestamps = windows.get(telegramId) ?? [];

    // Remove expired entries
    const valid = timestamps.filter((t) => now - t < WINDOW_MS);

    if (valid.length >= MAX_REQUESTS) {
        windows.set(telegramId, valid);
        return true;
    }

    valid.push(now);
    windows.set(telegramId, valid);
    return false;
}

// Periodic cleanup to prevent memory leaks (every 5 min)
setInterval(() => {
    const now = Date.now();
    for (const [id, timestamps] of windows) {
        const valid = timestamps.filter((t) => now - t < WINDOW_MS);
        if (valid.length === 0) windows.delete(id);
        else windows.set(id, valid);
    }
}, 5 * 60_000);
