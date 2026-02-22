import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import {
    useAccount,
    useChainId,
    useSwitchChain,
    useWriteContract,
    useWaitForTransactionReceipt,
} from 'wagmi'
import { ESCROW_ABI, ERC20_APPROVE_ABI, getChainById } from '@clawquest/shared'
import '@/styles/pages/fund-quest.css'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

// ─── Types ───────────────────────────────────────────────────────────────────

interface DepositParams {
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

type FundStep = 'connect' | 'approve' | 'deposit' | 'confirming' | 'success' | 'error'

function getExplorerTxUrl(chainId: number, txHash: string): string | null {
    const chain = getChainById(chainId)
    if (!chain) return null
    return `${chain.explorerUrl}/tx/${txHash}`
}

// ─── Component ───────────────────────────────────────────────────────────────

export function FundQuest() {
    const { questId } = useParams({ strict: false }) as { questId: string }
    const { session } = useAuth()
    const [step, setStep] = useState<FundStep>('connect')
    const [errorMsg, setErrorMsg] = useState('')
    const { isConnected } = useAccount()
    const currentChainId = useChainId()
    const { switchChain } = useSwitchChain()

    // ── Fetch deposit params ─────────────────────────────────────────────────
    const { data: params, isLoading: paramsLoading, error: paramsError } = useQuery<DepositParams>({
        queryKey: ['deposit-params', questId],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/escrow/deposit-params/${questId}`)
            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: 'Failed to load deposit params' }))
                throw new Error(err.message || 'Failed to load deposit params')
            }
            return res.json()
        },
        enabled: !!questId,
    })

    // ── Fetch quest details ──────────────────────────────────────────────────
    const { data: quest } = useQuery({
        queryKey: ['quest', questId],
        queryFn: async () => {
            const headers: Record<string, string> = {}
            if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`
            const res = await fetch(`${API_BASE}/quests/${questId}`, { headers })
            if (!res.ok) throw new Error('Quest not found')
            return res.json()
        },
        enabled: !!questId,
    })

    // ── Approve ERC20 ────────────────────────────────────────────────────────
    const {
        writeContract: writeApprove,
        data: approveTxHash,
        isPending: approveLoading,
        error: approveError,
    } = useWriteContract()

    const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({
        hash: approveTxHash,
    })

    // ── Deposit ──────────────────────────────────────────────────────────────
    const {
        writeContract: writeDeposit,
        data: depositTxHash,
        isPending: depositLoading,
        error: depositError,
    } = useWriteContract()

    const { isSuccess: depositConfirmed } = useWaitForTransactionReceipt({
        hash: depositTxHash,
    })

