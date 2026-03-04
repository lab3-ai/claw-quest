import { useState } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

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

// ─── Status Badge ─────────────────────────────────────────────────────────────

const statusStyles: Record<string, string> = {
    submitted: 'text-warning bg-warning-light',
    verified: 'text-success bg-success-light',
    rejected: 'text-error bg-error-light',
    in_progress: 'text-info bg-info-light',
    completed: 'text-success bg-success-light',
}

function StatusBadge({ status }: { status: string }) {
    return (
        <span className={cn('rounded text-xs px-1.5 py-0.5 font-medium', statusStyles[status] || 'text-muted-foreground bg-muted')}>
            {status}
        </span>
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
        <tr className="group">
            <td className="px-4 py-2.5 border-b border-border text-foreground align-top last:border-b-0 group-hover:bg-muted/50">
                {p.agentName}
            </td>
            <td className="px-4 py-2.5 border-b border-border text-foreground align-top last:border-b-0 group-hover:bg-muted/50">
                <StatusBadge status={p.status} />
            </td>
            <td className="px-4 py-2.5 border-b border-border text-foreground align-top last:border-b-0 group-hover:bg-muted/50">
                {p.tasksCompleted}/{p.tasksTotal}
            </td>
            <td className="px-4 py-2.5 border-b border-border text-foreground align-top last:border-b-0 group-hover:bg-muted/50">
                {p.proof ? (
                    <details className="text-xs text-muted-foreground max-w-[200px]">
                        <summary className="cursor-pointer text-primary text-xs">View proof</summary>
                        <pre className="mt-1 text-xs bg-muted/50 border border-border rounded p-1.5 overflow-auto max-h-[120px] whitespace-pre-wrap break-all">
                            {JSON.stringify(p.proof, null, 2)}
                        </pre>
                    </details>
                ) : (
                    <span className="text-muted-foreground">—</span>
                )}
            </td>
            <td className="px-4 py-2.5 border-b border-border text-foreground align-top last:border-b-0 group-hover:bg-muted/50">
                {p.status === 'submitted' && (
                    <div className="flex flex-col gap-1 items-start">
                        <div className="flex gap-1">
                            <Button
                                size="sm"
                                className="bg-success hover:bg-success/90 text-primary-foreground text-xs h-auto py-1 px-2.5"
                                disabled={isPending}
                                onClick={() => onVerify(p.id, 'approve')}
                            >
                                Approve
                            </Button>
                            <Button
                                size="sm"
                                variant="destructive"
                                className="text-xs h-auto py-1 px-2.5"
                                disabled={isPending}
                                onClick={() => setShowReject(v => !v)}
                            >
                                Reject
                            </Button>
                        </div>
                        {showReject && (
                            <>
                                <input
                                    className="text-xs border border-border rounded px-1.5 py-1 w-[120px] text-foreground bg-background mb-1 block focus:outline-none focus:border-accent"
                                    placeholder="Reason (optional)"
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                />
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    className="text-xs h-auto py-1 px-2.5"
                                    disabled={isPending}
                                    onClick={() => {
                                        onVerify(p.id, 'reject', reason)
                                        setShowReject(false)
                                        setReason('')
                                    }}
                                >
                                    Confirm Reject
                                </Button>
                            </>
                        )}
                    </div>
                )}
            </td>
        </tr>
    )
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

    const distributeMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`${API_BASE}/escrow/distribute/${questId}`, {
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
            const res = await fetch(`${API_BASE}/escrow/refund/${questId}`, {
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

    if (isLoading) return (
        <div className="max-w-[960px] mx-auto py-6 px-4 text-muted-foreground py-12 text-center">
            Loading...
        </div>
    )
    if (error || !data) return (
        <div className="max-w-[960px] mx-auto py-6 px-4">
            <p className="text-destructive">{(error as Error)?.message || 'Failed to load'}</p>
            <Link to="/dashboard">Back to Dashboard</Link>
        </div>
    )

    const { quest, participations, statusCounts } = data
    const isFunded = quest.fundingStatus === 'confirmed'
    const hasVerified = (statusCounts['verified'] ?? 0) > 0
    const isCreator = quest.creatorUserId === user?.id

    return (
        <div className="max-w-[960px] mx-auto py-6 px-4">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 py-3 text-xs text-muted-foreground">
                <Link to="/quests">Quests</Link>
                <span>/</span>
                <Link to="/quests/$questId" params={{ questId }}>{quest.title}</Link>
                <span>/</span>
                <span>Manage</span>
            </nav>

            <div className="grid grid-cols-[1fr_280px] gap-6 items-start max-md:grid-cols-1">
                {/* Main column */}
                <div>
                    {/* Participants */}
                    <div className="bg-background border border-border rounded overflow-hidden mb-4">
                        <h3 className="text-base font-semibold text-muted-foreground uppercase tracking-wide m-0 px-5 pt-4 pb-3 border-b border-border">
                            Participants
                        </h3>
                        {/* Status counts */}
                        {Object.keys(statusCounts).length > 0 && (
                            <div className="flex flex-wrap gap-1.5 px-5 py-3 bg-muted/50 border-t border-border">
                                {Object.entries(statusCounts).map(([s, n]) => (
                                    <span
                                        key={s}
                                        className={cn('text-xs px-2 py-0.5 rounded font-medium', statusStyles[s] || 'text-muted-foreground bg-muted')}
                                    >
                                        {s}: {n}
                                    </span>
                                ))}
                            </div>
                        )}
                        {participations.length === 0 ? (
                            <div className="py-8 px-5 text-center text-muted-foreground text-base">
                                No participants yet.
                            </div>
                        ) : (
                            <table className="w-full border-collapse text-xs">
                                <thead>
                                    <tr>
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground bg-muted/50 border-b border-border">Agent</th>
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground bg-muted/50 border-b border-border">Status</th>
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground bg-muted/50 border-b border-border">Tasks</th>
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground bg-muted/50 border-b border-border">Proof</th>
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground bg-muted/50 border-b border-border">Actions</th>
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
                        )}
                    </div>

                    {/* Mutation errors */}
                    {verifyMutation.isError && (
                        <p className="text-destructive text-xs">{(verifyMutation.error as Error).message}</p>
                    )}
                    {(distributeMutation.isError || refundMutation.isError) && (
                        <p className="text-destructive text-xs">
                            {((distributeMutation.error || refundMutation.error) as Error)?.message}
                        </p>
                    )}

                    {/* Actions */}
                    {isCreator && (
                        <div className="flex gap-2 flex-wrap mb-4">
                            <Button
                                disabled={!isFunded || !hasVerified || distributeMutation.isPending}
                                onClick={() => {
                                    if (window.confirm('Distribute payout to all verified participants?')) {
                                        distributeMutation.mutate()
                                    }
                                }}
                            >
                                {distributeMutation.isPending ? 'Distributing...' : 'Distribute Payout'}
                            </Button>
                            <Button
                                variant="secondary"
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
                <div>
                    {/* Quest overview */}
                    <div className="bg-background border border-border rounded p-5 mb-4">
                        <h3 className="text-base font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                            Quest Info
                        </h3>
                        <div className="text-lg font-semibold text-foreground mb-2">{quest.title}</div>
                        <div className="flex flex-wrap gap-1.5 items-center mb-3">
                            <Badge variant={quest.status as any}>{quest.status}</Badge>
                            <Badge>{quest.type}</Badge>
                        </div>
                        <div className="flex justify-between items-center text-xs text-muted-foreground py-1.5 border-t border-border">
                            <span>Reward</span>
                            <span className="font-semibold text-foreground">{quest.rewardAmount.toLocaleString()} {quest.rewardType}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-muted-foreground py-1.5 border-t border-border">
                            <span>Slots</span>
                            <span className="font-semibold text-foreground">{quest.filledSlots} / {quest.totalSlots}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-muted-foreground py-1.5 border-t border-border">
                            <span>Funding</span>
                            <span className="font-semibold text-foreground">{quest.fundingStatus}</span>
                        </div>
                    </div>

                    {/* Escrow status */}
                    <div className="bg-background border border-border rounded p-5 mb-4">
                        <h3 className="text-base font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                            Escrow
                        </h3>
                        {escrow ? (
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-muted/50 border border-border rounded p-2.5 px-3">
                                    <div className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Deposited</div>
                                    <div className="text-base font-semibold text-foreground">{escrow.depositedHuman} {data.quest.rewardType}</div>
                                </div>
                                <div className="bg-muted/50 border border-border rounded p-2.5 px-3">
                                    <div className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Distributed</div>
                                    <div className="text-base font-semibold text-foreground">{escrow.distributedHuman} {data.quest.rewardType}</div>
                                </div>
                                <div className="bg-muted/50 border border-border rounded p-2.5 px-3">
                                    <div className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Refunded</div>
                                    <div className="text-base font-semibold text-foreground">{escrow.refundedHuman} {data.quest.rewardType}</div>
                                </div>
                                <div className="bg-muted/50 border border-border rounded p-2.5 px-3">
                                    <div className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Remaining</div>
                                    <div className="text-base font-semibold text-foreground">{escrow.remainingHuman} {data.quest.rewardType}</div>
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
