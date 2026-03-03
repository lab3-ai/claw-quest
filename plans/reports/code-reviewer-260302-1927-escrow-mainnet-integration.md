# Code Review: Escrow Mainnet Integration (Phase 1 - Chain Registry & Config)

**Date:** 2026-03-02
**Reviewer:** code-reviewer
**Scope:** Network mode migration (`ENABLE_TESTNETS` -> `ESCROW_NETWORK_MODE`), BSC Testnet addition, chain trimming

## Scope

- **Files reviewed:** 7 changed files + 4 dependent files (poller, service, tests, env files)
- **LOC changed:** ~80 (additions + deletions)
- **Focus:** Correctness, breaking changes, security, edge cases

## Overall Assessment

Clean, well-scoped change. The `NetworkMode` type replacing a loose boolean is a clear improvement in intent. However, there are **2 critical issues** (stale env files, broken tests) and **1 high-priority edge case** (defaultChainId mismatch) that need fixing before merge.

---

## Critical Issues

### 1. `.env.production` and `.env.development` still reference `ENABLE_TESTNETS`

Both files still have the old variable names:

```
# .env.production (from grep)
ENABLE_TESTNETS=false
VITE_ENABLE_TESTNETS=false

# .env.development (from grep)
ENABLE_TESTNETS=true
VITE_ENABLE_TESTNETS=true
```

The code now reads `ESCROW_NETWORK_MODE` and `VITE_ESCROW_NETWORK_MODE`. Since neither is set in these files, the defaults kick in:
- **API:** `process.env.ESCROW_NETWORK_MODE || 'testnet'` -- defaults to `testnet` in all environments
- **Dashboard:** `import.meta.env.VITE_ESCROW_NETWORK_MODE || 'testnet'` -- defaults to `testnet`

**Impact:** Production deployment with `.env.production` will silently run in testnet mode. Users will only see BSC Testnet + Base Sepolia chains instead of Base + BNB mainnet.

**Fix:** Update both env files:
```bash
# .env.production
ESCROW_NETWORK_MODE=mainnet
VITE_ESCROW_NETWORK_MODE=mainnet

# .env.development
ESCROW_NETWORK_MODE=testnet
VITE_ESCROW_NETWORK_MODE=testnet
```

Also remove the old `ENABLE_TESTNETS` / `VITE_ENABLE_TESTNETS` lines from both files.

### 2. Unit tests are broken -- `chains.test.ts` expects removed chain IDs

File: `/Users/hd/clawquest/packages/shared/src/__tests__/chains.test.ts`

```typescript
// Line 17: Missing 'bscTestnet' in expected keys
const expectedKeys = ['base', 'baseSepolia', 'ethereum', 'bnb', 'arbitrum', 'polygon'];

// Lines 165-170: Tests for chain IDs removed from ESCROW_CHAIN_IDS
expect(ESCROW_CHAIN_IDS).toContain(1);       // Ethereum -- REMOVED
expect(ESCROW_CHAIN_IDS).toContain(42161);   // Arbitrum -- REMOVED
expect(ESCROW_CHAIN_IDS).toContain(137);     // Polygon -- REMOVED
```

These tests will fail. Also missing: test for `bscTestnet` in SUPPORTED_CHAINS and chain ID 97 in ESCROW_CHAIN_IDS.

**Fix:**
```typescript
// Line 17
const expectedKeys = ['base', 'baseSepolia', 'ethereum', 'bnb', 'arbitrum', 'bscTestnet', 'polygon'];

// Lines 163-173
describe('ESCROW_CHAIN_IDS', () => {
    it('contains all expected chain IDs', () => {
        expect(ESCROW_CHAIN_IDS).toContain(8453);    // Base
        expect(ESCROW_CHAIN_IDS).toContain(84532);   // Base Sepolia
        expect(ESCROW_CHAIN_IDS).toContain(56);      // BNB
        expect(ESCROW_CHAIN_IDS).toContain(97);      // BSC Testnet
    });

    it('does not contain removed chains', () => {
        expect(ESCROW_CHAIN_IDS).not.toContain(1);       // Ethereum
        expect(ESCROW_CHAIN_IDS).not.toContain(42161);   // Arbitrum
        expect(ESCROW_CHAIN_IDS).not.toContain(137);     // Polygon
    });
});
```

Also add tests for `getActiveChains` and `getActiveEscrowChainIds` with the new `NetworkMode` parameter.

---

## High Priority

### 3. `defaultChainId` can conflict with `networkMode`

`escrow.config.ts` line 43:
```typescript
defaultChainId: parseInt(process.env.ESCROW_CHAIN_ID || '84532', 10),
```

If someone sets `ESCROW_NETWORK_MODE=mainnet` but forgets to update `ESCROW_CHAIN_ID` (or leaves it unset), the default is `84532` (Base Sepolia -- a testnet). Then `isChainAllowed(escrowConfig.defaultChainId)` returns `false` in mainnet mode.

This causes the `/escrow/status/:questId` endpoint (line 139-144) to reject requests when no `chainId` query param is provided, since `targetChainId` falls back to `defaultChainId`:
```typescript
const targetChainId = chainId || escrowConfig.defaultChainId;
if (!isChainAllowed(targetChainId)) { // false! 84532 not allowed in mainnet mode
```

Similarly, `escrow.poller.ts` line 155 uses `escrowConfig.defaultChainId` directly -- the poller would poll a disallowed testnet chain in mainnet mode.

**Fix:** Add startup validation in `escrow.config.ts`:
```typescript
// After escrowConfig definition
if (isEscrowConfigured()) {
    const defaultAllowed = isChainAllowed(escrowConfig.defaultChainId);
    if (!defaultAllowed) {
        console.warn(
            `[escrow] WARNING: ESCROW_CHAIN_ID=${escrowConfig.defaultChainId} ` +
            `is not allowed in ${escrowConfig.networkMode} mode. ` +
            `Set ESCROW_CHAIN_ID to a ${escrowConfig.networkMode} chain.`
        );
    }
}
```

