# X Layer Chain Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add X Layer (Chain ID 196 mainnet + 1952 testnet) to ClawQuest escrow system with USDC/USDT support, following existing BSC pattern.

**Architecture:** Follow the multi-chain pattern already established: shared chain registry → API escrow config (auto-resolves RPCs) → viem client (dynamic `defineChain` fallback) → wagmi frontend. No new endpoints or services needed — existing code is chain-agnostic.

**Tech Stack:** TypeScript, viem, wagmi/RainbowKit, Foundry (Solidity deployment), Prisma

**Spec:** `docs/superpowers/specs/2026-03-25-xlayer-chain-integration-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `packages/shared/src/chains.ts` | Modify | Add X Layer chains + tokens to registry |
| `packages/shared/src/__tests__/chains.test.ts` | Modify | Update test assertions for new chains |
| `apps/api/src/modules/escrow/escrow.config.ts` | Modify | Add legacy RPC env var mapping |
| `apps/dashboard/src/lib/wagmi.ts` | Modify | Add X Layer custom chains to wagmi |
| `contracts/foundry.toml` | Modify | Add RPC + etherscan endpoints |
| `.env.example` | Modify | Add X Layer env vars |
| `docs/xlayer-deploy-guide.md` | Modify | Rewrite with CREATE2 deployment flow |

**Note:** `escrow.client.ts` does NOT need modification — its `getViemChain()` already has a dynamic `defineChain()` fallback that reads from `SUPPORTED_CHAINS`. Adding chains to the shared registry is sufficient.

---

### Task 1: Add X Layer to Shared Chain Registry

**Files:**
- Modify: `packages/shared/src/chains.ts:13-77` (SUPPORTED_CHAINS)
- Modify: `packages/shared/src/chains.ts:89-130` (TOKEN_REGISTRY)
- Modify: `packages/shared/src/chains.ts:155` (ESCROW_CHAIN_IDS)

- [ ] **Step 1: Add X Layer Mainnet + Testnet to SUPPORTED_CHAINS**

In `packages/shared/src/chains.ts`, add two new entries to the `SUPPORTED_CHAINS` object after `polygon`:

```typescript
    xlayer: {
        id: 196,
        name: 'X Layer',
        shortName: 'xlayer',
        nativeCurrency: { symbol: 'OKB', name: 'OKB', decimals: 18 },
        rpcUrl: 'https://rpc.xlayer.tech',
        explorerUrl: 'https://www.okx.com/web3/explorer/xlayer',
        isTestnet: false,
    },
    xlayerTestnet: {
        id: 1952,
        name: 'X Layer Testnet',
        shortName: 'xlayer-testnet',
        nativeCurrency: { symbol: 'OKB', name: 'OKB', decimals: 18 },
        rpcUrl: 'https://testrpc.xlayer.tech',
        explorerUrl: 'https://www.okx.com/web3/explorer/xlayer-test',
        isTestnet: true,
    },
```

- [ ] **Step 2: Add X Layer tokens to TOKEN_REGISTRY**

Add after the Polygon (137) entry:

```typescript
    // X Layer
    196: {
        USDC: { address: '0x74b7F16337b8972027F6196A17a631aC6dE26d22', decimals: 6, symbol: 'USDC', name: 'USD Coin' },
        USDT: { address: '0x1E4a5963aBFD975d8c9021ce480b42188849D41d', decimals: 18, symbol: 'USDT', name: 'Tether USD' },
        NATIVE: { address: '0x0000000000000000000000000000000000000000', decimals: 18, symbol: 'OKB', name: 'OKB' },
    },
    // X Layer Testnet — tokens TBD after testnet deploy verification
    1952: {
        NATIVE: { address: '0x0000000000000000000000000000000000000000', decimals: 18, symbol: 'OKB', name: 'OKB' },
    },
