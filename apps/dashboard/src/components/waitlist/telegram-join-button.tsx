import { useState } from "react"
import { PlatformIcon } from "@/components/PlatformIcon"
import { ArrowRightLine, LoadingLine } from "@mingcute/react"
import { TELEGRAM_BOT_USERNAME } from "@/lib/telegram-oidc"
import { Button } from "@/components/ui/button"

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
        <div className="flex w-full max-w-md flex-col gap-3">
            <Button
                variant="default"
                size={compact ? "default" : "lg"}
                className={`group w-full font-mono ${compact ? "" : "min-h-12"}`}
                disabled={loading}
                asChild
            >
                <a
                    href="#"
                    onClick={handleClick}
                    rel="noopener noreferrer"
                >
                    {loading ? (
                        <LoadingLine size={18} className="animate-spin" />
                    ) : (
                        <PlatformIcon name="telegram" size={18} style={{ filter: "brightness(0) invert(1)" }} />
                    )}
                    {buttonText}
                    {!loading && (
                        <ArrowRightLine size={16} className="transition-transform group-hover:translate-x-0.5" />
                    )}
                </a>
            </Button>
            <p className="text-center font-mono text-xs text-muted-foreground">
                Opens Telegram — bot replies instantly with your spot
            </p>
        </div>
    )
}
