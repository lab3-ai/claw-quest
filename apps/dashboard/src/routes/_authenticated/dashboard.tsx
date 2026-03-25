import { useState, useEffect } from "react"
import { toast } from 'sonner'
import { Link, useNavigate, useSearch } from "@tanstack/react-router"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/context/AuthContext"
import { QuestGridCard } from "@/components/QuestGridCard"
import { QuestersPopup } from "@/components/QuestersPopup"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TabBar, GRID_VIEW_ICON, LIST_VIEW_ICON } from "@/components/tab-bar"
import type { ViewOption } from "@/components/tab-bar"
import { cn } from "@/lib/utils"
import { getUserAvatarUrl } from "@/components/avatarUtils"
import { TokenIcon } from "@/components/token-icon"
import { SponsorLogo } from "@/components/sponsor-logo"
import { formatTimeShort } from "@/components/quest-utils"
import { QuestTypeBadge } from "@/components/quest-badges"
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

const DASHBOARD_VIEW_OPTIONS: ViewOption<View>[] = [
    { id: "grid", icon: GRID_VIEW_ICON, tooltip: "Grid view" },
    { id: "compact", icon: LIST_VIEW_ICON, tooltip: "Compact view" },
]

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

// ─── Dashboard Quest Card (QuestGridCard + action buttons) ───────────────────

interface DashboardQuestCardProps {
    quest: MineQuest
    onPublish: (id: string) => void
    isOwned?: boolean
}

