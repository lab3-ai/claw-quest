import { useState, useEffect, useCallback } from 'react'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { ESCROW_ABI, ERC20_APPROVE_ABI } from '@clawquest/shared'
import type { DepositParams, FundStep } from '@/components/escrow/fund-types'
import { decodeContractError } from '@/components/escrow/fund-error-decoder'

interface UseFundQuestResult {
    step: FundStep
    setStep: (s: FundStep) => void
    errorMsg: string
    approveTxHash?: `0x${string}`
    depositTxHash?: `0x${string}`
    approveLoading: boolean
    depositLoading: boolean
    approveConfirmed: boolean
    depositConfirmed: boolean
    handleApprove: () => void
    handleDeposit: () => void
    handleRetry: (isConnected: boolean, isNative: boolean) => void
}

export function useFundQuest(params: DepositParams | undefined): UseFundQuestResult {
    const [step, setStep] = useState<FundStep>('connect')
    const [errorMsg, setErrorMsg] = useState('')

    // ── Approve ERC20 ────────────────────────────────────────────────────────
    const {
        writeContract: writeApprove,
        data: approveTxHash,
        isPending: approveLoading,
        error: approveError,
    } = useWriteContract()
    const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({ hash: approveTxHash })

    // ── Deposit ──────────────────────────────────────────────────────────────
    const {
        writeContract: writeDeposit,
        data: depositTxHash,
        isPending: depositLoading,
        error: depositError,
    } = useWriteContract()
    const { isSuccess: depositConfirmed } = useWaitForTransactionReceipt({ hash: depositTxHash })

    // ── Step transitions ─────────────────────────────────────────────────────
    useEffect(() => {
        if (approveConfirmed && step === 'approve') setStep('deposit')
    }, [approveConfirmed, step])

    useEffect(() => {
        if (depositConfirmed && step === 'deposit') setStep('confirming')
    }, [depositConfirmed, step])

    useEffect(() => {
        const err = approveError || depositError
        if (err) {
            setErrorMsg(decodeContractError(err))
            setStep('error')
        }
    }, [approveError, depositError])

    // ── Handlers ─────────────────────────────────────────────────────────────
    const handleApprove = useCallback(() => {
        if (!params) return
        writeApprove({
            address: params.tokenAddress as `0x${string}`,
            abi: ERC20_APPROVE_ABI,
            functionName: 'approve',
            args: [params.contractAddress as `0x${string}`, BigInt(params.amountSmallestUnit)],
        })
    }, [params, writeApprove])

    const handleDeposit = useCallback(() => {
        if (!params) return
        if (params.isNative) {
            writeDeposit({
                address: params.contractAddress as `0x${string}`,
                abi: ESCROW_ABI,
                functionName: 'depositNative',
                args: [params.questIdBytes32 as `0x${string}`, BigInt(params.expiresAt)],
                value: BigInt(params.amountSmallestUnit),
            })
        } else {
            writeDeposit({
                address: params.contractAddress as `0x${string}`,
                abi: ESCROW_ABI,
                functionName: 'deposit',
                args: [
                    params.questIdBytes32 as `0x${string}`,
                    params.tokenAddress as `0x${string}`,
                    BigInt(params.amountSmallestUnit),
                    BigInt(params.expiresAt),
                ],
            })
        }
    }, [params, writeDeposit])

    const handleRetry = useCallback((isConnected: boolean, isNative: boolean) => {
        setErrorMsg('')
        setStep(isConnected ? (isNative ? 'deposit' : 'approve') : 'connect')
    }, [])

    return {
        step, setStep, errorMsg,
        approveTxHash, depositTxHash,
        approveLoading, depositLoading,
        approveConfirmed, depositConfirmed,
        handleApprove, handleDeposit, handleRetry,
    }
}
