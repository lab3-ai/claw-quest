import { useEffect, useState } from "react"
import { REWARD_TYPE } from "@clawquest/shared"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { CheckFill } from "@mingcute/react"
import { cn } from "@/lib/utils"
import { NETWORKS_PRIMARY, NETWORKS_OTHER, NATIVE_TOKENS, TOKEN_CONTRACTS, TOKEN_COLORS, getTokenSymbol, calcLbPayouts } from "./constants"

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

type QuestType = "FCFS" | "LEADERBOARD" | "LUCKY_DRAW"
type PaymentRail = "crypto" | "fiat" | "llm"

interface StepRewardProps {
    isActive: boolean
    isDone: boolean
    isFuture: boolean
    form: {
        rail: PaymentRail
        network: string
        token: string
        type: QuestType
        total: string
        winners: string
        drawTime: string
        llmModelId: string
        tokenBudgetPerWinner: string
    }
    stepSummary?: string
    onToggle: () => void
    onFieldChange: (key: keyof Omit<StepRewardProps["form"], "llmModelId" | "tokenBudgetPerWinner">, value: string | PaymentRail | QuestType) => void
    onSetLlmModelId: (v: string) => void
    onSetTokenBudgetPerWinner: (v: string) => void
    onNext: () => void
    onPrevious: () => void
}

