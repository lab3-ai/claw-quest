import { useState, useEffect, useRef, useCallback } from "react"
import { toast } from 'sonner'
import { Link, useNavigate, useSearch } from "@tanstack/react-router"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/context/AuthContext"
import { QuestersPopup } from "@/components/QuestersPopup"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { QuestTypeBadge } from "@/components/quest-badges"
import { cn } from "@/lib/utils"
import { PageTitle } from "@/components/page-title"
import { TokenIcon } from "@/components/token-icon"
import { SponsorLogo } from "@/components/sponsor-logo"
import { formatTimeShort, typeColorClass } from "@/components/quest-utils"
import { RunLine, TrophyLine, RandomLine } from "@mingcute/react"
import type { Quest } from "@clawquest/shared"
import { FUNDING_STATUS } from "@clawquest/shared"

type MineQuest = Quest & { fundingStatus?: string; previewToken?: string }

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

// ─── Mock data for design preview (when auth is unavailable) ─────────────────
const HOUR = 3_600_000
const DAY = 24 * HOUR
const MOCK_MY_QUESTS: MineQuest[] = [
    {
        id: "mock-1", title: "Bridge 100 USDC to Arbitrum via Stargate",
        description: "Complete a cross-chain bridge transaction of at least 100 USDC from Ethereum mainnet to Arbitrum using the Stargate Finance protocol.",
        sponsor: "Stargate", type: "FCFS", status: "live", rewardAmount: 500, rewardType: "USDC",
        totalSlots: 200, filledSlots: 142, tags: ["DeFi", "Bridge", "Arbitrum"],
        expiresAt: new Date(Date.now() + 5 * DAY).toISOString(), tasks: [{id:"1",type:"onchain",title:"Bridge USDC"},{id:"2",type:"social",title:"Tweet"}],
        questers: 142, questerDetails: [{agentName:"CryptoHunter"},{agentName:"DeFiBot"},{agentName:"AlphaAgent"}],
        fundingStatus: "confirmed", createdAt: new Date(Date.now() - 3 * DAY).toISOString(),
    } as any,
    {
        id: "mock-2", title: "Provide Liquidity on Uniswap V3 — ETH/USDC Pool",
        description: "Add at least $500 worth of liquidity to the ETH/USDC pool on Uniswap V3. Maintain position for minimum 7 days.",
        sponsor: "Uniswap", type: "LEADERBOARD", status: "live", rewardAmount: 2000, rewardType: "USDC",
        totalSlots: 50, filledSlots: 31, tags: ["DeFi", "Liquidity"],
        expiresAt: new Date(Date.now() + 14 * DAY).toISOString(), tasks: [{id:"1",type:"onchain",title:"Add LP"},{id:"2",type:"verify",title:"Hold 7d"},{id:"3",type:"social",title:"Share"}],
        questers: 31, questerDetails: [{agentName:"SwapMaster"},{agentName:"TokenScout"}],
        fundingStatus: "confirmed", createdAt: new Date(Date.now() - 7 * DAY).toISOString(),
    } as any,
    {
        id: "mock-3", title: "Lucky Draw — Mint ClawQuest Genesis NFT",
        description: "Mint a ClawQuest Genesis NFT on Base chain to enter the lucky draw. 10 random winners will receive 100 USDC each.",
        sponsor: "ClawQuest", type: "LUCKY_DRAW", status: "live", rewardAmount: 1000, rewardType: "USDC",
        totalSlots: 500, filledSlots: 287, tags: ["NFT", "Base", "Lucky Draw"],
        expiresAt: new Date(Date.now() + 3 * DAY).toISOString(), tasks: [{id:"1",type:"onchain",title:"Mint NFT"}],
        questers: 287, questerDetails: [{agentName:"BountySeeker"},{agentName:"ChainWalker"},{agentName:"QuestRunner"}],
        fundingStatus: "confirmed", createdAt: new Date(Date.now() - 2 * DAY).toISOString(),
    } as any,
    {
        id: "mock-4", title: "Test & Review Aave V4 Lending Protocol",
        description: "Deposit assets into Aave V4 testnet, borrow against collateral, and write a detailed review.",
        sponsor: "Aave", type: "FCFS", status: "draft", rewardAmount: 300, rewardType: "USDC",
        totalSlots: 100, filledSlots: 0, tags: ["DeFi", "Lending", "Testing"],
        expiresAt: null, tasks: [{id:"1",type:"onchain",title:"Deposit"},{id:"2",type:"content",title:"Write review"}],
        questers: 0, questerDetails: [],
        fundingStatus: "unfunded", createdAt: new Date(Date.now() - 1 * DAY).toISOString(),
    } as any,
]
const MOCK_ACCEPTED_QUESTS: MineQuest[] = [
    {
        id: "mock-a1", title: "Swap on 1inch — Best Price Aggregator Challenge",
        description: "Execute 5 swaps on 1inch across different token pairs.",
        sponsor: "1inch", type: "LEADERBOARD", status: "live", rewardAmount: 750, rewardType: "USDC",
        totalSlots: 300, filledSlots: 189, tags: ["DeFi", "DEX", "Trading"],
        expiresAt: new Date(Date.now() + 7 * DAY).toISOString(), tasks: [{id:"1",type:"onchain",title:"Execute swaps"},{id:"2",type:"content",title:"Report"}],
        questers: 189, questerDetails: [{agentName:"TradeBot"},{agentName:"SwapKing"}],
        createdAt: new Date(Date.now() - 5 * DAY).toISOString(),
    } as any,
    {
        id: "mock-a2", title: "Deploy a Smart Contract on Scroll zkEVM",
        description: "Deploy any smart contract on Scroll mainnet. Verified contract on Scrollscan required.",
        sponsor: "Scroll", type: "FCFS", status: "live", rewardAmount: 400, rewardType: "USDC",
        totalSlots: 150, filledSlots: 67, tags: ["zkEVM", "Scroll", "Smart Contract"],
        expiresAt: new Date(Date.now() + 10 * DAY).toISOString(), tasks: [{id:"1",type:"onchain",title:"Deploy"},{id:"2",type:"social",title:"Tweet"}],
        questers: 67, questerDetails: [{agentName:"CodeRunner"},{agentName:"DeployAgent"}],
        createdAt: new Date(Date.now() - 4 * DAY).toISOString(),
    } as any,
    {
        id: "mock-a3", title: "Stake ETH on Lido & Earn stETH Rewards",
        description: "Stake at least 0.1 ETH on Lido Finance. Hold stETH for 14 days to qualify.",
        sponsor: "Lido", type: "LEADERBOARD", status: "live", rewardAmount: 1500, rewardType: "USDC",
        totalSlots: 100, filledSlots: 78, tags: ["Staking", "ETH"],
        expiresAt: new Date(Date.now() + 2 * DAY + 4 * HOUR).toISOString(), tasks: [{id:"1",type:"onchain",title:"Stake ETH"},{id:"2",type:"verify",title:"Hold"}],
        questers: 78, questerDetails: [{agentName:"StakeBot"},{agentName:"EthHodler"}],
        createdAt: new Date(Date.now() - 10 * DAY).toISOString(),
    } as any,
]

