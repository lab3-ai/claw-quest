import {
    createPublicClient,
    createWalletClient,
    http,
    fallback,
    defineChain,
    type PublicClient,
    type WalletClient,
    type Chain,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia, mainnet, bsc, bscTestnet, arbitrum, polygon } from 'viem/chains';
import { getChainById } from '@clawquest/shared';
import { escrowConfig, getRpcUrl } from './escrow.config';
import { rpcManager } from './rpc-manager.service';

// ─── Chain Mapping ───────────────────────────────────────────────────────────

const CHAIN_MAP: Record<number, Chain> = {
    8453: base,
    84532: baseSepolia,
    1: mainnet,
    56: bsc,
    97: bscTestnet,
    42161: arbitrum,
    137: polygon,
};

/** Get viem Chain object. Falls back to defineChain() from SUPPORTED_CHAINS metadata. */
function getViemChain(chainId: number): Chain {
    const known = CHAIN_MAP[chainId];
    if (known) return known;

    // Dynamic fallback: build Chain from shared SUPPORTED_CHAINS
    const meta = getChainById(chainId);
    if (meta) {
        return defineChain({
            id: meta.id,
            name: meta.name,
            nativeCurrency: meta.nativeCurrency,
            rpcUrls: {
                default: { http: [meta.rpcUrl] },
            },
            blockExplorers: {
                default: { name: meta.name, url: meta.explorerUrl },
            },
            testnet: meta.isTestnet,
        });
    }

    throw new Error(`Unsupported chainId: ${chainId} (not in viem or SUPPORTED_CHAINS)`);
}

// ─── Transport Builder ───────────────────────────────────────────────────────

/** Build a viem transport for a chain using DB-sourced RPCs with fallback. */
function buildTransport(chainId: number) {
    const urls = rpcManager.getRpcUrls(chainId);
    if (urls.length === 0) {
        // Last resort: fall back to env/shared config
        return http(getRpcUrl(chainId));
    }
    if (urls.length === 1) {
        return http(urls[0]);
    }
    // Multiple RPCs: use viem fallback transport — tries each URL in order on failure
    return fallback(urls.map(url => http(url)));
}

// ─── Client Caches ───────────────────────────────────────────────────────────

const publicClients = new Map<number, PublicClient>();
const walletClients = new Map<number, WalletClient>();

/** Clear cached clients (call after rpcManager reloads at runtime). */
export function invalidateClientCache(): void {
    publicClients.clear();
    walletClients.clear();
}

// ─── Public Client (read-only) ──────────────────────────────────────────────

export function getPublicClient(chainId: number): PublicClient {
    let client = publicClients.get(chainId);
    if (!client) {
        const chain = getViemChain(chainId);
        client = createPublicClient({
            chain,
            transport: buildTransport(chainId),
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
        const account = privateKeyToAccount(escrowConfig.operatorKey);
        client = createWalletClient({
            account,
            chain,
            transport: buildTransport(chainId),
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
