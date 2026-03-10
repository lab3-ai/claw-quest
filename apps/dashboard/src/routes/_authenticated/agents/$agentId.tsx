import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useAuth } from "@/context/AuthContext"
import { getDiceBearUrl } from "@/components/avatarUtils"
import { PageTitle } from "@/components/page-title"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { TimeLine, CheckCircleLine, CloseLine, WifiLine, AlertLine, Search2Line } from "@mingcute/react"

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Agent {
    id: string
    agentname: string
    status: "idle" | "questing" | "offline"
    platform: string | null
    createdAt: string
    activationCode?: string
    claimedAt?: string
    participations?: Participation[]
}

interface Participation {
    id: string
    status: string
    quest: {
        id: string
        title: string
        rewardAmount: number
        rewardType: string
    }
    tasksCompleted: number
    tasksTotal: number
    payoutAmount: number | null
    payoutStatus: string
}

interface AgentLog {
    id: string
    type: string
    message: string
    meta: Record<string, unknown> | null
    createdAt: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatJoinDate(iso: string): string {
    return new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" }).format(new Date(iso))
}

// ─── API Fetchers ─────────────────────────────────────────────────────────────

async function fetchAgent(agentId: string, session: unknown): Promise<Agent> {
    const headers: HeadersInit = { "Content-Type": "application/json" }
    if (session && typeof session === "object" && "access_token" in session) {
        headers.Authorization = `Bearer ${(session as { access_token: string }).access_token}`
    }
    const res = await fetch(`${API_BASE}/agents/${agentId}`, { headers })
    if (!res.ok) throw new Error(`Failed to fetch agent: ${res.statusText}`)
    return res.json()
}

async function fetchAgentLogs(agentId: string, session: unknown, limit = 50): Promise<AgentLog[]> {
    const headers: HeadersInit = { "Content-Type": "application/json" }
    if (session && typeof session === "object" && "access_token" in session) {
        headers.Authorization = `Bearer ${(session as { access_token: string }).access_token}`
    }
    const res = await fetch(`${API_BASE}/agents/${agentId}/logs?limit=${limit}`, { headers })
    if (!res.ok) {
        if (res.status === 404) return []
        throw new Error(`Failed to fetch logs: ${res.statusText}`)
    }
    return res.json()
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const STATUS_CONFIG = {
    questing: { label: "Questing", variant: "outline" as const, className: "border-accent/40 bg-accent-light text-accent", icon: WifiLine },
    idle: { label: "Idle", variant: "outline-muted" as const, className: "", icon: TimeLine },
    offline: { label: "Offline", variant: "filled-muted" as const, className: "", icon: CloseLine },
}

function StatusBadge({ status }: { status: Agent["status"] }) {
    const config = STATUS_CONFIG[status]
    const Icon = config.icon
    return (
        <Badge variant={config.variant} className={config.className}>
            <Icon size={14} />
            {config.label}
        </Badge>
    )
}

function AgentHeader({ agent }: { agent: Agent }) {
    const avatarUrl = getDiceBearUrl(agent.agentname)
    return (
        <div className="flex items-start gap-4 p-5 border border-border-muted bg-card hover:bg-background transition-colors">
            <img
                src={avatarUrl}
                alt={agent.agentname}
                className="w-16 h-16 rounded-full border-2 border-border shrink-0"
                loading="lazy"
            />
            <div className="flex-1 min-w-0">
                <h2 className="text-xl font-semibold text-foreground truncate">{agent.agentname}</h2>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <StatusBadge status={agent.status} />
                    {agent.platform && (
                        <Badge variant="pill">{agent.platform}</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                        Joined {formatJoinDate(agent.createdAt)}
                    </span>
                </div>
            </div>
        </div>
    )
}

function ActiveQuestCard({ participation }: { participation: Participation }) {
    const progress = participation.tasksTotal > 0
        ? (participation.tasksCompleted / participation.tasksTotal) * 100
        : 0

    return (
        <div className="p-5 border border-accent-border bg-accent-light">
            <h3 className="text-sm font-semibold text-foreground mb-3">Active Quest</h3>
            <Link
                to="/quests/$questId"
                params={{ questId: participation.quest.id }}
                className="text-sm font-medium text-link hover:underline"
            >
                {participation.quest.title}
            </Link>
            <p className="text-xs text-fg-secondary mt-1">
                Reward: {participation.quest.rewardAmount} {participation.quest.rewardType}
            </p>
            <div className="mt-3">
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                        className="h-full bg-accent rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                    {participation.tasksCompleted} / {participation.tasksTotal} tasks
                </p>
            </div>
        </div>
    )
}

function StatItem({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="flex justify-between items-center py-2.5 border-b border-border last:border-b-0">
            <span className="text-xs text-fg-secondary">{label}</span>
            <span className="text-sm font-semibold text-foreground">{value}</span>
        </div>
    )
}

function AgentStatsPanel({ agent }: { agent: Agent }) {
    const participations = agent.participations || []
    const completed = participations.filter(p => p.status === "completed")
    const active = participations.filter(p => p.status === "in_progress")
    const totalEarned = completed.reduce((sum, p) => sum + (p.payoutAmount || 0), 0)

    return (
        <div className="p-5 border border-border-muted bg-card hover:bg-background transition-colors sticky top-6">
            <h3 className="text-sm font-semibold text-foreground mb-3">Stats</h3>
            <StatItem label="Quests Completed" value={completed.length} />
            <StatItem label="Total Earned" value={`$${totalEarned.toFixed(2)}`} />
            <StatItem label="Active Quests" value={active.length} />
        </div>
    )
}

function ActivityLog({ logs }: { logs: AgentLog[] }) {
    return (
        <div className="p-5 border border-border-muted bg-card hover:bg-background transition-colors">
            <h3 className="text-sm font-semibold text-foreground mb-3">Activity Log</h3>
            {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No activity yet</p>
            ) : (
                <div className="flex flex-col gap-3">
                    {logs.map((log) => (
                        <div key={log.id} className="flex gap-2.5 items-start">
                            <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" aria-hidden="true" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-foreground leading-relaxed">{log.message}</p>
                                <span className="text-xs text-muted-foreground">
                                    {new Date(log.createdAt).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

function QuestHistory({ participations }: { participations: Participation[] }) {
    const completed = participations.filter(p => p.status === "completed")
    if (completed.length === 0) return null

    return (
        <div className="p-5 border border-border-muted bg-card hover:bg-background transition-colors">
            <h3 className="text-sm font-semibold text-foreground mb-3">Quest History</h3>
            <div className="flex flex-col gap-2">
                {completed.map((p) => (
                    <Link
                        key={p.id}
                        to="/quests/$questId"
                        params={{ questId: p.quest.id }}
                        className="flex items-center justify-between py-2.5 px-3 border border-border hover:bg-muted/50 transition-colors"
                    >
                        <div className="flex items-center gap-2 min-w-0">
                            <CheckCircleLine size={16} className="text-success shrink-0" />
                            <span className="text-sm text-foreground truncate">{p.quest.title}</span>
                        </div>
                        <span className="text-xs font-medium text-success shrink-0 ml-2">
                            +{p.payoutAmount ?? 0} {p.quest.rewardType}
                        </span>
                    </Link>
                ))}
            </div>
        </div>
    )
}

function EmptyQuestsState() {
    return (
        <div className="p-5 border border-border-muted bg-card text-center py-12">
            <Search2Line size={48} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-semibold text-foreground">No quests yet</p>
            <p className="text-xs text-fg-secondary mt-1 max-w-[45ch] mx-auto">
                This agent hasn't participated in any quests. Browse available quests to get started.
            </p>
            <Link to="/quests">
                <Button variant="outline" className="mt-4">Browse Quests</Button>
            </Link>
        </div>
    )
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function AgentDetailSkeleton() {
    return (
        <div aria-busy="true">
            <Skeleton className="h-8 w-48 mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-6">
                <div className="flex flex-col gap-6">
                    <Skeleton className="h-24" />
                    <Skeleton className="h-40" />
                </div>
                <Skeleton className="h-48" />
            </div>
        </div>
    )
}

// ─── Error state ──────────────────────────────────────────────────────────────

function AgentErrorState({ onRetry }: { onRetry: () => void }) {
    return (
        <div>
            <PageTitle title="Agent Details" />
            <div className="text-center py-12">
                <AlertLine size={48} className="mx-auto text-error mb-3" />
                <p className="text-sm font-semibold text-foreground">Something went wrong</p>
                <p className="text-xs text-fg-secondary mt-1">Failed to load agent details</p>
                <Button variant="outline" className="mt-4" onClick={onRetry}>Retry</Button>
            </div>
        </div>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface AgentDetailProps {
    agentId: string
}

export function AgentDetail({ agentId }: AgentDetailProps) {
    const { session } = useAuth()
    const queryClient = useQueryClient()

    const { data: agent, isLoading: agentLoading, error: agentError } = useQuery({
        queryKey: ["agent", agentId],
        queryFn: () => fetchAgent(agentId, session),
        enabled: !!session,
    })

    const { data: logs = [] } = useQuery({
        queryKey: ["agentLogs", agentId],
        queryFn: () => fetchAgentLogs(agentId, session),
        enabled: !!session && !!agent,
    })

    if (agentLoading) return <AgentDetailSkeleton />

    if (agentError || !agent) {
        return (
            <AgentErrorState
                onRetry={() => queryClient.invalidateQueries({ queryKey: ["agent", agentId] })}
            />
        )
    }

    const activeParticipations = agent.participations?.filter(p => p.status === "in_progress") || []
    const hasAnyParticipation = (agent.participations?.length ?? 0) > 0
    const activeQuest = activeParticipations[0]

    return (
        <div>
            <PageTitle title={agent.agentname} />

            <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-6 mt-4">
                {/* Main content */}
                <div className="flex flex-col gap-4">
                    <AgentHeader agent={agent} />
                    {activeQuest && <ActiveQuestCard participation={activeQuest} />}
                    {hasAnyParticipation ? (
                        <QuestHistory participations={agent.participations || []} />
                    ) : (
                        <EmptyQuestsState />
                    )}
                    <ActivityLog logs={logs} />
                </div>

                {/* Sidebar */}
                <aside className="md:order-last order-first">
                    <AgentStatsPanel agent={agent} />
                </aside>
            </div>
        </div>
    )
}
