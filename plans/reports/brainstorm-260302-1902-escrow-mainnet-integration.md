# Brainstorm: Escrow Mainnet Integration (BNB + Base)

**Date:** 2026-03-02
**Status:** Agreed
**Trigger:** Production shows "Escrow not configured" — need mainnet deployment

---

## Problem Statement

Escrow contract exists and works on Base Sepolia testnet, but production has no mainnet contracts deployed. Need to:
1. Deploy to **Base mainnet** (8453) + **BNB mainnet** (56)
2. Add **BSC Testnet** (97) for local BNB-specific testing
3. Introduce `ESCROW_NETWORK_MODE` env var to cleanly separate testnet/mainnet
4. Local dev = testnet chains only, Production = mainnet chains only

---

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Toggle mechanism | Deploy-time env var | Simpler, no DB change, matches Railway workflow |
| Testnet data | Separate environments | local DB = testnet data, prod DB = mainnet data, never mix |
| Environment count | 2 (local + prod) | No staging. Local=testnet, Prod=mainnet |
| BNB tokens | USDC + USDT + BNB native | Max flexibility on BSC |
| Operator key | Single key, all chains | Same `OPERATOR_PRIVATE_KEY`, funded on each chain |
| Contract deploy | Keep Sepolia + deploy fresh mainnet proxies | Base Sepolia stays, new proxies on 8453 + 56 + 97 |
| Admin wallet | EOA first → multisig later | Ship fast, secure later |
| BNB testnet | Yes, BSC Testnet (97) | Catches BNB-specific issues (18-decimal USDT, etc.) |

---

## Architecture Changes

### 1. New Env Var: `ESCROW_NETWORK_MODE`

Replace `ENABLE_TESTNETS` with clearer semantics:

```
ESCROW_NETWORK_MODE=testnet   # local dev — only Base Sepolia + BSC Testnet
ESCROW_NETWORK_MODE=mainnet   # production — only Base + BNB mainnet
```

**Backward compat:** If missing, default to `testnet` (safe fallback).

**Impact on `getActiveChains()`:**
- Current: shows ALL chains when testnets=true, only mainnet when false
- New: `testnet` mode → ONLY testnet chains, `mainnet` mode → ONLY mainnet chains
- Clean separation, no mixing

### 2. Add BSC Testnet to Chain Registry

```typescript
// packages/shared/src/chains.ts
bscTestnet: {
    id: 97,
    name: 'BSC Testnet',
    shortName: 'bsc-testnet',
    nativeCurrency: { symbol: 'tBNB', name: 'Test BNB', decimals: 18 },
    rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
    explorerUrl: 'https://testnet.bscscan.com',
    isTestnet: true,
}
```

Token registry for BSC Testnet (97):
- USDT: BSC testnet USDT faucet token
- tBNB: native testnet BNB
- USDC: if available on BSC testnet

### 3. Contract Deployments Needed

| Chain | ID | Contract | Status |
|-------|-----|----------|--------|
| Base Sepolia | 84532 | `0xe1d2...` | LIVE (keep) |
| BSC Testnet | 97 | TBD | NEW DEPLOY |
| Base Mainnet | 8453 | TBD | NEW DEPLOY |
| BNB Mainnet | 56 | TBD | NEW DEPLOY |

Each deployment:
- Fresh UUPS proxy + implementation
- Admin = EOA wallet (upgrade to Safe later)
- Operator = same hot wallet key
- Token allowlist: chain-appropriate USDC/USDT addresses

### 4. Environment Variables (per env)

**Local (.env):**
```bash
ESCROW_NETWORK_MODE=testnet
ESCROW_CHAIN_ID=84532                    # default chain for local
ESCROW_CONTRACT_84532=0xe1d2...          # Base Sepolia (existing)
ESCROW_CONTRACT_97=0x...                 # BSC Testnet (new)
OPERATOR_PRIVATE_KEY=0x...               # dev key
RPC_URL_BASE_SEPOLIA=https://sepolia.base.org
RPC_URL_BSC_TESTNET=https://data-seed-prebsc-1-s1.binance.org:8545
```

**Production (Railway):**
```bash
ESCROW_NETWORK_MODE=mainnet
ESCROW_CHAIN_ID=8453                     # default chain for prod
ESCROW_CONTRACT_8453=0x...               # Base Mainnet (new)
ESCROW_CONTRACT_56=0x...                 # BNB Mainnet (new)
OPERATOR_PRIVATE_KEY=0x...               # prod operator key
RPC_URL_BASE=https://mainnet.base.org
RPC_URL_BNB=https://bsc-dataseed.binance.org
```

