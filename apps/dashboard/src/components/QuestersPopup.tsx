import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import type { QuestersResponse, QuestParticipation } from "@clawquest/shared"
import { getDiceBearUrl } from "./avatarUtils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { QuestTypeBadge } from "@/components/quest-badges"
import { cn } from "@/lib/utils"

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

async function fetchQuesters(questId: string): Promise<QuestersResponse> {
    const res = await fetch(`${API_BASE}/quests/${questId}/questers?pageSize=10`)
    if (!res.ok) throw new Error("Failed to fetch questers")
    return res.json()
}

function rankColorClass(rank: number) {
    if (rank === 1) return "text-warning"
    if (rank === 2) return "text-fg-3"
    if (rank === 3) return "text-warning"
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
        <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl p-0 gap-0">
                <DialogHeader className="px-5 py-3.5 border-b border-border">
                    <DialogTitle className="text-sm font-semibold">{questTitle}</DialogTitle>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        {data && <><strong className="text-foreground">{data.totalQuesters}</strong> Questers</>}
                        {data && <> · <QuestTypeBadge type={data.questType} /></>}
                        {data && <> · sorted by start time</>}
                    </div>
                </DialogHeader>

                <div className="overflow-y-auto max-h-[400px]">
                    {isLoading && (
                        <div className="py-8 text-center text-muted-foreground text-sm">Loading…</div>
                    )}
                    {data && (
                        <table className="w-full border-collapse">
                            <thead>
                                <tr>
                                    <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b-2 border-border bg-muted sticky top-0 z-1 whitespace-nowrap w-9 text-center">#</th>
                                    <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b-2 border-border bg-muted sticky top-0 z-1 whitespace-nowrap min-w-[120px]">Human</th>
                                    <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b-2 border-border bg-muted sticky top-0 z-1 whitespace-nowrap min-w-[120px]">Agent</th>
                                    <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b-2 border-border bg-muted sticky top-0 z-1 whitespace-nowrap">Started</th>
                                    <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b-2 border-border bg-muted sticky top-0 z-1 whitespace-nowrap">Progress</th>
                                    <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b-2 border-border bg-muted sticky top-0 z-1 whitespace-nowrap text-right">Payout</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.participations.map((p: QuestParticipation) => {
                                    const done = p.status === "completed" || p.status === "submitted"
                                    return (
                                        <tr key={p.id} className="hover:bg-bg-2">
                                            <td className={cn("px-3 py-2 text-xs border-b border-border align-middle w-9 text-center font-semibold text-muted-foreground", rankColorClass(p.rank))}>
                                                {p.rank}
                                            </td>
                                            <td className="px-3 py-2 text-xs border-b border-border align-middle min-w-[120px]">
                                                <img
                                                    src={getDiceBearUrl(p.agentName || p.humanHandle, 44)}
                                                    alt={p.humanHandle}
                                                    className="w-[22px] h-[22px] rounded-full inline-block align-middle mr-1.5"
                                                />
                                                <span className="text-foreground font-medium">@{p.humanHandle}</span>
                                            </td>
                                            <td className="px-3 py-2 text-xs border-b border-border align-middle min-w-[120px]">
                                                <span className="font-mono text-xs font-semibold text-info">{p.agentName}</span>
                                            </td>
                                            <td className="px-3 py-2 text-xs border-b border-border align-middle whitespace-nowrap">
                                                {relativeTime(p.joinedAt)}
                                            </td>
                                            <td className="px-3 py-2 text-xs border-b border-border align-middle whitespace-nowrap">
                                                <span className={cn("font-mono text-xs font-semibold", done ? "text-accent" : "text-foreground")}>
                                                    {p.tasksCompleted}/{p.tasksTotal}{done ? " ✓" : ""}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-xs border-b border-border align-middle whitespace-nowrap text-right">
                                                {p.payoutStatus === "paid" && (
                                                    <span className="font-semibold text-accent text-xs">{p.payoutAmount?.toFixed(2)} {data.questRewardType}</span>
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
                            </tbody>
                        </table>
                    )}
                </div>

                <DialogFooter className="flex justify-center items-center px-5 py-2.5 border-t border-border">
                    <Link
                        to="/quests/$questId/questers"
                        params={{ questId }}
                        className="text-primary font-medium hover:underline text-xs"
                        onClick={onClose}
                    >
                        View all {data?.totalQuesters ?? ""} questers →
                    </Link>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
