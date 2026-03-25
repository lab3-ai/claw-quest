import { SUPPORTED_CHAINS, ESCROW_CHAIN_IDS, type NetworkMode, getChainById } from '@clawquest/shared';

// ─── Escrow Configuration ────────────────────────────────────────────────────

export interface ChainRpcConfig {
    chainId: number;
    rpcUrl: string;
}

/** Parse ESCROW_CHAIN_IDS env var (comma-separated) into number[].
 *  Falls back to shared ESCROW_CHAIN_IDS constant filtered by networkMode. */
function parseActiveChainIds(networkMode: NetworkMode): number[] {
    const envVal = process.env.ESCROW_CHAIN_IDS;
    if (envVal) {
        const ids = envVal.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
        // Validate against SUPPORTED_CHAINS
        const valid = ids.filter(id => {
            const chain = getChainById(id);
            if (!chain) {
                console.warn(`[escrow:config] ESCROW_CHAIN_IDS contains unknown chain ${id} — skipping`);
                return false;
            }
            return true;
        });
        if (valid.length === 0) {
            console.warn('[escrow:config] ESCROW_CHAIN_IDS has no valid chains, falling back to shared defaults');
        } else {
            return valid;
        }
    }

    // Fallback: shared constant filtered by networkMode
    return ESCROW_CHAIN_IDS.filter(id => {
        const chain = getChainById(id);
        return chain && (networkMode === 'testnet' ? chain.isTestnet : !chain.isTestnet);
    });
}

/** Build per-chain contract address map.
 *  Priority: ESCROW_CONTRACT_<chainId> → ESCROW_CONTRACT (shared CREATE2 address) */
function buildContractAddresses(activeChainIds: number[]): Record<number, `0x${string}`> {
    const shared = (process.env.ESCROW_CONTRACT || '') as `0x${string}`;
    const map: Record<number, `0x${string}`> = {};

    for (const chainId of activeChainIds) {
        const perChain = process.env[`ESCROW_CONTRACT_${chainId}`] as `0x${string}` | undefined;
        if (perChain) {
            map[chainId] = perChain;
        } else if (shared) {
            map[chainId] = shared;
        }
    }

    return map;
}

/** Resolve RPC URL for a chain.
 *  Priority: RPC_URL_<chainId> → legacy env names → SUPPORTED_CHAINS[].rpcUrl */
function resolveRpcUrl(chainId: number): string | undefined {
    // 1. Direct chain ID env var (new canonical format)
    const directEnv = process.env[`RPC_URL_${chainId}`];
    if (directEnv) return directEnv;

    // 2. Legacy named env vars (backward compat)
    const legacyMap: Record<number, string> = {
        8453: 'RPC_URL_BASE',
        84532: 'RPC_URL_BASE_SEPOLIA',
        56: 'RPC_URL_BNB',
        97: 'RPC_URL_BSC_TESTNET',
        196: 'RPC_URL_XLAYER',
        1952: 'RPC_URL_XLAYER_TESTNET',
    };
    const legacyKey = legacyMap[chainId];
    if (legacyKey && process.env[legacyKey]) return process.env[legacyKey];

    // 3. SUPPORTED_CHAINS public RPC
    const chain = getChainById(chainId);
    return chain?.rpcUrl;
}

/** Build RPC URL map for all active chains */
function buildRpcUrls(activeChainIds: number[]): Record<number, string> {
    const map: Record<number, string> = {};
    for (const chainId of activeChainIds) {
        const url = resolveRpcUrl(chainId);
        if (url) {
            map[chainId] = url;
        } else {
            console.warn(`[escrow:config] No RPC URL for chain ${chainId}`);
        }
    }
    return map;
}

const networkMode = (process.env.ESCROW_NETWORK_MODE || 'testnet') as NetworkMode;
const activeChainIds = parseActiveChainIds(networkMode);

export const escrowConfig = {
    /** Active chain IDs for this environment (source of truth) */
    activeChainIds,

    /** Per-chain escrow contract addresses */
    contractAddresses: buildContractAddresses(activeChainIds),

    /** @deprecated Use contractAddresses[chainId] instead. Kept for backward compat. */
    contractAddress: (process.env.ESCROW_CONTRACT || '') as `0x${string}`,

    /** Operator private key (hot wallet for distribute/refund) */
    operatorKey: (process.env.OPERATOR_PRIVATE_KEY || '') as `0x${string}`,

    /** Default chain ID for the escrow (first active chain, or Base Sepolia) */
    defaultChainId: parseInt(process.env.ESCROW_CHAIN_ID || String(activeChainIds[0] || 84532), 10),

    /** Network mode: 'testnet' shows only testnets, 'mainnet' shows only mainnets */
    networkMode,

    /** Event polling interval in ms */
    pollingIntervalMs: parseInt(process.env.ESCROW_POLL_INTERVAL || '15000', 10),

    /** Number of blocks behind chain tip to process (re-org safety buffer) */
    confirmationBlocks: parseInt(process.env.ESCROW_CONFIRMATION_BLOCKS || '5', 10),

    /** RPC URLs per chain */
    rpcUrls: buildRpcUrls(activeChainIds),
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
    const url = escrowConfig.rpcUrls[chainId] || resolveRpcUrl(chainId);
    if (!url) throw new Error(`No RPC URL configured for chainId ${chainId}`);
    return url;
}

/** Check if a chainId is allowed in the current environment */
export function isChainAllowed(chainId: number): boolean {
    return escrowConfig.activeChainIds.includes(chainId);
}

// Startup log: show active chains
console.log(
    `[escrow:config] Active chains: [${escrowConfig.activeChainIds.join(', ')}] ` +
    `(mode: ${escrowConfig.networkMode})`
);

// Warn if defaultChainId not in active list
if (!isChainAllowed(escrowConfig.defaultChainId)) {
    console.warn(
        `[escrow] ESCROW_CHAIN_ID=${escrowConfig.defaultChainId} is not in active chains ` +
        `[${escrowConfig.activeChainIds.join(', ')}]. Update ESCROW_CHAIN_ID.`
    );
}
