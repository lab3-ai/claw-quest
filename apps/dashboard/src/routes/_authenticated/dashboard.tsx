import { useState, useEffect, Fragment } from "react"
import { Link, useNavigate, useSearch } from "@tanstack/react-router"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/context/AuthContext"
import { QuestersPopup } from "@/components/QuestersPopup"
import { getDiceBearUrl } from "@/components/avatarUtils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { QuestTypeBadge, QuestStatusBadge } from "@/components/quest-badges"
import { cn } from "@/lib/utils"
import { PageTitle } from "@/components/page-title"
import type { Quest } from "@clawquest/shared"
import { FUNDING_STATUS } from "@clawquest/shared"

type MineQuest = Quest & { fundingStatus?: string; previewToken?: string }

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

// ─── Types ────────────────────────────────────────────────────────────────────

type QuestFilter = "all" | "draft" | "live" | "scheduled" | "completed"
type AcceptedFilter = "all" | "active" | "ended"
type MainTab = "my-quest" | "accepted"

// ─── Helpers ─────────────────────────────────────────────────────────────────


function getPublishErrors(quest: MineQuest): Record<string, string> {
    const errors: Record<string, string> = {}
    if (!quest.title?.trim()) errors.title = 'Title required'
    if (!quest.description?.trim()) errors.description = 'Description required'
    if (!quest.rewardAmount || quest.rewardAmount <= 0) errors.rewardAmount = 'Reward required'
    if (!quest.totalSlots || quest.totalSlots <= 0) errors.totalSlots = 'Slots required'
    const tasks = (quest.tasks as any[]) ?? []
    if (tasks.length === 0) errors.tasks = 'Tasks required'
    if (quest.fundingStatus !== FUNDING_STATUS.CONFIRMED) errors.funding = 'Funding required'
    return errors
}

function getDraftCompletion(quest: MineQuest): { done: number; total: number } {
    const checks = [
        !!quest.title?.trim(),
        !!quest.description?.trim(),
        quest.rewardAmount > 0,
        ((quest.tasks as any[]) ?? []).length > 0,
        !!quest.expiresAt,
    ]
    return { done: checks.filter(Boolean).length, total: checks.length }
}

function formatTimeLeft(expiresAt: string | null): { val: string; label: string; cls: string } {
    if (!expiresAt) return { val: "—", label: "", cls: "muted" }
    const diff = new Date(expiresAt).getTime() - Date.now()
    if (diff <= 0) return { val: "Ended", label: "", cls: "muted" }
    const totalMins = Math.floor(diff / 60000)
    const h = Math.floor(totalMins / 60)
    const d = Math.floor(h / 24)
    const mm = String(totalMins % 60).padStart(2, "0")
    const hh = String(h % 24).padStart(2, "0")
    if (h < 6) return { val: `${h}h:${mm}m`, label: "remaining", cls: "urgent" }
    if (d < 2) return { val: `${h}h:${mm}m`, label: "remaining", cls: "warning" }
    return { val: `${d}d:${hh}h:${mm}m`, label: "remaining", cls: "normal" }
}


// ─── Component ───────────────────────────────────────────────────────────────

