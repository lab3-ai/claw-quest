import { useEffect } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import type { DepositParams } from '@/components/escrow/fund-types'
import { FundStepIndicator } from '@/components/escrow/fund-step-indicator'
import { FundSummary } from '@/components/escrow/fund-summary'
import { FundApprove, FundDeposit, FundConfirming } from '@/components/escrow/fund-approve-deposit'
import { FundSuccess } from '@/components/escrow/fund-success'
import { useTokenBalance, useTokenAllowance } from '@/hooks/use-token-balance'
import { useFundQuest } from '@/hooks/use-fund-quest'
import '@/styles/pages/fund-quest.css'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export function FundQuest() {
    const { questId } = useParams({ strict: false }) as { questId: string }
    const { session } = useAuth()
    const { isConnected, address } = useAccount()
    const currentChainId = useChainId()
    const { switchChain } = useSwitchChain()

    // ── Fetch deposit params ─────────────────────────────────────────────────
    const { data: params, isLoading: paramsLoading, error: paramsError } = useQuery<DepositParams>({
        queryKey: ['deposit-params', questId],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/escrow/deposit-params/${questId}`)
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.message || 'Failed to load deposit params')
            }
            return res.json()
        },
        enabled: !!questId,
    })

    // ── Fetch quest (title + funded-check) ───────────────────────────────────
    const token = session?.access_token
    const { data: quest } = useQuery({
        queryKey: ['quest', questId],
        queryFn: async () => {
            const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
            const res = await fetch(`${API_BASE}/quests/${questId}`, { headers })
            if (!res.ok) throw new Error('Quest not found')
            return res.json()
        },
        enabled: !!questId,
    })

    // ── Fund flow state + contract writes ────────────────────────────────────
    const {
        step, setStep, errorMsg,
        approveTxHash, depositTxHash,
        approveLoading, depositLoading,
        approveConfirmed, depositConfirmed,
        handleApprove, handleDeposit, handleRetry,
    } = useFundQuest(params)

    // ── Token balance + allowance ────────────────────────────────────────────
    const requiredRaw = params ? BigInt(params.amountSmallestUnit) : 0n
    const { balance: walletBalance, hasInsufficientBalance } = useTokenBalance(
        params?.tokenAddress, address, params?.isNative ?? false, params?.tokenDecimals ?? 18, requiredRaw,
    )
    const { isSufficient: allowanceSufficient, isLoading: allowanceLoading } = useTokenAllowance(
        params?.isNative ? undefined : params?.tokenAddress, address, params?.contractAddress, requiredRaw,
    )

    // ── Poll backend for funding confirmation ────────────────────────────────
    const { data: fundingStatus } = useQuery({
        queryKey: ['funding-status', questId],
        queryFn: async () => {
            const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
            const res = await fetch(`${API_BASE}/quests/${questId}`, { headers })
            if (!res.ok) return null
            const q = await res.json()
            return q.fundingStatus || q.status
        },
        enabled: step === 'confirming',
        refetchInterval: 5000,
    })

    // ── Step transitions driven by external state ────────────────────────────
    useEffect(() => {
        if (quest && (quest.fundingStatus === 'confirmed' || quest.status === 'live' || quest.status === 'scheduled')) {
            if (step !== 'success') setStep('success')
        }
    }, [quest, step, setStep])

    useEffect(() => {
        if (!isConnected || step !== 'connect') return
        if (params?.isNative) { setStep('deposit'); return }
        if (!allowanceLoading && allowanceSufficient) { setStep('deposit'); return }
        if (!allowanceLoading) setStep('approve')
    }, [isConnected, step, params?.isNative, allowanceSufficient, allowanceLoading, setStep])

    useEffect(() => {
        if (fundingStatus === 'confirmed' || fundingStatus === 'live' || fundingStatus === 'scheduled') setStep('success')
    }, [fundingStatus, setStep])

    // ── Loading / error states ───────────────────────────────────────────────
    if (paramsLoading) {
        return (
            <div className="fund-quest-page">
                <div className="fund-card"><div className="fund-loading">Loading deposit parameters...</div></div>
            </div>
        )
    }

    if (paramsError || !params) {
        return (
            <div className="fund-quest-page">
                <div className="fund-card">
                    <h2>Unable to Load</h2>
                    <p className="fund-error-msg">{(paramsError as Error)?.message || 'Quest not found or already funded'}</p>
                    <Link to="/dashboard" className="btn btn-secondary">Back to Dashboard</Link>
                </div>
            </div>
        )
    }

    const wrongChain = isConnected && currentChainId !== params.chainId
    const txHash = depositTxHash || quest?.cryptoTxHash

    return (
        <div className="fund-quest-page">
            <nav className="breadcrumb">
                <Link to="/quests">Quests</Link>
                <span className="breadcrumb-sep">/</span>
                <Link to="/quests/$questId" params={{ questId }}>{quest?.title || 'Quest'}</Link>
                <span className="breadcrumb-sep">/</span>
                <span>Fund</span>
            </nav>

            <div className="fund-card">
                <h2 className="fund-title">Fund Quest</h2>
                {quest && <p className="fund-quest-name">{quest.title}</p>}

                <FundSummary params={params} />
                <FundStepIndicator step={step} isNative={params.isNative} />

                <div className="fund-action">
                    {step === 'connect' && (
                        <div className="fund-connect-area">
                            <p>Connect your wallet to fund this quest</p>
                            <ConnectButton />
                        </div>
                    )}

                    {wrongChain && step !== 'connect' && step !== 'success' && step !== 'error' && (
                        <div className="fund-wrong-chain">
                            <p>Please switch to <strong>{params.chainName}</strong></p>
                            <button className="btn btn-primary" onClick={() => switchChain({ chainId: params.chainId })}>
                                Switch Network
                            </button>
                        </div>
                    )}

                    {!wrongChain && step === 'approve' && (
                        <FundApprove params={params} approveLoading={approveLoading} approveTxHash={approveTxHash}
                            approveConfirmed={approveConfirmed} walletBalance={walletBalance}
                            hasInsufficientBalance={hasInsufficientBalance} onApprove={handleApprove} />
                    )}

                    {!wrongChain && step === 'deposit' && (
                        <FundDeposit params={params} depositLoading={depositLoading} depositTxHash={depositTxHash}
                            depositConfirmed={depositConfirmed} walletBalance={walletBalance}
                            hasInsufficientBalance={hasInsufficientBalance} onDeposit={handleDeposit} />
                    )}

                    {step === 'confirming' && <FundConfirming chainId={params.chainId} depositTxHash={depositTxHash} />}
                    {step === 'success' && <FundSuccess questId={questId} chainId={params.chainId} txHash={txHash} />}

                    {step === 'error' && (
                        <div className="fund-error">
                            <p className="fund-error-msg">{errorMsg}</p>
                            <button className="btn btn-secondary" onClick={() => handleRetry(isConnected, params.isNative)}>
                                Try Again
                            </button>
                        </div>
                    )}
                </div>

                {isConnected && step !== 'connect' && (
                    <div className="fund-wallet-info">
                        <ConnectButton accountStatus="address" chainStatus="icon" showBalance={false} />
                    </div>
                )}
            </div>
        </div>
    )
}
