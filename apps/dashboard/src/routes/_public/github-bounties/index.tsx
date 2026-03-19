import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/context/AuthContext"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PageTitle } from "@/components/page-title"
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

type StatusTab = "all" | "open" | "in_review" | "completed"
type RewardFilter = "USDC" | "USD" | "LLM_KEY" | undefined

function difficultyFromAmount(amount: string): { label: string; className: string } {
    const n = Number(amount)
    if (n < 100) return { label: "easy", className: "text-success border-success/30" }
    if (n < 500) return { label: "medium", className: "text-warning border-warning/30" }
    return { label: "hard", className: "text-error border-error/30" }
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
        <div>
            <PageTitle
                title="GitHub Bounties"
                description="Fix open-source issues, earn USDC or LLM API keys"
                actions={isAuthenticated ? (
                    <Button asChild size="sm">
                        <Link to="/github-bounties/new" className="no-underline"><AddLine size={14} /> Post Bounty</Link>
                    </Button>
                ) : undefined}
            />

            {/* Status tabs — quests-style with sliding underline */}
            <div className="relative flex items-center gap-4 lg:gap-6 py-4">
                {STATUS_TABS.map(tab => {
                    const isActive = statusTab === tab.key
                    const count = !isLoading && data && tab.key !== "all"
                        ? filterBounties(data.bounties, tab.key).length
                        : null
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setStatusTab(tab.key)}
                            className={cn(
                                "inline-flex items-center gap-1.5 pb-1.5 text-sm font-medium whitespace-nowrap cursor-pointer transition-colors duration-150 ease-out bg-transparent border-none border-b-[3px] -mb-px",
                                isActive
                                    ? "text-fg-1 font-semibold border-b-fg-1"
                                    : "text-fg-3 hover:text-fg-1 border-b-transparent"
                            )}
                        >
                            {tab.label}
                            {count !== null && (
                                <span className="text-xs text-fg-3">({count})</span>
                            )}
                        </button>
                    )
                })}
            </div>

            {/* Reward type filter pills */}
            <div className="flex gap-2 mb-5 flex-wrap">
                {REWARD_FILTERS.map(f => (
                    <button
                        key={f.value}
                        onClick={() => setRewardFilter(rewardFilter === f.value ? undefined : f.value)}
                        className={cn(
                            "px-3 py-1 rounded-full text-xs font-medium border transition-colors bg-transparent cursor-pointer",
                            rewardFilter === f.value
                                ? "bg-foreground text-background border-foreground"
                                : "border-border text-fg-3 hover:border-foreground/50"
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
                        <div key={i} className="flex items-start gap-4 rounded border border-border-2 bg-bg-1 p-4 animate-pulse">
                            <div className="flex-1 space-y-2">
                                <div className="h-3 w-32 rounded bg-bg-2" />
                                <div className="h-4 w-3/4 rounded bg-bg-2" />
                                <div className="flex gap-2">
                                    <div className="h-5 w-20 rounded-full bg-bg-2" />
                                    <div className="h-5 w-14 rounded-full bg-bg-2" />
                                </div>
                            </div>
                            <div className="h-3 w-16 rounded bg-bg-2" />
                        </div>
                    ))}
                </div>
            ) : !filtered.length ? (
                <div className="text-center py-12 space-y-3">
                    <CodeLine size={48} className="mx-auto text-fg-3" />
                    <p className="text-sm font-semibold text-fg-1">
                        {statusTab === "all" ? "No bounties yet" : `No ${statusTab.replace("_", " ")} bounties`}
                    </p>
                    <p className="text-xs text-fg-3 max-w-[45ch] mx-auto">
                        {statusTab === "all"
                            ? "Be the first to post a GitHub bounty and attract contributors."
                            : "Try a different filter."}
                    </p>
                    {isAuthenticated && statusTab === "all" && (
                        <Button asChild variant="outline" size="sm">
                            <Link to="/github-bounties/new" className="no-underline">Post the first bounty</Link>
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
                                className="flex items-start justify-between gap-4 rounded border border-border-2 bg-bg-1 hover:border-fg-1 transition-colors p-4 no-underline"
                            >
                                <div className="min-w-0 flex-1 space-y-1.5">
                                    <div className="flex items-center gap-1.5 text-xs text-fg-3">
                                        <GitHubIcon size={12} />
                                        <span>{bounty.repoOwner}/{bounty.repoName}</span>
                                        {bounty.issueNumber && (
                                            <span className="opacity-60">#{bounty.issueNumber}</span>
                                        )}
                                    </div>
                                    <p className="text-sm font-semibold text-fg-1 leading-snug">{bounty.title}</p>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Badge variant="outline" className={cn("text-xs", rewardBadgeClass(bounty.rewardType))}>
                                            {rewardLabel(bounty.rewardType, bounty.rewardAmount)}
                                        </Badge>
                                        {bounty.rewardType !== "LLM_KEY" && (
                                            <Badge variant="outline" className={cn("text-xs", difficulty.className)}>
                                                {difficulty.label}
                                            </Badge>
                                        )}
                                        <span className="text-xs text-fg-3 flex items-center gap-1">
                                            <GitBranchLine size={12} />
                                            {bounty._count.submissions} PR{bounty._count.submissions !== 1 ? "s" : ""}
                                        </span>
                                        {bounty.deadline && (
                                            <span className="text-xs text-fg-3">
                                                {formatDeadline(bounty.deadline)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="shrink-0 text-right">
                                    <span className="text-xs text-fg-3">
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
