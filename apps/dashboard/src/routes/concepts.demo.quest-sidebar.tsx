import { Button } from "@/components/ui/button"
import { TokenIcon } from "@/components/token-icon"
import { QuestTypeBadge, QuestStatusBadge } from "@/components/quest-badges"
import { DemoLayout } from "@/components/demo-layout"
import { cn } from "@/lib/utils"
import {
    CheckLine,
    Group2Line,
    GiftLine,
    Key1Line,
} from "@mingcute/react"

// ── Types ──

type QuestType = "FCFS" | "LEADERBOARD" | "LUCKY_DRAW"
type QuestStatus = "live" | "completed" | "draft"
type RewardType = "USDC" | "USD" | "ARB" | "LLM_KEY"

interface SidebarCase {
    label: string
    type: QuestType
    status: QuestStatus
    rewardType: RewardType
    rewardAmount: number
    llmTokenLimit?: number
    filledSlots: number
    totalSlots: number
    accepted?: boolean
    variant: "open" | "few-left" | "full" | "accepted" | "completed" | "draft" | "llm" | "usd" | "claim-crypto" | "claim-paid" | "claim-wallet-submitted" | "claim-fiat-pending" | "claim-fiat-paid"
    fundingMethod?: "crypto" | "stripe"
    payoutWallet?: string
    payoutStatus?: "pending" | "paid"
    payoutAmount?: number
    payoutTxHash?: string
}

// ── Mock data ──

const CASES: SidebarCase[] = [
    {
        label: "FCFS — Live, open slots",
        type: "FCFS",
        status: "live",
        rewardType: "ARB",
        rewardAmount: 200,
        filledSlots: 526,
        totalSlots: 1000,
        variant: "open",
    },
    {
        label: "LEADERBOARD — Live, few slots left",
        type: "LEADERBOARD",
        status: "live",
        rewardType: "USDC",
        rewardAmount: 1000,
        filledSlots: 45,
        totalSlots: 50,
        variant: "few-left",
    },
    {
        label: "LUCKY_DRAW — Live",
        type: "LUCKY_DRAW",
        status: "live",
        rewardType: "USDC",
        rewardAmount: 500,
        filledSlots: 287,
        totalSlots: 500,
        variant: "open",
    },
    {
        label: "FCFS — Quest full",
        type: "FCFS",
        status: "live",
        rewardType: "USDC",
        rewardAmount: 1000,
        filledSlots: 1000,
        totalSlots: 1000,
        variant: "full",
    },
    {
        label: "FCFS — Already accepted",
        type: "FCFS",
        status: "live",
        rewardType: "USDC",
        rewardAmount: 500,
        filledSlots: 42,
        totalSlots: 100,
        accepted: true,
        variant: "accepted",
    },
    {
        label: "FCFS — Completed",
        type: "FCFS",
        status: "completed",
        rewardType: "USDC",
        rewardAmount: 500,
        filledSlots: 100,
        totalSlots: 100,
        variant: "completed",
    },
    {
        label: "FCFS — Draft",
        type: "FCFS",
        status: "draft",
        rewardType: "USDC",
        rewardAmount: 200,
        filledSlots: 0,
        totalSlots: 50,
        variant: "draft",
    },
    {
        label: "LLM_KEY reward",
        type: "FCFS",
        status: "live",
        rewardType: "LLM_KEY",
        rewardAmount: 0,
        llmTokenLimit: 1_000_000,
        filledSlots: 12,
        totalSlots: 30,
        variant: "llm",
    },
    {
        label: "USD reward (Stripe)",
        type: "FCFS",
        status: "live",
        rewardType: "USD",
        rewardAmount: 50,
        filledSlots: 3,
        totalSlots: 10,
        variant: "usd",
    },
    {
        label: "Crypto — Claim Reward (no wallet)",
        type: "FCFS",
        status: "live",
        rewardType: "USDC",
        rewardAmount: 500,
        filledSlots: 100,
        totalSlots: 100,
        accepted: true,
        variant: "claim-crypto",
        fundingMethod: "crypto",
    },
    {
        label: "Crypto — Wallet Submitted",
        type: "FCFS",
        status: "live",
        rewardType: "USDC",
        rewardAmount: 500,
        filledSlots: 100,
        totalSlots: 100,
        accepted: true,
        variant: "claim-wallet-submitted",
        fundingMethod: "crypto",
        payoutWallet: "0x1234567890abcdef1234567890abcdef12345678",
        payoutStatus: "pending",
    },
    {
        label: "Crypto — Reward Paid",
        type: "FCFS",
        status: "live",
        rewardType: "USDC",
        rewardAmount: 500,
        filledSlots: 100,
        totalSlots: 100,
        accepted: true,
        variant: "claim-paid",
        fundingMethod: "crypto",
        payoutWallet: "0x1234567890abcdef1234567890abcdef12345678",
        payoutStatus: "paid",
        payoutAmount: 50,
        payoutTxHash: "0xabc123def456789",
    },
    {
        label: "Fiat — Payout Pending",
        type: "FCFS",
        status: "live",
        rewardType: "USD",
        rewardAmount: 100,
        filledSlots: 50,
        totalSlots: 50,
        accepted: true,
        variant: "claim-fiat-pending",
        fundingMethod: "stripe",
        payoutStatus: "pending",
    },
    {
        label: "Fiat — Reward Paid",
        type: "FCFS",
        status: "live",
        rewardType: "USD",
        rewardAmount: 100,
        filledSlots: 50,
        totalSlots: 50,
        accepted: true,
        variant: "claim-fiat-paid",
        fundingMethod: "stripe",
        payoutStatus: "paid",
        payoutAmount: 100,
    },
]

