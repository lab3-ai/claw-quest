export type FundStep = 'connect' | 'approve' | 'deposit' | 'confirming' | 'success' | 'error'

export interface DepositParams {
    contractAddress: string
    questIdBytes32: string
    tokenAddress: string
    tokenSymbol: string
    tokenDecimals: number
    amount: number
    amountSmallestUnit: string
    chainId: number
    chainName: string
    expiresAt: number
    isNative: boolean
}
