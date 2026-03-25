interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}

/** Simple in-memory TTL cache. No external dependencies. */
export class TtlCache<T> {
    private store = new Map<string, CacheEntry<T>>();
    private interval: NodeJS.Timeout;

    constructor(cleanupIntervalMs = 5 * 60_000) {
        this.interval = setInterval(() => this.cleanup(), cleanupIntervalMs);
        // unref so this timer doesn't block process exit or slow down tests
        this.interval.unref();
    }

    get(key: string): T | undefined {
        const entry = this.store.get(key);
        if (!entry) return undefined;
        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return undefined;
        }
        return entry.data;
    }

    set(key: string, value: T, ttlMs: number): void {
        this.store.set(key, { data: value, expiresAt: Date.now() + ttlMs });
    }

    delete(key: string): void {
        this.store.delete(key);
    }

    /** Delete all keys that start with the given prefix. */
    deleteByPrefix(prefix: string): void {
        for (const key of this.store.keys()) {
            if (key.startsWith(prefix)) this.store.delete(key);
        }
    }

    /** Clear the cleanup interval. Call in tests and graceful shutdown. */
    destroy(): void {
        clearInterval(this.interval);
    }

    private cleanup(): void {
        const now = Date.now();
        for (const [key, entry] of this.store.entries()) {
            if (now > entry.expiresAt) this.store.delete(key);
        }
    }
}
