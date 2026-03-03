# Phase 4: Production Go-Live

## Overview
- **Priority:** P1
- **Status:** Pending
- **Effort:** 1h
- **Blocked by:** Phase 2 (deployed contracts) + Phase 3 (frontend ready)

Configure Railway + Vercel production env vars, fund operator wallet, smoke test full deposit flow on mainnet.

## Key Insights

- Railway env vars set via dashboard or `railway variables set`
- Vercel env vars set via dashboard or `vercel env add`
- Operator needs gas on both Base (ETH) + BNB (BNB) for distribute/refund txs
- First real deposit is the ultimate smoke test
- Event poller must start processing on new chains after Railway redeploy

## Implementation Steps

### 1. Railway API Environment Variables

Set these in Railway dashboard for the API service:

```bash
# Replace old
# ENABLE_TESTNETS=false  ← REMOVE

# Add new
ESCROW_NETWORK_MODE=mainnet
ESCROW_CHAIN_ID=8453                              # default to Base
ESCROW_CONTRACT_8453=0x<base-mainnet-proxy>        # from Phase 2
ESCROW_CONTRACT_56=0x<bnb-mainnet-proxy>           # from Phase 2
OPERATOR_PRIVATE_KEY=0x<prod-operator-key>         # CRITICAL: use prod key, not dev
RPC_URL_BASE=https://mainnet.base.org              # or paid RPC (Alchemy/Infura)
RPC_URL_BNB=https://bsc-dataseed.binance.org       # or paid RPC
```

**NOTE:** Consider paid RPC providers for production reliability:
- Base: Alchemy, QuickNode, or Infura
- BNB: QuickNode, NodeReal, or Ankr

### 2. Vercel Dashboard Environment Variables

```bash
VITE_ESCROW_NETWORK_MODE=mainnet
```

Trigger redeploy after setting.

### 3. Fund Operator Wallet

**3.1** Base Mainnet:
- Send ~0.01 ETH to operator address for gas
- Each `distribute()` call costs ~0.002-0.005 ETH

**3.2** BNB Mainnet:
- Send ~0.05 BNB to operator address for gas
- Each `distribute()` call costs ~0.001-0.003 BNB
- BNB gas is very cheap

### 4. Smoke Test

**4.1** Create a test quest on production (small amount, e.g. 1 USDC on Base)
**4.2** Navigate to fund page — should NO LONGER show "Escrow not configured"
**4.3** Connect wallet → verify Base + BNB chains visible in RainbowKit
**4.4** Deposit 1 USDC on Base:
- Approve tx
- Deposit tx
- Wait for poller confirmation (check `/escrow/health` endpoint)
- Quest status → "confirmed"

**4.5** Check event poller:
- `GET /escrow/health` should show polling active on chainId 8453 + 56
- Last poll timestamps should be recent

**4.6** If deposit works → the "Escrow not configured" screenshot issue is resolved

### 5. Post-Launch Monitoring

- Watch `/escrow/health` for poller status
- Check Railway logs for event processing
- Monitor operator wallet balance (set alert if below 0.005 ETH / 0.01 BNB)

## Todo List

- [ ] Remove ENABLE_TESTNETS from Railway
- [ ] Set ESCROW_NETWORK_MODE=mainnet on Railway
- [ ] Set contract addresses on Railway (from Phase 2 deploy)
- [ ] Set RPC URLs (consider paid providers)
- [ ] Set VITE_ESCROW_NETWORK_MODE=mainnet on Vercel
- [ ] Trigger Railway redeploy
- [ ] Trigger Vercel redeploy
- [ ] Fund operator wallet on Base (ETH)
- [ ] Fund operator wallet on BNB (BNB)
- [ ] Smoke test: fund page loads (no error)
- [ ] Smoke test: deposit 1 USDC on Base
- [ ] Verify poller health endpoint
- [ ] Confirm quest funding status updates

## Success Criteria

- Production fund page loads without "Escrow not configured" error
- RainbowKit shows Base + BNB Smart Chain (no testnets)
- Real deposit works end-to-end (approve → deposit → poller confirms → quest funded)
- Event poller active on both chains
- No errors in Railway logs

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Wrong operator key in production | Double-check address matches contract's OPERATOR_ROLE |
| Public RPC rate-limited | Switch to paid RPC if issues arise (Alchemy/QuickNode) |
| Poller misses events after deploy | Poller starts from last cursor; if no cursor, starts from latest block |
| First deposit fails | Test with small amount (1 USDC), keep testnet as fallback |

## Security Considerations

- NEVER log or expose `OPERATOR_PRIVATE_KEY` in Railway logs
- Operator wallet should only hold gas — never tokens
- Monitor for unusual distribute/refund transactions
- Plan multisig migration for admin role within 2 weeks of go-live
