# Phase 3: Frontend Updates

## Overview
- **Priority:** P2
- **Status:** Complete
- **Effort:** 1.5h
- **Blocked by:** Phase 1 (shared pkg rebuild)
- **Can run parallel to:** Phase 2

Update Wagmi/RainbowKit config to include BSC Testnet. Align frontend env var with backend `ESCROW_NETWORK_MODE`. Chain selector already driven by API — minimal UI changes needed.

## Key Insights

- `apps/dashboard/src/lib/wagmi.ts` already imports `bsc` (56) — just missing `bscTestnet` (97)
- Chain list passed to `getDefaultConfig()` needs BSC Testnet added
- `VITE_ENABLE_TESTNETS` needs renaming to `VITE_ESCROW_NETWORK_MODE` for consistency
- Fund page fetches deposit params from API which returns `chainId` — chain switching works via `useSwitchChain()`
- RainbowKit auto-shows chains passed to config — no custom chain selector UI needed

## Related Code Files

### Modify
- `apps/dashboard/src/lib/wagmi.ts` — add bscTestnet chain, update env var
- `apps/dashboard/.env.example` — update env var name
- `apps/dashboard/.env` (local) — set `VITE_ESCROW_NETWORK_MODE=testnet`

### No Changes Needed
- Fund page components — already dynamic (driven by API deposit params)
- Chain selector — RainbowKit handles this from wagmi config
- `fund-approve-deposit.tsx` — uses `chainId` from deposit params, not hardcoded

## Implementation Steps

### 1. Update `apps/dashboard/src/lib/wagmi.ts`

**1.1** Import `bscTestnet` from wagmi/chains:
```typescript
import { base, baseSepolia, mainnet, bsc, bscTestnet, arbitrum, polygon } from 'wagmi/chains';
```

**1.2** Replace `VITE_ENABLE_TESTNETS` with `VITE_ESCROW_NETWORK_MODE`:
```typescript
const networkMode = import.meta.env.VITE_ESCROW_NETWORK_MODE || 'testnet';

const testnetChains = [baseSepolia, bscTestnet] as const;
const mainnetChains = [base, bsc] as const;

const chains = networkMode === 'testnet' ? testnetChains : mainnetChains;
```

**1.3** Pass filtered chains to `getDefaultConfig()`:
```typescript
export const config = getDefaultConfig({
    appName: 'ClawQuest',
    projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
    chains: chains,
    // ... rest unchanged
});
```

**1.4** Remove references to Ethereum/Arbitrum/Polygon chains (trimmed from escrow scope)

### 2. Update Environment Files

**2.1** `apps/dashboard/.env.example`:
```bash
VITE_ESCROW_NETWORK_MODE=testnet  # testnet | mainnet
# Remove: VITE_ENABLE_TESTNETS
```

**2.2** Local `.env`: `VITE_ESCROW_NETWORK_MODE=testnet`
**2.3** Vercel production env: `VITE_ESCROW_NETWORK_MODE=mainnet`

### 3. Verify Chain Switching UX

**3.1** Test in local dev:
- Connect MetaMask → should show Base Sepolia + BSC Testnet only
- Navigate to fund page → should prompt to switch to correct chain
- Wrong chain → "Switch Network" button works

**3.2** Test MetaMask auto-add for BSC Testnet:
- If user doesn't have BSC Testnet in MetaMask, RainbowKit should prompt to add it
- Verify chain params (chainId, RPC URL, explorer URL) are correct

### 4. Build Verification

```bash
pnpm --filter @clawquest/shared build
pnpm --filter dashboard build
```

Ensure no TypeScript errors from chain type changes.

## Todo List

- [x] Import bscTestnet in wagmi.ts
- [x] Replace VITE_ENABLE_TESTNETS → VITE_ESCROW_NETWORK_MODE
- [x] Filter chains by network mode (testnet=[baseSepolia, bscTestnet], mainnet=[base, bsc])
- [x] Remove unused chain imports (mainnet/arbitrum/polygon)
- [x] Update .env.example
- [x] Build passes: `pnpm --filter dashboard build`
- [ ] Test chain switching in browser (MetaMask) — deferred to Phase 4 after contract deployment

## Success Criteria

- Local dev: RainbowKit shows only Base Sepolia + BSC Testnet
- Prod build: RainbowKit shows only Base + BNB Smart Chain
- Fund page chain switching works for all active chains
- No TypeScript/build errors
- MetaMask auto-add network works for BSC Testnet

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| RainbowKit doesn't support BSC Testnet | wagmi/chains includes bscTestnet — should work OOTB |
| WalletConnect breaks with new chains | WalletConnect v2 supports all EVM chains |
| Chain type mismatch after trimming | Build check catches TS errors |
