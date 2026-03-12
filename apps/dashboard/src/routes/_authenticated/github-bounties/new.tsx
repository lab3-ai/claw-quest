import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { useMutation } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckLine } from "@mingcute/react"
import { cn } from "@/lib/utils"
import { GitHubIcon } from "@/components/github-icon"

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

interface BountySuggestion {
    title: string
    description: string
    issueNumber?: number
    difficulty: "easy" | "medium" | "hard"
    suggestedReward: number
    rewardType: "USDC" | "USD" | "LLM_KEY"
    selected?: boolean
    rewardAmount?: number
    maxWinners?: number
    deadline?: string
}

async function getAccessToken() {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
}

function difficultyColor(d: string) {
    if (d === "easy") return "text-green-400 border-green-500/30"
    if (d === "medium") return "text-yellow-400 border-yellow-500/30"
    return "text-red-400 border-red-500/30"
}

function rewardColor(t: string) {
    if (t === "LLM_KEY") return "text-purple-400 border-purple-500/30"
    if (t === "USDC") return "text-blue-400 border-blue-500/30"
    return "text-green-400 border-green-500/30"
}


// ─── URL parsing helpers ───────────────────────────────────────────────────────

interface ParsedGithubUrl {
    type: "repo" | "org"
    owner: string
    repo?: string // only for type=repo
    repoUrl?: string // canonical repo URL
}

