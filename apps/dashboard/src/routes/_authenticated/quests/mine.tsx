import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/context/AuthContext"
import type { Quest } from "@clawquest/shared"
import "@/styles/pages/quest-explore.css"

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

type Tab = "all" | "draft" | "live" | "completed"

function statusBadgeClass(status: string) {
    const map: Record<string, string> = {
        live: "badge-live",
        completed: "badge-completed",
        draft: "badge-draft",
        pending_funding: "badge-pending",
        cancelled: "badge-cancelled",
        expired: "badge-expired",
    }
    return map[status] ?? ""
}

function typeBadgeClass(type: string) {
    const map: Record<string, string> = {
        FCFS: "badge-fcfs",
        LEADERBOARD: "badge-leaderboard",
        LUCKY_DRAW: "badge-luckydraw",
    }
    return map[type] ?? "badge-fcfs"
}

function formatTimeLeft(expiresAt: string | null): string {
    if (!expiresAt) return "No deadline"
    const diff = new Date(expiresAt).getTime() - Date.now()
    if (diff <= 0) return "Ended"
    const h = Math.floor(diff / 3600000)
    const d = Math.floor(h / 24)
    if (d < 2) return `${h}h left`
    return `${d}d left`
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

type MineQuest = Quest & { fundingStatus?: string; previewToken?: string }

export function MyQuests() {
    const { session } = useAuth()
    const [tab, setTab] = useState<Tab>("all")

    const { data: quests = [], isLoading, error } = useQuery<MineQuest[]>({
        queryKey: ["quests-mine"],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/quests/mine`, {
                headers: session?.access_token
                    ? { Authorization: `Bearer ${session.access_token}` }
                    : {},
            })
            if (!res.ok) throw new Error("Failed to load your quests")
            return res.json()
        },
        staleTime: 30_000,
    })

    const filtered = tab === "all"
        ? quests
        : quests.filter(q => {
            if (tab === "draft") return q.status === "draft" || q.status === "pending_funding"
            if (tab === "live") return q.status === "live"
            if (tab === "completed") return q.status === "completed" || q.status === "expired" || q.status === "cancelled"
            return true
        })

    const counts = {
        all: quests.length,
        draft: quests.filter(q => q.status === "draft" || q.status === "pending_funding").length,
        live: quests.filter(q => q.status === "live").length,
        completed: quests.filter(q => q.status === "completed" || q.status === "expired" || q.status === "cancelled").length,
    }

    const tabs: { id: Tab; label: string }[] = [
        { id: "all", label: "All" },
        { id: "draft", label: "Drafts" },
        { id: "live", label: "Live" },
        { id: "completed", label: "Completed" },
    ]

    return (
        <>
            <div className="page-header">
                <div>
                    <h1>My Quests</h1>
                    <div className="page-header-meta">Quests you created. Manage drafts, track live quests, review completed ones.</div>
                </div>
                <Link to="/quests/new">
                    <button className="btn btn-primary">+ Create Quest</button>
                </Link>
            </div>

            <div className="tabs-row">
                <div className="tabs">
                    {tabs.map(t => (
                        <button
                            key={t.id}
                            className={`tab${tab === t.id ? " active" : ""}`}
                            onClick={() => setTab(t.id)}
                        >
                            {t.label}
                            {counts[t.id] > 0 && (
                                <span className="count">&nbsp;{counts[t.id]}</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {isLoading && <div style={{ padding: "32px 0", color: "var(--fg-muted)" }}>Loading your quests...</div>}
            {error && <div style={{ padding: "32px 0", color: "var(--red)" }}>Error loading quests.</div>}

            {!isLoading && filtered.length === 0 && (
                <div style={{ padding: "48px 0", textAlign: "center", color: "var(--fg-muted)" }}>
                    {tab === "all"
                        ? <>No quests yet. <Link to="/quests/new" style={{ color: "var(--primary)" }}>Create your first quest →</Link></>
                        : `No ${tab} quests.`
                    }
                </div>
            )}

            {!isLoading && filtered.length > 0 && (
                <div className="quest-list-wrap">
                    <ul className="quest-list">
                        {filtered.map(quest => (
                            <MyQuestCard key={quest.id} quest={quest} />
                        ))}
                    </ul>
                </div>
            )}
        </>
    )
}

// ─── Card for /quests/mine — includes status badge, draft link with token ────

function MyQuestCard({ quest }: { quest: MineQuest }) {
    const slotsLeft = quest.totalSlots - quest.filledSlots
    const isDraft = quest.status === "draft" || quest.status === "pending_funding"

    // Draft quests need preview token to access detail page
    const linkProps = isDraft && quest.previewToken
        ? { to: "/quests/$questId" as const, params: { questId: quest.id }, search: { token: quest.previewToken } }
        : { to: "/quests/$questId" as const, params: { questId: quest.id } }

    return (
        <li className="quest-item">
            {/* Stats column */}
            <div className="quest-stats">
                <div className="quest-stat">
                    <span className="quest-stat-val reward">
                        {quest.rewardAmount.toLocaleString()} {quest.rewardType}
                    </span>
                    <span className="quest-stat-label">total reward</span>
                </div>
                <div className="quest-stat">
                    <span className="quest-stat-val">{quest.questers}</span>
                    <span className="quest-stat-label">questers</span>
                </div>
                <div className="quest-stat">
                    <span className="quest-stat-val">{slotsLeft}</span>
                    <span className="quest-stat-label">slots left</span>
                </div>
            </div>

            {/* Body */}
            <div className="quest-body">
                <div className="quest-title">
                    <Link {...linkProps} className="quest-title-link">
                        {quest.title}
                    </Link>
                </div>
                {quest.description && (
                    <div className="quest-excerpt">{quest.description}</div>
                )}
                <div className="quest-meta">
                    <span className={`badge ${statusBadgeClass(quest.status)}`}>{quest.status.replace("_", " ").toUpperCase()}</span>
                    <span className={`badge ${typeBadgeClass(quest.type)}`}>{quest.type}</span>
                    <span className="meta-sponsor">Created {formatDate(quest.createdAt)}</span>
                </div>
            </div>

            {/* Right column — time or action */}
            <div className="quest-time-col">
                {isDraft ? (
                    <Link {...linkProps} className="btn btn-sm btn-secondary">
                        View Draft
                    </Link>
                ) : (
                    <span className="quest-time-val">{formatTimeLeft(quest.expiresAt)}</span>
                )}
            </div>
        </li>
    )
}
