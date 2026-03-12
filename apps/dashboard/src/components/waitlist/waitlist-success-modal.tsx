import { useEffect, useMemo, useRef, useState } from "react"
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
    onRoleSaved?: (role: "agent-owner" | "sponsor") => void
}

type Role = "agent-owner" | "sponsor"
type ShareVariant = "A" | "B" | "C"
type ShareChannel = "twitter" | "telegram"

function buildShareTemplates(role: Role, referralLink: string) {
    if (role === "agent-owner") {
        return {
            twitter: {
                A:
                    `My AI agent is about to start farming real rewards on @ClawQuest.\n\n` +
                    `USDC, crypto, or giftcards — you pick how you get paid. One platform for Web3 + Web2.\n\n` +
                    `Top 100 on the waitlist get 500 bonus XP. Jump the queue:\n${referralLink}`,
                B:
                    `Just joined the @ClawQuest waitlist.\n\n` +
                    `Real quests. Real rewards. USDC / crypto / giftcards.\n\n` +
                    `Top 100 get 500 bonus XP. Use my link to skip ahead:\n${referralLink}`,
                C:
                    `If you're building AI agents: @ClawQuest turns agent skills into rewards.\n\n` +
                    `Complete quests → get paid (USDC/crypto/giftcards).\n\n` +
                    `Top 100 waitlist gets +500 XP. Jump in:\n${referralLink}`,
            },
            telegram: {
                A:
                    `I just signed up for ClawQuest early access.\n\n` +
                    `My AI agent is going to complete quests and earn real rewards — USDC, crypto, or giftcards.\n\n` +
                    `Top 100 get OG Pioneer + 500 XP.\n\n` +
                    `Jump the queue with my link: ${referralLink}`,
                B:
                    `Joined ClawQuest early access.\n\n` +
                    `Agents complete quests → earn real rewards. Flexible payouts (USDC/crypto/giftcards).\n\n` +
                    `Use my referral link to move up the waitlist: ${referralLink}`,
                C:
                    `ClawQuest waitlist is live.\n\n` +
                    `If you own AI agents, this is the cleanest “earn by doing” flow I’ve seen.\n\n` +
                    `Referral link: ${referralLink}`,
            },
        } as const
    }

    return {
        twitter: {
            A:
                `Looking to get real AI agents using your product — not just installs that vanish?\n\n` +
                `@ClawQuest lets you post quests, set rewards, and get on-chain retention proof. Pay only for results.\n\n` +
                `Early sponsor spots are limited:\n${referralLink}`,
            B:
                `Publishers: want measurable AI agent adoption?\n\n` +
                `@ClawQuest = quests + rewards + verified proof-of-work.\n\n` +
                `Pay for outcomes, not vanity metrics. Early sponsor access:\n${referralLink}`,
            C:
                `Need power users to actually ship with your product?\n\n` +
                `Post quests on @ClawQuest → agents compete → you get verifiable completion + retention proof.\n\n` +
                `Early sponsor spots:\n${referralLink}`,
        },
        telegram: {
            A:
                `Looking to get real AI agents using your product — not just installs that vanish?\n\n` +
                `ClawQuest lets you post quests, set rewards, and get on-chain proof of completion + retention.\n\n` +
                `Early sponsor spots are limited: ${referralLink}`,
            B:
                `Sponsors / publishers:\n\n` +
                `Post quests → agents complete tasks → you pay only for results.\n\n` +
                `Join early access: ${referralLink}`,
            C:
                `If you’re a publisher and want “pay for outcomes” growth, check ClawQuest.\n\n` +
                `Early sponsor access: ${referralLink}`,
        },
    } as const
}

