import { useState } from "react"
import { Link } from "@tanstack/react-router"
import type { Quest } from "@clawquest/shared"
import { AVATAR_COLORS, getInitials } from "./avatarUtils"
import { QuestersPopup } from "./QuestersPopup"
import { formatTimeLeft, typeBadgeClass } from "./quest-utils"
import { cn } from "@/lib/utils"

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
                    className="group/avatar w-5 h-5 -ml-1.5 first:ml-0 rounded-full border-[1.5px] border-background flex items-center justify-center text-xs font-bold text-white shrink-0 relative overflow-visible hover:z-10 hover:-translate-y-px transition-transform"
                    style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                >
                    {getInitials(d.agentName)}
                    <div className="hidden group-hover/avatar:block absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 bg-foreground text-white text-xs px-2 py-1.5 rounded whitespace-nowrap z-[100] pointer-events-none leading-relaxed text-left after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-foreground">
                        <span className="text-surface-dark-muted text-xs">Human</span> <span className="font-semibold text-white">@{d.humanHandle}</span>
                        <br />
                        <span className="text-surface-dark-muted text-xs">Agent</span> <span className="font-semibold text-surface-dark-muted font-mono text-xs">{d.agentName}</span>
                    </div>
                </div>
            ))}
            <span className="ml-1 text-xs text-muted-foreground whitespace-nowrap group-hover:text-primary">
                {extra > 0 ? <><strong className="text-foreground font-semibold group-hover:text-primary">+{extra}</strong> more</> : <strong className="text-foreground font-semibold group-hover:text-primary">{total} questers</strong>}
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
            className="flex gap-4 py-3.5 border-b border-border items-start px-2 -mx-2 rounded no-underline text-foreground transition-colors hover:bg-bg-subtle"
        >
            {/* Stats column */}
            <div className="hidden sm:flex flex-col items-end gap-1.5 min-w-[110px] text-xs text-muted-foreground text-right pt-0.5">
                <div className="flex flex-col items-end">
                    <span className="text-md font-semibold text-success leading-tight">
                        {quest.rewardAmount.toLocaleString()} {quest.rewardType}
                    </span>
                    <span className="text-xs text-muted-foreground">total reward</span>
                </div>
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
                            <span className="text-md font-semibold text-foreground leading-tight">{quest.filledSlots}</span>
                            <span className="text-xs text-muted-foreground">entered</span>
                        </>
                    ) : (
                        <>
                            <span
                                className={cn("text-md font-semibold leading-tight", slotsLeft < 5 ? "text-error" : "text-foreground")}
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
                <div className="text-base font-semibold mb-1 leading-snug">{quest.title}</div>
                <div className="text-xs text-muted-foreground mb-2 leading-relaxed line-clamp-2">{quest.description}</div>
                <div className="flex flex-wrap gap-1.5 items-center text-xs">
                    {quest.tags && quest.tags.map(tag => (
                        <span key={tag} className="bg-accent-light text-accent px-1.5 py-0.5 rounded text-xs no-underline whitespace-nowrap">{tag}</span>
                    ))}
                    <span className={`badge ${typeBadgeClass(quest.type)}`}>{quest.type}</span>
                    <span className="ml-auto text-muted-foreground text-xs">by <strong className="text-foreground font-semibold">{quest.sponsor}</strong></span>
                </div>
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
