# Brainstorm: Escrow Multi-Chain Config Simplification

**Date:** 2026-03-03  
**Status:** Complete  
**Participants:** Founder/Dev + Brainstormer

---

## Problem Statement

The current escrow configuration requires multiple env vars per chain (`ESCROW_CONTRACT_{chainId}`, `RPC_URL_{name}`) and hardcodes supported chain IDs in the shared package. Adding a new EVM chain requires code changes across 3+ files. The founder wants to:

1. Simplify env vars (fewer, more manageable)
2. Use one wallet for deployer + operator
3. Potentially deploy the same contract address on all chains (CREATE2)
4. Enable admin-driven chain expansion without code deploys

---

## 1. Env Var Strategy

### Option A: Current (Individual Vars)
```
ESCROW_CONTRACT_84532=0x...
ESCROW_CONTRACT_8453=0x...
ESCROW_CONTRACT_56=0x...
RPC_URL_BASE=https://...
RPC_URL_BASE_SEPOLIA=https://...
```

**Pros:**
- Clear, self-documenting
- Easy to override a single chain
- Railway UI shows each var individually (searchable)
- Backward-compatible legacy `ESCROW_CONTRACT` fallback already works

**Cons:**
- O(n) vars as chains grow (currently 4-8 vars for contract addresses alone)
- Must update `.env.example` per chain
- No single source of truth for "which chains are active"

### Option B: JSON Env Var
```
ESCROW_CONTRACTS={"84532":"0x...","8453":"0x...","56":"0x..."}
ESCROW_RPC_URLS={"84532":"https://...","8453":"https://..."}
```

**Pros:**
- Single var per concern (contracts, RPCs)
- Adding a chain = editing one JSON string
- Implicitly defines active chains (keys of the JSON)

**Cons:**
- Railway UI: editing JSON in a text field is error-prone (no syntax highlighting)
- Hard to diff in git history or env diff tools
- JSON parse errors at boot = cryptic crash
- Quoting hell in shell scripts and Docker

**Verdict: NOT recommended.** The DX is poor despite the appeal of fewer vars.

### Option C: Single Address + Chain IDs List (Deterministic Deploy)
```
ESCROW_CONTRACT=0xe1d2b3d0...     # same address on ALL chains
ESCROW_CHAIN_IDS=84532,8453,56    # active chains, comma-separated
ESCROW_NETWORK_MODE=testnet       # kept for frontend filtering
OPERATOR_PRIVATE_KEY=0x...
```

**Pros:**
- Minimal vars (3-4 total for escrow config)
- `ESCROW_CHAIN_IDS` is the single source of truth
- Adding a chain = append an ID + fund gas + ensure contract is deployed there
- No code changes needed for new chains

**Cons:**
- Requires CREATE2 deterministic deploys (see Section 3)
- Cannot have different addresses per chain (if one deploy fails, must redeploy all)
- Already-deployed Base Sepolia proxy (`0xe1d2...`) was NOT deployed via CREATE2, so it won't match

**IMPORTANT GOTCHA:** The existing Base Sepolia deployment was done with regular CREATE (nonce-based). You CANNOT retroactively make it a CREATE2 address. Any CREATE2 strategy means deploying fresh proxies on ALL chains (including re-deploying on Base Sepolia with a new address).

### Option D (RECOMMENDED): Hybrid — Single Default + Per-Chain Overrides + Chain List
```
# Chain management
ESCROW_CHAIN_IDS=84532,8453,56          # active chains (comma-separated)
ESCROW_DEFAULT_CHAIN_ID=84532           # default for new quests

# Contract addresses (override per chain, or use ESCROW_CONTRACT for all)
ESCROW_CONTRACT=0xe1d2b3d0...           # default address (used if no per-chain override)
# ESCROW_CONTRACT_56=0xDIFFERENT...     # optional override for BNB

# Operator
OPERATOR_PRIVATE_KEY=0x...

# RPC (optional overrides, falls back to public endpoints)
# RPC_URL_84532=https://...
# RPC_URL_8453=https://...
```

**Pros:**
- `ESCROW_CHAIN_IDS` is the single source of truth for active chains (no code changes)
- Default address works when using CREATE2 for new chains
- Per-chain overrides handle legacy deploys (Base Sepolia) or exceptions
- Backward-compatible with current setup
- Minimal vars for the common case (same address everywhere)
- RPC keys use numeric chain IDs consistently (currently mixed: `RPC_URL_BASE` vs `RPC_URL_BASE_SEPOLIA`)