// ── Sub-components ──

function SegmentedBar({ filled, total }: { filled: number; total: number }) {
    const pct = total > 0 ? (filled / total) * 100 : 0
    return (
        <div className="flex gap-px w-full">
            {Array.from({ length: 10 }, (_, i) => {
                const segFilled = pct >= (i + 1) * 10
                const segPartial = !segFilled && pct > i * 10
                return (
                    <div key={i} className="flex-1 h-1.5 bg-bg-3 overflow-hidden">
                        {(segFilled || segPartial) && (
                            <div
                                className="h-full bg-primary"
                                style={{
                                    width: segPartial
                                        ? `${((pct - i * 10) / 10) * 100}%`
                                        : "100%",
                                }}
                            />
                        )}
                    </div>
                )
            })}
        </div>
    )
}

function SlotsRow({ filled, total }: { filled: number; total: number }) {
    const left = total - filled
    return (
        <>
            <div className="flex justify-between text-xs mb-2">
                <span className="text-fg-3">
                    <strong className="text-fg-1">{filled.toLocaleString()}</strong>
                    /{total.toLocaleString()} slots
                </span>
                <span className={cn("text-fg-3", left < 5 && "text-error")}>
                    <strong className={cn("font-semibold", left < 5 ? "text-error" : "text-fg-1")}>
                        {left.toLocaleString()}
                    </strong>{" "}
                    left
                </span>
            </div>
            <SegmentedBar filled={filled} total={total} />
        </>
    )
}

function LuckyDrawRow({ filled, total }: { filled: number; total: number }) {
    return (
        <div className="flex border border-border-2 text-xs text-fg-3">
            <div className="flex items-center px-2 py-1 gap-1.5 w-full">
                <span className="w-full">
                    <strong className="text-fg-1">{filled.toLocaleString()}</strong> entered
                </span>
                <Group2Line size={14} className="text-fg-3 shrink-0" />
            </div>
            <span className="w-px bg-border-2" />
            <div className="flex items-center px-2 py-1 gap-1.5 w-full">
                <span className="w-full">
                    <strong className="text-fg-1">{total.toLocaleString()}</strong> rewards
                </span>
                <GiftLine size={14} className="text-fg-3 shrink-0" />
            </div>
        </div>
    )
}

function RewardDisplay({ c }: { c: SidebarCase }) {
    const isLlm = c.rewardType === "LLM_KEY"
    const displayToken = isLlm ? "LLM_KEY" : c.rewardType
    const displayAmount = isLlm
        ? (c.llmTokenLimit ?? 0).toLocaleString()
        : c.rewardAmount.toLocaleString()
    const label = isLlm ? "total LLM tokens" : "total reward pool"

    return (
        <div className="pb-4 text-center border-b border-border-2">
            <div className="flex justify-center mb-2">
                <QuestTypeBadge type={c.type} />
            </div>
            <div className="flex items-center justify-center gap-2 text-2xl font-semibold font-mono">
                {isLlm ? (
                    <Key1Line size={24} className="text-fg-3" />
                ) : (
                    <TokenIcon token={displayToken} size={24} />
                )}
                {displayAmount}
                <span className="text-2xl">
                    {isLlm ? "LLM Tokens" : c.rewardType}
                </span>
            </div>
            <div className="text-xs text-fg-3 mt-1">{label}</div>
        </div>
    )
}

function CTA({ c }: { c: SidebarCase }) {
    const slotsLeft = c.totalSlots - c.filledSlots

    if (c.status === "draft") {
        return (
            <div className="text-xs text-fg-3 text-center py-2">
                Draft — not published
            </div>
        )
    }

    if (c.status === "completed") {
        return (
            <Button variant="secondary" className="w-full" disabled>
                Quest Ended
            </Button>
        )
    }

    if (c.accepted && !c.variant.startsWith("claim")) {
        return (
            <div className="text-center py-2">
                <div className="flex items-center justify-center gap-1.5 text-sm font-semibold text-accent mb-1">
                    <CheckLine size={16} />
                    Quest Accepted
                </div>
                <div className="text-xs text-fg-3">Status: in_progress</div>
            </div>
        )
    }

    if (c.accepted && c.variant.startsWith("claim")) {
        return (
            <div className="text-center py-2">
                <div className="flex items-center justify-center gap-1.5 text-sm font-semibold text-accent mb-1">
                    <CheckLine size={16} />
                    Quest Accepted
                </div>
            </div>
        )
    }

    return (
        <Button
            className="w-full"
            size="xl"
            variant={slotsLeft > 0 ? "primary" : "secondary"}
            disabled={slotsLeft <= 0}
        >
            {slotsLeft <= 0 ? "Quest Full" : "Accept Quest"}
        </Button>
    )
}

