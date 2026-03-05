import type { PrismaClient } from '@prisma/client';
import { getRpcUrl } from './escrow.config';

// ─── Types ───────────────────────────────────────────────────────────────────

interface RpcEntry {
    url: string;
    priority: number;
    provider: string | null;
    // In-memory health tracking only — not persisted to DB
    errorCount: number;
    cooldownUntil: number; // ms timestamp, 0 = no cooldown
}

// ─── Constants ───────────────────────────────────────────────────────────────

const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes after ERROR_THRESHOLD failures
const ERROR_THRESHOLD = 3;

// ─── Service ─────────────────────────────────────────────────────────────────

class RpcManagerService {
    /** chainId → sorted RPC entries (by priority ASC) */
    private rpcsByChain: Map<number, RpcEntry[]> = new Map();
    private loaded = false;

    /** Load active RPCs from DB. Call once at server startup before escrow poller starts. */
    async load(prisma: PrismaClient): Promise<void> {
        const rows = await prisma.chainRpc.findMany({
            where: { isActive: true },
            orderBy: [{ chainId: 'asc' }, { priority: 'asc' }],
        });

        this.rpcsByChain.clear();

        for (const row of rows) {
            const entries = this.rpcsByChain.get(row.chainId) ?? [];
            entries.push({
                url: row.url,
                priority: row.priority,
                provider: row.provider,
                errorCount: 0,
                cooldownUntil: 0,
            });
            this.rpcsByChain.set(row.chainId, entries);
        }

        this.loaded = true;
        console.log(`[rpc-manager] Loaded ${rows.length} RPCs across ${this.rpcsByChain.size} chains`);
    }

    /**
     * Get RPC URLs for a chain, sorted by priority (healthy first).
     * Falls back to escrow.config if chain not found in DB.
     */
    getRpcUrls(chainId: number): string[] {
        if (!this.loaded || !this.rpcsByChain.has(chainId)) {
            // Fallback: use env/shared-constants config
            try {
                return [getRpcUrl(chainId)];
            } catch {
                return [];
            }
        }

        const now = Date.now();
        const entries = this.rpcsByChain.get(chainId)!;

        // Healthy entries first (sorted by priority), then cooled-down as last resort
        const healthy = entries.filter(e => e.cooldownUntil < now);
        const onCooldown = entries.filter(e => e.cooldownUntil >= now);

        return [...healthy, ...onCooldown].map(e => e.url);
    }

    /**
     * Report an error for a specific RPC URL.
     * After ERROR_THRESHOLD errors, the URL is put on a 5-minute cooldown.
     */
    markError(chainId: number, url: string): void {
        const entry = this.findEntry(chainId, url);
        if (!entry) return;

        entry.errorCount++;
        if (entry.errorCount >= ERROR_THRESHOLD) {
            entry.cooldownUntil = Date.now() + COOLDOWN_MS;
            entry.errorCount = 0;
            console.warn(`[rpc-manager] RPC ${url} (chain ${chainId}) rate-limited — cooldown for 5 min`);
        }
    }

    /** Reset error state on successful use */
    markSuccess(chainId: number, url: string): void {
        const entry = this.findEntry(chainId, url);
        if (entry && (entry.errorCount > 0 || entry.cooldownUntil > 0)) {
            entry.errorCount = 0;
            entry.cooldownUntil = 0;
        }
    }

    private findEntry(chainId: number, url: string): RpcEntry | undefined {
        return this.rpcsByChain.get(chainId)?.find(e => e.url === url);
    }
}

export const rpcManager = new RpcManagerService();