// ─── Types ────────────────────────────────────────────────────────────────────

type QuestFilter = "all" | "draft" | "live" | "scheduled" | "completed"
type AcceptedFilter = "all" | "active" | "ended"
type MainTab = "my-quest" | "accepted"
type View = "grid" | "compact"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRewardLabel(rewardType: string): string {
    if (rewardType === "LLMTOKEN_OPENROUTER" || rewardType === "LLM_KEY") return "LLM Tokens"
    return rewardType
}

function getPublishErrors(quest: MineQuest): Record<string, string> {
    const errors: Record<string, string> = {}
    if (!quest.title?.trim()) errors.title = 'Title required'
    if (!quest.description?.trim()) errors.description = 'Description required'
    if (!quest.rewardAmount || quest.rewardAmount <= 0) errors.rewardAmount = 'Reward required'
    if (!quest.totalSlots || quest.totalSlots <= 0) errors.totalSlots = 'Slots required'
    const tasks = (quest.tasks as any[]) ?? []
    if (tasks.length === 0) errors.tasks = 'Tasks required'
    if (quest.fundingStatus !== FUNDING_STATUS.CONFIRMED) errors.funding = 'Funding required'
    return errors
}

function getDraftCompletion(quest: MineQuest): { done: number; total: number } {
    const checks = [
        !!quest.title?.trim(),
        !!quest.description?.trim(),
        quest.rewardAmount > 0,
        ((quest.tasks as any[]) ?? []).length > 0,
        !!quest.expiresAt,
    ]
    return { done: checks.filter(Boolean).length, total: checks.length }
}

// ─── View Toggle ─────────────────────────────────────────────────────────────

interface ViewToggleProps {
    view: View
    onChange: (v: View) => void
}