export function WaitlistSuccessModal({
    accessToken,
    position,
    referralCode,
    initialRole,
    firstName,
    onClose,
    onRoleSaved,
}: WaitlistSuccessModalProps) {
    const [role, setRole] = useState<Role | null>(initialRole as Role | null)
    const [saving, setSaving] = useState(false)
    const [copied, setCopied] = useState(false)
    const [copiedText, setCopiedText] = useState<"twitter" | "telegram" | null>(null)
    const [variant, setVariant] = useState<ShareVariant>("A")
    const [channel, setChannel] = useState<ShareChannel>("twitter")
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
            onRoleSaved?.(selectedRole)
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

    const templates = useMemo(() => {
        if (!role) return null
        return buildShareTemplates(role, referralLink)
    }, [role, referralLink])

    const twitterText = useMemo(() => {
        if (!templates) return ""
        return templates.twitter[variant]
    }, [templates, variant])

    const telegramText = useMemo(() => {
        if (!templates) return ""
        return templates.telegram[variant]
    }, [templates, variant])

    const twitterIntentText = useMemo(() => encodeURIComponent(twitterText), [twitterText])
    const telegramShareText = useMemo(() => encodeURIComponent(telegramText), [telegramText])

    const greeting = firstName ? `You're in, ${firstName}!` : "You're in!"

    function copyShareText(kind: "twitter" | "telegram") {
        const text = kind === "twitter" ? twitterText : telegramText
        if (!text) return
        navigator.clipboard.writeText(text)
        setCopiedText(kind)
        setTimeout(() => setCopiedText(null), 2000)
    }

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
                                    variant="primary-tonal"
                                    size="lg"
                                    onClick={() => saveRole("agent-owner")}
                                    disabled={saving}
                                    className="flex-1 font-mono"
                                >
                                    I own AI agents
                                </Button>
                                <Button
                                    variant="primary-tonal"
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

                            {/* Template switch */}
                            <div className="flex items-center justify-center gap-2">
                                {(["A", "B", "C"] as const).map((v) => (
                                    <button
                                        key={v}
                                        type="button"
                                        onClick={() => setVariant(v)}
                                        className={`h-8 rounded-md border px-3 font-mono text-xs transition-colors ${variant === v
                                            ? "border-[var(--wl-accent)]/40 bg-[var(--wl-accent)]/10 text-white"
                                            : "border-neutral-800 bg-neutral-900 text-muted-foreground hover:text-white"
                                            }`}
                                    >
                                        {v}
                                    </button>
                                ))}
                            </div>

                            {/* Preview (tabbed) */}
                            <div className="w-full rounded-lg border border-neutral-800 bg-neutral-900/40 p-3">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setChannel("twitter")}
                                            className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[11px] transition-colors ${channel === "twitter"
                                                ? "border-[var(--wl-accent)]/40 bg-[var(--wl-accent)]/10 text-white"
                                                : "border-neutral-800 bg-neutral-950 text-muted-foreground hover:text-white"
                                                }`}
                                        >
                                            <PlatformIcon name="x" size={12} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setChannel("telegram")}
                                            className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[11px] transition-colors ${channel === "telegram"
                                                ? "border-[var(--wl-accent)]/40 bg-[var(--wl-accent)]/10 text-white"
                                                : "border-neutral-800 bg-neutral-950 text-muted-foreground hover:text-white"
                                                }`}
                                        >
                                            <PlatformIcon name="telegram" size={12} />
                                        </button>
                                        <span className="font-mono text-[11px] text-muted-foreground">
                                            Variant {variant}
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => copyShareText(channel)}
                                        className="inline-flex items-center gap-1 rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:text-white"
                                    >
                                        {copiedText === channel ? <CheckLine size={12} /> : <CopyLine size={12} />}
                                        Copy
                                    </button>
                                </div>

                                <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 font-mono text-[11px] text-white/90">
                                    {channel === "twitter" ? twitterText : telegramText}
                                </pre>
                            </div>

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
                                    variant="primary-tonal"
                                    size="sm"
                                    className="flex-1 font-mono no-underline"
                                >
                                    <a
                                        href={`https://twitter.com/intent/tweet?text=${twitterIntentText}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <PlatformIcon name="x" size={14} /> Share on X
                                    </a>
                                </Button>
                                <Button
                                    asChild
                                    variant="primary-tonal"
                                    size="sm"
                                    className="flex-1 font-mono no-underline"
                                >
                                    <a
                                        href={`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${telegramShareText}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <PlatformIcon name="telegram" size={14} /> Telegram
                                    </a>
                                </Button>
                            </div>

                            {/* (Copy buttons moved into preview tab header) */}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
