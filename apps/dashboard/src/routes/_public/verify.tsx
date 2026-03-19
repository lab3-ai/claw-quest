import { useState, useEffect, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

// Extract info from the markdown returned by API
function parseMarkdown(md: string) {
    const skillSlugMatch = md.match(/<!-- skill-slug: (.+?) -->/)
    const skillMatch = md.match(/\*\*(.+?)\*\* skill/)
    const taskMatch = md.match(/completing this task:\n\n(.+?)\n/)
    const expiresMatch = md.match(/\*\*Expires:\*\* (.+?)\n/)
    const bashMatch = md.match(/```bash\n([\s\S]*?)```/)

    return {
        skillSlug: skillSlugMatch?.[1] ?? "",
        skillDisplay: skillMatch?.[1] ?? "Unknown Skill",
        taskDescription: taskMatch?.[1] ?? "",
        expiresAt: expiresMatch?.[1] ?? "",
        bashScript: bashMatch?.[1] ?? "",
    }
}

function useCountdown(expiresAt: string) {
    const [timeLeft, setTimeLeft] = useState("")
    const [expired, setExpired] = useState(false)

    useEffect(() => {
        if (!expiresAt) return
        function tick() {
            const diff = new Date(expiresAt).getTime() - Date.now()
            if (diff <= 0) {
                setExpired(true)
                setTimeLeft("Expired")
                return
            }
            const m = Math.floor(diff / 60000)
            const s = Math.floor((diff % 60000) / 1000)
            setTimeLeft(`${m}m ${s}s`)
        }
        tick()
        const id = setInterval(tick, 1000)
        return () => clearInterval(id)
    }, [expiresAt])

    return { timeLeft, expired }
}

function VerifiedScreen({ questId }: { questId: string | null }) {
    const navigate = useNavigate()
    const [progress, setProgress] = useState(0)

    useEffect(() => {
        const DURATION = 2500
        const TICK = 30
        let elapsed = 0
        const id = setInterval(() => {
            elapsed += TICK
            setProgress(Math.min((elapsed / DURATION) * 100, 100))
            if (elapsed >= DURATION) {
                clearInterval(id)
                if (questId) {
                    navigate({ to: "/quests/$questId", params: { questId } })
                }
            }
        }, TICK)
        return () => clearInterval(id)
    }, [questId, navigate])

    return (
        <div className="max-w-md mx-auto py-20 flex flex-col items-center gap-6">
            <style>{`
                @keyframes cq-pop {
                    0%   { transform: scale(0.3); opacity: 0; }
                    60%  { transform: scale(1.15); opacity: 1; }
                    80%  { transform: scale(0.95); }
                    100% { transform: scale(1); }
                }
                @keyframes cq-ripple {
                    0%   { transform: scale(1);   opacity: 0.4; }
                    100% { transform: scale(2.2); opacity: 0; }
                }
                @keyframes cq-fadein {
                    from { opacity: 0; transform: translateY(8px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .cq-pop     { animation: cq-pop 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards; }
                .cq-ripple  { animation: cq-ripple 1.2s ease-out infinite; }
                .cq-fadein  { animation: cq-fadein 0.5s ease-out 0.4s both; }
                .cq-fadein2 { animation: cq-fadein 0.5s ease-out 0.7s both; }
            `}</style>

            {/* Checkmark with ripple */}
            <div className="relative flex items-center justify-center">
                <div className="cq-ripple absolute w-24 h-24 rounded-full bg-success/30" />
                <div className="cq-ripple absolute w-24 h-24 rounded-full bg-success/20" style={{ animationDelay: "0.4s" }} />
                <div className="cq-pop w-24 h-24 rounded-full bg-success flex items-center justify-center shadow-lg">
                    <svg viewBox="0 0 24 24" className="w-12 h-12 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                </div>
            </div>

            {/* Text */}
            <div className="cq-fadein text-center space-y-1">
                <h1 className="text-2xl font-bold text-fg-1">Skill Verified!</h1>
                <p className="text-fg-3 text-sm">Your skill has been successfully confirmed.</p>
            </div>

            {/* Progress bar */}
            {questId && (
                <div className="cq-fadein2 w-full space-y-1.5">
                    <div className="h-1 w-full bg-bg-3 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-success rounded-full transition-none"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-xs text-fg-3 text-center">Redirecting to your quest…</p>
                </div>
            )}
        </div>
    )
}

export function VerifyChallenge({ token }: { token: string }) {
    const [copied, setCopied] = useState(false)
    const [verifiedQuestId, setVerifiedQuestId] = useState<string | null | false>(false)
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
    // navigate lives in VerifiedScreen; no navigate needed here

    useEffect(() => {
        pollRef.current = setInterval(async () => {
            try {
                const res = await fetch(`${API_BASE}/verify/${token}/status`)
                if (!res.ok) return
                const status = await res.json() as { passed: boolean | null; questId: string | null }
                if (status.passed === true) {
                    clearInterval(pollRef.current!)
                    setVerifiedQuestId(status.questId)
                }
            } catch {
                // silently ignore poll errors
            }
        }, 1000)

        return () => { if (pollRef.current) clearInterval(pollRef.current) }
    }, [token])

    const { data, isLoading, error } = useQuery({
        queryKey: ["verify-challenge", token],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/verify/${token}`, {
                headers: { Accept: "text/markdown" },
            })
            if (!res.ok) {
                if (res.status === 404) throw new Error("not_found")
                throw new Error("fetch_failed")
            }
            const markdown = await res.text()
            return { markdown, ...parseMarkdown(markdown) }
        },
    })

    const { timeLeft, expired } = useCountdown(data?.expiresAt ?? "")

    async function copyScript() {
        if (!data?.bashScript) return
        await navigator.clipboard.writeText(data.bashScript.trim())
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    if (verifiedQuestId !== false) {
        return <VerifiedScreen questId={verifiedQuestId} />
    }

    if (isLoading) {
        return (
            <div className="max-w-2xl mx-auto space-y-6 py-12">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        )
    }

    if (error || !data) {
        const notFound = error?.message === "not_found"
        return (
            <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
                <h1 className="text-2xl font-bold">
                    {notFound ? "Challenge Not Found" : "Error Loading Challenge"}
                </h1>
                <p className="text-fg-3 text-sm">
                    {notFound
                        ? "This challenge does not exist or has expired."
                        : "Something went wrong. Please try again."}
                </p>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6 py-8">
            {/* Header */}
            <div className="space-y-2">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold">Skill Verification</h1>
                    <Badge variant={expired ? "error" : "default"}>
                        {expired ? "Expired" : timeLeft}
                    </Badge>
                </div>
                <p className="text-fg-3 text-sm">
                    Prove you have the <strong>{data.skillDisplay}</strong> skill
                </p>
            </div>

            {/* Task */}
            <div className="rounded-lg border border-border-2 bg-bg-1 p-4 space-y-2">
                <h2 className="text-sm font-medium text-fg-3 uppercase tracking-wide">
                    Challenge Task
                </h2>
                <p className="text-fg-1">{data.taskDescription}</p>
            </div>

            {/* Script */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-medium text-fg-3 uppercase tracking-wide">
                        Verification Script
                    </h2>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={copyScript}
                        disabled={expired}
                        className="text-xs"
                    >
                        {copied ? "Copied!" : "Copy Script"}
                    </Button>
                </div>

                <pre
                    className={cn(
                        "rounded-lg border border-border-2 bg-bg-3/50 p-4 text-xs overflow-x-auto font-mono whitespace-pre-wrap",
                        expired && "opacity-50"
                    )}
                >
                    {data.bashScript.trim()}
                </pre>
            </div>

            {/* Instructions */}
            <div className="rounded-lg border border-border-2 bg-bg-1 p-4 space-y-2">
                <h2 className="text-sm font-medium text-fg-3 uppercase tracking-wide">
                    How It Works
                </h2>
                <ol className="text-sm text-fg-3 space-y-1 list-decimal list-inside">
                    <li>Install the skill on your agent using the command above</li>
                    <li>Copy the verification script and send it to your AI agent to run</li>
                    <li>The agent executes the script — it calls the skill API and submits the result to ClawQuest automatically</li>
                    <li>If the result is valid, your agent's skill is verified</li>
                </ol>
            </div>
        </div>
    )
}
