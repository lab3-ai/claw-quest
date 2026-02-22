// ─── UUID ↔ bytes32 Conversion ───────────────────────────────────────────────
//
// Quest IDs are UUIDs in the database but bytes32 on-chain.
// UUID: "007d6b1e-59a5-481d-91d9-55442ca40898"
// bytes32: 0x00000000000000000000000000000000007d6b1e59a5481d91d955442ca40898
//
// Strategy: strip hyphens → left-pad to 64 hex chars → prefix with 0x

/**
 * Convert a UUID string to a bytes32 hex string for on-chain use.
 * @param uuid - Standard UUID format (with or without hyphens)
 * @returns bytes32 hex string prefixed with 0x
 */
export function uuidToBytes32(uuid: string): `0x${string}` {
    const hex = uuid.replace(/-/g, '');
    if (hex.length !== 32) {
        throw new Error(`Invalid UUID: expected 32 hex chars after stripping hyphens, got ${hex.length}`);
    }
    // Left-pad with zeros to 64 hex chars (32 bytes)
    return `0x${'0'.repeat(32)}${hex}` as `0x${string}`;
}

/**
 * Convert a bytes32 hex string back to a UUID string.
 * @param bytes32 - 0x-prefixed hex string (64 hex chars)
 * @returns Standard UUID format with hyphens
 */
export function bytes32ToUuid(bytes32: string): string {
    const hex = bytes32.replace(/^0x/, '');
    if (hex.length !== 64) {
        throw new Error(`Invalid bytes32: expected 64 hex chars, got ${hex.length}`);
    }
    // Take last 32 hex chars (the UUID portion)
    const uuid = hex.slice(32);
    return `${uuid.slice(0, 8)}-${uuid.slice(8, 12)}-${uuid.slice(12, 16)}-${uuid.slice(16, 20)}-${uuid.slice(20)}`;
}

// ─── Amount Conversion ───────────────────────────────────────────────────────
//
// On-chain amounts are in smallest unit (e.g., 1 USDC = 1_000_000, 1 ETH = 1e18).
// API/DB stores human-readable amounts (e.g., 500 = 500 USDC).

/**
 * Convert a human-readable amount to the token's smallest unit.
 * @param amount - Human-readable amount (e.g., 500 for 500 USDC)
 * @param decimals - Token decimals (e.g., 6 for USDC, 18 for ETH)
 * @returns Amount in smallest unit as bigint
 */
export function toSmallestUnit(amount: number, decimals: number): bigint {
    // Use string manipulation to avoid floating point issues
    const [whole, frac = ''] = amount.toString().split('.');
    const fracPadded = frac.padEnd(decimals, '0').slice(0, decimals);
    return BigInt(whole + fracPadded);
}

/**
 * Convert from smallest unit to human-readable amount.
 * @param amount - Amount in smallest unit (bigint or string)
 * @param decimals - Token decimals
 * @returns Human-readable number
 */
export function fromSmallestUnit(amount: bigint | string, decimals: number): number {
    const amountBig = typeof amount === 'string' ? BigInt(amount) : amount;
    const divisor = 10n ** BigInt(decimals);
    const whole = amountBig / divisor;
    const frac = amountBig % divisor;
    const fracStr = frac.toString().padStart(decimals, '0');
    return parseFloat(`${whole}.${fracStr}`);
}

// ─── ERC20 Minimal ABI (for approve) ─────────────────────────────────────────

export const ERC20_APPROVE_ABI = [
    {
        type: 'function' as const,
        name: 'approve',
        inputs: [
            { name: 'spender', type: 'address' as const },
            { name: 'amount', type: 'uint256' as const },
        ],
        outputs: [{ name: '', type: 'bool' as const }],
        stateMutability: 'nonpayable' as const,
    },
    {
        type: 'function' as const,
        name: 'allowance',
        inputs: [
            { name: 'owner', type: 'address' as const },
            { name: 'spender', type: 'address' as const },
        ],
        outputs: [{ name: '', type: 'uint256' as const }],
        stateMutability: 'view' as const,
    },
    {
        type: 'function' as const,
        name: 'balanceOf',
        inputs: [{ name: 'account', type: 'address' as const }],
        outputs: [{ name: '', type: 'uint256' as const }],
        stateMutability: 'view' as const,
    },
] as const;