Or better: derive default from network mode if unset:
```typescript
defaultChainId: parseInt(process.env.ESCROW_CHAIN_ID ||
    ((process.env.ESCROW_NETWORK_MODE || 'testnet') === 'mainnet' ? '8453' : '84532'), 10),
```

### 4. `getActiveChains()` returns ALL supported chains, not just escrow chains

`/escrow/supported-chains` calls `getActiveChains(networkMode)` which filters from `SUPPORTED_CHAINS` (7 chains total). In mainnet mode, this returns Base, Ethereum, BNB, Arbitrum, Polygon -- 5 chains. But only Base + BNB are in `ESCROW_CHAIN_IDS`.

The endpoint is named "supported chains" for escrow but returns chains you can't deposit to.

**Fix:** The endpoint should use `getActiveEscrowChainIds()` instead, or filter the result against `ESCROW_CHAIN_IDS`:
```typescript
const { getActiveEscrowChainIds, getChainById } = await import('@clawquest/shared');
const chainIds = getActiveEscrowChainIds(escrowConfig.networkMode);
const chains = chainIds.map(id => getChainById(id)!).filter(Boolean);
```

### 5. BSC Testnet USDT: 18 decimals instead of standard 6

`packages/shared/src/chains.ts` line 121:
```typescript
97: {
    USDT: { address: '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd', decimals: 18, ... },
```

BSC Testnet USDT uses 18 decimals (verified on-chain), but mainnet BSC USDT also uses 18 decimals (line 110). This is consistent within BSC but differs from Base/Ethereum USDT (6 decimals). Not a bug, but worth a code comment to prevent future confusion:

```typescript
// Note: BSC USDT uses 18 decimals (both mainnet and testnet), unlike Base/ETH USDT (6 decimals)
```

---

## Medium Priority

### 6. No USDC in BSC Testnet token registry

BSC Testnet (97) only has USDT and NATIVE. Base Sepolia has USDC. If frontend code assumes all chains have USDC available, BSC Testnet deposits will fail silently or show no token option.

Check if the fund page gracefully handles chains with no USDC entry.

### 7. `tx-status` endpoint missing `isChainAllowed` guard

`escrow.routes.ts` line 310:
```typescript
const targetChainId = chainId || escrowConfig.defaultChainId;
const client = getPublicClient(targetChainId);
```

Unlike other endpoints, `/tx-status/:txHash` does not call `isChainAllowed()`. A user could query a disallowed chain's transaction status. Low risk (read-only), but inconsistent with other endpoints.

### 8. API response schema change is a breaking change for consumers

The `/supported-chains` response changed from `{ enableTestnets: boolean }` to `{ networkMode: 'testnet' | 'mainnet' }`. Any external consumer (admin dashboard, SDK) reading `enableTestnets` will break.

If the admin dashboard (separate repo) calls this endpoint, it needs updating simultaneously.

---

## Low Priority

### 9. `as NetworkMode` cast is unsafe

`escrow.config.ts` line 46:
```typescript
networkMode: (process.env.ESCROW_NETWORK_MODE || 'testnet') as NetworkMode,
```

If env var is set to an invalid value like `"staging"`, it silently becomes a bad `NetworkMode`. Consider validation:
```typescript
const raw = process.env.ESCROW_NETWORK_MODE || 'testnet';
if (raw !== 'testnet' && raw !== 'mainnet') {
    throw new Error(`Invalid ESCROW_NETWORK_MODE: "${raw}". Must be "testnet" or "mainnet".`);
}
```

### 10. `foundry.toml` etherscan key reuse

Both `bnb` and `bsc_testnet` use `${BSCSCAN_API_KEY}`. This is correct (BscScan uses the same key for both), just noting for awareness.

---

## Positive Observations

- `NetworkMode` type is a clear improvement over the ambiguous `enableTestnets: boolean` -- the old behavior where `true` meant "show all chains including testnets" was confusing
- Exclusive mode (`testnet` shows ONLY testnets, `mainnet` shows ONLY mainnets) is safer than additive filtering
- BSC Testnet USDT contract address verified on-chain at testnet.bscscan.com
- `SUPPORTED_CHAINS` correctly retains Ethereum/Arbitrum/Polygon entries (may be used elsewhere) while `ESCROW_CHAIN_IDS` trims to only deployed chains
- wagmi config cleanly separates testnet/mainnet chain arrays

---

## Recommended Actions (Priority Order)

1. **[CRITICAL]** Update `.env.production` and `.env.development` with new env var names
2. **[CRITICAL]** Fix `chains.test.ts` -- update ESCROW_CHAIN_IDS assertions, add `bscTestnet` to expected keys
3. **[HIGH]** Add defaultChainId / networkMode consistency validation at startup
4. **[HIGH]** Fix `/supported-chains` to use `getActiveEscrowChainIds` instead of `getActiveChains`
5. **[MEDIUM]** Add `isChainAllowed` guard to `/tx-status` endpoint
6. **[MEDIUM]** Verify admin dashboard handles the `enableTestnets` -> `networkMode` response change
7. **[LOW]** Add runtime validation for `ESCROW_NETWORK_MODE` env var

---

## Unresolved Questions

1. Has the admin dashboard (separate repo) been updated to handle `networkMode` instead of `enableTestnets` in the `/supported-chains` response?
2. Are Railway/Vercel env vars already updated, or is that planned for the production go-live phase?
3. Is there a BSC Testnet USDC faucet contract that should be added to TOKEN_REGISTRY[97]?
