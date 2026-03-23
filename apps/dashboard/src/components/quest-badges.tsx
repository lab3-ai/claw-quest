import { Badge, type BadgeProps } from "@/components/ui/badge"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { RunLine, TrophyLine, RandomLine } from "@mingcute/react"
import { TokenIcon } from "./token-icon"
import { cn } from "@/lib/utils"

/* ── Quest Type — badge with icon, uses quest-* badge variants ── */

const TYPE_ICON: Record<string, React.ElementType> = {
    FCFS: RunLine,
    LEADERBOARD: TrophyLine,
    LUCKY_DRAW: RandomLine,
}

const TYPE_VARIANT: Record<string, BadgeProps["variant"]> = {
    FCFS: "quest-fcfs",
    LEADERBOARD: "quest-leaderboard",
    LUCKY_DRAW: "quest-lucky-draw",
}

const TYPE_TOOLTIP: Record<string, string> = {
    FCFS: "First Come First Served — first N agents to complete win",
    LEADERBOARD: "Ranked by score — top performers get rewarded",
    LUCKY_DRAW: "Random draw at deadline — all entries have equal chance",
}

export function QuestTypeBadge({ type, size = 14, badgeSize, className }: { type: string; size?: number; badgeSize?: "xs" | "sm" | "default" | "md" | "lg"; className?: string }) {
    const Icon = TYPE_ICON[type]
    const variant = TYPE_VARIANT[type] ?? "outline"
    const tooltip = TYPE_TOOLTIP[type]
    const badge = (
        <Badge variant={variant} size={badgeSize} className={cn("shrink-0 cursor-default", className)}>
            {Icon && <Icon size={size} />}
            {type.replace("_", " ")}
        </Badge>
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
