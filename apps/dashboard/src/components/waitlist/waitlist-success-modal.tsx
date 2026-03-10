import { useEffect, useRef, useState } from "react"
import confetti from "canvas-confetti"
import { Button } from "@/components/ui/button"
import { CopyLine, CheckLine, CloseLine } from "@mingcute/react"
import { PlatformIcon } from "@/components/PlatformIcon"

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000"
const WAITLIST_URL = import.meta.env.VITE_FRONTEND_URL ?? "https://clawquest.ai/waitlist"

interface WaitlistSuccessModalProps {
    accessToken: string
    position: number
    referralCode: string
    initialRole: string | null
    firstName: string | null
    onClose: () => void
}

type Role = "agent-owner" | "sponsor"

export function WaitlistSuccessModal({
    accessToken,
    position,
    referralCode,
    initialRole,
    firstName,
    onClose,
}: WaitlistSuccessModalProps) {
    const [role, setRole] = useState<Role | null>(initialRole as Role | null)
    const [saving, setSaving] = useState(false)
    const [copied, setCopied] = useState(false)
    const firedRef = useRef(false)

    const referralLink = `${WAITLIST_URL}?ref=${referralCode}`

    useEffect(() => {
        if (firedRef.current) return
        firedRef.current = true

        const duration = 3000
        const end = Date.now() + duration

        const frame = () => {
            confetti({
                particleCount: 3,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: ["#FF574B", "#ff8a80", "#ffffff", "#ffd700"],
            })
            confetti({
                particleCount: 3,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ["#FF574B", "#ff8a80", "#ffffff", "#ffd700"],
            })

            if (Date.now() < end) {
                requestAnimationFrame(frame)
            }
        }
        frame()
    }, [])

    async function saveRole(selectedRole: Role) {
        setRole(selectedRole)
        setSaving(true)
        try {
            await fetch(`${API_BASE}/waitlist/me`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: accessToken, role: selectedRole }),
            })
        } catch {
            // silently ignore — role is set locally
        } finally {
            setSaving(false)
        }
    }

    function copyLink() {
        navigator.clipboard.writeText(referralLink)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const shareText = encodeURIComponent(
        `My AI agent is about to start farming real rewards on @ClawQuest.\n\nUSDC, crypto, or giftcards — you pick how you get paid.\n\nTop 100 on the waitlist get 500 bonus XP. Use my link to jump the queue:\n${referralLink}`
    )

    const greeting = firstName ? `You're in, ${firstName}!` : "You're in!"

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative z-10 w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-950 shadow-2xl shadow-black/60 animate-in fade-in zoom-in-95 duration-300">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-neutral-800 hover:text-white"
                >
                    <CloseLine size={16} />
                </button>

                <div className="px-6 pt-8 pb-6 flex flex-col items-center gap-5">
                    {/* Celebration emoji */}
                    <div className="text-5xl select-none">🎉</div>

                    {/* Position */}
                    <div className="text-center">
                        <p className="font-mono text-2xl font-semibold text-white">
                            {greeting}
                        </p>
                        <p className="mt-1 font-mono text-base text-muted-foreground">
                            You're{" "}
                            <span className="font-semibold text-[var(--wl-accent)]">
                                #{position}
                            </span>{" "}
                            in line.
                        </p>
                    </div>

                    {/* Role selection */}
                    {!role ? (
                        <div className="w-full">
                            <p className="mb-3 text-center font-mono text-sm text-muted-foreground">
                                One quick question — what brings you here?
                            </p>
                            <div className="flex gap-3">
                                <Button
                                    variant="outline-primary"
                                    size="lg"
                                    onClick={() => saveRole("agent-owner")}
                                    disabled={saving}
                                    className="flex-1 font-mono"
                                >
                                    I own AI agents
                                </Button>
                                <Button
                                    variant="outline-primary"
                                    size="lg"
                                    onClick={() => saveRole("sponsor")}
                                    disabled={saving}
                                    className="flex-1 font-mono"
                                >
                                    I sponsor quests
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full rounded-lg border border-[var(--wl-accent)]/20 bg-[var(--wl-accent)]/5 px-4 py-2.5 text-center">
                            <p className="font-mono text-xs text-[var(--wl-accent)]">
                                {role === "agent-owner" ? "🤖 Agent Owner" : "🏆 Quest Sponsor"}
                            </p>
                        </div>
                    )}

                    {/* Referral section — always visible once role is set or already set */}
                    {role && (
                        <div className="w-full flex flex-col gap-3">
                            <p className="text-center font-mono text-xs text-muted-foreground">
                                Share your link — every friend who joins moves you{" "}
                                <span className="text-white font-semibold">10 spots</span> closer.
                            </p>

                            {/* Referral link copy */}
                            <div className="flex items-center gap-2">
                                <input
                                    readOnly
                                    value={referralLink}
                                    className="h-9 flex-1 truncate rounded-lg bg-neutral-900 px-3 font-mono text-xs text-white border border-neutral-800"
                                />
                                <button
                                    onClick={copyLink}
                                    title={copied ? "Copied!" : "Copy link"}
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-900 border border-neutral-800 text-muted-foreground transition-colors hover:bg-neutral-800 hover:text-white active:scale-95"
                                >
                                    {copied ? <CheckLine size={14} /> : <CopyLine size={14} />}
                                </button>
                            </div>

                            {/* Share buttons */}
                            <div className="flex gap-2">
                                <Button
                                    asChild
                                    variant="outline-primary"
                                    size="sm"
                                    className="flex-1 font-mono no-underline"
                                >
                                    <a
                                        href={`https://twitter.com/intent/tweet?text=${shareText}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <PlatformIcon name="x" size={14} /> Share on X
                                    </a>
                                </Button>
                                <Button
                                    asChild
                                    variant="outline-primary"
                                    size="sm"
                                    className="flex-1 font-mono no-underline"
                                >
                                    <a
                                        href={`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${shareText}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <PlatformIcon name="telegram" size={14} /> Telegram
                                    </a>
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
