import { describe, it, expect } from 'vitest';
import {
    SUPPORTED_CHAINS,
    TOKEN_REGISTRY,
    NATIVE_TOKEN_ADDRESS,
    getChainById,
    getTokenInfo,
    getTokenByAddress,
    isNativeToken,
    ESCROW_CHAIN_IDS,
} from '../chains';

// ─── SUPPORTED_CHAINS ────────────────────────────────────────────────────────

describe('SUPPORTED_CHAINS', () => {
    it('contains all expected chains', () => {
        const expectedKeys = ['base', 'baseSepolia', 'ethereum', 'bnb', 'bscTestnet', 'arbitrum', 'polygon', 'xlayer', 'xlayerTestnet'];
        for (const key of expectedKeys) {
            expect(SUPPORTED_CHAINS).toHaveProperty(key);
        }
    });

    it('each chain has required fields', () => {
        for (const [key, chain] of Object.entries(SUPPORTED_CHAINS)) {
            expect(chain.id).toBeTypeOf('number');
            expect(chain.name).toBeTypeOf('string');
            expect(chain.shortName).toBeTypeOf('string');
            expect(chain.rpcUrl).toBeTypeOf('string');
            expect(chain.explorerUrl).toBeTypeOf('string');
            expect(chain.nativeCurrency).toBeDefined();
            expect(chain.nativeCurrency.symbol).toBeTypeOf('string');
            expect(chain.nativeCurrency.decimals).toBe(18);
        }
    });

    it('has unique chain IDs', () => {
        const ids = Object.values(SUPPORTED_CHAINS).map(c => c.id);
        expect(new Set(ids).size).toBe(ids.length);
    });
});

// ─── TOKEN_REGISTRY ──────────────────────────────────────────────────────────

describe('TOKEN_REGISTRY', () => {
    it('every chain has a NATIVE token entry', () => {
        for (const [chainIdStr, tokens] of Object.entries(TOKEN_REGISTRY)) {
            expect(tokens).toHaveProperty('NATIVE');
            expect(tokens.NATIVE.address).toBe(NATIVE_TOKEN_ADDRESS);
        }
    });

    it('Base Sepolia has USDC with correct address', () => {
        const usdc = TOKEN_REGISTRY[84532]?.USDC;
        expect(usdc).toBeDefined();
        expect(usdc.address).toBe('0xAA87A3f8E6017F1f02af0f306B765FCfBeCac3E4');
        expect(usdc.decimals).toBe(6);
        expect(usdc.symbol).toBe('USDC');
    });

    it('every token has required fields', () => {
        for (const [chainId, tokens] of Object.entries(TOKEN_REGISTRY)) {
            for (const [symbol, info] of Object.entries(tokens)) {
                expect(info.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
                expect(info.decimals).toBeTypeOf('number');
                expect(info.symbol).toBeTypeOf('string');
                expect(info.name).toBeTypeOf('string');
            }
        }
    });
});

// ─── getChainById ────────────────────────────────────────────────────────────

describe('getChainById', () => {
    it('returns Base config for chainId 8453', () => {
        const chain = getChainById(8453);
        expect(chain).toBeDefined();
        expect(chain!.name).toBe('Base');
        expect(chain!.shortName).toBe('base');
    });

    it('returns Base Sepolia for chainId 84532', () => {
        const chain = getChainById(84532);
        expect(chain).toBeDefined();
        expect(chain!.name).toBe('Base Sepolia');
        expect(chain!.isTestnet).toBe(true);
    });

    it('returns undefined for unknown chainId', () => {
        expect(getChainById(99999)).toBeUndefined();
        expect(getChainById(0)).toBeUndefined();
    });
});

// ─── getTokenInfo ────────────────────────────────────────────────────────────

describe('getTokenInfo', () => {
    it('returns USDC info for Base Sepolia', () => {
        const token = getTokenInfo(84532, 'USDC');
        expect(token).toBeDefined();
        expect(token!.symbol).toBe('USDC');
        expect(token!.decimals).toBe(6);
    });

    it('returns undefined for unsupported token', () => {
        expect(getTokenInfo(84532, 'DOGECOIN')).toBeUndefined();
    });

    it('returns undefined for unsupported chain', () => {
        expect(getTokenInfo(99999, 'USDC')).toBeUndefined();
    });

    it('returns NATIVE token info', () => {
        const native = getTokenInfo(8453, 'NATIVE');
        expect(native).toBeDefined();
        expect(native!.symbol).toBe('ETH');
        expect(native!.decimals).toBe(18);
    });
});

// ─── getTokenByAddress ───────────────────────────────────────────────────────

describe('getTokenByAddress', () => {
    it('finds USDC on Base by address', () => {
        const token = getTokenByAddress(8453, '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913');
        expect(token).toBeDefined();
        expect(token!.symbol).toBe('USDC');
    });

    it('is case-insensitive', () => {
        const token = getTokenByAddress(8453, '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913');
        expect(token).toBeDefined();
        expect(token!.symbol).toBe('USDC');
    });

    it('returns undefined for unknown address', () => {
        expect(getTokenByAddress(8453, '0x0000000000000000000000000000000000000001')).toBeUndefined();
    });

    it('returns undefined for unknown chain', () => {
        expect(getTokenByAddress(99999, '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913')).toBeUndefined();
    });
});

// ─── isNativeToken ───────────────────────────────────────────────────────────

describe('isNativeToken', () => {
    it('returns true for zero address', () => {
        expect(isNativeToken('0x0000000000000000000000000000000000000000')).toBe(true);
    });

    it('returns true for NATIVE_TOKEN_ADDRESS', () => {
        expect(isNativeToken(NATIVE_TOKEN_ADDRESS)).toBe(true);
    });

    it('returns false for non-zero address', () => {
        expect(isNativeToken('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913')).toBe(false);
    });
});

// ─── ESCROW_CHAIN_IDS ────────────────────────────────────────────────────────

describe('ESCROW_CHAIN_IDS', () => {
    it('contains all expected chain IDs', () => {
        expect(ESCROW_CHAIN_IDS).toContain(8453);    // Base
        expect(ESCROW_CHAIN_IDS).toContain(84532);   // Base Sepolia
        expect(ESCROW_CHAIN_IDS).toContain(56);      // BNB
        expect(ESCROW_CHAIN_IDS).toContain(97);      // BSC Testnet
        expect(ESCROW_CHAIN_IDS).toContain(196);     // X Layer
        expect(ESCROW_CHAIN_IDS).toContain(1952);    // X Layer Testnet
    });

    it('does not contain removed chains', () => {
        expect(ESCROW_CHAIN_IDS).not.toContain(1);       // Ethereum removed
        expect(ESCROW_CHAIN_IDS).not.toContain(42161);   // Arbitrum removed
        expect(ESCROW_CHAIN_IDS).not.toContain(137);     // Polygon removed
    });
});