**Cons:**
- Slightly more complex parsing logic (but one-time cost)
- Still need code-level chain metadata (name, explorer, tokens) in `chains.ts`

**Why this wins:** It gives you the simplicity of Option C when addresses match, the flexibility of Option A when they don't, and the admin-driven chain list you want. No forced migration of existing deployment.

---

## 2. Deployer = Operator (Single Wallet)

### Current Architecture
```
Contract Roles:
  DEFAULT_ADMIN_ROLE  → multisig (for setTokenAllowed, pause, upgrade)
  OPERATOR_ROLE       → hot wallet (for distribute, refund, pause)
  UPGRADER_ROLE       → multisig only
  PAUSER_ROLE         → both admin + operator
```

The question is whether the deployer wallet and the operator wallet should be the same key.

### Analysis

**What the deployer does:**
- Deploys implementation + proxy (one-time per chain)
- Calls `initialize(admin, operator)` (one-time)
- Calls `setTokenAllowed()` during setup (one-time, then admin takes over)

**What the operator does:**
- Calls `distribute()` and `refund()` (ongoing, from backend)
- Has OPERATOR_ROLE but NOT DEFAULT_ADMIN_ROLE or UPGRADER_ROLE

**Can they be the same key?** Yes, with caveats.

**Risk analysis if the single key is compromised:**
- Attacker can call `distribute()` to drain funds to arbitrary addresses (CRITICAL)
- Attacker can call `refund()` to send funds back to sponsors (annoying but not theft)
- Attacker can call `pause()` (disruptive)
- Attacker CANNOT upgrade the contract (UPGRADER_ROLE = multisig only)
- Attacker CANNOT change token allowlist (DEFAULT_ADMIN_ROLE = multisig only)
- Attacker CANNOT revoke their own OPERATOR_ROLE (only admin can)

**The deployer key doesn't add any extra blast radius.** After deployment, the deployer has no special on-chain privileges unless it was also set as admin. In your current `Deploy.s.sol`, the deployer calls `initialize(admin, operator)` — the deployer itself gets NO roles. So the deployer key is "dead" after deploy.

### Recommendation: MERGE deployer + operator

Use one wallet. Here is why:
1. The deployer key has zero on-chain power post-deployment
2. You need to fund gas on each chain anyway — one wallet means one set of gas balances
3. The blast radius is identical (only OPERATOR_ROLE either way)
4. Keep the multisig separate as DEFAULT_ADMIN (you already do this)
5. Key rotation: if operator is compromised, admin multisig revokes OPERATOR_ROLE and grants to new address

**Name it clearly:** `OPERATOR_PRIVATE_KEY` (already the case). The deploy script already reads `DEPLOYER_PRIVATE_KEY` — just set both to the same value, or update the deploy script to use `OPERATOR_PRIVATE_KEY`.

---

## 3. Deterministic Deploys (CREATE2)

### How CREATE2 Works
```
address = keccak256(0xFF ++ deployer ++ salt ++ keccak256(bytecode ++ constructorArgs))
```

For the same address on all chains, you need:
1. **Same deployer address** — use the canonical CREATE2 deployer (`0x4e59b44847b379578588920ca78fbf26c0b4956c`, present on most EVM chains)
2. **Same bytecode** — identical compiler output (same solc version, same EVM target, same source)
3. **Same constructor args** — for ERC1967Proxy, this means `(implementationAddress, initData)` must be identical
4. **Same salt** — you choose this

### The UUPS Proxy + CREATE2 Problem

Your deploy flow is:
```
1. Deploy implementation (CREATE) → address varies per chain
2. Deploy ERC1967Proxy(implementation, initData) (CREATE) → address varies
```

For deterministic addresses, you need:
```
1. Deploy implementation via CREATE2 with salt → SAME address on all chains
2. Deploy ERC1967Proxy via CREATE2 with salt → SAME address on all chains
   BUT: proxy constructor takes implementation address as arg
   IF implementation address is the same → proxy address will be the same ✓
```

This works IF:
- You use the same salt for each step
- Compiler output is byte-identical (pin solc version + EVM version in foundry.toml)
- `initData` is identical (same admin + operator addresses on all chains)

### Foundry CREATE2 Syntax
```solidity
// In deploy script:
bytes32 salt = bytes32(uint256(1)); // or keccak256("clawquest-escrow-v1")

// Foundry default CREATE2 deployer
vm.startBroadcast(deployerKey);

// Deploy implementation via CREATE2
ClawQuestEscrow impl = new ClawQuestEscrow{salt: salt}();

// Deploy proxy via CREATE2
bytes memory initData = abi.encodeCall(ClawQuestEscrow.initialize, (admin, operator));
ERC1967Proxy proxy = new ERC1967Proxy{salt: salt}(address(impl), initData);
```

