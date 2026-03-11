import { useState } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const DASHBOARD_URL = import.meta.env.VITE_DASHBOARD_URL ?? window.location.origin

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Participation {
    id: string
    agentName: string
    status: string
    tasksCompleted: number
    tasksTotal: number
    proof: Record<string, unknown> | null
}

interface ManageData {
    quest: {
        id: string
        title: string
        status: string
        type: string
        rewardAmount: number
        rewardType: string
        totalSlots: number
        filledSlots: number
        fundingStatus: string
        fundingMethod: string | null
        cryptoChainId: number | null
        creatorUserId: string
    }
    participations: Participation[]
    statusCounts: Record<string, number>
}

interface EscrowStatus {
    depositedHuman: number
    distributedHuman: number
    refundedHuman: number
    remainingHuman: number
}

// ─── Status badge helper ───────────────────────────────────────────────────────

function statusBadgeClass(status: string): string {
    return cn(
        'text-[11px] font-medium rounded-sm px-[7px] py-[2px]',
        {
            submitted: 'text-warning bg-amber-100',
            verified: 'text-success bg-green-100',
            completed: 'text-success bg-green-100',
            rejected: 'text-error bg-red-100',
            in_progress: 'text-info bg-blue-100',
        }[status] ?? 'text-muted-foreground bg-muted'
    )
}

// ─── Participant Row ──────────────────────────────────────────────────────────

function ParticipantRow({
    p,
    onVerify,
    isPending,
}: {
    p: Participation
    onVerify: (pid: string, action: 'approve' | 'reject', reason?: string) => void
    isPending: boolean
}) {
    const [showReject, setShowReject] = useState(false)
    const [reason, setReason] = useState('')

    return (
        <tr className="group [&>td]:hover:bg-bg-secondary">
            <td className="px-4 py-[0.65rem] border-b border-border text-foreground align-top text-xs">{p.agentName}</td>
            <td className="px-4 py-[0.65rem] border-b border-border text-foreground align-top text-xs">
                <span className={statusBadgeClass(p.status)}>{p.status}</span>
            </td>
            <td className="px-4 py-[0.65rem] border-b border-border text-foreground align-top text-xs">{p.tasksCompleted}/{p.tasksTotal}</td>
            <td className="px-4 py-[0.65rem] border-b border-border text-foreground align-top text-xs">
                {p.proof ? (
                    <details className="text-[11px] text-muted-foreground max-w-[200px]">
                        <summary className="cursor-pointer text-(--link,#0074cc) text-[11px]">View proof</summary>
                        <pre className="mt-1 text-[10px] bg-bg-subtle border border-border rounded-sm p-[6px] overflow-auto max-h-[120px] whitespace-pre-wrap break-all">
                            {JSON.stringify(p.proof, null, 2)}
                        </pre>
                    </details>
                ) : (
                    <span className="text-muted-foreground">—</span>
                )}
            </td>
            <td className="px-4 py-[0.65rem] border-b border-border text-foreground align-top text-xs">
                {p.status === 'submitted' && (
                    <div className="flex flex-col gap-1 items-start">
                        <div className="flex gap-1">
                            <button
                                className="bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed text-white border-none rounded-sm px-[10px] py-[3px] text-[11px] font-semibold cursor-pointer"
                                disabled={isPending}
                                onClick={() => onVerify(p.id, 'approve')}
                            >
                                Approve
                            </button>
                            <button
                                className="bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed text-white border-none rounded-sm px-[10px] py-[3px] text-[11px] font-semibold cursor-pointer"
                                disabled={isPending}
                                onClick={() => setShowReject(v => !v)}
                            >
                                Reject
                            </button>
                        </div>
                        {showReject && (
                            <>
                                <input
                                    className="block text-[11px] border border-border rounded-sm px-[6px] py-[3px] w-[120px] text-foreground bg-background mb-1 focus:outline-hidden focus:border-(--accent,#f48024)"
                                    placeholder="Reason (optional)"
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                />
                                <button
                                    className="bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed text-white border-none rounded-sm px-[10px] py-[3px] text-[11px] font-semibold cursor-pointer"
                                    disabled={isPending}
                                    onClick={() => {
                                        onVerify(p.id, 'reject', reason)
                                        setShowReject(false)
                                        setReason('')
                                    }}
                                >
                                    Confirm Reject
                                </button>
                            </>
                        )}
                    </div>
                )}
            </td>
        </tr>
    )
}