function SidebarCard({ c }: { c: SidebarCase }) {
    const isLuckyDraw = c.type === "LUCKY_DRAW"
    const isCompleted = c.status === "completed"

    return (
        <div className="border border-border-2 rounded bg-bg-1 p-4 w-90">
            <RewardDisplay c={c} />

            {isCompleted && (
                <div className="px-3 py-3 border-b border-border-2 text-center">
                    <QuestStatusBadge status="completed" />
                </div>
            )}

            <div className="py-3 border-b border-border-2">
                {isLuckyDraw ? (
                    <LuckyDrawRow filled={c.filledSlots} total={c.totalSlots} />
                ) : (
                    <SlotsRow filled={c.filledSlots} total={c.totalSlots} />
                )}
            </div>

            <div className="py-3">
                <CTA c={c} />
            </div>

            {/* Claim Reward Section */}
            {c.variant.startsWith("claim") && (
                <ClaimSection c={c} />
            )}
        </div>
    )
}

function ClaimSection({ c }: { c: SidebarCase }) {
    if (c.variant === "claim-crypto") {
        return (
            <div className="mt-0 px-3 pt-4 border-t border-border-2">
                <div className="text-sm font-semibold text-center mb-2">Claim Your Reward</div>
                <div className="text-xs text-fg-3 text-center mb-3">Connect your wallet to receive {c.rewardType} reward</div>
                <Button variant="outline" className="w-full mb-2">Connect Wallet</Button>
                <Button className="w-full" disabled>Claim Reward</Button>
            </div>
        )
    }
    if (c.variant === "claim-wallet-submitted") {
        return (
            <div className="mt-0 px-3 pt-4 border-t border-border-2 text-center">
                <div className="text-sm font-semibold text-fg-1 mb-1">Wallet Submitted</div>
                <div className="text-xs text-fg-3">
                    Payout incoming to{" "}
                    <code className="font-mono text-xs bg-bg-3 px-1 py-px rounded">
                        {c.payoutWallet?.slice(0, 6)}...{c.payoutWallet?.slice(-4)}
                    </code>
                </div>
            </div>
        )
    }
    if (c.variant === "claim-paid") {
        return (
            <div className="mt-0 px-3 pt-4 border-t border-border-2 text-center">
                <div className="text-sm font-semibold text-accent mb-1">Reward Paid</div>
                <div className="text-xs text-fg-3 break-all">
                    {c.payoutAmount} {c.rewardType} sent to{" "}
                    <code className="font-mono text-xs bg-bg-3 px-1 py-px rounded">
                        {c.payoutWallet?.slice(0, 6)}...{c.payoutWallet?.slice(-4)}
                    </code>
                </div>
                {c.payoutTxHash && (
                    <a href="#" className="text-xs text-accent hover:underline mt-1 inline-block">View transaction</a>
                )}
            </div>
        )
    }
    if (c.variant === "claim-fiat-pending") {
        return (
            <div className="mt-0 px-3 pt-4 border-t border-border-2 text-center">
                <div className="text-sm font-semibold text-fg-1 mb-1">Payout Pending</div>
                <div className="text-xs text-fg-3 mb-2">${c.rewardAmount} USD will be sent via Stripe when distributed</div>
                <Button size="sm" variant="outline" className="text-xs">Set up Stripe to receive payout</Button>
            </div>
        )
    }
    if (c.variant === "claim-fiat-paid") {
        return (
            <div className="mt-0 px-3 pt-4 border-t border-border-2 text-center">
                <div className="text-sm font-semibold text-accent mb-1">Reward Paid</div>
                <div className="text-xs text-fg-3">${c.payoutAmount?.toFixed(2)} USD paid via Stripe</div>
            </div>
        )
    }
    return null
}

// ── Page ──

export function QuestSidebarDemo() {
    return (
        <DemoLayout
            title="Quest Sidebar Card"
            description="All states of the reward/progress/accept card shown on the right side of quest detail pages."
        >
            <div className="flex flex-wrap gap-6">
                {CASES.map((c) => (
                    <div key={c.label}>
                        <h3 className="text-sm font-semibold mb-2 text-fg-3">{c.label}</h3>
                        <SidebarCard c={c} />
                    </div>
                ))}
            </div>
        </DemoLayout>
    )
}
