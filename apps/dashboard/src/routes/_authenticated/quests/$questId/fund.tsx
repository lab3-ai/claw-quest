import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import type { DepositParams } from '@/components/escrow/fund-types'
import { FundStepIndicator } from '@/components/escrow/fund-step-indicator'
import { FundSummary } from '@/components/escrow/fund-summary'
import { FundApprove, FundDeposit, FundConfirming } from '@/components/escrow/fund-approve-deposit'
import { FundSuccess } from '@/components/escrow/fund-success'
import { useTokenBalance, useTokenAllowance } from '@/hooks/use-token-balance'
import { useFundQuest } from '@/hooks/use-fund-quest'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

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
            <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-success text-white inline-flex items-center justify-center text-2xl font-bold mb-4">
                    ✓
                </div>
                <h3 className="text-base font-semibold text-foreground m-0 mb-2">Quest Funded</h3>
                <p className="text-sm text-fg-muted m-0 mb-4">
                    This quest has been funded via Stripe and is now {quest.status}.
                </p>
                <Button asChild>
                    <Link to="/quests/$questId" params={{ questId }}>View Quest</Link>
                </Button>
            </div>
        )
    }

    // Pending (waiting for webhook)
    if (quest?.fundingStatus === 'pending') {
        return (
            <div className="text-center py-8">
                <div
                    className="w-8 h-8 rounded-full border-[3px] border-border border-t-[#635bff] animate-spin mx-auto mb-4"
                    style={{ borderTopColor: '#635bff' }}
                />
                <h3 className="text-base font-semibold text-foreground m-0 mb-2">Payment Processing</h3>
                <p className="text-sm text-fg-muted m-0 mb-4">
                    Your payment is being confirmed. This page will update automatically.
                </p>
            </div>
        )
    }

    return (
        <div className="py-2">
            <div className="mb-5">
                <div className="inline-flex items-center gap-1 px-[0.6rem] py-[0.3rem] rounded-md bg-[#f3f0ff] text-[#635bff] text-xs font-semibold mb-2">
                    <span className="w-5 h-5 rounded-md bg-[#635bff] text-white inline-flex items-center justify-center font-bold text-[11px]">
                        S
                    </span>
                    <span>Stripe Checkout</span>
                </div>
                <p className="text-xs text-fg-muted leading-relaxed m-0">
                    You'll be redirected to Stripe's secure checkout page to complete payment with credit card, debit card, Apple Pay, or Google Pay.
                </p>
            </div>

            <div className="bg-bg-subtle border border-border rounded-md px-5 py-4 mb-5">
                <div className="flex justify-between items-center py-2 text-xs text-fg-muted">
                    <span>Amount</span>
                    <span className="font-bold text-sm text-foreground">
                        ${Math.max(0, (quest?.rewardAmount ?? 0) - (quest?.totalFunded ?? 0)).toLocaleString()} USD
                    </span>
                </div>
                <div className="flex justify-between items-center py-2 text-xs text-fg-muted border-t border-border">
                    <span>Quest</span>
                    <span>{quest?.title}</span>
                </div>
                <div className="flex justify-between items-center py-2 text-xs text-fg-muted border-t border-border">
                    <span>Distribution</span>
                    <span>{quest?.type} · {quest?.totalSlots} winners</span>
                </div>
            </div>

            {checkoutMutation.isError && (
                <p className="text-error text-xs wrap-break-word mb-3">
                    {(checkoutMutation.error as Error).message}
                </p>
            )}

            <button
                className={cn(
                    'w-full inline-flex items-center justify-center gap-1 py-[0.55rem] px-5 text-sm font-semibold border-none rounded-md text-white cursor-pointer transition-colors',
                    'bg-[#635bff] hover:bg-[#4b45c7] disabled:opacity-60 disabled:cursor-not-allowed'
                )}
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
        <div className="max-w-[560px] mx-auto py-8 px-4">
            <nav className="flex items-center gap-1 text-xs text-fg-muted mb-4">
                <Link to="/quests" className="hover:text-foreground transition-colors">Quests</Link>
                <span className="text-fg-muted">/</span>
                <Link to="/quests/$questId" params={{ questId }} className="hover:text-foreground transition-colors">
                    {quest?.title || 'Quest'}
                </Link>
                <span className="text-fg-muted">/</span>
                <span className="text-foreground">Fund</span>
            </nav>

            <div className="bg-background border border-border rounded-lg p-8">
                <h2 className="text-xl font-bold text-foreground m-0 mb-1">Fund Quest</h2>
                {quest && <p className="text-fg-muted text-xs m-0 mb-6">{quest.title}</p>}

                {/* Payment method toggle */}
                {canToggle && (
                    <div className="flex mb-6 border border-border rounded-md overflow-hidden">
                        <button
                            className={cn(
                                'flex-1 py-[0.6rem] px-4 text-sm font-semibold border-none cursor-pointer flex items-center justify-center gap-1 transition-all border-r border-border',
                                method === 'crypto'
                                    ? 'bg-background text-foreground shadow-[inset_0_-2px_0_var(--accent)]'
                                    : 'bg-bg-subtle text-fg-muted hover:bg-background'
                            )}
                            onClick={() => setMethod('crypto')}
                        >
                            <span>⛓</span> Crypto
                        </button>
                        <button
                            className={cn(
                                'flex-1 py-[0.6rem] px-4 text-sm font-semibold border-none cursor-pointer flex items-center justify-center gap-1 transition-all',
                                method === 'stripe'
                                    ? 'bg-background text-foreground shadow-[inset_0_-2px_0_var(--accent)]'
                                    : 'bg-bg-subtle text-fg-muted hover:bg-background'
                            )}
                            onClick={() => setMethod('stripe')}
                        >
                            <span>💳</span> Card (Stripe)
                        </button>
                    </div>
                )}

                {/* Funding progress — shared across both methods */}
                {quest && (
                    <FundingProgress quest={quest} session={session} questId={questId} />
                )}

                {/* Stripe flow */}
                {method === 'stripe' && (
                    <StripeFundFlow questId={questId} quest={quest} />
                )}

                {/* Crypto flow */}
                {method === 'crypto' && (
                    <>
                        {paramsLoading && (
                            <div className="text-center text-fg-muted py-12">Loading deposit parameters...</div>
                        )}

                        {paramsError && !params && (
                            <>
                                <p className="text-error text-xs wrap-break-word mb-3">
                                    {(paramsError as Error)?.message || 'Quest not found or already funded'}
                                </p>
                                <Button asChild variant="outline">
                                    <Link to="/dashboard">Back to Dashboard</Link>
                                </Button>
                            </>
                        )}

                        {params && (
                            <>
                                <FundSummary params={params} />
                                <FundStepIndicator step={step} isNative={params.isNative} />

                                <div className="text-center min-h-[120px]">
                                    {step === 'connect' && (
                                        <div className="flex flex-col items-center gap-4">
                                            <p className="text-fg-muted m-0 mb-4 text-xs">Connect your wallet to fund this quest</p>
                                            <ConnectButton />
                                        </div>
                                    )}

                                    {isConnected && currentChainId !== params.chainId && step !== 'connect' && step !== 'success' && step !== 'error' && (
                                        <div className="p-4 bg-warning-light border border-warning rounded-md">
                                            <p className="text-warning text-xs m-0 mb-4">
                                                Please switch to <strong>{params.chainName}</strong>
                                            </p>
                                            <Button onClick={() => switchChain({ chainId: params.chainId })}>
                                                Switch Network
                                            </Button>
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
                                        <div className="flex flex-col items-center gap-4">
                                            <p className="text-error text-xs wrap-break-word">{errorMsg}</p>
                                            <Button variant="outline" onClick={() => handleRetry(isConnected, params.isNative)}>
                                                Try Again
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {isConnected && step !== 'connect' && (
                                    <div className="mt-6 pt-4 border-t border-border flex justify-center">
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

// ─── Funding Progress + Invite Section ──────────────────────────────────────

function FundingProgress({ quest, session, questId }: { quest: any; session: any; questId: string }) {
    const totalFunded = quest.totalFunded ?? 0
    const rewardAmount = quest.rewardAmount ?? 0
    const fundingPct = rewardAmount > 0 ? Math.min(100, (totalFunded / rewardAmount) * 100) : 0
    const isFullyFunded = totalFunded >= rewardAmount
    const isOwner = quest.isCreator
    const token = session?.access_token

    // Fetch collaborators to check if user is a sponsor
    const { data: collabData } = useQuery({
        queryKey: ['quest-collaborators', questId],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/quests/${questId}/collaborators`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) return null
            return res.json()
        },
        enabled: !!token,
    })

    const isSponsor = collabData?.collaborators?.length > 0
    const isOwnerOrSponsor = isOwner || isSponsor

    const [inviteOpen, setInviteOpen] = useState(false)
    const [inviteUrl, setInviteUrl] = useState('')

    const inviteMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`${API_BASE}/quests/${questId}/invite`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.error?.message || 'Failed to generate invite')
            }
            return res.json()
        },
        onSuccess: (data: { inviteUrl: string }) => {
            setInviteUrl(data.inviteUrl)
            setInviteOpen(true)
        },
    })

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(inviteUrl)
    }, [inviteUrl])

    if (rewardAmount <= 0) return null

    return (
        <>
            <div className="mb-6 space-y-2">
                <div className="flex justify-between text-xs text-fg-muted">
                    <span>Funding progress</span>
                    <span>{totalFunded} / {rewardAmount} {quest.rewardType}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${fundingPct}%` }}
                    />
                </div>
                {!isFullyFunded && (
                    <p className="text-xs text-fg-muted">
                        {(rewardAmount - totalFunded).toFixed(2)} {quest.rewardType} still needed to publish
                    </p>
                )}
            </div>

            {isOwnerOrSponsor && (
                <div className="mt-3 flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => inviteMutation.mutate()}
                        disabled={inviteMutation.isPending}
                    >
                        {inviteMutation.isPending ? 'Generating...' : 'Invite a partner'}
                    </Button>
                    {inviteMutation.isError && (
                        <span className="text-destructive text-xs">{(inviteMutation.error as Error).message}</span>
                    )}
                </div>
            )}

            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Invite a Partner</DialogTitle>
                        <DialogDescription>
                            Share this link. Expires in 7 days, single use.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-2">
                        <input
                            readOnly
                            value={inviteUrl}
                            className="flex-1 text-sm bg-muted rounded px-3 py-2 border-none outline-none"
                        />
                        <Button size="sm" onClick={handleCopy}>
                            Copy
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