function ViewToggle({ view, onChange }: ViewToggleProps) {
    const viewRefs = useRef<Record<string, HTMLButtonElement | null>>({})
    const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 })

    const updateIndicator = useCallback(() => {
        const el = viewRefs.current[view]
        if (el) setIndicatorStyle({ left: el.offsetLeft, width: el.offsetWidth })
    }, [view])

    useEffect(() => { updateIndicator() }, [updateIndicator])
    useEffect(() => {
        document.fonts.ready.then(updateIndicator)
        window.addEventListener("resize", updateIndicator)
        return () => window.removeEventListener("resize", updateIndicator)
    }, [updateIndicator])

    return (
        <div className="relative inline-flex border border-border-2 p-0.5 gap-0.5 rounded-button overflow-hidden shrink-0">
            <span
                className="absolute top-0.5 bottom-0.5 rounded-button bg-bg-3 transition-all duration-200 ease-out z-0"
                style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
            />
            <button
                ref={(el) => { viewRefs.current["grid"] = el }}
                className={cn(
                    "relative z-10 flex items-center justify-center w-7 h-7 cursor-pointer border-none [&_svg]:w-3.5 [&_svg]:h-3.5 transition-colors duration-150",
                    view === "grid" ? "text-fg-1" : "text-fg-3 hover:text-fg-1",
                )}
                onClick={() => onChange("grid")}
                title="Grid view"
            >
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="1" y="1" width="6" height="6" rx="1" />
                    <rect x="9" y="1" width="6" height="6" rx="1" />
                    <rect x="1" y="9" width="6" height="6" rx="1" />
                    <rect x="9" y="9" width="6" height="6" rx="1" />
                </svg>
            </button>
            <button
                ref={(el) => { viewRefs.current["compact"] = el }}
                className={cn(
                    "relative z-10 flex items-center justify-center w-7 h-7 cursor-pointer border-none [&_svg]:w-3.5 [&_svg]:h-3.5 transition-colors duration-150",
                    view === "compact" ? "text-fg-1" : "text-fg-3 hover:text-fg-1",
                )}
                onClick={() => onChange("compact")}
                title="Compact view"
            >
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <line x1="1" y1="2" x2="15" y2="2" />
                    <line x1="1" y1="5.5" x2="15" y2="5.5" />
                    <line x1="1" y1="9" x2="15" y2="9" />
                    <line x1="1" y1="12.5" x2="15" y2="12.5" />
                </svg>
            </button>
        </div>
    )
}

// ─── Quest Card (dashboard-specific, has action buttons) ─────────────────────

interface DashboardQuestCardProps {
    quest: MineQuest
    onPopup: (q: { id: string; title: string }) => void
    onPublish: (id: string) => void
    isOwned?: boolean
}

