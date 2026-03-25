# Chain Expansion Guide

How to add a new EVM chain to ClawQuest escrow.

## Prerequisites

- Deployer private key (same key used for all chains)
- Admin multisig address (same across chains)
- Operator hot wallet address (same across chains)
- USDC/USDT token addresses on the target chain
- Gas funds for deployer + operator on the new chain

## Step 1: Deploy Contract (CREATE2)

Deploy using the deterministic CREATE2 script. Same deployer + same salt = same address.

```bash
cd contracts

# Set env vars
export DEPLOYER_PRIVATE_KEY=0x...
export ADMIN_ADDRESS=0x...
export OPERATOR_ADDRESS=0x...
export USDC_ADDRESS=0x...    # optional
export USDT_ADDRESS=0x...    # optional

# Deploy (replace RPC_URL with target chain)
forge script script/DeployCreate2.s.sol \
  --rpc-url $RPC_URL \
  --broadcast \
  --verify
```

The output will show the proxy address. It should match `ESCROW_CONTRACT` from previous deployments.

## Step 2: Fund Operator Gas

Send native gas tokens to the operator address on the new chain. The operator needs gas to call `distribute()` and `refund()`.

## Step 3: Configure Token Allowlist

If deployer != admin (production), the admin multisig must call:

```solidity
escrow.setTokenAllowed(USDC_ADDRESS, true);
escrow.setTokenAllowed(USDT_ADDRESS, true);  // if applicable
```

## Step 4: Add Chain to API

On Railway (or your deployment platform), update the env var:

```
# Before
ESCROW_CHAIN_IDS=84532,8453

# After (add new chain ID)
ESCROW_CHAIN_IDS=84532,8453,42161
```

If the chain needs a custom RPC URL (recommended for production):

```
RPC_URL_42161=https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY
```

## Step 5: Restart API

Restart the API service. On startup you should see:

```
[escrow:config] Active chains: [84532, 8453, 42161] (mode: mainnet)
[escrow:poller] Starting for chains [84532, 8453, 42161] (interval: 15000ms, confirmations: 5)
```

## Step 6: Verify

Check the health endpoint:

```bash
curl -H "Authorization: Bearer $TOKEN" https://api.clawquest.ai/escrow/health
```

Expected response includes the new chain in `activeChainIds` and `poller.chains`.

Check supported chains endpoint:

```bash
curl https://api.clawquest.ai/escrow/supported-chains
```

## Adding Chain to Frontend

The frontend chain list is hardcoded in `apps/dashboard/src/lib/wagmi.ts`. To add a new chain:

1. Import the chain from `viem/chains`
2. Add it to the appropriate array (testnet/mainnet)
3. Add chain metadata to `packages/shared/src/chains.ts` if not already present

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `ESCROW_CHAIN_IDS` | Yes | Comma-separated active chain IDs |
| `ESCROW_CONTRACT` | Yes | CREATE2 proxy address (shared all chains) |
| `ESCROW_CONTRACT_<chainId>` | No | Per-chain override (legacy) |
| `ESCROW_NETWORK_MODE` | Yes | `testnet` or `mainnet` |
| `OPERATOR_PRIVATE_KEY` | Yes | Operator hot wallet key |
| `RPC_URL_<chainId>` | No | Custom RPC URL per chain |

## Troubleshooting

**Poller not picking up new chain**: Check that `ESCROW_CHAIN_IDS` includes the chain ID and `ESCROW_NETWORK_MODE` matches (testnet chains need `testnet` mode).

**CREATE2 address mismatch**: Ensure you're using the exact same deployer key, solc version (0.8.24), and optimizer settings (200 runs) as previous deployments.

**No contract address for chain**: Set `ESCROW_CONTRACT` (shared) or `ESCROW_CONTRACT_<chainId>` (per-chain override).
