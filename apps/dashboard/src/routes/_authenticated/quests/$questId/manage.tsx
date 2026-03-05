import { useState } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import '@/styles/pages/quest-manage.css'

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
        <tr>
            <td>{p.agentName}</td>
            <td>
                <span className={`status-${p.status}`}>{p.status}</span>
            </td>
            <td>{p.tasksCompleted}/{p.tasksTotal}</td>
            <td>
                {p.proof ? (
                    <details className="proof-details">
                        <summary>View proof</summary>
                        <pre>{JSON.stringify(p.proof, null, 2)}</pre>
                    </details>
                ) : (
                    <span style={{ color: 'var(--fg-muted)' }}>—</span>
                )}
            </td>
            <td>
                {p.status === 'submitted' && (
                    <div className="btn-action-row">
                        <div style={{ display: 'flex', gap: 4 }}>
                            <button
                                className="btn-approve"
                                disabled={isPending}
                                onClick={() => onVerify(p.id, 'approve')}
                            >
                                Approve
                            </button>
                            <button
                                className="btn-reject"
                                disabled={isPending}
                                onClick={() => setShowReject(v => !v)}
                            >
                                Reject
                            </button>
                        </div>
                        {showReject && (
                            <>
                                <input
                                    className="reject-input"
                                    placeholder="Reason (optional)"
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                />
                                <button
                                    className="btn-reject"
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

    if (isLoading) return <div className="manage-page" style={{ color: 'var(--fg-muted)', padding: '3rem 0', textAlign: 'center' }}>Loading...</div>
    if (error || !data) return (
        <div className="manage-page">
            <p style={{ color: 'var(--red, #c02d2d)' }}>{(error as Error)?.message || 'Failed to load'}</p>
            <Link to="/dashboard">Back to Dashboard</Link>
        </div>
    )

    const { quest, participations, statusCounts } = data
    const isFunded = quest.fundingStatus === 'confirmed'
    const hasVerified = (statusCounts['verified'] ?? 0) > 0
    const isCreator = quest.creatorUserId === user?.id

    return (
        <div className="manage-page">
            {/* Breadcrumb */}
            <nav className="breadcrumb">
                <Link to="/quests">Quests</Link>
                <span className="breadcrumb-sep">/</span>
                <Link to="/quests/$questId" params={{ questId }}>{quest.title}</Link>
                <span className="breadcrumb-sep">/</span>
                <span>Manage</span>
            </nav>

            <div className="manage-grid">
                {/* Main column */}
                <div>
                    {/* Participants */}
                    <div className="manage-participants">
                        <h3>Participants</h3>
                        {/* Status counts */}
                        {Object.keys(statusCounts).length > 0 && (
                            <div className="manage-status-counts">
                                {Object.entries(statusCounts).map(([s, n]) => (
                                    <span key={s} className={`status-count-badge status-${s}`}>{s}: {n}</span>
                                ))}
                            </div>
                        )}
                        {participations.length === 0 ? (
                            <div className="manage-empty">No participants yet.</div>
                        ) : (
                            <table>
                                <thead>
                                    <tr>
                                        <th>Agent</th>
                                        <th>Status</th>
                                        <th>Tasks</th>
                                        <th>Proof</th>
                                        <th>Actions</th>
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
                        <p style={{ color: 'var(--red, #c02d2d)', fontSize: 12 }}>{(verifyMutation.error as Error).message}</p>
                    )}
                    {(distributeMutation.isError || refundMutation.isError) && (
                        <p style={{ color: 'var(--red, #c02d2d)', fontSize: 12 }}>
                            {((distributeMutation.error || refundMutation.error) as Error)?.message}
                        </p>
                    )}

                    {/* Actions */}
                    {isCreator && (
                        <div className="manage-actions">
                            <button
                                className="btn btn-primary"
                                disabled={!isFunded || !hasVerified || distributeMutation.isPending}
                                onClick={() => {
                                    if (window.confirm('Distribute payout to all verified participants?')) {
                                        distributeMutation.mutate()
                                    }
                                }}
                            >
                                {distributeMutation.isPending ? 'Distributing...' : 'Distribute Payout'}
                            </button>
                            <button
                                className="btn btn-secondary"
                                disabled={!isFunded || refundMutation.isPending}
                                onClick={() => {
                                    if (window.confirm('Refund the escrow balance back to your wallet?')) {
                                        refundMutation.mutate()
                                    }
                                }}
                            >
                                {refundMutation.isPending ? 'Refunding...' : 'Refund'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div>
                    {/* Quest overview */}
                    <div className="manage-overview">
                        <h3>Quest Info</h3>
                        <div className="manage-overview-title">{quest.title}</div>
                        <div className="manage-overview-meta">
                            <span className={`badge badge-${quest.status}`}>{quest.status}</span>
                            <span className="badge">{quest.type}</span>
                        </div>
                        <div className="manage-stat-row">
                            <span>Reward</span>
                            <span className="manage-stat-val">{quest.rewardAmount.toLocaleString()} {quest.rewardType}</span>
                        </div>
                        <div className="manage-stat-row">
                            <span>Slots</span>
                            <span className="manage-stat-val">{quest.filledSlots} / {quest.totalSlots}</span>
                        </div>
                        <div className="manage-stat-row">
                            <span>Funding</span>
                            <span className="manage-stat-val">{quest.fundingStatus}</span>
                        </div>
                    </div>

                    {/* Escrow / Payment status */}
                    <div className="manage-escrow">
                        <h3>{isFiatFunded ? 'Stripe Payment' : 'Escrow'}</h3>
                        {isFiatFunded ? (
                            <div className="manage-escrow-grid">
                                <div className="manage-escrow-item">
                                    <div className="manage-escrow-label">Funded</div>
                                    <div className="manage-escrow-val">${quest.rewardAmount.toLocaleString()} USD</div>
                                </div>
                                <div className="manage-escrow-item">
                                    <div className="manage-escrow-label">Method</div>
                                    <div className="manage-escrow-val" style={{ color: 'var(--stripe-fg, #635bff)' }}>Stripe</div>
                                </div>
                                <div className="manage-escrow-item">
                                    <div className="manage-escrow-label">Status</div>
                                    <div className="manage-escrow-val">{quest.fundingStatus}</div>
                                </div>
                            </div>
                        ) : escrow ? (
                            <div className="manage-escrow-grid">
                                <div className="manage-escrow-item">
                                    <div className="manage-escrow-label">Deposited</div>
                                    <div className="manage-escrow-val">{escrow.depositedHuman} {data.quest.rewardType}</div>
                                </div>
                                <div className="manage-escrow-item">
                                    <div className="manage-escrow-label">Distributed</div>
                                    <div className="manage-escrow-val">{escrow.distributedHuman} {data.quest.rewardType}</div>
                                </div>
                                <div className="manage-escrow-item">
                                    <div className="manage-escrow-label">Refunded</div>
                                    <div className="manage-escrow-val">{escrow.refundedHuman} {data.quest.rewardType}</div>
                                </div>
                                <div className="manage-escrow-item">
                                    <div className="manage-escrow-label">Remaining</div>
                                    <div className="manage-escrow-val">{escrow.remainingHuman} {data.quest.rewardType}</div>
                                </div>
                            </div>
                        ) : (
                            <p className="manage-escrow-empty">No on-chain data available.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