/** Detect if a GitHub URL points to a specific repo or an org/user page. */
function parseGithubInput(url: string): ParsedGithubUrl | null {
    // Match org page: github.com/orgs/{org}/... or github.com/{owner} (no repo segment)
    const orgMatch = url.match(/github\.com\/orgs\/([^/\s?#]+)/)
    if (orgMatch) return { type: "org", owner: orgMatch[1] }

    // Match specific repo: github.com/{owner}/{repo}
    const repoMatch = url.match(/github\.com\/([^/\s?#]+)\/([^/\s?#]+)/)
    if (repoMatch) {
        const [, owner, repo] = repoMatch
        return { type: "repo", owner, repo, repoUrl: `https://github.com/${owner}/${repo}` }
    }

    // Match just github.com/{owner} → treat as org/user
    const ownerMatch = url.match(/github\.com\/([^/\s?#]+)\/?$/)
    if (ownerMatch) return { type: "org", owner: ownerMatch[1] }

    return null
}

// ─── Step 1: Repo input ────────────────────────────────────────────────────────

interface RepoItem {
    full_name: string
    name: string
    description: string | null
    stargazers_count: number
    language: string | null
    html_url: string
}

function StepRepo({
    onSuggestions,
}: {
    onSuggestions: (suggestions: BountySuggestion[]) => void
}) {
    const [url, setUrl] = useState("")
    const [repos, setRepos] = useState<RepoItem[] | null>(null) // null = not fetched yet
    const [selectedRepo, setSelectedRepo] = useState<string>("") // full_name
    const [error, setError] = useState<string | null>(null)

    // Fetch repo list for org/user
    const listMutation = useMutation({
        mutationFn: async (owner: string) => {
            const token = await getAccessToken()
            if (!token) throw new Error("Please log in to continue")
            const res = await fetch(`${API_BASE}/github-bounties/list-repos?owner=${encodeURIComponent(owner)}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error?.message ?? data.message ?? "Failed to load repos")
            return data.repos as RepoItem[]
        },
        onSuccess: (data) => {
            setRepos(data)
            setSelectedRepo(data[0]?.full_name ?? "")
            setError(null)
        },
        onError: (err: Error) => setError(err.message),
    })

    // Analyze a specific repo URL
    const analyzeMutation = useMutation({
        mutationFn: async (repoUrl: string) => {
            const token = await getAccessToken()
            if (!token) throw new Error("Please log in to continue")
            const res = await fetch(`${API_BASE}/github-bounties/analyze-repo`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ repoUrl }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error?.message ?? data.message ?? "Analysis failed")
            return data as { suggestions: BountySuggestion[] }
        },
        onSuccess: (data) => {
            if (!data.suggestions?.length) {
                setError("No suggestions returned. Try a more active repo.")
                return
            }
            onSuggestions(data.suggestions.map(s => ({
                ...s, selected: true, rewardAmount: s.suggestedReward, maxWinners: 1,
            })))
        },
        onError: (err: Error) => setError(err.message),
    })

    function handleSubmit() {
        setError(null)
        const parsed = parseGithubInput(url)
        if (!parsed) { setError("Invalid GitHub URL"); return }

        if (parsed.type === "org") {
            // Fetch repo list first
            setRepos(null)
            listMutation.mutate(parsed.owner)
        } else {
            // Analyze directly
            analyzeMutation.mutate(parsed.repoUrl!)
        }
    }

    function handleAnalyzeSelected() {
        if (!selectedRepo) return
        setError(null)
        analyzeMutation.mutate(`https://github.com/${selectedRepo}`)
    }

    const isLoading = listMutation.isPending || analyzeMutation.isPending

    return (
        <div className="space-y-4">
            <div>
                <label className="text-sm font-medium mb-1.5 block">GitHub URL</label>
                <input
                    type="url"
                    placeholder="https://github.com/owner/repo  or  github.com/org"
                    value={url}
                    onChange={e => { setUrl(e.target.value); setError(null); setRepos(null) }}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
                {error && <p className="text-xs text-destructive mt-1">{error}</p>}
            </div>

            {/* Repo picker — shown when org URL was entered */}
            {repos !== null && (
                <div>
                    <label className="text-sm font-medium mb-1.5 block">Select a repo</label>
                    <select
                        value={selectedRepo}
                        onChange={e => setSelectedRepo(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                        {repos.map(r => (
                            <option key={r.full_name} value={r.full_name}>
                                {r.name}{r.stargazers_count ? ` ★${r.stargazers_count}` : ""}{r.language ? ` · ${r.language}` : ""}
                            </option>
                        ))}
                    </select>
                    {selectedRepo && repos.find(r => r.full_name === selectedRepo)?.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                            {repos.find(r => r.full_name === selectedRepo)?.description}
                        </p>
                    )}
                </div>
            )}

            <p className="text-xs text-muted-foreground">
                AI analyzes open issues, README, and repo activity to suggest bounties.
            </p>

            {/* Show Analyze button when repo list is loaded, otherwise Browse/Analyze */}
            {repos !== null ? (
                <Button onClick={handleAnalyzeSelected} disabled={!selectedRepo || isLoading} className="gap-2">
                    <GitHubIcon size={13} />
                    {analyzeMutation.isPending ? "Analyzing with AI…" : "Analyze Repo"}
                </Button>
            ) : (
                <Button onClick={handleSubmit} disabled={!url || isLoading} className="gap-2">
                    <GitHubIcon size={13} />
                    {listMutation.isPending ? "Loading repos…" : analyzeMutation.isPending ? "Analyzing with AI…" : "Next"}
                </Button>
            )}
        </div>
    )
}

// ─── Step 2: Review AI suggestions ────────────────────────────────────────────

function StepReview({
    suggestions,
    onChange,
    onNext,
    onBack,
}: {
    suggestions: BountySuggestion[]
    onChange: (s: BountySuggestion[]) => void
    onNext: () => void
    onBack: () => void
}) {
    function toggle(i: number) {
        const next = [...suggestions]
        next[i] = { ...next[i], selected: !next[i].selected }
        onChange(next)
    }

    function update(i: number, field: keyof BountySuggestion, value: unknown) {
        const next = [...suggestions]
        next[i] = { ...next[i], [field]: value }
        onChange(next)
    }

    const selected = suggestions.filter(s => s.selected)

    return (
        <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
                Select and edit bounties. Uncheck to skip.
            </p>

            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                {suggestions.map((s, i) => (
                    <div
                        key={i}
                        className={cn(
                            "rounded-lg border p-3 transition-colors cursor-pointer",
                            s.selected ? "border-border bg-card" : "border-border/40 bg-muted/20 opacity-50"
                        )}
                        onClick={() => toggle(i)}
                    >
                        <div className="flex items-start gap-3">
                            <input
                                type="checkbox"
                                checked={!!s.selected}
                                onChange={() => toggle(i)}
                                onClick={e => e.stopPropagation()}
                                className="mt-0.5 shrink-0"
                            />
                            <div className="flex-1 min-w-0 space-y-2" onClick={e => e.stopPropagation()}>
                                <input
                                    value={s.title}
                                    onChange={e => update(i, "title", e.target.value)}
                                    disabled={!s.selected}
                                    className="w-full text-sm font-medium bg-transparent border-b border-border focus:outline-none focus:border-ring py-0.5"
                                />
                                <textarea
                                    value={s.description}
                                    onChange={e => update(i, "description", e.target.value)}
                                    disabled={!s.selected}
                                    rows={2}
                                    className="w-full text-xs text-muted-foreground bg-transparent border border-border rounded px-2 py-1 focus:outline-none focus:border-ring resize-none"
                                />
                                <div className="flex items-center gap-3 flex-wrap">
                                    <Badge variant="outline" className={cn("text-xs", difficultyColor(s.difficulty))}>
                                        {s.difficulty}
                                    </Badge>
                                    <Badge variant="outline" className={cn("text-xs", rewardColor(s.rewardType))}>
                                        {s.rewardType}
                                    </Badge>
                                    <div className="flex items-center gap-1">
                                        <span className="text-xs text-muted-foreground">$</span>
                                        <input
                                            type="number"
                                            value={s.rewardAmount ?? s.suggestedReward}
                                            onChange={e => update(i, "rewardAmount", Number(e.target.value))}
                                            disabled={!s.selected || s.rewardType === "LLM_KEY"}
                                            min={1}
                                            className="w-20 text-xs bg-transparent border border-border rounded px-1 py-0.5 focus:outline-none focus:border-ring"
                                        />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="text-xs text-muted-foreground">Winners:</span>
                                        <input
                                            type="number"
                                            value={s.maxWinners ?? 1}
                                            onChange={e => update(i, "maxWinners", Number(e.target.value))}
                                            disabled={!s.selected}
                                            min={1}
                                            max={50}
                                            className="w-14 text-xs bg-transparent border border-border rounded px-1 py-0.5 focus:outline-none focus:border-ring"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex justify-between pt-2">
                <Button variant="ghost" size="sm" onClick={onBack}>Back</Button>
                <Button size="sm" onClick={onNext} disabled={selected.length === 0}>
                    Continue with {selected.length} bounty{selected.length !== 1 ? "ies" : ""}
                </Button>
            </div>
        </div>
    )
}

// ─── Step 3: Publish ──────────────────────────────────────────────────────────

function StepPublish({
    suggestions,
    onBack,
    onPublished,
}: {
    suggestions: BountySuggestion[]
    onBack: () => void
    onPublished: (ids: string[]) => void
}) {
    const selected = suggestions.filter(s => s.selected)
    const llmKeyCount = selected.filter(s => s.rewardType === "LLM_KEY").length
    const paidCount = selected.filter(s => s.rewardType !== "LLM_KEY").length

    const publishMutation = useMutation({
        mutationFn: async () => {
            const token = await getAccessToken()
            const repoUrl = sessionStorage.getItem("github_analyze_repo") ?? ""
            const match = repoUrl.match(/github\.com\/([^/]+)\/([^/?\s#]+)/)
            const repoOwner = match?.[1] ?? "unknown"
            const repoName = match?.[2]?.replace(/\.git$/, "") ?? "unknown"

            const bounties = selected.map(s => ({
                repoOwner,
                repoName,
                title: s.title,
                description: s.description,
                rewardAmount: s.rewardType === "LLM_KEY" ? 0 : (s.rewardAmount ?? s.suggestedReward),
                rewardType: s.rewardType,
                maxWinners: s.maxWinners ?? 1,
                issueNumber: s.issueNumber,
                deadline: s.deadline,
            }))

            const res = await fetch(`${API_BASE}/github-bounties/bulk`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ bounties }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error?.message ?? "Failed to create bounties")
            return data as { bounties: { id: string }[] }
        },
        onSuccess: (data) => {
            onPublished(data.bounties.map(b => b.id))
        },
    })

    return (
        <div className="space-y-4">
            <p className="text-sm font-medium">Review & Publish</p>

            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
                <p className="text-xs text-muted-foreground">
                    <span className="text-foreground font-medium">{selected.length}</span> bounty{selected.length !== 1 ? "ies" : ""} will be created
                </p>
                {llmKeyCount > 0 && (
                    <p className="text-xs text-purple-400">
                        ✓ {llmKeyCount} LLM Key bounty{llmKeyCount !== 1 ? "ies" : ""} → live immediately
                    </p>
                )}
                {paidCount > 0 && (
                    <p className="text-xs text-muted-foreground">
                        ○ {paidCount} paid bounty{paidCount !== 1 ? "ies" : ""} → draft until funded
                    </p>
                )}
            </div>

            <div className="space-y-1 max-h-48 overflow-y-auto">
                {selected.map((s, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-border/40 last:border-0">
                        <span className="truncate text-foreground flex-1 mr-2">{s.title}</span>
                        <Badge variant="outline" className={cn("shrink-0", rewardColor(s.rewardType))}>
                            {s.rewardType === "LLM_KEY" ? "LLM Key" : `$${s.rewardAmount ?? s.suggestedReward} ${s.rewardType}`}
                        </Badge>
                    </div>
                ))}
            </div>

            {publishMutation.isError && (
                <p className="text-xs text-destructive">{(publishMutation.error as Error).message}</p>
            )}

            <div className="flex justify-between pt-2">
                <Button variant="ghost" size="sm" onClick={onBack} disabled={publishMutation.isPending}>Back</Button>
                <Button size="sm" onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending}>
                    {publishMutation.isPending ? "Publishing…" : "Publish Bounties"}
                </Button>
            </div>
        </div>
    )
}

// ─── Step 4: Success screen ────────────────────────────────────────────────────

function StepSuccess({ count, hasLlmKey, hasPaid }: { count: number; hasLlmKey: boolean; hasPaid: boolean }) {
    return (
        <div className="text-center space-y-4 py-4">
            <div className="w-12 h-12 rounded-full border border-green-500/30 bg-green-500/10 flex items-center justify-center mx-auto">
                <CheckLine size={22} className="text-green-400" />
            </div>
            <div>
                <p className="text-sm font-semibold mb-1">
                    {count} bounty{count !== 1 ? "ies" : ""} published!
                </p>
                <p className="text-xs text-muted-foreground max-w-[36ch] mx-auto">
                    {hasLlmKey && hasPaid
                        ? "LLM Key bounties are live. Paid bounties need funding from My Bounties."
                        : hasLlmKey
                            ? "Your bounties are live and accepting submissions."
                            : "Your bounties are created as drafts. Fund them from My Bounties to go live."}
                </p>
            </div>
            <div className="flex gap-2 justify-center pt-1">
                <Button size="sm" asChild>
                    <Link to="/github-bounties/mine">Manage Bounties</Link>
                </Button>
                <Button size="sm" variant="outline" asChild>
                    <Link to="/github-bounties">Explore</Link>
                </Button>
            </div>
        </div>
    )
}

// ─── Wizard stepper header ────────────────────────────────────────────────────

const STEPS = ["Repo", "Review", "Publish"]

function WizardStepper({ step }: { step: number }) {
    return (
        <div className="flex items-center gap-2 mb-6">
            {STEPS.map((label, i) => (
                <div key={i} className="flex items-center gap-2">
                    <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium border",
                        i === step ? "bg-foreground text-background border-foreground" :
                            i < step ? "bg-foreground/20 text-foreground border-foreground/20" :
                                "border-border text-muted-foreground"
                    )}>
                        {i < step ? <CheckLine size={12} /> : i + 1}
                    </div>
                    <span className={cn(
                        "text-xs",
                        i === step ? "text-foreground font-medium" : "text-muted-foreground"
                    )}>
                        {label}
                    </span>
                    {i < STEPS.length - 1 && <div className="w-6 h-px bg-border mx-1" />}
                </div>
            ))}
        </div>
    )
}

// ─── Main wizard ──────────────────────────────────────────────────────────────

type WizardState = "repo" | "review" | "publish" | "success"

export function CreateGitHubBounty() {
    const [wizardState, setWizardState] = useState<WizardState>("repo")
    const [suggestions, setSuggestions] = useState<BountySuggestion[]>([])
    const [publishedCount, setPublishedCount] = useState(0)
    const [publishedHasLlmKey, setPublishedHasLlmKey] = useState(false)
    const [publishedHasPaid, setPublishedHasPaid] = useState(false)

    // Map wizard states to step index for stepper display
    const stepIndex: Record<WizardState, number> = {
        repo: 0, review: 1, publish: 2, success: 2,
    }

    function handleSuggestions(s: BountySuggestion[]) {
        setSuggestions(s)
        setWizardState("review")
    }

    function handlePublished(ids: string[]) {
        const selected = suggestions.filter(s => s.selected)
        setPublishedCount(ids.length)
        setPublishedHasLlmKey(selected.some(s => s.rewardType === "LLM_KEY"))
        setPublishedHasPaid(selected.some(s => s.rewardType !== "LLM_KEY"))
        setWizardState("success")
    }

    const showStepper = wizardState !== "success"

    return (
        <div className="max-w-xl mx-auto px-6 py-6">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold mb-1">Post a Bounty</h1>
                <p className="text-sm text-muted-foreground">AI analyzes your repo and suggests bounties</p>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
                {showStepper && <WizardStepper step={stepIndex[wizardState]} />}

                {wizardState === "repo" && (
                    <StepRepo onSuggestions={handleSuggestions} />
                )}
                {wizardState === "review" && (
                    <StepReview
                        suggestions={suggestions}
                        onChange={setSuggestions}
                        onNext={() => setWizardState("publish")}
                        onBack={() => setWizardState("repo")}
                    />
                )}
                {wizardState === "publish" && (
                    <StepPublish
                        suggestions={suggestions}
                        onBack={() => setWizardState("review")}
                        onPublished={handlePublished}
                    />
                )}
                {wizardState === "success" && (
                    <StepSuccess
                        count={publishedCount}
                        hasLlmKey={publishedHasLlmKey}
                        hasPaid={publishedHasPaid}
                    />
                )}
            </div>
        </div>
    )
}