```

> **IMPORTANT:** Before merging to production, verify USDT decimals on-chain:
> `cast call 0x1E4a5963aBFD975d8c9021ce480b42188849D41d "decimals()(uint8)" --rpc-url https://rpc.xlayer.tech`
> If result is `6` (not `18`), update the decimals value above.

- [ ] **Step 3: Add X Layer chain IDs to ESCROW_CHAIN_IDS**

Update the constant on line 155:

```typescript
// Before:
export const ESCROW_CHAIN_IDS = [8453, 84532, 56, 97] as const;

// After:
export const ESCROW_CHAIN_IDS = [8453, 84532, 56, 97, 196, 1952] as const;
```

- [ ] **Step 4: Build shared package to verify no compile errors**

Run: `pnpm --filter @clawquest/shared build`

Expected: Clean build, no errors.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/chains.ts
git commit -m "feat(shared): add X Layer mainnet (196) and testnet (1952) to chain registry"
```

---

### Task 2: Update Chain Registry Tests

**Files:**
- Modify: `packages/shared/src/__tests__/chains.test.ts:17,164-175`

- [ ] **Step 1: Update SUPPORTED_CHAINS expected keys**

On line 17, add `'xlayer'` and `'xlayerTestnet'` to the `expectedKeys` array:

```typescript
// Before:
const expectedKeys = ['base', 'baseSepolia', 'ethereum', 'bnb', 'bscTestnet', 'arbitrum', 'polygon'];

// After:
const expectedKeys = ['base', 'baseSepolia', 'ethereum', 'bnb', 'bscTestnet', 'arbitrum', 'polygon', 'xlayer', 'xlayerTestnet'];
```

- [ ] **Step 2: Update ESCROW_CHAIN_IDS test assertions**

Add X Layer chain IDs to the "contains all expected chain IDs" test (line 164-168):

```typescript
it('contains all expected chain IDs', () => {
    expect(ESCROW_CHAIN_IDS).toContain(8453);    // Base
    expect(ESCROW_CHAIN_IDS).toContain(84532);   // Base Sepolia
    expect(ESCROW_CHAIN_IDS).toContain(56);      // BNB
    expect(ESCROW_CHAIN_IDS).toContain(97);      // BSC Testnet
    expect(ESCROW_CHAIN_IDS).toContain(196);     // X Layer
    expect(ESCROW_CHAIN_IDS).toContain(1952);    // X Layer Testnet
});
```

- [ ] **Step 3: Run tests to verify**

Run: `cd packages/shared && pnpm vitest run`

Expected: All tests pass including the new X Layer assertions.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/__tests__/chains.test.ts
git commit -m "test(shared): add X Layer chain IDs to chains test assertions"
```

---

### Task 3: Add Legacy RPC Mapping to Escrow Config

**Files:**
- Modify: `apps/api/src/modules/escrow/escrow.config.ts:65-70`

- [ ] **Step 1: Add X Layer legacy RPC env var entries**

In the `legacyMap` object inside `resolveRpcUrl()` (line 65-70), add two entries:

```typescript
// Before:
const legacyMap: Record<number, string> = {
    8453: 'RPC_URL_BASE',
    84532: 'RPC_URL_BASE_SEPOLIA',
    56: 'RPC_URL_BNB',
    97: 'RPC_URL_BSC_TESTNET',
};

// After:
const legacyMap: Record<number, string> = {
    8453: 'RPC_URL_BASE',
    84532: 'RPC_URL_BASE_SEPOLIA',
    56: 'RPC_URL_BNB',
    97: 'RPC_URL_BSC_TESTNET',
    196: 'RPC_URL_XLAYER',
    1952: 'RPC_URL_XLAYER_TESTNET',
};
```

- [ ] **Step 2: Build API to verify no compile errors**

Run: `pnpm --filter api build`

