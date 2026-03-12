import { useState } from "react"
import { PlatformIcon } from "@/components/PlatformIcon"
import { ArrowRightLine, LoadingLine } from "@mingcute/react"
import { TELEGRAM_BOT_USERNAME } from "@/lib/telegram-oidc"

const BOT_USERNAME = TELEGRAM_BOT_USERNAME
const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000"
export const WAITLIST_TOKEN_KEY = "cq_waitlist_token"

interface TelegramJoinButtonProps {
    referralCode?: string
    compact?: boolean
    buttonText?: string
}

export function TelegramJoinButton({
    referralCode,
    compact,
    buttonText = "Join via Telegram",
}: TelegramJoinButtonProps) {
    const [loading, setLoading] = useState(false)

    async function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
        e.preventDefault()
        if (loading) return
        setLoading(true)

        try {
            // Create a pending waitlist entry and get an access token
            const res = await fetch(`${API_BASE}/waitlist/token`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ referredBy: referralCode }),
            })

            if (res.ok) {
                const { accessToken } = await res.json()
                localStorage.setItem(WAITLIST_TOKEN_KEY, accessToken)
                const href = `https://t.me/${BOT_USERNAME}?start=wl_${accessToken}`
                window.open(href, "_blank", "noopener,noreferrer")
            } else {
                // Fallback: open Telegram without token
                const payload = referralCode ? `ref_${referralCode}` : "waitlist"
                window.open(`https://t.me/${BOT_USERNAME}?start=${payload}`, "_blank", "noopener,noreferrer")
            }
        } catch {
            // Network error fallback
            const payload = referralCode ? `ref_${referralCode}` : "waitlist"
            window.open(`https://t.me/${BOT_USERNAME}?start=${payload}`, "_blank", "noopener,noreferrer")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={`flex w-full max-w-md flex-col gap-2`}>
            <a
                href="#"
                onClick={handleClick}
                rel="noopener noreferrer"
                className={`group flex items-center justify-center gap-2 rounded-lg bg-[var(--wl-accent)] font-mono font-semibold text-white no-underline transition-colors hover:bg-[var(--wl-accent-hover)] active:scale-95
                    ${loading ? "opacity-70 pointer-events-none" : ""}
                    ${compact ? "px-4 py-2.5 text-sm min-h-10" : "px-6 py-3 text-sm min-h-12 w-full"}`}
            >
                {loading ? (
                    <LoadingLine size={18} className="animate-spin" />
                ) : (
                    <PlatformIcon name="telegram" size={18} />
                )}
                {buttonText}
                {!loading && (
                    <ArrowRightLine size={16} className="transition-transform group-hover:translate-x-0.5" />
                )}
            </a>
            <p className="text-center font-mono text-xs text-surface-dark-muted">
                Opens Telegram — bot replies instantly with your spot
            </p>
        </div>
    )
}
