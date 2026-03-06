import { useState, useEffect, useRef } from "react"
import { useParams, useSearch, Link, useNavigate } from "@tanstack/react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { Quest } from "@clawquest/shared"
import { useAuth } from "@/context/AuthContext"
import { getDiceBearUrl } from "@/components/avatarUtils"
import { SponsorLogo } from "@/components/sponsor-logo"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useAccount } from "wagmi"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

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
    if (status === "done") return <span className="w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center text-xs bg-success border-success text-primary-foreground">✓</span>
    if (status === "verifying") return <span className="w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center text-xs bg-warning-light border-warning">↻</span>
    return <span className="w-5 h-5 rounded-full border-2 border-input shrink-0 flex items-center justify-center text-xs"></span>
}

/** Check if user has the required linked account for a task platform */
function getMissingAccountWarning(task: any, profile: any): string | null {
    if (!profile) return null
    if (task.platform === "x" && !profile.xId) return "Link your X account in Settings to verify"
    if (task.platform === "x" && profile.xId && !profile.hasXToken) return "Grant X verification access in Settings"
    if (task.platform === "discord" && !profile.discordId) return "Link your Discord account in Settings to verify"
    if (task.platform === "telegram" && !profile.telegramId) return "Link your Telegram account in Settings to verify"
    return null
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
    if (status === "done") return <Button size="sm" variant="outline" disabled className="bg-accent-light text-accent border-green-600 cursor-default">Done ✓</Button>
    if (status === "verifying") return <Button size="sm" variant="outline" disabled className="bg-(--agent-bg) text-(--agent-fg) border-(--agent-border) cursor-default">Checking…</Button>
    if (status === "failed") return <Button size="sm" onClick={onClick} className="border-error">Retry →</Button>
    if (disabled) return (
        <Button size="sm" disabled title="Accept quest first" className="opacity-40 cursor-not-allowed">{label} →</Button>
    )
    return <Button size="sm" onClick={onClick}>{label} →</Button>
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
    isCreator?: boolean
    isSponsor?: boolean
}

// ─── Component ───────────────────────────────────────────────────────────────

