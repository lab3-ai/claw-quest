import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { QuestTypeBadge, QuestStatusBadge } from "@/components/quest-badges"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { getTokenSymbol, calcLbPayouts } from "./constants"

type QuestType = "FCFS" | "LEADERBOARD" | "LUCKY_DRAW"
type PaymentRail = "crypto" | "fiat" | "llm"

interface SocialEntry {
    platform: string
    action: string
    chips: string[]
}

interface Skill {
    id: string
    name: string
}

interface StepPreviewProps {
    isActive: boolean
    isFuture: boolean
    isPrevDone?: boolean
    form: {
        title: string
        description: string
        startAt: string
        endAt: string
        rail: PaymentRail
        network: string
        token: string
        type: QuestType
        total: string
        winners: string
    }
    humanTasks: SocialEntry[]
    requiredSkills: Skill[]
    isEditMode?: boolean
    isScheduled?: boolean
    isFunded?: boolean
    rewardIncreased?: boolean
    topUpAmount?: number
    mutation: {
        isPending: boolean
        isError: boolean
        error: Error | null
    }
    onToggle: () => void
    onPrevious: () => void
    onSaveDraft: () => void
    onSaveAndFund: () => void
    onUpdate: () => void
    onUpdateAndFund: () => void
    onSubmitLlm: () => void
}

