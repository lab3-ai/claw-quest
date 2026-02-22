import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/context/AuthContext"
import { QuestCard, QuestersAvatarStack } from "@/components/QuestCard"
import type { QuesterDetail } from "@/components/QuestCard"
import { QuestersPopup } from "@/components/QuestersPopup"
import type { Quest } from "@clawquest/shared"
import "@/styles/pages/quest-explore.css"

type Tab = "featured" | "highest-reward" | "ending-soon" | "new"
type View = "card" | "list"

function formatTimeLeft(expiresAt: string | null): { label: string; cls: string } {
    if (!expiresAt) return { label: "No deadline", cls: "normal" }
    const diff = new Date(expiresAt).getTime() - Date.now()
    if (diff <= 0) return { label: "Ended", cls: "urgent" }
    const h = Math.floor(diff / 3600000)
    const d = Math.floor(h / 24)
    if (h < 6) return { label: `${h}h left`, cls: "urgent" }
    if (d < 2) return { label: `${h}h left`, cls: "warning" }
    return { label: `${d}d left`, cls: "normal" }
}

function typeBadgeClass(type: string) {
    const map: Record<string, string> = {
        FCFS: "badge-fcfs",
        LEADERBOARD: "badge-leaderboard",
        LUCKY_DRAW: "badge-luckydraw",
    }
    return map[type] ?? "badge-fcfs"
}

function statusBadgeClass(status: string) {
    const map: Record<string, string> = {
        live: "badge-live",
        completed: "badge-completed",
        draft: "badge-draft",
        pending: "badge-pending",
        scheduled: "badge-scheduled",
    }
    return map[status] ?? "badge-live"
}

function isEnded(quest: Quest): boolean {
    if (!quest.expiresAt) return false
    return new Date(quest.expiresAt).getTime() <= Date.now()
}

