# Exploration: Fund Page Chain Selection Logic

**Date:** 2026-03-03  
**Scope:** How the fund page determines which blockchain to display for deposits  
**Thoroughness:** Deep - traced full flow from quest creation to fund page deposit params

---

## Executive Summary

The fund page determines which chain to display through a **3-tier fallback priority**:

1. **Query param override**: `GET /escrow/deposit-params/{questId}?chainId=X`
2. **On-chain funding**: `quest.cryptoChainId` (set when QuestFunded event fires)
3. **Escrow config default**: `escrowConfig.defaultChainId` (from env var or first active chain)

The chain name and token info are resolved from the shared chain registry using the numeric chain ID.

---

## Key Components

### 1. Dashboard Quest Creation (String-based selection)

**File**: `/Users/hd/clawquest/apps/dashboard/src/routes/_authenticated/quests/create.tsx`

User selects network as a **string** from dropdown:
- Primary: "Base", "BNB Smart Chain", "Ethereum"
- Other: "Arbitrum One", "Optimism", "Polygon", "Avalanche", "Solana"

```typescript
const [form, setForm] = useState<FormData>({
    // ... defaults
    network: "Base",  // STRING IDENTIFIER
    token: "USDC",
    // ...
})
```

This string is sent to the API when creating a quest:
```typescript
const payload = {
    network: form.network || undefined,  // "Base" → saved to DB
    // ...
}
```

**Token Contracts** are hardcoded by network name on dashboard:
```typescript
const TOKEN_CONTRACTS: Record<string, Record<string, string>> = {
    USDC: {
        "Base": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        "BNB Smart Chain": "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
        // ...
    },
}
```

### 2. API Quest Creation (String storage)

**File**: `/Users/hd/clawquest/apps/api/src/modules/quests/quests.service.ts`

The string `network` is stored directly in the database:
```typescript
const quest = await prisma.quest.create({
    data: {
        network: input.network || null,  // "Base" stored as string
        // ... other fields
    },
});
```

**Important**: At this point, there is NO numeric chain ID stored. The `cryptoChainId` field remains null until funds are deposited.

### 3. On-chain Deposit + Event Handler (Numeric chain ID set)

**File**: `/Users/hd/clawquest/apps/api/src/modules/escrow/escrow-event-handlers.ts`

When sponsor deposits funds via smart contract, the QuestFunded event includes the actual chain ID:

```typescript
export async function handleQuestFunded(
    prisma: PrismaClient,
    questIdBytes32: string,
    sponsor: string,
    token: string,
    amount: bigint,
    expiresAt: bigint,
    txHash: string,
    chainId: number,  // <-- FROM BLOCKCHAIN EVENT (8453, 56, etc.)
): Promise<void> {
    const questId = bytes32ToUuid(questIdBytes32);
    const quest = await prisma.quest.findUnique({ where: { id: questId } });
    
    // ...
    
    await prisma.quest.update({
        where: { id: questId },
        data: {
            fundingMethod: 'crypto',
            fundingStatus: 'confirmed',
            cryptoTxHash: txHash,
            cryptoChainId: chainId,  // <-- NUMERIC CHAIN ID NOW SET
            fundedAt: new Date(),
            sponsorWallet: sponsor,
            tokenAddress: token,
            tokenDecimals: tokenInfo?.decimals || null,
            // ...
        },
    });
}
```

**Quest state after funding:**
- `quest.network` = "Base" (STRING, from dashboard)
- `quest.cryptoChainId` = 8453 (NUMBER, from blockchain)
- `quest.fundingStatus` = "confirmed"

### 4. Fund Page Deposit Params Fetch

**File**: `/Users/hd/clawquest/apps/dashboard/src/routes/_authenticated/quests/$questId/fund.tsx`

```typescript
const { data: params, isLoading: paramsLoading, error: paramsError } = useQuery<DepositParams>({
    queryKey: ['deposit-params', questId],
    queryFn: async () => {
        const res = await fetch(`${API_BASE}/escrow/deposit-params/${questId}`)
        // Calls: GET /escrow/deposit-params/{questId}
        return res.json()
    },
    enabled: !!questId,
})
```

The returned `DepositParams` type includes:
```typescript
export interface DepositParams {
    contractAddress: string        // Escrow contract on the chain
    questIdBytes32: string        // UUID → bytes32 for contract
    tokenAddress: string          // ERC20 token on the chain
    tokenSymbol: string           // "USDC", "USDT", "ETH"
    tokenDecimals: number         // 6 for USDC, 18 for ETH
    amount: number                // Human-readable (500 = 500 USDC)
    amountSmallestUnit: string    // In smallest unit ("500000000" for 500 USDC)
    chainId: number               // Numeric: 8453, 56, 1, 84532, etc.
    chainName: string             // Human-readable: "Base", "BNB Smart Chain"
    expiresAt: number             // Unix timestamp
    isNative: boolean             // True if native token (ETH, BNB)
}
```

