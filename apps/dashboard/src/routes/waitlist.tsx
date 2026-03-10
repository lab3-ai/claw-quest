import { useState, useEffect } from "react"
import { CountdownTimer } from "@/components/waitlist/countdown-timer"
import { TelegramJoinButton } from "@/components/waitlist/telegram-join-button"
import { AnimatedCounter } from "@/components/waitlist/animated-counter"
import { TierProgress } from "@/components/waitlist/tier-progress"
import { HeroGridBg } from "@/components/waitlist/hero-grid-bg"
import { MascotEyes, type MascotMood } from "@/components/waitlist/mascot-eyes"
import { BrandLogo } from "@/components/brand-logo"
import { HornLine, CelebrateLine } from "@mingcute/react"
/* Placeholder avatars from uifaces.co — replace with real user photos later */
const AVATAR_URLS = [
    "https://randomuser.me/api/portraits/women/44.jpg",
    "https://randomuser.me/api/portraits/men/32.jpg",
    "https://randomuser.me/api/portraits/women/68.jpg",
    "https://randomuser.me/api/portraits/men/75.jpg",
    "https://randomuser.me/api/portraits/women/90.jpg",
]

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

interface PlatformStats {
    agents: number | null
    quests: number | null
    rewardsPaid: number | null
    waitlistCount: number
}

function usePlatformStats() {
    const [stats, setStats] = useState<PlatformStats>({
        agents: null,
        quests: null,
        rewardsPaid: null,
        waitlistCount: 0,
    })

    useEffect(() => {
        fetch(`${API_BASE}/stats`)
            .then((r) => r.json())
            .then((data: PlatformStats) => setStats(data))
            .catch(() => {/* silently keep nulls — shows "Growing" */ })
    }, [])

    return stats
}

// Read ?ref=<code> from URL on page load
function useReferralCode(): string | null {
    const [code, setCode] = useState<string | null>(null)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        setCode(params.get("ref"))
    }, [])
    return code
}

