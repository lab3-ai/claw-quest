---
title: "Dashboard Fund Page — Review & Improvements"
description: "Fund page already exists with full wagmi/RainbowKit flow; plan covers gaps and hardening"
status: in-progress
priority: P2
effort: 2h
branch: main
tags: [dashboard, escrow, wagmi, wallet]
created: 2026-03-01
---

# Dashboard Fund Page

## Status: ALREADY IMPLEMENTED

The fund page (`/quests/:questId/fund`) is **fully functional**. The scout reveals a complete implementation across 3 files. This plan documents what exists, identifies gaps, and proposes improvements.

## What Already Exists

### 1. Route — `apps/dashboard/src/routes/_authenticated/quests/$questId/fund.tsx` (409 lines)
- Full wagmi integration: `useAccount`, `useChainId`, `useSwitchChain`, `useWriteContract`, `useWaitForTransactionReceipt`
- RainbowKit `<ConnectButton />` for wallet connection
- Step machine: connect -> approve -> deposit -> confirming -> success (+ error)
- ERC20 approve flow (skipped for native tokens)
- `depositNative()` for ETH/BNB/POL, `deposit()` for USDC/USDT
- Chain switching prompt when wallet is on wrong network
- Polling for backend confirmation (refetch quest every 5s during "confirming" step)
- Explorer tx link component
- Already-funded detection (skips to success)

### 2. CSS — `apps/dashboard/src/styles/pages/fund-quest.css` (265 lines)
- Full styling: card layout, step indicator, spinner, success/error states
- Uses design system variables (`--fg`, `--fg-muted`, `--border`, `--accent`, `--green`, `--red`)

### 3. API Endpoint — `GET /escrow/deposit-params/:questId` in `escrow.routes.ts`
- Returns: contractAddress, questIdBytes32, tokenAddress, tokenSymbol, tokenDecimals, amount, amountSmallestUnit, chainId, chainName, expiresAt, isNative
- Resolves token from quest.rewardType + chain token registry
- UUID-to-bytes32 conversion via shared `uuidToBytes32()`

### 4. Supporting Infrastructure
- **wagmi config** (`apps/dashboard/src/lib/wagmi.ts`): RainbowKit `getDefaultConfig` with Base, Base Sepolia, mainnet, BSC, Arbitrum, Polygon
- **WagmiProvider + RainbowKitProvider** in `apps/dashboard/src/main.tsx`
- **Shared ABI** (`packages/shared/src/escrow-abi.ts`): full ESCROW_ABI + ERC20_APPROVE_ABI
- **Shared utils** (`packages/shared/src/escrow-utils.ts`): `uuidToBytes32`, `toSmallestUnit`, `fromSmallestUnit`
- **Token registry** (`packages/shared/src/chains.ts`): per-chain USDC/USDT/NATIVE addresses + decimals
- **Navigation**: create quest page (`create.tsx`) already has `fundAfterSave` ref that navigates to `/quests/$questId/fund`

### 5. Related Pages
- **Manage page** (`manage.tsx`): shows escrow status, distribute/refund buttons
- **Create page** (`create.tsx`): "Create & Fund" button navigates to fund page after save

## Identified Gaps & Improvements

### Phase 1 — Critical Fixes (30min)

| # | Issue | File | Fix |
|---|-------|------|-----|
| 1 | **File too long** — fund.tsx is 409 lines, exceeds 200-line rule | `fund.tsx` | Extract `TxLink`, step indicator, summary section into separate files |
| 2 | **No allowance check** — approve step always fires, even if allowance already sufficient | `fund.tsx` | Add `useReadContract` for `allowance()` check; skip approve if allowance >= amount |
| 3 | **No balance check** — user can attempt deposit without sufficient token balance | `fund.tsx` | Add `useReadContract` for `balanceOf()` or `useBalance`; show insufficient funds warning |
| 4 | **Missing `createFileRoute`** — file exports `FundQuest` function but no TanStack Router file route | `fund.tsx` | Verify route registration pattern; may need `createFileRoute` or route config entry |

### Phase 2 — UX Polish (45min)

| # | Improvement | Details |
|---|-------------|---------|
| 5 | **Token balance display** — show wallet balance next to deposit amount | Read balance via wagmi `useBalance` / `useReadContract(balanceOf)` |
| 6 | **Approve amount: exact vs max** — let user choose exact amount or unlimited approval | Add toggle; default to exact amount for security |
| 7 | **Better error messages** — decode contract revert reasons | Parse `QuestAlreadyFunded`, `TokenNotAllowed`, etc. from ABI errors |
| 8 | **Mobile responsive** — fund-card should work on narrow screens | Check CSS media queries in fund-quest.css |
| 9 | **Loading skeleton** — replace "Loading deposit parameters..." with skeleton card | Use existing patterns from other pages |

### Phase 3 — Nice-to-Have (45min)

