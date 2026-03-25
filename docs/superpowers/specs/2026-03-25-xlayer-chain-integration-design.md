# X Layer Chain Integration Design

## Summary

Add X Layer (Chain ID 196) mainnet + testnet (1952) support to ClawQuest, following the existing BSC integration pattern. Only USDC and USDT tokens. Contract deployment via CREATE2 for deterministic address matching existing chains. Testnet deploy first to verify address.

## Scope

**In scope:**
- Shared chain registry (chains.ts) — add X Layer mainnet + testnet
- API escrow config — RPC mapping, viem chain definition
- Frontend wagmi — custom X Layer chain, chain selector
- Foundry config — RPC + etherscan endpoints
- Deploy guide — CREATE2 deployment steps for testnet → mainnet
- Environment variables — contract addresses, RPC URLs

**Out of scope:**
- Actual contract deployment (guide only)
- Admin dashboard changes (already generic)
- New API endpoints (existing ones are chain-agnostic)

## Design

### 1. Shared Chain Registry (`packages/shared/src/chains.ts`)

Add to `SUPPORTED_CHAINS`:

```typescript
// X Layer Mainnet
{
  chainId: 196,
  name: 'X Layer',
  shortName: 'xlayer',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrl: 'https://rpc.xlayer.tech',
  explorerUrl: 'https://www.okx.com/web3/explorer/xlayer',
  isTestnet: false,
}
// X Layer Testnet
{
  chainId: 1952,
  name: 'X Layer Testnet',
  shortName: 'xlayer-testnet',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrl: 'https://testrpc.xlayer.tech',
  explorerUrl: 'https://www.okx.com/web3/explorer/xlayer-test',
  isTestnet: true,
}
```

Add to `TOKEN_REGISTRY`:

```typescript
// X Layer Mainnet (196)
{ chainId: 196, symbol: 'OKB', address: '0x0000000000000000000000000000000000000000', decimals: 18 }  // native
{ chainId: 196, symbol: 'USDC', address: '0x74b7F16337b8972027F6196A17a631aC6dE26d22', decimals: 6 }
{ chainId: 196, symbol: 'USDT', address: '0x1E4a5963aBFD975d8c9021ce480b42188849D41d', decimals: 18 }  // verify on-chain!
// X Layer Testnet (1952) — tokens TBD after testnet verification
```

> **Important**: Verify USDT decimals on-chain before merging:
> `cast call 0x1E4a5963aBFD975d8c9021ce480b42188849D41d "decimals()(uint8)" --rpc-url https://rpc.xlayer.tech`
> Most chains use 6 decimals for USDT. If wrong, deposit/distribution amounts will be off by 10^12.

Add 196 and 1952 to `ESCROW_CHAIN_IDS`.

### 2. API Escrow Config

**`escrow.config.ts`** — add legacy RPC env var mapping:
- `RPC_URL_XLAYER` → chainId 196
- `RPC_URL_XLAYER_TESTNET` → chainId 1952

**`escrow.client.ts`** — add X Layer to viem chain mapping. Define custom chain (X Layer is OP Stack, not built-in to viem):

```typescript
const xlayer = defineChain({
  id: 196,
  name: 'X Layer',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.xlayer.tech'] } },
  blockExplorers: { default: { name: 'OKX Explorer', url: 'https://www.okx.com/web3/explorer/xlayer' } },
})
```

Same pattern for testnet (chainId 1952).

**No changes needed**: escrow.service.ts, escrow.routes.ts, rpc-manager.service.ts — already generic.

### 3. Frontend Wagmi (`apps/dashboard/src/lib/wagmi.ts`)

Define custom X Layer chains (same as escrow.client.ts pattern) and add to wagmi config:

- Mainnet mode: `[base, bsc, xlayer]`
- Testnet mode: `[baseSepolia, bscTestnet, xlayerTestnet]`

No other frontend changes needed — fund flow, chain selector, token selector are already generic.

### 4. Foundry Config (`contracts/foundry.toml`)

```toml
[rpc_endpoints]
xlayer = "https://rpc.xlayer.tech"
xlayer_testnet = "https://testrpc.xlayer.tech"

[etherscan]
xlayer = { key = "${OKXSCAN_API_KEY}", url = "https://www.okx.com/api/v5/explorer/contract/verify-source-code" }
```

### 5. Environment Variables (`.env.example`)

```env
# X Layer
ESCROW_CONTRACT_196=                    # X Layer mainnet contract
ESCROW_CONTRACT_1952=                   # X Layer testnet contract
# RPC_URL_196=https://rpc.xlayer.tech   # canonical format (or use legacy below)
# RPC_URL_XLAYER=https://rpc.xlayer.tech
# RPC_URL_1952=https://testrpc.xlayer.tech
# OKXSCAN_API_KEY=                      # for contract verification
```

### 6. Deploy Guide (`docs/xlayer-deploy-guide.md`)

Update existing guide to use `DeployCreate2.s.sol` instead of `Deploy.s.sol`. Steps:

1. **Prerequisites**: Foundry, OKB for gas (testnet faucet + mainnet via OKX Exchange/Bridge)
2. **Env setup**: Export `DEPLOYER_PRIVATE_KEY`, `ADMIN_ADDRESS`, `OPERATOR_ADDRESS`, `USDC_ADDRESS`, `USDT_ADDRESS`
3. **Testnet deploy**: `forge script script/DeployCreate2.s.sol --rpc-url https://testrpc.xlayer.tech --broadcast --chain-id 1952`
4. **Verify address**: Confirm predicted proxy matches `0xF86f5498165D62E044964740F30540D6c5675b99`
5. **Mainnet deploy**: Same script with `--rpc-url https://rpc.xlayer.tech --chain-id 196`
6. **Post-deploy**: Set `ESCROW_CONTRACT_196`, add `196` to `ESCROW_CHAIN_IDS` in Railway
7. **Troubleshooting**: OKB gas, RPC timeout, address mismatch scenarios

## Files Changed

| File | Change |
|------|--------|
| `packages/shared/src/chains.ts` | Add X Layer chains + tokens |
| `apps/api/src/modules/escrow/escrow.config.ts` | Add legacy RPC mapping |
| `apps/api/src/modules/escrow/escrow.client.ts` | Add viem chain definition |
| `apps/dashboard/src/lib/wagmi.ts` | Add X Layer to wagmi chains |
| `contracts/foundry.toml` | Add RPC + etherscan endpoints |
| `.env.example` | Add X Layer env vars |
| `docs/xlayer-deploy-guide.md` | Rewrite with CREATE2 flow |
| `packages/shared/src/__tests__/chains.test.ts` | Update ESCROW_CHAIN_IDS assertions |

## Risks

| Risk | Mitigation |
|------|------------|
| CREATE2 address mismatch on X Layer | Deploy testnet first to verify; same deployer/salt/bytecode guarantees same address |
| X Layer RPC instability | Fallback RPC: `https://xlayerrpc.okx.com`; DB-backed RPC manager supports multiple RPCs |
| OKB gas token confusion | Clear docs that X Layer uses OKB (not ETH) for gas |
| USDC/USDT decimal mismatch | Verify on-chain decimals match TOKEN_REGISTRY before going live |
| Testnet RPC path | Verify correct URL: `testrpc.xlayer.tech` vs `testrpc.xlayer.tech/terigon` — test both |
| Chains test breakage | Update `packages/shared/src/__tests__/chains.test.ts` ESCROW_CHAIN_IDS assertions |