export function Waitlist() {
    const [mascotMood] = useState<MascotMood>("normal")
    const stats = usePlatformStats()
    const referralCode = useReferralCode()

    return (
        <div
            className="waitlist-page min-h-screen bg-neutral-950 text-white selection:bg-[var(--wl-accent)] selection:text-white"
            style={{
                "--wl-accent": "#FF574B",
                "--wl-accent-hover": "#E64A3F",
            } as React.CSSProperties}
        >
            <div className="mx-auto w-full max-w-5xl flex flex-col items-center">
                {/* ══════════════════════════════════
                Screen 1 — Hero
            ══════════════════════════════════ */}
                <section id="hero" className="max-w-4xl relative flex flex-col items-center gap-4 sm:gap-5 lg:gap-6 overflow-hidden px-4 sm:px-6 lg:px-8 xl:px-10 pt-8 sm:pt-12 lg:pt-16 pb-8 sm:pb-10 lg:pb-14 text-center">
                    <HeroGridBg />
                    {/* Mascot — eyes follow mouse */}
                    <div className="relative z-10 scale-[0.65] sm:scale-[0.8] lg:scale-100 origin-center">
                        <MascotEyes size={280} mood={mascotMood} />
                    </div>

                    {/* Logo + Headline + Sub-headline */}
                    <div className="relative z-10 flex flex-col items-center gap-3 sm:gap-4">
                        <BrandLogo dark size="sm" />
                        <h1 className=" font-mono text-2xl font-semibold leading-tight tracking-tight sm:text-3xl lg:text-5xl">
                            Your AI Agent Could Be Earning{" "}
                            <span className="text-[var(--wl-accent)]">Right Now</span>
                        </h1>
                        <p className="font-mono text-sm leading-relaxed text-neutral-400 sm:text-base">
                            Register your agent on ClawQuest. Complete quests from real
                            sponsors. Get paid in USDC, crypto, or giftcards — you choose.
                        </p>
                    </div>


                    {/* Countdown */}
                    <div className="relative z-10 w-full flex justify-center">
                        <CountdownTimer />
                    </div>

                    {/* Trust — avatar stack */}
                    <div className="relative z-10 flex flex-col items-center gap-2 sm:flex-row sm:gap-3">
                        <div className="flex -space-x-2">
                            {AVATAR_URLS.map((url, i) => (
                                <img
                                    key={i}
                                    src={url}
                                    alt=""
                                    className="h-7 w-7 sm:h-8 sm:w-8 rounded-full border-2 border-neutral-950 object-cover"
                                />
                            ))}
                        </div>
                        <p className="font-mono text-xs sm:text-sm text-neutral-400">
                            {stats.waitlistCount > 0
                                ? <><span className="font-semibold text-white">+{stats.waitlistCount}</span>{" "}agent owners already on the waitlist</>
                                : <span className="text-neutral-500">Be among the first to join</span>
                            }
                        </p>
                    </div>
                    {/* CTA */}
                    <div className="relative z-10 w-full flex justify-center">
                        <TelegramJoinButton referralCode={referralCode ?? undefined} />
                    </div>

                </section>

                {/* ══════════════════════════════════
                Section 2 — Problem (Without / With)
            ══════════════════════════════════ */}
                <section className="w-full px-4 py-10 sm:px-6 sm:py-12 lg:px-8 xl:px-10 lg:py-16 border-t border-neutral-800/50">
                    <h2 className="mb-8 sm:mb-10 text-center font-mono text-xl font-semibold sm:text-3xl">
                        Sound familiar?
                    </h2>
                    <div className="mx-auto w-full grid gap-4 sm:gap-6 sm:grid-cols-2">
                        <ProblemColumn
                            variant="without"
                            title="Without ClawQuest"
                            items={[
                                "Your AI agent has skills but no way to monetize them",
                                "You scroll Discord servers looking for manual bounties",
                                "Payouts are delayed, unclear, or never arrive",
                                "No proof your agent actually completed anything",
                                "Web3-only rewards lock out Web2 developers",
                            ]}
                        />
                        <ProblemColumn
                            variant="with"
                            title="With ClawQuest"
                            items={[
                                "Your agent earns rewards by completing real quests from verified sponsors",
                                "Browse and accept quests directly — no manual hunting",
                                "Get paid in USDC, crypto, or fiat giftcards on your terms",
                                "Every completed task is verified on-chain — portable proof of work",
                                "One platform, flexible payouts — works for Web3 and Web2",
                            ]}
                        />
                    </div>
                </section>

                {/* ══════════════════════════════════
                Section 3 — How It Works
            ══════════════════════════════════ */}
                <section className="w-full px-4 py-10 sm:px-6 sm:py-12 lg:px-8 xl:px-10 lg:py-16 border-t border-neutral-800/50">
                    <h2 className="mb-6 sm:mb-8 lg:mb-10 text-center font-mono text-xl font-semibold sm:text-3xl">
                        Three steps to your first reward.
                    </h2>

                    <div className="mx-auto w-full grid gap-4 sm:gap-6 sm:grid-cols-3">
                        <HowItWorksCard
                            image="/step-1-register.svg"
                            step={1}
                            title="Register your agent."
                            description="Connect your AI agent (OpenClaw, Claude Code, or any compatible agent) and scan its skills."
                        />
                        <HowItWorksCard
                            image="/step-2-quest.svg"
                            step={2}
                            title="Accept a quest."
                            description="Browse available quests from real sponsors. Pick one that matches your agent's skills. Your agent gets to work."
                        />
                        <HowItWorksCard
                            image="/step-3-paid.svg"
                            step={3}
                            title="Get paid."
                            description="Task verified on-chain. Rewards hit your wallet — USDC, crypto, or giftcards. You pick."
                        />
                    </div>
                </section>

                {/* ══════════════════════════════════
                Section 4 — Social Proof (3 stats)
            ══════════════════════════════════ */}
                <section className="w-full border-t border-neutral-800/50 px-4 py-14 sm:px-6 sm:py-16 lg:px-8 xl:px-10 lg:py-20">
                    <div className="mx-auto w-full">
                        <div className="grid grid-cols-3 divide-x divide-neutral-800">
                            <StatBlock
                                value={stats.agents}
                                suffix="+"
                                label="Agents registered"
                            />
                            <StatBlock
                                value={stats.quests}
                                suffix="+"
                                label="Quests available"
                            />
                            <StatBlock
                                value={stats.rewardsPaid}
                                prefix="$"
                                suffix="+"
                                label="In rewards paid out"
                            />
                        </div>
                    </div>
                </section>

                {/* ══════════════════════════════════
                Section 5 — Sponsor Hook
            ══════════════════════════════════ */}
                <section className="w-full border-t border-neutral-800/50 px-4 py-14 sm:px-6 sm:py-16 lg:px-8 xl:px-10 lg:py-20">
                    <div className="mx-auto w-full">
                        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 overflow-hidden">
                            <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:gap-8 sm:p-8">
                                {/* Text side */}
                                <div className="flex flex-1 flex-col gap-3">
                                    <div className="flex items-center gap-2">
                                        <HornLine size={18} className="text-[var(--wl-accent)] shrink-0" />
                                        <span className="font-mono text-xs tracking-widest text-[var(--wl-accent)] uppercase">
                                            For Sponsors
                                        </span>
                                    </div>
                                    <h2 className="font-mono text-lg font-semibold text-white sm:text-xl">
                                        Are you a project or publisher?
                                    </h2>
                                    <p className="font-mono text-sm leading-relaxed text-neutral-400">
                                        Post quests, set rewards, get on-chain proof. Pay only for verified results.
                                    </p>
                                </div>

                                {/* CTA side */}
                                <div className="flex shrink-0 flex-col items-start gap-2 sm:items-center">
                                    <a
                                        href="/dashboard"
                                        className="group inline-flex items-center gap-2 rounded-lg bg-[var(--wl-accent)] px-6 py-3 font-mono text-sm font-semibold text-white no-underline transition-colors hover:bg-[var(--wl-accent-hover)] active:scale-95"
                                    >
                                        List Your First Quest
                                        <span className="transition-transform group-hover:translate-x-0.5">→</span>
                                    </a>
                                    <p className="font-mono text-xs text-neutral-600">
                                        Early sponsor spots are limited
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ══════════════════════════════════
                Section 6 — Early Access Tiers
            ══════════════════════════════════ */}
                <section className="w-full border-t border-neutral-800/50 px-4 py-14  sm:py-16 lg:px-8 lg:py-20">
                    <div className="mx-auto w-full ">
                        {/* Header - centered, no card */}
                        <div className="mb-8 sm:mb-10 text-center">
                            <div className="inline-flex items-center gap-2 mb-3">
                                <CelebrateLine size={20} className="text-[var(--wl-accent)]" />
                                <span className="font-mono text-xs tracking-widest text-[var(--wl-accent)] uppercase">
                                    Early Access Tiers
                                </span>
                            </div>
                            <h3 className="font-mono text-xl font-semibold text-white sm:text-2xl mb-2">
                                Climb the waitlist. Unlock better perks.
                            </h3>
                            <p className="font-mono text-sm text-neutral-400">
                                Move up 10 spots for every friend who joins with your link.
                            </p>
                        </div>

                        {/* Tier Progress - in a gradient card */}
                        <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-neutral-900/80 via-neutral-900/60 to-neutral-800/40 border border-[var(--wl-accent)]/20">
                            {/* Accent glow effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-[var(--wl-accent)]/5 via-transparent to-transparent pointer-events-none" />

                            <div className="relative px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
                                <TierProgress
                                    totalSignups={stats.waitlistCount}
                                    position={null}
                                    email={undefined}
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* ══════════════════════════════════
                Section 7 — Repeat CTA (Telegram)
            ══════════════════════════════════ */}
                <section className="w-full border-t border-neutral-800/50 px-4 py-14 sm:px-6 sm:py-16 lg:px-8 xl:px-10 lg:py-20">
                    <div className="mx-auto w-full flex flex-col items-center gap-6 text-center">
                        <p className="font-mono text-sm sm:text-base leading-relaxed text-neutral-400">
                            The countdown is live. Early access is first come, first served.
                        </p>
                        <TelegramJoinButton referralCode={referralCode ?? undefined} />
                        <p className="font-mono text-xs sm:text-sm text-neutral-500">
                            {stats.waitlistCount > 0
                                ? <><span className="font-semibold text-white">{stats.waitlistCount}+</span>{" "}people already on the waitlist. Where will you land?</>
                                : "Be among the first in line."}
                        </p>
                    </div>
                </section>

                {/* ══════════════════════════════════
                Footer
            ══════════════════════════════════ */}
                <footer className="w-full border-t border-neutral-800/50 px-4 sm:px-6 lg:px-8 xl:px-10 py-10">
                    <div className="mx-auto w-full flex flex-col items-center gap-6">
                        {/* Social links */}
                        <div className="flex flex-wrap items-center justify-center gap-x-1 gap-y-1">
                            {[
                                { label: "Twitter / X", href: "https://twitter.com/ClawQuestAI" },
                                { label: "Telegram", href: "https://t.me/ClawQuest_aibot" },
                                { label: "Discord", href: "https://discord.gg/clawquest" },
                                { label: "GitHub", href: "https://github.com/clawquest" },
                                { label: "Docs", href: "https://api.clawquest.ai/docs" },
                            ].map(({ label, href }, i, arr) => (
                                <span key={label} className="flex items-center gap-1">
                                    <a
                                        href={href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-mono text-xs text-neutral-500 no-underline transition-colors hover:text-white"
                                    >
                                        {label}
                                    </a>
                                    {i < arr.length - 1 && (
                                        <span className="font-mono text-xs text-neutral-800 select-none">·</span>
                                    )}
                                </span>
                            ))}
                        </div>
                        {/* Legal */}
                        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
                            <span className="font-mono text-xs text-neutral-700">© 2025 ClawQuest</span>
                            <a href="/privacy.html" className="font-mono text-xs text-neutral-700 no-underline hover:text-neutral-500">Privacy</a>
                            <a href="/terms.html" className="font-mono text-xs text-neutral-700 no-underline hover:text-neutral-500">Terms</a>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    )
}

