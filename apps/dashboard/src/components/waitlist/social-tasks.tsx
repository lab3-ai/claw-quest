import { useState, useEffect, useRef } from "react"
import { CheckLine, LoadingLine, ArrowRightLine } from "@mingcute/react"
import { PlatformIcon } from "@/components/PlatformIcon"
import { TELEGRAM_BOT_USERNAME } from "@/lib/telegram-oidc"
import { WAITLIST_TOKEN_KEY } from "@/components/waitlist/telegram-join-button"

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000"
const X_PROFILE_URL = "https://x.com/clawquest_ai"

const FOLLOW_DELAY_MS = 5000

interface SocialTasksProps {
    referralCode?: string
}

export function SocialTasks({ referralCode }: SocialTasksProps) {
    const [followPending, setFollowPending] = useState(false)
    const [followDone, setFollowDone] = useState(false)
    const [claimLoading, setClaimLoading] = useState(false)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    function handleFollow() {
        window.open(X_PROFILE_URL, "_blank", "noopener,noreferrer")
        setFollowPending(true)
        timerRef.current = setTimeout(() => {
            setFollowPending(false)
            setFollowDone(true)
        }, FOLLOW_DELAY_MS)
    }

    async function handleClaim() {
        if (claimLoading) return
        setClaimLoading(true)
        try {
            const res = await fetch(`${API_BASE}/waitlist/token`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ referredBy: referralCode }),
            })
            if (res.ok) {
                const { accessToken } = await res.json()
                localStorage.setItem(WAITLIST_TOKEN_KEY, accessToken)
                window.open(
                    `https://t.me/${TELEGRAM_BOT_USERNAME}?start=wl_${accessToken}`,
                    "_blank",
                    "noopener,noreferrer"
                )
            } else {
                const payload = referralCode ? `ref_${referralCode}` : "waitlist"
                window.open(
                    `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${payload}`,
                    "_blank",
                    "noopener,noreferrer"
                )
            }
        } catch {
            const payload = referralCode ? `ref_${referralCode}` : "waitlist"
            window.open(
                `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${payload}`,
                "_blank",
                "noopener,noreferrer"
            )
        } finally {
            setClaimLoading(false)
        }
    }

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current)
        }
    }, [])

    return (
        <div className="w-full  flex flex-col gap-3">
            {/* Header label */}
            <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-neutral-800" />
                <p className="font-mono text-[10px] text-neutral-500 uppercase tracking-widest">
                    Your first quest — complete to unlock early access
                </p>
                <div className="h-px flex-1 bg-neutral-800" />
            </div>

            {/* Steps card */}
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 overflow-hidden divide-y divide-neutral-800/60">

                {/* Step 1 — Follow */}
                <div className={`flex items-center gap-4 px-4 py-3.5 transition-colors ${followDone ? "bg-[var(--wl-accent)]/5" : ""}`}>
                    {/* Step badge */}
                    <div className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 font-mono text-xs font-bold transition-all duration-300 ${followDone
                        ? "border-[var(--wl-accent)] bg-[var(--wl-accent)] text-white shadow-[0_0_10px_var(--wl-accent)]/40"
                        : followPending
                            ? "border-[var(--wl-accent)]/50 text-[var(--wl-accent)] animate-pulse"
                            : "border-neutral-700 text-neutral-500"
                        }`}>
                        {followDone ? <CheckLine size={13} /> : "1"}
                    </div>

                    {/* Text */}
                    <div className="flex flex-1 flex-col min-w-0">
                        <p className={`font-mono text-sm font-semibold leading-tight transition-colors ${followDone ? "text-white" : "text-white/90"}`}>
                            Follow{" "}
                            <span className={followDone ? "text-[var(--wl-accent)]" : "text-white"}>
                                @ClawQuestAI
                            </span>
                            {" "}on X
                        </p>
                        <p className="font-mono text-[11px] text-neutral-500 mt-0.5">
                            {followPending ? (
                                <span className="text-[var(--wl-accent)]/70 animate-pulse">Verifying...</span>
                            ) : followDone ? (
                                <span className="text-[var(--wl-accent)]/70">Completed ✓</span>
                            ) : (
                                "Required — unlocks step 2"
                            )}
                        </p>
                    </div>

                    {/* Action button */}
                    <button
                        type="button"
                        onClick={handleFollow}
                        disabled={followDone || followPending}
                        className={`shrink-0 flex items-center gap-1.5 rounded-lg px-3.5 py-2 font-mono text-xs font-semibold transition-all duration-200 active:scale-95 ${followDone || followPending
                            ? "bg-neutral-800 text-neutral-600 cursor-default"
                            : "bg-[var(--wl-accent)] text-white hover:bg-[var(--wl-accent-hover)] shadow-md shadow-[var(--wl-accent)]/20"
                            }`}
                    >
                        {followDone ? (
                            <CheckLine size={12} />
                        ) : (
                            <PlatformIcon name="x" size={12} style={{ filter: "brightness(0) invert(1)" }} />
                        )}
                        {followDone ? "Done" : followPending ? "..." : "Follow"}
                    </button>
                </div>

                {/* Step 2 — Claim */}
                <div className={`flex items-center gap-4 px-4 py-3.5 transition-all duration-300 ${!followDone ? "opacity-50" : ""}`}>
                    {/* Step badge */}
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 font-mono text-xs font-bold transition-all duration-300 ${followDone
                        ? "border-[var(--wl-accent)]/50 text-[var(--wl-accent)]"
                        : "border-neutral-800 text-neutral-700"
                        }`}>
                        2
                    </div>

                    {/* Text */}
                    <div className="flex flex-1 flex-col min-w-0">
                        <p className="font-mono text-sm font-semibold text-white/90 leading-tight">
                            Claim your spot
                        </p>
                        <p className="font-mono text-[11px] text-neutral-500 mt-0.5">
                            Opens Telegram — bot replies instantly
                        </p>
                    </div>

                    {/* Action button */}
                    <button
                        type="button"
                        onClick={handleClaim}
                        disabled={!followDone || claimLoading}
                        className={`shrink-0 flex items-center gap-1.5 rounded-lg px-3.5 py-2 font-mono text-xs font-semibold transition-all duration-200 active:scale-95 ${followDone
                            ? "bg-[var(--wl-accent)] text-white hover:bg-[var(--wl-accent-hover)] shadow-md shadow-[var(--wl-accent)]/20"
                            : "bg-neutral-800/60 text-neutral-700 cursor-not-allowed"
                            }`}
                    >
                        {claimLoading ? (
                            <LoadingLine size={12} className="animate-spin" />
                        ) : (
                            <PlatformIcon name="telegram" size={12} style={{ filter: "brightness(0) invert(1)" }} />
                        )}
                        {claimLoading ? "Opening..." : "Claim"}
                        {!claimLoading && followDone && <ArrowRightLine size={12} />}
                    </button>
                </div>
            </div>

            {/* RT hint */}
            <p className="font-mono text-[11px] text-neutral-600 text-center">
                Retweet our{" "}
                <a
                    href="https://x.com/clawquest_ai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-500 hover:text-neutral-300 underline underline-offset-2 transition-colors"
                >
                    announcement
                </a>
                {" "}after joining to earn{" "}
                <span className="text-[var(--wl-accent)]/70">+20 XP</span> bonus.
            </p>
        </div>
    )
}
