import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { TimeLine, User1Line, CheckLine, CloseLine } from "@mingcute/react"
import { cn } from "@/lib/utils"
import { GitHubIcon } from "@/components/github-icon"
import { rewardBadgeClass, rewardLabel, statusBadgeClass, submissionStatusClass, formatDeadline } from "@/components/bounty-utils"

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

interface GitHubBounty {
    id: string
    repoOwner: string
    repoName: string
    issueNumber: number | null
    issueUrl: string | null
    title: string
    description: string
    rewardAmount: string
    rewardType: "USDC" | "USD" | "LLM_KEY"
    status: string
    questType: string
    maxWinners: number
    deadline: string | null
    llmKeyTokenLimit: number | null
    creatorUserId: string
    createdAt: string
    _count: { submissions: number }
}

interface Submission {
    id: string
    prUrl: string
    prNumber: number
    status: "pending" | "approved" | "rejected"
    createdAt: string
    user: { id: string; username: string | null; displayName: string | null; githubHandle: string | null } | null
    agent: { id: string; agentname: string } | null
}


async function getAccessToken() {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
}

const API_ME = `${API_BASE}/auth/me`

export function GitHubBountyDetail({ bountyId }: { bountyId: string }) {
    const { isAuthenticated, user } = useAuth()
    const queryClient = useQueryClient()
    const [prUrl, setPrUrl] = useState("")
    const [submitError, setSubmitError] = useState<string | null>(null)

    // Fetch profile to check if GitHub is already connected
    const { data: profile } = useQuery<{ hasGithubToken: boolean; githubHandle: string | null }>({
        queryKey: ["auth-me"],
        enabled: isAuthenticated,
        queryFn: async () => {
            const { data } = await supabase.auth.getSession()
            const token = data.session?.access_token
            if (!token) return { hasGithubToken: false, githubHandle: null }
            const res = await fetch(API_ME, { headers: { Authorization: `Bearer ${token}` } })
            if (!res.ok) return { hasGithubToken: false, githubHandle: null }
            return res.json()
        },
    })

    const { data: bounty, isLoading } = useQuery({
        queryKey: ["github-bounty", bountyId],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/github-bounties/${bountyId}`)
            if (!res.ok) throw new Error("Bounty not found")
            return res.json() as Promise<GitHubBounty>
        },
    })

    // Submissions — public, no auth required
    const { data: submissions = [] } = useQuery({
        queryKey: ["github-bounty-submissions", bountyId],
        enabled: !!bounty,
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/github-bounties/${bountyId}/submissions`)
            if (!res.ok) return []
            return res.json() as Promise<Submission[]>
        },
    })

    const isCreator = !!(user && bounty && user.id === bounty.creatorUserId)
    const isLive = bounty?.status === "live"
    const isCompleted = bounty?.status === "completed"

    const submitMutation = useMutation({
        mutationFn: async () => {
            const token = await getAccessToken()
            if (!token) throw new Error("Not authenticated")
            const res = await fetch(`${API_BASE}/github-bounties/${bountyId}/submit`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ prUrl }),
            })
            const data = await res.json()
            if (data.needsGithubAuth) throw new Error("NEEDS_GITHUB_AUTH")
            if (!res.ok) throw new Error(data.error?.message ?? "Submission failed")
            return data
        },
        onSuccess: () => {
            setPrUrl("")
            setSubmitError(null)
            queryClient.invalidateQueries({ queryKey: ["github-bounty-submissions", bountyId] })
            queryClient.invalidateQueries({ queryKey: ["github-bounty", bountyId] })
        },
        onError: (err: Error) => {
            if (err.message === "NEEDS_GITHUB_AUTH") {
                triggerGitHubOAuth("read:user")
            } else {
                setSubmitError(err.message)
            }
        },
    })

    const approveMutation = useMutation({
        mutationFn: async ({ subId, action }: { subId: string; action: "approve" | "reject" }) => {
            const token = await getAccessToken()
            if (!token) throw new Error("Not authenticated")
            const res = await fetch(`${API_BASE}/github-bounties/${bountyId}/submissions/${subId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ action }),
            })
            if (!res.ok) {
                const d = await res.json()
                throw new Error(d.error?.message ?? "Action failed")
            }
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["github-bounty-submissions", bountyId] })
            queryClient.invalidateQueries({ queryKey: ["github-bounty", bountyId] })
        },
    })

    function triggerGitHubOAuth(scope: "repo" | "read:user") {
        const state = crypto.randomUUID()
        sessionStorage.setItem("github_oauth_state", state)
        sessionStorage.setItem("github_oauth_return_to", `/github-bounties/${bountyId}`)
        const redirectUri = `${window.location.origin}/auth/github/callback`
        window.location.href = `${API_BASE}/auth/github/authorize?scope=${scope}&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}`
    }

    if (isLoading) {
        return (
            <div className="max-w-4xl mx-auto px-6 py-6 grid grid-cols-1 md:grid-cols-[1fr_280px] gap-6">
                <div className="space-y-4">
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-32 rounded-lg" />
                </div>
                <Skeleton className="h-48 rounded-lg" />
            </div>
        )
    }

    if (!bounty) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground text-sm">
                Bounty not found.{" "}
                <Link to="/github-bounties" className="underline ml-1">Browse all bounties</Link>
            </div>
        )
    }

    const repoUrl = `https://github.com/${bounty.repoOwner}/${bounty.repoName}`
    const pendingCount = submissions.filter(s => s.status === "pending").length

    return (
        <div className="max-w-4xl mx-auto px-6 py-6">
            {/* Breadcrumb */}
            <Link to="/github-bounties" className="text-xs text-muted-foreground hover:text-foreground mb-5 inline-flex items-center gap-1 no-underline">
                ← All bounties
            </Link>

            {/* Two-column layout: main content + sticky sidebar */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-6 mt-2">

                {/* ── Left: main content ── */}
                <div className="space-y-6 min-w-0">

                    {/* Bounty header */}
                    <div>
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <a href={repoUrl} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-foreground no-underline">
                                <GitHubIcon size={12} />
                                {bounty.repoOwner}/{bounty.repoName}
                            </a>
                            {bounty.issueNumber && bounty.issueUrl && (
                                <a href={bounty.issueUrl} target="_blank" rel="noopener noreferrer"
                                    className="text-xs text-muted-foreground hover:underline no-underline">
                                    #{bounty.issueNumber}
                                </a>
                            )}
                        </div>
                        <h1 className="text-xl font-semibold mb-3 leading-snug">{bounty.title}</h1>
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{bounty.description}</p>
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground border-t border-border pt-4 flex-wrap">
                        <span>{bounty.maxWinners} winner{bounty.maxWinners !== 1 ? "s" : ""}</span>
                        <span>{bounty.questType === "fcfs" ? "First-come first-served" : "Leaderboard"}</span>
                        {bounty.deadline && (
                            <span className="flex items-center gap-1">
                                <TimeLine size={12} />
                                {formatDeadline(bounty.deadline)}
                            </span>
                        )}
                    </div>

                    {/* Submit PR section — non-creator only */}
                    {!isCreator && (
                        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                            <h2 className="text-sm font-semibold">Submit a Pull Request</h2>

                            {isCompleted && (
                                <p className="text-xs text-muted-foreground">This bounty has been completed.</p>
                            )}

                            {!isCompleted && !isAuthenticated && (
                                <div className="space-y-2">
                                    <p className="text-xs text-muted-foreground">Log in to submit your PR.</p>
                                    <Button size="sm" variant="outline" asChild>
                                        <Link to="/login">Log in</Link>
                                    </Button>
                                </div>
                            )}

                            {/* GitHub Connect banner — only shown when GitHub not yet linked */}
                            {!isCompleted && isAuthenticated && isLive && !profile?.hasGithubToken && (
                                <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-center space-y-2">
                                    <p className="text-xs font-medium">Connect GitHub to verify PR authorship</p>
                                    <p className="text-xs text-muted-foreground">We verify you're the PR author before submission</p>
                                    <Button size="sm" variant="outline" onClick={() => triggerGitHubOAuth("read:user")}
                                        className="gap-1.5">
                                        <GitHubIcon size={13} /> Connect GitHub
                                    </Button>
                                </div>
                            )}

                            {!isCompleted && isAuthenticated && isLive && (
                                <form onSubmit={e => { e.preventDefault(); submitMutation.mutate() }} className="space-y-2">
                                    <input
                                        type="url"
                                        placeholder="https://github.com/owner/repo/pull/123"
                                        value={prUrl}
                                        onChange={e => { setPrUrl(e.target.value); setSubmitError(null) }}
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                                        required
                                    />
                                    {submitError && <p className="text-xs text-destructive">{submitError}</p>}
                                    <Button type="submit" size="sm" disabled={!prUrl || submitMutation.isPending}>
                                        {submitMutation.isPending ? "Submitting…" : "Submit PR"}
                                    </Button>
                                </form>
                            )}
                        </div>
                    )}

                    {/* Submissions list — visible to everyone */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-semibold">Submissions</h2>
                            <span className="text-xs text-muted-foreground">({submissions.length})</span>
                            {isCreator && pendingCount > 0 && (
                                <Badge variant="outline" className="text-xs text-yellow-400 border-yellow-500/30">
                                    {pendingCount} pending review
                                </Badge>
                            )}
                        </div>

                        {submissions.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-3">No submissions yet. Be the first!</p>
                        ) : (
                            <div className="space-y-2">
                                {submissions.map(sub => {
                                    const submitterName = sub.user?.githubHandle
                                        ? `@${sub.user.githubHandle}`
                                        : sub.user?.displayName ?? sub.agent?.agentname ?? "Unknown"
                                    return (
                                        <div key={sub.id}
                                            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-sm">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <User1Line size={13} className="text-muted-foreground shrink-0" />
                                                <span className="text-xs text-muted-foreground font-mono truncate">{submitterName}</span>
                                                <a href={sub.prUrl} target="_blank" rel="noopener noreferrer"
                                                    className="text-xs text-muted-foreground hover:text-foreground font-mono shrink-0">
                                                    PR #{sub.prNumber}
                                                </a>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <Badge variant="outline" className={cn("text-xs capitalize", submissionStatusClass(sub.status))}>
                                                    {sub.status}
                                                </Badge>
                                                {/* Creator approve/reject actions */}
                                                {isCreator && sub.status === "pending" && (
                                                    <>
                                                        <button
                                                            onClick={() => approveMutation.mutate({ subId: sub.id, action: "approve" })}
                                                            disabled={approveMutation.isPending}
                                                            className="text-green-400 hover:text-green-300 disabled:opacity-50"
                                                            title="Approve"
                                                        >
                                                            <CheckLine size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => approveMutation.mutate({ subId: sub.id, action: "reject" })}
                                                            disabled={approveMutation.isPending}
                                                            className="text-destructive hover:opacity-70 disabled:opacity-50"
                                                            title="Reject"
                                                        >
                                                            <CloseLine size={16} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Right: sticky sidebar ── */}
                <div className="md:sticky md:top-24 h-fit space-y-3">
                    {/* Reward card */}
                    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                        <div>
                            <p className="text-3xl font-semibold text-foreground">
                                {bounty.rewardType === "LLM_KEY"
                                    ? "LLM Key"
                                    : `$${Number(bounty.rewardAmount).toLocaleString()}`}
                            </p>
                            <Badge variant="outline" className={cn("text-xs mt-1", rewardBadgeClass(bounty.rewardType))}>
                                {rewardLabel(bounty.rewardType, bounty.rewardAmount, bounty.llmKeyTokenLimit)}
                            </Badge>
                        </div>

                        <div className="border-t border-border pt-3 space-y-1.5 text-xs text-muted-foreground">
                            <div className="flex justify-between">
                                <span>Status</span>
                                <Badge variant="outline" className={cn("text-xs capitalize", statusBadgeClass(bounty.status))}>
                                    {bounty.status}
                                </Badge>
                            </div>
                            {bounty.deadline && (
                                <div className="flex justify-between">
                                    <span>Deadline</span>
                                    <span className="text-foreground">{formatDeadline(bounty.deadline)}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span>Winners</span>
                                <span className="text-foreground">{bounty.maxWinners}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Submissions</span>
                                <span className="text-foreground">{submissions.length}</span>
                            </div>
                        </div>
                    </div>

                    {/* Repo link card */}
                    <a href={repoUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground hover:text-foreground transition-colors no-underline">
                        <GitHubIcon size={14} />
                        <span className="font-mono truncate">{bounty.repoOwner}/{bounty.repoName}</span>
                    </a>
                </div>
            </div>
        </div>
    )
}
