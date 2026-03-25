import crypto from 'node:crypto';
import { TtlCache } from '../../utils/ttl-cache';
import type { PortfolioToken } from './onchain.schemas';

// ─── Config ─────────────────────────────────────────────────────────────────

const OKX_API_KEY = process.env.OKX_API_KEY || '';
const OKX_API_SECRET = process.env.OKX_API_SECRET || '';
const OKX_API_PASSPHRASE = process.env.OKX_API_PASSPHRASE || '';
const OKX_BASE_URL = 'https://web3.okx.com';
const PORTFOLIO_CACHE_TTL_MS = 300_000; // 5 minutes

if (!OKX_API_KEY) {
    console.warn('⚠️  Missing OKX_API_KEY — OnchainOS features disabled');
}

// ─── Types (OKX API response shapes) ────────────────────────────────────────

interface OkxTokenBalance {
    symbol: string;
    tokenContractAddress: string;
    balance: string;
    tokenPrice: string;
    chainIndex: string;
    logoUrl?: string;
}

interface OkxTotalValueResponse {
    code: string;
    data: Array<{ totalValue: string }>;
}

interface OkxAllBalancesResponse {
    code: string;
    data: Array<{ tokenAssets: OkxTokenBalance[] }>;
}

// ─── Cache ──────────────────────────────────────────────────────────────────

interface PortfolioData {
    totalValueUsd: string;
    tokens: PortfolioToken[];
}

const portfolioCache = new TtlCache<PortfolioData>();

// ─── Chain ID → name mapping ────────────────────────────────────────────────

const CHAIN_NAMES: Record<string, string> = {
    '1': 'Ethereum',
    '56': 'BSC',
    '8453': 'Base',
    '42161': 'Arbitrum',
    '137': 'Polygon',
    '196': 'XLayer',
    '501': 'Solana',
    '10': 'Optimism',
    '43114': 'Avalanche',
};

// ─── HMAC-SHA256 signing ────────────────────────────────────────────────────

function signRequest(timestamp: string, method: string, path: string, body = ''): string {
    const prehash = timestamp + method.toUpperCase() + path + body;
    return crypto
        .createHmac('sha256', OKX_API_SECRET)
        .update(prehash)
        .digest('base64');
}

function buildHeaders(method: string, path: string, body = ''): Record<string, string> {
    const timestamp = new Date().toISOString();
    return {
        'OK-ACCESS-KEY': OKX_API_KEY,
        'OK-ACCESS-SIGN': signRequest(timestamp, method, path, body),
        'OK-ACCESS-TIMESTAMP': timestamp,
        'OK-ACCESS-PASSPHRASE': OKX_API_PASSPHRASE,
        'Content-Type': 'application/json',
    };
}

// ─── OKX API helpers ────────────────────────────────────────────────────────

async function okxGet<T>(path: string): Promise<T | null> {
    if (!OKX_API_KEY) return null;

    try {
        const res = await fetch(`${OKX_BASE_URL}${path}`, {
            method: 'GET',
            headers: buildHeaders('GET', path),
            signal: AbortSignal.timeout(5000),
        });

        if (!res.ok) {
            console.error(`OKX API error: ${res.status} ${res.statusText} for ${path}`);
            return null;
        }

        return await res.json() as T;
    } catch (err) {
        console.error(`OKX API request failed for ${path}:`, err);
        return null;
    }
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function isOnchainEnabled(): boolean {
    return !!OKX_API_KEY;
}

export async function getWalletPortfolio(
    address: string,
    chainIds: string,
): Promise<PortfolioData | null> {
    const cacheKey = `portfolio:${address}:${chainIds}`;
    const cached = portfolioCache.get(cacheKey);
    if (cached) return cached;

    // Fetch total value (by-address variant — no accountId needed)
    const totalPath = `/api/v5/wallet/asset/total-value-by-address?address=${address}&chains=${chainIds}`;
    const totalRes = await okxGet<OkxTotalValueResponse>(totalPath);

    // Fetch all token balances (by-address variant)
    const balancePath = `/api/v5/wallet/asset/all-token-balances-by-address?address=${address}&chains=${chainIds}`;
    const balanceRes = await okxGet<OkxAllBalancesResponse>(balancePath);

    if (!totalRes?.data?.[0] || !balanceRes?.data?.[0]) return null;

    const totalValueUsd = totalRes.data[0].totalValue || '0';

    // Sort by USD value descending, take top 5
    const tokenAssets = balanceRes.data[0].tokenAssets || [];
    const top5 = tokenAssets
        .filter(t => parseFloat(t.tokenPrice) > 0 && parseFloat(t.balance) > 0)
        .sort((a, b) => {
            const aVal = parseFloat(a.balance) * parseFloat(a.tokenPrice);
            const bVal = parseFloat(b.balance) * parseFloat(b.tokenPrice);
            return bVal - aVal;
        })
        .slice(0, 5)
        .map((t): PortfolioToken => ({
            symbol: t.symbol,
            chainName: CHAIN_NAMES[t.chainIndex] || `Chain ${t.chainIndex}`,
            balance: t.balance,
            valueUsd: (parseFloat(t.balance) * parseFloat(t.tokenPrice)).toFixed(2),
            logoUrl: t.logoUrl || null,
        }));

    const result: PortfolioData = { totalValueUsd, tokens: top5 };
    portfolioCache.set(cacheKey, result, PORTFOLIO_CACHE_TTL_MS);
    return result;
}
