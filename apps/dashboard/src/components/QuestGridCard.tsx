import { useState, useEffect } from "react"
import { Link } from "@tanstack/react-router"
import type { Quest } from "@clawquest/shared"
import { formatTimeLeft, typeColorClass } from "./quest-utils"
import { SponsorLogo } from "./sponsor-logo"
import { RunLine, TrophyLine, RandomLine } from "@mingcute/react"
import { TokenIcon } from "./token-icon"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const TYPE_ICON: Record<string, React.ElementType> = {
    FCFS: RunLine,
    LEADERBOARD: TrophyLine,
    LUCKY_DRAW: RandomLine,
}

interface QuestGridCardProps {
    quest: Quest
}

export function QuestGridCard({ quest }: QuestGridCardProps) {
    const [, tick] = useState(0)
    const time = formatTimeLeft(quest.expiresAt)

    useEffect(() => {
        if (!time.ticking) return
        const id = setInterval(() => tick(n => n + 1), 1000)
        return () => clearInterval(id)
    }, [time.ticking])
    const isLuckyDraw = quest.type === "LUCKY_DRAW"
    const slotsLeft = isLuckyDraw ? null : quest.totalSlots - quest.filledSlots

    return (
        <Link
            to="/quests/$questId"
            params={{ questId: quest.id }}
            className="hover-shadow flex flex-col border border-border rounded p-4 max-sm:p-3 no-underline text-foreground hover:border-foreground bg-background"
        >
            {/* Top row: type badge + time */}
            <div className="flex justify-between items-center mb-3">
                <span className={cn("inline-flex items-center gap-1 text-xs max-sm:text-xs font-semibold uppercase", typeColorClass(quest.type))}>
                    {TYPE_ICON[quest.type] && (() => { const Icon = TYPE_ICON[quest.type]; return <Icon size={14} className="max-sm:w-3 max-sm:h-3" /> })()}
                    {quest.type}
                </span>
                <span className={cn(
                    "font-mono text-xs max-sm:text-xs font-semibold",
                    time.cls === "urgent" && "text-error",
                    time.cls === "warning" && "text-warning",
                    time.cls === "normal" && "text-muted-foreground",
                )}>{time.label}</span>
            </div>

            {/* Title */}
            <h3 className="text-md max-sm:text-sm font-semibold leading-snug mb-2 line-clamp-2">{quest.title}</h3>

            {/* Description excerpt */}
            <p className="flex-1 text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2">{quest.description}</p>

            {/* Tags */}
            {quest.tags && quest.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                    {quest.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="pill">{tag}</Badge>
                    ))}
                    {quest.tags.length > 3 && (
                        <span className="text-muted-foreground px-1 py-0.5 text-xs">+{quest.tags.length - 3}</span>
                    )}
                </div>
            )}

            {/* Bottom stats */}
            <div className="mt-auto pt-3 border-t border-border flex justify-between items-end gap-2">
                <div className="flex flex-col gap-1.5">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-success">
                        <TokenIcon token={quest.rewardType} size={16} />
                        {quest.rewardAmount.toLocaleString()} {quest.rewardType}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                        by <SponsorLogo sponsor={quest.sponsor} size={14} /> <strong className="text-foreground font-semibold">{quest.sponsor}</strong>
                    </span>
                </div>
                <div className="text-right text-muted-foreground h-full flex flex-col justify-center gap-auto">
                    {isLuckyDraw ? (
                        <span className="block text-sm font-semibold text-foreground">{quest.filledSlots} <span className="text-xs font-normal text-muted-foreground">entered</span></span>
                    ) : (
                        <span className={cn("block text-sm font-semibold", slotsLeft !== null && slotsLeft < 5 ? "text-error" : "text-foreground")}>
                            {slotsLeft} <span className="text-xs font-normal text-muted-foreground">slots</span>
                        </span>
                    )}
                    {quest.questers > 0 && (
                        <span className="block text-xs mt-0.5">{quest.questers} questers</span>
                    )}
                </div>
            </div>
        </Link>
    )
}
