/** Shared utility functions for GitHub Bounty pages */

/** CSS class for reward type badge */
export function rewardBadgeClass(type: string) {
    if (type === "LLM_KEY") return "bg-purple-500/10 text-purple-400 border-purple-500/20"
    if (type === "USDC") return "bg-blue-500/10 text-blue-400 border-blue-500/20"
    return "bg-green-500/10 text-green-400 border-green-500/20"
}

/** Human-readable reward label */
export function rewardLabel(type: string, amount: string, tokenLimit?: number | null) {
    if (type === "LLM_KEY") return tokenLimit ? `LLM Key · ${(tokenLimit / 1_000_000).toFixed(1)}M tokens` : "LLM Key"
    return `$${Number(amount).toLocaleString()} ${type}`
}

/** CSS class for bounty status badge */
export function statusBadgeClass(status: string) {
    if (status === "live") return "text-green-400 border-green-500/30"
    if (status === "completed") return "text-muted-foreground border-muted"
    if (status === "cancelled") return "text-destructive border-destructive/30"
    return "text-yellow-400 border-yellow-500/30"
}

/** CSS class for submission status badge */
export function submissionStatusClass(status: string) {
    if (status === "approved") return "text-green-400 border-green-500/30"
    if (status === "rejected") return "text-destructive border-destructive/30"
    return "text-muted-foreground border-border"
}

/** Format deadline as relative time */
export function formatDeadline(iso: string) {
    const diff = new Date(iso).getTime() - Date.now()
    if (diff <= 0) return "Expired"
    const d = Math.floor(diff / 86400000)
    if (d > 0) return `${d}d left`
    const h = Math.floor(diff / 3600000)
    return `${h}h left`
}
