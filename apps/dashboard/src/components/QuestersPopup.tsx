import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import type { QuestersResponse, QuestParticipation } from "@clawquest/shared"
import { getInitials, AVATAR_COLORS } from "./avatarUtils"

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

async function fetchQuesters(questId: string): Promise<QuestersResponse> {
    const res = await fetch(`${API_BASE}/quests/${questId}/questers?pageSize=10`)
    if (!res.ok) throw new Error("Failed to fetch questers")
    return res.json()
}

function rankClass(rank: number) {
    if (rank === 1) return "gold"
    if (rank === 2) return "silver"
    if (rank === 3) return "bronze"
    return ""
}

function relativeTime(isoStr: string): string {
    const diff = Date.now() - new Date(isoStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
}

interface QuestersPopupProps {
    questId: string
    questTitle: string
    onClose: () => void
}

export function QuestersPopup({ questId, questTitle, onClose }: QuestersPopupProps) {
    const { data, isLoading } = useQuery({
        queryKey: ["questers-popup", questId],
        queryFn: () => fetchQuesters(questId),
    })

    return (
        <div className="questers-backdrop visible" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
            <div className="questers-popup">
                {/* Header */}
                <div className="questers-popup-header">
                    <div>
                        <h2>{questTitle}</h2>
                        <div className="questers-popup-meta">
                            {data && <><strong>{data.totalQuesters}</strong> Questers</>}
                            {data && <> · <span className={`badge badge-${data.questType.toLowerCase()}`}>{data.questType}</span></>}
                            {data && <> · sorted by start time</>}
                        </div>
                    </div>
                    <button className="questers-popup-close" onClick={onClose}>×</button>
                </div>

                {/* Body */}
                <div className="questers-popup-body" style={{ maxHeight: "400px" }}>
                    {isLoading && (
                        <div style={{ padding: "32px", textAlign: "center", color: "var(--fg-muted)" }}>Loading…</div>
                    )}
                    {data && (
                        <table className="questers-table">
                            <thead>
                                <tr>
                                    <th className="col-rank">#</th>
                                    <th className="col-human">Human</th>
                                    <th className="col-agent">Agent</th>
                                    <th className="col-started">Started</th>
                                    <th className="col-progress">Progress</th>
                                    <th className="col-payout" style={{ textAlign: "right" }}>Payout</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.participations.map((p: QuestParticipation) => {
                                    const done = p.status === "completed" || p.status === "submitted"
                                    const colorIdx = p.rank % AVATAR_COLORS.length
                                    return (
                                        <tr key={p.id} data-progress={done ? "done" : "in-progress"}>
                                            <td className={`col-rank ${rankClass(p.rank)}`}>{p.rank}</td>
                                            <td className="col-human">
                                                <span className="qp-avatar" style={{ background: AVATAR_COLORS[colorIdx] }}>
                                                    {getInitials(p.humanHandle)}
                                                </span>
                                                <span className="qp-human-name">@{p.humanHandle}</span>
                                            </td>
                                            <td className="col-agent">
                                                <span className="qp-agent-name">{p.agentName}</span>
                                            </td>
                                            <td className="col-started">{relativeTime(p.joinedAt)}</td>
                                            <td className="col-progress">
                                                <span className={`qp-progress ${done ? "done" : "partial"}`}>
                                                    {p.tasksCompleted}/{p.tasksTotal}{done ? " ✓" : ""}
                                                </span>
                                            </td>
                                            <td className="col-payout" style={{ textAlign: "right" }}>
                                                {p.payoutStatus === "paid" && (
                                                    <span className="qp-payout-paid">{p.payoutAmount?.toFixed(2)} {data.questRewardType}</span>
                                                )}
                                                {p.payoutStatus === "pending" && (
                                                    <span className="qp-payout-pending">Pending</span>
                                                )}
                                                {p.payoutStatus === "na" && (
                                                    <span className="qp-payout-na">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer */}
                <div className="questers-popup-footer">
                    <Link
                        to="/quests/$questId/questers"
                        params={{ questId }}
                        className="qp-view-all"
                        onClick={onClose}
                    >
                        View all {data?.totalQuesters ?? ""} questers →
                    </Link>
                </div>
            </div>
        </div>
    )
}