### 5. Escrow Routes - Chain Selection Priority

**File**: `/Users/hd/clawquest/apps/api/src/modules/escrow/escrow.routes.ts`

```typescript
server.get(
    '/deposit-params/:questId',
    {
        querystring: z.object({
            chainId: z.coerce.number().optional(),  // Can override
        }),
    },
    async (request, reply) => {
        const { questId } = request.params as any;
        const { chainId } = (request.query as any) || {};  // Query param

        if (chainId && !isChainAllowed(chainId)) {
            return reply.status(400).send({
                message: `Chain ${chainId} is not available in this environment`,
            } as any);
        }

        try {
            const params = await getDepositParams(server.prisma, questId, chainId);
            return params;
        } catch (err: any) {
            // ...
        }
    }
);
```

### 6. Escrow Service - getDepositParams (Core Logic)

**File**: `/Users/hd/clawquest/apps/api/src/modules/escrow/escrow.service.ts`

This is where the chain selection happens:

```typescript
export async function getDepositParams(
    prisma: PrismaClient,
    questId: string,
    chainId?: number,
): Promise<DepositParams> {
    const quest = await prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) throw new Error('Quest not found');

    // ═══════════════════════════════════════════════════════════════════════════
    // CHAIN SELECTION PRIORITY (3-tier fallback)
    // ═══════════════════════════════════════════════════════════════════════════
    const targetChainId = chainId || quest.cryptoChainId || escrowConfig.defaultChainId;
    //                      ↑               ↑                      ↑
    //          TIER 1:             TIER 2:                 TIER 3:
    //     Query Param Override   On-Chain Funded      Escrow Config Default
    // ═══════════════════════════════════════════════════════════════════════════

    const chain = getChainById(targetChainId);
    if (!chain) throw new Error(`Unsupported chain: ${targetChainId}`);

    const rewardType = quest.rewardType.toUpperCase();  // "USDC", "USDT"
    const tokenInfo = getTokenInfo(targetChainId, rewardType);
    if (!tokenInfo) {
        throw new Error(`Token ${rewardType} not available on chain ${targetChainId}`);
    }

    // TOP-UP MODE: if already funded on this chain, calculate difference
    let depositAmount = quest.rewardAmount;
    if (quest.fundingStatus === 'confirmed' && quest.cryptoChainId) {
        const onChain = await getEscrowStatus(questId, targetChainId);
        const alreadyDeposited = onChain?.depositedHuman ?? 0;
        const diff = quest.rewardAmount - alreadyDeposited;
        if (diff <= 0) throw new Error('Quest already fully funded');
        depositAmount = diff;
    }

    const questIdBytes32 = uuidToBytes32(questId);
    const amountSmallestUnit = toSmallestUnit(depositAmount, tokenInfo.decimals);
    const expiresAt = quest.expiresAt ? Math.floor(quest.expiresAt.getTime() / 1000) : 0;

    return {
        contractAddress: getContractAddress(targetChainId),
        questIdBytes32,
        tokenAddress: tokenInfo.address,
        tokenSymbol: tokenInfo.symbol,
        tokenDecimals: tokenInfo.decimals,
        amount: depositAmount,
        amountSmallestUnit: amountSmallestUnit.toString(),
        chainId: targetChainId,        // RETURNED
        chainName: chain.name,         // RETURNED (resolved via getChainById)
        expiresAt,
        isNative: isNativeToken(tokenInfo.address),
    };
}
```

### 7. Escrow Configuration (Defaults)

**File**: `/Users/hd/clawquest/apps/api/src/modules/escrow/escrow.config.ts`

```typescript
const networkMode = (process.env.ESCROW_NETWORK_MODE || 'testnet') as NetworkMode;
const activeChainIds = parseActiveChainIds(networkMode);

export const escrowConfig = {
    activeChainIds,  // [8453, 84532, 56, 97] for testnet (or [8453, 56] for mainnet)
    contractAddresses: buildContractAddresses(activeChainIds),
    
    /** Default chain ID: env var ESCROW_CHAIN_ID, or first active chain, or 84532 */
    defaultChainId: parseInt(process.env.ESCROW_CHAIN_ID || String(activeChainIds[0] || 84532), 10),
    
    networkMode,
    rpcUrls: buildRpcUrls(activeChainIds),
} as const;
```

**Chain IDs and Names** are defined in shared package:

