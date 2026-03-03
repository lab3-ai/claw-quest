---
title: "Escrow Mainnet Integration (BNB + Base)"
description: "Deploy escrow contract to Base + BNB mainnet, add BSC Testnet, implement ESCROW_NETWORK_MODE env separation"
status: in_progress
priority: P1
effort: 6h
branch: main
tags: [escrow, blockchain, infra, backend, frontend]
created: 2026-03-02
---

# Escrow Mainnet Integration (BNB + Base)

## Overview

Production shows "Escrow not configured". Deploy ClawQuestEscrow to Base mainnet + BNB mainnet. Add BSC Testnet for local dev. Replace `ENABLE_TESTNETS` with `ESCROW_NETWORK_MODE=testnet|mainnet` for clean env separation.

## Brainstorm Report

[brainstorm-260302-1902-escrow-mainnet-integration.md](../reports/brainstorm-260302-1902-escrow-mainnet-integration.md)

## Key Decisions

- `ESCROW_NETWORK_MODE` deploy-time env var (testnet→only testnets, mainnet→only mainnets)
- 2 envs: local=testnet (Base Sepolia + BSC Testnet), prod=mainnet (Base + BNB)
- Trim `ESCROW_CHAIN_IDS` to [8453, 84532, 56, 97] — remove ETH/Arbitrum/Polygon
- Single operator key across all chains, EOA admin (multisig later)
- BNB tokens: USDC + USDT + BNB native

## Phases

| # | Phase | Status | Effort | Link |
|---|-------|--------|--------|------|
| 1 | Chain Registry + Config | Complete | 1.5h | [phase-01](./phase-01-chain-registry-config.md) |
| 2 | Contract Deployments | Pending | 2h | [phase-02](./phase-02-contract-deployments.md) |
| 3 | Frontend Updates | Complete | 1.5h | [phase-03](./phase-03-frontend-updates.md) |
| 4 | Production Go-Live | Pending | 1h | [phase-04](./phase-04-production-go-live.md) |

## Dependencies

- Phase 1 → Phase 2 (registry must exist before deploy scripts reference token addresses)
- Phase 1 → Phase 3 (shared pkg must be rebuilt before dashboard can import new chains)
- Phase 2 → Phase 4 (contracts must be deployed before Railway env vars can reference them)
- Phase 3 can run parallel to Phase 2 (frontend just needs shared pkg, not deployed addresses)

## Chain Matrix

| Chain | ID | Env | Tokens | Status |
|-------|-----|------|--------|--------|
| Base Sepolia | 84532 | testnet | USDC, ETH | LIVE |
| BSC Testnet | 97 | testnet | USDT, tBNB | NEW |
| Base | 8453 | mainnet | USDC, USDT, ETH | NEW |
| BNB Smart Chain | 56 | mainnet | USDC, USDT, BNB | NEW |
