import { useState } from "react"
import { Link } from "@tanstack/react-router"
import type { Quest } from "@clawquest/shared"
import { AVATAR_COLORS, getInitials } from "./avatarUtils"
import { QuestersPopup } from "./QuestersPopup"

interface QuestCardProps {
    quest: Quest
}

function formatTimeLeft(expiresAt: string | null): { label: string; sublabel: string; cls: string } {
    if (!expiresAt) return { label: "—", sublabel: "", cls: "normal" }
    const diff = new Date(expiresAt).getTime() - Date.now()
    if (diff <= 0) return { label: "Ended", sublabel: "", cls: "urgent" }
    const totalMins = Math.floor(diff / 60000)
    const h = Math.floor(totalMins / 60)
    const m = totalMins % 60
    const d = Math.floor(h / 24)
    const remH = h % 24
    const mm = String(m).padStart(2, "0")
    const hh = String(remH).padStart(2, "0")
    if (h < 6) return { label: `${h}h:${mm}m`, sublabel: "remaining", cls: "urgent" }
    if (d < 2) return { label: `${h}h:${mm}m`, sublabel: "remaining", cls: "warning" }
    return { label: `${d}d:${hh}h:${mm}m`, sublabel: "remaining", cls: "normal" }
}

function typeBadgeClass(type: string) {
    const map: Record<string, string> = {
        FCFS: "badge-fcfs",
        LEADERBOARD: "badge-leaderboard",
        LUCKY_DRAW: "badge-luckydraw",
    }
    return map[type] ?? "badge-fcfs"
}


export interface QuesterDetail {
    agentName: string
    humanHandle: string
}

interface QuestersAvatarStackProps {
    details: QuesterDetail[]
    total: number
    onClick?: () => void
}

export function QuestersAvatarStack({ details, total, onClick }: QuestersAvatarStackProps) {
    if (total === 0) return null
    const displayed = details.slice(0, 5)
    const extra = total - displayed.length

    return (
        <div className="questers clickable" title={`${total} questers`} onClick={onClick}>
            {displayed.map((d, i) => (
                <div
                    key={d.agentName + i}
                    className="q-avatar"
                    style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                >
                    {getInitials(d.agentName)}
                    <div className="q-tip">
                        <span className="tip-label">Human</span> <span className="tip-human">@{d.humanHandle}</span>
                        <br />
                        <span className="tip-label">Agent</span> <span className="tip-agent">{d.agentName}</span>
                    </div>
                </div>
            ))}
            <span className="q-more">
                {extra > 0 ? <><strong>+{extra}</strong> more</> : <strong>{total} questers</strong>}
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
        <li className="quest-item">
            {/* Stats column */}
            <div className="quest-stats">
                <div className="quest-stat">
                    <span className="quest-stat-val reward">
                        {quest.rewardAmount.toLocaleString()} {quest.rewardType}
                    </span>
                    <span className="quest-stat-label">total reward</span>
                </div>
                {quest.questers > 0 && (
                    <div className="quest-stat">
                        <QuestersAvatarStack
                            details={quest.questerDetails ?? []}
                            total={quest.questers}
                            onClick={() => setShowPopup(true)}
                        />
                    </div>
                )}
                <div className="quest-stat">
                    {isLuckyDraw ? (
                        <>
                            <span className="quest-stat-val">{quest.filledSlots}</span>
                            <span className="quest-stat-label">entered</span>
                        </>
                    ) : (
                        <>
                            <span className="quest-stat-val" style={{ color: slotsLeft < 5 ? "var(--red)" : "var(--fg)" }}>
                                {slotsLeft}
                            </span>
                            <span className="quest-stat-label">slots left</span>
                        </>
                    )}
                </div>
            </div>

            {/* Body */}
            <div className="quest-body">
                <div className="quest-title">
                    <Link to="/quests/$questId" params={{ questId: quest.id }} className="quest-title-link">
                        {quest.title}
                    </Link>
                </div>
                <div className="quest-excerpt">{quest.description}</div>
                <div className="quest-meta">
                    {quest.tags && quest.tags.map(tag => (
                        <span key={tag} className="tag">{tag}</span>
                    ))}
                    <span className={`badge ${typeBadgeClass(quest.type)}`}>{quest.type}</span>
                    <span className="meta-sponsor">by <strong>{quest.sponsor}</strong></span>
                </div>
            </div>

            {/* Time column */}
            <div className="quest-time-col">
                <span className={`quest-time-val ${time.cls}`}>{time.label}</span>
                {time.sublabel && <span className="quest-time-label">{time.sublabel}</span>}
            </div>
        </li>
        </>
    )
}
