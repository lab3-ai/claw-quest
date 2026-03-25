import { PrismaClient } from '@prisma/client';

// ─── Dual-DB Admin Prisma Client ────────────────────────────────────────────
// Admin routes can query BOTH mainnet and testnet databases.
// User-facing routes always use the primary DATABASE_URL.

let testnetPrisma: PrismaClient | null = null;

/** Get the testnet Prisma client (lazy-initialized) */
function getTestnetPrisma(): PrismaClient | null {
    if (!process.env.DATABASE_URL_TESTNET) return null;

    if (!testnetPrisma) {
        testnetPrisma = new PrismaClient({
            datasources: {
                db: { url: process.env.DATABASE_URL_TESTNET },
            },
        });
    }
    return testnetPrisma;
}

export type AdminEnv = 'mainnet' | 'testnet';

/**
 * Get the Prisma client for admin operations.
 * - 'mainnet' → primary DATABASE_URL (default)
 * - 'testnet' → DATABASE_URL_TESTNET (if configured)
 */
export function getAdminPrisma(primaryPrisma: PrismaClient, env: AdminEnv = 'mainnet'): PrismaClient {
    if (env === 'testnet') {
        const client = getTestnetPrisma();
        if (!client) {
            throw new Error('Testnet database not configured (missing DATABASE_URL_TESTNET)');
        }
        return client;
    }
    return primaryPrisma;
}

/** Check if testnet DB is configured */
export function isTestnetDbConfigured(): boolean {
    return !!process.env.DATABASE_URL_TESTNET;
}

/** Disconnect testnet client on shutdown */
export async function disconnectTestnetPrisma(): Promise<void> {
    if (testnetPrisma) {
        await testnetPrisma.$disconnect();
        testnetPrisma = null;
    }
}
