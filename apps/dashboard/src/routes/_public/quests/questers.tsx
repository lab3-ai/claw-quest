import { useState } from "react"
import { useParams, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import type { QuestersResponse, QuestParticipation } from "@clawquest/shared"
import { AVATAR_COLORS, getInitials } from "@/components/avatarUtils"
import "@/styles/pages/questers.css"

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

type StatusFilter = "all" | "done" | "in_progress"

async function fetchQuesters(
    questId: string,
    page: number,
    pageSize: number,
    status: StatusFilter
): Promise<QuestersResponse> {
    const res = await fetch(
        `${API_BASE}/quests/${questId}/questers?page=${page}&pageSize=${pageSize}&status=${status}`
    )
    if (!res.ok) throw new Error("Failed to fetch questers")
    return res.json()
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

function rankClass(rank: number) {
    if (rank === 1) return "gold"
    if (rank === 2) return "silver"
    if (rank === 3) return "bronze"
    return ""
}

export function QuestersPage() {
    const { questId } = useParams({ from: "/_app/quests/$questId/questers" })
    const [filter, setFilter] = useState<StatusFilter>("all")
    const [page, setPage] = useState(1)
    const PAGE_SIZE = 10

    const { data, isLoading, error } = useQuery({
        queryKey: ["questers", questId, page, filter],
        queryFn: () => fetchQuesters(questId, page, PAGE_SIZE, filter),
    })

    function handleFilter(f: StatusFilter) {
        setFilter(f)
        setPage(1)
    }

    const typeBadgeClass = (type: string) => {
        const map: Record<string, string> = {
            FCFS: "badge-fcfs",
            LEADERBOARD: "badge-leaderboard",
            LUCKY_DRAW: "badge-luckydraw",
        }
        return map[type] ?? "badge-fcfs"
    }

    return (
        <div>
            {/* Breadcrumb */}
            <div className="breadcrumb">
                <Link to="/quests">Quests</Link>
                <span className="sep">›</span>
                {data && <Link to="/quests/$questId" params={{ questId }}>{data.questTitle}</Link>}
                {!data && <span>Quest</span>}
                <span className="sep">›</span>
                <span>Questers</span>
            </div>

            {/* Page Header */}
            <div className="page-header">
                <div>
                    <h1>Questers</h1>
                    {data && (
                        <div className="page-header-meta">
                            <strong>{data.totalQuesters}</strong> questers
                            <span>·</span>
                            <span className={`badge ${typeBadgeClass(data.questType)}`}>{data.questType}</span>
                            <span>·</span>
                            <span>{data.tasksTotal} tasks</span>
                            <span>·</span>
                            <span>{data.questRewardAmount.toLocaleString()} {data.questRewardType} total reward</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Filter bar */}
            {data && (
                <div className="filter-bar">
                    <div className="inline-filter">
                        <button
                            className={`filter-item ${filter === "all" ? "active" : ""}`}
                            onClick={() => handleFilter("all")}
                        >
                            {data.totalQuesters} all
                        </button>
                        <span className="filter-dot">·</span>
                        <button
                            className={`filter-item ${filter === "done" ? "active" : ""}`}
                            onClick={() => handleFilter("done")}
                        >
                            {data.doneQuesters} done
                        </button>
                        <span className="filter-dot">·</span>
                        <button
                            className={`filter-item ${filter === "in_progress" ? "active" : ""}`}
                            onClick={() => handleFilter("in_progress")}
                        >
                            {data.inProgressQuesters} in progress
                        </button>
                    </div>
                    <div className="filter-bar-right">sorted by start time</div>
                </div>
            )}

            {/* Loading / error */}
            {isLoading && (
                <div style={{ padding: "40px", textAlign: "center", color: "var(--fg-muted)" }}>Loading…</div>
            )}
            {error && (
                <div style={{ padding: "40px", textAlign: "center", color: "var(--red)" }}>Failed to load questers.</div>
            )}

            {/* Questers table */}
            {data && (
                <>
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
                                const colorIdx = (p.rank - 1) % AVATAR_COLORS.length
                                return (
                                    <tr key={p.id}>
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
                                                <span className="qp-payout-paid">
                                                    {p.payoutAmount?.toFixed(2)} {data.questRewardType}
                                                </span>
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
                            {data.participations.length === 0 && (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: "center", padding: "32px", color: "var(--fg-muted)" }}>
                                        No questers found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Pager */}
                    <div className="pager">
                        <span>
                            Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, data.totalQuesters)} of {data.totalQuesters}
                        </span>
                        <div className="pager-buttons">
                            <button onClick={() => setPage(p => p - 1)} disabled={page <= 1}>← Prev</button>
                            <span>Page {page} of {data.totalPages}</span>
                            <button onClick={() => setPage(p => p + 1)} disabled={page >= data.totalPages}>Next →</button>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
