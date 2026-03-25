# Phase 1: Chain Registry + Config

## Overview
- **Priority:** P1 (blocker for all other phases)
- **Status:** Complete
- **Effort:** 1.5h

Add BSC Testnet (97) to chain registry, trim unused chains, replace `ENABLE_TESTNETS` with `ESCROW_NETWORK_MODE`, update env files.

## Key Insights

- `chains.ts` already has BNB (56) with correct USDC/USDT addresses (18 decimals)
- `ENABLE_TESTNETS` boolean is too ambiguous — `true` shows ALL chains including testnets, not "only testnets"
- `getActiveChains()` / `getActiveEscrowChainIds()` filter logic needs inversion for testnet mode
- Frontend uses `VITE_ENABLE_TESTNETS` — must align with new naming
- BSC Testnet USDT: `0x337610d27c682E347C9cD60BD4b3b107C9d34dDd` (official BSC testnet faucet)

## Related Code Files

### Modify
- `packages/shared/src/chains.ts` — add BSC Testnet, trim ESCROW_CHAIN_IDS, update filter functions
- `apps/api/src/modules/escrow/escrow.config.ts` — replace enableTestnets → networkMode, add RPC for 97
- `apps/api/.env.example` — update env var names
- `contracts/foundry.toml` — add BNB/BSC RPC endpoints + etherscan config

### No Changes Needed
- `escrow.poller.ts` — already filters by `isChainAllowed()`
- `escrow.routes.ts` — `/supported-chains` already dynamic
- `escrow.service.ts` — uses config helpers, no hardcoded chains

## Implementation Steps

### 1. Update `packages/shared/src/chains.ts`

**1.1** Add BSC Testnet to `SUPPORTED_CHAINS`:
```typescript
bscTestnet: {
    id: 97,
    name: 'BSC Testnet',
    shortName: 'bsc-testnet',
    nativeCurrency: { symbol: 'tBNB', name: 'Test BNB', decimals: 18 },
    rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
    explorerUrl: 'https://testnet.bscscan.com',
    isTestnet: true,
},
```

**1.2** Add token registry for chainId 97:
```typescript
97: {
    USDT: { address: '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd', decimals: 18, symbol: 'USDT', name: 'Tether USD' },
    NATIVE: { address: '0x0000000000000000000000000000000000000000', decimals: 18, symbol: 'tBNB', name: 'Test BNB' },
},
```

**1.3** Trim `ESCROW_CHAIN_IDS` — remove ETH (1), Arbitrum (42161), Polygon (137):
```typescript
export const ESCROW_CHAIN_IDS = [8453, 84532, 56, 97] as const;
```

**1.4** Add `NetworkMode` type and update filter functions:
```typescript
export type NetworkMode = 'testnet' | 'mainnet';

/** Get chains filtered by network mode */
export function getActiveChains(mode: NetworkMode): ChainConfig[] {
    return Object.values(SUPPORTED_CHAINS).filter(
        c => mode === 'testnet' ? c.isTestnet : !c.isTestnet
    );
}

/** Get active escrow chain IDs filtered by network mode */
export function getActiveEscrowChainIds(mode: NetworkMode): number[] {
    return ESCROW_CHAIN_IDS.filter(id => {
        const chain = getChainById(id);
        return chain && (mode === 'testnet' ? chain.isTestnet : !chain.isTestnet);
    });
}
```

**1.5** Keep `Ethereum`, `Arbitrum`, `Polygon` in `SUPPORTED_CHAINS` (they're referenced elsewhere) but remove them from `ESCROW_CHAIN_IDS` only.

**1.6** Rebuild shared package: `pnpm --filter @clawquest/shared build`

### 2. Update `apps/api/src/modules/escrow/escrow.config.ts`

**2.1** Replace `enableTestnets` with `networkMode`:
```typescript
networkMode: (process.env.ESCROW_NETWORK_MODE || 'testnet') as NetworkMode,
```

**2.2** Add RPC URL for BSC Testnet:
```typescript
97: process.env.RPC_URL_BSC_TESTNET || SUPPORTED_CHAINS.bscTestnet.rpcUrl,
```

**2.3** Update `isChainAllowed()`:
```typescript
export function isChainAllowed(chainId: number): boolean {
    const chain = Object.values(SUPPORTED_CHAINS).find(c => c.id === chainId);
    if (!chain) return false;
    const isTestnetMode = escrowConfig.networkMode === 'testnet';
    return isTestnetMode ? chain.isTestnet : !chain.isTestnet;
}
```

**2.4** Update all callers of `escrowConfig.enableTestnets` to use `escrowConfig.networkMode`

### 3. Update Environment Files

**3.1** `apps/api/.env.example` — add:
```bash
ESCROW_NETWORK_MODE=testnet          # testnet | mainnet
ESCROW_CONTRACT_97=                  # BSC Testnet proxy
RPC_URL_BSC_TESTNET=https://data-seed-prebsc-1-s1.binance.org:8545
```

**3.2** Remove `ENABLE_TESTNETS` from `.env.example`

**3.3** Update local `.env` with new var names

### 4. Update `contracts/foundry.toml`

**4.1** Add RPC endpoints:
```toml
[rpc_endpoints]
base_sepolia = "https://sepolia.base.org"
base = "https://mainnet.base.org"
bnb = "https://bsc-dataseed.binance.org"
bsc_testnet = "https://data-seed-prebsc-1-s1.binance.org:8545"
```

**4.2** Add etherscan verifier configs:
```toml
[etherscan]
base_sepolia = { key = "${BASESCAN_API_KEY}", url = "https://api-sepolia.basescan.org/api" }
base = { key = "${BASESCAN_API_KEY}", url = "https://api.basescan.org/api" }
bnb = { key = "${BSCSCAN_API_KEY}", url = "https://api.bscscan.com/api" }
bsc_testnet = { key = "${BSCSCAN_API_KEY}", url = "https://api-testnet.bscscan.com/api" }
```

## Todo List

- [x] Add BSC Testnet to SUPPORTED_CHAINS
- [x] Add token registry for chainId 97
- [x] Trim ESCROW_CHAIN_IDS to [8453, 84532, 56, 97]
- [x] Add NetworkMode type + update getActiveChains/getActiveEscrowChainIds
- [x] Rebuild shared package
- [x] Replace enableTestnets → networkMode in escrow.config.ts
- [x] Add RPC URL for chainId 97
- [x] Update isChainAllowed() for network mode
- [x] Update .env.example files
- [x] Update foundry.toml with BNB/BSC endpoints
- [x] Compile check: `pnpm build` from root

## Success Criteria

- `pnpm build` passes with no errors
- `getActiveEscrowChainIds('testnet')` returns [84532, 97]
- `getActiveEscrowChainIds('mainnet')` returns [8453, 56]
- `isChainAllowed(97)` returns true in testnet mode, false in mainnet mode
- No references to old `ENABLE_TESTNETS` / `enableTestnets` remain

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Breaking shared pkg consumers | Rebuild + test both API and Dashboard |
| Old env var still set in Railway | Harmless — new code ignores `ENABLE_TESTNETS` |
| BSC Testnet USDT address wrong | Verify on testnet.bscscan.com before allowlist |
