import { useState, useEffect, useRef } from "react"
import { useParams, useSearch, Link, useNavigate } from "@tanstack/react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { Quest } from "@clawquest/shared"
import { useAuth } from "@/context/AuthContext"
import { AVATAR_COLORS, getInitials } from "@/components/avatarUtils"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useAccount } from "wagmi"
import "@/styles/pages/quest-detail.css"
import "@/styles/actor-sections.css"

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000"
const REDIRECT_KEY = "clawquest_redirect_after_login"

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
        scheduled: "badge-scheduled",
        expired: "badge-expired",
        cancelled: "badge-cancelled",
    }
    return map[status] ?? "badge-live"
}

function rewardBadgeClass(type: string) {
    return type?.toLowerCase() === "usdc" || type?.toLowerCase() === "usdt" ? "badge-crypto" : "badge-fiat"
}

function useCountdown(expiresAt: string | null) {
    const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0, ended: false })

    useEffect(() => {
        if (!expiresAt) return
        function tick() {
            const diff = new Date(expiresAt!).getTime() - Date.now()
            if (diff <= 0) {
                setTimeLeft({ d: 0, h: 0, m: 0, s: 0, ended: true })
                return
            }
            const s = Math.floor(diff / 1000)
            const m = Math.floor(s / 60)
            const h = Math.floor(m / 60)
            const d = Math.floor(h / 24)
            setTimeLeft({ d, h: h % 24, m: m % 60, s: s % 60, ended: false })
        }
        tick()
        const id = setInterval(tick, 1000)
        return () => clearInterval(id)
    }, [expiresAt])

    return timeLeft
}

function platformLabel(platform: string) {
    const map: Record<string, string> = {
        x: "X / Twitter",
        telegram: "Telegram",
        discord: "Discord",
        onchain: "On-Chain",
        uniswap: "Uniswap",
    }
    return map[platform] ?? platform
}


function TaskCheck({ status }: { status: string }) {
    if (status === "done") return <span className="task-check done">✓</span>
    if (status === "verifying") return <span className="task-check verifying">↻</span>
    return <span className="task-check"></span>
}

/** Get the external URL for a task based on its actionType and params */
function getTaskActionUrl(task: any): string | undefined {
    const p = task.params || {}
    switch (task.actionType) {
        case "follow_account": return `https://x.com/${p.username}`
        case "like_post":
        case "repost": return p.postUrl
        case "post": return "https://x.com/compose/tweet"
        case "join_server": return p.inviteUrl
        case "join_channel": {
            const ch = p.channelUrl || ""
            return ch.startsWith("http") ? ch : `https://t.me/${ch.replace(/^@/, "")}`
        }
        case "verify_role": return p.inviteUrl
        default: return undefined
    }
}

/** Get the button label for a task based on its actionType and opened state */
function getTaskBtnLabel(actionType: string, opened: boolean): string {
    if (opened) return "Verify"
    switch (actionType) {
        case "join_server":
        case "join_channel": return "Join"
        case "verify_role": return "Verify"
        default: return "Do it"
    }
}

function TaskActionBtn({ status, disabled, onClick, label }: {
    status: string; disabled?: boolean; onClick?: () => void; label: string
}) {
    if (status === "done") return <button className="task-action-btn done-btn" disabled>Done ✓</button>
    if (status === "verifying") return <button className="task-action-btn running" disabled>Checking…</button>
    if (status === "failed") return <button className="task-action-btn do-it" onClick={onClick} style={{ borderColor: "var(--red)" }}>Retry →</button>
    if (disabled) return (
        <button className="task-action-btn do-it" disabled title="Accept quest first"
            style={{ opacity: 0.4, cursor: "not-allowed" }}>{label} →</button>
    )
    return <button className="task-action-btn do-it" onClick={onClick}>{label} →</button>
}

// ─── Extended types ──────────────────────────────────────────────────────────

