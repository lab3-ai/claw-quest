import { REWARD_TYPE } from "@clawquest/shared"

/**
 * Network configuration type
 */
type NetworkConfig = {
    value: string
    label: string
}

/**
 * Mainnet primary networks (default)
 */
const NETWORKS_PRIMARY_MAINNET: readonly NetworkConfig[] = [
    { value: "Base", label: "🔵 Base (8453)" },
    { value: "BNB Smart Chain", label: "🟡 BNB Smart Chain (56)" },
    { value: "X Layer", label: "🟠 X Layer (196)" },
] as const

/**
 * Testnet primary networks
 */
const NETWORKS_PRIMARY_TESTNET: readonly NetworkConfig[] = [
    { value: "Base Sepolia", label: "🔵 Base Sepolia (84532)" },
    { value: "BNB Smart Chain Testnet", label: "🟡 BNB Smart Chain Testnet (97)" },
    { value: "X Layer Testnet", label: "🟠 X Layer Testnet (1952)" },
] as const

/**
 * Mainnet other networks (default)
 */
const NETWORKS_OTHER_MAINNET: readonly NetworkConfig[] = [] as const

/**
 * Testnet other networks
 */
const NETWORKS_OTHER_TESTNET: readonly NetworkConfig[] = [
    // Testnet versions of other networks can be added here as needed
] as const

/**
 * Determines network mode from environment variable.
 * Defaults to "mainnet" for safety (fail-safe default).
 * Only switches to testnet if explicitly set to "testnet".
 * 
 * @returns true if testnet mode, false if mainnet mode
 */
function isTestnetMode(): boolean {
    const envValue = import.meta.env.VITE_ESCROW_NETWORK_MODE
    if (!envValue) return false // Default to mainnet
    
    // Use strict comparison to prevent type coercion issues
    const normalized = String(envValue).toLowerCase().trim()
    return normalized === "testnet"
}

/**
 * Gets primary networks based on current network mode.
 * Defaults to mainnet if VITE_ESCROW_NETWORK_MODE is not set or invalid.
 */
function getPrimaryNetworks(): readonly NetworkConfig[] {
    return isTestnetMode() ? NETWORKS_PRIMARY_TESTNET : NETWORKS_PRIMARY_MAINNET
}

/**
 * Gets other networks based on current network mode.
 * Defaults to mainnet if VITE_ESCROW_NETWORK_MODE is not set or invalid.
 */
function getOtherNetworks(): readonly NetworkConfig[] {
    return isTestnetMode() ? NETWORKS_OTHER_TESTNET : NETWORKS_OTHER_MAINNET
}

/**
 * Primary networks (computed based on VITE_ESCROW_NETWORK_MODE).
 * Defaults to mainnet networks.
 */
export const NETWORKS_PRIMARY = getPrimaryNetworks()

/**
 * Other networks (computed based on VITE_ESCROW_NETWORK_MODE).
 * Defaults to mainnet networks.
 */
export const NETWORKS_OTHER = getOtherNetworks()

/**
 * Token contract addresses by network.
 * Includes both mainnet and testnet addresses.
 */
export const TOKEN_CONTRACTS: Record<string, Record<string, string>> = {
    [REWARD_TYPE.USDC]: {
        // Mainnet
        "Base": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        "BNB Smart Chain": "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
        "X Layer": "0x74b7F16337b8972027F6196A17a631aC6dE26d22",
        // Testnet
        "Base Sepolia": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        "BNB Smart Chain Testnet": "0x64544969ed7ebf5f083679233325356ebe738930",
    },
    [REWARD_TYPE.USDT]: {
        // Mainnet
        "Base": "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
        "BNB Smart Chain": "0x55d398326f99059fF775485246999027B3197955",
        "X Layer": "0x1E4a5963aBFD975d8c9021ce480b42188849D41d",
        // Testnet
        "Base Sepolia": "0xB7268c41f53d9eB78Ffa8358d0d30545991b4960",
        "BNB Smart Chain Testnet": "0x66E972502A34A625828C544a1914E8D8cc2A9dE5",
    },
}

/**
 * Native token information by network.
 * Includes both mainnet and testnet networks.
 */
export const NATIVE_TOKENS: Record<string, { symbol: string; name: string }> = {
    // Mainnet
    "Base": { symbol: "ETH", name: "Ether" },
    "BNB Smart Chain": { symbol: "BNB", name: "BNB" },
    "X Layer": { symbol: "OKB", name: "OKB" },
    // Testnet
    "Base Sepolia": { symbol: "ETH", name: "Ether" },
    "BNB Smart Chain Testnet": { symbol: "tBNB", name: "Test BNB" },
    "X Layer Testnet": { symbol: "OKB", name: "OKB" },
}

export const TOKEN_COLORS: Record<string, string> = {
    [REWARD_TYPE.USDC]: "#2775ca",
    [REWARD_TYPE.USDT]: "#26a17b",
    [REWARD_TYPE.NATIVE]: "#627eea",
}

export function getTokenSymbol(rail: "crypto" | "fiat", token: string, network: string): string {
    if (rail === "fiat") return REWARD_TYPE.USD
    if (token === REWARD_TYPE.NATIVE) return (NATIVE_TOKENS[network] ?? { symbol: "?" }).symbol
    return token
}

export function calcLbPayouts(total: number, n: number): number[] {
    if (n < 2) return [Math.round(total * 100) / 100]
    const clampedN = Math.min(Math.max(n, 2), 100)
    const weights: number[] = []
    for (let i = 0; i < clampedN; i++) weights.push(clampedN - i)
    const weightSum = weights.reduce((a, b) => a + b, 0)
    const payouts = weights.map(w => Math.round((w / weightSum) * total * 100) / 100)
    const payoutSum = payouts.reduce((a, b) => a + b, 0)
    const diff = Math.round((total - payoutSum) * 100) / 100
    if (payouts.length > 0) payouts[0] = Math.round((payouts[0] + diff) * 100) / 100
    return payouts
}