Or use `forge create --create2`:
```bash
forge create src/ClawQuestEscrow.sol:ClawQuestEscrow \
  --rpc-url $RPC \
  --private-key $KEY \
  --create2 \
  --salt 0x...
```

### Gotchas

1. **Existing Base Sepolia deploy is NOT CREATE2.** Must redeploy. Any funded quests on the current contract would need to be migrated or refunded first.

2. **`initData` must match across chains.** This means the same admin multisig address and same operator address on all chains. This is fine since EOA addresses are chain-agnostic.

3. **Solidity compiler version + EVM target must be pinned.** Already the case in `foundry.toml`. But be careful with `PUSH0` (Solidity >=0.8.20, only on chains supporting Shanghai EVM). Base and BSC both support it, but verify before deploying to exotic chains.

4. **Token allowlist is per-chain.** After deterministic deploy, you still need per-chain `setTokenAllowed()` calls since USDC/USDT addresses differ per chain.

5. **The canonical CREATE2 deployer (`0x4e59b44...`) must exist on the target chain.** It does on all major EVM chains (Base, BSC, Arbitrum, Polygon, etc.) but verify for niche chains.

### Verdict: CREATE2 IS VIABLE but NOT URGENT

- It is a nice-to-have for "single address everywhere" simplicity
- Option D (hybrid env vars) already handles the "different address per chain" case gracefully
- If you do CREATE2 later, Option D's default `ESCROW_CONTRACT` covers it naturally
- The migration cost (redeploy on Base Sepolia, update all references) is not trivial

**Recommendation:** Implement Option D now. When you are ready to deploy to mainnet chains, use CREATE2 for those fresh deploys. The existing Base Sepolia testnet deploy can stay as-is (or be redeployed at your convenience).

---

## 4. Admin Expansion Guide (How to Add a New Chain)

With Option D implemented, adding a new EVM chain requires:

### Steps (NO code deploy needed)

1. **Deploy contract on new chain:**
   ```bash
   # Using CREATE2 for deterministic address (recommended for new chains)
   DEPLOYER_PRIVATE_KEY=$OPERATOR_PRIVATE_KEY \
   ADMIN_ADDRESS=0xYourMultisig \
   OPERATOR_ADDRESS=0xYourOperator \
   USDC_ADDRESS=0xChainSpecificUSDC \
   forge script script/Deploy.s.sol \
     --rpc-url $NEW_CHAIN_RPC \
     --broadcast --verify \
     --create2
   ```

2. **Fund operator wallet with gas** on the new chain (ETH/BNB/etc.)

3. **Update Railway env vars:**
   ```
   ESCROW_CHAIN_IDS=84532,8453,56,42161    # append new chain ID
   # If CREATE2 address matches → no ESCROW_CONTRACT_42161 needed
   # If different address → add ESCROW_CONTRACT_42161=0x...
   # If custom RPC needed → add RPC_URL_42161=https://...
   ```

4. **Restart API** (Railway auto-restarts on env change)

5. **Frontend:** Update `apps/dashboard/src/lib/wagmi.ts` to include the new chain in the chain array. This is the ONE remaining code change needed. (Future improvement: make wagmi config dynamic based on an API endpoint.)

### What DOES require code changes:
- Adding chain metadata to `SUPPORTED_CHAINS` in `packages/shared/src/chains.ts` (name, explorer URL, native currency)
- Adding token addresses to `TOKEN_REGISTRY` in the same file
- Adding viem chain import in `escrow.client.ts` (`CHAIN_MAP`)
- Frontend wagmi chain config

### Mitigation: Dynamic Chain Registry (Future)
To truly eliminate code changes, you could:
- Move `SUPPORTED_CHAINS` and `TOKEN_REGISTRY` to the database
- Expose `GET /chains` API endpoint
- Frontend fetches chain config dynamically
- **But this is YAGNI for 4-8 chains.** Only worth it if you plan 15+ chains.

---

## 5. Security Considerations

### Hot Wallet Risk
- **Current:** Single `OPERATOR_PRIVATE_KEY` env var in Railway
- **Blast radius:** Can call `distribute()` (drain to arbitrary addresses) and `refund()` (return to sponsors)
- **Cannot:** Upgrade contract, change allowlist, grant roles

### Mitigations (prioritized)