export function StepReward({
    isActive,
    isDone,
    isFuture,
    form,
    stepSummary,
    onToggle,
    onFieldChange,
    onSetLlmModelId,
    onSetTokenBudgetPerWinner,
    onNext,
    onPrevious,
}: StepRewardProps) {
    const { data: llmModels } = useQuery<any[]>({
        queryKey: ["llm-models"],
        queryFn: () => fetch(`${API_BASE}/llm-models`).then(r => r.json()).then(d => d.data ?? d),
        enabled: isActive && form.rail === "llm",
        staleTime: 5 * 60 * 1000,
    })

    const [attemptedNext, setAttemptedNext] = useState(false)
    useEffect(() => {
        if (!isActive) setAttemptedNext(false)
    }, [isActive])

    const activeTotal = parseFloat(form.total) || 0
    const activeWinners = parseInt(form.winners) || 1
    const perWinner = form.rail === "llm"
        ? `$${parseFloat(form.tokenBudgetPerWinner || "0").toFixed(2)}`
        : activeWinners > 0 ? (activeTotal / activeWinners).toFixed(2) : "0.00"

    const stepValid =
        activeWinners > 0 &&
        (form.rail === "llm"
            ? !!form.llmModelId && parseFloat(form.tokenBudgetPerWinner) > 0
            : activeTotal > 0) &&
        (form.type !== "LUCKY_DRAW" || !!form.drawTime.trim()) &&
        (form.type !== "LEADERBOARD" || activeWinners >= 2)

    const showErr = attemptedNext
    const totalError = showErr && form.rail !== "llm" && activeTotal <= 0
    const winnersError = showErr && activeWinners <= 0
    const drawTimeError = showErr && form.type === "LUCKY_DRAW" && !form.drawTime.trim()
    const leaderboardError = showErr && form.type === "LEADERBOARD" && activeWinners < 2
    const llmModelError = showErr && form.rail === "llm" && !form.llmModelId.trim()
    const llmBudgetError = showErr && form.rail === "llm" && parseFloat(form.tokenBudgetPerWinner) <= 0

    const tokenLabel = form.rail === "llm" ? "tokens" : getTokenSymbol(form.rail, form.token, form.network)

    const lbWinnersNum = Math.min(Math.max(activeWinners, 2), 100)
    const lbPayouts = calcLbPayouts(activeTotal, lbWinnersNum)

    const isNativeToken = form.token === "NATIVE"
    const nativeInfo = NATIVE_TOKENS[form.network] ?? { symbol: "?", name: "?" }
    const tokenDisplaySymbol = isNativeToken ? nativeInfo.symbol : form.token
    const tokenContract = isNativeToken
        ? "Native token — no contract address"
        : (TOKEN_CONTRACTS[form.token]?.[form.network] ?? "")
    const tokenIconChar = isNativeToken ? nativeInfo.symbol.charAt(0) : "$"
    const tokenIconColor = isNativeToken ? "#627eea" : (TOKEN_COLORS[form.token] ?? "#888")

    return (
        <div className={cn(
            "relative mb-0 border-none rounded-none",
            "before:content-[''] before:absolute before:left-[13px] before:top-0 before:bottom-0 before:w-0.5 before:bg-border before:z-0",
            isDone && "before:bg-success"
        )}>
            <div className="flex items-start gap-3 py-4 cursor-pointer select-none text-xs relative z-1 group" onClick={onToggle}>
                <span className={cn(
                    "relative z-10 size-7 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold text-white border-2 border-background",
                    isDone ? "bg-success shadow-[0_0_0_2px_var(--color-green-500)]"
                        : isActive ? "bg-accent shadow-[0_0_0_2px_var(--accent)]"
                            : "bg-gray-300 shadow-[0_0_0_2px_var(--color-gray-300)]"
                )}>{isDone ? <CheckFill size={12} /> : "3"}</span>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-fg-1 group-hover:text-primary">Reward</span>
                        {isDone && <Badge variant="outline-success">Completed</Badge>}
                        {isActive && <Badge variant="outline-warning">In Progress</Badge>}
                        {!isDone && !isActive && <Badge variant="outline-muted">Not Started</Badge>}
                    </div>
                    <div className="text-xs text-fg-3 mt-0.5 leading-snug truncate">
                        {!isActive && stepSummary ? stepSummary : "Reward method, network, token, and distribution"}
                    </div>
                </div>
                <div className="flex flex-col items-end gap-0.5 shrink-0 pt-0.5">
                    <span className="text-xs text-fg-3 whitespace-nowrap">Step 3 of 4</span>
                    <span className={cn("text-xs whitespace-nowrap", isFuture ? "text-fg-3" : "text-primary")}>{isDone ? "Modify if required" : isActive ? "" : "Fill the details"}</span>
                </div>
            </div>
            {isActive && (
                <div className="pl-10 pb-4"><div className="p-4 sm:p-6 border border-border-2 rounded bg-bg-1">
                    {/* Payment Rail */}
                    <div className="space-y-6 mb-6">
                        <div className="flex flex-col gap-2">
                            <Label className="mr-4">Reward Method</Label>
                            <div className="inline-flex border border-border-2 rounded overflow-hidden">
                                <button
                                    className={cn("py-1.5 px-4 text-xs font-medium cursor-pointer border-none border-r border-border-2 bg-bg-base text-fg-3 transition-all flex items-center gap-1.5 hover:bg-bg-2 hover:text-fg-1", form.rail === "crypto" && "bg-(--tag-bg) text-(--tag-fg) font-semibold")}
                                    onClick={() => onFieldChange("rail", "crypto")}
                                >
                                    <span className="text-base leading-none">⛓</span> Crypto
                                </button>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span
                                            className={cn(
                                                "inline-flex items-center gap-1.5 py-1.5 px-4 text-xs font-medium border-none border-r border-border-2 bg-bg-base text-fg-3 opacity-60 cursor-not-allowed",
                                                form.rail === "fiat" && "bg-(--tag-bg) text-(--tag-fg) font-semibold"
                                            )}
                                            aria-disabled
                                        >
                                            <span className="text-base leading-none">💳</span> Fiat (USD)
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent>Coming Soon</TooltipContent>
                                </Tooltip>
                                <button
                                    className={cn("py-1.5 px-4 text-xs font-medium cursor-pointer border-none bg-bg-base text-fg-3 transition-all flex items-center gap-1.5 hover:bg-bg-2 hover:text-fg-1", form.rail === "llm" && "bg-(--tag-bg) text-(--tag-fg) font-semibold")}
                                    onClick={() => onFieldChange("rail", "llm")}
                                >
                                    <span className="text-base leading-none">🤖</span> LLM Token
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Network & Token (crypto only) */}
                    {form.rail === "crypto" && (
                        <div className="space-y-6 mb-6">
                            <div className="text-sm font-semibold text-fg-1 pb-2 border-b border-border-2 mb-3">Network &amp; Token</div>
                            <div className="flex items-start gap-3">
                                <div className="flex-1 flex flex-col gap-2">
                                    <Label>Network</Label>
                                    <select className="flex h-9 w-full rounded border border-border-2-2 bg-transparent px-3 py-1 text-sm focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring" value={form.network} onChange={e => onFieldChange("network", e.target.value)}>
                                        <optgroup label="Primary">
                                            {NETWORKS_PRIMARY.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
                                        </optgroup>
                                        <optgroup label="Other Networks">
                                            {NETWORKS_OTHER.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
                                        </optgroup>
                                    </select>
                                </div>
                                <div className="flex-1 flex flex-col gap-2">
                                    <Label>Token</Label>
                                    <select className="flex h-9 w-full rounded border border-border-2-2 bg-transparent px-3 py-1 text-sm focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring" value={form.token} onChange={e => onFieldChange("token", e.target.value)}>
                                        <optgroup label="Stablecoin">
                                            <option value={REWARD_TYPE.USDC}>USDC</option>
                                            <option value={REWARD_TYPE.USDT}>USDT</option>
                                        </optgroup>
                                        <optgroup label="Native">
                                            <option value={REWARD_TYPE.NATIVE}>{nativeInfo.symbol}</option>
                                        </optgroup>
                                    </select>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-2 px-3 border border-border-2 rounded bg-bg-3" style={{ marginTop: 8 }}>
                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0" style={{ background: tokenIconColor }}>
                                    {tokenIconChar}
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm font-semibold text-fg-1">{tokenDisplaySymbol} on {form.network}</div>
                                    <div className="text-xs text-fg-3 font-mono">{tokenContract}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Fiat */}
                    {form.rail === "fiat" && (
                        <div className="space-y-6 mb-6">
                            <div className="text-sm font-semibold text-fg-1 pb-2 border-b border-border-2 mb-3">Fiat Payment</div>
                            <div className="flex items-center gap-2 px-3 py-2 bg-info-light border border-info rounded text-xs text-fg-1 leading-relaxed mt-2">
                                <span className="text-sm shrink-0">ℹ️</span>
                                <span>Sponsor pays via <strong>Stripe</strong> (charged upfront at quest creation). Winners withdraw rewards as crypto.</span>
                            </div>
                            <div className="flex items-center gap-3 p-2 px-3 border border-border-2 rounded bg-bg-3" style={{ marginTop: 10 }}>
                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0 bg-(--stripe-fg)">S</div>
                                <div className="flex-1">
                                    <div className="text-sm font-semibold text-fg-1">USD via Stripe</div>
                                    <div className="text-xs text-fg-3 font-mono">
                                        Credit / debit card · Apple Pay · Google Pay
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* LLM Token Reward */}
                    {form.rail === "llm" && (
                        <div className="space-y-6 mb-6">
                            <div className="text-sm font-semibold text-fg-1 pb-2 border-b border-border-2 mb-3">LLM Token Reward</div>
                            <div className="space-y-1.5">
                                <Label>Model {showErr && <span className="text-destructive">*</span>}</Label>
                                <select
                                    className={cn(
                                        "flex h-9 w-full rounded border border-border-2-2 bg-transparent px-3 py-1 text-sm focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring",
                                        llmModelError && "border-destructive focus-visible:ring-destructive"
                                    )}
                                    value={form.llmModelId}
                                    onChange={e => onSetLlmModelId(e.target.value)}
                                >
                                    <option value="">-- Select a model --</option>
                                    {["premium", "mid", "budget"].map(tier => {
                                        const tierModels = (llmModels ?? []).filter((m: any) => m.tier === tier)
                                        if (!tierModels.length) return null
                                        return (
                                            <optgroup key={tier} label={tier.charAt(0).toUpperCase() + tier.slice(1)}>
                                                {tierModels.map((m: any) => (
                                                    <option key={m.id} value={m.id}>
                                                        {m.name} — ${m.outputPricePer1M}/1M out tokens
                                                    </option>
                                                ))}
                                            </optgroup>
                                        )
                                    })}
                                </select>
                                {llmModelError && (
                                    <div className="text-xs text-destructive mt-0.5">Select a model</div>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <Label>Budget per Winner (USD) {showErr && <span className="text-destructive">*</span>}</Label>
                                <Input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={form.tokenBudgetPerWinner}
                                    onChange={e => onSetTokenBudgetPerWinner(e.target.value)}
                                    placeholder="5.00"
                                    className={cn(llmBudgetError && "border-destructive focus-visible:ring-destructive")}
                                />
                                {llmBudgetError && (
                                    <div className="text-xs text-destructive mt-0.5">Budget per winner must be greater than 0</div>
                                )}
                                <p className="text-xs text-fg-3">
                                    USD worth of LLM tokens each winner can spend on the selected model.
                                </p>
                            </div>
                            {parseFloat(form.tokenBudgetPerWinner) > 0 && activeWinners > 0 && (
                                <div className="text-xs text-fg-3 p-2 px-3 bg-bg-3 rounded border border-border-2">
                                    <span className="font-mono text-accent">${parseFloat(form.tokenBudgetPerWinner).toFixed(2)}</span>
                                    <span> per winner × </span>
                                    <span className="font-mono text-accent">{form.winners}</span>
                                    <span> winners = </span>
                                    <span className="font-mono text-accent font-semibold">${(parseFloat(form.tokenBudgetPerWinner) * activeWinners).toFixed(2)}</span>
                                    <span> total</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2 px-3 py-2 bg-info-light border border-info rounded text-xs text-fg-1 leading-relaxed">
                                <span className="text-sm shrink-0">⛓</span>
                                <span>Quest requires <strong>crypto funding</strong>. It will go live after your deposit is confirmed on-chain.</span>
                            </div>
                        </div>
                    )}

                    {/* Distribution Method */}
                    <div className="space-y-6 mb-6">
                        <div className="text-sm font-semibold text-fg-1 pb-2 border-b border-border-2 mb-3">Distribution Method</div>
                        <div className="flex border border-border-2-2 rounded overflow-hidden">
                            {[
                                { id: "payout-fcfs", val: "FCFS" as QuestType, label: "FCFS" },
                                { id: "payout-draw", val: "LUCKY_DRAW" as QuestType, label: "Lucky Draw" },
                                { id: "payout-leaderboard", val: "LEADERBOARD" as QuestType, label: "Leaderboard" },
                            ].map((opt, i, arr) => (
                                <button
                                    key={opt.val}
                                    type="button"
                                    className={cn(
                                        "flex-1 text-center px-3 py-2 text-xs font-semibold cursor-pointer transition-colors",
                                        i < arr.length - 1 && "border-r border-border-2-2",
                                        form.type === opt.val
                                            ? "bg-bg-3 text-fg-1"
                                            : "text-fg-3 hover:bg-bg-2/50 hover:text-fg-1"
                                    )}
                                    onClick={() => {
                                        let winners = form.winners
                                        if (opt.val === "LEADERBOARD") {
                                            const n = parseInt(winners) || 2
                                            winners = String(Math.min(100, Math.max(2, n)))
                                        }
                                        onFieldChange("type", opt.val)
                                        onFieldChange("winners", winners)
                                    }}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>

                        {/* Shared: Total Reward + Winners */}
                        <div style={{ marginTop: 12 }}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {form.rail !== "llm" && (
                                    <div className="flex flex-col gap-2">
                                        <Label>Total Reward ({tokenLabel}) <span className="text-destructive">*</span></Label>
                                        <Input
                                            className={cn("font-mono text-xs", totalError && "border-destructive focus-visible:ring-destructive")}
                                            type="text"
                                            value={form.total}
                                            onChange={e => onFieldChange("total", e.target.value)}
                                        />
                                        {totalError && <div className="text-xs text-destructive mt-0.5">Total reward must be greater than 0</div>}
                                    </div>
                                )}
                                <div className="flex flex-col gap-2">
                                    <Label>
                                        Number of Winners {showErr && <span className="text-destructive">*</span>}
                                        {form.type === "LEADERBOARD" && (
                                            <span style={{ fontSize: 10, color: "var(--fg-muted)", marginLeft: 4 }}>(min 2, max 100)</span>
                                        )}
                                    </Label>
                                    <Input
                                        type="number"
                                        min={form.type === "LEADERBOARD" ? 2 : 1}
                                        max={form.type === "LEADERBOARD" ? 100 : undefined}
                                        value={form.winners}
                                        onChange={e => {
                                            let v = e.target.value
                                            if (form.type === "LEADERBOARD") {
                                                const n = parseInt(v) || 2
                                                v = String(Math.min(100, Math.max(2, n)))
                                            }
                                            onFieldChange("winners", v)
                                        }}
                                        className={cn((winnersError || leaderboardError) && "border-destructive focus-visible:ring-destructive")}
                                    />
                                    {winnersError && <div className="text-xs text-destructive mt-0.5">Number of winners must be greater than 0</div>}
                                    {leaderboardError && <div className="text-xs text-destructive mt-0.5">Leaderboard requires at least 2 winners</div>}
                                </div>
                            </div>
                        </div>

                        {/* FCFS fields */}
                        {form.type === "FCFS" && (
                            <div className="conditional visible" style={{ marginTop: 4 }}>
                                <div className="text-xs text-fg-3 mb-1 leading-snug" style={{ marginBottom: 8 }}>
                                    First N eligible agents get paid immediately.
                                </div>
                                <div className="text-xs text-fg-3 mt-1.5 p-1.5 px-3 bg-bg-3 rounded border border-border-2">
                                    Per winner: <strong className="text-accent font-mono">{perWinner} {tokenLabel}</strong>
                                </div>
                            </div>
                        )}

                        {/* Lucky Draw fields */}
                        {form.type === "LUCKY_DRAW" && (
                            <div className="conditional visible" style={{ marginTop: 4 }}>
                                <div className="text-xs text-fg-3 mb-1 leading-snug" style={{ marginBottom: 8 }}>
                                    All eligible submissions enter a raffle. N winners drawn at end.
                                </div>
                                <div className="flex flex-col gap-2">
                                    <Label>Draw Time {showErr && <span className="text-destructive">*</span>}</Label>
                                    <input
                                        className={cn("flex h-9 w-full rounded border border-border-2-2 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-fg-3 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer", drawTimeError && "border-destructive focus-visible:ring-destructive")}
                                        type="datetime-local"
                                        value={form.drawTime}
                                        onChange={e => onFieldChange("drawTime", e.target.value)}
                                        onClick={(e) => e.currentTarget.showPicker?.()}
                                        style={{ cursor: 'pointer' }}
                                    />
                                    {drawTimeError && <div className="text-xs text-destructive mt-0.5">Draw time is required for Lucky Draw</div>}
                                </div>
                                <div className="text-xs text-fg-3 mt-1.5 p-1.5 px-3 bg-bg-3 rounded border border-border-2">
                                    Per winner: <strong className="text-accent font-mono">{perWinner} {tokenLabel}</strong>
                                </div>
                            </div>
                        )}

                        {/* Leaderboard fields */}
                        {form.type === "LEADERBOARD" && (
                            <div className="conditional visible" style={{ marginTop: 4 }}>
                                <div className="text-xs text-fg-3 mb-1 leading-snug" style={{ marginBottom: 8 }}>
                                    All verified submissions ranked by completion time. At quest end, top N get tiered rewards (1st gets more than 2nd, etc.).
                                </div>
                                <div className="flex flex-col gap-2">
                                    <Label>Payout Structure ({tokenLabel})</Label>
                                    <div className="text-xs text-fg-3 mb-1 leading-snug">
                                        Auto-generated from total &amp; winners count. Weighted decay: 1st gets most.
                                    </div>
                                    <div className="flex flex-wrap gap-1 px-3 py-2 border border-border-2 rounded bg-bg-3/50 font-mono text-xs">
                                        {lbWinnersNum <= 20
                                            ? lbPayouts.map((amt, i) => (
                                                <div key={i} className={cn("inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-bg-base border border-border-2 rounded", i === 0 && "border-accent")}>
                                                    <span className="text-fg-3 text-xs">#{i + 1}</span>
                                                    <span className={cn("font-semibold", i === 0 ? "text-accent" : "text-fg-1")}>{amt.toFixed(2)}</span>
                                                </div>
                                            ))
                                            : (
                                                <>
                                                    {lbPayouts.slice(0, 5).map((amt, i) => (
                                                        <div key={i} className={cn("inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-bg-base border border-border-2 rounded", i === 0 && "border-accent")}>
                                                            <span className="text-fg-3 text-xs">#{i + 1}</span>
                                                            <span className={cn("font-semibold", i === 0 ? "text-accent" : "text-fg-1")}>{amt.toFixed(2)}</span>
                                                        </div>
                                                    ))}
                                                    <span style={{ color: "var(--fg-muted)", padding: "2px 4px", fontSize: 11 }}>…</span>
                                                    {lbPayouts.slice(-2).map((amt, i) => (
                                                        <div key={`last-${i}`} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-bg-base border border-border-2 rounded">
                                                            <span className="text-fg-3 text-xs">#{lbWinnersNum - 1 + i}</span>
                                                            <span className="font-semibold text-fg-1">{amt.toFixed(2)}</span>
                                                        </div>
                                                    ))}
                                                </>
                                            )
                                        }
                                    </div>
                                </div>
                                <div className="text-xs text-fg-3 mt-1.5 p-1.5 px-3 bg-bg-3 rounded border border-border-2">
                                    <span>1st: <strong className="text-accent font-mono">{lbPayouts[0]?.toFixed(2)} {tokenLabel}</strong></span>
                                    <span style={{ marginLeft: 8 }}>→ Last: <strong className="text-accent font-mono">{lbPayouts[lbPayouts.length - 1]?.toFixed(2)} {tokenLabel}</strong></span>
                                    <span style={{ marginLeft: "auto" }}>Total: <strong className="text-accent font-mono">{activeTotal.toFixed(2)} {tokenLabel}</strong></span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between mt-5 pt-4 border-t border-border-2">
                        <Button variant="secondary" onClick={onPrevious}>← Tasks</Button>
                        <Button
                            type="button"
                            onClick={() => {
                                if (stepValid) {
                                    setAttemptedNext(false)
                                    onNext()
                                } else {
                                    setAttemptedNext(true)
                                }
                            }}
                        >
                            Next: Preview →
                        </Button>
                    </div>
                    {attemptedNext && !stepValid && (
                        <div className="text-xs text-destructive mt-2 text-center">
                            Fix the fields above to continue
                        </div>
                    )}
                </div></div>
            )}
        </div>
    )
}