interface MyParticipation {
    id: string
    status: string
    payoutWallet: string | null
    payoutStatus: string | null
    payoutAmount: number | null
    payoutTxHash: string | null
    tasksCompleted?: number
    tasksTotal?: number
    proof?: any
}

interface QuestWithParticipation extends Quest {
    myParticipation?: MyParticipation
    fundingMethod?: string
    fundingStatus?: string
    creatorUserId?: string
}

// ─── Component ───────────────────────────────────────────────────────────────

export function QuestDetail() {
    const { questId } = useParams({ from: "/_app/quests/$questId" })
    const { token, claim } = useSearch({ from: "/_app/quests/$questId" })
    const { isAuthenticated, session, user } = useAuth()
    const queryClient = useQueryClient()
    const navigate = useNavigate()
    const [acceptMsg, setAcceptMsg] = useState<string | null>(null)
    const [claimStatus, setClaimStatus] = useState<"idle" | "claiming" | "success" | "error">("idle")
    const [claimError, setClaimError] = useState("")
    const [verifyingIndex, setVerifyingIndex] = useState<number | null>(null)
    const [openedTasks, setOpenedTasks] = useState<Set<number>>(new Set())
    const [taskErrors, setTaskErrors] = useState<Record<number, string>>({})
    const claimAttempted = useRef(false)
    const { address: connectedWallet, isConnected: isWalletConnected } = useAccount()

    // ── Auto-claim: if user is authenticated and claim token is present ──
    const claimMutation = useMutation({
        mutationFn: async (claimToken: string) => {
            const res = await fetch(`${API_BASE}/quests/claim`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({ claimToken }),
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.error || "Failed to claim quest")
            }
            return res.json()
        },
        onSuccess: () => {
            setClaimStatus("success")
            // Clear the redirect key if it was set
            localStorage.removeItem(REDIRECT_KEY)
            // Refetch quest to get updated data
            queryClient.invalidateQueries({ queryKey: ["quest", questId] })
        },
        onError: (e: Error) => {
            // "Quest already claimed" is not really an error for the user
            if (e.message.includes("already claimed")) {
                setClaimStatus("success")
            } else {
                setClaimStatus("error")
                setClaimError(e.message)
            }
        },
    })

    // Auto-claim on page load if authenticated + claim token present
    useEffect(() => {
        if (claim && isAuthenticated && session?.access_token && !claimAttempted.current) {
            claimAttempted.current = true
            setClaimStatus("claiming")
            claimMutation.mutate(claim)
        }
    }, [claim, isAuthenticated, session?.access_token])

    const handleClaimClick = () => {
        if (!isAuthenticated) {
            // Save current URL to localStorage → redirect to login
            localStorage.setItem(REDIRECT_KEY, window.location.pathname + window.location.search)
            navigate({ to: "/login" })
            return
        }
        if (claim) {
            setClaimStatus("claiming")
            claimMutation.mutate(claim)
        }
    }

    // Note: liveCountdown is used below once quest loads

    const { data: quest, isLoading, error } = useQuery<QuestWithParticipation>({
        queryKey: ["quest", questId, token],
        queryFn: async () => {
            const tokenParam = token ? `?token=${token}` : ""
            const res = await fetch(`${API_BASE}/quests/${questId}${tokenParam}`, {
                headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
            })
            if (!res.ok) throw new Error("Failed to fetch quest")
            return res.json()
        },
        initialData: () => {
            const cached = queryClient.getQueryData<Quest[]>(["quests"])
            return cached?.find(q => q.id === questId) as QuestWithParticipation | undefined
        },
        initialDataUpdatedAt: () => {
            // Use the quests list query's dataUpdatedAt so React Query knows
            // how fresh the initialData is — prevents showing "Loading quest…"
            // when the data is already in cache from the list page
            return queryClient.getQueryState(["quests"])?.dataUpdatedAt
        },
        staleTime: 60_000,
    })

    // ── Claim Reward mutation ──
    const claimRewardMutation = useMutation({
        mutationFn: async (walletAddress: string) => {
            const res = await fetch(`${API_BASE}/quests/${questId}/claim-reward`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({ walletAddress }),
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.message || "Failed to claim reward")
            }
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["quest", questId] })
        },
    })

    const acceptMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`${API_BASE}/quests/${questId}/accept`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({}),
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.message || "Failed to accept quest")
            }
            return res.json()
        },
        onSuccess: (data) => {
            setAcceptMsg("Quest accepted!")
            // Optimistic update: set myParticipation immediately so buttons enable instantly
            queryClient.setQueryData<QuestWithParticipation>(["quest", questId, token], (old) => {
                if (!old) return old
                return {
                    ...old,
                    filledSlots: old.filledSlots + 1,
                    myParticipation: {
                        id: data.participationId,
                        status: "in_progress",
                        payoutWallet: null,
                        payoutStatus: null,
                        payoutAmount: null,
                        payoutTxHash: null,
                        tasksCompleted: 0,
                        tasksTotal: old.tasks?.length ?? 0,
                        proof: null,
                    },
                }
            })
            // Background refetch for full server data
            queryClient.invalidateQueries({ queryKey: ["quest", questId] })
        },
        onError: (e: Error) => {
            // "Already accepted" means participation exists — refetch to get myParticipation
            if (e.message.toLowerCase().includes("already accepted")) {
                setAcceptMsg("Quest accepted!")
                queryClient.invalidateQueries({ queryKey: ["quest", questId] })
            } else {
                setAcceptMsg(e.message)
            }
        },
    })

    const verifyMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`${API_BASE}/quests/${questId}/tasks/verify`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.access_token}`,
                },
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.message || "Verification failed")
            }
            return res.json()
        },
        onSuccess: (data) => {
            // Show per-task errors for failed verifications
            const errors: Record<number, string> = {}
            const newVerified: number[] = []
            for (const r of data.results ?? []) {
                if (r.valid) newVerified.push(r.taskIndex)
                else if (r.error) errors[r.taskIndex] = r.error
            }
            setTaskErrors(errors)
            setVerifyingIndex(null)
            // Optimistic update: merge verified indices immediately
            if (newVerified.length > 0) {
                queryClient.setQueryData<QuestWithParticipation>(["quest", questId, token], (old) => {
                    if (!old?.myParticipation) return old
                    const existing = old.myParticipation.proof?.verifiedIndices ?? []
                    const merged = [...new Set([...existing, ...newVerified])]
                    return {
                        ...old,
                        myParticipation: {
                            ...old.myParticipation,
                            proof: { ...old.myParticipation.proof, verifiedIndices: merged },
                        },
                    }
                })
            }
            // Background refetch for full server data
            queryClient.invalidateQueries({ queryKey: ["quest", questId] })
        },
        onError: (e: Error) => {
            setTaskErrors({ [-1]: e.message })
            setVerifyingIndex(null)
        }
    })

    // Local countdown for quest.expiresAt
    const liveCountdown = useCountdown(quest?.expiresAt ?? null)

    if (isLoading) {
        return (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--fg-muted)" }}>
                Loading quest…
            </div>
        )
    }

    if (error || !quest) {
        return (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--red)" }}>
                Quest not found.
            </div>
        )
    }

    const isLuckyDraw = quest.type === "LUCKY_DRAW"
    const slotsLeft = isLuckyDraw ? Infinity : quest.totalSlots - quest.filledSlots
    const spotsPercent = quest.totalSlots > 0 ? Math.round((quest.filledSlots / quest.totalSlots) * 100) : 0
    const isLive = quest.status === "live"
    const isCompleted = quest.status === "completed"

    return (
        <div style={{ maxWidth: 960 }}>
            {/* Breadcrumb */}
            <div className="breadcrumb">
                <Link to="/quests">Quests</Link>
                <span className="sep">›</span>
                <span>{quest.title}</span>
            </div>

            {/* Claim banner — shown when claim token is in URL */}
            {claim && claimStatus === "idle" && (
                <div className="claim-banner">
                    <div className="claim-banner-text">
                        <strong>🤖 This quest was created by an AI agent.</strong>
                        <span>Claim it to manage, edit, and fund it.</span>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={handleClaimClick}>
                        {isAuthenticated ? "Claim Quest" : "Log in to Claim"}
                    </button>
                </div>
            )}
            {claim && claimStatus === "claiming" && (
                <div className="claim-banner claiming">
                    <span>Claiming quest…</span>
                </div>
            )}
            {claimStatus === "success" && (
                <div className="claim-banner success">
                    <div className="claim-banner-text">
                        <strong>✓ Quest claimed!</strong>
                        <span>You can now edit and fund this quest.</span>
                    </div>
                    <Link to="/dashboard" className="btn btn-primary btn-sm">
                        Go to Dashboard →
                    </Link>
                </div>
            )}
            {claimStatus === "error" && (
                <div className="claim-banner error">
                    <span>{claimError}</span>
                </div>
            )}

            {/* Page header */}
            <div className="page-header" style={{ marginBottom: 20 }}>
                <div>
                    <h1>{quest.title}</h1>
                    <div className="page-header-meta">
                        <span className={`badge ${statusBadgeClass(quest.status)}`}>{quest.status}</span>
                        <span>·</span>
                        <span className={`badge ${typeBadgeClass(quest.type)}`}>{quest.type}</span>
                        <span>·</span>
                        <span className={`badge ${rewardBadgeClass(quest.rewardType)}`}>{quest.rewardType}</span>
                        <span>·</span>
                        <span>by <strong>{quest.sponsor}</strong></span>
                    </div>
                </div>
            </div>

            {/* 2-column grid */}
            <div className="detail-grid">
                {/* ── Left: main content ── */}
                <div className="detail-main">
                    {/* Description */}
                    <div className="description">
                        <div className="section-title">About this Quest</div>
                        <p>{quest.description}</p>
                    </div>

                    {/* Reward grid */}
                    <div className="reward-grid">
                        <div className="reward-item">
                            <div className="reward-item-label">total reward</div>
                            <div className="reward-item-value green mono">
                                {quest.rewardAmount.toLocaleString()} {quest.rewardType}
                            </div>
                        </div>
                        <div className="reward-item">
                            <div className="reward-item-label">total slots</div>
                            <div className="reward-item-value">{quest.totalSlots}</div>
                        </div>
                        <div className="reward-item">
                            <div className="reward-item-label">slots left</div>
                            <div className="reward-item-value" style={{ color: slotsLeft < 5 ? "var(--red)" : "var(--fg)" }}>
                                {slotsLeft}
                            </div>
                        </div>
                        <div className="reward-item">
                            <div className="reward-item-label">questers</div>
                            <div className="reward-item-value">
                                <Link to="/quests/$questId/questers" params={{ questId: quest.id }}>
                                    {quest.questers} →
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Tags */}
                    {quest.tags && quest.tags.length > 0 && (
                        <div style={{ marginBottom: 20, display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {quest.tags.map(tag => (
                                <span key={tag} className="tag">{tag}</span>
                            ))}
                        </div>
                    )}

                    {/* Human Tasks (from quest.tasks) */}
                    {quest.tasks && quest.tasks.length > 0 && (
                        <div className="actor-section human">
                            <div className="actor-section-title">
                                Human Tasks
                                <span className="actor-badge human">HUMAN</span>
                                <span className="hint">Complete these yourself</span>
                            </div>
                            {quest.tasks.map((task: any, idx: number) => {
                                const hasAccepted = !!quest.myParticipation
                                const isVerified = quest.myParticipation?.proof?.verifiedIndices?.includes(idx)
                                const isVerifying = verifyingIndex === idx
                                const isOpened = openedTasks.has(idx)
                                const hasFailed = !!taskErrors[idx]
                                const taskStatus = isVerified ? "done" : isVerifying ? "verifying" : hasFailed ? "failed" : "pending"
                                const btnLabel = getTaskBtnLabel(task.actionType, isOpened && !isVerified)
                                const actionUrl = getTaskActionUrl(task)

                                return (
                                    <div key={idx} className="task-card">
                                        <div className="task-card-row">
                                            <TaskCheck status={taskStatus} />
                                            <span className="task-card-label">{task.label}</span>
                                            <span className="badge badge-social">{platformLabel(task.platform)}</span>
                                            <TaskActionBtn
                                                status={taskStatus}
                                                disabled={!hasAccepted}
                                                label={btnLabel}
                                                onClick={() => {
                                                    if (!hasAccepted) return
                                                    // verify_role: always trigger verify directly
                                                    if (task.actionType === "verify_role") {
                                                        setVerifyingIndex(idx)
                                                        setTaskErrors(prev => { const n = { ...prev }; delete n[idx]; return n })
                                                        verifyMutation.mutate()
                                                        return
                                                    }
                                                    // First click: open external link, mark as opened
                                                    if (!isOpened && actionUrl) {
                                                        window.open(actionUrl, "_blank")
                                                        setOpenedTasks(prev => new Set(prev).add(idx))
                                                        return
                                                    }
                                                    // Second click (Verify): trigger verify all
                                                    setVerifyingIndex(idx)
                                                    setTaskErrors(prev => { const n = { ...prev }; delete n[idx]; return n })
                                                    verifyMutation.mutate()
                                                }}
                                            />
                                        </div>
                                        {hasFailed && (
                                            <div style={{ fontSize: 11, color: "var(--red)", marginTop: 4, paddingLeft: 24 }}>
                                                {taskErrors[idx]}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* Agent Tasks (from quest.requiredSkills) */}
                    {quest.requiredSkills && quest.requiredSkills.length > 0 && (
                        <div className="actor-section agent">
                            <div className="actor-section-title">
                                Agent Tasks
                                <span className="actor-badge agent">AGENT</span>
                                <span className="hint">Your AI agent handles these</span>
                            </div>
                            {quest.requiredSkills.map((skill: string, idx: number) => (
                                <div key={idx} className="task-card">
                                    <div className="task-card-row">
                                        <TaskCheck status="pending" />
                                        <span className="task-card-label">
                                            Requires skill: <code style={{ fontSize: 11, background: "var(--code-bg, #f5f5f5)", padding: "1px 4px", borderRadius: 2 }}>{skill}</code>
                                        </span>
                                        <span className="badge badge-skill">Skill</span>
                                        <TaskActionBtn status="pending" disabled label="Agent" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* No tasks fallback */}
                    {(!quest.tasks || quest.tasks.length === 0) && (!quest.requiredSkills || quest.requiredSkills.length === 0) && (
                        <div style={{ padding: "16px 0", color: "var(--fg-muted)", fontSize: 13 }}>
                            No specific tasks defined for this quest yet.
                        </div>
                    )}

                    {/* Questers avatar crowd */}
                    {quest.questers > 0 && quest.questerDetails && (
                        <div className="social-proof" style={{ marginTop: 20, border: "1px solid var(--border)", borderRadius: 3 }}>
                            <div className="social-proof-header">
                                <span><strong>{quest.questers}</strong> questers joined</span>
                                <Link to="/quests/$questId/questers" params={{ questId: quest.id }}>
                                    view all →
                                </Link>
                            </div>
                            <div className="avatar-crowd">
                                {quest.questerDetails.slice(0, 8).map((d, i) => (
                                    <div key={i} className="avatar-item" style={{ zIndex: 8 - i }}>
                                        <div
                                            className="avatar-fallback"
                                            style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                                        >
                                            {getInitials(d.agentName)}
                                        </div>
                                        <div className="avatar-tip">
                                            <span className="tip-label">Human</span> <span className="tip-human">@{d.humanHandle}</span>
                                            <br />
                                            <span className="tip-label">Agent</span> <span className="tip-agent">{d.agentName}</span>
                                        </div>
                                    </div>
                                ))}
                                {quest.questers > 8 && (
                                    <div className="avatar-more">+{quest.questers - 8}</div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Completed: results table */}
                    {isCompleted && (
                        <div className="results-section">
                            <div className="section-title">Results</div>
                            <p style={{ color: "var(--fg-muted)", fontSize: 13 }}>
                                This quest has ended.{" "}
                                <Link to="/quests/$questId/questers" params={{ questId: quest.id }}>
                                    View all questers and payouts →
                                </Link>
                            </p>
                        </div>
                    )}
                </div>

                {/* ── Right: sidebar ── */}
                <div className="detail-sidebar">
                    <div className="sidebar-box">
                        {/* Reward hero */}
                        <div className="reward-hero">
                            <div className="reward-hero-amount">{quest.rewardAmount.toLocaleString()}</div>
                            <div className="reward-hero-sub">
                                <span className={`badge ${rewardBadgeClass(quest.rewardType)}`}>{quest.rewardType}</span>
                                <span className={`badge ${typeBadgeClass(quest.type)}`}>{quest.type}</span>
                            </div>
                            <div className="reward-hero-label">total reward pool</div>
                        </div>

                        {/* Countdown */}
                        {isLive && quest.expiresAt && (
                            <div className="countdown-bar">
                                <div className="countdown-label">Time remaining</div>
                                <div className="countdown-digits">
                                    <div className="cd-unit">
                                        <span className={`cd-num ${liveCountdown.d === 0 && liveCountdown.h < 6 ? "urgent" : ""}`}>{String(liveCountdown.d).padStart(2, "0")}</span>
                                        <span className="cd-label">d</span>
                                    </div>
                                    <span className="cd-sep">:</span>
                                    <div className="cd-unit">
                                        <span className={`cd-num ${liveCountdown.d === 0 && liveCountdown.h < 6 ? "urgent" : ""}`}>{String(liveCountdown.h).padStart(2, "0")}</span>
                                        <span className="cd-label">h</span>
                                    </div>
                                    <span className="cd-sep">:</span>
                                    <div className="cd-unit">
                                        <span className="cd-num">{String(liveCountdown.m).padStart(2, "0")}</span>
                                        <span className="cd-label">m</span>
                                    </div>
                                    <span className="cd-sep">:</span>
                                    <div className="cd-unit">
                                        <span className="cd-num">{String(liveCountdown.s).padStart(2, "0")}</span>
                                        <span className="cd-label">s</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        {isCompleted && (
                            <div className="countdown-bar" style={{ textAlign: "center" }}>
                                <span className={`badge ${statusBadgeClass("completed")}`} style={{ fontSize: 13, padding: "4px 10px" }}>
                                    Quest Completed
                                </span>
                            </div>
                        )}

                        {/* Spots bar */}
                        <div className="spots-bar">
                            <div className="spots-header">
                                {isLuckyDraw ? (
                                    <>
                                        <span className="spots-label">{quest.filledSlots} entered</span>
                                        <span className="spots-value">{quest.totalSlots} winners drawn</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="spots-label">{quest.filledSlots} / {quest.totalSlots} spots filled</span>
                                        <span className="spots-value" style={{ color: slotsLeft < 5 ? "var(--red)" : "var(--fg)" }}>
                                            {slotsLeft} left
                                        </span>
                                    </>
                                )}
                            </div>
                            {!isLuckyDraw && (
                                <div className="spots-track">
                                    <div
                                        className={`spots-fill ${slotsLeft < 5 ? "hot" : "normal"}`}
                                        style={{ width: `${spotsPercent}%` }}
                                    />
                                </div>
                            )}
                        </div>

                        {/* CTA */}
                        <div className="cta-section">
                            {(() => {
                                const isCreator = isAuthenticated && quest.creatorUserId === user?.id
                                const isFunded = quest.fundingStatus === "confirmed"
                                const isEnded = quest.status === "completed" || quest.status === "expired" || quest.status === "cancelled"

                                // Draft + creator
                                if (quest.status === "draft" && isCreator) {
                                    return (
                                        <>
                                            <Link to="/quests/$questId/edit" params={{ questId: quest.id }}>
                                                <button className="cta-btn primary" style={{ marginBottom: 8 }}>Edit Draft</button>
                                            </Link>
                                            {isFunded ? (
                                                <div style={{
                                                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                                                    padding: "8px 12px", borderRadius: 3,
                                                    background: "var(--green-bg, #ecfdf5)", border: "1px solid var(--green, #10b981)",
                                                    fontSize: 13, fontWeight: 600, color: "var(--green, #10b981)",
                                                }}>
                                                    Funded
                                                </div>
                                            ) : (
                                                <Link to="/quests/$questId/fund" params={{ questId: quest.id }}>
                                                    <button className="cta-btn green">Fund Quest</button>
                                                </Link>
                                            )}
                                        </>
                                    )
                                }

                                // Scheduled + creator
                                if (quest.status === "scheduled" && isCreator) {
                                    return (
                                        <>
                                            <Link to="/quests/$questId/edit" params={{ questId: quest.id }}>
                                                <button className="cta-btn primary" style={{ marginBottom: 8 }}>Edit Quest</button>
                                            </Link>
                                            <Link to="/quests/$questId/manage" params={{ questId: quest.id }}>
                                                <button className="cta-btn secondary">Manage Quest</button>
                                            </Link>
                                        </>
                                    )
                                }

                                // Live + creator
                                if (isLive && isCreator) {
                                    return (
                                        <Link to="/quests/$questId/manage" params={{ questId: quest.id }}>
                                            <button className="cta-btn secondary">Manage Quest</button>
                                        </Link>
                                    )
                                }

                                // Ended states (completed/expired/cancelled)
                                if (isEnded) {
                                    return <button className="cta-btn disabled" disabled>Quest Ended</button>
                                }

                                // Draft + not creator
                                if (quest.status === "draft" && isAuthenticated && !isCreator) {
                                    return null
                                }
                                if (quest.status === "draft" && !isAuthenticated) {
                                    return (
                                        <Link to="/login">
                                            <button className="cta-btn primary">Log in to Edit</button>
                                        </Link>
                                    )
                                }

                                // Live + non-creator + authenticated
                                if (isLive && isAuthenticated) {
                                    // Already accepted — show status
                                    if (quest.myParticipation) {
                                        return (
                                            <div style={{ textAlign: "center", padding: "8px 0" }}>
                                                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--green)", marginBottom: 4 }}>
                                                    Quest Accepted
                                                </div>
                                                <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>
                                                    Status: {quest.myParticipation.status}
                                                </div>
                                            </div>
                                        )
                                    }
                                    return (
                                        <>
                                            <button
                                                className={`cta-btn ${!acceptMutation.isPending && slotsLeft > 0 ? "primary" : "disabled"}`}
                                                disabled={acceptMutation.isPending || slotsLeft <= 0}
                                                onClick={() => acceptMutation.mutate()}
                                            >
                                                {acceptMutation.isPending ? "Accepting..." : slotsLeft <= 0 ? "Quest Full" : "Accept Quest"}
                                            </button>
                                            {acceptMsg && (
                                                <div style={{
                                                    marginTop: 8,
                                                    fontSize: 12,
                                                    color: acceptMsg.includes("accepted") ? "var(--green)" : "var(--red)"
                                                }}>
                                                    {acceptMsg}
                                                </div>
                                            )}
                                        </>
                                    )
                                }

                                // Live + not authenticated
                                if (isLive && !isAuthenticated) {
                                    return (
                                        <Link to="/login">
                                            <button className="cta-btn primary">Log in to Accept Quest</button>
                                        </Link>
                                    )
                                }

                                // Scheduled + non-creator
                                if (quest.status === "scheduled") {
                                    return <button className="cta-btn disabled" disabled>Coming Soon</button>
                                }

                                return null
                            })()}
                        </div>

                        {/* ── Claim Reward Section ── */}
                        {isAuthenticated && quest.fundingMethod === "crypto" && quest.myParticipation &&
                            (quest.myParticipation.status === "completed" || quest.myParticipation.status === "submitted") && (
                                <div className="claim-reward-section" style={{
                                    marginTop: 16,
                                    padding: "16px 0 0",
                                    borderTop: "1px solid var(--border)",
                                }}>
                                    {quest.myParticipation.payoutWallet ? (
                                        // Already claimed
                                        <div style={{ textAlign: "center" }}>
                                            {quest.myParticipation.payoutStatus === "paid" ? (
                                                <>
                                                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--green)", marginBottom: 4 }}>
                                                        Reward Paid
                                                    </div>
                                                    <div style={{ fontSize: 11, color: "var(--fg-muted)", wordBreak: "break-all" }}>
                                                        {quest.myParticipation.payoutAmount} {quest.rewardType} sent to{" "}
                                                        <code style={{ fontSize: 10, background: "var(--code-bg, #f5f5f5)", padding: "1px 4px", borderRadius: 2 }}>
                                                            {quest.myParticipation.payoutWallet.slice(0, 6)}...{quest.myParticipation.payoutWallet.slice(-4)}
                                                        </code>
                                                    </div>
                                                    {quest.myParticipation.payoutTxHash && (
                                                        <a
                                                            href={`https://sepolia.basescan.org/tx/${quest.myParticipation.payoutTxHash}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            style={{ fontSize: 11, color: "var(--accent)" }}
                                                        >
                                                            View transaction
                                                        </a>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)", marginBottom: 4 }}>
                                                        Wallet Submitted
                                                    </div>
                                                    <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>
                                                        Payout incoming to{" "}
                                                        <code style={{ fontSize: 10, background: "var(--code-bg, #f5f5f5)", padding: "1px 4px", borderRadius: 2 }}>
                                                            {quest.myParticipation.payoutWallet.slice(0, 6)}...{quest.myParticipation.payoutWallet.slice(-4)}
                                                        </code>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        // Need to connect wallet and claim
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, textAlign: "center" }}>
                                                Claim Your Reward
                                            </div>
                                            <div style={{ fontSize: 11, color: "var(--fg-muted)", marginBottom: 12, textAlign: "center" }}>
                                                Connect your wallet to receive {quest.rewardType} reward
                                            </div>
                                            <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
                                                <ConnectButton
                                                    showBalance={false}
                                                    chainStatus="icon"
                                                    accountStatus="address"
                                                />
                                            </div>
                                            {isWalletConnected && connectedWallet && (
                                                <button
                                                    className={`cta-btn ${claimRewardMutation.isPending ? "disabled" : "primary"}`}
                                                    disabled={claimRewardMutation.isPending}
                                                    onClick={() => claimRewardMutation.mutate(connectedWallet)}
                                                    style={{ width: "100%", marginTop: 4 }}
                                                >
                                                    {claimRewardMutation.isPending ? "Submitting..." : "Claim Reward"}
                                                </button>
                                            )}
                                            {claimRewardMutation.isSuccess && (
                                                <div style={{ marginTop: 8, fontSize: 12, color: "var(--green)", textAlign: "center" }}>
                                                    Wallet submitted! Payout incoming.
                                                </div>
                                            )}
                                            {claimRewardMutation.isError && (
                                                <div style={{ marginTop: 8, fontSize: 12, color: "var(--red)", textAlign: "center" }}>
                                                    {(claimRewardMutation.error as Error).message}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                    </div>
                </div>
            </div>
        </div>
    )
}
