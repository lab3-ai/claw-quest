import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

interface GitHubBounty {
    id: string
    repoOwner: string
    repoName: string
    title: string
    rewardAmount: string
    rewardType: "USDC" | "USD" | "LLM_KEY"
    status: string
    fundingStatus: string
    maxWinners: number
    deadline: string | null
    createdAt: string
    _count: { submissions: number }
}

interface MySubmission {
    id: string
    prUrl: string
    prNumber: number
    status: "pending" | "approved" | "rejected"
    createdAt: string
    bounty: {
        id: string
        title: string
        repoOwner: string
        repoName: string
        rewardAmount: string
        rewardType: string
        status: string
    }
}

async function getAccessToken() {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
}

function statusBadgeClass(status: string) {
    if (status === "live") return "text-green-400 border-green-500/30"
    if (status === "completed") return "text-muted-foreground border-muted"
    if (status === "cancelled") return "text-destructive border-destructive/30"
    return "text-yellow-400 border-yellow-500/30" // draft
}

function submissionStatusClass(status: string) {
    if (status === "approved") return "text-green-400 border-green-500/30"
    if (status === "rejected") return "text-destructive border-destructive/30"
    return "text-yellow-400 border-yellow-500/30"
}

function rewardLabel(type: string, amount: string) {
    if (type === "LLM_KEY") return "LLM Key"
    return `$${Number(amount).toLocaleString()} ${type}`
}

// ─── Created bounties tab ──────────────────────────────────────────────────────

function CreatedTab() {
    const queryClient = useQueryClient()

    const { data: bounties, isLoading } = useQuery({
        queryKey: ["my-github-bounties"],
        queryFn: async () => {
            const token = await getAccessToken()
            const res = await fetch(`${API_BASE}/github-bounties/mine`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) throw new Error("Failed to load bounties")
            return res.json() as Promise<GitHubBounty[]>
        },
    })

    const cancelMutation = useMutation({
        mutationFn: async (bountyId: string) => {
            const token = await getAccessToken()
            const res = await fetch(`${API_BASE}/github-bounties/${bountyId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) {
                const d = await res.json()
                throw new Error(d.error?.message ?? "Failed to cancel")
            }
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-github-bounties"] }),
    })

    if (isLoading) {
        return (
            <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
            </div>
        )
    }

    if (!bounties?.length) {
        return (
            <div className="text-center py-12 rounded-lg border border-dashed border-border">
                <p className="text-sm font-semibold mb-1">No bounties created yet</p>
                <p className="text-xs text-muted-foreground mb-3">Post bounties to attract contributors to your repos</p>
                <Button asChild size="sm" variant="outline">
                    <Link to="/github-bounties/new">Post first bounty</Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-2">
            {bounties.map(bounty => (
                <div key={bounty.id} className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                            <p className="text-xs text-muted-foreground font-mono mb-1">
                                {bounty.repoOwner}/{bounty.repoName}
                            </p>
                            <Link
                                to="/github-bounties/$bountyId"
                                params={{ bountyId: bounty.id }}
                                className="text-sm font-medium hover:underline block truncate mb-2"
                            >
                                {bounty.title}
                            </Link>
                            <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className={cn("text-xs", statusBadgeClass(bounty.status))}>
                                    {bounty.status}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                    {rewardLabel(bounty.rewardType, bounty.rewardAmount)}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {bounty._count.submissions} PR{bounty._count.submissions !== 1 ? "s" : ""}
                                </span>
                                {bounty.deadline && (
                                    <span className="text-xs text-muted-foreground">
                                        Due {new Date(bounty.deadline).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            {bounty.status === "draft" && bounty.rewardType === "USD" && bounty.fundingStatus === "unfunded" && (
                                <Button size="sm" variant="outline" className="text-xs h-7" asChild>
                                    <Link to="/github-bounties/$bountyId" params={{ bountyId: bounty.id }}>Fund</Link>
                                </Button>
                            )}
                            {bounty.status !== "completed" && bounty.status !== "cancelled" && (
                                <Button
                                    size="sm" variant="ghost"
                                    className="text-xs h-7 text-destructive"
                                    disabled={cancelMutation.isPending}
                                    onClick={() => {
                                        if (confirm(`Cancel "${bounty.title}"?`)) {
                                            cancelMutation.mutate(bounty.id)
                                        }
                                    }}
                                >
                                    Cancel
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

// ─── Submitted PRs tab ────────────────────────────────────────────────────────

function SubmittedTab() {
    const { data: submissions, isLoading } = useQuery({
        queryKey: ["my-github-submissions"],
        queryFn: async () => {
            const token = await getAccessToken()
            const res = await fetch(`${API_BASE}/github-bounties/my-submissions`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) throw new Error("Failed to load submissions")
            return res.json() as Promise<MySubmission[]>
        },
    })

    if (isLoading) {
        return (
            <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
            </div>
        )
    }

    if (!submissions?.length) {
        return (
            <div className="text-center py-12 rounded-lg border border-dashed border-border">
                <p className="text-sm font-semibold mb-1">No PR submissions yet</p>
                <p className="text-xs text-muted-foreground mb-3">Browse open bounties and submit your PRs</p>
                <Button asChild size="sm" variant="outline">
                    <Link to="/github-bounties">Browse bounties</Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-2">
            {submissions.map(sub => (
                <div key={sub.id} className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                            <p className="text-xs text-muted-foreground font-mono mb-1">
                                {sub.bounty.repoOwner}/{sub.bounty.repoName}
                            </p>
                            <Link
                                to="/github-bounties/$bountyId"
                                params={{ bountyId: sub.bounty.id }}
                                className="text-sm font-medium hover:underline block truncate mb-2"
                            >
                                {sub.bounty.title}
                            </Link>
                            <div className="flex items-center gap-2 flex-wrap">
                                <a href={sub.prUrl} target="_blank" rel="noopener noreferrer"
                                    className="text-xs text-muted-foreground font-mono hover:underline">
                                    PR #{sub.prNumber}
                                </a>
                                <span className="text-xs text-muted-foreground">
                                    {rewardLabel(sub.bounty.rewardType, sub.bounty.rewardAmount)}
                                </span>
                            </div>
                        </div>
                        <Badge variant="outline" className={cn("text-xs capitalize shrink-0", submissionStatusClass(sub.status))}>
                            {sub.status}
                        </Badge>
                    </div>
                </div>
            ))}
        </div>
    )
}

// ─── Main page ────────────────────────────────────────────────────────────────

type Tab = "created" | "submitted"

export function MyGitHubBounties() {
    const [tab, setTab] = useState<Tab>("created")

    return (
        <div className="max-w-3xl mx-auto px-6 py-6">
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold">My Bounties</h1>
                    <p className="text-sm text-muted-foreground mt-1">Bounties you created and PRs you submitted</p>
                </div>
                <Button asChild size="sm">
                    <Link to="/github-bounties/new">+ Post Bounty</Link>
                </Button>
            </div>

            {/* Tab switcher */}
            <div className="flex gap-0 border-b border-border mb-5">
                {(["created", "submitted"] as Tab[]).map(t => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={cn(
                            "px-4 py-2 text-sm capitalize transition-colors border-b-2 -mb-px",
                            tab === t
                                ? "border-foreground text-foreground font-medium"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {tab === "created" ? <CreatedTab /> : <SubmittedTab />}
        </div>
    )
}
