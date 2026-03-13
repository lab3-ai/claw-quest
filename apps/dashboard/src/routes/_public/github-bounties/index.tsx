import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/context/AuthContext"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { GitBranchLine, CodeLine, AddLine } from "@mingcute/react"
import { cn } from "@/lib/utils"
import { GitHubIcon } from "@/components/github-icon"
import { rewardBadgeClass, rewardLabel, formatDeadline } from "@/components/bounty-utils"

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

interface GitHubBounty {
    id: string
    repoOwner: string
    repoName: string
    title: string
    description: string
    rewardAmount: string
    rewardType: "USDC" | "USD" | "LLM_KEY"
    status: string
    questType: string
    maxWinners: number
    deadline: string | null
    issueNumber: number | null
    issueUrl: string | null
    createdAt: string
    _count: { submissions: number }
}

// Status filter tabs: "open" = live + 0 submissions, "in_review" = live + has submissions
type StatusTab = "all" | "open" | "in_review" | "completed"
type RewardFilter = "USDC" | "USD" | "LLM_KEY" | undefined

function difficultyFromAmount(amount: string): { label: string; className: string } {
    const n = Number(amount)
    if (n < 100) return { label: "easy", className: "text-green-400 border-green-500/20" }
    if (n < 500) return { label: "medium", className: "text-yellow-400 border-yellow-500/20" }
    return { label: "hard", className: "text-red-400 border-red-500/20" }
}

const STATUS_TABS: { key: StatusTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "open", label: "Open" },
    { key: "in_review", label: "In Review" },
    { key: "completed", label: "Completed" },
]

const REWARD_FILTERS: { label: string; value: RewardFilter }[] = [
    { label: "USDC", value: "USDC" },
    { label: "USD (Fiat)", value: "USD" },
    { label: "LLM Key", value: "LLM_KEY" },
]

function filterBounties(bounties: GitHubBounty[], status: StatusTab): GitHubBounty[] {
    switch (status) {
        case "open": return bounties.filter(b => b.status === "live" && b._count.submissions === 0)
        case "in_review": return bounties.filter(b => b.status === "live" && b._count.submissions > 0)
        case "completed": return bounties.filter(b => b.status === "completed")
        default: return bounties
    }
}

export function GitHubBountiesExplore() {
    const { isAuthenticated } = useAuth()
    const [statusTab, setStatusTab] = useState<StatusTab>("all")
    const [rewardFilter, setRewardFilter] = useState<RewardFilter>(undefined)

    const { data, isLoading } = useQuery({
        queryKey: ["github-bounties", rewardFilter],
        queryFn: async () => {
            const params = new URLSearchParams({ limit: "50" })
            if (rewardFilter) params.set("rewardType", rewardFilter)
            const res = await fetch(`${API_BASE}/github-bounties?${params}`)
            if (!res.ok) throw new Error("Failed to fetch bounties")
            return res.json() as Promise<{ bounties: GitHubBounty[]; total: number }>
        },
    })

    const filtered = filterBounties(data?.bounties ?? [], statusTab)

    return (
        <div className="mx-auto px-6 py-6">
            {/* Page header */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold mb-1">GitHub Bounties</h1>
                    <p className="text-sm text-muted-foreground">Fix open-source issues, earn USDC or LLM API keys</p>
                </div>
                {isAuthenticated && (
                    <Button asChild size="sm" className="gap-1.5">
                        <Link to="/github-bounties/new"><AddLine size={14} /> Post Bounty</Link>
                    </Button>
                )}
            </div>

            {/* Status tabs */}
            <div className="flex gap-0 border-b border-border mb-4">
                {STATUS_TABS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setStatusTab(tab.key)}
                        className={cn(
                            "px-4 py-2 text-sm transition-colors border-b-2 -mb-px",
                            statusTab === tab.key
                                ? "border-foreground text-foreground font-medium"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {tab.label}
                        {!isLoading && data && tab.key !== "all" && (
                            <span className="ml-1.5 text-xs opacity-60">
                                ({filterBounties(data.bounties, tab.key).length})
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Reward type filter pills */}
            <div className="flex gap-2 mb-5 flex-wrap">
                {REWARD_FILTERS.map(f => (
                    <button
                        key={f.value}
                        onClick={() => setRewardFilter(rewardFilter === f.value ? undefined : f.value)}
                        className={cn(
                            "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                            rewardFilter === f.value
                                ? "bg-foreground text-background border-foreground"
                                : "bg-transparent border-border text-muted-foreground hover:border-foreground/50"
                        )}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* List */}
            {isLoading ? (
                <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-20 rounded-lg" />
                    ))}
                </div>
            ) : !filtered.length ? (
                <div className="text-center py-12 space-y-3">
                    <CodeLine size={48} className="mx-auto text-muted-foreground" />
                    <p className="text-sm font-semibold text-foreground">
                        {statusTab === "all" ? "No bounties yet" : `No ${statusTab.replace("_", " ")} bounties`}
                    </p>
                    <p className="text-xs text-muted-foreground max-w-[45ch] mx-auto">
                        {statusTab === "all"
                            ? "Be the first to post a GitHub bounty and attract contributors."
                            : "Try a different filter."}
                    </p>
                    {isAuthenticated && statusTab === "all" && (
                        <Button asChild variant="outline" size="sm">
                            <Link to="/github-bounties/new">Post the first bounty</Link>
                        </Button>
                    )}
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map(bounty => {
                        const difficulty = difficultyFromAmount(bounty.rewardAmount)
                        return (
                            <Link
                                key={bounty.id}
                                to="/github-bounties/$bountyId"
                                params={{ bountyId: bounty.id }}
                                className="flex items-start justify-between gap-4 rounded-lg border border-border bg-card hover:border-foreground/30 transition-colors p-4 no-underline"
                            >
                                <div className="min-w-0 flex-1 space-y-1.5">
                                    {/* Repo + issue */}
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                                        <GitHubIcon size={12} />
                                        <span>{bounty.repoOwner}/{bounty.repoName}</span>
                                        {bounty.issueNumber && (
                                            <span className="opacity-60">#{bounty.issueNumber}</span>
                                        )}
                                    </div>
                                    {/* Title */}
                                    <p className="text-sm font-medium text-foreground leading-snug">{bounty.title}</p>
                                    {/* Meta badges */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Badge variant="outline" className={cn("text-xs px-2 py-0", rewardBadgeClass(bounty.rewardType))}>
                                            {rewardLabel(bounty.rewardType, bounty.rewardAmount)}
                                        </Badge>
                                        {bounty.rewardType !== "LLM_KEY" && (
                                            <Badge variant="outline" className={cn("text-xs px-2 py-0", difficulty.className)}>
                                                {difficulty.label}
                                            </Badge>
                                        )}
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <GitBranchLine size={12} />
                                            {bounty._count.submissions} PR{bounty._count.submissions !== 1 ? "s" : ""}
                                        </span>
                                        {bounty.deadline && (
                                            <span className="text-xs text-muted-foreground">
                                                {formatDeadline(bounty.deadline)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {/* Right: winners */}
                                <div className="shrink-0 text-right">
                                    <span className="text-xs text-muted-foreground">
                                        {bounty.maxWinners} winner{bounty.maxWinners !== 1 ? "s" : ""}
                                    </span>
                                </div>
                            </Link>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
