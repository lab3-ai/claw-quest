import { useState, useEffect } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { useQuery, useMutation } from '@tanstack/react-query'
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

type FundingMethod = 'crypto' | 'stripe'

// ─── Stripe Fiat Checkout Flow ──────────────────────────────────────────────

function StripeFundFlow({ questId, quest }: { questId: string; quest: any }) {
    const { session } = useAuth()

    const checkoutMutation = useMutation({
        mutationFn: async () => {
            const successUrl = `${window.location.origin}/quests/${questId}`
            const cancelUrl = window.location.href

            const res = await fetch(`${API_BASE}/stripe/checkout/${questId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({ successUrl, cancelUrl }),
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.message || 'Failed to create checkout')
            }
            return res.json()
        },
        onSuccess: (data: { checkoutUrl: string }) => {
            window.location.href = data.checkoutUrl
        },
    })

    // Already funded
    if (quest?.fundingStatus === 'confirmed' || quest?.status === 'live' || quest?.status === 'scheduled') {
        return (
            <div className="fund-stripe-success">
                <div className="fund-stripe-icon">✓</div>
                <h3>Quest Funded</h3>
                <p>This quest has been funded via Stripe and is now {quest.status}.</p>
                <Link to="/quests/$questId" params={{ questId }} className="btn btn-primary">
                    View Quest
                </Link>
            </div>
        )
    }

    // Pending (waiting for webhook)
    if (quest?.fundingStatus === 'pending') {
        return (
            <div className="fund-stripe-pending">
                <div className="fund-stripe-spinner" />
                <h3>Payment Processing</h3>
                <p>Your payment is being confirmed. This page will update automatically.</p>
            </div>
        )
    }

    return (
        <div className="fund-stripe-flow">
            <div className="fund-stripe-info">
                <div className="fund-stripe-badge">
                    <span className="stripe-logo">S</span>
                    <span>Stripe Checkout</span>
                </div>
                <p>You'll be redirected to Stripe's secure checkout page to complete payment with credit card, debit card, Apple Pay, or Google Pay.</p>
            </div>

            <div className="fund-stripe-summary">
                <div className="fund-summary-row">
                    <span>Amount</span>
                    <span className="fund-amount">${quest?.rewardAmount?.toLocaleString()} USD</span>
                </div>
                <div className="fund-summary-row">
                    <span>Quest</span>
                    <span>{quest?.title}</span>
                </div>
                <div className="fund-summary-row">
                    <span>Distribution</span>
                    <span>{quest?.type} · {quest?.totalSlots} winners</span>
                </div>
            </div>

            {checkoutMutation.isError && (
                <p className="fund-error-msg">{(checkoutMutation.error as Error).message}</p>
            )}

            <button
                className="btn btn-stripe"
                disabled={checkoutMutation.isPending}
                onClick={() => checkoutMutation.mutate()}
            >
                {checkoutMutation.isPending ? 'Redirecting to Stripe…' : 'Pay with Card →'}
            </button>
        </div>
    )
}

// ─── Main Fund Page ─────────────────────────────────────────────────────────

export function FundQuest() {
    const { questId } = useParams({ strict: false }) as { questId: string }
    const { session } = useAuth()
    const { isConnected, address } = useAccount()
    const currentChainId = useChainId()
    const { switchChain } = useSwitchChain()

    // Determine funding method from quest data
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
        refetchInterval: (query) => {
            const data = query.state.data as any
            return data?.fundingStatus === 'pending' ? 5000 : false
        },
    })

    // Determine method: from quest data, or default based on rewardType
    const questMethod: FundingMethod = quest?.fundingMethod === 'stripe'
        ? 'stripe'
        : quest?.rewardType === 'USD'
            ? 'stripe'
            : 'crypto'

    const [method, setMethod] = useState<FundingMethod>(questMethod)

    // Sync method when quest loads
    useEffect(() => {
        if (quest) setMethod(questMethod)
    }, [quest?.fundingMethod, quest?.rewardType])

    // ── Crypto: Fetch deposit params ────────────────────────────────────────
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
        enabled: !!questId && method === 'crypto',
    })

    // ── Fund flow state + contract writes ───────────────────────────────────
    const {
        step, setStep, errorMsg,
        approveTxHash, depositTxHash,
        approveLoading, depositLoading,
        approveConfirmed, depositConfirmed,
        handleApprove, handleDeposit, handleRetry,
    } = useFundQuest(params)

    // ── Token balance + allowance ───────────────────────────────────────────
    const requiredRaw = params ? BigInt(params.amountSmallestUnit) : 0n
    const { balance: walletBalance, hasInsufficientBalance } = useTokenBalance(
        params?.tokenAddress, address, params?.isNative ?? false, params?.tokenDecimals ?? 18, requiredRaw,
    )
    const { isSufficient: allowanceSufficient, isLoading: allowanceLoading } = useTokenAllowance(
        params?.isNative ? undefined : params?.tokenAddress, address, params?.contractAddress, requiredRaw,
    )

    // ── Poll backend for funding confirmation ───────────────────────────────
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

    // ── Step transitions driven by external state ───────────────────────────
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

    // ── Can user toggle method? Only if quest not yet funded ────────────────
    const canToggle = quest && quest.fundingStatus !== 'confirmed' && quest.status === 'draft'

    // ── Render ──────────────────────────────────────────────────────────────
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

                {/* Payment method toggle */}
                {canToggle && (
                    <div className="fund-method-toggle">
                        <button
                            className={`fund-method-btn ${method === 'crypto' ? 'active' : ''}`}
                            onClick={() => setMethod('crypto')}
                        >
                            <span>⛓</span> Crypto
                        </button>
                        <button
                            className={`fund-method-btn ${method === 'stripe' ? 'active' : ''}`}
                            onClick={() => setMethod('stripe')}
                        >
                            <span>💳</span> Card (Stripe)
                        </button>
                    </div>
                )}

                {/* Stripe flow */}
                {method === 'stripe' && (
                    <StripeFundFlow questId={questId} quest={quest} />
                )}

                {/* Crypto flow */}
                {method === 'crypto' && (
                    <>
                        {paramsLoading && (
                            <div className="fund-loading">Loading deposit parameters...</div>
                        )}

                        {paramsError && !params && (
                            <>
                                <p className="fund-error-msg">{(paramsError as Error)?.message || 'Quest not found or already funded'}</p>
                                <Link to="/dashboard" className="btn btn-secondary">Back to Dashboard</Link>
                            </>
                        )}

                        {params && (
                            <>
                                <FundSummary params={params} />
                                <FundStepIndicator step={step} isNative={params.isNative} />

                                <div className="fund-action">
                                    {step === 'connect' && (
                                        <div className="fund-connect-area">
                                            <p>Connect your wallet to fund this quest</p>
                                            <ConnectButton />
                                        </div>
                                    )}

                                    {isConnected && currentChainId !== params.chainId && step !== 'connect' && step !== 'success' && step !== 'error' && (
                                        <div className="fund-wrong-chain">
                                            <p>Please switch to <strong>{params.chainName}</strong></p>
                                            <button className="btn btn-primary" onClick={() => switchChain({ chainId: params.chainId })}>
                                                Switch Network
                                            </button>
                                        </div>
                                    )}

                                    {isConnected && currentChainId === params.chainId && step === 'approve' && (
                                        <FundApprove params={params} questId={questId} approveLoading={approveLoading} approveTxHash={approveTxHash}
                                            approveConfirmed={approveConfirmed} walletBalance={walletBalance}
                                            hasInsufficientBalance={hasInsufficientBalance} onApprove={handleApprove} />
                                    )}

                                    {isConnected && currentChainId === params.chainId && step === 'deposit' && (
                                        <FundDeposit params={params} questId={questId} depositLoading={depositLoading} depositTxHash={depositTxHash}
                                            depositConfirmed={depositConfirmed} walletBalance={walletBalance}
                                            hasInsufficientBalance={hasInsufficientBalance} onDeposit={handleDeposit} />
                                    )}

                                    {step === 'confirming' && <FundConfirming chainId={params.chainId} depositTxHash={depositTxHash} />}
                                    {step === 'success' && <FundSuccess questId={questId} chainId={params.chainId} txHash={depositTxHash || quest?.cryptoTxHash} />}

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
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
