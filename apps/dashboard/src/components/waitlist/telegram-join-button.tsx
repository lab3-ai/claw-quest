import { PlatformIcon } from "@/components/PlatformIcon"
import { ArrowRightLine } from "@mingcute/react"

const BOT_USERNAME = "ClawQuest_aibot"

interface TelegramJoinButtonProps {
    referralCode?: string   // pre-filled when user arrives via referral link
    compact?: boolean
    buttonText?: string
}

export function TelegramJoinButton({
    referralCode,
    compact,
    buttonText = "Join via Telegram",
}: TelegramJoinButtonProps) {
    const payload = referralCode ? `ref_${referralCode}` : "waitlist"
    const href = `https://t.me/${BOT_USERNAME}?start=${payload}`

    return (
        <div className={`flex w-full max-w-md flex-col gap-2`}>
            <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={`group flex items-center justify-center gap-2 rounded-lg bg-[var(--wl-accent)] font-mono font-semibold text-white no-underline transition-colors hover:bg-[var(--wl-accent-hover)] active:scale-95
                    ${compact ? "px-4 py-2.5 text-sm min-h-10" : "px-6 py-3 text-sm min-h-12 w-full"}`}
            >
                <PlatformIcon name="telegram" size={18} />
                {buttonText}
                <ArrowRightLine size={16} className="transition-transform group-hover:translate-x-0.5" />
            </a>
            <p className="text-center font-mono text-xs text-surface-dark-muted">
                Opens Telegram — bot replies instantly with your spot
            </p>
        </div>
    )
}
