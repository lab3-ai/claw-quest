import {
    createPublicClient,
    createWalletClient,
    http,
    type PublicClient,
    type WalletClient,
    type Chain,
    type Transport,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia, mainnet, bsc, arbitrum, polygon } from 'viem/chains';
import { escrowConfig, getRpcUrl } from './escrow.config';

// ─── Chain Mapping ───────────────────────────────────────────────────────────

const CHAIN_MAP: Record<number, Chain> = {
    8453: base,
    84532: baseSepolia,
    1: mainnet,
    56: bsc,
    42161: arbitrum,
    137: polygon,
};

function getViemChain(chainId: number): Chain {
    const chain = CHAIN_MAP[chainId];
    if (!chain) throw new Error(`Unsupported chainId: ${chainId}`);
    return chain;
}

// ─── Client Caches ───────────────────────────────────────────────────────────

const publicClients = new Map<number, PublicClient>();
const walletClients = new Map<number, WalletClient>();

// ─── Public Client (read-only) ──────────────────────────────────────────────

export function getPublicClient(chainId: number): PublicClient {
    let client = publicClients.get(chainId);
    if (!client) {
        const chain = getViemChain(chainId);
        const rpcUrl = getRpcUrl(chainId);
        client = createPublicClient({
            chain,
            transport: http(rpcUrl),
        }) as PublicClient;
        publicClients.set(chainId, client);
    }
    return client;
}

// ─── Wallet Client (operator — for distribute/refund) ────────────────────────

export function getOperatorWalletClient(chainId: number): WalletClient {
    let client = walletClients.get(chainId);
    if (!client) {
        if (!escrowConfig.operatorKey) {
            throw new Error('OPERATOR_PRIVATE_KEY not configured');
        }
        const chain = getViemChain(chainId);
        const rpcUrl = getRpcUrl(chainId);
        const account = privateKeyToAccount(escrowConfig.operatorKey);
        client = createWalletClient({
            account,
            chain,
            transport: http(rpcUrl),
        });
        walletClients.set(chainId, client);
    }
    return client;
}

/** Get operator wallet address */
export function getOperatorAddress(): `0x${string}` {
    if (!escrowConfig.operatorKey) {
        throw new Error('OPERATOR_PRIVATE_KEY not configured');
    }
    return privateKeyToAccount(escrowConfig.operatorKey).address;
}