### 5. Code Changes Summary

**packages/shared/src/chains.ts:**
- Add `bscTestnet` (97) to `SUPPORTED_CHAINS`
- Add token registry for chainId 97
- Add 97 to `ESCROW_CHAIN_IDS`
- Replace `getActiveChains(enableTestnets: boolean)` → `getActiveChains(mode: 'testnet' | 'mainnet')`
- New: testnet mode returns only `isTestnet=true` chains, mainnet returns only `isTestnet=false`

**apps/api/src/modules/escrow/escrow.config.ts:**
- Replace `enableTestnets` → `networkMode: 'testnet' | 'mainnet'`
- Add RPC config for chainId 97
- Update `isChainAllowed()` to use network mode
- Update `buildContractAddresses()` to include 97

**apps/api/src/modules/escrow/escrow.poller.ts:**
- No changes needed (already filters by allowed chains)

**apps/api/src/modules/escrow/escrow.routes.ts:**
- `/escrow/supported-chains` — already dynamic, just returns allowed chains

**apps/dashboard/src/components/escrow/:**
- Chain selector already driven by `/escrow/supported-chains` API
- RainbowKit config needs BSC Testnet chain added
- Wagmi chains config: add BSC Testnet + BNB mainnet

**contracts/:**
- Existing `Deploy.s.sol` should work as-is (parameterized)
- Need `.env.bsc-testnet`, `.env.base-mainnet`, `.env.bnb-mainnet` for Foundry
- Verify on BscScan (needs BSCSCAN_API_KEY)

### 6. Frontend Chain Config (Wagmi/RainbowKit)

Currently likely configured for Base Sepolia only. Need to add:
- `base` (mainnet) — already in wagmi chains
- `bsc` (56) — from wagmi/chains
- `bscTestnet` (97) — from wagmi/chains

Chain list driven by `ESCROW_NETWORK_MODE` via API response from `/escrow/supported-chains`.

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Wrong token address on mainnet | FUNDS LOST | Double-verify token addresses from official sources before allowlist |
| Operator key compromise | Can distribute/refund illegitimately | Use separate prod key, funded with minimum needed gas |
| Reorg on BNB (3s blocks) | Duplicate event processing | Existing 5-block confirmation buffer handles this |
| BSC USDT is 18 decimals (not 6) | Amount display errors | Already handled — `tokenDecimals` from registry, not hardcoded |
| Gas estimation on BNB differs | Failed transactions | BNB gas is cheap, set generous gas limit |

---

## Implementation Phases (High Level)

### Phase 1: Chain Registry + Config (shared + API)
- Add BSC Testnet to chain/token registry
- Implement `ESCROW_NETWORK_MODE` env var
- Update filter functions
- Rebuild shared package

### Phase 2: Contract Deployments (Foundry)
- Deploy to BSC Testnet (97) — test with faucet tokens
- Deploy to Base Mainnet (8453)
- Deploy to BNB Mainnet (56)
- Verify contracts on explorers

### Phase 3: Frontend Updates (Dashboard)
- Add BSC chains to Wagmi/RainbowKit config
- Ensure chain selector respects supported-chains API
- Test wallet connect + switch chain on BNB

### Phase 4: Production Go-Live
- Set Railway env vars for mainnet mode
- Fund operator wallet on Base + BNB with gas
- Whitelist tokens on mainnet contracts
- Smoke test deposit flow

---

## Success Criteria
- [ ] Local dev can deposit on Base Sepolia + BSC Testnet
- [ ] Production can deposit on Base Mainnet + BNB Mainnet
- [ ] Chain selector shows only mode-appropriate chains
- [ ] Event poller processes events from all active chains
- [ ] Token decimals display correctly (6 for USDC on Base, 18 for USDT on BSC)
- [ ] "Escrow not configured" error gone on production

---

## Unresolved Questions
1. BSC Testnet USDC/USDT faucet token addresses — need to look up or deploy mock ERC20s
2. BscScan API key — needed for contract verification
3. Operator wallet funding — how much gas ETH + BNB to pre-load?
4. Should we remove Ethereum/Arbitrum/Polygon from `ESCROW_CHAIN_IDS` to keep it focused on Base+BNB only for now?
