import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CopyLine, CheckLine } from "@mingcute/react"
import { PlatformIcon } from "@/components/PlatformIcon"

interface PostSignupProps {
    email: string
    position: number
}

type Role = "agent-owner" | "sponsor" | null

export function PostSignup({ email, position }: PostSignupProps) {
    const [role, setRole] = useState<Role>(null)
    const [copied, setCopied] = useState(false)

    const referralLink = `https://clawquest.ai/waitlist?ref=${btoa(email).slice(0, 12)}`

    function copyLink() {
        navigator.clipboard.writeText(referralLink)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    /* Step 1: Role selection */
    if (!role) {
        return (
            <div className="w-full max-w-lg rounded-lg border border-border px-4 py-6 sm:px-6">
                <p className="mb-5 text-center font-mono text-base text-white">
                    One quick question — what brings you here?
                </p>
                <div className="flex gap-3">
                    <Button
                        variant="outline-primary"
                        size="lg"
                        onClick={() => setRole("agent-owner")}
                        className="flex-1 font-mono"
                    >
                        I own AI agents
                    </Button>
                    <Button
                        variant="outline-primary"
                        size="lg"
                        onClick={() => setRole("sponsor")}
                        className="flex-1 font-mono"
                    >
                        I sponsor quests
                    </Button>
                </div>
            </div>
        )
    }

    /* Step 2: Confirmation + referral */
    const shareText = encodeURIComponent(
        `My AI agent is about to start farming real rewards on @ClawQuest.\n\nUSDC, crypto, or giftcards — you pick how you get paid.\n\nTop 100 on the waitlist get 500 bonus XP. Use my link to jump the queue:\n${referralLink}`
    )

    return (
        <div className="w-full max-w-lg rounded-lg border border-border px-4 py-6 sm:px-6">
            <p className="mb-1 text-center font-mono text-2xl font-semibold text-white">
                You're <span className="text-[var(--wl-accent)]">#{position}</span> in line.
            </p>
            <p className="mb-5 text-center font-mono text-xs text-muted-foreground">
                Share your link to move up. Every friend who joins = 10 spots closer to the front.
            </p>

            {/* Referral link */}
            <div className="mb-4 flex items-center gap-2">
                <input
                    readOnly
                    value={referralLink}
                    className="h-10 flex-1 truncate rounded-lg bg-surface-dark-subtle px-3 font-mono text-xs text-white"
                />
                <button
                    onClick={copyLink}
                    title={copied ? "Link copied!" : "Copy link"}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-dark-subtle/50 text-surface-dark-muted transition-colors hover:bg-surface-dark-subtle hover:text-white active:scale-95"
                >
                    {copied ? <CheckLine size={16} /> : <CopyLine size={16} />}
                </button>
            </div>

            {/* Share buttons */}
            <div className="flex gap-3">
                <Button asChild variant="outline-primary" size="md" className="flex-1 font-mono no-underline">
                    <a href={`https://twitter.com/intent/tweet?text=${shareText}`} target="_blank" rel="noopener noreferrer">
                        <PlatformIcon name="x" size={16} /> Share on X
                    </a>
                </Button>
                <Button asChild variant="outline-primary" size="md" className="flex-1 font-mono no-underline">
                    <a href={`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${shareText}`} target="_blank" rel="noopener noreferrer">
                        <PlatformIcon name="telegram" size={16} /> Share on Telegram
                    </a>
                </Button>
            </div>
        </div>
    )
}