function DashboardQuestCard({ quest, onPopup, onPublish, isOwned = false }: DashboardQuestCardProps) {
    const isDraft = quest.status === "draft"
    const time = formatTimeShort(quest.expiresAt ?? null)
    const slotsLeft = quest.totalSlots - quest.filledSlots
    const titleLinkProps = isDraft && (quest as any).previewToken
        ? { to: "/quests/$questId" as const, params: { questId: quest.id }, search: { token: (quest as any).previewToken } }
        : { to: "/quests/$questId" as const, params: { questId: quest.id } }

    return (
        <div className={cn(
            "flex flex-col border border-border-2 rounded bg-bg-1 hover:border-fg-1 transition-colors",
            isDraft && "border-dashed opacity-80 hover:opacity-100",
        )}>
            {/* Card body — mimics QuestGridCard layout */}
            <div className="flex flex-col flex-1 p-4 max-sm:p-3">
                {/* Reward + Time */}
                <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
                        <TokenIcon token={quest.rewardType} size={16} />
                        {quest.rewardAmount.toLocaleString()} {formatRewardLabel(quest.rewardType)}
                    </span>
                    {quest.expiresAt ? (
                        <span className={cn(
                            "font-mono text-xs font-normal tracking-wide",
                            time.cls === "urgent" && "text-error",
                            time.cls === "warning" && "text-warning",
                            time.cls === "normal" && "text-fg-3",
                            time.cls === "muted" && "text-fg-3",
                        )}>
                            {time.label}
                        </span>
                    ) : isDraft ? (
                        <Badge variant="filled-muted" className="text-2xs">Draft</Badge>
                    ) : null}
                </div>

                {/* Title */}
                <Link {...titleLinkProps} className="no-underline text-fg-1 hover:text-primary">
                    <h3 className="text-md font-semibold leading-snug mb-1.5 line-clamp-2">{quest.title}</h3>
                </Link>

                {/* Description */}
                <p className="flex-1 text-xs text-fg-3 leading-relaxed mb-3 line-clamp-2 overflow-hidden">
                    {quest.description}
                </p>

                {/* Type + tags */}
                <div className="flex gap-1 mb-4 items-center overflow-hidden">
                    <QuestTypeBadge type={quest.type} />
                    {quest.tags?.slice(0, 2).map(tag => (
                        <Badge key={tag} variant="pill">{tag}</Badge>
                    ))}
                    {(quest.tags?.length ?? 0) > 2 && (
                        <span className="text-fg-3 px-1 text-xs">+{quest.tags!.length - 2}</span>
                    )}
                </div>

                {/* Progress bar */}
                {!isDraft && (
                    <div className="flex flex-col gap-1 mb-3">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-fg-3">
                                <strong className="text-fg-1">{quest.filledSlots.toLocaleString()}</strong>
                                /{quest.totalSlots.toLocaleString()} slots
                            </span>
                            <span className={cn("font-semibold text-fg-1", slotsLeft < 5 && "text-error")}>
                                {slotsLeft} left
                            </span>
                        </div>
                        <div className="flex gap-px w-full">
                            {Array.from({ length: 10 }, (_, i) => {
                                const pct = quest.totalSlots > 0 ? (quest.filledSlots / quest.totalSlots) * 100 : 0
                                const segThreshold = (i + 1) * 10
                                const filled = pct >= segThreshold
                                const partial = !filled && pct > i * 10
                                return (
                                    <div key={i} className="flex-1 h-1.5 bg-bg-3 overflow-hidden">
                                        {(filled || partial) && (
                                            <div
                                                className="h-full bg-primary"
                                                style={{ width: partial ? `${((pct - i * 10) / 10) * 100}%` : "100%" }}
                                            />
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {isDraft && (() => {
                    const comp = getDraftCompletion(quest)
                    return (
                        <div className="flex flex-col gap-1 mb-3">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-fg-3">Setup progress</span>
                                <span className="text-fg-1 font-semibold">{comp.done}/{comp.total}</span>
                            </div>
                            <div className="flex gap-px w-full">
                                {Array.from({ length: comp.total }, (_, i) => (
                                    <div key={i} className={cn("flex-1 h-1.5", i < comp.done ? "bg-primary" : "bg-bg-3")} />
                                ))}
                            </div>
                        </div>
                    )
                })()}

                {/* Sponsor + questers */}
                <div className="flex items-center justify-between border-t border-border-2 pt-3 mt-auto">
                    <span className="text-xs text-fg-3 flex items-center gap-1.5 leading-none">
                        by <SponsorLogo sponsor={quest.sponsor} size={14} />{" "}
                        <strong className="text-fg-1 font-semibold">{quest.sponsor}</strong>
                    </span>
                    {quest.questers > 0 && (
                        <button
                            className="text-xs text-fg-3 hover:text-primary cursor-pointer"
                            onClick={() => onPopup({ id: quest.id, title: quest.title })}
                        >
                            <strong className="text-fg-1">{quest.questers}</strong> questers
                        </button>
                    )}
                </div>
            </div>

            {/* Action bar */}
            {isOwned && (
                <div className="flex gap-1.5 px-4 pb-3 max-sm:px-3">
                    {isDraft ? (() => {
                        const errors = getPublishErrors(quest)
                        const canPublish = Object.keys(errors).length === 0
                        return (
                            <>
                                <Button asChild size="sm" variant="secondary" className="flex-1">
                                    <Link to="/quests/$questId/edit" params={{ questId: quest.id }}>Continue Editing</Link>
                                </Button>
                                <Button
                                    size="sm"
                                    className="flex-1"
                                    disabled={!canPublish}
                                    title={canPublish ? "Publish quest" : `Missing: ${Object.values(errors).join(", ")}`}
                                    onClick={() => onPublish(quest.id)}
                                >
                                    Publish
                                </Button>
                            </>
                        )
                    })() : quest.status === "scheduled" ? (
                        <>
                            <Button asChild size="sm" variant="secondary" className="flex-1">
                                <Link to="/quests/$questId/edit" params={{ questId: quest.id }}>Edit</Link>
                            </Button>
                            <Button asChild size="sm" className="flex-1">
                                <Link to="/quests/$questId/manage" params={{ questId: quest.id }}>Manage</Link>
                            </Button>
                        </>
                    ) : (
                        <Button asChild size="sm" variant="secondary" className="flex-1">
                            <Link to="/quests/$questId/manage" params={{ questId: quest.id }}>Manage</Link>
                        </Button>
                    )}
                </div>
            )}

            {!isOwned && (
                <div className="flex gap-1.5 px-4 pb-3 max-sm:px-3">
                    <Button asChild size="sm" variant="secondary" className="flex-1">
                        <Link to="/quests/$questId" params={{ questId: quest.id }}>View Quest</Link>
                    </Button>
                </div>
            )}
        </div>
    )
}

// ─── Compact table rows ───────────────────────────────────────────────────────

interface CompactTableProps {
    quests: MineQuest[]
    emptyMessage: string
    isOwned?: boolean
    onPopup: (q: { id: string; title: string }) => void
    onPublish?: (id: string) => void
}

function CompactTable({ quests, emptyMessage, isOwned = false, onPopup, onPublish }: CompactTableProps) {
    const navigate = useNavigate()
    return (
        <div className="block overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[640px] border border-border-2 border-b-0 rounded bg-bg-1 overflow-hidden border-separate border-spacing-0">
                <thead>
                    <tr>
                        <th className="text-left px-4 py-3 text-xs font-normal text-fg-3 uppercase tracking-wide border-b border-border-2 bg-transparent whitespace-nowrap cursor-default select-none min-w-60">Name</th>
                        <th className="text-left px-4 py-3 text-xs font-normal text-fg-3 uppercase tracking-wide border-b border-border-2 bg-transparent whitespace-nowrap cursor-default select-none min-w-36">Reward</th>
                        <th className="text-left px-4 py-3 text-xs font-normal text-fg-3 uppercase tracking-wide border-b border-border-2 bg-transparent whitespace-nowrap cursor-default select-none">Type</th>
                        <th className="text-left px-4 py-3 text-xs font-normal text-fg-3 uppercase tracking-wide border-b border-border-2 bg-transparent whitespace-nowrap cursor-default select-none">Questers</th>
                        <th className="text-right px-4 py-3 text-xs font-normal text-fg-3 uppercase tracking-wide border-b border-border-2 bg-transparent whitespace-nowrap cursor-default select-none">Slots</th>
                        <th className="text-right px-4 py-3 text-xs font-normal text-fg-3 uppercase tracking-wide border-b border-border-2 bg-transparent whitespace-nowrap cursor-default select-none">Time Left</th>
                        {(isOwned || true) && (
                            <th className="text-right px-4 py-3 text-xs font-normal text-fg-3 uppercase tracking-wide border-b border-border-2 bg-transparent whitespace-nowrap cursor-default select-none">Actions</th>
                        )}
                    </tr>
                </thead>
                <tbody>
                    {quests.length === 0 ? (
                        <tr>
                            <td colSpan={7} className="px-4 py-8 text-xs border-b border-border-2 text-center text-fg-3">{emptyMessage}</td>
                        </tr>
                    ) : quests.map(quest => {
                        const time = formatTimeShort(quest.expiresAt ?? null)
                        const isDraft = quest.status === "draft"
                        const titleLinkProps = isDraft && (quest as any).previewToken
                            ? { to: "/quests/$questId" as const, params: { questId: quest.id }, search: { token: (quest as any).previewToken } }
                            : { to: "/quests/$questId" as const, params: { questId: quest.id } }

                        return (
                            <tr
                                key={quest.id}
                                className={cn("hover:bg-bg-2 transition-colors cursor-pointer", isDraft && "opacity-75")}
                                onClick={() => navigate({ to: "/quests/$questId", params: { questId: quest.id } })}
                            >
                                <td className="px-4 pt-4 pb-4 text-xs border-b border-border-2 align-top min-w-60">
                                    <Link {...titleLinkProps} className="text-base font-semibold leading-snug no-underline text-fg-1 hover:text-primary font-heading" onClick={e => e.stopPropagation()}>
                                        {quest.title}
                                    </Link>
                                    <div className="text-xs text-fg-3 inline-flex items-center mt-1 gap-1">
                                        by <SponsorLogo sponsor={quest.sponsor} size={14} />{" "}
                                        <strong className="text-fg-1 font-semibold">{quest.sponsor}</strong>
                                        {isDraft && <Badge variant="filled-muted" className="ml-1 text-2xs">Draft</Badge>}
                                    </div>
                                </td>
                                <td className="px-4 py-4 text-xs border-b border-border-2 align-top whitespace-nowrap">
                                    <span className="inline-flex items-center gap-2 text-sm font-semibold whitespace-nowrap">
                                        <TokenIcon token={quest.rewardType} size={16} />
                                        {quest.rewardAmount.toLocaleString()} {formatRewardLabel(quest.rewardType)}
                                    </span>
                                </td>
                                <td className="px-4 py-4 text-xs border-b border-border-2 align-top">
                                    <span className={cn("inline-flex items-center gap-1 text-xs font-semibold uppercase", typeColorClass(quest.type))}>
                                        {quest.type === "FCFS" && <RunLine size={14} />}
                                        {quest.type === "LEADERBOARD" && <TrophyLine size={14} />}
                                        {quest.type === "LUCKY_DRAW" && <RandomLine size={14} />}
                                        {quest.type}
                                    </span>
                                </td>
                                <td className="px-4 py-4 text-xs border-b border-border-2 align-top whitespace-nowrap">
                                    {quest.questers > 0 ? (
                                        <button
                                            className="text-xs text-fg-3 hover:text-primary cursor-pointer"
                                            onClick={e => { e.stopPropagation(); onPopup({ id: quest.id, title: quest.title }) }}
                                        >
                                            <strong className="text-fg-1">{quest.questers}</strong> questers
                                        </button>
                                    ) : (
                                        <span className="text-xs text-fg-3">—</span>
                                    )}
                                </td>
                                <td className="px-4 py-4 text-xs border-b border-border-2 align-top text-right">
                                    {quest.totalSlots - quest.filledSlots}
                                </td>
                                <td className="px-4 py-4 text-xs border-b border-border-2 align-top text-right">
                                    <div className={cn(
                                        "font-mono text-xs whitespace-nowrap",
                                        time.cls === "warning" && "text-warning",
                                        time.cls === "urgent" && "text-error",
                                        time.cls === "normal" && "text-fg-1",
                                        time.cls === "muted" && "text-fg-3 font-normal",
                                    )}>
                                        {time.label}
                                    </div>
                                </td>
                                <td className="px-4 py-4 text-xs border-b border-border-2 align-top text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                                    {isOwned ? (
                                        isDraft ? (() => {
                                            const errors = getPublishErrors(quest)
                                            const canPublish = Object.keys(errors).length === 0
                                            return (
                                                <div className="flex gap-1.5 justify-end">
                                                    <Button asChild size="sm" variant="secondary">
                                                        <Link to="/quests/$questId/edit" params={{ questId: quest.id }}>Edit</Link>
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        disabled={!canPublish}
                                                        title={canPublish ? "Publish" : `Missing: ${Object.values(errors).join(", ")}`}
                                                        onClick={() => onPublish?.(quest.id)}
                                                    >
                                                        Publish
                                                    </Button>
                                                </div>
                                            )
                                        })() : quest.status === "scheduled" ? (
                                            <div className="flex gap-1.5 justify-end">
                                                <Button asChild size="sm" variant="secondary">
                                                    <Link to="/quests/$questId/edit" params={{ questId: quest.id }}>Edit</Link>
                                                </Button>
                                                <Button asChild size="sm">
                                                    <Link to="/quests/$questId/manage" params={{ questId: quest.id }}>Manage</Link>
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button asChild size="sm" variant="secondary">
                                                <Link to="/quests/$questId/manage" params={{ questId: quest.id }}>Manage</Link>
                                            </Button>
                                        )
                                    ) : (
                                        <Button asChild size="sm" variant="secondary">
                                            <Link to="/quests/$questId" params={{ questId: quest.id }}>View</Link>
                                        </Button>
                                    )}
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}

// ─── Loading skeletons ────────────────────────────────────────────────────────

function GridSkeleton() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="flex flex-col border border-border-2 rounded p-4 pointer-events-none">
                    <div className="flex justify-between items-center mb-3">
                        <div className="animate-pulse bg-bg-3 rounded w-[70px] h-5" />
                        <div className="animate-pulse bg-bg-3 rounded w-[50px] h-4" />
                    </div>
                    <div className="animate-pulse bg-bg-3 rounded w-4/5 h-4 mb-2" />
                    <div className="animate-pulse bg-bg-3 rounded w-full h-3 mb-1.5" />
                    <div className="animate-pulse bg-bg-3 rounded w-3/5 h-3 mb-3" />
                    <div className="flex gap-1 mb-3">
                        <div className="animate-pulse bg-bg-3 rounded w-[50px] h-5" />
                        <div className="animate-pulse bg-bg-3 rounded w-[40px] h-5" />
                    </div>
                    <div className="mt-auto pt-3 border-t border-border-2 flex justify-between items-end">
                        <div className="animate-pulse bg-bg-3 rounded w-[80px] h-4" />
                        <div className="animate-pulse bg-bg-3 rounded w-[50px] h-4" />
                    </div>
                </div>
            ))}
        </div>
    )
}

function CompactSkeleton() {
    return (
        <div className="block">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex gap-4 py-4 border-b border-border-2 items-start pointer-events-none">
                    <div className="flex-1 min-w-0">
                        <div className="animate-pulse bg-bg-3 rounded w-3/5 h-4 mb-2" />
                        <div className="animate-pulse bg-bg-3 rounded w-[90%] h-3 mb-3" />
                        <div className="animate-pulse bg-bg-3 rounded w-2/5 h-3" />
                    </div>
                    <div className="hidden sm:flex flex-col items-end min-w-[100px] pt-0.5 shrink-0">
                        <div className="animate-pulse bg-bg-3 rounded w-[70px] h-[18px]" />
                    </div>
                </div>
            ))}
        </div>
    )
}

// ─── Sub filter bar ───────────────────────────────────────────────────────────

interface SubFilterBarProps<T extends string> {
    filters: T[]
    active: T
    counts: Record<T, number>
    onChange: (f: T) => void
    view: View
    onViewChange: (v: View) => void
}

function SubFilterBar<T extends string>({ filters, active, counts, onChange }: Omit<SubFilterBarProps<T>, 'view' | 'onViewChange'>) {
    return (
        <div className="flex items-center gap-1.5 py-3 flex-wrap">
            {filters.map(f => (
                counts[f] > 0 ? (
                    <button
                        key={f}
                        className={cn(
                            "cursor-pointer px-3 py-1 text-xs whitespace-nowrap rounded border transition-colors",
                            active === f
                                ? "border-fg-1 bg-fg-1 text-bg-1 font-semibold"
                                : "border-border-2 bg-transparent text-fg-3 hover:text-fg-1 hover:border-fg-3"
                        )}
                        onClick={() => onChange(f)}
                    >
                        {counts[f]} {f}
                    </button>
                ) : null
            ))}
        </div>
    )
}

// ─── Component ───────────────────────────────────────────────────────────────

export function Dashboard() {
    const { session, user, isAuthenticated, isLoading } = useAuth()
    const queryClient = useQueryClient()
    const navigate = useNavigate()

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            navigate({ to: '/login' })
        }
    }, [isLoading, isAuthenticated, navigate])

    const search = useSearch({ strict: false }) as { tab?: string }
    const mainTab: MainTab = search.tab === "accepted" ? "accepted" : "my-quest"

    const setMainTab = (tab: MainTab) => {
        navigate({
            to: "/dashboard",
            search: tab === "my-quest" ? {} : { tab },
            replace: true,
        })
    }

    const [questFilter, setQuestFilter] = useState<QuestFilter>("all")
    const [acceptedFilter, setAcceptedFilter] = useState<AcceptedFilter>("all")
    const [view, setView] = useState<View>("grid")
    const [popupQuest, setPopupQuest] = useState<{ id: string; title: string } | null>(null)

    const hasToken = !!session?.access_token
    const { data: quests = [], isLoading: questsLoading } = useQuery<MineQuest[]>({
        queryKey: ["my-quests", hasToken],
        queryFn: async () => {
            if (!hasToken) return MOCK_MY_QUESTS
            const res = await fetch(`${API_BASE}/quests/mine`, {
                headers: { Authorization: `Bearer ${session!.access_token}` },
            })
            if (!res.ok) return MOCK_MY_QUESTS
            const data = await res.json()
            return data.length > 0 ? data : MOCK_MY_QUESTS
        },
    })

    const acceptedQuests = useQuery<MineQuest[]>({
        queryKey: ["accepted-quests", hasToken],
        queryFn: async () => {
            if (!hasToken) return MOCK_ACCEPTED_QUESTS
            const res = await fetch(`${API_BASE}/quests/accepted`, {
                headers: { Authorization: `Bearer ${session!.access_token}` },
            })
            if (!res.ok) return MOCK_ACCEPTED_QUESTS
            const data = await res.json()
            return data.length > 0 ? data : MOCK_ACCEPTED_QUESTS
        },
    })

    async function handlePublish(questId: string) {
        if (!confirm('Publish this quest? It will become visible to agents.')) return
        const res = await fetch(`${API_BASE}/quests/${questId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
            body: JSON.stringify({ status: 'live' }),
        })
        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: 'Failed to publish' }))
            if (err.code === 'PUBLISH_VALIDATION') {
                toast.error(`Cannot publish: ${Object.values(err.fields as Record<string, string>).join(', ')}`)
            } else {
                toast.error(err.message || 'Failed to publish')
            }
            return
        }
        queryClient.invalidateQueries({ queryKey: ['my-quests'] })
    }

    const questCounts: Record<QuestFilter, number> = {
        all: quests.length,
        draft: quests.filter(q => q.status === "draft").length,
        live: quests.filter(q => q.status === "live").length,
        scheduled: quests.filter(q => q.status === "scheduled").length,
        completed: quests.filter(q => q.status === "completed" || q.status === "expired" || q.status === "cancelled").length,
    }

    const filteredQuests = questFilter === "all" ? quests
        : questFilter === "completed" ? quests.filter(q => q.status === "completed" || q.status === "expired" || q.status === "cancelled")
            : quests.filter(q => q.status === questFilter)

    const isEndedStatus = (s: string) => s === "completed" || s === "expired" || s === "cancelled"
    const allAccepted = acceptedQuests.data ?? []
    const acceptedCounts: Record<AcceptedFilter, number> = {
        all: allAccepted.length,
        active: allAccepted.filter(q => q.status === "live" || q.status === "scheduled").length,
        ended: allAccepted.filter(q => isEndedStatus(q.status)).length,
    }
    const filteredAcceptedQuests = acceptedFilter === "all" ? allAccepted
        : acceptedFilter === "active" ? allAccepted.filter(q => q.status === "live" || q.status === "scheduled")
            : allAccepted.filter(q => isEndedStatus(q.status))

    const displayName = user?.user_metadata?.full_name as string | undefined
    const handle = displayName ?? user?.email?.split("@")[0] ?? "user"

    return (
        <>
            <div>
                {popupQuest && (
                    <QuestersPopup
                        questId={popupQuest.id}
                        questTitle={popupQuest.title}
                        onClose={() => setPopupQuest(null)}
                    />
                )}

                <PageTitle
                    title="Dashboard"
                    description={<>{displayName ? handle : `@${handle}`} · {quests.length} quests</>}
                    border
                    actions={
                        <Button asChild>
                            <Link to="/quests/new">+ Create Quest</Link>
                        </Button>
                    }
                />

                {/* Main tabs + view toggle */}
                <div className="flex items-center justify-between overflow-x-auto scrollbar-hide">
                    <div className="flex items-center gap-6">
                        {(["my-quest", "accepted"] as MainTab[]).map(t => {
                            const isActive = mainTab === t
                            const label = t === "my-quest" ? "My Quests" : "Accepted Quests"
                            const count = t === "my-quest" ? quests.length : (acceptedQuests.data?.length ?? 0)
                            return (
                                <button
                                    key={t}
                                    className={cn(
                                        "inline-flex items-center gap-2 py-3 text-sm cursor-pointer bg-transparent border-b-[3px] -mb-px transition-colors duration-150 whitespace-nowrap",
                                        isActive
                                            ? "border-fg-1 text-fg-1 font-semibold"
                                            : "border-transparent text-fg-3 hover:text-fg-1"
                                    )}
                                    onClick={() => setMainTab(t)}
                                >
                                    {label}
                                    <Badge variant={isActive ? "count" : "count-muted"}>{count}</Badge>
                                </button>
                            )
                        })}
                    </div>
                    <ViewToggle view={view} onChange={setView} />
                </div>

                {/* My Quests tab */}
                {mainTab === "my-quest" && (
                    <div>
                        <SubFilterBar
                            filters={["all", "draft", "live", "scheduled", "completed"] as QuestFilter[]}
                            active={questFilter}
                            counts={questCounts}
                            onChange={setQuestFilter}
                        />

                        {questsLoading && (view === "grid" ? <GridSkeleton /> : <CompactSkeleton />)}

                        {!questsLoading && filteredQuests.length === 0 && (
                            <div className="py-12 text-center text-fg-3">
                                No quests found.{" "}
                                <Link to="/quests/new" className="text-primary hover:underline">Create your first quest →</Link>
                            </div>
                        )}

                        {!questsLoading && filteredQuests.length > 0 && view === "grid" && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
                                {filteredQuests.map(quest => (
                                    <DashboardQuestCard
                                        key={quest.id}
                                        quest={quest}
                                        onPopup={setPopupQuest}
                                        onPublish={handlePublish}
                                        isOwned
                                    />
                                ))}
                            </div>
                        )}

                        {!questsLoading && filteredQuests.length > 0 && view === "compact" && (
                            <div className="py-4">
                                <CompactTable
                                    quests={filteredQuests}
                                    emptyMessage="No quests found."
                                    isOwned
                                    onPopup={setPopupQuest}
                                    onPublish={handlePublish}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Accepted Quests tab */}
                {mainTab === "accepted" && (
                    <div>
                        <SubFilterBar
                            filters={["all", "active", "ended"] as AcceptedFilter[]}
                            active={acceptedFilter}
                            counts={acceptedCounts}
                            onChange={setAcceptedFilter}
                        />

                        {acceptedQuests.isLoading && (view === "grid" ? <GridSkeleton /> : <CompactSkeleton />)}

                        {!acceptedQuests.isLoading && filteredAcceptedQuests.length === 0 && (
                            <div className="py-12 text-center text-fg-3">
                                {allAccepted.length === 0
                                    ? <><span>No accepted quests yet. </span><Link to="/quests" className="text-primary hover:underline">Browse available quests →</Link></>
                                    : <span>No {acceptedFilter === "active" ? "active" : acceptedFilter === "ended" ? "ended" : ""} quests in this filter.</span>
                                }
                            </div>
                        )}

                        {!acceptedQuests.isLoading && filteredAcceptedQuests.length > 0 && view === "grid" && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
                                {filteredAcceptedQuests.map(quest => (
                                    <DashboardQuestCard
                                        key={quest.id}
                                        quest={quest}
                                        onPopup={setPopupQuest}
                                        onPublish={handlePublish}
                                        isOwned={false}
                                    />
                                ))}
                            </div>
                        )}

                        {!acceptedQuests.isLoading && filteredAcceptedQuests.length > 0 && view === "compact" && (
                            <div className="py-4">
                                <CompactTable
                                    quests={filteredAcceptedQuests}
                                    emptyMessage="No accepted quests found."
                                    isOwned={false}
                                    onPopup={setPopupQuest}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    )
}
