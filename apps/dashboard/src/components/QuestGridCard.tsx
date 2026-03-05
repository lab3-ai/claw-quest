import { Link } from "@tanstack/react-router"
import type { Quest } from "@clawquest/shared"
import { formatTimeLeft, typeBadgeClass } from "./quest-utils"
import { cn } from "@/lib/utils"

interface QuestGridCardProps {
    quest: Quest
}

export function QuestGridCard({ quest }: QuestGridCardProps) {
    const time = formatTimeLeft(quest.expiresAt)
    const isLuckyDraw = quest.type === "LUCKY_DRAW"
    const slotsLeft = isLuckyDraw ? null : quest.totalSlots - quest.filledSlots

    return (
        <Link
            to="/quests/$questId"
            params={{ questId: quest.id }}
            className="hover-shadow flex flex-col border border-border rounded p-4 no-underline text-foreground hover:border-foreground bg-background"
        >
            {/* Top row: type badge + time */}
            <div className="flex justify-between items-center mb-3">
                <span className={`badge ${typeBadgeClass(quest.type)}`}>{quest.type}</span>
                <span className={cn(
                    "font-mono text-xs font-semibold",
                    time.cls === "urgent" && "text-error",
                    time.cls === "warning" && "text-warning",
                    time.cls === "normal" && "text-muted-foreground",
                )}>{time.label}</span>
            </div>

            {/* Title */}
            <h3 className="text-md font-semibold leading-snug mb-2 line-clamp-2">{quest.title}</h3>

            {/* Description excerpt */}
            <p className="text-sm text-muted-foreground leading-relaxed mb-3 line-clamp-2">{quest.description}</p>

            {/* Tags */}
            {quest.tags && quest.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                    {quest.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="bg-accent-light text-accent px-1.5 py-0.5 rounded text-xs no-underline whitespace-nowrap hover:bg-accent-light/80">{tag}</span>
                    ))}
                    {quest.tags.length > 3 && (
                        <span className="bg-transparent text-muted-foreground px-1 py-0.5 text-xs">+{quest.tags.length - 3}</span>
                    )}
                </div>
            )}

            {/* Bottom stats */}
            <div className="mt-auto pt-3 border-t border-border flex justify-between items-end gap-2">
                <div>
                    <span className="text-sm font-semibold text-success leading-tight">
                        {quest.rewardAmount.toLocaleString()} {quest.rewardType}
                    </span>
                    <span className="text-xs text-muted-foreground block mt-0.5">by {quest.sponsor}</span>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                    {isLuckyDraw ? (
                        <span className="block font-medium">{quest.filledSlots} entered</span>
                    ) : (
                        <span className={cn("block font-medium", slotsLeft !== null && slotsLeft < 5 && "text-error")}>
                            {slotsLeft} slots
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