    // ── Poll for funding confirmation ────────────────────────────────────────
    const { data: fundingStatus } = useQuery({
        queryKey: ['funding-status', questId],
        queryFn: async () => {
            const headers: Record<string, string> = {}
            if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`
            const res = await fetch(`${API_BASE}/quests/${questId}`, { headers })
            if (!res.ok) return null
            const q = await res.json()
            return q.fundingStatus || q.status
        },
        enabled: step === 'confirming',
        refetchInterval: 5000,
    })

    // ── Step management ──────────────────────────────────────────────────────

    // If quest is already funded when page loads, skip to success
    useEffect(() => {
        if (quest && (quest.fundingStatus === 'confirmed' || quest.status === 'live' || quest.status === 'scheduled')) {
            if (step !== 'success') setStep('success')
        }
    }, [quest])

    useEffect(() => {
        if (isConnected && step === 'connect') {
            setStep(params?.isNative ? 'deposit' : 'approve')
        }
    }, [isConnected, step, params?.isNative])

    useEffect(() => {
        if (approveConfirmed && step === 'approve') {
            setStep('deposit')
        }
    }, [approveConfirmed, step])

    useEffect(() => {
        if (depositConfirmed && step === 'deposit') {
            setStep('confirming')
        }
    }, [depositConfirmed, step])

    useEffect(() => {
        if (fundingStatus === 'confirmed' || fundingStatus === 'live' || fundingStatus === 'scheduled') {
            setStep('success')
        }
    }, [fundingStatus])

    useEffect(() => {
        const err = approveError || depositError
        if (err) {
            setErrorMsg(err.message?.includes('User rejected') ? 'Transaction rejected by user' : err.message || 'Transaction failed')
            setStep('error')
        }
    }, [approveError, depositError])

    // ── Handlers ─────────────────────────────────────────────────────────────

    const handleSwitchChain = useCallback(() => {
        if (params) {
            switchChain({ chainId: params.chainId })
        }
    }, [params, switchChain])

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

    const handleRetry = useCallback(() => {
        setErrorMsg('')
        setStep(isConnected ? (params?.isNative ? 'deposit' : 'approve') : 'connect')
    }, [isConnected, params?.isNative])

    // ── Render ───────────────────────────────────────────────────────────────

    if (paramsLoading) {
        return (
            <div className="fund-quest-page">
                <div className="fund-card">
                    <div className="fund-loading">Loading deposit parameters...</div>
                </div>
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

    return (
        <div className="fund-quest-page">
            {/* Breadcrumb */}
            <nav className="breadcrumb">
                <Link to="/quests">Quests</Link>
                <span className="breadcrumb-sep">/</span>
                <Link to="/quests/$questId" params={{ questId }}>
                    {quest?.title || 'Quest'}
                </Link>
                <span className="breadcrumb-sep">/</span>
                <span>Fund</span>
            </nav>

            <div className="fund-card">
                <h2 className="fund-title">Fund Quest</h2>
                {quest && <p className="fund-quest-name">{quest.title}</p>}

                {/* Summary */}
                <div className="fund-summary">
                    <div className="fund-summary-row">
                        <span>Amount</span>
                        <span className="fund-amount">{params.amount} {params.tokenSymbol}</span>
                    </div>
                    <div className="fund-summary-row">
                        <span>Network</span>
                        <span>{params.chainName}</span>
                    </div>
                    <div className="fund-summary-row">
                        <span>Contract</span>
                        <span className="fund-address" title={params.contractAddress}>
                            {params.contractAddress.slice(0, 6)}...{params.contractAddress.slice(-4)}
                        </span>
                    </div>
                    {params.expiresAt > 0 && (
                        <div className="fund-summary-row">
                            <span>Expires</span>
                            <span>{new Date(params.expiresAt * 1000).toLocaleDateString()}</span>
                        </div>
                    )}
                </div>

                {/* Step indicator */}
                <div className="fund-steps">
                    <div className={`fund-step ${step === 'connect' ? 'active' : 'done'}`}>
                        <span className="fund-step-num">1</span>
                        <span>Connect</span>
                    </div>
                    {!params.isNative && (
                        <div className={`fund-step ${step === 'approve' ? 'active' : ['deposit', 'confirming', 'success'].includes(step) ? 'done' : ''}`}>
                            <span className="fund-step-num">2</span>
                            <span>Approve</span>
                        </div>
                    )}
                    <div className={`fund-step ${step === 'deposit' ? 'active' : ['confirming', 'success'].includes(step) ? 'done' : ''}`}>
                        <span className="fund-step-num">{params.isNative ? 2 : 3}</span>
                        <span>Deposit</span>
                    </div>
                    <div className={`fund-step ${step === 'confirming' ? 'active' : step === 'success' ? 'done' : ''}`}>
                        <span className="fund-step-num">{params.isNative ? 3 : 4}</span>
                        <span>Confirm</span>
                    </div>
                </div>

                {/* Action area */}
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
                            <button className="btn btn-primary" onClick={handleSwitchChain}>
                                Switch Network
                            </button>
                        </div>
                    )}

                    {!wrongChain && step === 'approve' && (
                        <div>
                            <p>Approve {params.tokenSymbol} spending</p>
                            <button
                                className="btn btn-primary fund-btn"
                                onClick={handleApprove}
                                disabled={approveLoading}
                            >
                                {approveLoading ? 'Approving...' : `Approve ${params.amount} ${params.tokenSymbol}`}
                            </button>
                            {approveTxHash && !approveConfirmed && (
                                <p className="fund-tx-status">Waiting for confirmation...</p>
                            )}
                        </div>
                    )}

                    {!wrongChain && step === 'deposit' && (
                        <div>
                            <p>Deposit {params.amount} {params.tokenSymbol} to escrow</p>
                            <button
                                className="btn btn-primary fund-btn"
                                onClick={handleDeposit}
                                disabled={depositLoading}
                            >
                                {depositLoading ? 'Depositing...' : `Deposit ${params.amount} ${params.tokenSymbol}`}
                            </button>
                            {depositTxHash && !depositConfirmed && (
                                <p className="fund-tx-status">Waiting for confirmation...</p>
                            )}
                        </div>
                    )}

                    {step === 'confirming' && (
                        <div className="fund-confirming">
                            <div className="fund-spinner" />
                            <p>Deposit confirmed on-chain! Waiting for backend to detect...</p>
                            {depositTxHash && (
                                <TxLink chainId={params.chainId} txHash={depositTxHash} />
                            )}
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="fund-success">
                            <div className="fund-success-icon">&#10003;</div>
                            <h3>Quest Funded!</h3>
                            <p>Your quest is now live and accepting participants.</p>
                            {(depositTxHash || quest?.cryptoTxHash) && (
                                <TxLink chainId={params.chainId} txHash={(depositTxHash || quest?.cryptoTxHash)!} />
                            )}
                            <Link to="/quests/$questId" params={{ questId }} className="btn btn-primary">
                                View Quest
                            </Link>
                        </div>
                    )}

                    {step === 'error' && (
                        <div className="fund-error">
                            <p className="fund-error-msg">{errorMsg}</p>
                            <button className="btn btn-secondary" onClick={handleRetry}>
                                Try Again
                            </button>
                        </div>
                    )}
                </div>

                {/* Wallet info */}
                {isConnected && step !== 'connect' && (
                    <div className="fund-wallet-info">
                        <ConnectButton accountStatus="address" chainStatus="icon" showBalance={false} />
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── Tx Link Component ───────────────────────────────────────────────────────

function TxLink({ chainId, txHash }: { chainId: number; txHash: string }) {
    const url = getExplorerTxUrl(chainId, txHash)
    const short = `${txHash.slice(0, 10)}...${txHash.slice(-8)}`
    if (!url) return <p className="fund-tx-hash">Tx: {short}</p>
    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="fund-tx-hash fund-tx-link"
        >
            Tx: {short} &#x2197;
        </a>
    )
}
