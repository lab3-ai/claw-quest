import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/context/AuthContext"
import { getDiceBearUrl } from "@/components/avatarUtils"
import { PageTitle } from "@/components/page-title"
import "./agentDetail.css"

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

interface AgentStats {
    questsCompleted: number
    totalEarned: number
    activeQuestCount: number
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
        if (res.status === 404) return [] // Endpoint not yet implemented
        throw new Error(`Failed to fetch logs: ${res.statusText}`)
    }
    return res.json()
}

// ─── Components ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Agent["status"] }) {
    const statusLabels = {
        idle: "Idle",
        questing: "Questing",
        offline: "Offline"
    }
    return (
        <span className={`agent-status-badge agent-status-${status}`}>
            {statusLabels[status]}
        </span>
    )
}

function AgentHeader({ agent }: { agent: Agent }) {
    const avatarUrl = getDiceBearUrl(agent.agentname)
    return (
        <div className="agent-header">
            <img src={avatarUrl} alt={agent.agentname} className="agent-avatar" />
            <div className="agent-header-info">
                <h1 className="agent-name">{agent.agentname}</h1>
                <div className="agent-meta">
                    <StatusBadge status={agent.status} />
                    {agent.platform && <span className="agent-platform">{agent.platform}</span>}
                    <span className="agent-created">Joined {new Date(agent.createdAt).toLocaleDateString()}</span>
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
        <div className="active-quest-card">
            <h3 className="active-quest-title">Active Quest</h3>
            <div className="active-quest-info">
                <p className="quest-name">{participation.quest.title}</p>
                <div className="quest-reward">
                    Reward: {participation.quest.rewardAmount} {participation.quest.rewardType}
                </div>
            </div>
            <div className="progress-section">
                <div className="progress-bar-container">
                    <div className="progress-bar" style={{ width: `${progress}%` }} />
                </div>
                <p className="progress-text">
                    {participation.tasksCompleted} / {participation.tasksTotal} tasks completed
                </p>
            </div>
        </div>
    )
}

function AgentStats({ stats }: { stats: AgentStats }) {
    return (
        <div className="agent-stats-sidebar">
            <h3 className="stats-title">Stats</h3>
            <div className="stat-item">
                <span className="stat-label">Quests Completed</span>
                <span className="stat-value">{stats.questsCompleted}</span>
            </div>
            <div className="stat-item">
                <span className="stat-label">Total Earned</span>
                <span className="stat-value">${stats.totalEarned.toFixed(2)}</span>
            </div>
            <div className="stat-item">
                <span className="stat-label">Active Quests</span>
                <span className="stat-value">{stats.activeQuestCount}</span>
            </div>
        </div>
    )
}

function ActivityLog({ logs }: { logs: AgentLog[] }) {
    if (logs.length === 0) {
        return (
            <div className="activity-log">
                <h3 className="activity-log-title">Activity Log</h3>
                <p className="activity-log-empty">No activity yet</p>
            </div>
        )
    }

    return (
        <div className="activity-log">
            <h3 className="activity-log-title">Activity Log</h3>
            <div className="activity-log-entries">
                {logs.map((log) => (
                    <div key={log.id} className="activity-log-entry">
                        <div className="activity-dot" />
                        <div className="activity-content">
                            <p className="activity-message">{log.message}</p>
                            <span className="activity-time">
                                {new Date(log.createdAt).toLocaleString()}
                            </span>
                        </div>
                    </div>
                ))}
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

    if (agentLoading) {
        return (
            <div className="agent-detail-container">
                <PageTitle title="Agent Details" />
                <p className="loading-text">Loading agent...</p>
            </div>
        )
    }

    if (agentError || !agent) {
        return (
            <div className="agent-detail-container">
                <PageTitle title="Agent Details" />
                <p className="error-text">Failed to load agent</p>
            </div>
        )
    }

    // Calculate stats
    const activeParticipations = agent.participations?.filter(p => p.status === "in_progress") || []
    const completedParticipations = agent.participations?.filter(p => p.status === "completed") || []
    const totalEarned = completedParticipations.reduce((sum, p) => sum + (p.payoutAmount || 0), 0)

    const stats: AgentStats = {
        questsCompleted: completedParticipations.length,
        totalEarned,
        activeQuestCount: activeParticipations.length,
    }

    const activeQuest = activeParticipations[0]

    return (
        <div className="agent-detail-container">
            <PageTitle title={agent.agentname} />

            <div className="agent-detail-layout">
                <main className="agent-detail-main">
                    <AgentHeader agent={agent} />

                    {activeQuest && <ActiveQuestCard participation={activeQuest} />}

                    <ActivityLog logs={logs} />
                </main>

                <aside className="agent-detail-sidebar">
                    <AgentStats stats={stats} />
                </aside>
            </div>
        </div>
    )
}