Expected: Clean build (may show warnings about unused vars, that's fine).

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/escrow/escrow.config.ts
git commit -m "feat(api): add X Layer legacy RPC env var mapping to escrow config"
```

---

### Task 4: Add X Layer to Frontend Wagmi Config

**Files:**
- Modify: `apps/dashboard/src/lib/wagmi.ts`

- [ ] **Step 1: Define X Layer custom chains and add to wagmi config**

Replace the entire file content:

```typescript
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base, baseSepolia, bsc, bscTestnet } from 'wagmi/chains';
import { defineChain } from 'viem';

// X Layer Mainnet — custom chain (not built-in to wagmi/viem)
const xlayer = defineChain({
    id: 196,
    name: 'X Layer',
    nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
    rpcUrls: {
        default: { http: ['https://rpc.xlayer.tech'] },
    },
    blockExplorers: {
        default: { name: 'OKX Explorer', url: 'https://www.okx.com/web3/explorer/xlayer' },
    },
});

// X Layer Testnet — custom chain
const xlayerTestnet = defineChain({
    id: 1952,
    name: 'X Layer Testnet',
    nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
    rpcUrls: {
        default: { http: ['https://testrpc.xlayer.tech'] },
    },
    blockExplorers: {
        default: { name: 'OKX Explorer', url: 'https://www.okx.com/web3/explorer/xlayer-test' },
    },
    testnet: true,
});

const networkMode = import.meta.env.VITE_ESCROW_NETWORK_MODE || 'testnet';

const testnetChains = [baseSepolia, bscTestnet, xlayerTestnet] as const;
const mainnetChains = [base, bsc, xlayer] as const;

const chains = networkMode === 'testnet' ? testnetChains : mainnetChains;

export const wagmiConfig = getDefaultConfig({
    appName: 'ClawQuest',
    projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'demo-project-id',
    chains: chains as any,
});
```

- [ ] **Step 2: Build dashboard to verify no compile errors**

Run: `pnpm --filter dashboard build`

Expected: Clean build.

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/src/lib/wagmi.ts
git commit -m "feat(dashboard): add X Layer mainnet and testnet to wagmi chain config"
```

---

### Task 5: Update Foundry Config

**Files:**
- Modify: `contracts/foundry.toml:23-33`

- [ ] **Step 1: Add X Layer RPC endpoints**

Append to the `[rpc_endpoints]` section (after line 27):

```toml
xlayer = "https://rpc.xlayer.tech"
xlayer_testnet = "https://testrpc.xlayer.tech"
```

- [ ] **Step 2: Add X Layer etherscan config**

Append to the `[etherscan]` section (after line 33):

```toml
xlayer = { key = "${OKXSCAN_API_KEY}", url = "https://www.okx.com/api/v5/explorer/contract/verify-source-code" }
```

- [ ] **Step 3: Verify foundry config syntax**

Run: `cd contracts && forge build`

Expected: Clean build (verifies foundry.toml is valid).

- [ ] **Step 4: Commit**

```bash
git add contracts/foundry.toml
git commit -m "feat(contracts): add X Layer RPC and etherscan endpoints to foundry config"
```

---

### Task 6: Update Environment Variables Template

**Files:**
- Modify: `.env.example:65-88`

- [ ] **Step 1: Add X Layer entries to ESCROW_CHAIN_IDS comment**

Update line 65 comment to mention X Layer:

```env
ESCROW_CHAIN_IDS=84532                  # add chains here: 84532,8453,56,196
```

- [ ] **Step 2: Add X Layer contract address placeholders**

Add after the "Shared CREATE2 address" block (after line 76):

```env
# X Layer mainnet (196):
# ESCROW_CONTRACT_196=0x...
# X Layer testnet (1952):
# ESCROW_CONTRACT_1952=0x...
```

- [ ] **Step 3: Add X Layer RPC URL examples**

Add to the custom RPC URLs section (after line 87):

```env
# RPC_URL_XLAYER="https://rpc.xlayer.tech"         # X Layer mainnet
# RPC_URL_XLAYER_TESTNET="https://testrpc.xlayer.tech"  # X Layer testnet
# OKXSCAN_API_KEY=""                               # for X Layer contract verification
```

