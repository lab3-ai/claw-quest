# Documentation Update: Escrow Mainnet Integration
**Date**: 2026-03-02
**Status**: Completed

## Summary
Updated project documentation to reflect escrow mainnet integration changes, including new `ESCROW_NETWORK_MODE` environment variable and multi-chain support.

## Changes Made

### 1. ARCHITECTURE.md
**Section**: Data Flows → Escrow Module
**Changes**:
- Added Network Mode explanation with testnet/mainnet chain breakdown
- Updated block cursor description to specify "per chain"
- Clarified health endpoint reports blocks per chain
- Now explicitly mentions active chains filtering

**Key Addition**:
```
- **Network Mode**: `ESCROW_NETWORK_MODE` env var controls active chains (testnet|mainnet)
  - **Testnet**: Base Sepolia (84532) + BSC Testnet (97)
  - **Mainnet**: Base (8453) + BNB Chain (56)
```

### 2. PROJECT_STATUS.md
**Sections Updated**:

#### API Endpoints
- Updated admin API header to reference network mode query param
- Clarified env-status endpoint returns environment status (active chains, network mode)
- Updated escrow health and tx-status descriptions to note multi-chain awareness

#### New Section: Environment Configuration
Added comprehensive new section covering:
- Network Mode table (testnet vs mainnet chains and use cases)
- Backend env vars (ESCROW_NETWORK_MODE, ESCROW_CHAIN_ID, per-chain contracts)
- Frontend env vars (VITE_ESCROW_NETWORK_MODE, VITE_WALLETCONNECT_PROJECT_ID)
- Supported chains list with chain IDs

**Key Additions**:
- Testnet: Base Sepolia (84532), BSC Testnet (97)
- Mainnet: Base (8453), BNB Chain (56)
- Clear separation between backend and frontend env vars

### 3. developers/onchain/README.md
**Section**: Supported chains
**Changes**:
- Restructured from flat table to mode-based organization
- Split into Testnet Mode and Mainnet Mode sections
- Separated tokens by chain (USDC for Base, BNB for BSC)
- Preserved future expansion plans (Polygon, Ethereum, Arbitrum)

**Key Update**:
```
### Testnet Mode
Base Sepolia (84532, USDC), BSC Testnet (97, BNB) → Supported

### Mainnet Mode
Base (8453, USDC), BNB Chain (56, BNB) → Supported
```

### 4. MEMORY.md (User Context)
**New Section**: Escrow Mainnet Integration (v0.10.0)
**Content**:
- Network mode environment variable explanation
- Testnet/mainnet chain breakdown
- Mention of NetworkMode type export from shared package
- Function signature changes (getActiveChains/getActiveEscrowChainIds take NetworkMode)
- Frontend wagmi config filtering details
- Admin API multi-env support via query params

## Files Updated
- `/Users/hd/clawquest/docs/ARCHITECTURE.md` (+10 lines, 101 total)
- `/Users/hd/clawquest/docs/PROJECT_STATUS.md` (+32 lines, 247 total)
- `/Users/hd/clawquest/docs/developers/onchain/README.md` (+20 lines, 120 total)
- `/Users/hd/.claude/projects/-Users-hd-clawquest/memory/MEMORY.md` (+9 lines, 99 total)

## Metrics
- All files remain well under 800 LOC limit
- No broken links or references
- All env vars correctly escaped with backslash for pipes (`\|`)
- Documentation now covers:
  - ✓ ENABLE_TESTNETS → ESCROW_NETWORK_MODE migration
  - ✓ VITE_ENABLE_TESTNETS → VITE_ESCROW_NETWORK_MODE migration
  - ✓ Chain ID list update (8453, 84532, 56, 97)
  - ✓ BSC Testnet (97) addition to supported chains
  - ✓ NetworkMode type usage
  - ✓ Multi-chain configuration

## Verification
- ✓ No references to old env vars remain in docs
- ✓ All chain IDs correct per implementation
- ✓ Tables properly formatted in Markdown
- ✓ Environment sections comprehensive and clear
- ✓ Token symbols match expected values (USDC for Base, BNB for BSC)

## Outstanding Questions
None. All changes aligned with provided requirements and verified against env files and changelog.