| # | Feature | Details |
|---|---------|---------|
| 10 | **Tx confirmation count** — show "2/5 confirmations" during confirming step | Use `useWatchBlockNumber` + compare with receipt block |
| 11 | **Gas estimate** — show estimated gas cost before deposit | `useEstimateGas` from wagmi |
| 12 | **Copy contract address** — click to copy full address | Small clipboard button |

## File Map

### Files to Modify
- `apps/dashboard/src/routes/_authenticated/quests/$questId/fund.tsx` — refactor + add checks

### Files to Create
- `apps/dashboard/src/components/escrow/fund-step-indicator.tsx` — extracted step indicator
- `apps/dashboard/src/components/escrow/fund-summary.tsx` — extracted summary card
- `apps/dashboard/src/components/escrow/tx-link.tsx` — extracted tx link component
- `apps/dashboard/src/hooks/useTokenBalance.ts` — hook for balance + allowance checks

### Files Unchanged (reference only)
- `apps/dashboard/src/lib/wagmi.ts` — already configured
- `apps/dashboard/src/styles/pages/fund-quest.css` — already complete
- `packages/shared/src/escrow-abi.ts` — already has full ABI
- `packages/shared/src/escrow-utils.ts` — already has ERC20_APPROVE_ABI
- `apps/api/src/modules/escrow/escrow.routes.ts` — deposit-params endpoint works
- `apps/api/src/modules/escrow/escrow.service.ts` — getDepositParams works

## Implementation Steps

### Step 1: Extract components from fund.tsx (keep under 200 lines each)
1. Create `apps/dashboard/src/components/escrow/tx-link.tsx` — move `TxLink` + `getExplorerTxUrl`
2. Create `apps/dashboard/src/components/escrow/fund-step-indicator.tsx` — step dots UI
3. Create `apps/dashboard/src/components/escrow/fund-summary.tsx` — deposit params summary card
4. Update `fund.tsx` to import extracted components

### Step 2: Add allowance + balance checks
1. Create `apps/dashboard/src/hooks/useTokenBalance.ts`:
   - `useTokenAllowance(tokenAddress, ownerAddress, spenderAddress)` — reads ERC20 allowance
   - `useTokenBalance(tokenAddress, ownerAddress)` — reads ERC20 balance or native balance
2. In fund.tsx, check allowance before showing approve step
3. Show "Insufficient balance" warning when balance < amount

### Step 3: Improve error handling
1. Add contract error decoding using wagmi's `decodeErrorResult` with ESCROW_ABI
2. Map known errors: QuestAlreadyFunded, TokenNotAllowed, ZeroAmount, etc. to user-friendly messages

### Step 4: Verify route registration
1. Confirm TanStack Router file-based routing picks up `$questId/fund.tsx`
2. If not, add explicit `createFileRoute` export

## Architecture Notes

```
fund.tsx (main orchestrator, <200 lines)
  |-- FundStepIndicator (step dots)
  |-- FundSummary (deposit params card)
  |-- ConnectButton (RainbowKit)
  |-- Approve/Deposit buttons (wagmi writeContract)
  |-- TxLink (explorer link)
  |-- useTokenBalance hook (balance + allowance)
```

**Data flow:**
```
API: GET /escrow/deposit-params/:questId
  -> { contractAddress, questIdBytes32, tokenAddress, amount, chainId, isNative, expiresAt }

Wallet: approve(contractAddress, amount) -> deposit(questId, token, amount, expiresAt)
  -> tx confirmed on-chain
  -> backend poller detects QuestFunded event
  -> quest.fundingStatus = 'confirmed'
  -> frontend polling picks up status change -> success
```

## Success Criteria
- [ ] fund.tsx under 200 lines (extracted components)
- [ ] Allowance pre-check skips unnecessary approve tx
- [ ] Balance check prevents wasted gas on insufficient funds
- [ ] All error states show user-friendly messages
- [ ] Existing flow still works end-to-end (connect -> approve -> deposit -> confirm)

## Risk Assessment
- **Low risk**: All changes are additive/refactoring; core wagmi flow already works
- **RainbowKit v2 compat**: Current setup uses RainbowKit v2 + wagmi v2 — any new hooks must match v2 API
- **Testnet deployment**: Cannot test deposit flow without deployed contract on Base Sepolia — need `ESCROW_CONTRACT_84532` env var set

## Unresolved Questions
1. Is the fund route correctly registered with TanStack Router's file-based routing? The file exists at `$questId/fund.tsx` but exports a named function `FundQuest` — need to verify if TanStack Router requires `createFileRoute` or a default export.
2. Should approve amount be exact or unlimited (MaxUint256)? Current code approves exact amount, which is safer but requires re-approval for each deposit.
3. Does the backend poller (`escrow.poller.ts`) actually run in dev? The poller needs env vars that may not be set locally.
