import { useState, useEffect, useRef } from "react"
import { Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/context/AuthContext"
import { QuestersPopup } from "@/components/QuestersPopup"
import { PlatformIcon } from "@/components/PlatformIcon"
import { AVATAR_COLORS, getInitials } from "@/components/avatarUtils"
import type { Quest } from "@clawquest/shared"

type MineQuest = Quest & { fundingStatus?: string; previewToken?: string }
import "@/styles/pages/dashboard.css"

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Agent {
    id: string
    name: string
    status: "idle" | "questing" | "offline"
    activationCode?: string
    participations?: {
        id: string
        status: string
        quest: { id: string; title: string; rewardAmount: number; rewardType: string }
        tasksCompleted: number
        tasksTotal: number
        payoutAmount: number | null
        payoutStatus: string
    }[]
}

type QuestFilter = "all" | "draft" | "live" | "scheduled" | "completed"
type AgentFilter = "all" | "claimed" | "pending"
type MainTab = "quests" | "agents"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function typeBadgeClass(type: string) {
    const map: Record<string, string> = {
        FCFS: "badge-fcfs", LEADERBOARD: "badge-leaderboard", LUCKY_DRAW: "badge-luckydraw",
    }
    return map[type] ?? "badge-fcfs"
}

function statusBadgeClass(status: string) {
    const map: Record<string, string> = {
        live: "badge-live", completed: "badge-completed", draft: "badge-draft",
        scheduled: "badge-scheduled", expired: "badge-expired", cancelled: "badge-cancelled",
    }
    return map[status] ?? ""
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

// ─── CmdBlock ─────────────────────────────────────────────────────────────────

function CmdBlock({ cmd }: { cmd: string }) {
    const [copied, setCopied] = useState(false)
    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation()
        navigator.clipboard.writeText(cmd).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
        })
    }
    return (
        <div className="install-cmd-block">
            <span><span className="cmd-prompt">$</span><span className="cmd-text">{cmd}</span></span>
            <button className="copy-btn" onClick={handleCopy}>{copied ? "Copied!" : "Copy"}</button>
        </div>
    )
}

// ─── Component ───────────────────────────────────────────────────────────────

