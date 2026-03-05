---
title: "Deploy ClawQuestEscrow to Base Sepolia"
description: "Ops task: verify existing testnet deployment, configure env vars, and test deposit flow end-to-end."
status: pending
priority: P1
effort: 2h
branch: main
tags: [escrow, deployment, base-sepolia, ops]
created: 2026-03-01
---

# Deploy ClawQuestEscrow to Base Sepolia

## Key Finding: Contract Already Deployed

Broadcast log at `contracts/broadcast/Deploy.s.sol/84532/run-latest.json` shows a completed deployment:

| Address | Role |
|---|---|
| `0xe1d2b3d041934e2f245d5a366396e4787d3802c1` | **Proxy** (use this) |
| `0x6fb2c8c3fbe30f40d55529d37f3e82bb46be2f0e` | Implementation |

- Deployed from: `0xd4d29400eac69a5855c48bac968592c22fffe36b`
- USDC allowlisted: `0xAA87A3f8E6017F1f02af0f306B765FCfBeCac3E4` (Base Sepolia USDC)
- All 3 txs confirmed (status `0x1`)
- Deployer was set as both admin and operator in `initialize()` args

**This means Phase 1 (deploy) is done. The work is Phase 2 (wire up) and Phase 3 (test).**

---

## Phase 1 — Verify Deployment [DONE]

Check the existing deployment is live and correctly configured.

### Steps
1. Confirm proxy is live on BaseScan:
   `https://sepolia.basescan.org/address/0xe1d2b3d041934e2f245d5a366396e4787d3802c1`

2. Verify contract source (if not already verified):
   ```bash
   cd contracts
   forge verify-contract \
     --chain base_sepolia \
     --etherscan-api-key $BASESCAN_API_KEY \
     --constructor-args $(cast abi-encode "constructor(address,bytes)" \
       0x6fb2c8c3fbe30f40d55529d37f3e82bb46be2f0e \
       $(cast calldata "initialize(address,address)" $ADMIN_ADDRESS $OPERATOR_ADDRESS)) \
     0xe1d2b3d041934e2f245d5a366396e4787d3802c1 \
     ERC1967Proxy
   ```
   Implementation:
   ```bash
   forge verify-contract \
     --chain base_sepolia \
     --etherscan-api-key $BASESCAN_API_KEY \
     0x6fb2c8c3fbe30f40d55529d37f3e82bb46be2f0e \
     src/ClawQuestEscrow.sol:ClawQuestEscrow
   ```

3. Confirm OPERATOR_ROLE is assigned to the backend hot wallet:
   ```bash
   cast call 0xe1d2b3d041934e2f245d5a366396e4787d3802c1 \
     "hasRole(bytes32,address)(bool)" \
     $(cast keccak "OPERATOR_ROLE") \
     $OPERATOR_ADDRESS \
     --rpc-url https://sepolia.base.org
   ```
   If `false`, grant it:
   ```bash
   cast send 0xe1d2b3d041934e2f245d5a366396e4787d3802c1 \
     "grantRole(bytes32,address)" \
     $(cast keccak "OPERATOR_ROLE") \
     $OPERATOR_ADDRESS \
     --private-key $DEPLOYER_PRIVATE_KEY \
     --rpc-url https://sepolia.base.org
   ```

**Required env vars for Phase 1:**
- `BASESCAN_API_KEY` — from basescan.org
- `DEPLOYER_PRIVATE_KEY` — the deployer wallet (0xd4d294...)
- `OPERATOR_ADDRESS` — backend hot wallet address

---

## Phase 2 — Configure API [~30 min]

Wire the deployed proxy address into the API's env vars and confirm the escrow poller starts cleanly.

### Files to update
- `.env.development` (local) — set `ESCROW_CONTRACT_84532`
- Railway env vars (production) — same key
- `.env.example` — uncomment `ESCROW_CONTRACT_84532` line with the real address as example

### Changes

**`.env.development` (add/uncomment):**
```env
ESCROW_CONTRACT_84532="0xd771ca2fa508a462f07269ec3745d33b4dbc24b0"
OPERATOR_PRIVATE_KEY="0x<hot-wallet-private-key>"
ESCROW_CHAIN_ID=84532
ENABLE_TESTNETS=true
```