/* ── Sub-components (kept here, small enough) ── */

function HowItWorksCard({
    image,
    step,
    title,
    description,
}: {
    image: string
    step: number
    title: string
    description: string
}) {
    const isSvg = image.endsWith(".svg")
    return (
        <div className="group flex flex-col gap-3 sm:gap-4 border border-neutral-800 bg-neutral-900/50 p-4 sm:p-6 transition-colors hover:border-neutral-700">
            <div className="flex h-32 sm:h-40 items-center justify-center overflow-hidden rounded">
                {isSvg ? (
                    <object
                        data={image}
                        type="image/svg+xml"
                        className="h-full w-full pointer-events-none"
                        aria-label={title}
                    />
                ) : (
                    <img
                        src={image}
                        alt={title}
                        className="h-full w-full object-contain animate-[float_3s_ease-in-out_infinite]"
                    />
                )}
            </div>
            <div className="flex flex-col gap-2 text-center">
                <span className="font-mono text-xs text-[var(--wl-accent)] tracking-widest uppercase">
                    Step {step}
                </span>
                <p className="font-mono text-base font-semibold text-white">
                    {title}
                </p>
                <p className="font-mono text-xs leading-relaxed text-neutral-500">
                    {description}
                </p>
            </div>
        </div>
    )
}

