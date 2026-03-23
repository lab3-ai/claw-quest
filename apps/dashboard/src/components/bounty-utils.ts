/** Shared utility functions for GitHub Bounty pages */

/** Badge variant for reward type — uses design system outline variants */
export function rewardBadgeVariant(type: string) {
    if (type === "LLM_KEY") return "outline-primary" as const
    if (type === "USDC") return "outline-success" as const
    return "outline-warning" as const
}

/** Human-readable reward label */
export function rewardLabel(type: string, amount: string, tokenLimit?: number | null) {
    if (type === "LLM_KEY") return tokenLimit ? `LLM Key · ${(tokenLimit / 1_000_000).toFixed(1)}M tokens` : "LLM Key"
    return `$${Number(amount).toLocaleString()} ${type}`
}

/** Badge variant for bounty status */
export function statusBadgeVariant(status: string) {
    if (status === "live") return "outline-success" as const
    if (status === "completed") return "outline-muted" as const
    if (status === "cancelled") return "outline-error" as const
    return "outline-warning" as const
}

/** Badge variant for submission status */
export function submissionStatusVariant(status: string) {
    if (status === "approved") return "outline-success" as const
    if (status === "rejected") return "outline-error" as const
    return "outline-muted" as const
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