export function StepPreview({
    isActive,
    isFuture,
    isPrevDone = false,
    form,
    humanTasks,
    requiredSkills,
    isEditMode = false,
    isScheduled = false,
    isFunded = false,
    rewardIncreased = false,
    topUpAmount = 0,
    mutation,
    onToggle,
    onPrevious,
    onSaveDraft,
    onSaveAndFund,
    onUpdate,
    onUpdateAndFund,
    onSubmitLlm,
}: StepPreviewProps) {
    const llmKeyTokenLimit = 1000000
    const activeTotal = parseFloat(form.total) || 0
    const activeWinners = parseInt(form.winners) || 1
    const perWinner = activeWinners > 0 ? (activeTotal / activeWinners).toFixed(2) : "0.00"

    const tokenLabel = getTokenSymbol(form.rail === "llm" ? "crypto" : form.rail, form.token, form.network)

    const lbWinnersNum = Math.min(Math.max(activeWinners, 2), 100)
    const lbPayouts = calcLbPayouts(activeTotal, lbWinnersNum)

    const durationDays = form.startAt && form.endAt
        ? Math.max(0, Math.round((new Date(form.endAt).getTime() - new Date(form.startAt).getTime()) / 86400000))
        : null

    return (
        <div className={cn(
            "relative mb-0 border-none rounded-none",
            isPrevDone && "before:content-[''] before:absolute before:left-[13px] before:top-0 before:h-7 before:w-0.5 before:bg-success before:z-0"
        )}>
            <div className="flex items-start gap-3 py-4 cursor-pointer select-none text-xs relative z-1 group" onClick={onToggle}>
                <span className={cn(
                    "relative z-10 size-7 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold text-white border-2 border-background",
                    isActive ? "bg-accent shadow-[0_0_0_2px_var(--accent)]"
                        : "bg-gray-300 shadow-[0_0_0_2px_var(--color-gray-300)]"
                )}>4</span>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-fg-1 group-hover:text-primary">Preview &amp; Fund</span>
                        {isActive && <Badge variant="outline-warning">In Progress</Badge>}
                        {!isActive && <Badge variant="outline-muted">Not Started</Badge>}
                    </div>
                    <div className="text-xs text-fg-3 mt-0.5 leading-snug truncate">Review your quest and deposit funds</div>
                </div>
                <div className="flex flex-col items-end gap-0.5 shrink-0 pt-0.5">
                    <span className="text-xs text-fg-3 whitespace-nowrap">Step 4 of 4</span>
                    <span className={cn("text-xs whitespace-nowrap", isFuture ? "text-fg-3" : "text-primary")}>{isActive ? "" : "Review & fund"}</span>
                </div>
            </div>
            {isActive && (
                <div className="pl-10 pb-4"><div className="p-4 sm:p-6 border border-border-2 rounded bg-bg-1">
                    {/* Header badges */}
                    <div className="flex items-center gap-2 mt-2 text-xs text-fg-3 flex-wrap" style={{ marginBottom: 16 }}>
                        <QuestStatusBadge status="draft" />
                        <span>·</span>
                        <QuestTypeBadge type={form.type} />
                        <span>·</span>
                        <Badge variant="pill">{tokenLabel}</Badge>
                        <span>·</span>
                        <span>by <strong>you</strong></span>
                    </div>

                    {/* Description */}
                    <div className="py-4 border-b border-border-2 mb-5 text-sm leading-relaxed text-fg-1">
                        <div className="text-sm font-semibold text-fg-1 pb-2 border-b border-border-2 mb-4">About this Quest</div>
                        <p>{form.description || <span className="text-fg-3 italic">No description provided</span>}</p>
                    </div>

                    {/* Reward grid */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="px-3 py-3 border border-border-2 rounded bg-bg-3">
                            <div className="text-xs text-fg-3 mb-0.5">total reward</div>
                            <div className="text-sm font-semibold text-accent font-mono">
                                {form.rail === "llm"
                                    ? "LLM Keys"
                                    : activeTotal > 0 ? `${activeTotal.toLocaleString()} ${tokenLabel}` : "—"}
                            </div>
                        </div>
                        <div className="px-3 py-3 border border-border-2 rounded bg-bg-3">
                            <div className="text-xs text-fg-3 mb-0.5">total slots</div>
                            <div className="text-sm font-semibold text-fg-1">{activeWinners}</div>
                        </div>
                        <div className="px-3 py-3 border border-border-2 rounded bg-bg-3">
                            <div className="text-xs text-fg-3 mb-0.5">per winner</div>
                            <div className="text-sm font-semibold text-accent font-mono">
                                {form.rail === "llm"
                                    ? `${llmKeyTokenLimit.toLocaleString()} tokens`
                                    : form.type === "LEADERBOARD"
                                        ? `${lbPayouts[0]?.toFixed(2) ?? "0.00"} ${tokenLabel} (#1)`
                                        : `${perWinner} ${tokenLabel}`}
                            </div>
                        </div>
                        <div className="px-3 py-3 border border-border-2 rounded bg-bg-3">
                            <div className="text-xs text-fg-3 mb-0.5">duration</div>
                            <div className="text-sm font-semibold text-fg-1">
                                {durationDays !== null && durationDays > 0 ? `${durationDays} day${durationDays === 1 ? "" : "s"}` : "—"}
                            </div>
                        </div>
                    </div>

                    {/* Human Tasks */}
                    {humanTasks.length > 0 && (
                        <div className="mb-6 pl-4 border-l-4 border-l-(--human-fg) mt-4">
                            <div className="flex items-center gap-2 text-sm font-semibold mb-3">
                                Human Tasks
                                <span className="text-xs font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider bg-(--human-bg) text-(--human-fg)">HUMAN</span>
                                <span className="font-normal text-xs text-fg-3 ml-auto">Complete these yourself</span>
                            </div>
                            {humanTasks.map((task, i) => (
                                <div key={i} className="border border-border-2 rounded mb-3 overflow-hidden last:mb-0">
                                    <div className="flex items-center gap-3 px-3 py-3 text-xs">
                                        <span className="w-5 h-5 rounded-full border-2 border-border-2-2 shrink-0 flex items-center justify-center text-xs"></span>
                                        <span className="flex-1 font-medium">
                                            <span className="text-xs text-fg-3 font-mono mr-1">#{i + 1}</span>
                                            {task.action}
                                            {task.chips.length > 0 && (
                                                <span className="text-fg-3 font-normal ml-1.5 text-xs">
                                                    ({task.chips.length} {task.chips.length === 1 ? "item" : "items"})
                                                </span>
                                            )}
                                        </span>
                                        <Badge variant="pill">{task.platform}</Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Agent Tasks */}
                    {requiredSkills.length > 0 && (
                        <div className={cn("mb-6 pl-4 border-l-4 border-l-(--agent-fg)", humanTasks.length > 0 ? "mt-3" : "mt-4")}>
                            <div className="flex items-center gap-2 text-sm font-semibold mb-3">
                                Agent Tasks
                                <span className="text-xs font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider bg-(--agent-bg) text-(--agent-fg)">AGENT</span>
                                <span className="font-normal text-xs text-fg-3 ml-auto">Your AI agent handles these</span>
                            </div>
                            {requiredSkills.map((skill) => (
                                <div key={skill.id} className="border border-border-2 rounded mb-3 overflow-hidden last:mb-0">
                                    <div className="flex items-center gap-3 px-3 py-3 text-xs">
                                        <span className="w-5 h-5 rounded-full border-2 border-border-2-2 shrink-0 flex items-center justify-center text-xs"></span>
                                        <span className="flex-1 font-medium">
                                            Requires skill: <code className="font-mono text-xs bg-bg-3 px-1 py-px rounded">{skill.name}</code>
                                        </span>
                                        <Badge variant="pill">Skill</Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* No tasks fallback */}
                    {humanTasks.length === 0 && requiredSkills.length === 0 && (
                        <div className="py-4 text-fg-3 text-sm">
                            No tasks defined. Go back to the Tasks step to add human or agent tasks.
                        </div>
                    )}

                    {/* Payment Summary — hidden for LLM rail */}
                    {form.rail !== "llm" && (
                        <div className="border border-border-2 rounded mt-4 overflow-hidden">
                            <div className="bg-bg-3/50 px-4 py-3 font-semibold text-base border-b border-border-2">Payment Summary</div>
                            <div className="px-4 py-3">
                                <div className="flex justify-between py-1.5 text-xs border-b border-border-2/30 last:border-b-0">
                                    <span className="text-fg-3">Payment</span>
                                    <span className="font-semibold text-right">{form.rail === "crypto" ? "Crypto" : "Fiat (Stripe)"}</span>
                                </div>
                                {form.rail === "crypto" && (
                                    <div className="flex justify-between py-1.5 text-xs border-b border-border-2/30 last:border-b-0">
                                        <span className="text-fg-3">Network</span>
                                        <span className="font-semibold text-right">{form.network}</span>
                                    </div>
                                )}
                                <div className="flex justify-between py-1.5 text-xs border-b border-border-2/30 last:border-b-0">
                                    <span className="text-fg-3">Token</span>
                                    <span className="font-semibold text-right">{tokenLabel}</span>
                                </div>
                                <div className="flex justify-between py-1.5 text-xs border-b border-border-2/30 last:border-b-0">
                                    <span className="text-fg-3">Winners</span>
                                    <span className="font-semibold text-right">
                                        {form.type === "LEADERBOARD" ? `${lbWinnersNum} spots` : activeWinners}
                                    </span>
                                </div>
                                <div className="flex justify-between py-1.5 text-xs border-b border-border-2/30 last:border-b-0">
                                    <span className="text-fg-3">Per winner</span>
                                    <span className="font-semibold text-right text-accent">
                                        {form.type === "LEADERBOARD"
                                            ? `${lbPayouts[0]?.toFixed(2) ?? "0.00"} ${tokenLabel} (#1)`
                                            : `${perWinner} ${tokenLabel}`}
                                    </span>
                                </div>
                                <div className="border-t-2 border-border-2 mt-2 pt-2 flex justify-between text-sm font-semibold">
                                    <span>Total Fund</span>
                                    <span className="text-accent">
                                        {activeTotal > 0 ? `${activeTotal.toFixed(2)} ${tokenLabel}` : "\u2014"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* LLM Key Reward info — shown instead of Payment Summary */}
                    {form.rail === "llm" && (
                        <div className="mt-4 p-4 border border-border-2 rounded bg-bg-3">
                            <div className="text-sm font-semibold mb-1">LLM Key Reward</div>
                            <div className="text-xs text-fg-3">
                                Each winner receives a personal LLM API key with {llmKeyTokenLimit.toLocaleString()} tokens.
                                Keys are distributed automatically upon quest completion.
                            </div>
                        </div>
                    )}

                    {/* Pay With — hidden for LLM rail */}
                    {form.rail !== "llm" && (
                        <div className="mt-4">
                            <div className="text-xs font-semibold uppercase tracking-wide text-fg-3 mb-3">Pay with</div>
                            {form.rail === "crypto" ? (
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xl">{"\uD83D\uDD17"}</span>
                                    <div>
                                        <div className="text-xs font-semibold">Smart Contract Escrow</div>
                                        <div className="text-xs text-fg-3">
                                            {form.network} {"\u00b7"} {tokenLabel}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-3 p-2 px-3 border border-border-2 rounded bg-bg-3" style={{ marginBottom: 8 }}>
                                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0 bg-(--stripe-fg)">S</div>
                                        <div className="flex-1">
                                            <div className="text-sm font-semibold text-fg-1">Pay via Stripe</div>
                                            <div className="text-xs text-fg-3 font-mono">
                                                Card {"\u00b7"} Apple Pay {"\u00b7"} Google Pay
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-xs text-fg-3 text-center mt-1.5 italic">Stripe integration coming soon</div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Mutation error */}
                    {mutation.isError && (
                        <div className="mt-4 px-3 py-3 bg-error-light border border-error rounded-sm text-xs text-error">
                            {mutation.error?.message}
                        </div>
                    )}

                    <div className="flex justify-between mt-5 pt-4 border-t border-border-2">
                        <Button variant="secondary" onClick={onPrevious}>{"\u2190"} Reward</Button>
                        <div className="flex gap-2">
                            {mutation.isPending ? (
                                <Button disabled>{form.rail === "llm" ? "Submitting…" : "Saving…"}</Button>
                            ) : form.rail === "llm" ? (
                                <Button onClick={onSubmitLlm}>
                                    {isEditMode ? "Update Quest →" : "Submit Quest →"}
                                </Button>
                            ) : isFunded ? (
                                <>
                                    <Button
                                        variant={rewardIncreased ? "secondary" : "default"}
                                        onClick={onUpdate}
                                    >
                                        Update Quest
                                    </Button>
                                    {rewardIncreased && form.rail === "crypto" && (
                                        <Button
                                            onClick={onUpdateAndFund}
                                        >
                                            {`Update & Fund Difference (+${topUpAmount.toFixed(2)} ${tokenLabel}) →`}
                                        </Button>
                                    )}
                                </>
                            ) : (
                                <>
                                    <Button
                                        variant={form.rail === "crypto" ? "secondary" : "default"}
                                        onClick={onSaveDraft}
                                    >
                                        {isEditMode ? (isScheduled ? "Update Quest" : "Update Draft") : "Save Draft"}
                                    </Button>
                                    {form.rail === "crypto" && (
                                        <Button
                                            onClick={onSaveAndFund}
                                        >
                                            {isEditMode ? "Update & Fund Now →" : "Save & Fund Now →"}
                                        </Button>
                                    )}
                                    {form.rail === "fiat" && (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span className="inline-block">
                                                    <Button
                                                        className="bg-(--stripe-fg) text-white opacity-60 cursor-not-allowed"
                                                        disabled
                                                    >
                                                        {isEditMode ? "Update & Pay with Card →" : "Save & Pay with Card →"}
                                                    </Button>
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent>Coming Soon</TooltipContent>
                                        </Tooltip>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                    <div className="text-xs text-fg-3 leading-relaxed mt-3">
                        {form.rail === "llm"
                            ? "Quest will go live immediately. LLM API keys distributed to winners upon completion."
                            : isFunded && rewardIncreased
                                ? `Top-up: +${topUpAmount.toFixed(2)} ${tokenLabel} will be deposited to escrow.`
                                : isFunded
                                    ? "Quest is funded. Changes will be saved without additional deposit."
                                    : form.rail === "crypto"
                                        ? "Funds held in escrow. Skill tasks verified via CQ Skill proof. Social tasks verified via platform API."
                                        : isEditMode
                                            ? "Quest updated as draft. Fund later to go live."
                                            : "Quest saved as draft. Fund later to go live."}
                    </div>
                </div></div>
            )}
        </div>
    )
}