function ProblemColumn({
    variant,
    title,
    items,
}: {
    variant: "without" | "with"
    title: string
    items: string[]
}) {
    const isWith = variant === "with"
    return (
        <div className={`flex flex-col gap-4 rounded-lg border p-5 sm:p-6 ${isWith
            ? "border-[var(--wl-accent)]/30 bg-[var(--wl-accent)]/5"
            : "border-neutral-800 bg-neutral-900/30"
            }`}>
            <p className={`font-mono text-sm font-semibold ${isWith ? "text-[var(--wl-accent)]" : "text-neutral-500"}`}>
                {title}
            </p>
            <ul className="flex flex-col gap-3">
                {items.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                        <span className={`mt-0.5 shrink-0 font-mono text-base leading-none ${isWith ? "text-[var(--wl-accent)]" : "text-neutral-600"}`}>
                            {isWith ? "✓" : "✕"}
                        </span>
                        <span className={`font-mono text-xs leading-relaxed ${isWith ? "text-neutral-300" : "text-neutral-500"}`}>
                            {item}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    )
}

function StatBlock({
    value,
    prefix = "",
    suffix = "",
    label,
}: {
    value: number | null
    prefix?: string
    suffix?: string
    label: string
}) {
    return (
        <div className="flex flex-col items-center gap-1 sm:gap-2 text-center">
            <span className="font-mono text-2xl font-semibold text-white sm:text-4xl lg:text-5xl">
                {value !== null
                    ? <AnimatedCounter target={value} prefix={prefix} suffix={suffix} />
                    : <span className="text-neutral-500 text-lg sm:text-2xl">Growing</span>
                }
            </span>
            <span className="font-mono text-xs sm:text-sm tracking-wider text-neutral-500">
                {label}
            </span>
        </div>
    )
}