- [ ] **Step 4: Commit**

```bash
git add .env.example
git commit -m "docs: add X Layer env var placeholders to .env.example"
```

---

### Task 7: Rewrite Deploy Guide with CREATE2 Flow

**Files:**
- Modify: `docs/xlayer-deploy-guide.md`

- [ ] **Step 1: Rewrite the deploy guide**

Replace the entire file with an updated guide that uses `DeployCreate2.s.sol`. Key sections:

1. **Overview** — X Layer is EVM-equivalent (OP Stack), chain IDs, RPC URLs, explorer links
2. **Prerequisites** — Foundry installed, OKB for gas, deployer private key
3. **Token Addresses** — USDC and USDT on X Layer mainnet (same as spec)
4. **Step 1: Verify Foundry config** — Confirm `contracts/foundry.toml` has `xlayer` + `xlayer_testnet` RPC entries
5. **Step 2: Set environment variables** — Export:
   - `DEPLOYER_PRIVATE_KEY` — must be same key used on Base/BSC
   - `ADMIN_ADDRESS` — must be same admin as Base/BSC
   - `OPERATOR_ADDRESS` — must be same operator as Base/BSC
   - `USDC_ADDRESS=0x74b7F16337b8972027F6196A17a631aC6dE26d22`
   - `USDT_ADDRESS=0x1E4a5963aBFD975d8c9021ce480b42188849D41d`
6. **Step 3: Verify RPC connection** — `cast chain-id --rpc-url https://rpc.xlayer.tech` → expect `196`
7. **Step 4: Deploy to Testnet first** — `forge script script/DeployCreate2.s.sol --rpc-url https://testrpc.xlayer.tech --broadcast --chain-id 1952 -vvvv`
8. **Step 5: Verify deterministic address** — Check output matches `Predicted proxy: 0xF86f5498165D62E044964740F30540D6c5675b99`. If mismatch, STOP and debug.
9. **Step 6: Deploy to Mainnet** — Same command with `--rpc-url https://rpc.xlayer.tech --chain-id 196`
10. **Step 7: Verify on Explorer** — Check TX on `okx.com/web3/explorer/xlayer/tx/0x<hash>`
11. **Step 8: Update environment** — Set `ESCROW_CONTRACT_196`, add `196` to `ESCROW_CHAIN_IDS` in Railway
12. **Troubleshooting** — insufficient funds (need OKB), chain id mismatch, RPC timeout (fallback: `xlayerrpc.okx.com`), address mismatch (check deployer key + admin/operator are same), nonce issues

Important notes to include:
- X Layer uses **OKB** for gas (not ETH)
- The **same** `DEPLOYER_PRIVATE_KEY`, `ADMIN_ADDRESS`, `OPERATOR_ADDRESS` must be used as on Base/BSC for CREATE2 to produce the same address
- Always deploy to testnet first to verify the address matches

- [ ] **Step 2: Commit**

```bash
git add docs/xlayer-deploy-guide.md
git commit -m "docs: rewrite X Layer deploy guide with CREATE2 deterministic flow"
```

---

### Task 8: Rebuild Shared Package + Verify Full Build

**Files:** None (verification only)

- [ ] **Step 1: Rebuild shared package**

Run: `pnpm --filter @clawquest/shared build`

Expected: Clean build.

- [ ] **Step 2: Run shared package tests**

Run: `cd packages/shared && pnpm vitest run`

Expected: All tests pass.

- [ ] **Step 3: Build API**

Run: `pnpm --filter api build`

Expected: Clean build.

- [ ] **Step 4: Build dashboard**

Run: `pnpm --filter dashboard build`

Expected: Clean build.

- [ ] **Step 5: Run lint**

Run: `pnpm lint`

Expected: No new lint errors introduced.
