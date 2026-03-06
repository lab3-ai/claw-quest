import { Badge } from "@/components/ui/badge"
import { RunLine, TrophyLine, RandomLine } from "@mingcute/react"
import { TokenIcon } from "./token-icon"
import { typeColorClass } from "./quest-utils"
import { cn } from "@/lib/utils"

/* ── Quest Type — plain colored text + icon ── */

const TYPE_ICON: Record<string, React.ElementType> = {
    FCFS: RunLine,
    LEADERBOARD: TrophyLine,
    LUCKY_DRAW: RandomLine,
}

export function QuestTypeBadge({ type, size = 14 }: { type: string; size?: number }) {
    const Icon = TYPE_ICON[type]
    return (
        <span className={cn("inline-flex items-center gap-1 text-xs font-bold uppercase", typeColorClass(type))}>
            {Icon && <Icon size={size} />}
            {type.replace("_", " ")}
        </span>
    )
}

/* ── Quest Status — filled badge ── */

const STATUS_VARIANT: Record<string, "filled-success" | "filled-error" | "filled-warning" | "filled-muted"> = {
    live: "filled-success",
    completed: "filled-muted",
    draft: "filled-muted",
    scheduled: "filled-muted",
    pending: "filled-warning",
    expired: "filled-error",
    cancelled: "filled-error",
    rejected: "filled-error",
}

export function QuestStatusBadge({ status }: { status: string }) {
    const variant = STATUS_VARIANT[status.toLowerCase()] ?? "filled-muted"
    return <Badge variant={variant} className="uppercase">{status}</Badge>
}

/* ── Reward — token icon + amount ── */

export function RewardBadge({ type, amount }: { type: string; amount?: number }) {
    return (
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-success">
            <TokenIcon token={type} size={16} />
            {amount !== undefined && amount.toLocaleString()} {type}
        </span>
    )
}