function filterAndSortQuests(quests: Quest[], tab: Tab): Quest[] {
    const active = quests.filter(q => !isEnded(q))
    switch (tab) {
        case "featured":
            return [...active]
                .sort((a, b) => b.questers - a.questers)
                .slice(0, 5)
        case "highest-reward":
            return [...active].sort((a, b) => b.rewardAmount - a.rewardAmount)
        case "ending-soon":
            return [...active]
                .sort((a, b) => {
                    const ta = a.expiresAt ? new Date(a.expiresAt).getTime() : Infinity
                    const tb = b.expiresAt ? new Date(b.expiresAt).getTime() : Infinity
                    return ta - tb
                })
        case "new":
            return [...active].sort((a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )
        default:
            return active
    }
}

export function QuestList() {
    const { session } = useAuth()
    const [tab, setTab] = useState<Tab>("featured")
    const [view, setView] = useState<View>("card")
    const [popupQuest, setPopupQuest] = useState<{ id: string; title: string } | null>(null)

    const { data: quests = [], isLoading, error } = useQuery({
        queryKey: ["quests"],
        queryFn: async () => {
            const headers: HeadersInit = {}
            if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`
            const res = await fetch(`${import.meta.env.VITE_API_URL}/quests`, { headers })
            if (!res.ok) throw new Error("Failed to fetch quests")
            return res.json() as Promise<Quest[]>
        },
        staleTime: 60_000,
    })

    const sorted = filterAndSortQuests(quests, tab)
    const tabCounts: Record<Tab, number> = {
        featured: filterAndSortQuests(quests, "featured").length,
        "highest-reward": filterAndSortQuests(quests, "highest-reward").length,
        "ending-soon": filterAndSortQuests(quests, "ending-soon").length,
        new: filterAndSortQuests(quests, "new").length,
    }
    const tabs: { id: Tab; label: string }[] = [
        { id: "featured", label: "Featured" },
        { id: "highest-reward", label: "Highest Reward" },
        { id: "ending-soon", label: "Ending Soon" },
        { id: "new", label: "New" },
    ]

    return (
        <>
            {popupQuest && (
                <QuestersPopup
                    questId={popupQuest.id}
                    questTitle={popupQuest.title}
                    onClose={() => setPopupQuest(null)}
                />
            )}
            {/* Page header */}
            <div className="page-header">
                <div>
                    <h1>Quests</h1>
                    <div className="page-header-meta">Agent-executable tasks with on-chain rewards</div>
                </div>
                <Link to="/quests/new">
                    <button className="btn btn-primary">+ Create Quest</button>
                </Link>
            </div>

            {/* Tabs row + view toggle */}
            <div className="tabs-row">
                <div className="tabs">
                    {tabs.map(t => (
                        <button
                            key={t.id}
                            className={`tab${tab === t.id ? " active" : ""}`}
                            onClick={() => setTab(t.id)}
                        >
                            {t.label}
                            {tabCounts[t.id] > 0 && (
                                <span className="count">&nbsp;{tabCounts[t.id]}</span>
                            )}
                        </button>
                    ))}
                </div>
                <div className="view-toggle">
                    <button
                        className={`view-toggle-btn${view === "card" ? " active" : ""}`}
                        title="Card view"
                        onClick={() => setView("card")}
                    >
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="1" y="1" width="6" height="6" rx="1"/>
                            <rect x="9" y="1" width="6" height="6" rx="1"/>
                            <rect x="1" y="9" width="6" height="6" rx="1"/>
                            <rect x="9" y="9" width="6" height="6" rx="1"/>
                        </svg>
                    </button>
                    <button
                        className={`view-toggle-btn${view === "list" ? " active" : ""}`}
                        title="List view"
                        onClick={() => setView("list")}
                    >
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <line x1="1" y1="2.5" x2="15" y2="2.5"/>
                            <line x1="1" y1="6.5" x2="15" y2="6.5"/>
                            <line x1="1" y1="10.5" x2="15" y2="10.5"/>
                            <line x1="1" y1="14.5" x2="15" y2="14.5"/>
                        </svg>
                    </button>
                </div>
            </div>

            {/* Loading / Error */}
            {isLoading && (
                <div className="quest-list-wrap">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="quest-item skeleton-item">
                            <div className="quest-stats">
                                <div className="skel skel-stat" />
                                <div className="skel skel-stat-sm" />
                            </div>
                            <div className="quest-body">
                                <div className="skel skel-title" />
                                <div className="skel skel-text" />
                                <div className="skel skel-tags" />
                            </div>
                            <div className="quest-time-col">
                                <div className="skel skel-time" />
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {error && <div style={{ padding: "32px 0", color: "var(--red)" }}>Error loading quests.</div>}

            {/* Card view */}
            {!isLoading && view === "card" && (
                <div className="quest-list-wrap">
                    {sorted.length === 0 ? (
                        <div style={{ padding: "48px 0", textAlign: "center", color: "var(--fg-muted)" }}>
                            No active quests found.
                        </div>
                    ) : (
                        <ul className="quest-list">
                            {sorted.map(quest => (
                                <QuestCard key={quest.id} quest={quest} />
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {/* List (table) view */}
            {!isLoading && view === "list" && (
                <div className="quest-table-wrap active">
                    <table className="quest-table">
                        <thead>
                            <tr>
                                <th className="col-reward">Reward</th>
                                <th className="tbl-name">Name</th>
                                <th className="col-type">Type</th>
                                <th className="col-questers">Questers</th>
                                <th className="col-slots">Slots</th>
                                <th className="col-time">Time Left</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sorted.length === 0 ? (
                                <tr><td colSpan={6} style={{ textAlign: "center", padding: "32px", color: "var(--fg-muted)" }}>No active quests found.</td></tr>
                            ) : sorted.map(quest => {
                                const time = formatTimeLeft(quest.expiresAt)
                                return (
                                    <tr key={quest.id}>
                                        <td className="quest-budget">{quest.rewardAmount.toLocaleString()} {quest.rewardType}</td>
                                        <td className="tbl-name">
                                            <div className="tbl-name-title">
                                                <Link className="quest-title-link" to="/quests/$questId" params={{ questId: quest.id }}>{quest.title}</Link>
                                            </div>
                                            <div className="tbl-name-desc">{quest.description}</div>
                                            <div className="tbl-name-sponsor">by <strong>{quest.sponsor}</strong></div>
                                        </td>
                                        <td>
                                            <span className={`badge ${typeBadgeClass(quest.type)}`}>{quest.type}</span>
                                            <span className={`badge ${statusBadgeClass(quest.status)}`} style={{ marginLeft: "4px" }}>{quest.status}</span>
                                        </td>
                                        <td className="tbl-questers-cell">
                                            {quest.questers > 0 ? (
                                                <QuestersAvatarStack
                                                    details={(quest.questerDetails ?? []) as QuesterDetail[]}
                                                    total={quest.questers}
                                                    onClick={() => setPopupQuest({ id: quest.id, title: quest.title })}
                                                />
                                            ) : (
                                                <span style={{ fontSize: "11px", color: "var(--fg-muted)" }}>—</span>
                                            )}
                                        </td>
                                        <td style={{ fontSize: "12px" }}>{quest.totalSlots - quest.filledSlots} left</td>
                                        <td>
                                            <div className={`tbl-time ${time.cls}`}>{time.label}</div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    )
}
