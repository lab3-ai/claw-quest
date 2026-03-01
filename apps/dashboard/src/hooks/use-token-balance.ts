import { useReadContract, useBalance } from 'wagmi'
import { ERC20_APPROVE_ABI, fromSmallestUnit } from '@clawquest/shared'

interface UseTokenBalanceResult {
    balance?: string          // human-readable
    balanceRaw?: bigint
    hasInsufficientBalance: boolean
    isLoading: boolean
}

/**
 * Read ERC20 or native token balance for an address.
 * Returns human-readable balance string and whether it's below `requiredRaw`.
 */
export function useTokenBalance(
    tokenAddress: string | undefined,
    ownerAddress: string | undefined,
    isNative: boolean,
    decimals: number,
    requiredRaw: bigint,
): UseTokenBalanceResult {
    const enabled = !!tokenAddress && !!ownerAddress

    // Native token balance (ETH/BNB/etc.)
    const { data: nativeData, isLoading: nativeLoading } = useBalance({
        address: ownerAddress as `0x${string}` | undefined,
        query: { enabled: enabled && isNative },
    })

    // ERC20 balance via balanceOf
    const { data: erc20Raw, isLoading: erc20Loading } = useReadContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_APPROVE_ABI,
        functionName: 'balanceOf',
        args: ownerAddress ? [ownerAddress as `0x${string}`] : undefined,
        query: { enabled: enabled && !isNative },
    })

    if (isNative) {
        const raw = nativeData?.value
        const balance = raw !== undefined ? fromSmallestUnit(raw, decimals).toFixed(6) : undefined
        return {
            balance,
            balanceRaw: raw,
            hasInsufficientBalance: raw !== undefined && raw < requiredRaw,
            isLoading: nativeLoading,
        }
    }

    const raw = erc20Raw as bigint | undefined
    const balance = raw !== undefined ? fromSmallestUnit(raw, decimals).toFixed(decimals <= 6 ? 2 : 6) : undefined
    return {
        balance,
        balanceRaw: raw,
        hasInsufficientBalance: raw !== undefined && raw < requiredRaw,
        isLoading: erc20Loading,
    }
}

interface UseTokenAllowanceResult {
    allowance?: bigint
    isSufficient: boolean
    isLoading: boolean
}

/**
 * Read ERC20 allowance for owner -> spender.
 * `isSufficient` is true if allowance >= requiredRaw.
 */
export function useTokenAllowance(
    tokenAddress: string | undefined,
    ownerAddress: string | undefined,
    spenderAddress: string | undefined,
    requiredRaw: bigint,
): UseTokenAllowanceResult {
    const enabled = !!tokenAddress && !!ownerAddress && !!spenderAddress

    const { data, isLoading } = useReadContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_APPROVE_ABI,
        functionName: 'allowance',
        args: (ownerAddress && spenderAddress)
            ? [ownerAddress as `0x${string}`, spenderAddress as `0x${string}`]
            : undefined,
        query: { enabled },
    })

    const allowance = data as bigint | undefined
    return {
        allowance,
        isSufficient: allowance !== undefined && allowance >= requiredRaw,
        isLoading,
    }
}
