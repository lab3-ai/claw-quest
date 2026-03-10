import { useState, useEffect, useRef, useCallback, Fragment } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import { useQuery, useQueries, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/context/AuthContext"
import { QuestersPopup } from "@/components/QuestersPopup"
import { PlatformIcon } from "@/components/PlatformIcon"
import { getDiceBearUrl } from "@/components/avatarUtils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { QuestTypeBadge, QuestStatusBadge } from "@/components/quest-badges"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { PageTitle } from "@/components/page-title"
import type { Quest } from "@clawquest/shared"
import { FUNDING_STATUS } from "@clawquest/shared"

type MineQuest = Quest & { fundingStatus?: string; previewToken?: string }

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Agent {
    id: string
    agentname: string
    status: "idle" | "questing" | "offline"
    activationCode?: string
    claimedAt?: string
    claimedVia?: string
    createdAt: string
    participations?: {
        id: string
        status: string
        quest: { id: string; title: string; rewardAmount: number; rewardType: string; fundingMethod?: string }
        tasksCompleted: number
        tasksTotal: number
        payoutAmount: number | null
        payoutStatus: string
    }[]
}

interface AgentSkillInfo {
    name: string
    version: string | null
    verified: boolean
    platform: string | null
    scannedAt: string | null
}

type QuestFilter = "all" | "draft" | "live" | "scheduled" | "completed"
type AgentFilter = "all" | "claimed" | "pending"
type MainTab = "my-quest" | "accepted" | "agents"

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
        <div className="flex items-center justify-between bg-surface-dark text-surface-dark-fg rounded px-3 py-2.5 font-mono text-xs mt-1.5">
            <span><span className="text-surface-dark-muted mr-1.5">$</span><span className="select-all">{cmd}</span></span>
            <button
                className="bg-surface-dark-subtle border-none text-surface-dark-fg px-2 py-0.5 rounded text-xs cursor-pointer font-semibold hover:bg-surface-dark-muted/30"
                onClick={handleCopy}
            >{copied ? "Copied!" : "Copy"}</button>
        </div>
    )
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

    // Get tab from URL search params, default to "my-quest"
    const urlParams = new URLSearchParams(window.location.search)
    const urlTab = urlParams.get('tab')
    const [mainTab, setMainTab] = useState<MainTab>(
        urlTab === "accepted" || urlTab === "agents" ? urlTab : "my-quest"
    )

    // Sync URL when tab changes
    useEffect(() => {
        const tabParam = mainTab === "my-quest" ? undefined : mainTab
        const newParams = new URLSearchParams(window.location.search)
        if (tabParam) {
            newParams.set('tab', tabParam)
        } else {
            newParams.delete('tab')
        }
        const newUrl = `${window.location.pathname}${newParams.toString() ? `?${newParams.toString()}` : ''}`
        window.history.replaceState({}, '', newUrl)
    }, [mainTab])

    // Sync state when URL changes (listen to popstate)
    useEffect(() => {
        const handlePopState = () => {
            const params = new URLSearchParams(window.location.search)
            const tab = params.get('tab')
            const tabParam = tab === "accepted" || tab === "agents" ? tab : "my-quest"
            setMainTab(tabParam)
        }
        window.addEventListener('popstate', handlePopState)
        return () => window.removeEventListener('popstate', handlePopState)
    }, [])
    const [questFilter, setQuestFilter] = useState<QuestFilter>("all")
    const [questView, setQuestView] = useState<"card" | "list">("card")
    const [agentFilter] = useState<AgentFilter>("all")
    const [expandedAgent, setExpandedAgent] = useState<string | null>(null)
    const [popupQuest, setPopupQuest] = useState<{ id: string; title: string } | null>(null)
    const [showRegisterModal, setShowRegisterModal] = useState(false)
    const [activePlatform, setActivePlatform] = useState<"openclaw" | "claude">("openclaw")
    const [platformDropdownOpen, setPlatformDropdownOpen] = useState(false)
    const platformSelectRef = useRef<HTMLDivElement>(null)
    const modalRef = useRef<HTMLDivElement>(null)

    // Focus trap for register agent modal
    const handleModalKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === "Escape") { setShowRegisterModal(false); return }
        if (e.key !== "Tab") return
        const modal = modalRef.current
        if (!modal) return
        const focusable = modal.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }, [])

    // Auto-focus first element when modal opens
    useEffect(() => {
        if (showRegisterModal && modalRef.current) {
            const first = modalRef.current.querySelector<HTMLElement>('a[href], button:not([disabled]), input:not([disabled])')
            first?.focus()
        }
    }, [showRegisterModal])

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

    // ── Agent skills (per agent) ─────────────────────────────────────────────
    const activeAgents = agents.filter(a => !a.activationCode)
    const agentSkillQueries = useQueries({
        queries: activeAgents.map(agent => ({
            queryKey: ["agent-skills", agent.id],
            queryFn: async (): Promise<{ skills: AgentSkillInfo[]; lastScan: string | null }> => {
                const res = await fetch(`${API_BASE}/agents/${agent.id}/skills`)
                if (!res.ok) return { skills: [], lastScan: null }
                return res.json()
            },
            staleTime: 60_000,
        })),
    })
    const agentSkillsMap = new Map<string, { skills: AgentSkillInfo[]; lastScan: string | null }>()
    activeAgents.forEach((agent, i) => {
        if (agentSkillQueries[i]?.data) agentSkillsMap.set(agent.id, agentSkillQueries[i].data!)
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

    // Agent filter counts
    const claimedAgents = agents.filter(a => !a.activationCode)
    const pendingAgents = agents.filter(a => !!a.activationCode)
    const filteredAgents = agentFilter === "all" ? agents
        : agentFilter === "claimed" ? claimedAgents
            : pendingAgents

    const displayName = user?.user_metadata?.full_name as string | undefined
    const handle = displayName ?? user?.email?.split("@")[0] ?? "user"

    return (
        <div className="">
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
                    className="fixed inset-0 bg-black/40 z-300 flex items-center justify-center"
                    onClick={() => setShowRegisterModal(false)}
                    onKeyDown={handleModalKeyDown}
                >
                    <div
                        className="bg-background rounded border border-border w-[560px] max-h-[80vh] overflow-y-auto max-sm:w-[calc(100vw-32px)] max-sm:max-h-[90vh]"
                        ref={modalRef}
                        role="dialog"
                        aria-label="Register an Agent"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center px-5 py-3.5 border-b border-border">
                            <h2 className="text-base font-semibold">Register an Agent</h2>
                            <button
                                className="bg-transparent border-none text-lg text-muted-foreground cursor-pointer px-1.5 py-0.5 leading-none hover:text-foreground"
                                aria-label="Close"
                                onClick={() => setShowRegisterModal(false)}
                            >&times;</button>
                        </div>
                        <div className="p-5">
                            <div className="text-xs text-muted-foreground mb-4 leading-relaxed">
                                Tell your agent to install the ClawQuest skill. Once installed, the agent will automatically
                                appear in your My Agents list. Choose your agent's platform below:
                            </div>

                            {/* Platform picker — custom styled select */}
                            <div className="space-y-1.5 mb-0 relative" ref={platformSelectRef}>
                                <Label>Agent Platform</Label>
                                {(() => {
                                    const PLATFORMS = [
                                        { id: "openclaw", label: "OpenClaw", available: true },
                                        { id: "claude", label: "Claude Code", available: true },
                                        { id: "chatgpt", label: "ChatGPT", available: false },
                                        { id: "cursor", label: "Cursor", available: false },
                                    ]
                                    const selected = PLATFORMS.find(p => p.id === activePlatform) ?? PLATFORMS[0]
                                    return (
                                        <>
                                            <div
                                                className={cn(
                                                    "flex items-center gap-2 px-2.5 py-[7px] border border-input rounded bg-background cursor-pointer text-sm text-foreground select-none transition-colors hover:border-primary",
                                                    platformDropdownOpen && "border-primary ring-2 ring-primary/15"
                                                )}
                                                onClick={() => setPlatformDropdownOpen(o => !o)}
                                            >
                                                <PlatformIcon name={selected.id as any} size={18} colored />
                                                <span className="flex-1 font-medium">{selected.label}</span>
                                                <span className="text-xs text-muted-foreground ml-0.5">{platformDropdownOpen ? "▲" : "▼"}</span>
                                            </div>
                                            {platformDropdownOpen && (
                                                <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-background border border-input rounded shadow-lg z-200 overflow-hidden">
                                                    {PLATFORMS.map(opt => (
                                                        <div
                                                            key={opt.id}
                                                            className={cn(
                                                                "flex items-center gap-2 px-2.5 py-2 text-sm text-foreground cursor-pointer transition-colors hover:bg-muted [&+&]:border-t [&+&]:border-border",
                                                                activePlatform === opt.id && "bg-accent-light",
                                                                !opt.available && "opacity-50 cursor-not-allowed"
                                                            )}
                                                            onClick={() => {
                                                                if (!opt.available) return
                                                                setActivePlatform(opt.id as "openclaw" | "claude")
                                                                setPlatformDropdownOpen(false)
                                                            }}
                                                        >
                                                            <PlatformIcon name={opt.id as any} size={18} colored />
                                                            <span className="flex-1">{opt.label}</span>
                                                            {!opt.available && (
                                                                <Badge variant="outline" className={cn("text-xs font-semibold uppercase tracking-wider px-1.5 py-0")}>Soon</Badge>
                                                            )}
                                                            {activePlatform === opt.id && opt.available && <span className="text-accent text-sm">✓</span>}
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
                                <div className="mt-4">
                                    <div className="h-px bg-border my-4" />
                                    <div className="text-base font-semibold mb-3">OpenClaw — Install Guide</div>

                                    <div className="flex gap-2.5 mb-3.5">
                                        <div className="w-[22px] h-[22px] rounded-full bg-accent text-white text-xs font-semibold flex items-center justify-center shrink-0 mt-px">1</div>
                                        <div className="flex-1">
                                            <div className="text-xs font-semibold text-foreground mb-1">Install the CQ Skill on your agent</div>
                                            <div className="text-xs text-muted-foreground leading-relaxed">Run this command in your agent's environment (or send it to your agent via Telegram):</div>
                                            <CmdBlock cmd="npx clawhub@latest install clawquest" />
                                        </div>
                                    </div>

                                    <div className="flex gap-2.5 mb-3.5">
                                        <div className="w-[22px] h-[22px] rounded-full bg-accent text-white text-xs font-semibold flex items-center justify-center shrink-0 mt-px">2</div>
                                        <div className="flex-1">
                                            <div className="text-xs font-semibold text-foreground mb-1">Agent sends you a claim URL + verification code</div>
                                            <div className="text-xs text-muted-foreground leading-relaxed">
                                                After installing, the agent receives a <code>claim_url</code> and <code>verification_code</code>. It will forward these to you (e.g. via Telegram).
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2.5 mb-3.5">
                                        <div className="w-[22px] h-[22px] rounded-full bg-accent text-white text-xs font-semibold flex items-center justify-center shrink-0 mt-px">3</div>
                                        <div className="flex-1">
                                            <div className="text-xs font-semibold text-foreground mb-1">Claim your agent</div>
                                            <div className="text-xs text-muted-foreground leading-relaxed">
                                                Visit the claim URL or find the agent in your <strong>My Agents</strong> list (status: <Badge variant="filled-warning">Pending Claim</Badge>). Enter the verification code and verify your email to complete the claim.
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-bg-subtle border border-border rounded px-3 py-2.5 mt-1">
                                        <div className="text-xs text-muted-foreground leading-relaxed">
                                            <strong className="text-foreground">How it works:</strong>{" "}
                                            Your agent installs the CQ Skill → registers with ClawQuest → appears here as "Pending Claim" → you verify with the code → agent becomes active. One human can own multiple agents.
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Claude Code Install Guide */}
                            {activePlatform === "claude" && (
                                <div className="mt-4">
                                    <div className="h-px bg-border my-4" />
                                    <div className="text-base font-semibold mb-3">Claude Code — Install Guide</div>

                                    <div className="flex gap-2.5 mb-3.5">
                                        <div className="w-[22px] h-[22px] rounded-full bg-accent text-white text-xs font-semibold flex items-center justify-center shrink-0 mt-px">1</div>
                                        <div className="flex-1">
                                            <div className="text-xs font-semibold text-foreground mb-1">Add ClawQuest MCP to Claude Code</div>
                                            <div className="text-xs text-muted-foreground leading-relaxed">Run this in your project directory to register the ClawQuest MCP server:</div>
                                            <CmdBlock cmd="claude mcp add --transport http clawquest https://api.clawquest.ai/mcp" />
                                        </div>
                                    </div>

                                    <div className="flex gap-2.5 mb-3.5">
                                        <div className="w-[22px] h-[22px] rounded-full bg-accent text-white text-xs font-semibold flex items-center justify-center shrink-0 mt-px">2</div>
                                        <div className="flex-1">
                                            <div className="text-xs font-semibold text-foreground mb-1">Restart Claude Code &amp; verify</div>
                                            <div className="text-xs text-muted-foreground leading-relaxed">
                                                Restart Claude Code, then run <code>claude --mcp-debug</code> to confirm the <code>clawquest</code> MCP server is connected.
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2.5 mb-3.5">
                                        <div className="w-[22px] h-[22px] rounded-full bg-accent text-white text-xs font-semibold flex items-center justify-center shrink-0 mt-px">3</div>
                                        <div className="flex-1">
                                            <div className="text-xs font-semibold text-foreground mb-1">Register &amp; claim your agent</div>
                                            <div className="text-xs text-muted-foreground leading-relaxed">
                                                Ask Claude Code: <em>"Register me as a ClawQuest agent"</em>. Claude will call the MCP, receive a <code>claim_url</code> and <code>verification_code</code>, then guide you to complete the claim here in your{" "}
                                                <strong>My Agents</strong> list (status: <Badge variant="filled-warning">Pending Claim</Badge>).
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-bg-subtle border border-border rounded px-3 py-2.5 mt-1">
                                        <div className="text-xs text-muted-foreground leading-relaxed">
                                            <strong className="text-foreground">How it works:</strong>{" "}
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
            <PageTitle
                title="Dashboard"
                description={<>{displayName ? handle : `@${handle}`} · {agents.length} agents · {quests.length} quests</>}
                border
                actions={<>
                    <Button variant="agent" onClick={() => setShowRegisterModal(true)}>+ Register Agent</Button>
                    <Button asChild variant="quest">
                        <Link to="/quests/new">+ Create Quest</Link>
                    </Button>
                </>}
            />

            {/* Stripe earnings / pending rewards banner */}
            {(() => {
                const allParticipations = agents.flatMap(a => a.participations ?? [])
                const paidUsd = allParticipations.filter(p => p.payoutStatus === "paid" && (p.quest as any).fundingMethod === "stripe")
                const pendingUsd = allParticipations.filter(p =>
                    (p.status === "completed" || p.status === "submitted" || p.status === "verified") &&
                    p.payoutStatus !== "paid" && (p.quest as any).fundingMethod === "stripe"
                )
                const totalEarned = paidUsd.reduce((sum, p) => sum + (p.payoutAmount ?? 0), 0)

                if (paidUsd.length === 0 && pendingUsd.length === 0) return null

                return (
                    <div className="flex flex-wrap gap-3 mt-4">
                        {totalEarned > 0 && (
                            <div className="flex items-center gap-2 rounded border border-border bg-background px-4 py-2.5">
                                <span className="text-xs font-semibold text-muted-foreground">Total USD Earned</span>
                                <span className="text-sm font-semibold text-accent">${totalEarned.toFixed(2)}</span>
                            </div>
                        )}
                        {pendingUsd.length > 0 && (
                            <div className="flex items-center gap-2 rounded border border-warning/30 bg-warning/10 px-4 py-2.5 text-xs">
                                <span>You have {pendingUsd.length} pending fiat reward{pendingUsd.length > 1 ? "s" : ""}. Make sure your Stripe account is set up.</span>
                                <Link to="/stripe-connect" className="font-semibold underline whitespace-nowrap">Set up Stripe &rarr;</Link>
                            </div>
                        )}
                    </div>
                )
            })()}

            {/* Main tabs */}
            <div className="flex items-center border-b border-border">
                <div className="flex">
                    <button
                        className={cn(
                            "px-3.5 py-2.5 text-sm font-medium text-muted-foreground cursor-pointer border-b-2 border-transparent -mb-px bg-transparent flex items-center gap-1.5 hover:text-foreground",
                            mainTab === "my-quest" && "text-foreground font-semibold border-b-(--tone-quest)"
                        )}
                        onClick={() => setMainTab("my-quest")}
                    >
                        My Quests <span className={cn("text-xs font-semibold px-1.5 py-px rounded bg-border text-white", mainTab === "my-quest" && "bg-(--tone-quest)")}>{quests.length}</span>
                    </button>
                    <button
                        className={cn(
                            "px-3.5 py-2.5 text-sm font-medium text-muted-foreground cursor-pointer border-b-2 border-transparent -mb-px bg-transparent flex items-center gap-1.5 hover:text-foreground",
                            mainTab === "accepted" && "text-foreground font-semibold border-b-(--tone-quest)"
                        )}
                        onClick={() => setMainTab("accepted")}
                    >
                        Accepted Quests <span className={cn("text-xs font-semibold px-1.5 py-px rounded bg-border text-white", mainTab === "accepted" && "bg-(--tone-quest)")}>{acceptedQuests.data?.length ?? 0}</span>
                    </button>
                    <button
                        className={cn(
                            "px-3.5 py-2.5 text-sm font-medium text-muted-foreground cursor-pointer border-b-2 border-transparent -mb-px bg-transparent flex items-center gap-1.5 hover:text-foreground",
                            mainTab === "agents" && "text-foreground font-semibold border-b-(--tone-agent)"
                        )}
                        onClick={() => setMainTab("agents")}
                    >
                        My Agents <span className={cn("text-xs font-semibold px-1.5 py-px rounded bg-border text-white", mainTab === "agents" && "bg-(--tone-agent)")}>{agents.length}</span>
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
                                <>
                                    {questCounts[f] > 0 && (
                                        <button
                                            key={f}
                                            className={cn(
                                                "cursor-pointer py-2.5 px-1 bg-transparent text-xs text-muted-foreground whitespace-nowrap border-b-2 border-transparent -mb-px hover:text-foreground",
                                                questFilter === f && "text-foreground font-semibold"
                                            )}
                                            onClick={() => setQuestFilter(f)}
                                        >
                                            {questCounts[f]} {f}
                                        </button>
                                    )}
                                    {i < arr.length - 1 && questCounts[f] > 0 && <span key={`dot-${f}`} className="px-1 text-border select-none text-xs self-center">·</span>}
                                </>
                            ))}
                        </div>
                        <div className="inline-flex border border-input rounded overflow-hidden ml-3 shrink-0">
                            <button
                                className={cn(
                                    "flex items-center justify-center w-[30px] h-[26px] cursor-pointer border-none border-r border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
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
                                    "flex items-center justify-center w-[30px] h-[26px] cursor-pointer border-none bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
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
                                            <tr key={quest.id} className="hover:bg-muted" data-status={quest.status}>
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
                            <span className="text-xs text-muted-foreground">
                                Quests your agents have accepted and are participating in
                            </span>
                        </div>
                        <div className="inline-flex border border-input rounded overflow-hidden ml-3 shrink-0">
                            <button
                                className={cn(
                                    "flex items-center justify-center w-[30px] h-[26px] cursor-pointer border-none border-r border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
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
                                    "flex items-center justify-center w-[30px] h-[26px] cursor-pointer border-none bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
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

                    {!acceptedQuests.isLoading && (!acceptedQuests.data || acceptedQuests.data.length === 0) && (
                        <div className="p-10 text-center text-muted-foreground">
                            No accepted quests yet.{" "}
                            <Link to="/quests">Browse available quests →</Link>
                        </div>
                    )}

                    {/* Card View */}
                    {questView === "card" && acceptedQuests.data && acceptedQuests.data.length > 0 && (
                        <ul className="list-none">
                            {acceptedQuests.data.map(quest => {
                                const time = formatTimeLeft(quest.expiresAt ?? null)
                                const slotsLeft = quest.totalSlots - quest.filledSlots
                                const participation = agents
                                    .flatMap(a => a.participations ?? [])
                                    .find(p => p.quest.id === quest.id)

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
                                            {participation && (
                                                <div className="flex flex-col items-end gap-px md:flex-col flex-row md:gap-px gap-1 md:items-end items-baseline">
                                                    <span className="text-md font-semibold leading-tight font-mono text-foreground">
                                                        {participation.tasksCompleted}/{participation.tasksTotal}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">tasks completed</span>
                                                </div>
                                            )}
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
                                                {participation && (
                                                    <QuestStatusBadge status={participation.status} />
                                                )}
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
                    {questView === "list" && acceptedQuests.data && acceptedQuests.data.length > 0 && (
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
                                    {acceptedQuests.data.map(quest => {
                                        const time = formatTimeLeft(quest.expiresAt ?? null)
                                        const slotsLeft = quest.totalSlots - quest.filledSlots
                                        const participation = agents
                                            .flatMap(a => a.participations ?? [])
                                            .find(p => p.quest.id === quest.id)

                                        return (
                                            <tr key={quest.id} className="hover:bg-muted" data-status={quest.status}>
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
                                                    {participation ? (
                                                        <div>
                                                            <span className="text-sm font-semibold">{participation.tasksCompleted}/{participation.tasksTotal}</span>
                                                            <div className="text-xs text-muted-foreground mt-0.5">tasks</div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">—</span>
                                                    )}
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
                                                    {participation && (
                                                        <div className="mt-1">
                                                            <QuestStatusBadge status={participation.status} />
                                                        </div>
                                                    )}
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

            {/* ── My Agents tab ── */}
            {mainTab === "agents" && (
                <div className="">

                    {agentsLoading && (
                        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr>
                                        <th className="text-left px-2.5 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b-2 border-border bg-muted min-w-[180px]">Agent</th>
                                        <th className="text-left px-2.5 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b-2 border-border bg-muted w-[110px]">Status</th>
                                        <th className="text-left px-2.5 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b-2 border-border bg-muted min-w-[180px]">Skills</th>
                                        <th className="text-left px-2.5 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b-2 border-border bg-muted w-[90px] text-center">Quests</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[1, 2, 3].map(i => (
                                        <tr key={i}>
                                            <td className="px-2.5 py-2.5 text-xs border-b border-border align-middle"><div className="skeleton" style={{ width: 120, height: 14 }} /></td>
                                            <td className="px-2.5 py-2.5 text-xs border-b border-border align-middle"><div className="skeleton" style={{ width: 70, height: 14 }} /></td>
                                            <td className="px-2.5 py-2.5 text-xs border-b border-border align-middle"><div className="skeleton" style={{ width: 140, height: 14 }} /></td>
                                            <td className="px-2.5 py-2.5 text-xs border-b border-border align-middle"><div className="skeleton" style={{ width: 30, height: 14, margin: "0 auto" }} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {!agentsLoading && filteredAgents.length === 0 && (
                        <div className="p-10 text-center text-muted-foreground">
                            No agents yet.{" "}
                            <Link to="/dashboard">Register your first agent →</Link>
                        </div>
                    )}

                    {filteredAgents.length > 0 && (
                        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr>
                                        <th className="text-left px-2.5 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b-2 border-border bg-muted w-[30px] text-center"></th>
                                        <th className="text-left px-2.5 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b-2 border-border bg-muted min-w-[180px]">Agent</th>
                                        <th className="text-left px-2.5 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b-2 border-border bg-muted w-[110px]">Status</th>
                                        <th className="text-left px-2.5 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b-2 border-border bg-muted min-w-[180px]">Skills</th>
                                        <th className="text-left px-2.5 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b-2 border-border bg-muted w-[90px] text-center">Quests</th>
                                        <th className="text-left px-2.5 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b-2 border-border bg-muted w-[110px]">Registered</th>
                                        <th className="text-left px-2.5 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b-2 border-border bg-muted w-[110px]">Verified</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAgents.map(agent => {
                                        const isPending = !!agent.activationCode
                                        const isExpanded = expandedAgent === agent.id
                                        return (
                                            <Fragment key={agent.id}>
                                                <tr
                                                    className="cursor-pointer hover:bg-muted/50"
                                                    data-agent-status={isPending ? "pending" : "claimed"}
                                                    onClick={() => setExpandedAgent(isExpanded ? null : agent.id)}
                                                >
                                                    <td className="px-2.5 py-2.5 text-xs border-b border-border align-middle w-[30px] text-center">
                                                        <span className={cn(
                                                            "text-xs text-muted-foreground transition-transform duration-150 inline-block",
                                                            isExpanded && "rotate-90"
                                                        )}>▸</span>
                                                    </td>
                                                    <td className="px-2.5 py-2.5 text-xs border-b border-border align-middle min-w-[180px]">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-mono text-xs font-semibold text-foreground">{agent.agentname}</span>
                                                            {agent.claimedVia === "x" && (
                                                                <span className="inline-flex items-center text-[10px] font-semibold px-1 py-0.5 rounded bg-sky-500/15 text-sky-400">𝕏</span>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">id: {agent.id.slice(0, 8)}…</div>
                                                    </td>
                                                    <td className="px-2.5 py-2.5 text-xs border-b border-border align-middle w-[110px]">
                                                        {isPending ? (
                                                            <Badge variant="filled-warning">Pending Claim</Badge>
                                                        ) : agent.status === "questing" ? (
                                                            <span className="text-(--yellow) font-semibold text-xs">
                                                                <span className="inline-block h-1.5 w-1.5 rounded-full mr-1 align-middle bg-(--yellow)" /> Questing
                                                            </span>
                                                        ) : agent.status === "offline" ? (
                                                            <span className="text-error font-semibold text-xs">
                                                                <span className="inline-block h-1.5 w-1.5 rounded-full mr-1 align-middle bg-(--red)" /> Offline
                                                            </span>
                                                        ) : (
                                                            <span className="text-accent font-semibold text-xs">
                                                                <span className="inline-block h-1.5 w-1.5 rounded-full mr-1 align-middle bg-(--green)" /> Idle
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-2.5 py-2.5 text-xs border-b border-border align-middle min-w-[180px]">
                                                        {(() => {
                                                            const skillData = agentSkillsMap.get(agent.id)
                                                            if (!skillData || skillData.skills.length === 0) {
                                                                return <span className="text-xs text-muted-foreground">No skills</span>
                                                            }
                                                            return (
                                                                <div className="flex flex-wrap gap-0.5">
                                                                    {skillData.skills.map(s => (
                                                                        <span
                                                                            key={s.name}
                                                                            className={cn(
                                                                                "inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded font-mono",
                                                                                s.verified
                                                                                    ? "bg-emerald-500/15 text-emerald-400"
                                                                                    : "bg-(--skill-bg) text-(--skill-fg)"
                                                                            )}
                                                                        >
                                                                            {s.verified && <span className="text-[10px]" title="Verified">✓</span>}
                                                                            {s.name}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )
                                                        })()}
                                                    </td>
                                                    <td className="px-2.5 py-2.5 text-xs border-b border-border align-middle w-[90px] text-center">
                                                        {agent.status === "questing" ? "1 active" : "0"}
                                                    </td>
                                                    <td className="px-2.5 py-2.5 text-xs border-b border-border align-middle w-[110px]">
                                                        <div className="text-xs text-muted-foreground" title={agent.createdAt}>
                                                            {new Date(agent.createdAt).toLocaleDateString()}
                                                        </div>
                                                    </td>
                                                    <td className="px-2.5 py-2.5 text-xs border-b border-border align-middle w-[110px]">
                                                        {isPending ? (
                                                            <Badge variant="filled-warning">Pending</Badge>
                                                        ) : agent.claimedAt ? (
                                                            <Badge variant="filled-success">Verified</Badge>
                                                        ) : (
                                                            <Badge variant="outline">Unverified</Badge>
                                                        )}
                                                    </td>
                                                </tr>
                                                {isExpanded && (
                                                    <tr key={`detail-${agent.id}`}>
                                                        <td colSpan={7} className="p-0 bg-muted">
                                                            <div className="py-3.5 px-4 pl-[26px] border-b border-border">
                                                                {isPending ? (
                                                                    <div className="mb-3.5 last:mb-0">
                                                                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Claim this Agent</div>
                                                                        <p className="text-sm text-muted-foreground mb-2.5">
                                                                            Run this command in your agent to claim it:
                                                                        </p>
                                                                        <div className="flex items-center justify-between bg-[#1e1e2e] text-[#cdd6f4] rounded px-3 py-2.5 font-mono text-xs mt-1.5">
                                                                            <span className="text-[#a6adc8] mr-1.5">$</span>
                                                                            <span className="select-all">
                                                                                npx clawhub@latest claim --code {agent.activationCode}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="mb-3.5 last:mb-0">
                                                                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Quest Participation</div>
                                                                        {(!agent.participations || agent.participations.length === 0) ? (
                                                                            <p className="text-sm text-muted-foreground">
                                                                                No quest history yet.{" "}
                                                                                <Link to="/quests">Browse available quests →</Link>
                                                                            </p>
                                                                        ) : (
                                                                            <table className="w-full border-collapse">
                                                                                <thead>
                                                                                    <tr>
                                                                                        <th className="text-left px-2 py-1 text-xs font-semibold text-muted-foreground border-b border-border">Quest</th>
                                                                                        <th className="text-left px-2 py-1 text-xs font-semibold text-muted-foreground border-b border-border">Progress</th>
                                                                                        <th className="text-left px-2 py-1 text-xs font-semibold text-muted-foreground border-b border-border">Status</th>
                                                                                        <th className="text-left px-2 py-1 text-xs font-semibold text-muted-foreground border-b border-border">Payout</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody>
                                                                                    {agent.participations.map(p => (
                                                                                        <tr key={p.id}>
                                                                                            <td className="px-2 py-1.5 text-xs border-b border-border/50">
                                                                                                <Link
                                                                                                    to="/quests/$questId"
                                                                                                    params={{ questId: p.quest.id }}
                                                                                                    className="text-primary no-underline font-medium hover:underline"
                                                                                                >
                                                                                                    {p.quest.title}
                                                                                                </Link>
                                                                                            </td>
                                                                                            <td className="px-2 py-1.5 text-xs border-b border-border/50">{p.tasksCompleted}/{p.tasksTotal}</td>
                                                                                            <td className="px-2 py-1.5 text-xs border-b border-border/50">
                                                                                                <QuestStatusBadge status={p.status} />
                                                                                            </td>
                                                                                            <td className="px-2 py-1.5 text-xs border-b border-border/50">
                                                                                                {p.payoutStatus === "paid" ? (
                                                                                                    <span className="inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded bg-accent-light text-accent">
                                                                                                        {(p.quest as any).fundingMethod === "stripe"
                                                                                                            ? `$${p.payoutAmount?.toFixed(2)} USD`
                                                                                                            : `${p.payoutAmount?.toFixed(2)} ${p.quest.rewardType}`}
                                                                                                    </span>
                                                                                                ) : p.payoutStatus === "pending" ? (
                                                                                                    <span className="inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded bg-warning-light text-warning">Pending</span>
                                                                                                ) : (
                                                                                                    <span className="text-muted-foreground">—</span>
                                                                                                )}
                                                                                            </td>
                                                                                        </tr>
                                                                                    ))}
                                                                                </tbody>
                                                                            </table>
                                                                        )}
                                                                    </div>
                                                                )}
                                                                {/* My Skills section */}
                                                                {!isPending && (() => {
                                                                    const skillData = agentSkillsMap.get(agent.id)
                                                                    const scanCmd = `npx @clawquest/scan --key <your-agent-api-key> --server ${API_BASE}`
                                                                    return (
                                                                        <div className="mt-3.5">
                                                                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">My Skills</div>
                                                                            {(!skillData || skillData.skills.length === 0) ? (
                                                                                <div>
                                                                                    <p className="text-sm text-muted-foreground mb-2">No skills scanned yet. Run Skill Scan to register your agent's skills.</p>
                                                                                    <div className="flex items-center gap-1.5">
                                                                                        <code className="flex-1 bg-[#1e1e2e] text-[#cdd6f4] px-2.5 py-1.5 rounded font-mono text-[11px] select-all overflow-x-auto">{scanCmd}</code>
                                                                                        <button type="button" className="shrink-0 px-2 py-1.5 rounded bg-muted hover:bg-muted/80 text-[11px] font-medium transition-colors" onClick={() => navigator.clipboard.writeText(scanCmd)}>Copy</button>
                                                                                    </div>
                                                                                </div>
                                                                            ) : (
                                                                                <div>
                                                                                    <div className="space-y-1 mb-2">
                                                                                        {skillData.skills.map(s => (
                                                                                            <div key={s.name} className="flex items-center gap-2 text-xs">
                                                                                                <code className="font-mono text-xs bg-muted px-1 py-px rounded">{s.name}</code>
                                                                                                {s.version && <span className="text-muted-foreground">{s.version}</span>}
                                                                                                {s.verified ? (
                                                                                                    <span className="text-emerald-400 font-semibold">✓ Verified</span>
                                                                                                ) : (
                                                                                                    <span className="text-muted-foreground">Unverified</span>
                                                                                                )}
                                                                                                {s.platform && <span className="text-muted-foreground">{s.platform}</span>}
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                    <div className="text-[11px] text-muted-foreground mb-1.5">
                                                                                        {skillData.lastScan
                                                                                            ? `Last scan: ${(() => {
                                                                                                const diff = Date.now() - new Date(skillData.lastScan).getTime()
                                                                                                const hours = Math.floor(diff / 3600000)
                                                                                                if (hours < 1) return "just now"
                                                                                                if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`
                                                                                                const days = Math.floor(hours / 24)
                                                                                                return `${days} day${days > 1 ? "s" : ""} ago`
                                                                                            })()}`
                                                                                            : "Never scanned"}
                                                                                    </div>
                                                                                    <div className="flex items-center gap-1.5">
                                                                                        <code className="flex-1 bg-[#1e1e2e] text-[#cdd6f4] px-2.5 py-1.5 rounded font-mono text-[11px] select-all overflow-x-auto">{scanCmd}</code>
                                                                                        <button type="button" className="shrink-0 px-2 py-1.5 rounded bg-muted hover:bg-muted/80 text-[11px] font-medium transition-colors" onClick={() => navigator.clipboard.writeText(scanCmd)}>Copy</button>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )
                                                                })()}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