1. **Rate limiting on distribute** (backend, not on-chain): Add a "max daily distribution" config. If exceeded, require admin approval. LOW effort, HIGH value.

2. **Monitoring:** Set up alerts for:
   - Any `distribute()` call where recipient is not in the DB
   - Operator gas balance dropping below threshold
   - Unusual transaction patterns (e.g., 10 distributes in 1 minute)
   - Use a service like Tenderly, OpenZeppelin Defender, or simple cron checking etherscan API

3. **Minimum gas funding:** Keep only 0.01-0.05 ETH/BNB per chain. The operator only needs gas for distribute/refund (cheap). No reason to hold more.

4. **Key rotation procedure:**
   ```
   1. Generate new operator key
   2. Admin multisig calls grantRole(OPERATOR_ROLE, newAddress) 
   3. Admin multisig calls revokeRole(OPERATOR_ROLE, oldAddress)
   4. Update OPERATOR_PRIVATE_KEY in Railway
   5. Fund new address with gas on all active chains
   ```
   Document this as a runbook.

5. **Multisig for admin:** Already using this (good). Ensure UPGRADER_ROLE stays on multisig only.

6. **Future:** Consider a "timelock" on large distributions (>$10k) — operator submits, admin confirms after delay. Only if TVL grows significantly.

---

## Recommended Implementation

### Phase 1: Config Simplification (Option D)
**Effort: ~2-4 hours**

1. Update `escrow.config.ts`:
   - Parse `ESCROW_CHAIN_IDS` env var (comma-separated) as the active chain list
   - Fall back to hardcoded `ESCROW_CHAIN_IDS` from shared package if env var is missing
   - Keep per-chain override logic but use numeric `RPC_URL_{chainId}` consistently

2. Update `chains.ts` in shared package:
   - Keep `SUPPORTED_CHAINS` and `TOKEN_REGISTRY` as-is (metadata still needed in code)
   - Make `getActiveEscrowChainIds()` read from the env-parsed list

3. Update `.env.example`

4. Update `escrow.poller.ts`:
   - Poll ALL active chain IDs, not just `defaultChainId` (current bug — only polls one chain)

### Phase 2: CREATE2 Deploy Script
**Effort: ~3-4 hours**

1. Create `script/DeployCreate2.s.sol` alongside existing `Deploy.s.sol`
2. Pin salt: `keccak256("clawquest-escrow-v1")`
3. Test on Anvil fork that addresses match across chains
4. Use for all future chain deployments

### Phase 3: Admin Runbook
**Effort: ~1 hour**

1. Write `docs/CHAIN_EXPANSION_GUIDE.md`
2. Include: deploy command, env var updates, gas funding checklist, verification steps
3. Include key rotation procedure

### NOT recommended now:
- Database-backed chain registry (YAGNI)
- JSON env vars (bad DX)
- Redeploying Base Sepolia with CREATE2 (unnecessary for testnet)

---

## Success Criteria

- [ ] Adding a new chain requires 0 code deploys (env var + contract deploy only)
- [ ] Poller monitors ALL active chains (not just default)
- [ ] Single `OPERATOR_PRIVATE_KEY` handles all chains
- [ ] Chain expansion documented with copy-paste commands
- [ ] Key rotation procedure documented

---

## Unresolved Questions

1. **Poller single-chain bug:** The current `startEscrowPoller()` only polls `defaultChainId`. When do you want to fix this? (Phase 1 is the natural time.)

2. **Frontend chain dynamism:** The wagmi config currently hardcodes chains. Is it acceptable to require a dashboard redeploy when adding a chain? (Likely yes for <10 chains.)

3. **Base Sepolia redeployment:** Any active funded quests on the current proxy? If so, they need refunding before any address change. If not (testnet only), no migration needed.

4. **Multisig address:** Same multisig on all chains, or per-chain? (Same is simpler and recommended unless there is a regulatory reason to separate.)

5. **BSC Testnet / BNB Mainnet timeline:** Are these still planned? The contract and config support them but no deployment has happened.

---

## Sources
- [Foundry: Deterministic Deployments with CREATE2](https://www.getfoundry.sh/guides/deterministic-deployments-using-create2)
- [Arachnid Deterministic Deployment Proxy](https://github.com/Arachnid/deterministic-deployment-proxy)
- [Foundry Issue #5871: CREATE2 Cross-Chain Address Differences](https://github.com/foundry-rs/foundry/issues/5871)
- [OpenZeppelin: Deploy and Upgrade Smart Contracts](https://docs.openzeppelin.com/defender/tutorial/deploy)
