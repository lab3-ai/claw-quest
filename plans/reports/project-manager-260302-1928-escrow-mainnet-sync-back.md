# Escrow Mainnet Integration — Sync Back Report

**Date:** 2026-03-02 19:28
**Plan:** `/Users/hd/clawquest/plans/260302-1902-escrow-mainnet-integration/`
**Status:** In Progress (2 of 4 phases complete)

---

## Executive Summary

Implementation team completed **Phase 1 (Chain Registry + Config)** + **Phase 3 (Frontend Updates)** with full code delivery. All packages compile successfully. Phases 2 (Contract Deployments) and 4 (Production Go-Live) remain pending — require manual wallet operations + Railway/Vercel env configuration.

---

## Completed Work

### Phase 1: Chain Registry + Config ✅
**Status:** Complete | **Effort:** 1.5h

**Code Deliverables:**
- `packages/shared/src/chains.ts` — Added BSC Testnet (97) to SUPPORTED_CHAINS; trimmed ESCROW_CHAIN_IDS to [8453, 84532, 56, 97]
- Added NetworkMode type + updated getActiveChains/getActiveEscrowChainIds to filter by mode
- `apps/api/src/modules/escrow/escrow.config.ts` — Replaced enableTestnets → networkMode; added RPC_URL_BSC_TESTNET
- Updated isChainAllowed() to respect network mode
- `apps/api/.env.example` — Added ESCROW_NETWORK_MODE + ESCROW_CONTRACT_97
- `contracts/foundry.toml` — Added BNB/BSC RPC endpoints + etherscan verifiers

**Verification:**
- `pnpm build` passes (all 3 packages: shared, api, dashboard)
- Chain filtering logic verified: testnet → [84532, 97]; mainnet → [8453, 56]

### Phase 3: Frontend Updates ✅
**Status:** Complete | **Effort:** 1.5h

**Code Deliverables:**
- `apps/dashboard/src/lib/wagmi.ts` — Imported bscTestnet; replaced VITE_ENABLE_TESTNETS → VITE_ESCROW_NETWORK_MODE
- Chain filtering: testnet=[baseSepolia, bscTestnet], mainnet=[base, bsc]
- Removed unused chain imports (mainnet, arbitrum, polygon)
- `apps/dashboard/.env.example` — Updated env var naming

**Verification:**
- Dashboard builds successfully: `pnpm --filter dashboard build`
- No TypeScript errors from chain type updates

---

## Pending Work

### Phase 2: Contract Deployments ⏳
**Status:** Pending | **Effort:** 2h | **Manual Steps Required**

Cannot automate — requires:
- Private key for operator wallet
- Sufficient ETH/BNB on deployment wallets
- Forge scripts to deploy proxies + initialize

Blocking: Phase 4 (needs deployed contract addresses for env vars)

### Phase 4: Production Go-Live ⏳
**Status:** Pending | **Effort:** 1h | **Manual Steps Required**

Cannot proceed — requires:
- Deployed contract addresses from Phase 2
- Railway API env vars: ESCROW_NETWORK_MODE=mainnet, ESCROW_CONTRACT_* addresses
- Vercel Dashboard env var: VITE_ESCROW_NETWORK_MODE=mainnet
- Smoke tests on testnet chains before toggling to mainnet

Deferred browser testing (fund page chain switching) → Phase 4 after contracts deployed.

---

## Plan Status Updates

**plan.md:**
- Phase 1 status: Pending → **Complete**
- Phase 3 status: Pending → **Complete**
- Overall status: Pending → **In Progress**

**phase-01-chain-registry-config.md:**
- Status: Pending → **Complete**
- All 11 todo items: Checked ✅

**phase-03-frontend-updates.md:**
- Status: Pending → **Complete**
- 6 of 7 todo items: Checked ✅
- Browser testing (chain switching) deferred → Phase 4 after contract deployment

---

## Integration Notes

- No breaking changes to existing code — shared pkg is additive (new NetworkMode type exported)
- Old ENABLE_TESTNETS env var is harmless if still set in Railway — new code ignores it
- Backend + Frontend in sync: both use ESCROW_NETWORK_MODE for testnet/mainnet separation
- All code is production-ready pending Phase 2 contract deployments

---

## Next Steps for Implementation Team

**Phase 2 Lead (if applicable):**
1. Obtain operator wallet private key + ensure funding on Base/BNB for gas
2. Update `contracts/.env` with RPC credentials + private key
3. Deploy proxies: `forge script scripts/DeployEscrow.s.sol --rpc-url base_sepolia --broadcast`
4. Record deployed proxy addresses → provide to Phase 4 team

**Phase 4 Lead (if applicable):**
1. Wait for Phase 2 contract addresses
2. Set Railway API env vars: ESCROW_NETWORK_MODE=mainnet, ESCROW_CONTRACT_8453, ESCROW_CONTRACT_56
3. Set Vercel env var: VITE_ESCROW_NETWORK_MODE=mainnet
4. Run smoke tests: deposit → approve → distribute on mainnet chains
5. Monitor prod deployment

---

## Unresolved Questions

- When will Phase 2 (contract deployments) be scheduled? Requires manual wallet operations.
- Has operator private key been securely provisioned for Phase 2 team?
- Will Phase 4 use same operator key across all chains, or separate per-chain operators?
