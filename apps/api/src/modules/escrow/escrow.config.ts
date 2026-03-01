import { SUPPORTED_CHAINS, ESCROW_CHAIN_IDS } from '@clawquest/shared';

// ─── Escrow Configuration ────────────────────────────────────────────────────
// All values loaded from environment variables.

export interface ChainRpcConfig {
    chainId: number;
    rpcUrl: string;
}

/** Build per-chain contract address map from env vars.
 *  Supports: ESCROW_CONTRACT_8453, ESCROW_CONTRACT_84532, etc.
 *  Falls back to legacy ESCROW_CONTRACT for backward compat. */
function buildContractAddresses(): Record<number, `0x${string}`> {
    const legacy = (process.env.ESCROW_CONTRACT || '') as `0x${string}`;
    const map: Record<number, `0x${string}`> = {};

    for (const chainId of ESCROW_CHAIN_IDS) {
        const envKey = `ESCROW_CONTRACT_${chainId}`;
        const addr = process.env[envKey] as `0x${string}` | undefined;
        if (addr) {
            map[chainId] = addr;
        } else if (legacy) {
            // Backward compat: use legacy single address for all chains
            map[chainId] = legacy;
        }
    }

    return map;
}

export const escrowConfig = {
    /** Per-chain escrow contract addresses (ESCROW_CONTRACT_<chainId>) */
    contractAddresses: buildContractAddresses(),

    /** @deprecated Use contractAddresses[chainId] instead. Kept for backward compat. */
    contractAddress: (process.env.ESCROW_CONTRACT || '') as `0x${string}`,

    /** Operator private key (hot wallet for distribute/refund) */
    operatorKey: (process.env.OPERATOR_PRIVATE_KEY || '') as `0x${string}`,

    /** Default chain ID for the escrow (Base Sepolia for dev) */
    defaultChainId: parseInt(process.env.ESCROW_CHAIN_ID || '84532', 10),

    /** Whether testnet chains are enabled */
    enableTestnets: process.env.ENABLE_TESTNETS !== 'false', // default true for dev

    /** Event polling interval in ms */
    pollingIntervalMs: parseInt(process.env.ESCROW_POLL_INTERVAL || '15000', 10),

    /** RPC URLs per chain */
    rpcUrls: {
        8453: process.env.RPC_URL_BASE || SUPPORTED_CHAINS.base.rpcUrl,
        84532: process.env.RPC_URL_BASE_SEPOLIA || SUPPORTED_CHAINS.baseSepolia.rpcUrl,
        1: process.env.RPC_URL_ETH || SUPPORTED_CHAINS.ethereum.rpcUrl,
        56: process.env.RPC_URL_BNB || SUPPORTED_CHAINS.bnb.rpcUrl,
        42161: process.env.RPC_URL_ARB || SUPPORTED_CHAINS.arbitrum.rpcUrl,
        137: process.env.RPC_URL_POLYGON || SUPPORTED_CHAINS.polygon.rpcUrl,
    } as Record<number, string>,
} as const;

/** Check if escrow is configured (has at least one contract address + operator key) */
export function isEscrowConfigured(): boolean {
    const hasContract = Object.keys(escrowConfig.contractAddresses).length > 0
        || !!escrowConfig.contractAddress;
    return !!(hasContract && escrowConfig.operatorKey);
}

/** Get contract address for a specific chain */
export function getContractAddress(chainId: number): `0x${string}` {
    const addr = escrowConfig.contractAddresses[chainId] || escrowConfig.contractAddress;
    if (!addr) throw new Error(`No escrow contract configured for chainId ${chainId}`);
    return addr;
}

/** Get RPC URL for a given chain ID */
export function getRpcUrl(chainId: number): string {
    const url = escrowConfig.rpcUrls[chainId];
    if (!url) throw new Error(`No RPC URL configured for chainId ${chainId}`);
    return url;
}

/** Check if a chainId is allowed in the current environment */
export function isChainAllowed(chainId: number): boolean {
    const chain = Object.values(SUPPORTED_CHAINS).find(c => c.id === chainId);
    if (!chain) return false;
    if (chain.isTestnet && !escrowConfig.enableTestnets) return false;
    return true;
}
