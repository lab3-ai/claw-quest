# Deploy ClawQuestEscrow on X Layer — CREATE2 Deterministic Deploy

## Overview

X Layer = Ethereum L2 (OP Stack), **EVM-equivalent** — deploying Solidity contracts works exactly like Ethereum.

We use **CREATE2 deployment** (`DeployCreate2.s.sol`) to get the **same contract address** across all chains (Base, BSC, X Layer). This requires using the same deployer key, admin, and operator as existing deployments.

| Info | Mainnet | Testnet |
|------|---------|---------|
| **Chain ID** | `196` (0xC4) | `1952` (0x7A0) |
| **RPC** | `https://rpc.xlayer.tech` | `https://testrpc.xlayer.tech` |
| **Explorer** | [okx.com/web3/explorer/xlayer](https://www.okx.com/web3/explorer/xlayer) | [okx.com/web3/explorer/xlayer-test](https://www.okx.com/web3/explorer/xlayer-test) |
| **Gas Token** | **OKB** | OKB (testnet) |

> [!CAUTION]
> X Layer uses **OKB** as its gas token (NOT ETH). You need OKB in your deployer wallet.

---

## Prerequisites

### 1. Foundry
```bash
forge --version     # check if installed
# If not: curl -L https://foundry.paradigm.xyz | bash && foundryup
```

### 2. OKB for Gas Fees
- **Mainnet**: Buy OKB on OKX Exchange → withdraw to deployer wallet on X Layer, or bridge via [X Layer Bridge](https://www.okx.com/web3/bridge)
- **Testnet**: Get test OKB from X Layer testnet faucet
- Amount needed: ~0.01-0.05 OKB (gas is very cheap)

### 3. Same Keys as Existing Deployments

> [!IMPORTANT]
> For CREATE2 to produce the same address, you **MUST** use the exact same keys as on Base/BSC:
> - Same `DEPLOYER_PRIVATE_KEY`
> - Same `ADMIN_ADDRESS`
> - Same `OPERATOR_ADDRESS`

### 4. Token Addresses (Mainnet)

| Token | Address |
|-------|---------|
| **USDC** | `0x74b7F16337b8972027F6196A17a631aC6dE26d22` |
| **USDT** | `0x1E4a5963aBFD975d8c9021ce480b42188849D41d` |

---

## Step 1: Verify Foundry Config

Confirm `contracts/foundry.toml` has X Layer RPC entries:

```toml
[rpc_endpoints]
xlayer = "https://rpc.xlayer.tech"
xlayer_testnet = "https://testrpc.xlayer.tech"

[etherscan]
xlayer = { key = "${OKXSCAN_API_KEY}", url = "https://www.okx.com/api/v5/explorer/contract/verify-source-code" }
```

## Step 2: Set Environment Variables

```bash
# MUST be the same keys used for Base/BSC deployment
export DEPLOYER_PRIVATE_KEY="0x..."
export ADMIN_ADDRESS="0x..."
export OPERATOR_ADDRESS="0x..."

# X Layer token addresses
export USDC_ADDRESS="0x74b7F16337b8972027F6196A17a631aC6dE26d22"
export USDT_ADDRESS="0x1E4a5963aBFD975d8c9021ce480b42188849D41d"
```

## Step 3: Verify RPC Connection

```bash
# Check X Layer mainnet
cast chain-id --rpc-url https://rpc.xlayer.tech
# Expected: 196

# Check X Layer testnet
cast chain-id --rpc-url https://testrpc.xlayer.tech
# Expected: 1952

# Check deployer balance (OKB)
cast balance $(cast wallet address --private-key $DEPLOYER_PRIVATE_KEY) --rpc-url https://rpc.xlayer.tech
# Must be > 0
```

## Step 4: Deploy to Testnet FIRST

> [!IMPORTANT]
> Always deploy to testnet first to verify the deterministic address matches.

```bash
cd contracts

forge script script/DeployCreate2.s.sol \
  --rpc-url https://testrpc.xlayer.tech \
  --broadcast \
  --chain-id 1952 \
  -vvvv
```

## Step 5: Verify Deterministic Address

Check the output for `Predicted proxy:` — it **MUST** match the existing contract address on Base/BSC:

```
=== CREATE2 Deterministic Deploy ===
  Deployer:         0x...
  Admin:            0x...
  Operator:         0x...
  Predicted impl:   0x...
  Predicted proxy:  0xF86f5498165D62E044964740F30540D6c5675b99  ← MUST MATCH

=== Deployment Complete ===
  Proxy (ESCROW_CONTRACT): 0xF86f5498165D62E044964740F30540D6c5675b99
  Implementation:          0x...
```

> [!CAUTION]
> If the predicted proxy does **NOT** match `0xF86f5498165D62E044964740F30540D6c5675b99`, **STOP**. Do not deploy to mainnet. Debug:
> - Is `DEPLOYER_PRIVATE_KEY` the same as used on Base/BSC?
> - Are `ADMIN_ADDRESS` and `OPERATOR_ADDRESS` identical?
> - Is the `solc` version 0.8.24 with 200 optimizer runs? (check `foundry.toml`)

Verify on testnet explorer:
```
https://www.okx.com/web3/explorer/xlayer-test/tx/0x<TX_HASH>
```

## Step 6: Deploy to Mainnet

```bash
forge script script/DeployCreate2.s.sol \
  --rpc-url https://rpc.xlayer.tech \
  --broadcast \
  --chain-id 196 \
  -vvvv
```

Verify on mainnet explorer:
```
https://www.okx.com/web3/explorer/xlayer/tx/0x<TX_HASH>
```

Check:
- Status: Success
- Chain: X Layer (196)
- Contract address matches

## Step 7: Update Environment (Railway / .env)

```bash
# Add contract address
ESCROW_CONTRACT_196=0xF86f5498165D62E044964740F30540D6c5675b99

# Add 196 to active chains
ESCROW_CHAIN_IDS=84532,196    # or whatever chains you want active

# Optional: custom RPC
RPC_URL_XLAYER="https://rpc.xlayer.tech"
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `insufficient funds` | Add OKB to deployer wallet (OKB is gas token, not ETH) |
| `chain id mismatch` | Use `--chain-id 196` for mainnet, `--chain-id 1952` for testnet |
| RPC timeout | Try fallback: `https://xlayerrpc.okx.com` |
| Address mismatch | Verify same `DEPLOYER_PRIVATE_KEY` + `ADMIN_ADDRESS` + `OPERATOR_ADDRESS` as Base/BSC |
| `nonce too low` | Check: `cast nonce <deployer> --rpc-url https://rpc.xlayer.tech` |
| `EvmError: CreateCollision` | Contract already deployed at that address on this chain |

---

## References

| Resource | URL |
|----------|-----|
| X Layer Docs | [web3.okx.com/xlayer/docs](https://web3.okx.com/xlayer/docs/developer/build-on-xlayer/about-xlayer) |
| Deploy with Foundry | [X Layer Foundry Guide](https://web3.okx.com/xlayer/docs/developer/deploy-a-smart-contract/deploy-with-foundry) |
| X Layer Explorer | [okx.com/web3/explorer/xlayer](https://www.okx.com/web3/explorer/xlayer) |
| Token Addresses | [X Layer Contracts](https://web3.okx.com/xlayer/docs/developer/build-on-xlayer/contracts) |
| X Layer RPC Endpoints | [RPC Endpoints](https://web3.okx.com/xlayer/docs/developer/rpc-endpoints/rpc-endpoints) |