export function Dashboard() {
    const { session, user, isAuthenticated, isLoading } = useAuth()
    const queryClient = useQueryClient()
    const navigate = useNavigate()

    // Redirect to login if not authenticated (fallback check in case beforeLoad didn't catch it)
    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            navigate({ to: '/login' })
        }
    }, [isLoading, isAuthenticated, navigate])

    // Tab from URL via TanStack Router (stays in sync when URL/search changes)
    const search = useSearch({ strict: false }) as { tab?: string }
    const mainTab: MainTab = search.tab === "accepted" ? "accepted" : "my-quest"

    const setMainTab = (tab: MainTab) => {
        navigate({
            to: "/dashboard",
            search: tab === "my-quest" ? {} : { tab },
            replace: true,
        })
    }
    const [questFilter, setQuestFilter] = useState<QuestFilter>("all")
    const [questView, setQuestView] = useState<"card" | "list">("card")
    const [acceptedFilter, setAcceptedFilter] = useState<AcceptedFilter>("all")
    const [popupQuest, setPopupQuest] = useState<{ id: string; title: string } | null>(null)

    const { data: quests = [], isLoading: questsLoading } = useQuery<MineQuest[]>({
        queryKey: ["my-quests"],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/quests/mine`, {
                headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
            })
            if (!res.ok) return []
            return res.json()
        },
        enabled: !!session?.access_token,
    })

    // Get accepted quests - fetch from new API endpoint
    const acceptedQuests = useQuery<MineQuest[]>({
        queryKey: ["accepted-quests"],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/quests/accepted`, {
                headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
            })
            if (!res.ok) return []
            return res.json()
        },
        enabled: !!session?.access_token,
    })


    // ── Publish handler ─────────────────────────────────────────────────────
    async function handlePublish(questId: string) {
        if (!confirm('Publish this quest? It will become visible to agents.')) return
        const res = await fetch(`${API_BASE}/quests/${questId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
            body: JSON.stringify({ status: 'live' }),
        })
        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: 'Failed to publish' }))
            if (err.code === 'PUBLISH_VALIDATION') {
                alert(`Cannot publish:\n${Object.values(err.fields as Record<string, string>).join('\n')}`)
            } else {
                alert(err.message || 'Failed to publish')
            }
            return
        }
        queryClient.invalidateQueries({ queryKey: ['my-quests'] })
    }

    // Quest filter counts
    const questCounts = {
        all: quests.length,
        draft: quests.filter(q => q.status === "draft").length,
        live: quests.filter(q => q.status === "live").length,
        scheduled: quests.filter(q => q.status === "scheduled").length,
        completed: quests.filter(q => q.status === "completed" || q.status === "expired" || q.status === "cancelled").length,
    }

    const filteredQuests = questFilter === "all" ? quests
        : questFilter === "completed" ? quests.filter(q => q.status === "completed" || q.status === "expired" || q.status === "cancelled")
            : quests.filter(q => q.status === questFilter)

    // Accepted quests filter
    const isEndedStatus = (s: string) => s === "completed" || s === "expired" || s === "cancelled"
    const allAccepted = acceptedQuests.data ?? []
    const acceptedCounts = {
        all: allAccepted.length,
        active: allAccepted.filter(q => q.status === "live" || q.status === "scheduled").length,
        ended: allAccepted.filter(q => isEndedStatus(q.status)).length,
    }
    const filteredAcceptedQuests = acceptedFilter === "all" ? allAccepted
        : acceptedFilter === "active" ? allAccepted.filter(q => q.status === "live" || q.status === "scheduled")
            : allAccepted.filter(q => isEndedStatus(q.status))



    const displayName = user?.user_metadata?.full_name as string | undefined
    const handle = displayName ?? user?.email?.split("@")[0] ?? "user"

    return (
        <>
            <div className="">
                {/* Questers popup */}
                {popupQuest && (
                    <QuestersPopup
                        questId={popupQuest.id}
                        questTitle={popupQuest.title}
                        onClose={() => setPopupQuest(null)}
                    />
                )}


                {/* Page header */}
                <PageTitle
                    title="Dashboard"
                    description={<>{displayName ? handle : `@${handle}`} · {quests.length} quests</>}
                    border
                    actions={<>
                        <Button asChild>
                            <Link to="/quests/new">+ Create Quest</Link>
                        </Button>
                    </>}
                />


                {/* Main tabs */}
                <div className="flex items-center border-b border-border overflow-x-auto scrollbar-hide">
                    <div className="flex">
                        <button
                            className={cn(
                                "px-3.5 max-sm:px-3 py-2.5 max-sm:py-3 text-sm max-sm:text-xs font-medium text-muted-foreground cursor-pointer border-b-2 border-transparent -mb-px bg-transparent flex items-center gap-1.5 hover:text-foreground whitespace-nowrap max-sm:min-h-[44px]",
                                mainTab === "my-quest" && "text-foreground font-semibold border-b-(--tone-quest)"
                            )}
                            onClick={() => setMainTab("my-quest")}
                        >
                            My Quests <span className={cn("text-xs max-sm:text-2xs font-semibold px-1.5 py-px rounded bg-border text-white", mainTab === "my-quest" && "bg-(--tone-quest)")}>{quests.length}</span>
                        </button>
                        <button
                            className={cn(
                                "px-3.5 max-sm:px-3 py-2.5 max-sm:py-3 text-sm max-sm:text-xs font-medium text-muted-foreground cursor-pointer border-b-2 border-transparent -mb-px bg-transparent flex items-center gap-1.5 hover:text-foreground whitespace-nowrap max-sm:min-h-[44px]",
                                mainTab === "accepted" && "text-foreground font-semibold border-b-(--tone-quest)"
                            )}
                            onClick={() => setMainTab("accepted")}
                        >
                            Accepted Quests <span className={cn("text-xs max-sm:text-2xs font-semibold px-1.5 py-px rounded bg-border text-white", mainTab === "accepted" && "bg-(--tone-quest)")}>{acceptedQuests.data?.length ?? 0}</span>
                        </button>
                    </div>
                </div>

                {/* ── My Quests tab ── */}
                {mainTab === "my-quest" && (
                    <div>
                        {/* Filter + view toggle */}
                        <div className="flex items-center justify-between py-2.5 border-b border-border max-sm:flex-col max-sm:items-stretch">
                            <div className="flex items-center text-xs text-muted-foreground px-1 max-sm:flex-wrap">
                                {(["all", "draft", "live", "scheduled", "completed"] as QuestFilter[]).map((f, i, arr) => (
                                    <Fragment key={f}>
                                        {questCounts[f] > 0 && (
                                            <button
                                                className={cn(
                                                    "cursor-pointer py-2.5 px-1 bg-transparent text-xs text-muted-foreground whitespace-nowrap border-b-2 border-transparent -mb-px hover:text-foreground",
                                                    questFilter === f && "text-foreground font-semibold"
                                                )}
                                                onClick={() => setQuestFilter(f)}
                                            >
                                                {questCounts[f]} {f}
                                            </button>
                                        )}
                                        {i < arr.length - 1 && questCounts[f] > 0 && <span className="px-1 text-border select-none text-xs self-center">·</span>}
                                    </Fragment>
                                ))}
                            </div>
                            <div className="inline-flex border border-input rounded overflow-hidden ml-3 shrink-0">
                                <button
                                    className={cn(
                                        "flex items-center justify-center w-[30px] h-[26px] cursor-pointer border-none border-r border-border bg-background text-muted-foreground hover:bg-bg-2 hover:text-foreground",
                                        questView === "card" && "bg-accent-light text-accent-foreground"
                                    )}
                                    onClick={() => setQuestView("card")}
                                    title="Card view"
                                >
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                        <rect x="0" y="0" width="6" height="6" rx="1" fill="currentColor" />
                                        <rect x="8" y="0" width="6" height="6" rx="1" fill="currentColor" />
                                        <rect x="0" y="8" width="6" height="6" rx="1" fill="currentColor" />
                                        <rect x="8" y="8" width="6" height="6" rx="1" fill="currentColor" />
                                    </svg>
                                </button>
                                <button
                                    className={cn(
                                        "flex items-center justify-center w-[30px] h-[26px] cursor-pointer border-none bg-background text-muted-foreground hover:bg-bg-2 hover:text-foreground",
                                        questView === "list" && "bg-accent-light text-accent-foreground"
                                    )}
                                    onClick={() => setQuestView("list")}
                                    title="List view"
                                >
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                        <rect x="0" y="1" width="14" height="2" rx="1" fill="currentColor" />
                                        <rect x="0" y="6" width="14" height="2" rx="1" fill="currentColor" />
                                        <rect x="0" y="11" width="14" height="2" rx="1" fill="currentColor" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {questsLoading && (
                            <div>
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="flex gap-4 py-3.5 border-b border-border items-start md:flex-row flex-col md:gap-4 gap-2">
                                        <div className="flex flex-col items-end gap-2 min-w-[120px] text-right pt-0.5 shrink-0">
                                            <div className="skeleton" style={{ width: 60, height: 32 }} />
                                            <div className="skeleton" style={{ width: 50, height: 14 }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="skeleton" style={{ width: "70%", height: 16, marginBottom: 8 }} />
                                            <div className="skeleton" style={{ width: "90%", height: 12, marginBottom: 8 }} />
                                            <div className="skeleton" style={{ width: "40%", height: 12 }} />
                                        </div>
                                        <div className="flex flex-col items-end min-w-[90px] text-right pt-0.5 shrink-0 gap-0.5">
                                            <div className="skeleton" style={{ width: 60, height: 14 }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {!questsLoading && filteredQuests.length === 0 && (
                            <div className="p-10 text-center text-muted-foreground">
                                No quests found.{" "}
                                <Link to="/quests/new">Create your first quest →</Link>
                            </div>
                        )}

                        {/* Card View */}
                        {questView === "card" && filteredQuests.length > 0 && (
                            <ul className="list-none">
                                {filteredQuests.map(quest => {
                                    const time = formatTimeLeft(quest.expiresAt ?? null)
                                    const slotsLeft = quest.totalSlots - quest.filledSlots
                                    const isDraft = quest.status === "draft"
                                    const titleLinkProps = isDraft && quest.previewToken
                                        ? { to: "/quests/$questId" as const, params: { questId: quest.id }, search: { token: quest.previewToken } }
                                        : { to: "/quests/$questId" as const, params: { questId: quest.id } }
                                    return (
                                        <li
                                            key={quest.id}
                                            className={cn(
                                                "flex gap-4 py-3.5 border-b border-border last:border-b-0 items-start transition-colors hover:bg-(--sidebar-bg) md:flex-row flex-col md:gap-4 gap-2",
                                                isDraft && "border-dashed opacity-85 hover:opacity-100"
                                            )}
                                            data-status={quest.status}
                                        >
                                            <div className="flex flex-col items-end gap-2 min-w-[120px] text-right pt-0.5 shrink-0 md:flex-col flex-row md:gap-2 gap-3 md:min-w-[120px] min-w-0 md:items-end items-center">
                                                <div className="flex flex-col items-end gap-px md:flex-col flex-row md:gap-px gap-1 md:items-end items-baseline">
                                                    <span className="text-md font-semibold text-(--green) leading-tight font-mono">
                                                        {quest.rewardAmount.toLocaleString()} {quest.rewardType}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">total reward</span>
                                                </div>
                                                {quest.questers > 0 && quest.questerDetails && (
                                                    <div className="flex flex-col items-end gap-px md:flex-col flex-row md:gap-px gap-1 md:items-end items-baseline">
                                                        <div
                                                            className="flex items-center gap-0 cursor-pointer group"
                                                            onClick={() => setPopupQuest({ id: quest.id, title: quest.title })}
                                                        >
                                                            {quest.questerDetails.slice(0, 5).map((d, i) => (
                                                                <div
                                                                    key={i}
                                                                    className="group/avatar w-5 h-5 -ml-1.5 first:ml-0 rounded-full border-[1.5px] border-background shrink-0 relative overflow-visible hover:z-10 hover:-translate-y-px transition-transform"
                                                                >
                                                                    <img src={getDiceBearUrl(d.agentName, 40)} alt={d.humanHandle} className="w-full h-full rounded-full" />
                                                                    <div className="hidden group-hover/avatar:block absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 bg-foreground text-white text-xs px-2 py-1.5 rounded whitespace-nowrap z-100 pointer-events-none leading-relaxed text-left after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-foreground">
                                                                        <span className="text-surface-dark-muted text-xs">Human</span> <span className="font-semibold text-white">@{d.humanHandle}</span>
                                                                        <br />
                                                                        <span className="text-surface-dark-muted text-xs">Agent</span> <span className="font-semibold text-surface-dark-muted font-mono text-xs">{d.agentName}</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            <span className="ml-1 text-xs text-muted-foreground whitespace-nowrap group-hover:text-primary">
                                                                {quest.questers > 5
                                                                    ? <><strong className="text-foreground font-semibold group-hover:text-primary">+{quest.questers - 5}</strong> more</>
                                                                    : <strong className="text-foreground font-semibold group-hover:text-primary">{quest.questers} questers</strong>
                                                                }
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="flex flex-col items-end gap-px md:flex-col flex-row md:gap-px gap-1 md:items-end items-baseline">
                                                    <span className={cn("text-md font-semibold leading-tight font-mono", slotsLeft < 5 ? "text-error" : "text-foreground")}>
                                                        {slotsLeft}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">slots left</span>
                                                </div>
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-semibold mb-1 leading-snug">
                                                    <Link className="text-primary no-underline hover:underline hover:text-primary/80" {...titleLinkProps}>
                                                        {quest.title}
                                                    </Link>
                                                </div>
                                                <div className="text-xs text-muted-foreground leading-relaxed mb-2">{quest.description}</div>
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <QuestTypeBadge type={quest.type} />
                                                    <QuestStatusBadge status={quest.status} />
                                                    {quest.tags?.slice(0, 2).map(tag => (
                                                        <Badge key={tag} variant="pill">{tag}</Badge>
                                                    ))}
                                                    <span className="text-xs text-muted-foreground">by <strong>{quest.sponsor}</strong></span>
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-end min-w-[90px] text-right pt-0.5 shrink-0 gap-0.5 md:flex-col flex-row md:gap-0.5 gap-2 md:min-w-[90px] min-w-0 md:items-end items-baseline">
                                                {isDraft ? (() => {
                                                    const comp = getDraftCompletion(quest)
                                                    const errors = getPublishErrors(quest)
                                                    const canPublish = Object.keys(errors).length === 0
                                                    return (
                                                        <div className="flex flex-col gap-1.5 items-end">
                                                            <span className="text-[0.8rem] text-muted-foreground">{comp.done}/{comp.total} complete</span>
                                                            <Button asChild size="sm">
                                                                <Link to="/quests/$questId/edit" params={{ questId: quest.id }}>Continue Editing</Link>
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                disabled={!canPublish}
                                                                title={canPublish ? 'Publish quest' : `Missing: ${Object.values(errors).join(', ')}`}
                                                                onClick={() => handlePublish(quest.id)}
                                                            >Publish</Button>
                                                        </div>
                                                    )
                                                })() : quest.status === "scheduled" ? (
                                                    <div className="flex flex-col gap-1.5 items-end">
                                                        <span className={cn(
                                                            "text-base font-semibold",
                                                            time.cls === "warning" && "text-(--yellow)",
                                                            time.cls === "urgent" && "text-(--red)",
                                                            time.cls === "muted" && "text-muted-foreground font-normal"
                                                        )}>{time.val}</span>
                                                        {time.label && <span className="text-xs text-muted-foreground">{time.label}</span>}
                                                        <Button asChild size="sm">
                                                            <Link to="/quests/$questId/edit" params={{ questId: quest.id }}>Edit</Link>
                                                        </Button>
                                                        <Button asChild variant="secondary" size="sm">
                                                            <Link to="/quests/$questId/manage" params={{ questId: quest.id }}>Manage</Link>
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <span className={cn(
                                                            "text-base font-semibold",
                                                            time.cls === "warning" && "text-(--yellow)",
                                                            time.cls === "urgent" && "text-(--red)",
                                                            time.cls === "muted" && "text-muted-foreground font-normal"
                                                        )}>{time.val}</span>
                                                        {time.label && <span className="text-xs text-muted-foreground">{time.label}</span>}
                                                        <Button asChild variant="secondary" size="sm" className="mt-1 inline-block">
                                                            <Link to="/quests/$questId/manage" params={{ questId: quest.id }}>Manage</Link>
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </li>
                                    )
                                })}
                            </ul>
                        )}

                        {/* List View */}
                        {questView === "list" && filteredQuests.length > 0 && (
                            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr>
                                            <th className="text-left px-2 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b-2 border-border bg-transparent whitespace-nowrap cursor-default select-none">Reward</th>
                                            <th className="text-left px-2 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b-2 border-border bg-transparent whitespace-nowrap cursor-default select-none min-w-[220px]">Name</th>
                                            <th className="text-left px-2 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b-2 border-border bg-transparent whitespace-nowrap cursor-default select-none">Type</th>
                                            <th className="text-left px-2 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b-2 border-border bg-transparent whitespace-nowrap cursor-default select-none">Questers</th>
                                            <th className="text-left px-2 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b-2 border-border bg-transparent whitespace-nowrap cursor-default select-none">Time</th>
                                            <th className="text-left px-2 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b-2 border-border bg-transparent whitespace-nowrap cursor-default select-none w-[100px]">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredQuests.map(quest => {
                                            const time = formatTimeLeft(quest.expiresAt ?? null)
                                            const slotsLeft = quest.totalSlots - quest.filledSlots
                                            const isDraft = quest.status === "draft"
                                            const titleLinkProps = isDraft && quest.previewToken
                                                ? { to: "/quests/$questId" as const, params: { questId: quest.id }, search: { token: quest.previewToken } }
                                                : { to: "/quests/$questId" as const, params: { questId: quest.id } }
                                            return (
                                                <tr key={quest.id} className="hover:bg-bg-2" data-status={quest.status}>
                                                    <td className="px-2 py-2.5 text-xs border-b border-border align-top whitespace-nowrap">
                                                        <span className="text-md font-semibold text-success whitespace-nowrap leading-tight">{quest.rewardAmount.toLocaleString()} {quest.rewardType}</span>
                                                    </td>
                                                    <td className="px-2 py-2.5 text-xs border-b border-border align-top min-w-[220px]">
                                                        <div>
                                                            <Link {...titleLinkProps} className="text-primary no-underline font-normal text-base leading-snug visited:text-primary/80 hover:text-primary/80">
                                                                {quest.title}
                                                            </Link>
                                                        </div>
                                                        <div className="text-xs text-muted-foreground leading-snug line-clamp-1 my-0.5">{quest.description?.slice(0, 60)}{(quest.description?.length ?? 0) > 60 ? "…" : ""}</div>
                                                        <div className="text-xs text-muted-foreground">by <strong className="text-foreground font-semibold">{quest.sponsor}</strong></div>
                                                    </td>
                                                    <td className="px-2 py-2.5 text-xs border-b border-border align-top whitespace-nowrap">
                                                        <QuestTypeBadge type={quest.type} />
                                                        <div className="text-xs text-muted-foreground mt-0.5">{slotsLeft} slots left</div>
                                                    </td>
                                                    <td className="px-2 py-2.5 text-xs border-b border-border align-top whitespace-nowrap">
                                                        {quest.questers > 0 && quest.questerDetails ? (
                                                            <div
                                                                className="flex items-center gap-0 cursor-pointer group"
                                                                onClick={() => setPopupQuest({ id: quest.id, title: quest.title })}
                                                            >
                                                                {quest.questerDetails.slice(0, 3).map((d, i) => (
                                                                    <img
                                                                        key={i}
                                                                        src={getDiceBearUrl(d.agentName, 40)}
                                                                        alt={d.humanHandle}
                                                                        className="w-5 h-5 -ml-1.5 first:ml-0 rounded-full border-[1.5px] border-background shrink-0"
                                                                    />
                                                                ))}
                                                                <span className="ml-1 text-xs text-muted-foreground whitespace-nowrap group-hover:text-primary">
                                                                    <strong className="text-foreground font-semibold group-hover:text-primary">{quest.questers}</strong>
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground text-xs">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-2 py-2.5 text-xs border-b border-border align-top whitespace-nowrap">
                                                        {isDraft ? (() => {
                                                            const errors = getPublishErrors(quest)
                                                            const canPublish = Object.keys(errors).length === 0
                                                            return (
                                                                <div className="flex flex-col gap-1.5 items-end">
                                                                    <Button asChild size="sm">
                                                                        <Link to="/quests/$questId/edit" params={{ questId: quest.id }}>Edit</Link>
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        disabled={!canPublish}
                                                                        title={canPublish ? 'Publish quest' : `Missing: ${Object.values(errors).join(', ')}`}
                                                                        onClick={() => handlePublish(quest.id)}
                                                                    >Publish</Button>
                                                                </div>
                                                            )
                                                        })() : quest.status === "scheduled" ? (
                                                            <div className="flex flex-col gap-1.5 items-end">
                                                                <Button asChild size="sm">
                                                                    <Link to="/quests/$questId/edit" params={{ questId: quest.id }}>Edit</Link>
                                                                </Button>
                                                                <Button asChild variant="secondary" size="sm">
                                                                    <Link to="/quests/$questId/manage" params={{ questId: quest.id }}>Manage</Link>
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div className={cn(
                                                                    "font-mono text-xs font-semibold whitespace-nowrap",
                                                                    time.cls === "urgent" && "text-error",
                                                                    time.cls === "warning" && "text-warning",
                                                                    time.cls === "normal" && "text-foreground",
                                                                    time.cls === "muted" && "text-muted-foreground font-normal"
                                                                )}>{time.val}</div>
                                                                {time.label && <div className="font-sans text-xs font-normal text-muted-foreground">{time.label}</div>}
                                                                <Button asChild variant="secondary" size="sm" className="mt-1 inline-block">
                                                                    <Link to="/quests/$questId/manage" params={{ questId: quest.id }}>Manage</Link>
                                                                </Button>
                                                            </>
                                                        )}
                                                    </td>
                                                    <td className="px-2 py-2.5 text-xs border-b border-border align-top w-[100px]">
                                                        <QuestStatusBadge status={quest.status} />
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Accepted Quests tab ── */}
                {mainTab === "accepted" && (
                    <div>
                        {/* Filter + view toggle */}
                        <div className="flex items-center justify-between py-2.5 border-b border-border max-sm:flex-col max-sm:items-stretch">
                            <div className="flex items-center text-xs text-muted-foreground px-1 max-sm:flex-wrap">
                                {(["all", "active", "ended"] as AcceptedFilter[]).map((f, i, arr) => (
                                    <Fragment key={f}>
                                        {acceptedCounts[f] > 0 && (
                                            <button
                                                className={cn(
                                                    "cursor-pointer py-2.5 px-1 bg-transparent text-xs text-muted-foreground whitespace-nowrap border-b-2 border-transparent -mb-px hover:text-foreground",
                                                    acceptedFilter === f && "text-foreground font-semibold"
                                                )}
                                                onClick={() => setAcceptedFilter(f)}
                                            >
                                                {acceptedCounts[f]} {f}
                                            </button>
                                        )}
                                        {i < arr.length - 1 && acceptedCounts[f] > 0 && <span className="px-1 text-border select-none text-xs self-center">·</span>}
                                    </Fragment>
                                ))}
                            </div>
                            <div className="inline-flex border border-input rounded overflow-hidden ml-3 shrink-0">
                                <button
                                    className={cn(
                                        "flex items-center justify-center w-[30px] h-[26px] cursor-pointer border-none border-r border-border bg-background text-muted-foreground hover:bg-bg-2 hover:text-foreground",
                                        questView === "card" && "bg-accent-light text-accent-foreground"
                                    )}
                                    onClick={() => setQuestView("card")}
                                    title="Card view"
                                >
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                        <rect x="0" y="0" width="6" height="6" rx="1" fill="currentColor" />
                                        <rect x="8" y="0" width="6" height="6" rx="1" fill="currentColor" />
                                        <rect x="0" y="8" width="6" height="6" rx="1" fill="currentColor" />
                                        <rect x="8" y="8" width="6" height="6" rx="1" fill="currentColor" />
                                    </svg>
                                </button>
                                <button
                                    className={cn(
                                        "flex items-center justify-center w-[30px] h-[26px] cursor-pointer border-none bg-background text-muted-foreground hover:bg-bg-2 hover:text-foreground",
                                        questView === "list" && "bg-accent-light text-accent-foreground"
                                    )}
                                    onClick={() => setQuestView("list")}
                                    title="List view"
                                >
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                        <rect x="0" y="1" width="14" height="2" rx="1" fill="currentColor" />
                                        <rect x="0" y="6" width="14" height="2" rx="1" fill="currentColor" />
                                        <rect x="0" y="11" width="14" height="2" rx="1" fill="currentColor" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {acceptedQuests.isLoading && (
                            <div>
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="flex gap-4 py-3.5 border-b border-border items-start md:flex-row flex-col md:gap-4 gap-2">
                                        <div className="flex flex-col items-end gap-2 min-w-[120px] text-right pt-0.5 shrink-0">
                                            <div className="skeleton" style={{ width: 60, height: 32 }} />
                                            <div className="skeleton" style={{ width: 50, height: 14 }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="skeleton" style={{ width: "70%", height: 16, marginBottom: 8 }} />
                                            <div className="skeleton" style={{ width: "90%", height: 12, marginBottom: 8 }} />
                                            <div className="skeleton" style={{ width: "40%", height: 12 }} />
                                        </div>
                                        <div className="flex flex-col items-end min-w-[90px] text-right pt-0.5 shrink-0 gap-0.5">
                                            <div className="skeleton" style={{ width: 60, height: 14 }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {!acceptedQuests.isLoading && filteredAcceptedQuests.length === 0 && (
                            <div className="p-10 text-center text-muted-foreground">
                                {allAccepted.length === 0
                                    ? <><span>No accepted quests yet. </span><Link to="/quests">Browse available quests →</Link></>
                                    : <span>No {acceptedFilter === "active" ? "active" : acceptedFilter === "ended" ? "ended" : ""} quests in this filter.</span>
                                }
                            </div>
                        )}

                        {/* Card View */}
                        {questView === "card" && filteredAcceptedQuests.length > 0 && (
                            <ul className="list-none">
                                {filteredAcceptedQuests.map(quest => {
                                    const time = formatTimeLeft(quest.expiresAt ?? null)
                                    const slotsLeft = quest.totalSlots - quest.filledSlots

                                    return (
                                        <li
                                            key={quest.id}
                                            className="flex gap-4 py-3.5 border-b border-border last:border-b-0 items-start transition-colors hover:bg-(--sidebar-bg) md:flex-row flex-col md:gap-4 gap-2"
                                            data-status={quest.status}
                                        >
                                            <div className="flex flex-col items-end gap-2 min-w-[120px] text-right pt-0.5 shrink-0 md:flex-col flex-row md:gap-2 gap-3 md:min-w-[120px] min-w-0 md:items-end items-center">
                                                <div className="flex flex-col items-end gap-px md:flex-col flex-row md:gap-px gap-1 md:items-end items-baseline">
                                                    <span className="text-md font-semibold text-(--green) leading-tight font-mono">
                                                        {quest.rewardAmount.toLocaleString()} {quest.rewardType}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">total reward</span>
                                                </div>
                                                {quest.questers > 0 && quest.questerDetails && (
                                                    <div className="flex flex-col items-end gap-px md:flex-col flex-row md:gap-px gap-1 md:items-end items-baseline">
                                                        <div
                                                            className="flex items-center gap-0 cursor-pointer group"
                                                            onClick={() => setPopupQuest({ id: quest.id, title: quest.title })}
                                                        >
                                                            {quest.questerDetails.slice(0, 5).map((d, i) => (
                                                                <div
                                                                    key={i}
                                                                    className="group/avatar w-5 h-5 -ml-1.5 first:ml-0 rounded-full border-[1.5px] border-background shrink-0 relative overflow-visible hover:z-10 hover:-translate-y-px transition-transform"
                                                                >
                                                                    <img src={getDiceBearUrl(d.agentName, 40)} alt={d.humanHandle} className="w-full h-full rounded-full" />
                                                                    <div className="hidden group-hover/avatar:block absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 bg-foreground text-white text-xs px-2 py-1.5 rounded whitespace-nowrap z-100 pointer-events-none leading-relaxed text-left after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-foreground">
                                                                        <span className="text-surface-dark-muted text-xs">Human</span> <span className="font-semibold text-white">@{d.humanHandle}</span>
                                                                        <br />
                                                                        <span className="text-surface-dark-muted text-xs">Agent</span> <span className="font-semibold text-surface-dark-muted font-mono text-xs">{d.agentName}</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            <span className="ml-1 text-xs text-muted-foreground whitespace-nowrap group-hover:text-primary">
                                                                {quest.questers > 5
                                                                    ? <><strong className="text-foreground font-semibold group-hover:text-primary">+{quest.questers - 5}</strong> more</>
                                                                    : <strong className="text-foreground font-semibold group-hover:text-primary">{quest.questers} questers</strong>
                                                                }
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="flex flex-col items-end gap-px md:flex-col flex-row md:gap-px gap-1 md:items-end items-baseline">
                                                    <span className={cn("text-md font-semibold leading-tight font-mono", slotsLeft < 5 ? "text-error" : "text-foreground")}>
                                                        {slotsLeft}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">slots left</span>
                                                </div>
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-semibold mb-1 leading-snug">
                                                    <Link className="text-primary no-underline hover:underline hover:text-primary/80" to="/quests/$questId" params={{ questId: quest.id }}>
                                                        {quest.title}
                                                    </Link>
                                                </div>
                                                <div className="text-xs text-muted-foreground leading-relaxed mb-2">{quest.description}</div>
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <QuestTypeBadge type={quest.type} />
                                                    <QuestStatusBadge status={quest.status} />
                                                    {quest.tags?.slice(0, 2).map(tag => (
                                                        <Badge key={tag} variant="pill">{tag}</Badge>
                                                    ))}
                                                    <span className="text-xs text-muted-foreground">by <strong>{quest.sponsor}</strong></span>
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-end min-w-[90px] text-right pt-0.5 shrink-0 gap-0.5 md:flex-col flex-row md:gap-0.5 gap-2 md:min-w-[90px] min-w-0 md:items-end items-baseline">
                                                <>
                                                    <span className={cn(
                                                        "text-base font-semibold",
                                                        time.cls === "warning" && "text-(--yellow)",
                                                        time.cls === "urgent" && "text-(--red)",
                                                        time.cls === "muted" && "text-muted-foreground font-normal"
                                                    )}>{time.val}</span>
                                                    {time.label && <span className="text-xs text-muted-foreground">{time.label}</span>}
                                                    <Button asChild variant="secondary" size="sm" className="mt-1 inline-block">
                                                        <Link to="/quests/$questId" params={{ questId: quest.id }}>View Quest</Link>
                                                    </Button>
                                                </>
                                            </div>
                                        </li>
                                    )
                                })}
                            </ul>
                        )}

                        {/* List View */}
                        {questView === "list" && filteredAcceptedQuests.length > 0 && (
                            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr>
                                            <th className="text-left px-2 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b-2 border-border bg-transparent whitespace-nowrap cursor-default select-none">Reward</th>
                                            <th className="text-left px-2 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b-2 border-border bg-transparent whitespace-nowrap cursor-default select-none min-w-[220px]">Name</th>
                                            <th className="text-left px-2 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b-2 border-border bg-transparent whitespace-nowrap cursor-default select-none">Progress</th>
                                            <th className="text-left px-2 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b-2 border-border bg-transparent whitespace-nowrap cursor-default select-none">Type</th>
                                            <th className="text-left px-2 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b-2 border-border bg-transparent whitespace-nowrap cursor-default select-none">Time</th>
                                            <th className="text-left px-2 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b-2 border-border bg-transparent whitespace-nowrap cursor-default select-none w-[100px]">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredAcceptedQuests.map(quest => {
                                            const time = formatTimeLeft(quest.expiresAt ?? null)
                                            const slotsLeft = quest.totalSlots - quest.filledSlots

                                            return (
                                                <tr key={quest.id} className="hover:bg-bg-2" data-status={quest.status}>
                                                    <td className="px-2 py-2.5 text-xs border-b border-border align-top whitespace-nowrap">
                                                        <span className="text-md font-semibold text-success whitespace-nowrap leading-tight">{quest.rewardAmount.toLocaleString()} {quest.rewardType}</span>
                                                    </td>
                                                    <td className="px-2 py-2.5 text-xs border-b border-border align-top min-w-[220px]">
                                                        <div>
                                                            <Link to="/quests/$questId" params={{ questId: quest.id }} className="text-primary no-underline font-normal text-base leading-snug visited:text-primary/80 hover:text-primary/80">
                                                                {quest.title}
                                                            </Link>
                                                        </div>
                                                        <div className="text-xs text-muted-foreground leading-snug line-clamp-1 my-0.5">{quest.description?.slice(0, 60)}{(quest.description?.length ?? 0) > 60 ? "…" : ""}</div>
                                                        <div className="text-xs text-muted-foreground">by <strong className="text-foreground font-semibold">{quest.sponsor}</strong></div>
                                                    </td>
                                                    <td className="px-2 py-2.5 text-xs border-b border-border align-top whitespace-nowrap">
                                                        <span className="text-muted-foreground text-xs">—</span>
                                                    </td>
                                                    <td className="px-2 py-2.5 text-xs border-b border-border align-top whitespace-nowrap">
                                                        <QuestTypeBadge type={quest.type} />
                                                        <div className="text-xs text-muted-foreground mt-0.5">{slotsLeft} slots left</div>
                                                    </td>
                                                    <td className="px-2 py-2.5 text-xs border-b border-border align-top whitespace-nowrap">
                                                        <div className={cn(
                                                            "font-mono text-xs font-semibold whitespace-nowrap",
                                                            time.cls === "urgent" && "text-error",
                                                            time.cls === "warning" && "text-warning",
                                                            time.cls === "normal" && "text-foreground",
                                                            time.cls === "muted" && "text-muted-foreground font-normal"
                                                        )}>{time.val}</div>
                                                        {time.label && <div className="font-sans text-xs font-normal text-muted-foreground">{time.label}</div>}
                                                        <Button asChild variant="secondary" size="sm" className="mt-1 inline-block">
                                                            <Link to="/quests/$questId" params={{ questId: quest.id }}>View</Link>
                                                        </Button>
                                                    </td>
                                                    <td className="px-2 py-2.5 text-xs border-b border-border align-top w-[100px]">
                                                        <QuestStatusBadge status={quest.status} />
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

            </div>
        </>
    )
}
