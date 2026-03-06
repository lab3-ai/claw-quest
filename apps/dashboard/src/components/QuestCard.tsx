import { useState } from "react"
import { Link } from "@tanstack/react-router"
import type { Quest } from "@clawquest/shared"
import { getDiceBearUrl } from "./avatarUtils"
import { SponsorLogo } from "./sponsor-logo"
import { QuestersPopup } from "./QuestersPopup"
import { RunLine, TrophyLine, RandomLine } from "@mingcute/react"
import { formatTimeLeft, typeColorClass } from "./quest-utils"
import { TokenIcon } from "./token-icon"
import { cn } from "@/lib/utils"

const TYPE_ICON: Record<string, React.ElementType> = {
    FCFS: RunLine,
    LEADERBOARD: TrophyLine,
    LUCKY_DRAW: RandomLine,
}

interface QuestCardProps {
    quest: Quest
}


export interface QuesterDetail {
    agentName: string
    humanHandle: string
}

interface QuestersAvatarStackProps {
    details: QuesterDetail[]
    total: number
    onClick?: (e: React.MouseEvent) => void
}

export function QuestersAvatarStack({ details, total, onClick }: QuestersAvatarStackProps) {
    if (total === 0) return null
    const displayed = details.slice(0, 5)
    const extra = total - displayed.length

    return (
        <div
            className="flex items-center gap-0 cursor-pointer group"
            title={`${total} questers`}
            onClick={onClick}
        >
            {displayed.map((d, i) => (
                <div
                    key={d.agentName + i}
                    className="group/avatar w-5 h-5 -ml-1.5 first:ml-0 rounded-full border-[1.5px] border-background shrink-0 relative overflow-visible hover:z-10 hover:-translate-y-px transition-transform"
                >
                    <img
                        src={getDiceBearUrl(d.agentName, 40)}
                        alt={d.humanHandle}
                        className="w-full h-full rounded-full object-cover"
                    />
                    <div className="hidden group-hover/avatar:block absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 bg-foreground text-white text-xs px-2 py-1.5 rounded whitespace-nowrap z-100 pointer-events-none leading-relaxed text-left after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-foreground">
                        <span className="text-surface-dark-muted text-xs">Human</span> <span className="font-semibold text-white">@{d.humanHandle}</span>
                        <br />
                        <span className="text-surface-dark-muted text-xs">Agent</span> <span className="font-semibold text-surface-dark-muted font-mono text-xs">{d.agentName}</span>
                    </div>
                </div>
            ))}
            <span className="ml-1 text-xs text-muted-foreground whitespace-nowrap group-hover:text-primary">
                {extra > 0 ? <strong className="text-foreground font-semibold group-hover:text-primary">+{extra}</strong> : <strong className="text-foreground font-semibold group-hover:text-primary">{total}</strong>}
            </span>
        </div>
    )
}

export function QuestCard({ quest }: QuestCardProps) {
    const time = formatTimeLeft(quest.expiresAt)
    const isLuckyDraw = quest.type === "LUCKY_DRAW"
    const slotsLeft = isLuckyDraw ? Infinity : quest.totalSlots - quest.filledSlots
    const [showPopup, setShowPopup] = useState(false)

    return (
        <>
        {showPopup && (
            <QuestersPopup
                questId={quest.id}
                questTitle={quest.title}
                onClose={() => setShowPopup(false)}
            />
        )}
        <Link
            to="/quests/$questId"
            params={{ questId: quest.id }}
            className="hover-shadow flex gap-6 p-4 border border-border rounded items-start no-underline text-foreground hover:border-foreground bg-background"
        >
            {/* Stats column */}
            <div className="hidden sm:flex flex-col items-end gap-1.5 w-[140px] shrink-0 text-xs text-muted-foreground text-right pt-0.5">
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-success">
                    <TokenIcon token={quest.rewardType} size={16} />
                    {quest.rewardAmount.toLocaleString()} {quest.rewardType}
                </span>
                {quest.questers > 0 && (
                    <div className="flex flex-col items-end">
                        <QuestersAvatarStack
                            details={quest.questerDetails ?? []}
                            total={quest.questers}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowPopup(true) }}
                        />
                    </div>
                )}
                <div className="flex flex-col items-end">
                    {isLuckyDraw ? (
                        <>
                            <span className="text-sm font-semibold text-foreground leading-tight">{quest.filledSlots}</span>
                            <span className="text-xs text-muted-foreground">entered</span>
                        </>
                    ) : (
                        <>
                            <span
                                className={cn("text-sm font-semibold leading-tight", slotsLeft < 5 ? "text-error" : "text-foreground")}
                            >
                                {slotsLeft}
                            </span>
                            <span className="text-xs text-muted-foreground">slots left</span>
                        </>
                    )}
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 text-xs">
                    <span className={cn("inline-flex items-center gap-1 font-bold uppercase", typeColorClass(quest.type))}>
                        {TYPE_ICON[quest.type] && (() => { const Icon = TYPE_ICON[quest.type]; return <Icon size={14} /> })()}
                        {quest.type}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-border-heavy inline-block"></span>
                    <span className="text-muted-foreground inline-flex items-center gap-1">
                        by <SponsorLogo sponsor={quest.sponsor} size={14} /> <strong className="text-foreground font-semibold">{quest.sponsor}</strong>
                    </span>
                </div>
                <div className="text-base font-semibold mb-1 leading-snug">{quest.title}</div>
                <div className="text-sm text-muted-foreground mb-2 leading-relaxed line-clamp-2">{quest.description}</div>
                {quest.tags && quest.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 items-center text-xs">
                        {quest.tags.map(tag => (
                            <span key={tag} className="border border-border text-fg-secondary px-2 py-0.5 rounded text-xs no-underline whitespace-nowrap">{tag}</span>
                        ))}
                    </div>
                )}
            </div>

            {/* Time column */}
            <div className="hidden sm:flex flex-col items-end justify-start min-w-[100px] text-right pt-0.5 shrink-0">
                <span className={cn(
                    "font-mono text-sm font-semibold text-foreground leading-tight whitespace-nowrap",
                    time.cls === "urgent" && "text-error",
                    time.cls === "warning" && "text-warning",
                )}>{time.label}</span>
                {time.sublabel && <span className="text-xs text-muted-foreground mt-0.5">{time.sublabel}</span>}
            </div>
        </Link>
        </>
    )
}