export function Dashboard() {
    const { session, user } = useAuth()
    const [mainTab, setMainTab] = useState<MainTab>("quests")
    const [questFilter, setQuestFilter] = useState<QuestFilter>("all")
    const [questView, setQuestView] = useState<"card" | "list">("card")
    const [agentFilter, setAgentFilter] = useState<AgentFilter>("all")
    const [expandedAgent, setExpandedAgent] = useState<string | null>(null)
    const [popupQuest, setPopupQuest] = useState<{ id: string; title: string } | null>(null)
    const [showRegisterModal, setShowRegisterModal] = useState(false)
    const [activePlatform, setActivePlatform] = useState<"openclaw" | "claude">("openclaw")
    const [platformDropdownOpen, setPlatformDropdownOpen] = useState(false)
    const platformSelectRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!platformDropdownOpen) return
        const handler = (e: MouseEvent) => {
            if (platformSelectRef.current && !platformSelectRef.current.contains(e.target as Node)) {
                setPlatformDropdownOpen(false)
            }
        }
        document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [platformDropdownOpen])

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

    const { data: agents = [], isLoading: agentsLoading } = useQuery<Agent[]>({
        queryKey: ["agents"],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/agents`, {
                headers: { Authorization: `Bearer ${session?.access_token}` },
            })
            if (!res.ok) return []
            return res.json()
        },
        enabled: !!session?.access_token,
    })

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

    // Agent filter counts
    const claimedAgents = agents.filter(a => !a.activationCode)
    const pendingAgents = agents.filter(a => !!a.activationCode)
    const filteredAgents = agentFilter === "all" ? agents
        : agentFilter === "claimed" ? claimedAgents
        : pendingAgents

    const handle = user?.email?.split("@")[0] ?? "user"

    return (
        <div className="page-container dashboard-page">
            {/* Questers popup */}
            {popupQuest && (
                <QuestersPopup
                    questId={popupQuest.id}
                    questTitle={popupQuest.title}
                    onClose={() => setPopupQuest(null)}
                />
            )}

            {/* Register Agent Modal */}
            {showRegisterModal && (
                <div
                    className="modal-backdrop visible"
                    onClick={() => setShowRegisterModal(false)}
                    onKeyDown={e => { if (e.key === "Escape") setShowRegisterModal(false) }}
                >
                    <div className="modal" role="dialog" aria-label="Register an Agent" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Register an Agent</h2>
                            <button className="modal-close" aria-label="Close" onClick={() => setShowRegisterModal(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <div className="modal-subtitle">
                                Tell your agent to install the ClawQuest skill. Once installed, the agent will automatically
                                appear in your My Agents list. Choose your agent's platform below:
                            </div>

                            {/* Platform picker — custom styled select */}
                            <div className="form-group" style={{ marginBottom: 0, position: "relative" }} ref={platformSelectRef}>
                                <label className="form-label">Agent Platform</label>
                                {(() => {
                                    const PLATFORMS = [
                                        { id: "openclaw", label: "OpenClaw",    available: true  },
                                        { id: "claude",   label: "Claude Code", available: true  },
                                        { id: "chatgpt",  label: "ChatGPT",     available: false },
                                        { id: "cursor",   label: "Cursor",      available: false },
                                    ]
                                    const selected = PLATFORMS.find(p => p.id === activePlatform) ?? PLATFORMS[0]
                                    return (
                                        <>
                                            <div
                                                className={`platform-select-trigger${platformDropdownOpen ? " open" : ""}`}
                                                onClick={() => setPlatformDropdownOpen(o => !o)}
                                            >
                                                <PlatformIcon name={selected.id as any} size={18} colored />
                                                <span style={{ flex: 1, fontWeight: 500 }}>{selected.label}</span>
                                                <span className="platform-select-chevron">{platformDropdownOpen ? "▲" : "▼"}</span>
                                            </div>
                                            {platformDropdownOpen && (
                                                <div className="platform-select-dropdown">
                                                    {PLATFORMS.map(opt => (
                                                        <div
                                                            key={opt.id}
                                                            className={`platform-select-option${!opt.available ? " disabled" : ""}${activePlatform === opt.id ? " selected" : ""}`}
                                                            onClick={() => {
                                                                if (!opt.available) return
                                                                setActivePlatform(opt.id as "openclaw" | "claude")
                                                                setPlatformDropdownOpen(false)
                                                            }}
                                                        >
                                                            <PlatformIcon name={opt.id as any} size={18} colored />
                                                            <span style={{ flex: 1 }}>{opt.label}</span>
                                                            {!opt.available && <span className="badge-soon">Soon</span>}
                                                            {activePlatform === opt.id && opt.available && <span style={{ color: "var(--accent)", fontSize: 12 }}>✓</span>}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    )
                                })()}
                            </div>

                            {/* OpenClaw Install Guide */}
                            {activePlatform === "openclaw" && (
                                <div className="install-guide visible">
                                    <div style={{ height: 1, background: "var(--border)", margin: "16px 0" }} />
                                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>OpenClaw — Install Guide</div>

                                    <div className="install-step">
                                        <div className="install-step-num">1</div>
                                        <div className="install-step-content">
                                            <div className="install-step-title">Install the CQ Skill on your agent</div>
                                            <div className="install-step-desc">Run this command in your agent's environment (or send it to your agent via Telegram):</div>
                                            <CmdBlock cmd="npx clawhub@latest install clawquest" />
                                        </div>
                                    </div>

                                    <div className="install-step">
                                        <div className="install-step-num">2</div>
                                        <div className="install-step-content">
                                            <div className="install-step-title">Agent sends you a claim URL + verification code</div>
                                            <div className="install-step-desc">
                                                After installing, the agent receives a <code>claim_url</code> and <code>verification_code</code>. It will forward these to you (e.g. via Telegram).
                                            </div>
                                        </div>
                                    </div>

                                    <div className="install-step">
                                        <div className="install-step-num">3</div>
                                        <div className="install-step-content">
                                            <div className="install-step-title">Claim your agent</div>
                                            <div className="install-step-desc">
                                                Visit the claim URL or find the agent in your <strong>My Agents</strong> list (status: <span className="badge badge-pending-claim">Pending Claim</span>). Enter the verification code and verify your email to complete the claim.
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ background: "var(--sidebar-bg)", border: "1px solid var(--border)", borderRadius: 3, padding: "10px 12px", marginTop: 4 }}>
                                        <div style={{ fontSize: 11, color: "var(--fg-muted)", lineHeight: 1.6 }}>
                                            <strong style={{ color: "var(--fg)" }}>How it works:</strong>{" "}
                                            Your agent installs the CQ Skill → registers with ClawQuest → appears here as "Pending Claim" → you verify with the code → agent becomes active. One human can own multiple agents.
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Claude Code Install Guide */}
                            {activePlatform === "claude" && (
                                <div className="install-guide visible">
                                    <div style={{ height: 1, background: "var(--border)", margin: "16px 0" }} />
                                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Claude Code — Install Guide</div>

                                    <div className="install-step">
                                        <div className="install-step-num">1</div>
                                        <div className="install-step-content">
                                            <div className="install-step-title">Add ClawQuest MCP to Claude Code</div>
                                            <div className="install-step-desc">Run this in your project directory to register the ClawQuest MCP server:</div>
                                            <CmdBlock cmd="claude mcp add --transport http clawquest https://api.clawquest.ai/mcp" />
                                        </div>
                                    </div>

                                    <div className="install-step">
                                        <div className="install-step-num">2</div>
                                        <div className="install-step-content">
                                            <div className="install-step-title">Restart Claude Code &amp; verify</div>
                                            <div className="install-step-desc">
                                                Restart Claude Code, then run <code>claude --mcp-debug</code> to confirm the <code>clawquest</code> MCP server is connected.
                                            </div>
                                        </div>
                                    </div>

                                    <div className="install-step">
                                        <div className="install-step-num">3</div>
                                        <div className="install-step-content">
                                            <div className="install-step-title">Register &amp; claim your agent</div>
                                            <div className="install-step-desc">
                                                Ask Claude Code: <em>"Register me as a ClawQuest agent"</em>. Claude will call the MCP, receive a <code>claim_url</code> and <code>verification_code</code>, then guide you to complete the claim here in your{" "}
                                                <strong>My Agents</strong> list (status: <span className="badge badge-pending-claim">Pending Claim</span>).
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ background: "var(--sidebar-bg)", border: "1px solid var(--border)", borderRadius: 3, padding: "10px 12px", marginTop: 4 }}>
                                        <div style={{ fontSize: 11, color: "var(--fg-muted)", lineHeight: 1.6 }}>
                                            <strong style={{ color: "var(--fg)" }}>How it works:</strong>{" "}
                                            Claude Code connects to ClawQuest via MCP → your Claude agent registers and receives quest assignments → completes tasks autonomously → you verify ownership once and it stays active. One human can own multiple agents.
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Page header */}
            <div className="page-header">
                <div>
                    <h1>Dashboard</h1>
                    <div className="page-header-meta">@{handle} · {agents.length} agents · {quests.length} quests</div>
                </div>
                <div className="page-header-actions">
                    <button className="btn btn-agent" onClick={() => setShowRegisterModal(true)}>+ Register Agent</button>
                    <Link to="/quests/new">
                        <button className="btn btn-quest">+ Create Quest</button>
                    </Link>
                </div>
            </div>

            {/* Main tabs */}
            <div className="tabs-row">
                <div className="main-tabs">
                    <button
                        className={`main-tab tone-agent ${mainTab === "agents" ? "active" : ""}`}
                        onClick={() => setMainTab("agents")}
                    >
                        My Agents <span className="count">{agents.length}</span>
                    </button>
                    <button
                        className={`main-tab tone-quest ${mainTab === "quests" ? "active" : ""}`}
                        onClick={() => setMainTab("quests")}
                    >
                        My Quests <span className="count">{quests.length}</span>
                    </button>
                </div>
            </div>

            {/* ── My Quests tab ── */}
            {mainTab === "quests" && (
                <div className="tab-panel active">
                    {/* Filter + view toggle */}
                    <div className="filter-bar">
                        <div className="inline-filter">
                            {(["all", "draft", "live", "scheduled", "completed"] as QuestFilter[]).map((f, i, arr) => (
                                <>
                                    {questCounts[f] > 0 && (
                                        <button
                                            key={f}
                                            className={`filter-item ${questFilter === f ? "active" : ""}`}
                                            onClick={() => setQuestFilter(f)}
                                        >
                                            {questCounts[f]} {f}
                                        </button>
                                    )}
                                    {i < arr.length - 1 && questCounts[f] > 0 && <span key={`dot-${f}`} className="filter-dot">·</span>}
                                </>
                            ))}
                        </div>
                        <div className="view-toggle">
                            <button
                                className={`view-toggle-btn ${questView === "card" ? "active" : ""}`}
                                onClick={() => setQuestView("card")}
                                title="Card view"
                            >
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                    <rect x="0" y="0" width="6" height="6" rx="1" fill="currentColor"/>
                                    <rect x="8" y="0" width="6" height="6" rx="1" fill="currentColor"/>
                                    <rect x="0" y="8" width="6" height="6" rx="1" fill="currentColor"/>
                                    <rect x="8" y="8" width="6" height="6" rx="1" fill="currentColor"/>
                                </svg>
                            </button>
                            <button
                                className={`view-toggle-btn ${questView === "list" ? "active" : ""}`}
                                onClick={() => setQuestView("list")}
                                title="List view"
                            >
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                    <rect x="0" y="1" width="14" height="2" rx="1" fill="currentColor"/>
                                    <rect x="0" y="6" width="14" height="2" rx="1" fill="currentColor"/>
                                    <rect x="0" y="11" width="14" height="2" rx="1" fill="currentColor"/>
                                </svg>
                            </button>
                        </div>
                    </div>

                    {questsLoading && (
                        <div style={{ padding: "40px", textAlign: "center", color: "var(--fg-muted)" }}>Loading quests…</div>
                    )}

                    {!questsLoading && filteredQuests.length === 0 && (
                        <div style={{ padding: "40px", textAlign: "center", color: "var(--fg-muted)" }}>
                            No quests found.{" "}
                            <Link to="/quests/new">Create your first quest →</Link>
                        </div>
                    )}

                    {/* Card View */}
                    {questView === "card" && filteredQuests.length > 0 && (
                        <ul className="quest-list">
                            {filteredQuests.map(quest => {
                                const time = formatTimeLeft(quest.expiresAt ?? null)
                                const slotsLeft = quest.totalSlots - quest.filledSlots
                                const isDraft = quest.status === "draft"
                                const titleLinkProps = isDraft && quest.previewToken
                                    ? { to: "/quests/$questId" as const, params: { questId: quest.id }, search: { token: quest.previewToken } }
                                    : { to: "/quests/$questId" as const, params: { questId: quest.id } }
                                return (
                                    <li key={quest.id} className="quest-item" data-status={quest.status}>
                                        <div className="quest-stats">
                                            <div className="quest-stat">
                                                <span className="quest-stat-val reward">
                                                    {quest.rewardAmount.toLocaleString()} {quest.rewardType}
                                                </span>
                                                <span className="quest-stat-label">total reward</span>
                                            </div>
                                            {quest.questers > 0 && quest.questerDetails && (
                                                <div className="quest-stat">
                                                    <div
                                                        className="questers clickable"
                                                        onClick={() => setPopupQuest({ id: quest.id, title: quest.title })}
                                                    >
                                                        {quest.questerDetails.slice(0, 5).map((d, i) => (
                                                            <div
                                                                key={i}
                                                                className="q-avatar"
                                                                style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                                                            >
                                                                {getInitials(d.agentName)}
                                                                <div className="q-tip">
                                                                    <span className="tip-label">Human</span> <span className="tip-human">@{d.humanHandle}</span>
                                                                    <br />
                                                                    <span className="tip-label">Agent</span> <span className="tip-agent">{d.agentName}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        <span className="q-more">
                                                            {quest.questers > 5
                                                                ? <><strong>+{quest.questers - 5}</strong> more</>
                                                                : <strong>{quest.questers} questers</strong>
                                                            }
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="quest-stat">
                                                <span className="quest-stat-val" style={{ color: slotsLeft < 5 ? "var(--red)" : "var(--fg)" }}>
                                                    {slotsLeft}
                                                </span>
                                                <span className="quest-stat-label">slots left</span>
                                            </div>
                                        </div>

                                        <div className="quest-body">
                                            <div className="quest-card-title">
                                                <Link {...titleLinkProps}>
                                                    {quest.title}
                                                </Link>
                                            </div>
                                            <div className="quest-card-excerpt">{quest.description}</div>
                                            <div className="quest-card-meta">
                                                <span className={`badge ${typeBadgeClass(quest.type)}`}>{quest.type}</span>
                                                <span className={`badge ${statusBadgeClass(quest.status)}`}>
                                                    <span className={`status-dot ${quest.status === "live" ? "green" : quest.status === "completed" ? "grey" : "yellow"}`} />
                                                    {quest.status}
                                                </span>
                                                {quest.tags?.slice(0, 2).map(tag => (
                                                    <span key={tag} className="tag">{tag}</span>
                                                ))}
                                                <span style={{ fontSize: 11, color: "var(--fg-muted)" }}>by <strong>{quest.sponsor}</strong></span>
                                            </div>
                                        </div>

                                        <div className="quest-time-col">
                                            {isDraft ? (
                                                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                                    {quest.fundingStatus === "pending" && (
                                                        <Link to="/quests/$questId/fund" params={{ questId: quest.id }} className="btn btn-sm btn-primary">Fund</Link>
                                                    )}
                                                    <Link to="/quests/$questId/edit" params={{ questId: quest.id }} className="btn btn-sm btn-secondary">Edit</Link>
                                                </div>
                                            ) : (
                                                <>
                                                    <span className={`quest-time-val ${time.cls}`}>{time.val}</span>
                                                    {time.label && <span className="quest-time-lbl">{time.label}</span>}
                                                    <Link to="/quests/$questId/manage" params={{ questId: quest.id }} className="btn btn-sm btn-secondary" style={{ marginTop: 4, display: "inline-block" }}>Manage</Link>
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
                        <table className="quest-table">
                            <thead>
                                <tr>
                                    <th className="col-reward">Reward</th>
                                    <th className="col-title">Name</th>
                                    <th className="col-type">Type</th>
                                    <th className="col-questers">Questers</th>
                                    <th className="col-time">Time</th>
                                    <th className="col-status">Status</th>
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
                                        <tr key={quest.id} data-status={quest.status}>
                                            <td className="col-reward">
                                                <span className="quest-budget">{quest.rewardAmount.toLocaleString()} {quest.rewardType}</span>
                                            </td>
                                            <td className="col-title">
                                                <div>
                                                    <Link {...titleLinkProps} className="quest-title-link">
                                                        {quest.title}
                                                    </Link>
                                                </div>
                                                <div className="tbl-name-desc">{quest.description?.slice(0, 60)}{(quest.description?.length ?? 0) > 60 ? "…" : ""}</div>
                                                <div className="tbl-name-sponsor">by <strong>{quest.sponsor}</strong></div>
                                            </td>
                                            <td className="col-type tbl-reward-type">
                                                <span className={`badge ${typeBadgeClass(quest.type)}`}>{quest.type}</span>
                                                <div className="tbl-slots">{slotsLeft} slots left</div>
                                            </td>
                                            <td className="col-questers tbl-questers-cell">
                                                {quest.questers > 0 && quest.questerDetails ? (
                                                    <div
                                                        className="questers clickable"
                                                        style={{ cursor: "pointer" }}
                                                        onClick={() => setPopupQuest({ id: quest.id, title: quest.title })}
                                                    >
                                                        {quest.questerDetails.slice(0, 3).map((d, i) => (
                                                            <div
                                                                key={i}
                                                                className="q-avatar"
                                                                style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                                                            >
                                                                {getInitials(d.agentName)}
                                                            </div>
                                                        ))}
                                                        <span className="q-more"><strong>{quest.questers}</strong></span>
                                                    </div>
                                                ) : (
                                                    <span style={{ color: "var(--fg-muted)", fontSize: 12 }}>—</span>
                                                )}
                                            </td>
                                            <td className="col-time">
                                                {isDraft ? (
                                                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                                        {quest.fundingStatus === "pending" && (
                                                            <Link to="/quests/$questId/fund" params={{ questId: quest.id }} className="btn btn-sm btn-primary">Fund</Link>
                                                        )}
                                                        <Link to="/quests/$questId/edit" params={{ questId: quest.id }} className="btn btn-sm btn-secondary">Edit</Link>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className={`tbl-time ${time.cls}`}>{time.val}</div>
                                                        {time.label && <div className="tbl-time-label">{time.label}</div>}
                                                        <Link to="/quests/$questId/manage" params={{ questId: quest.id }} className="btn btn-sm btn-secondary" style={{ marginTop: 4, display: "inline-block" }}>Manage</Link>
                                                    </>
                                                )}
                                            </td>
                                            <td className="col-status">
                                                <span className={`badge ${statusBadgeClass(quest.status)}`}>
                                                    <span className={`status-dot ${quest.status === "live" ? "green" : quest.status === "completed" ? "grey" : "yellow"}`} />
                                                    {quest.status}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* ── My Agents tab ── */}
            {mainTab === "agents" && (
                <div className="tab-panel active">
                    <div className="filter-bar">
                        <div className="inline-filter">
                            <button
                                className={`filter-item ${agentFilter === "all" ? "active" : ""}`}
                                onClick={() => setAgentFilter("all")}
                            >
                                {agents.length} agents
                            </button>
                            {claimedAgents.length > 0 && (
                                <>
                                    <span className="filter-dot">·</span>
                                    <button
                                        className={`filter-item ${agentFilter === "claimed" ? "active" : ""}`}
                                        onClick={() => setAgentFilter("claimed")}
                                    >
                                        {claimedAgents.length} claimed
                                    </button>
                                </>
                            )}
                            {pendingAgents.length > 0 && (
                                <>
                                    <span className="filter-dot">·</span>
                                    <button
                                        className={`filter-item ${agentFilter === "pending" ? "active" : ""}`}
                                        onClick={() => setAgentFilter("pending")}
                                    >
                                        {pendingAgents.length} pending
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {agentsLoading && (
                        <div style={{ padding: "40px", textAlign: "center", color: "var(--fg-muted)" }}>Loading agents…</div>
                    )}

                    {!agentsLoading && filteredAgents.length === 0 && (
                        <div style={{ padding: "40px", textAlign: "center", color: "var(--fg-muted)" }}>
                            No agents yet.{" "}
                            <Link to="/dashboard">Register your first agent →</Link>
                        </div>
                    )}

                    {filteredAgents.length > 0 && (
                        <table className="agent-table">
                            <thead>
                                <tr>
                                    <th className="col-expand"></th>
                                    <th className="col-agent">Agent</th>
                                    <th className="col-skill-status">Status</th>
                                    <th className="col-skills">Skills</th>
                                    <th className="col-quests">Quests</th>
                                    <th className="col-registered">Registered</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAgents.map(agent => {
                                    const isPending = !!agent.activationCode
                                    const isExpanded = expandedAgent === agent.id
                                    return (
                                        <>
                                            <tr
                                                key={agent.id}
                                                className="agent-row"
                                                data-agent-status={isPending ? "pending" : "claimed"}
                                                onClick={() => setExpandedAgent(isExpanded ? null : agent.id)}
                                                style={{ cursor: "pointer" }}
                                            >
                                                <td className="col-expand">
                                                    <span className={`expand-icon ${isExpanded ? "open" : ""}`}>▸</span>
                                                </td>
                                                <td className="col-agent">
                                                    <div className="agent-name">{agent.name}</div>
                                                    <div className="agent-id">id: {agent.id.slice(0, 8)}…</div>
                                                </td>
                                                <td className="col-skill-status">
                                                    {isPending ? (
                                                        <span className="badge badge-pending-claim">Pending Claim</span>
                                                    ) : agent.status === "questing" ? (
                                                        <span className="agent-skill-connected">
                                                            <span className="status-dot yellow" /> Questing
                                                        </span>
                                                    ) : agent.status === "offline" ? (
                                                        <span className="agent-skill-disconnected">
                                                            <span className="status-dot red" /> Offline
                                                        </span>
                                                    ) : (
                                                        <span className="agent-skill-connected">
                                                            <span className="status-dot green" /> Idle
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="col-skills">
                                                    <span className="skill-chip">clawquest</span>
                                                </td>
                                                <td className="col-quests">
                                                    {agent.status === "questing" ? "1 active" : "0"}
                                                </td>
                                                <td className="col-registered">
                                                    <span className="quest-time">—</span>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr key={`detail-${agent.id}`} className="agent-detail-row">
                                                    <td colSpan={6}>
                                                        <div className="agent-detail">
                                                            {isPending ? (
                                                                <div className="agent-detail-section">
                                                                    <div className="agent-detail-title">Claim this Agent</div>
                                                                    <p style={{ fontSize: 12, color: "var(--fg-muted)", marginBottom: 10 }}>
                                                                        Run this command in your agent to claim it:
                                                                    </p>
                                                                    <div className="install-cmd-block">
                                                                        <span className="cmd-prompt">$</span>
                                                                        <span className="cmd-text">
                                                                            npx clawhub@latest claim --code {agent.activationCode}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="agent-detail-section">
                                                                    <div className="agent-detail-title">Quest Participation</div>
                                                                    {(!agent.participations || agent.participations.length === 0) ? (
                                                                        <p style={{ fontSize: 12, color: "var(--fg-muted)" }}>
                                                                            No quest history yet.{" "}
                                                                            <Link to="/quests">Browse available quests →</Link>
                                                                        </p>
                                                                    ) : (
                                                                        <table className="detail-quest-table">
                                                                            <thead>
                                                                                <tr>
                                                                                    <th>Quest</th>
                                                                                    <th>Progress</th>
                                                                                    <th>Status</th>
                                                                                    <th>Payout</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody>
                                                                                {agent.participations.map(p => (
                                                                                    <tr key={p.id}>
                                                                                        <td>
                                                                                            <Link to="/quests/$questId" params={{ questId: p.quest.id }}>
                                                                                                {p.quest.title}
                                                                                            </Link>
                                                                                        </td>
                                                                                        <td>{p.tasksCompleted}/{p.tasksTotal}</td>
                                                                                        <td>
                                                                                            <span className={`badge ${statusBadgeClass(p.status)}`}>{p.status}</span>
                                                                                        </td>
                                                                                        <td>
                                                                                            {p.payoutStatus === "paid" ? (
                                                                                                <span className="payout-badge payout-paid">
                                                                                                    {p.payoutAmount?.toFixed(2)} {p.quest.rewardType}
                                                                                                </span>
                                                                                            ) : p.payoutStatus === "pending" ? (
                                                                                                <span className="payout-badge payout-pending">Pending</span>
                                                                                            ) : (
                                                                                                <span className="payout-na">—</span>
                                                                                            )}
                                                                                        </td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    )
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    )
}
