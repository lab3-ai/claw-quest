import { SUPPORTED_CHAINS } from '@clawquest/shared';

// ─── Escrow Configuration ────────────────────────────────────────────────────
// All values loaded from environment variables.

export interface ChainRpcConfig {
    chainId: number;
    rpcUrl: string;
}

export const escrowConfig = {
    /** Escrow contract address (same on all chains via CREATE2) */
    contractAddress: (process.env.ESCROW_CONTRACT || '') as `0x${string}`,

    /** Operator private key (hot wallet for distribute/refund) */
    operatorKey: (process.env.OPERATOR_PRIVATE_KEY || '') as `0x${string}`,

    /** Default chain ID for the escrow (Base Sepolia for dev) */
    defaultChainId: parseInt(process.env.ESCROW_CHAIN_ID || '84532', 10),

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

/** Check if escrow is configured (has contract address + operator key) */
export function isEscrowConfigured(): boolean {
    return !!(escrowConfig.contractAddress && escrowConfig.operatorKey);
}

/** Get RPC URL for a given chain ID */
export function getRpcUrl(chainId: number): string {
    const url = escrowConfig.rpcUrls[chainId];
    if (!url) throw new Error(`No RPC URL configured for chainId ${chainId}`);
    return url;
}