**File**: `/Users/hd/clawquest/packages/shared/src/chains.ts`

```typescript
export const SUPPORTED_CHAINS: Record<string, ChainConfig> = {
    base: { id: 8453, name: 'Base', isTestnet: false, ... },
    baseSepolia: { id: 84532, name: 'Base Sepolia', isTestnet: true, ... },
    ethereum: { id: 1, name: 'Ethereum', isTestnet: false, ... },
    bnb: { id: 56, name: 'BNB Smart Chain', isTestnet: false, ... },
    arbitrum: { id: 42161, name: 'Arbitrum One', isTestnet: false, ... },
    bscTestnet: { id: 97, name: 'BSC Testnet', isTestnet: true, ... },
    polygon: { id: 137, name: 'Polygon', isTestnet: false, ... },
} as const;

// Token registry keyed by numeric chainId
export const TOKEN_REGISTRY: Record<number, Record<string, TokenInfo>> = {
    8453: {     // Base
        USDC: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6, ... },
        USDT: { address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2', decimals: 18, ... },
        NATIVE: { address: '0x0000...0000', decimals: 18, symbol: 'ETH', ... },
    },
    56: {       // BNB Smart Chain
        USDC: { address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', decimals: 18, ... },
        NATIVE: { address: '0x0000...0000', decimals: 18, symbol: 'BNB', ... },
    },
    // ...
};

export const ESCROW_CHAIN_IDS = [8453, 84532, 56, 97] as const;

export function getChainById(chainId: number): ChainConfig | undefined {
    return Object.values(SUPPORTED_CHAINS).find(c => c.id === chainId);
}

export function getTokenInfo(chainId: number, symbol: string): TokenInfo | undefined {
    return TOKEN_REGISTRY[chainId]?.[symbol];
}
```

### 8. Fund Page UI Logic

**File**: `/Users/hd/clawquest/apps/dashboard/src/routes/_authenticated/quests/$questId/fund.tsx`

```typescript
const { data: params, isLoading: paramsLoading, error: paramsError } = useQuery<DepositParams>({
    queryKey: ['deposit-params', questId],
    queryFn: async () => {
        const res = await fetch(`${API_BASE}/escrow/deposit-params/${questId}`)
        return res.json()
    },
    enabled: !!questId,
})

// ... later in render

const wrongChain = isConnected && currentChainId !== params.chainId

if (wrongChain && step !== 'connect' && step !== 'success' && step !== 'error') {
    <div className="fund-wrong-chain">
        <p>Please switch to <strong>{params.chainName}</strong></p>
        <button className="btn btn-primary" onClick={() => switchChain({ chainId: params.chainId })}>
            Switch Network
        </button>
    </div>
}
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     QUEST CREATION (Dashboard)                           │
├─────────────────────────────────────────────────────────────────────────┤
│  User selects: "Base" (string dropdown)                                  │
│  Sent to API: { network: "Base", rewardType: "USDC", ... }              │
│  Stored in DB: Quest.network = "Base" (STRING)                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                      SPONSOR DEPOSITS (On-chain)                         │
├─────────────────────────────────────────────────────────────────────────┤
│  Sponsor tx to: escrow contract on chain 8453 (Base)                    │
│  QuestFunded event emitted with: chainId = 8453 (NUMBER)                │
│  Event handler updates: Quest.cryptoChainId = 8453                      │
│                         Quest.fundingStatus = "confirmed"               │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                  FUND PAGE LOADS (Frontend)                              │
├─────────────────────────────────────────────────────────────────────────┤
│  Fetch: GET /escrow/deposit-params/{questId}                            │
│  Optional: ?chainId=X (to override)                                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│           ESCROW SERVICE - getDepositParams (Backend)                    │
├─────────────────────────────────────────────────────────────────────────┤
│  Select Chain:                                                            │
│    IF query param ?chainId=X → use X                                     │
│    ELSE IF quest.cryptoChainId → use that (8453)                        │
│    ELSE → use escrowConfig.defaultChainId (from env)                    │
│                                                                           │
│  Resolve Chain Info:                                                      │
│    chain = getChainById(8453) → { id: 8453, name: "Base", ... }        │
│                                                                           │
│  Resolve Token Info:                                                      │
│    token = getTokenInfo(8453, "USDC")                                   │
│    → { address: '0x833589...', decimals: 6, symbol: 'USDC', ... }      │
│                                                                           │
│  Return to Frontend:                                                      │
│    { chainId: 8453, chainName: "Base", tokenAddress: '0x833589...',    │
│      tokenSymbol: 'USDC', amount: 500, ... }                            │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    FUND PAGE RENDERS (Frontend)                          │
├─────────────────────────────────────────────────────────────────────────┤
│  currentChainId (wallet) = 97 (BSC Testnet)                             │
│  params.chainId = 8453 (Base)                                            │
│  wrongChain = true                                                        │
│                                                                           │
│  Show: "Please switch to Base"                                           │
│        [Switch Network] button → switchChain({ chainId: 8453 })         │
│                                                                           │
│  After switch: perform approve + deposit transactions                    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Chain Selection Decision Tree

```
GET /escrow/deposit-params/{questId}[?chainId=X]
│
├─ Was ?chainId provided in query string?
│  ├─ YES → Use that chainId (TIER 1)
│  │ └─ Validate: isChainAllowed(chainId)?
│  │    ├─ YES → Continue
│  │    └─ NO  → 400 Bad Request
│  │
│  └─ NO → Continue to TIER 2
│
├─ Does quest.cryptoChainId exist (quest already funded)?
│  ├─ YES → Use quest.cryptoChainId (TIER 2)
│  │ └─ This is the chain where funds were actually deposited
│  │
│  └─ NO → Continue to TIER 3
│
├─ Use escrowConfig.defaultChainId (TIER 3)
│  ├─ Set from: env var ESCROW_CHAIN_ID
│  ├─ Or: first element of activeChainIds
│  └─ Or: hardcoded default 84532 (Base Sepolia testnet)
│
└─ Resolve chain name from SUPPORTED_CHAINS registry
   └─ Return: { chainId, chainName, tokenAddress, ... }
