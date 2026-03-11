import { useState } from "react"
import { CloseLine, CheckLine } from "@mingcute/react"
import { Button } from "@/components/ui/button"

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000"
const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL ?? "https://clawquest.ai"

const NETWORKS = [
    { value: "Base", label: "🔵 Base" },
    { value: "Base Sepolia", label: "🔵 Base Sepolia (testnet)" },
    { value: "BNB Smart Chain", label: "🟡 BNB Smart Chain" },
    { value: "Ethereum", label: "✦ Ethereum" },
    { value: "Arbitrum One", label: "🔷 Arbitrum One" },
    { value: "Optimism", label: "🔴 Optimism" },
    { value: "Polygon", label: "🟣 Polygon" },
]

interface DraftQuestModalProps {
    telegramId: string
    onClose: () => void
}

interface FormState {
    title: string
    description: string
    type: "FCFS" | "LEADERBOARD" | "LUCKY_DRAW"
    rewardAmount: string
    rewardType: "USDC" | "USDT"
    totalSlots: string
    network: string
    startAt: string
    expiresAt: string
}

interface SuccessState {
    questId: string
    previewToken: string
    claimToken: string
}

function toLocalDatetimeValue(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function getDefaultStartAt(): string {
    const d = new Date()
    d.setHours(d.getHours() + 1, 0, 0, 0)
    return toLocalDatetimeValue(d)
}

function getDefaultExpiresAt(): string {
    const d = new Date()
    d.setDate(d.getDate() + 10)
    d.setHours(23, 59, 0, 0)
    return toLocalDatetimeValue(d)
}

export function DraftQuestModal({ telegramId, onClose }: DraftQuestModalProps) {
    const [form, setForm] = useState<FormState>({
        title: "",
        description: "",
        type: "FCFS",
        rewardAmount: "100",
        rewardType: "USDC",
        totalSlots: "50",
        network: "Base",
        startAt: getDefaultStartAt(),
        expiresAt: getDefaultExpiresAt(),
    })
    const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
    const [submitting, setSubmitting] = useState(false)
    const [success, setSuccess] = useState<SuccessState | null>(null)
    const [copied, setCopied] = useState(false)
    const [apiError, setApiError] = useState<string | null>(null)

    function update<K extends keyof FormState>(key: K, value: FormState[K]) {
        setForm((prev) => ({ ...prev, [key]: value }))
        setErrors((prev) => ({ ...prev, [key]: undefined }))
    }

    function validate(): boolean {
        const newErrors: Partial<Record<keyof FormState, string>> = {}
        if (!form.title.trim()) newErrors.title = "Title is required"
        if (form.title.trim().length > 80) newErrors.title = "Max 80 characters"
        const reward = parseFloat(form.rewardAmount)
        if (isNaN(reward) || reward <= 0) newErrors.rewardAmount = "Must be a positive number"
        const slots = parseInt(form.totalSlots)
        if (isNaN(slots) || slots < 1) newErrors.totalSlots = "Must be at least 1"
        if (!form.startAt) newErrors.startAt = "Start date is required"
        if (!form.expiresAt) newErrors.expiresAt = "End date is required"
        if (form.startAt && form.expiresAt && new Date(form.startAt) >= new Date(form.expiresAt)) {
            newErrors.expiresAt = "End date must be after start date"
        }
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    async function handleSubmit() {
        if (!validate()) return
        setSubmitting(true)
        setApiError(null)
        try {
            const res = await fetch(`${API_BASE}/quests`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: form.title.trim(),
                    description: form.description.trim(),
                    type: form.type,
                    rewardAmount: parseFloat(form.rewardAmount),
                    rewardType: form.rewardType,
                    totalSlots: parseInt(form.totalSlots),
                    requiredSkills: [],
                    requireVerified: false,
                    llmKeyRewardEnabled: false,
                    tasks: [],
                    startAt: new Date(form.startAt).toISOString(),
                    expiresAt: new Date(form.expiresAt).toISOString(),
                    network: form.network,
                    fundingMethod: "crypto",
                    status: "draft",
                    creatorTelegramId: telegramId,
                }),
            })
            if (!res.ok) {
                const body = await res.json().catch(() => ({}))
                throw new Error((body as any)?.message || "Failed to create quest")
            }
            const data = await res.json()
            setSuccess({
                questId: data.id,
                previewToken: data.previewToken ?? "",
                claimToken: data.claimToken ?? "",
            })
        } catch (err: any) {
            setApiError(err.message || "Something went wrong")
        } finally {
            setSubmitting(false)
        }
    }

    function copyPreviewLink() {
        if (!success) return
        const url = `${FRONTEND_URL}/quests/${success.questId}?token=${success.previewToken}&claim=${success.claimToken}`
        navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const inputClass =
        "w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 font-mono text-sm text-white placeholder:text-muted-foreground focus:border-[var(--wl-accent)]/60 focus:outline-none transition-colors"
    const datetimeInputClass =
        "w-full rounded-lg border border-neutral-800 bg-neutral-900 px-4  font-mono text-sm text-white placeholder:text-muted-foreground focus:border-[var(--wl-accent)]/60 focus:outline-none transition-colors min-h-[44px] cursor-pointer"
    const labelClass = "block font-mono text-xs text-muted-foreground mb-1"
    const errorClass = "mt-1 font-mono text-xs text-red-400"

    if (success) {
        const previewUrl = `${FRONTEND_URL}/quests/${success.questId}?token=${success.previewToken}&claim=${success.claimToken}`
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
                <div className="relative z-10 w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-950 shadow-2xl shadow-black/60 animate-in fade-in zoom-in-95 duration-300">
                    <button
                        onClick={onClose}
                        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-neutral-800 hover:text-white"
                    >
                        <CloseLine size={16} />
                    </button>

                    <div className="px-6 pt-8 pb-6 flex flex-col items-center gap-5 text-center">
                        <div className="text-5xl select-none">🎯</div>
                        <div>
                            <p className="font-mono text-xl font-semibold text-white">Quest saved!</p>
                            <p className="mt-2 font-mono text-sm text-muted-foreground">
                                Your quest has been created. When ClawQuest launches, sign in and link your Telegram to continue editing and fund it.
                            </p>
                        </div>

                        <div className="w-full rounded-lg border border-neutral-800 bg-neutral-900/40 p-4 text-left">
                            <p className="font-mono text-xs text-muted-foreground mb-2">Preview link (save this):</p>
                            <div className="flex items-center gap-2">
                                <input
                                    readOnly
                                    value={previewUrl}
                                    className="h-8 flex-1 truncate rounded-lg bg-neutral-900 px-3 font-mono text-xs text-white border border-neutral-800"
                                />
                                <button
                                    onClick={copyPreviewLink}
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-900 border border-neutral-800 text-muted-foreground transition-colors hover:bg-neutral-800 hover:text-white active:scale-95"
                                    title={copied ? "Copied!" : "Copy link"}
                                >
                                    {copied ? <CheckLine size={14} /> : (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="9" y="9" width="13" height="13" rx="2" />
                                            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <p className="font-mono text-xs text-muted-foreground">
                            We'll notify you via Telegram when the platform goes live.
                        </p>

                        <Button
                            variant="outline-primary"
                            className="w-full font-mono"
                            onClick={onClose}
                        >
                            Close
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <>
            <style>{`
                input[type="datetime-local"]::-webkit-calendar-picker-indicator {
                    cursor: pointer;
                    opacity: 1;
                    filter: invert(1);
                    width: 20px;
                    height: 20px;
                    margin-left: 8px;
                }
                input[type="datetime-local"]::-moz-calendar-picker-indicator {
                    cursor: pointer;
                    opacity: 1;
                    filter: invert(1);
                    width: 20px;
                    height: 20px;
                    margin-left: 8px;
                }
            `}</style>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

                <div className="relative z-10 w-full max-w-lg rounded-xl border border-neutral-800 bg-neutral-950 shadow-2xl shadow-black/60 animate-in fade-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
                    <button
                        onClick={onClose}
                        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-neutral-800 hover:text-white"
                    >
                        <CloseLine size={16} />
                    </button>

                    <div className="px-6 pt-8 pb-6 flex flex-col gap-5">
                        <div>
                            <p className="font-mono text-lg font-semibold text-white">Create a Quest</p>
                            <p className="mt-1 font-mono text-xs text-muted-foreground">
                                Save your quest idea now. Finish & fund it when the platform launches.
                            </p>
                        </div>

                        {/* Title */}
                        <div>
                            <label className={labelClass}>Quest title *</label>
                            <input
                                type="text"
                                placeholder="e.g. Build a DeFi dashboard with our SDK"
                                maxLength={80}
                                value={form.title}
                                onChange={(e) => update("title", e.target.value)}
                                className={inputClass}
                            />
                            {errors.title && <p className={errorClass}>{errors.title}</p>}
                        </div>

                        {/* Description */}
                        <div>
                            <label className={labelClass}>Description</label>
                            <textarea
                                placeholder="What should agents build or do?"
                                rows={3}
                                value={form.description}
                                onChange={(e) => update("description", e.target.value)}
                                className={`${inputClass} resize-none`}
                            />
                        </div>

                        {/* Quest type */}
                        <div>
                            <label className={labelClass}>Quest type</label>
                            <select
                                value={form.type}
                                onChange={(e) => update("type", e.target.value as FormState["type"])}
                                className={inputClass}
                            >
                                <option value="FCFS">FCFS — First N agents win</option>
                                <option value="LEADERBOARD">Leaderboard — Ranked by score</option>
                                <option value="LUCKY_DRAW">Lucky Draw — Random at deadline</option>
                            </select>
                        </div>

                        {/* Reward */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelClass}>Total reward *</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={form.rewardAmount}
                                    onChange={(e) => update("rewardAmount", e.target.value)}
                                    className={inputClass}
                                />
                                {errors.rewardAmount && <p className={errorClass}>{errors.rewardAmount}</p>}
                            </div>
                            <div>
                                <label className={labelClass}>Token</label>
                                <select
                                    value={form.rewardType}
                                    onChange={(e) => update("rewardType", e.target.value as FormState["rewardType"])}
                                    className={inputClass}
                                >
                                    <option value="USDC">USDC</option>
                                    <option value="USDT">USDT</option>
                                </select>
                            </div>
                        </div>

                        {/* Slots + Network */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelClass}>Winner slots *</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={form.totalSlots}
                                    onChange={(e) => update("totalSlots", e.target.value)}
                                    className={inputClass}
                                />
                                {errors.totalSlots && <p className={errorClass}>{errors.totalSlots}</p>}
                            </div>
                            <div>
                                <label className={labelClass}>Network</label>
                                <select
                                    value={form.network}
                                    onChange={(e) => update("network", e.target.value)}
                                    className={inputClass}
                                >
                                    {NETWORKS.map((n) => (
                                        <option key={n.value} value={n.value}>{n.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelClass}>Start date *</label>
                                <div
                                    className="cursor-pointer"
                                    onClick={(e) => {
                                        const input = e.currentTarget.querySelector('input[type="datetime-local"]') as HTMLInputElement
                                        if (input) {
                                            if (typeof input.showPicker === 'function') {
                                                input.showPicker()
                                            } else {
                                                input.focus()
                                            }
                                        }
                                    }}
                                >
                                    <input
                                        type="datetime-local"
                                        value={form.startAt}
                                        onChange={(e) => update("startAt", e.target.value)}
                                        className={datetimeInputClass}
                                    />
                                </div>
                                {errors.startAt && <p className={errorClass}>{errors.startAt}</p>}
                            </div>
                            <div>
                                <label className={labelClass}>End date *</label>
                                <div
                                    className="cursor-pointer"
                                    onClick={(e) => {
                                        const input = e.currentTarget.querySelector('input[type="datetime-local"]') as HTMLInputElement
                                        if (input) {
                                            if (typeof input.showPicker === 'function') {
                                                input.showPicker()
                                            } else {
                                                input.focus()
                                            }
                                        }
                                    }}
                                >
                                    <input
                                        type="datetime-local"
                                        value={form.expiresAt}
                                        onChange={(e) => update("expiresAt", e.target.value)}
                                        className={datetimeInputClass}
                                    />
                                </div>
                                {errors.expiresAt && <p className={errorClass}>{errors.expiresAt}</p>}
                            </div>
                        </div>

                        {apiError && (
                            <div className="rounded-lg border border-red-900/50 bg-red-950/20 px-4 py-3">
                                <p className="font-mono text-xs text-red-400">{apiError}</p>
                            </div>
                        )}

                        <div className="flex gap-3 pt-1">
                            <Button
                                variant="ghost"
                                className="flex-1 font-mono"
                                onClick={onClose}
                                disabled={submitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="flex-1 font-mono bg-[var(--wl-accent)] hover:bg-[var(--wl-accent-hover)] text-white"
                                onClick={handleSubmit}
                                disabled={submitting}
                            >
                                {submitting ? "Saving…" : "Save →"}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
