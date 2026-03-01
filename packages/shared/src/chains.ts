// ─── Supported EVM Chains ────────────────────────────────────────────────────

export interface ChainConfig {
    id: number;
    name: string;
    shortName: string;
    nativeCurrency: { symbol: string; name: string; decimals: number };
    rpcUrl: string;
    explorerUrl: string;
    isTestnet: boolean;
}

export const SUPPORTED_CHAINS: Record<string, ChainConfig> = {
    base: {
        id: 8453,
        name: 'Base',
        shortName: 'base',
        nativeCurrency: { symbol: 'ETH', name: 'Ether', decimals: 18 },
        rpcUrl: 'https://mainnet.base.org',
        explorerUrl: 'https://basescan.org',
        isTestnet: false,
    },
    baseSepolia: {
        id: 84532,
        name: 'Base Sepolia',
        shortName: 'base-sepolia',
        nativeCurrency: { symbol: 'ETH', name: 'Ether', decimals: 18 },
        rpcUrl: 'https://sepolia.base.org',
        explorerUrl: 'https://sepolia.basescan.org',
        isTestnet: true,
    },
    ethereum: {
        id: 1,
        name: 'Ethereum',
        shortName: 'eth',
        nativeCurrency: { symbol: 'ETH', name: 'Ether', decimals: 18 },
        rpcUrl: 'https://eth.llamarpc.com',
        explorerUrl: 'https://etherscan.io',
        isTestnet: false,
    },
    bnb: {
        id: 56,
        name: 'BNB Smart Chain',
        shortName: 'bnb',
        nativeCurrency: { symbol: 'BNB', name: 'BNB', decimals: 18 },
        rpcUrl: 'https://bsc-dataseed.binance.org',
        explorerUrl: 'https://bscscan.com',
        isTestnet: false,
    },
    arbitrum: {
        id: 42161,
        name: 'Arbitrum One',
        shortName: 'arb',
        nativeCurrency: { symbol: 'ETH', name: 'Ether', decimals: 18 },
        rpcUrl: 'https://arb1.arbitrum.io/rpc',
        explorerUrl: 'https://arbiscan.io',
        isTestnet: false,
    },
    polygon: {
        id: 137,
        name: 'Polygon',
        shortName: 'matic',
        nativeCurrency: { symbol: 'POL', name: 'POL', decimals: 18 },
        rpcUrl: 'https://polygon-rpc.com',
        explorerUrl: 'https://polygonscan.com',
        isTestnet: false,
    },
} as const;

// ─── Token Registry (per chain) ─────────────────────────────────────────────

export interface TokenInfo {
    address: string;
    decimals: number;
    symbol: string;
    name: string;
}

/** Token registry keyed by chainId → symbol → TokenInfo */
export const TOKEN_REGISTRY: Record<number, Record<string, TokenInfo>> = {
    // Base
    8453: {
        USDC: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6, symbol: 'USDC', name: 'USD Coin' },
        USDT: { address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2', decimals: 18, symbol: 'USDT', name: 'Tether USD' },
        NATIVE: { address: '0x0000000000000000000000000000000000000000', decimals: 18, symbol: 'ETH', name: 'Ether' },
    },
    // Base Sepolia (testnet)
    84532: {
        USDC: { address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', decimals: 6, symbol: 'USDC', name: 'USD Coin' },
        NATIVE: { address: '0x0000000000000000000000000000000000000000', decimals: 18, symbol: 'ETH', name: 'Ether' },
    },
    // Ethereum
    1: {
        USDC: { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6, symbol: 'USDC', name: 'USD Coin' },
        USDT: { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6, symbol: 'USDT', name: 'Tether USD' },
        NATIVE: { address: '0x0000000000000000000000000000000000000000', decimals: 18, symbol: 'ETH', name: 'Ether' },
    },
    // BNB Smart Chain
    56: {
        USDC: { address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', decimals: 18, symbol: 'USDC', name: 'USD Coin' },
        USDT: { address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18, symbol: 'USDT', name: 'Tether USD' },
        NATIVE: { address: '0x0000000000000000000000000000000000000000', decimals: 18, symbol: 'BNB', name: 'BNB' },
    },
    // Arbitrum One
    42161: {
        USDC: { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6, symbol: 'USDC', name: 'USD Coin' },
        USDT: { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6, symbol: 'USDT', name: 'Tether USD' },
        NATIVE: { address: '0x0000000000000000000000000000000000000000', decimals: 18, symbol: 'ETH', name: 'Ether' },
    },
    // Polygon
    137: {
        USDC: { address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', decimals: 6, symbol: 'USDC', name: 'USD Coin' },
        USDT: { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6, symbol: 'USDT', name: 'Tether USD' },
        NATIVE: { address: '0x0000000000000000000000000000000000000000', decimals: 18, symbol: 'POL', name: 'POL' },
    },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const NATIVE_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000';

export function getChainById(chainId: number): ChainConfig | undefined {
    return Object.values(SUPPORTED_CHAINS).find(c => c.id === chainId);
}

export function getTokenInfo(chainId: number, symbol: string): TokenInfo | undefined {
    return TOKEN_REGISTRY[chainId]?.[symbol];
}

export function getTokenByAddress(chainId: number, address: string): TokenInfo | undefined {
    const tokens = TOKEN_REGISTRY[chainId];
    if (!tokens) return undefined;
    return Object.values(tokens).find(t => t.address.toLowerCase() === address.toLowerCase());
}

export function isNativeToken(address: string): boolean {
    return address === NATIVE_TOKEN_ADDRESS;
}

/** Chain IDs supported for escrow deposits */
export const ESCROW_CHAIN_IDS = [8453, 84532, 1, 56, 42161, 137] as const;
export type EscrowChainId = typeof ESCROW_CHAIN_IDS[number];

/** Get chains filtered by testnet flag */
export function getActiveChains(enableTestnets: boolean): ChainConfig[] {
    return Object.values(SUPPORTED_CHAINS).filter(
        c => enableTestnets || !c.isTestnet
    );
}

/** Get active escrow chain IDs filtered by testnet flag */
export function getActiveEscrowChainIds(enableTestnets: boolean): number[] {
    return ESCROW_CHAIN_IDS.filter(id => {
        const chain = getChainById(id);
        return chain && (enableTestnets || !chain.isTestnet);
    });
}