```

---

## Key Insights

### 1. String vs Numeric Chain Identifiers
- **Dashboard**: Uses human-readable strings ("Base", "BNB Smart Chain")
- **Database**: `quest.network` stores the string (not used by escrow)
- **Blockchain**: Numeric chain IDs (8453, 56, 1, etc.)
- **Service**: Converts between them via `getChainById()`

### 2. Two Independent Fields
- `quest.network`: User's choice during creation (STRING) — informational only
- `quest.cryptoChainId`: Actual chain where funds landed (NUMBER) — used for operations

These may not match if:
- User selected one network, but accidentally deposited on another
- Environment changed (testnet ↔ mainnet)

### 3. Fund Page Chain Detection
The fund page doesn't use `quest.network` at all. It determines the chain via:
1. Query parameter override (for top-ups, chain switching)
2. On-chain evidence (`quest.cryptoChainId`)
3. Fallback to config

This is correct because the quest is bound to the chain where funds exist, not where user intended.

### 4. Chain Support Limitation
- Dashboard offers 7 network options
- Escrow only supports 4: Base (8453), Base Sepolia (84532), BNB (56), BSC Testnet (97)
- If user selects an unsupported network and tries to fund, the deposit will fail

### 5. Token Registry
Token addresses and decimals are hardcoded per chain in `TOKEN_REGISTRY[chainId]`. This is queried by `getTokenInfo(chainId, symbol)`.

---

## Code Locations Summary

| Component | File | Lines |
|-----------|------|-------|
| Dashboard - Network selection | `apps/dashboard/src/routes/_authenticated/quests/create.tsx` | 51-96, 721-726, 1540-1545 |
| API - Quest creation | `apps/api/src/modules/quests/quests.service.ts` | 70-153 |
| API - Escrow event handler | `apps/api/src/modules/escrow/escrow-event-handlers.ts` | 18-64 |
| API - Escrow routes | `apps/api/src/modules/escrow/escrow.routes.ts` | 43-101 |
| API - getDepositParams logic | `apps/api/src/modules/escrow/escrow.service.ts` | 34-79 |
| API - Escrow config | `apps/api/src/modules/escrow/escrow.config.ts` | 93-163 |
| Shared - Chain registry | `packages/shared/src/chains.ts` | 13-174 |
| Dashboard - Fund page | `apps/dashboard/src/routes/_authenticated/quests/$questId/fund.tsx` | 26-37, 123-158 |
| Dashboard - Fund types | `apps/dashboard/src/components/escrow/fund-types.ts` | 3-15 |

---

## Unresolved Questions

1. **String-to-ChainId Mapping**: Should dashboard quest creation store the numeric chain ID instead of string? Currently frontend has token contracts hardcoded per network name string.
2. **Mismatch Handling**: What happens if `quest.network` (user intent) differs from `quest.cryptoChainId` (actual deposit)? No current reconciliation.
3. **Unsupported Networks**: User can select "Arbitrum One" or "Ethereum" in quest creation, but escrow doesn't support them. Validation is missing on create.
4. **Chain Switching**: Fund page supports `?chainId=X` for top-ups, but UI doesn't expose this parameter. Is intentional chain switching supported for multi-chain deposits?

