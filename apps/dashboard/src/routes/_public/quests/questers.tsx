import { useState } from "react"
import { useParams, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import type { QuestersResponse, QuestParticipation } from "@clawquest/shared"
import { getDiceBearUrl } from "@/components/avatarUtils"
import { Button } from "@/components/ui/button"
import { QuestTypeBadge } from "@/components/quest-badges"
import { cn } from "@/lib/utils"

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
    if (rank === 1) return "text-warning"
    if (rank === 2) return "text-fg-3"
    if (rank === 3) return "text-warning"
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

    return (
        <div>
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 py-3 text-xs text-muted-foreground">
                <Link to="/quests">Quests</Link>
                <span>›</span>
                {data && <Link to="/quests/$questId" params={{ questId }}>{data.questTitle}</Link>}
                {!data && <span>Quest</span>}
                <span>›</span>
                <span>Questers</span>
            </nav>

            {/* Page Header */}
            <div className="flex justify-between items-end py-3 border-b border-border mb-0">
                <div>
                    <h1 className="text-3xl font-semibold text-foreground">Questers</h1>
                    {data && (
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground flex-wrap">
                            <strong className="text-foreground">{data.totalQuesters}</strong> questers
                            <span>·</span>
                            <QuestTypeBadge type={data.questType} />
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
                <div className="flex items-center justify-between py-2.5 border-b border-border">
                    <div className="flex items-center text-xs text-muted-foreground px-1">
                        <button
                            className={cn(
                                "cursor-pointer py-2.5 px-1 bg-transparent text-xs text-muted-foreground whitespace-nowrap border-b-2 border-transparent -mb-px hover:text-foreground",
                                filter === "all" && "text-foreground font-semibold"
                            )}
                            onClick={() => handleFilter("all")}
                        >
                            {data.totalQuesters} all
                        </button>
                        <span className="px-1 text-border select-none text-xs self-center">·</span>
                        <button
                            className={cn(
                                "cursor-pointer py-2.5 px-1 bg-transparent text-xs text-muted-foreground whitespace-nowrap border-b-2 border-transparent -mb-px hover:text-foreground",
                                filter === "done" && "text-foreground font-semibold"
                            )}
                            onClick={() => handleFilter("done")}
                        >
                            {data.doneQuesters} done
                        </button>
                        <span className="px-1 text-border select-none text-xs self-center">·</span>
                        <button
                            className={cn(
                                "cursor-pointer py-2.5 px-1 bg-transparent text-xs text-muted-foreground whitespace-nowrap border-b-2 border-transparent -mb-px hover:text-foreground",
                                filter === "in_progress" && "text-foreground font-semibold"
                            )}
                            onClick={() => handleFilter("in_progress")}
                        >
                            {data.inProgressQuesters} in progress
                        </button>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">sorted by start time</div>
                </div>
            )}

            {/* Loading / error */}
            {isLoading && (
                <div className="p-10 text-center text-xs text-muted-foreground">Loading…</div>
            )}
            {error && (
                <div className="p-10 text-center text-xs text-destructive">Failed to load questers.</div>
            )}

            {/* Questers table */}
            {data && (
                <>
                    <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr>
                                <th className="w-9 text-center font-semibold text-muted-foreground text-left px-3 py-2.5 text-xs uppercase tracking-wide border-b-2 border-border bg-transparent cursor-default select-none whitespace-nowrap">#</th>
                                <th className="min-w-[140px] text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b-2 border-border bg-transparent cursor-default select-none whitespace-nowrap">Human</th>
                                <th className="min-w-[140px] text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b-2 border-border bg-transparent cursor-default select-none whitespace-nowrap">Agent</th>
                                <th className="whitespace-nowrap text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b-2 border-border bg-transparent cursor-default select-none">Started</th>
                                <th className="whitespace-nowrap text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b-2 border-border bg-transparent cursor-default select-none">Progress</th>
                                <th className="whitespace-nowrap text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b-2 border-border bg-transparent cursor-default select-none">Payout</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.participations.map((p: QuestParticipation) => {
                                const done = p.status === "completed" || p.status === "submitted"
                                return (
                                    <tr key={p.id} className="hover:bg-bg-2">
                                        <td className={cn("w-9 text-center font-semibold text-muted-foreground px-3 py-2.5 text-xs border-b border-border align-middle", rankClass(p.rank))}>{p.rank}</td>
                                        <td className="min-w-[140px] px-3 py-2.5 text-xs border-b border-border align-middle">
                                            <img
                                                src={getDiceBearUrl(p.agentName || p.humanHandle, 48)}
                                                alt={p.humanHandle}
                                                className="w-6 h-6 rounded-full inline-block align-middle mr-2"
                                            />
                                            <span className="text-foreground font-medium">@{p.humanHandle}</span>
                                        </td>
                                        <td className="min-w-[140px] px-3 py-2.5 text-xs border-b border-border align-middle">
                                            <span className="font-mono text-xs font-semibold text-info">{p.agentName}</span>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-2.5 text-xs border-b border-border align-middle">{relativeTime(p.joinedAt)}</td>
                                        <td className="whitespace-nowrap px-3 py-2.5 text-xs border-b border-border align-middle">
                                            <span className={cn("font-mono text-xs font-semibold", done ? "text-accent" : "text-foreground")}>
                                                {p.tasksCompleted}/{p.tasksTotal}{done ? " ✓" : ""}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap text-right px-3 py-2.5 text-xs border-b border-border align-middle">
                                            {p.payoutStatus === "paid" && (
                                                <span className="font-semibold text-accent text-xs">
                                                    {p.payoutAmount?.toFixed(2)} {data.questRewardType}
                                                </span>
                                            )}
                                            {p.payoutStatus === "pending" && (
                                                <span className="font-semibold text-warning text-xs">Pending</span>
                                            )}
                                            {p.payoutStatus === "na" && (
                                                <span className="text-muted-foreground text-xs">—</span>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                            {data.participations.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center px-3 py-8 text-xs text-muted-foreground border-b border-border">
                                        No questers found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                    </div>

                    {/* Pager */}
                    <div className="flex items-center justify-between py-3.5 text-xs text-muted-foreground">
                        <span>
                            Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, data.totalQuesters)} of {data.totalQuesters}
                        </span>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>← Prev</Button>
                            <span>Page {page} of {data.totalPages}</span>
                            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= data.totalPages}>Next →</Button>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
