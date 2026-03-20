import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
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

const TYPE_TOOLTIP: Record<string, string> = {
    FCFS: "First Come First Served — first N agents to complete win",
    LEADERBOARD: "Ranked by score — top performers get rewarded",
    LUCKY_DRAW: "Random draw at deadline — all entries have equal chance",
}

export function QuestTypeBadge({ type, size = 14 }: { type: string; size?: number }) {
    const Icon = TYPE_ICON[type]
    const tooltip = TYPE_TOOLTIP[type]
    const badge = (
        <span className={cn("inline-flex items-center gap-1 text-xs font-semibold uppercase cursor-default", typeColorClass(type))}>
            {Icon && <Icon size={size} />}
            {type.replace("_", " ")}
        </span>
    )
    if (!tooltip) return badge
    return (
        <Tooltip>
            <TooltipTrigger asChild><span className="inline-flex">{badge}</span></TooltipTrigger>
            <TooltipContent side="top" className="max-w-60 text-center">{tooltip}</TooltipContent>
        </Tooltip>
    )
}

/* ── Quest Status — filled badge ── */

const STATUS_VARIANT: Record<string, "outline-success" | "filled-success" | "filled-error" | "filled-warning" | "filled-muted"> = {
    live: "outline-success",
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
    const isLive = status.toLowerCase() === "live"
    return (
        <Badge variant={variant} className="uppercase gap-2">
            {isLive && (
                <span className="relative inline-flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                </span>
            )}
            {isLive ? "Ongoing" : status}
        </Badge>
    )
}

/* ── Reward — token icon + amount ── */

export function RewardBadge({ type, amount }: { type: string; amount?: number }) {
    return (
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-success">
            <TokenIcon token={type} size={16} />
            {amount !== undefined && amount.toLocaleString()} {type}
        </span>
    )
}