export function QuestDetail() {
    const { questId } = useParams({ from: "/_app/quests/$questId" })
    const { token, claim } = useSearch({ from: "/_app/quests/$questId" })
    const { isAuthenticated, session } = useAuth()
    const queryClient = useQueryClient()
    const navigate = useNavigate()
    const [acceptMsg, setAcceptMsg] = useState<string | null>(null)
    const [claimStatus, setClaimStatus] = useState<"idle" | "claiming" | "success" | "error">("idle")
    const [claimError, setClaimError] = useState("")
    const [verifyingIndex, setVerifyingIndex] = useState<number | null>(null)
    const [openedTasks, setOpenedTasks] = useState<Set<number>>(new Set())
    const [taskErrors, setTaskErrors] = useState<Record<number, string>>({})
    const [proofUrls, setProofUrls] = useState<Record<number, string>>({})
    const claimAttempted = useRef(false)
    const { address: connectedWallet, isConnected: isWalletConnected } = useAccount()

    // Fetch user profile for linked-account checks (xId, hasXToken, discordId, telegramId)
    const { data: meProfile } = useQuery({
        queryKey: ["auth", "me"],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/auth/me`, {
                headers: { Authorization: `Bearer ${session?.access_token}` },
            })
            if (!res.ok) return null
            return res.json()
        },
        enabled: isAuthenticated && !!session?.access_token,
        staleTime: 60_000,
    })

    // Fetch Stripe connect status for USD quest banner
    const { data: stripeStatus } = useQuery<{ hasAccount: boolean; isOnboarded: boolean }>({
        queryKey: ["stripe-connect-status"],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/stripe/connect/status`, {
                headers: { Authorization: `Bearer ${session?.access_token}` },
            })
            if (!res.ok) return { hasAccount: false, isOnboarded: false }
            return res.json()
        },
        enabled: isAuthenticated && !!session?.access_token,
        staleTime: 60_000,
    })

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
            const filteredProofs = Object.fromEntries(
                Object.entries(proofUrls).filter(([, v]) => v.trim())
            )
            const hasProofs = Object.keys(filteredProofs).length > 0
            const res = await fetch(`${API_BASE}/quests/${questId}/tasks/verify`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.access_token}`,
                },
                body: hasProofs ? JSON.stringify({ proofUrls: filteredProofs }) : undefined,
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
            <div className="p-10 text-center text-muted-foreground">
                Loading quest…
            </div>
        )
    }

    if (error || !quest) {
        return (
            <div className="p-10 text-center text-error">
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
        <div className="">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 py-3 text-xs text-muted-foreground">
                <Link to="/quests">Quests</Link>
                <span>›</span>
                <span>{quest.title}</span>
            </nav>

            {/* Claim banner — shown when claim token is in URL */}
            {claim && claimStatus === "idle" && (
                <div className="flex items-center justify-between gap-3 px-4 py-3 rounded mb-4 border border-accent bg-accent-light max-sm:flex-col max-sm:items-stretch max-sm:text-center">
                    <div className="flex flex-col gap-0.5 text-sm">
                        <strong className="text-foreground">🤖 This quest was created by an AI agent.</strong>
                        <span className="text-xs text-muted-foreground">Claim it to manage, edit, and fund it.</span>
                    </div>
                    <Button size="sm" onClick={handleClaimClick}>
                        {isAuthenticated ? "Claim Quest" : "Log in to Claim"}
                    </Button>
                </div>
            )}
            {claim && claimStatus === "claiming" && (
                <div className="flex justify-center text-muted-foreground text-sm px-4 py-3 rounded mb-4 border border-border bg-muted">
                    <span>Claiming quest…</span>
                </div>
            )}
            {claimStatus === "success" && (
                <div className="flex items-center justify-between gap-3 px-4 py-3 rounded mb-4 border border-green-600 bg-accent-light max-sm:flex-col max-sm:items-stretch max-sm:text-center">
                    <div className="flex flex-col gap-0.5 text-sm">
                        <strong className="text-accent">✓ Quest claimed!</strong>
                        <span className="text-xs text-muted-foreground">You can now edit and fund this quest.</span>
                    </div>
                    <Button asChild size="sm">
                        <Link to="/dashboard">Go to Dashboard →</Link>
                    </Button>
                </div>
            )}
            {claimStatus === "error" && (
                <div className="flex items-center px-4 py-3 rounded mb-4 border border-error bg-error-light text-error text-sm">
                    <span>{claimError}</span>
                </div>
            )}

            {/* Page header */}
            <div className="flex justify-between items-end py-5 pb-3 border-b border-border mb-5">
                <div>
                    <h1 className="text-3xl font-semibold text-foreground">{quest.title}</h1>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                        <Badge variant={statusBadgeClass(quest.status).replace("badge-", "") as any}>{quest.status}</Badge>
                        <span>·</span>
                        <Badge variant={typeBadgeClass(quest.type).replace("badge-", "") as any}>{quest.type}</Badge>
                        <span>·</span>
                        <Badge variant={rewardBadgeClass(quest.rewardType).replace("badge-", "") as any}>{quest.rewardType}</Badge>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1">by <SponsorLogo sponsor={quest.sponsor} size={14} /> <strong className="text-foreground">{quest.sponsor}</strong></span>
                        {quest.sponsorNames && quest.sponsorNames.length > 0 && (
                            <>
                                <span>·</span>
                                <span className="text-fg-muted">Sponsored by {quest.sponsorNames.join(', ')}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* 2-column grid */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-8 items-start">
                {/* ── Left: main content ── */}
                <div>
                    {/* Description */}
                    <div className="py-3.5 border-b border-border mb-5 text-sm leading-relaxed text-foreground">
                        <div className="text-sm font-semibold text-foreground pb-2 border-b border-border mb-3.5">About this Quest</div>
                        <p>{quest.description}</p>
                    </div>

                    {/* Reward grid */}
                    <div className="grid grid-cols-2 gap-2.5 mb-2.5">
                        <div className="px-3 py-2.5 border border-border rounded bg-muted">
                            <div className="text-xs text-muted-foreground mb-0.5">total reward</div>
                            <div className="text-sm font-semibold text-accent font-mono">
                                {quest.rewardAmount.toLocaleString()} {quest.rewardType}
                            </div>
                        </div>
                        <div className="px-3 py-2.5 border border-border rounded bg-muted">
                            <div className="text-xs text-muted-foreground mb-0.5">total slots</div>
                            <div className="text-sm font-semibold text-foreground">{quest.totalSlots}</div>
                        </div>
                        <div className="px-3 py-2.5 border border-border rounded bg-muted">
                            <div className="text-xs text-muted-foreground mb-0.5">slots left</div>
                            <div className={cn("text-sm font-semibold", slotsLeft < 5 ? "text-error" : "text-foreground")}>
                                {slotsLeft}
                            </div>
                        </div>
                        <div className="px-3 py-2.5 border border-border rounded bg-muted">
                            <div className="text-xs text-muted-foreground mb-0.5">questers</div>
                            <div className="text-sm font-semibold text-foreground">
                                <Link to="/quests/$questId/questers" params={{ questId: quest.id }}>
                                    {quest.questers} →
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Tags */}
                    {quest.tags && quest.tags.length > 0 && (
                        <div className="mb-5 flex gap-1.5 flex-wrap">
                            {quest.tags.map(tag => (
                                <span key={tag} className="tag">{tag}</span>
                            ))}
                        </div>
                    )}

                    {/* Human Tasks (from quest.tasks) */}
                    {quest.tasks && quest.tasks.length > 0 && (
                        <div className="mb-6 pl-3.5 border-l-4 border-l-(--human-fg)">
                            <div className="flex items-center gap-2 text-sm font-semibold mb-2.5">
                                Human Tasks
                                <span className="text-xs font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-(--human-bg) text-(--human-fg)">HUMAN</span>
                                <span className="font-normal text-xs text-muted-foreground ml-auto">Complete these yourself</span>
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
                                    <div key={idx} className="border border-border rounded mb-2.5 overflow-hidden last:mb-0">
                                        <div className="flex items-center gap-2.5 px-3 py-2.5 text-xs">
                                            <TaskCheck status={taskStatus} />
                                            <span className="flex-1 font-medium">{task.label}</span>
                                            <Badge variant="social">{platformLabel(task.platform)}</Badge>
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
                                        {/* Proof URL input for post/quote_post */}
                                        {(task.actionType === "post" || task.actionType === "quote_post") && hasAccepted && !isVerified && (
                                            <div className="pt-1 pl-6">
                                                <input
                                                    type="url"
                                                    className="w-full px-2 py-1.5 text-xs border border-border rounded bg-background text-foreground focus:border-accent focus:outline-hidden"
                                                    placeholder="Paste your tweet URL here..."
                                                    value={proofUrls[idx] || ""}
                                                    onChange={(e) => setProofUrls(prev => ({ ...prev, [idx]: e.target.value }))}
                                                />
                                            </div>
                                        )}
                                        {/* Proactive warning when account not linked */}
                                        {hasAccepted && !isVerified && !hasFailed && (() => {
                                            const warning = getMissingAccountWarning(task, meProfile)
                                            if (!warning) return null
                                            const needsXGrant = task.platform === "x" && meProfile?.xId && !meProfile?.hasXToken
                                            return (
                                                <div className="text-xs text-muted-foreground mt-1 pl-6">
                                                    ⚠ {warning}
                                                    {needsXGrant ? (
                                                        <> — <button className="bg-transparent border-none text-primary cursor-pointer p-0 text-xs underline"
                                                            onClick={async () => {
                                                                try {
                                                                    const res = await fetch(`${API_BASE}/auth/x/authorize`, {
                                                                        headers: { Authorization: `Bearer ${session?.access_token}` },
                                                                    })
                                                                    const data = await res.json()
                                                                    if (data.url) {
                                                                        sessionStorage.setItem("x_oauth_state", data.state)
                                                                        sessionStorage.setItem("x_oauth_code_verifier", data.codeVerifier)
                                                                        window.location.href = data.url
                                                                    }
                                                                } catch { /* noop */ }
                                                            }}>Grant X access</button></>
                                                    ) : (
                                                        <> — <Link to="/account" className="text-primary">Go to Settings</Link></>
                                                    )}
                                                </div>
                                            )
                                        })()}
                                        {hasFailed && (
                                            <div className="text-xs text-error mt-1 pl-6">
                                                {taskErrors[idx]}
                                                {taskErrors[idx]?.includes("re-link") && (
                                                    <> — <Link to="/account" className="text-primary">Go to Settings</Link></>
                                                )}
                                                {taskErrors[idx]?.includes("Link your") && (
                                                    <> — <Link to="/account" className="text-primary">Go to Settings</Link></>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* Agent Tasks (from quest.requiredSkills) */}
                    {quest.requiredSkills && quest.requiredSkills.length > 0 && (
                        <div className="mb-6 pl-3.5 border-l-4 border-l-(--agent-fg)">
                            <div className="flex items-center gap-2 text-sm font-semibold mb-2.5">
                                Agent Tasks
                                <span className="text-xs font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-(--agent-bg) text-(--agent-fg)">AGENT</span>
                                <span className="font-normal text-xs text-muted-foreground ml-auto">Your AI agent handles these</span>
                            </div>
                            {quest.requiredSkills.map((skill: string, idx: number) => (
                                <div key={idx} className="border border-border rounded mb-2.5 overflow-hidden last:mb-0">
                                    <div className="flex items-center gap-2.5 px-3 py-2.5 text-xs">
                                        <TaskCheck status="pending" />
                                        <span className="flex-1 font-medium">
                                            Requires skill: <code className="font-mono text-xs bg-muted px-1 py-px rounded">{skill}</code>
                                        </span>
                                        <Badge variant="skill">Skill</Badge>
                                        <TaskActionBtn status="pending" disabled label="Agent" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* No tasks fallback */}
                    {(!quest.tasks || quest.tasks.length === 0) && (!quest.requiredSkills || quest.requiredSkills.length === 0) && (
                        <div className="py-4 text-muted-foreground text-sm">
                            No specific tasks defined for this quest yet.
                        </div>
                    )}

                    {/* Questers avatar crowd */}
                    {quest.questers > 0 && quest.questerDetails && (
                        <div className="mt-5 border border-border rounded px-3 py-2.5">
                            <div className="flex justify-between items-center text-xs text-muted-foreground mb-2">
                                <span><strong className="text-foreground">{quest.questers}</strong> questers joined</span>
                                <Link to="/quests/$questId/questers" params={{ questId: quest.id }}>
                                    view all →
                                </Link>
                            </div>
                            <div className="flex items-center pl-1">
                                {quest.questerDetails.slice(0, 8).map((d, i) => (
                                    <div
                                        key={i}
                                        className="relative w-7 h-7 -ml-2 first:ml-0 rounded-full border-2 border-background cursor-pointer overflow-visible shrink-0 hover:-translate-y-0.5 transition-transform group/avatar"
                                        style={{ zIndex: 8 - i }}
                                    >
                                        <img
                                            src={getDiceBearUrl(d.agentName, 56)}
                                            alt={d.humanHandle}
                                            className="w-full h-full rounded-full"
                                        />
                                        <div className="hidden group-hover/avatar:block absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 bg-foreground text-white text-xs px-2.5 py-2 rounded whitespace-nowrap z-100 pointer-events-none leading-relaxed min-w-[120px] text-left after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-[5px] after:border-transparent after:border-t-foreground">
                                            <span className="text-surface-dark-muted text-xs">Human</span> <span className="font-semibold text-white">@{d.humanHandle}</span>
                                            <br />
                                            <span className="text-surface-dark-muted text-xs">Agent</span> <span className="font-semibold text-(--agent-border) font-mono text-xs">{d.agentName}</span>
                                        </div>
                                    </div>
                                ))}
                                {quest.questers > 8 && (
                                    <div className="w-7 h-7 -ml-2 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground cursor-pointer shrink-0 hover:bg-accent/10 hover:text-accent-foreground">
                                        +{quest.questers - 8}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Completed: results table */}
                    {isCompleted && (
                        <div className="mt-6 pt-5 border-t-2 border-border">
                            <div className="text-sm font-semibold text-foreground pb-2 border-b border-border mb-3.5">Results</div>
                            <p className="text-muted-foreground text-sm">
                                This quest has ended.{" "}
                                <Link to="/quests/$questId/questers" params={{ questId: quest.id }}>
                                    View all questers and payouts →
                                </Link>
                            </p>
                        </div>
                    )}
                </div>

                {/* ── Right: sidebar ── */}
                <div>
                    <div className="border border-border rounded mb-3.5 sticky top-[55px]">
                        {/* Reward hero */}
                        <div className="px-3 py-4 text-center border-b border-border">
                            <div className="text-[28px] font-bold font-mono text-accent leading-tight">{quest.rewardAmount.toLocaleString()}</div>
                            <div className="flex justify-center gap-2 mt-2 text-xs">
                                <Badge variant={rewardBadgeClass(quest.rewardType).replace("badge-", "") as any}>{quest.rewardType}</Badge>
                                <Badge variant={typeBadgeClass(quest.type).replace("badge-", "") as any}>{quest.type}</Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">total reward pool</div>
                        </div>

                        {/* Countdown */}
                        {isLive && quest.expiresAt && (
                            <div className="px-3 py-2.5 border-b border-border text-center">
                                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Time remaining</div>
                                <div className="flex justify-center gap-1 font-mono">
                                    <div className="flex flex-col items-center min-w-[40px]">
                                        <span className={cn("text-xl font-bold leading-tight", liveCountdown.d === 0 && liveCountdown.h < 6 ? "text-error" : "text-foreground")}>{String(liveCountdown.d).padStart(2, "0")}</span>
                                        <span className="text-xs text-muted-foreground uppercase tracking-wide">d</span>
                                    </div>
                                    <span className="text-lg text-input pt-0.5">:</span>
                                    <div className="flex flex-col items-center min-w-[40px]">
                                        <span className={cn("text-xl font-bold leading-tight", liveCountdown.d === 0 && liveCountdown.h < 6 ? "text-error" : "text-foreground")}>{String(liveCountdown.h).padStart(2, "0")}</span>
                                        <span className="text-xs text-muted-foreground uppercase tracking-wide">h</span>
                                    </div>
                                    <span className="text-lg text-input pt-0.5">:</span>
                                    <div className="flex flex-col items-center min-w-[40px]">
                                        <span className="text-xl font-bold text-foreground leading-tight">{String(liveCountdown.m).padStart(2, "0")}</span>
                                        <span className="text-xs text-muted-foreground uppercase tracking-wide">m</span>
                                    </div>
                                    <span className="text-lg text-input pt-0.5">:</span>
                                    <div className="flex flex-col items-center min-w-[40px]">
                                        <span className="text-xl font-bold text-foreground leading-tight">{String(liveCountdown.s).padStart(2, "0")}</span>
                                        <span className="text-xs text-muted-foreground uppercase tracking-wide">s</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        {isCompleted && (
                            <div className="px-3 py-2.5 border-b border-border text-center">
                                <Badge variant="completed" className="text-base px-[10px] py-1">
                                    Quest Completed
                                </Badge>
                            </div>
                        )}

                        {/* Spots bar */}
                        <div className="px-3 py-2.5 border-b border-border">
                            <div className="flex justify-between text-xs mb-1">
                                {isLuckyDraw ? (
                                    <>
                                        <span className="text-muted-foreground font-semibold">{quest.filledSlots} entered</span>
                                        <span className="font-mono font-bold">{quest.totalSlots} winners drawn</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-muted-foreground font-semibold">{quest.filledSlots} / {quest.totalSlots} spots filled</span>
                                        <span className={cn("font-mono font-bold", slotsLeft < 5 ? "text-error" : "text-foreground")}>
                                            {slotsLeft} left
                                        </span>
                                    </>
                                )}
                            </div>
                            {!isLuckyDraw && (
                                <div className="h-1.5 bg-muted rounded overflow-hidden">
                                    <div
                                        className={cn("h-full rounded transition-[width] duration-300", slotsLeft < 5 ? "bg-red-600" : "bg-accent")}
                                        style={{ width: `${spotsPercent}%` }}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Stripe setup banner for USD quests */}
                        {isAuthenticated && !stripeStatus?.isOnboarded &&
                            (quest.fundingMethod === "stripe" || quest.rewardType === "USD") && (
                            <div className="px-3 pt-3">
                                <div className="flex items-start gap-2 rounded-md bg-warning/10 border border-warning/30 px-3 py-2 text-xs text-warning-foreground">
                                    <span className="shrink-0 mt-0.5">⚠</span>
                                    <span>
                                        This quest pays in USD. Set up your Stripe account to receive rewards.{" "}
                                        <Link to="/stripe-connect" className="font-semibold underline">Set up Stripe &rarr;</Link>
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* CTA */}
                        <div className="p-3 border-b border-border">
                            {(() => {
                                const isCreator = isAuthenticated && !!quest.isCreator
                                const isSponsor = isAuthenticated && !!quest.isSponsor
                                const isOwnerOrSponsor = isCreator || isSponsor
                                const isFunded = quest.fundingStatus === "confirmed"
                                const isEnded = quest.status === "completed" || quest.status === "expired" || quest.status === "cancelled"

                                // Draft + owner/sponsor
                                if (quest.status === "draft" && isOwnerOrSponsor) {
                                    return (
                                        <>
                                            <Link to="/quests/$questId/edit" params={{ questId: quest.id }}>
                                                <Button className="w-full mb-2">Edit Draft</Button>
                                            </Link>
                                            {isFunded ? (
                                                <div className="flex items-center justify-center gap-1.5 px-3 py-2 rounded bg-accent-light border border-green-600 text-sm font-semibold text-accent">
                                                    Funded
                                                </div>
                                            ) : (
                                                <Link to="/quests/$questId/fund" params={{ questId: quest.id }}>
                                                    <Button className="w-full bg-success hover:bg-success/90 border-success">Fund Quest</Button>
                                                </Link>
                                            )}
                                        </>
                                    )
                                }

                                // Scheduled + owner/partner
                                if (quest.status === "scheduled" && isOwnerOrSponsor) {
                                    return (
                                        <>
                                            <Link to="/quests/$questId/edit" params={{ questId: quest.id }}>
                                                <Button className="w-full mb-2">Edit Quest</Button>
                                            </Link>
                                            {isCreator && (
                                                <Link to="/quests/$questId/manage" params={{ questId: quest.id }}>
                                                    <Button variant="secondary" className="w-full">Manage Quest</Button>
                                                </Link>
                                            )}
                                        </>
                                    )
                                }

                                // Live + owner/partner
                                if (isLive && isOwnerOrSponsor) {
                                    return (
                                        <>
                                            {isCreator && (
                                                <Link to="/quests/$questId/manage" params={{ questId: quest.id }}>
                                                    <Button variant="secondary" className="w-full mb-2">Manage Quest</Button>
                                                </Link>
                                            )}
                                            {!isFunded && (
                                                <Link to="/quests/$questId/fund" params={{ questId: quest.id }}>
                                                    <Button className="w-full bg-success hover:bg-success/90 border-success">Fund Quest</Button>
                                                </Link>
                                            )}
                                        </>
                                    )
                                }

                                // Ended states (completed/expired/cancelled)
                                if (isEnded) {
                                    return <Button variant="secondary" className="w-full" disabled>Quest Ended</Button>
                                }

                                // Draft + not owner/sponsor
                                if (quest.status === "draft" && isAuthenticated && !isOwnerOrSponsor) {
                                    return null
                                }
                                if (quest.status === "draft" && !isAuthenticated) {
                                    return (
                                        <Link to="/login">
                                            <Button className="w-full">Log in to Edit</Button>
                                        </Link>
                                    )
                                }

                                // Live + non-creator + authenticated
                                if (isLive && isAuthenticated) {
                                    // Already accepted — show status
                                    if (quest.myParticipation) {
                                        return (
                                            <div className="text-center py-2">
                                                <div className="text-sm font-semibold text-accent mb-1">
                                                    Quest Accepted
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    Status: {quest.myParticipation.status}
                                                </div>
                                            </div>
                                        )
                                    }
                                    return (
                                        <>
                                            <Button
                                                className="w-full"
                                                variant={!acceptMutation.isPending && slotsLeft > 0 ? "default" : "secondary"}
                                                disabled={acceptMutation.isPending || slotsLeft <= 0}
                                                onClick={() => acceptMutation.mutate()}
                                            >
                                                {acceptMutation.isPending ? "Accepting..." : slotsLeft <= 0 ? "Quest Full" : "Accept Quest"}
                                            </Button>
                                            {acceptMsg && (
                                                <div className={cn("mt-2 text-xs", acceptMsg.includes("accepted") ? "text-accent" : "text-error")}>
                                                    {acceptMsg}
                                                </div>
                                            )}
                                        </>
                                    )
                                }

                                // Live + not authenticated
                                if (isLive && !isAuthenticated) {
                                    return (
                                        <Button
                                            className="w-full"
                                            onClick={() => {
                                                localStorage.setItem(REDIRECT_KEY, window.location.pathname + window.location.search)
                                                navigate({ to: "/login" })
                                            }}
                                        >
                                            Log in to Accept Quest
                                        </Button>
                                    )
                                }

                                // Scheduled + non-creator
                                if (quest.status === "scheduled") {
                                    return <Button variant="secondary" className="w-full" disabled>Coming Soon</Button>
                                }

                                return null
                            })()}
                        </div>

                        {/* ── Claim Reward Section ── */}
                        {isAuthenticated && quest.fundingMethod === "crypto" && quest.myParticipation &&
                            (quest.myParticipation.status === "completed" || quest.myParticipation.status === "submitted") && (
                                <div className="mt-4 px-3 pt-4 border-t border-border">
                                    {quest.myParticipation.payoutWallet ? (
                                        // Already claimed
                                        <div className="text-center">
                                            {quest.myParticipation.payoutStatus === "paid" ? (
                                                <>
                                                    <div className="text-sm font-semibold text-accent mb-1">
                                                        Reward Paid
                                                    </div>
                                                    <div className="text-xs text-muted-foreground break-all">
                                                        {quest.myParticipation.payoutAmount} {quest.rewardType} sent to{" "}
                                                        <code className="font-mono text-xs bg-muted px-1 py-px rounded">
                                                            {quest.myParticipation.payoutWallet.slice(0, 6)}...{quest.myParticipation.payoutWallet.slice(-4)}
                                                        </code>
                                                    </div>
                                                    {quest.myParticipation.payoutTxHash && (
                                                        <a
                                                            href={`https://sepolia.basescan.org/tx/${quest.myParticipation.payoutTxHash}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs text-accent"
                                                        >
                                                            View transaction
                                                        </a>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    <div className="text-sm font-semibold text-foreground mb-1">
                                                        Wallet Submitted
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        Payout incoming to{" "}
                                                        <code className="font-mono text-xs bg-muted px-1 py-px rounded">
                                                            {quest.myParticipation.payoutWallet.slice(0, 6)}...{quest.myParticipation.payoutWallet.slice(-4)}
                                                        </code>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        // Need to connect wallet and claim
                                        <div>
                                            <div className="text-sm font-semibold text-center mb-2">
                                                Claim Your Reward
                                            </div>
                                            <div className="text-xs text-muted-foreground text-center mb-3">
                                                Connect your wallet to receive {quest.rewardType} reward
                                            </div>
                                            <div className="flex justify-center mb-2.5">
                                                <ConnectButton
                                                    showBalance={false}
                                                    chainStatus="icon"
                                                    accountStatus="address"
                                                />
                                            </div>
                                            {isWalletConnected && connectedWallet && (
                                                <Button
                                                    className="w-full mt-1"
                                                    variant={claimRewardMutation.isPending ? "secondary" : "default"}
                                                    disabled={claimRewardMutation.isPending}
                                                    onClick={() => claimRewardMutation.mutate(connectedWallet)}
                                                >
                                                    {claimRewardMutation.isPending ? "Submitting..." : "Claim Reward"}
                                                </Button>
                                            )}
                                            {claimRewardMutation.isSuccess && (
                                                <div className="mt-2 text-xs text-accent text-center">
                                                    Wallet submitted! Payout incoming.
                                                </div>
                                            )}
                                            {claimRewardMutation.isError && (
                                                <div className="mt-2 text-xs text-error text-center">
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