**`apps/api/src/app.ts`** — verify poller starts with correct env var check. Current code (line 180) checks legacy env var. Confirm `isEscrowConfigured()` returns `true` with the new per-chain var.

**Validation:**
```bash
pnpm --filter api dev
# Check log output for: "Escrow poller started" or similar
```

### Escrow poller env var bug (flagged in memory)
From agent memory: "Poller started in `app.ts` line 180 (currently checks legacy env var — needs fix)." Verify whether `isEscrowConfigured()` from `escrow.config.ts` is used (it checks both legacy and per-chain) — if so, no code change needed. If `app.ts` uses raw `process.env.ESCROW_CONTRACT`, that's a 1-line fix.

---

## Phase 3 — End-to-End Deposit Test [~1h]

Validate the full deposit flow works with real testnet funds.

### Prerequisites
- Base Sepolia ETH in deployer wallet (faucet: https://www.alchemy.com/faucets/base-sepolia or https://faucet.quicknode.com/base/sepolia)
- Base Sepolia USDC in sponsor wallet: USDC contract `0xAA87A3f8E6017F1f02af0f306B765FCfBeCac3E4`
  - Mint via Circle faucet: https://faucet.circle.com (select Base Sepolia)

### Test sequence
1. Get test USDC from Circle faucet into a sponsor wallet
2. Approve escrow proxy to spend USDC:
   ```bash
   cast send 0xAA87A3f8E6017F1f02af0f306B765FCfBeCac3E4 \
     "approve(address,uint256)" \
     0xe1d2b3d041934e2f245d5a366396e4787d3802c1 \
     1000000 \
     --private-key $SPONSOR_PRIVATE_KEY \
     --rpc-url https://sepolia.base.org
   ```
3. Create a test quest via API (or directly via dashboard)
4. Fund quest via dashboard fund page (wagmi flow) or direct cast call:
   ```bash
   cast send 0xe1d2b3d041934e2f245d5a366396e4787d3802c1 \
     "deposit(bytes32,address,uint128,uint64)" \
     <questId-as-bytes32> \
     0xAA87A3f8E6017F1f02af0f306B765FCfBeCac3E4 \
     1000000 \
     <deadline-unix-ts> \
     --private-key $SPONSOR_PRIVATE_KEY \
     --rpc-url https://sepolia.base.org
   ```
5. Verify `QuestFunded` event emitted and API poller updates `fundingStatus` in DB
6. Verify quest moves to `ACTIVE` status

### Quest ID → bytes32 conversion
UUID format: `007d6b1e-59a5-481d-91d9-55442ca40898`
Strip hyphens + left-pad to 32 bytes:
```bash
cast to-bytes32 0x007d6b1e59a5481d91d955442ca40898
# → 0x007d6b1e59a5481d91d955442ca4089800000000000000000000000000000000
```

---

## Env Vars Summary

| Var | Value | Where |
|---|---|---|
| `ESCROW_CONTRACT_84532` | `0xd771ca2fa508a462f07269ec3745d33b4dbc24b0` | API server + local .env |
| `OPERATOR_PRIVATE_KEY` | `0x<hot-wallet-key>` | API server only (Railway) |
| `ESCROW_CHAIN_ID` | `84532` | API + local |
| `BASESCAN_API_KEY` | from basescan.org | contracts/.env or local shell |
| `ENABLE_TESTNETS` | `true` | local .env (already default) |

---

## Unresolved Questions

1. Is the current deployer (0xd4d294...) the intended OPERATOR, or is there a separate hot wallet? The broadcast shows both admin and operator set to same address — may need to `grantRole(OPERATOR_ROLE, <hot-wallet>)` if they differ.
2. Is source verification done on BaseScan? The broadcast log exists but `--verify` flag may not have been passed. Check BaseScan before re-verifying.
3. Does `app.ts` line 180 use `isEscrowConfigured()` (safe) or raw `process.env.ESCROW_CONTRACT` (needs fix)?
