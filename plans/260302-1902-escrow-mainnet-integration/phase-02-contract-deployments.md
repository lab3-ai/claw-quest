# Phase 2: Contract Deployments

## Overview
- **Priority:** P1
- **Status:** Pending
- **Effort:** 2h
- **Blocked by:** Phase 1

Deploy ClawQuestEscrow (UUPS proxy + implementation) to BSC Testnet (97), Base Mainnet (8453), BNB Mainnet (56). Verify on explorers.

## Key Insights

- Existing `Deploy.s.sol` is fully parameterized (env vars for admin, operator, USDC, USDT) — reusable as-is
- Each chain needs a `.env.<chain>` file for Foundry with chain-specific addresses
- BNB USDC/USDT are 18 decimals (not 6) — contract handles this fine (stores raw amounts)
- BSC Testnet faucet: https://testnet.bnbchain.org/faucet-smart
- Base Sepolia proxy stays at `0xe1d2b3d041934e2f245d5a366396e4787d3802c1`

## Related Code Files

### Existing (no changes)
- `contracts/src/ClawQuestEscrow.sol` — contract code unchanged
- `contracts/script/Deploy.s.sol` — deploy script unchanged

### Create
- `contracts/.env.bsc-testnet` — BSC Testnet deploy vars
- `contracts/.env.base-mainnet` — Base Mainnet deploy vars
- `contracts/.env.bnb-mainnet` — BNB Mainnet deploy vars

## Implementation Steps

### 1. Prepare Deployer Wallet

**1.1** Use same EOA for all chains (or create dedicated deployer)
- Fund with gas: ~0.01 ETH on Base, ~0.1 BNB on BNB chain, ~0.1 tBNB on BSC Testnet
- This wallet gets DEFAULT_ADMIN_ROLE initially

**1.2** Operator address = same `OPERATOR_PRIVATE_KEY` across all chains
- Fund with gas for distribute/refund txs: ~0.005 ETH on Base, ~0.05 BNB on BNB

### 2. Create Chain-Specific Env Files

**2.1** `contracts/.env.bsc-testnet`:
```bash
DEPLOYER_PRIVATE_KEY=0x...
ADMIN_ADDRESS=0x...          # deployer EOA
OPERATOR_ADDRESS=0x...       # hot wallet
USDC_ADDRESS=0x0000000000000000000000000000000000000000  # skip if no testnet USDC
USDT_ADDRESS=0x337610d27c682E347C9cD60BD4b3b107C9d34dDd  # BSC testnet USDT
```

**2.2** `contracts/.env.base-mainnet`:
```bash
DEPLOYER_PRIVATE_KEY=0x...
ADMIN_ADDRESS=0x...          # deployer EOA (migrate to Safe later)
OPERATOR_ADDRESS=0x...       # prod hot wallet
USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
USDT_ADDRESS=0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2
```

**2.3** `contracts/.env.bnb-mainnet`:
```bash
DEPLOYER_PRIVATE_KEY=0x...
ADMIN_ADDRESS=0x...          # deployer EOA (migrate to Safe later)
OPERATOR_ADDRESS=0x...       # prod hot wallet
USDC_ADDRESS=0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d
USDT_ADDRESS=0x55d398326f99059fF775485246999027B3197955
```

### 3. Deploy to BSC Testnet (97) — Test First

```bash
cd contracts
source .env.bsc-testnet

forge script script/Deploy.s.sol \
  --rpc-url https://data-seed-prebsc-1-s1.binance.org:8545 \
  --broadcast \
  --verify \
  --etherscan-api-key $BSCSCAN_API_KEY \
  --verifier-url https://api-testnet.bscscan.com/api
```

**3.1** Record proxy address → update local `.env` with `ESCROW_CONTRACT_97=0x...`
**3.2** Verify on testnet.bscscan.com — check proxy, implementation, roles
**3.3** Test deposit with faucet tBNB (native deposit)

### 4. Deploy to Base Mainnet (8453)

```bash
source .env.base-mainnet

forge script script/Deploy.s.sol \
  --rpc-url https://mainnet.base.org \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY
```

**4.1** Record proxy address → `ESCROW_CONTRACT_8453=0x...`
**4.2** Verify on basescan.org
**4.3** Confirm USDC + USDT in allowlist (check `setTokenAllowed` events)

### 5. Deploy to BNB Mainnet (56)

```bash
source .env.bnb-mainnet

forge script script/Deploy.s.sol \
  --rpc-url https://bsc-dataseed.binance.org \
  --broadcast \
  --verify \
  --etherscan-api-key $BSCSCAN_API_KEY \
  --verifier-url https://api.bscscan.com/api
```

**5.1** Record proxy address → `ESCROW_CONTRACT_56=0x...`
**5.2** Verify on bscscan.com
**5.3** Confirm USDC + USDT in allowlist

### 6. Post-Deploy Verification

For each chain, verify via cast:
```bash
# Check admin role
cast call $PROXY "hasRole(bytes32,address)(bool)" \
  0x0000000000000000000000000000000000000000000000000000000000000000 \
  $ADMIN_ADDRESS --rpc-url $RPC

# Check operator role
cast call $PROXY "hasRole(bytes32,address)(bool)" \
  $(cast keccak "OPERATOR_ROLE") \
  $OPERATOR_ADDRESS --rpc-url $RPC

# Check token allowlist
cast call $PROXY "allowedTokens(address)(bool)" $USDC_ADDRESS --rpc-url $RPC
```

## Todo List

- [ ] Fund deployer wallet on Base + BNB + BSC Testnet
- [ ] Fund operator wallet on Base + BNB + BSC Testnet
- [ ] Create .env.bsc-testnet
- [ ] Create .env.base-mainnet
- [ ] Create .env.bnb-mainnet
- [ ] Deploy to BSC Testnet (97)
- [ ] Verify BSC Testnet contract on explorer
- [ ] Test native deposit on BSC Testnet
- [ ] Deploy to Base Mainnet (8453)
- [ ] Verify Base Mainnet contract on explorer
- [ ] Deploy to BNB Mainnet (56)
- [ ] Verify BNB Mainnet contract on explorer
- [ ] Verify roles + allowlist on all chains via cast
- [ ] Record all proxy addresses

## Success Criteria

- 3 new UUPS proxies deployed (BSC Testnet, Base Mainnet, BNB Mainnet)
- All contracts verified on respective explorers
- Admin + Operator roles correctly assigned
- USDC/USDT in allowlist on each chain (where applicable)
- Test deposit works on BSC Testnet

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Wrong token address in allowlist | Triple-verify from official token lists (CoinGecko, chain docs) |
| Insufficient gas | Pre-fund generously; BNB gas is very cheap |
| Deploy script failure on BSC | BSC uses different gas pricing — may need `--legacy` flag |
| Private key exposure | Use `.env.*` files, add to `.gitignore` |

## Security Considerations

- `.env.base-mainnet` and `.env.bnb-mainnet` contain REAL private keys → **NEVER commit**
- Add `contracts/.env.*` to `.gitignore` if not already
- Admin wallet holds upgrade power — keep key in cold storage after deploy
- Operator key funded with minimum gas only (limit blast radius)
