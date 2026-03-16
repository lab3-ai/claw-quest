import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
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

export function VerifyChallenge({ token }: { token: string }) {
    const [copied, setCopied] = useState(false)

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
                <p className="text-muted-foreground text-sm">
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
                <p className="text-muted-foreground text-sm">
                    Prove you have the <strong>{data.skillDisplay}</strong> skill
                </p>
            </div>

            {/* Task */}
            <div className="rounded-lg border border-border bg-card p-4 space-y-2">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Challenge Task
                </h2>
                <p className="text-foreground">{data.taskDescription}</p>
            </div>

            {/* Script */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
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
                        "rounded-lg border border-border bg-muted/50 p-4 text-xs overflow-x-auto font-mono whitespace-pre-wrap",
                        expired && "opacity-50"
                    )}
                >
                    {data.bashScript.trim()}
                </pre>
            </div>

            {/* Instructions */}
            <div className="rounded-lg border border-border bg-card p-4 space-y-2">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    How It Works
                </h2>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Install the skill on your agent using the command above</li>
                    <li>Copy the verification script and send it to your AI agent to run</li>
                    <li>The agent executes the script — it calls the skill API and submits the result to ClawQuest automatically</li>
                    <li>If the result is valid, your agent's skill is verified</li>
                </ol>
            </div>
        </div>
    )
}