function DashboardQuestCard({ quest, onPublish, isOwned = false }: DashboardQuestCardProps) {
    const isDraft = quest.status === "draft"

    return (
        <div className={cn(
            "flex flex-col border border-border-2 rounded bg-bg-1 hover:border-fg-1 hover-shadow transition-colors",
            isDraft && "border-dashed opacity-80 hover:opacity-100",
        )}>
            <QuestGridCard quest={quest} className="border-0 rounded-none !translate-y-0 !shadow-none" />

            {/* Action buttons — outline by default, filled on card hover */}
            <div className="flex gap-1.5 px-4 pb-4 max-sm:px-3 max-sm:pb-3">
                {isOwned ? (
                    isDraft ? (() => {
                        const errors = getPublishErrors(quest)
                        const canPublish = Object.keys(errors).length === 0
                        return (
                            <>
                                <Button asChild size="lg" variant="outline" className="flex-1 ">
                                    <Link to="/quests/$questId/edit" params={{ questId: quest.id }}>Continue Editing</Link>
                                </Button>
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="flex-1 "
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
                            <Button asChild size="lg" variant="outline" className="flex-1 ">
                                <Link to="/quests/$questId/edit" params={{ questId: quest.id }}>Edit</Link>
                            </Button>
                            <Button asChild size="lg" variant="outline" className="flex-1 ">
                                <Link to="/quests/$questId/manage" params={{ questId: quest.id }}>Manage</Link>
                            </Button>
                        </>
                    ) : (
                        <Button asChild size="lg" variant="outline" className="flex-1 ">
                            <Link to="/quests/$questId/manage" params={{ questId: quest.id }}>Manage</Link>
                        </Button>
                    )
                ) : (
                    <Button asChild size="lg" variant="outline" className="flex-1 ">
                        <Link to="/quests/$questId" params={{ questId: quest.id }}>View Quest</Link>
                    </Button>
                )}
            </div>
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
                                    <Link {...titleLinkProps} className="text-base font-semibold leading-snug no-underline text-fg-1 hover:text-primary font-heading" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
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
                                    <QuestTypeBadge type={quest.type} />
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
                                                    <Button asChild size="lg" variant="outline">
                                                        <Link to="/quests/$questId/edit" params={{ questId: quest.id }}>Edit</Link>
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
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
                                                <Button asChild size="lg" variant="outline">
                                                    <Link to="/quests/$questId/edit" params={{ questId: quest.id }}>Edit</Link>
                                                </Button>
                                                <Button asChild size="lg" variant="outline">
                                                    <Link to="/quests/$questId/manage" params={{ questId: quest.id }}>Manage</Link>
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button asChild size="lg" variant="outline">
                                                <Link to="/quests/$questId/manage" params={{ questId: quest.id }}>Manage</Link>
                                            </Button>
                                        )
                                    ) : (
                                        <Button asChild size="lg" variant="outline">
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
    const avatarUrl = getUserAvatarUrl(user, handle, 48)

    // Stats
    const completedQuests = quests.filter(q => q.status === "completed").length
    const totalJoined = quests.length + allAccepted.length
    const totalEarned = [...quests, ...allAccepted]
        .filter(q => q.status === "completed")
        .reduce((sum, q) => sum + (q.rewardAmount ?? 0), 0)
    const winRate = totalJoined > 0 ? Math.round((completedQuests / totalJoined) * 100) : 0

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

                {/* Profile header + stats */}
                <div className="flex items-center justify-between py-4 border-b border-border-2 gap-4 max-md:flex-col max-md:items-start">
                    {/* Left: avatar + name + action */}
                    <div className="flex items-center gap-3">
                        <img
                            src={avatarUrl}
                            alt={handle}
                            className="w-12 h-12 rounded bg-bg-3 border border-border-1 shrink-0"
                        />
                        <div>
                            <h1 className="text-xl font-semibold font-heading text-fg-1">{displayName || handle}</h1>
                            <p className="text-xs text-fg-3 mt-0.5">@{handle}</p>
                        </div>
                    </div>

                    {/* Right: stats */}
                    <div className="grid grid-cols-3 divide-x divide-border-2 border border-border-2 rounded bg-bg-1">
                        <div className="px-5 py-3 text-center">
                            <div className="text-2xs text-fg-3 uppercase tracking-widest">total earned</div>
                            <div className="text-xl font-semibold text-fg-1 font-heading mt-0.5">
                                ${totalEarned.toLocaleString()}
                            </div>
                        </div>
                        <div className="px-5 py-3 text-center">
                            <div className="text-2xs text-fg-3 uppercase tracking-widest">completed</div>
                            <div className="text-xl font-semibold text-fg-1 font-heading mt-0.5">
                                {completedQuests}
                            </div>
                        </div>
                        <div className="px-5 py-3 text-center">
                            <div className="text-2xs text-fg-3 uppercase tracking-widest">win rate</div>
                            <div className="text-xl font-semibold text-fg-1 font-heading mt-0.5">
                                {winRate}%
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main tabs + view toggle + sub-filters */}
                <TabBar
                    tabs={[
                        { id: "my-quest" as MainTab, label: "My Quests" },
                        { id: "accepted" as MainTab, label: "Accepted Quests" },
                    ]}
                    activeTab={mainTab}
                    onTabChange={setMainTab}
                    tabCounts={{
                        "my-quest": quests.length,
                        "accepted": acceptedQuests.data?.length ?? 0,
                    }}
                    viewOptions={DASHBOARD_VIEW_OPTIONS}
                    activeView={view}
                    onViewChange={setView}
                    subFilters={mainTab === "my-quest"
                        ? (["all", "draft", "live", "scheduled", "completed"] as QuestFilter[]).map(f => ({ id: f, label: f, count: questCounts[f] }))
                        : (["all", "active", "ended"] as AcceptedFilter[]).map(f => ({ id: f, label: f, count: acceptedCounts[f] }))
                    }
                    activeSubFilter={mainTab === "my-quest" ? questFilter : acceptedFilter}
                    onSubFilterChange={(f) => {
                        if (mainTab === "my-quest") setQuestFilter(f as QuestFilter)
                        else setAcceptedFilter(f as AcceptedFilter)
                    }}
                />

                {/* My Quests tab */}
                {mainTab === "my-quest" && (
                    <div>

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
                                        onPublish={handlePublish}
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