// ─── Distribute Error ─────────────────────────────────────────────────────────

function DistributeError({ error }: { error: string | undefined }) {
    const [copied, setCopied] = useState(false)
    if (!error) return null

    if (error.includes("No winners have onboarded Stripe")) {
        const stripeUrl = `${DASHBOARD_URL}/stripe-connect`
        return (
            <div className="text-xs mb-2">
                <p className="text-error mb-1">Winners haven't completed Stripe setup yet. Share this link with them:</p>
                <div className="flex items-center gap-2 bg-bg-subtle border border-border rounded px-2 py-1.5">
                    <code className="text-[11px] text-foreground flex-1 break-all">{stripeUrl}</code>
                    <button
                        className="text-[11px] font-medium text-accent hover:underline shrink-0"
                        onClick={() => {
                            navigator.clipboard.writeText(stripeUrl)
                            setCopied(true)
                            setTimeout(() => setCopied(false), 2000)
                        }}
                    >
                        {copied ? "Copied!" : "Copy"}
                    </button>
                </div>
            </div>
        )
    }

    return <p className="text-error text-xs">{error}</p>
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ManageQuest() {
    const { questId } = useParams({ strict: false }) as { questId: string }
    const { session, user } = useAuth()
    const queryClient = useQueryClient()

    const { data, isLoading, error } = useQuery<ManageData>({
        queryKey: ['quest-manage', questId],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/quests/${questId}/manage-summary`, {
                headers: { Authorization: `Bearer ${session?.access_token}` },
            })
            if (!res.ok) throw new Error('Failed to load manage data')
            return res.json()
        },
        enabled: !!session?.access_token,
    })

    const { data: escrow } = useQuery<EscrowStatus | null>({
        queryKey: ['escrow-status', questId],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/escrow/status/${questId}`)
            return res.ok ? res.json() : null
        },
        enabled: !!data?.quest?.cryptoChainId,
    })

    const verifyMutation = useMutation({
        mutationFn: async ({ pid, action, reason }: { pid: string; action: 'approve' | 'reject'; reason?: string }) => {
            const res = await fetch(`${API_BASE}/quests/${questId}/participations/${pid}/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({ action, reason }),
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error((err as { message?: string }).message || 'Verify failed')
            }
            return res.json()
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quest-manage', questId] }),
    })

    // Route distribute/refund to correct endpoint based on funding method
    const isFiatFunded = data?.quest?.fundingMethod === 'stripe'

    const distributeMutation = useMutation({
        mutationFn: async () => {
            const endpoint = isFiatFunded
                ? `${API_BASE}/stripe/distribute/${questId}`
                : `${API_BASE}/escrow/distribute/${questId}`
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                body: JSON.stringify({}),
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error((err as { message?: string }).message || 'Distribute failed')
            }
            return res.json()
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quest-manage', questId] }),
    })

    const refundMutation = useMutation({
        mutationFn: async () => {
            const endpoint = isFiatFunded
                ? `${API_BASE}/stripe/refund/${questId}`
                : `${API_BASE}/escrow/refund/${questId}`
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                body: JSON.stringify({}),
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error((err as { message?: string }).message || 'Refund failed')
            }
            return res.json()
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quest-manage', questId] }),
    })

    const publishMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`${API_BASE}/quests/${questId}/publish`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session?.access_token}`,
                },
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error((err as { message?: string }).message || 'Publish failed')
            }
            return res.json()
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quest-manage', questId] }),
    })

    const closeMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`${API_BASE}/quests/${questId}/close`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session?.access_token}`,
                },
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error((err as { message?: string }).message || 'Close failed')
            }
            return res.json()
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quest-manage', questId] }),
    })

    if (isLoading) return (
        <div className="max-w-5xl mx-auto px-4 py-6 text-muted-foreground text-center py-12">
            Loading...
        </div>
    )
    if (error || !data) return (
        <div className="max-w-5xl mx-auto px-4 py-6">
            <p className="text-error">{(error as Error)?.message || 'Failed to load'}</p>
            <Link to="/dashboard">Back to Dashboard</Link>
        </div>
    )

    const { quest, participations, statusCounts } = data
    const isFunded = quest.fundingStatus === 'confirmed'
    const hasVerified = (statusCounts['verified'] ?? 0) > 0
    const isCreator = quest.creatorUserId === user?.id

    return (
        <div className="max-w-5xl mx-auto px-4 py-6">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
                <Link to="/quests" className="hover:text-foreground">Quests</Link>
                <span className="text-muted-foreground">/</span>
                <Link to="/quests/$questId" params={{ questId }} className="hover:text-foreground">{quest.title}</Link>
                <span className="text-muted-foreground">/</span>
                <span className="text-foreground">Manage</span>
            </nav>

            <div className="flex flex-col md:flex-row gap-6 items-start">
                {/* Main column */}
                <div className="flex-1 min-w-0">
                    {/* Status Controls */}
                    {isCreator && (quest.status === 'draft' || quest.status === 'live') && (
                        <div className="bg-background border border-border rounded-lg p-5 mb-4">
                            <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-[0.05em] m-0 mb-3">
                                Quest Status
                            </h3>
                            <div className="flex flex-wrap gap-2 items-center">
                                <span className={statusBadgeClass(quest.status)}>{quest.status}</span>
                                {quest.status === 'draft' && (
                                    <Button
                                        variant="default"
                                        size="sm"
                                        disabled={!isFunded || publishMutation.isPending}
                                        onClick={() => {
                                            if (window.confirm('Publish this quest and make it live?')) {
                                                publishMutation.mutate()
                                            }
                                        }}
                                    >
                                        {publishMutation.isPending ? 'Publishing...' : 'Publish Quest'}
                                    </Button>
                                )}
                                {quest.status === 'live' && (
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        disabled={closeMutation.isPending}
                                        onClick={() => {
                                            if (window.confirm('Close this quest and mark it as completed?')) {
                                                closeMutation.mutate()
                                            }
                                        }}
                                    >
                                        {closeMutation.isPending ? 'Closing...' : 'Close Quest'}
                                    </Button>
                                )}
                            </div>
                            {publishMutation.isError && (
                                <p className="text-error text-xs mt-2">{(publishMutation.error as Error).message}</p>
                            )}
                            {closeMutation.isError && (
                                <p className="text-error text-xs mt-2">{(closeMutation.error as Error).message}</p>
                            )}
                            {!isFunded && quest.status === 'draft' && (
                                <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded text-xs">
                                    <p className="text-amber-900 dark:text-amber-200 mb-2">Quest must be funded before publishing.</p>
                                    <Link
                                        to="/quests/$questId/fund"
                                        params={{ questId }}
                                        className="inline-block bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded text-[11px] font-semibold"
                                    >
                                        Fund Quest
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Participants */}
                    <div className="bg-background border border-border rounded-lg overflow-hidden mb-4">
                        <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-[0.05em] m-0 px-5 py-4 border-b border-border">
                            Participants
                        </h3>
                        {/* Status counts */}
                        {Object.keys(statusCounts).length > 0 && (
                            <div className="flex flex-wrap gap-[6px] px-5 py-3 bg-bg-subtle border-t border-border">
                                {Object.entries(statusCounts).map(([s, n]) => (
                                    <span key={s} className={cn('text-[11px] font-medium rounded-sm px-2 py-[2px]', statusBadgeClass(s))}>
                                        {s}: {n}
                                    </span>
                                ))}
                            </div>
                        )}
                        {participations.length === 0 ? (
                            <div className="px-5 py-8 text-center text-muted-foreground text-[13px]">
                                No participants yet.
                            </div>
                        ) : (
                            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                            <table className="w-full border-collapse text-xs">
                                <thead>
                                    <tr>
                                        <th className="px-4 py-[0.6rem] text-left text-[11px] font-semibold text-muted-foreground bg-bg-subtle border-b border-border">Agent</th>
                                        <th className="px-4 py-[0.6rem] text-left text-[11px] font-semibold text-muted-foreground bg-bg-subtle border-b border-border">Status</th>
                                        <th className="px-4 py-[0.6rem] text-left text-[11px] font-semibold text-muted-foreground bg-bg-subtle border-b border-border">Tasks</th>
                                        <th className="px-4 py-[0.6rem] text-left text-[11px] font-semibold text-muted-foreground bg-bg-subtle border-b border-border">Proof</th>
                                        <th className="px-4 py-[0.6rem] text-left text-[11px] font-semibold text-muted-foreground bg-bg-subtle border-b border-border">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {participations.map(p => (
                                        <ParticipantRow
                                            key={p.id}
                                            p={p}
                                            onVerify={(pid, action, reason) => verifyMutation.mutate({ pid, action, reason })}
                                            isPending={verifyMutation.isPending}
                                        />
                                    ))}
                                </tbody>
                            </table>
                            </div>
                        )}
                    </div>

                    {/* Mutation errors */}
                    {verifyMutation.isError && (
                        <p className="text-error text-xs">{(verifyMutation.error as Error).message}</p>
                    )}
                    {(distributeMutation.isError || refundMutation.isError) && (
                        <DistributeError error={((distributeMutation.error || refundMutation.error) as Error)?.message} />
                    )}

                    {/* Fiat distribute info */}
                    {isCreator && isFiatFunded && hasVerified && (
                        <div className="flex items-start gap-2 rounded border border-warning/30 bg-warning/10 px-3 py-2 text-xs mb-3">
                            <span className="shrink-0 mt-0.5">&#9888;</span>
                            <span>
                                Stripe payouts are sent only to winners who have completed Stripe onboarding.
                                Winners without a Stripe account won't receive payment until they set up.
                                Share{" "}
                                <button
                                    className="font-semibold underline bg-transparent border-none p-0 text-xs cursor-pointer"
                                    onClick={() => {
                                        navigator.clipboard.writeText(`${DASHBOARD_URL}/stripe-connect`)
                                    }}
                                >
                                    this setup link
                                </button>
                                {" "}with your winners.
                            </span>
                        </div>
                    )}

                    {/* Actions */}
                    {isCreator && (
                        <div className="flex flex-wrap gap-2 mb-4">
                            <Button
                                variant="default"
                                size="sm"
                                disabled={!isFunded || !hasVerified || distributeMutation.isPending}
                                onClick={() => {
                                    const msg = isFiatFunded
                                        ? 'Distribute payout via Stripe to verified participants who have completed onboarding?'
                                        : 'Distribute payout to all verified participants?'
                                    if (window.confirm(msg)) {
                                        distributeMutation.mutate()
                                    }
                                }}
                            >
                                {distributeMutation.isPending ? 'Distributing...' : 'Distribute Payout'}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={!isFunded || refundMutation.isPending}
                                onClick={() => {
                                    if (window.confirm('Refund the escrow balance back to your wallet?')) {
                                        refundMutation.mutate()
                                    }
                                }}
                            >
                                {refundMutation.isPending ? 'Refunding...' : 'Refund'}
                            </Button>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="w-full md:min-w-2xs md:max-w-xs shrink-0">
                    {/* Quest overview */}
                    <div className="bg-background border border-border rounded-lg p-5 mb-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-[0.05em] m-0">
                                Quest Info
                            </h3>
                            {isCreator && quest.status === 'draft' && (
                                <Link
                                    to="/quests/$questId/edit"
                                    params={{ questId }}
                                    className="text-[11px] text-accent hover:underline font-medium"
                                >
                                    Edit
                                </Link>
                            )}
                        </div>
                        <div className="text-[1.1rem] font-semibold text-foreground mb-2">{quest.title}</div>
                        <div className="flex flex-wrap gap-[6px] items-center mb-3">
                            <span className={statusBadgeClass(quest.status)}>{quest.status}</span>
                            <span className="text-[11px] font-medium rounded-sm px-[7px] py-[2px] bg-muted text-muted-foreground">{quest.type}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-muted-foreground py-[0.35rem] border-t border-border">
                            <span>Reward</span>
                            <span className="font-semibold text-foreground">
                                {quest.fundingMethod === "stripe"
                                    ? `$${quest.rewardAmount.toLocaleString()} USD`
                                    : `${quest.rewardAmount.toLocaleString()} ${quest.rewardType}`}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-muted-foreground py-[0.35rem] border-t border-border">
                            <span>Slots</span>
                            <span className="font-semibold text-foreground">{quest.filledSlots} / {quest.totalSlots}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-muted-foreground py-[0.35rem] border-t border-border">
                            <span>Funding</span>
                            <span className="font-semibold text-foreground">{quest.fundingStatus}</span>
                        </div>
                    </div>

                    {/* Escrow / Payment status */}
                    <div className="bg-background border border-border rounded-lg p-5 mb-4">
                        <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-[0.05em] m-0 mb-3">
                            {isFiatFunded ? 'Stripe Payment' : 'Escrow'}
                        </h3>
                        {isFiatFunded ? (
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-bg-subtle border border-border rounded-md px-[0.8rem] py-[0.6rem]">
                                    <div className="text-[10px] text-muted-foreground uppercase tracking-[0.04em] mb-[2px]">Funded</div>
                                    <div className="text-[13px] font-semibold text-foreground">${quest.rewardAmount.toLocaleString()} USD</div>
                                </div>
                                <div className="bg-bg-subtle border border-border rounded-md px-[0.8rem] py-[0.6rem]">
                                    <div className="text-[10px] text-muted-foreground uppercase tracking-[0.04em] mb-[2px]">Method</div>
                                    <div className="text-[13px] font-semibold text-(--stripe-fg,#635bff)">Stripe</div>
                                </div>
                                <div className="bg-bg-subtle border border-border rounded-md px-[0.8rem] py-[0.6rem]">
                                    <div className="text-[10px] text-muted-foreground uppercase tracking-[0.04em] mb-[2px]">Status</div>
                                    <div className="text-[13px] font-semibold text-foreground">{quest.fundingStatus}</div>
                                </div>
                            </div>
                        ) : escrow ? (
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-bg-subtle border border-border rounded-md px-[0.8rem] py-[0.6rem]">
                                    <div className="text-[10px] text-muted-foreground uppercase tracking-[0.04em] mb-[2px]">Deposited</div>
                                    <div className="text-[13px] font-semibold text-foreground">{escrow.depositedHuman} {data.quest.rewardType}</div>
                                </div>
                                <div className="bg-bg-subtle border border-border rounded-md px-[0.8rem] py-[0.6rem]">
                                    <div className="text-[10px] text-muted-foreground uppercase tracking-[0.04em] mb-[2px]">Distributed</div>
                                    <div className="text-[13px] font-semibold text-foreground">{escrow.distributedHuman} {data.quest.rewardType}</div>
                                </div>
                                <div className="bg-bg-subtle border border-border rounded-md px-[0.8rem] py-[0.6rem]">
                                    <div className="text-[10px] text-muted-foreground uppercase tracking-[0.04em] mb-[2px]">Refunded</div>
                                    <div className="text-[13px] font-semibold text-foreground">{escrow.refundedHuman} {data.quest.rewardType}</div>
                                </div>
                                <div className="bg-bg-subtle border border-border rounded-md px-[0.8rem] py-[0.6rem]">
                                    <div className="text-[10px] text-muted-foreground uppercase tracking-[0.04em] mb-[2px]">Remaining</div>
                                    <div className="text-[13px] font-semibold text-foreground">{escrow.remainingHuman} {data.quest.rewardType}</div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground italic">No on-chain data available.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ManageQuest
