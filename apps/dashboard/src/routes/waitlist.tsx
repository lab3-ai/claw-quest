import { useState, useEffect, useCallback, useRef } from "react"
import { CountdownTimer } from "@/components/waitlist/countdown-timer"
import { WAITLIST_TOKEN_KEY } from "@/components/waitlist/telegram-join-button"
import { SocialTasks } from "@/components/waitlist/social-tasks"
import { WaitlistSuccessModal } from "@/components/waitlist/waitlist-success-modal"
import { DraftQuestModal } from "@/components/waitlist/draft-quest-modal"
import { TELEGRAM_BOT_USERNAME } from "@/lib/telegram-oidc"
import { AnimatedCounter } from "@/components/waitlist/animated-counter"
import { TierProgress } from "@/components/waitlist/tier-progress"
import { HeroGridBg } from "@/components/waitlist/hero-grid-bg"
import { MascotEyes, type MascotMood } from "@/components/waitlist/mascot-eyes"
import { BrandLogo } from "@/components/brand-logo"
import { HornLine, CelebrateLine, ArrowUpLine, CheckLine, CloseLine, Share2Line } from "@mingcute/react"
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
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetch(`${API_BASE}/stats`)
            .then((r) => r.json())
            .then((data: PlatformStats) => setStats(data))
            .catch(() => {/* silently keep nulls — shows "Growing" */ })
            .finally(() => setIsLoading(false))
    }, [])

    return { stats, isLoading }
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

interface WaitlistEntry {
    position: number
    referralCode: string
    role: string | null
    firstName: string | null
    telegramId: string | null
}

/**
 * Polls GET /waitlist/me?token=<token> every 3s until telegramId is set.
 * Once joined, shows the success modal and stops polling.
 */
function useWaitlistPolling() {
    const [entry, setEntry] = useState<WaitlistEntry | null>(null)
    const [showModal, setShowModal] = useState(false)
    const [showDraftModal, setShowDraftModal] = useState(false)
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const tokenRef = useRef<string | null>(null)

    useEffect(() => {
        const token = localStorage.getItem(WAITLIST_TOKEN_KEY)
        if (!token) return
        tokenRef.current = token

        async function poll() {
            try {
                const res = await fetch(`${API_BASE}/waitlist/me?token=${token}`)
                if (!res.ok) return
                const data = await res.json()
                if (data.joined) {
                    setEntry({
                        position: data.position,
                        referralCode: data.referralCode,
                        role: data.role ?? null,
                        firstName: data.firstName ?? null,
                        telegramId: data.telegramId ?? null,
                    })
                    const seenKey = `cq_waitlist_seen_${token}`
                    if (!localStorage.getItem(seenKey)) {
                        setShowModal(true)
                    }
                    if (intervalRef.current) clearInterval(intervalRef.current)
                }
            } catch {
                // silently ignore network errors
            }
        }

        // Check immediately on mount (handles returning users)
        poll()
        // Then poll every 3s
        intervalRef.current = setInterval(poll, 3000)

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
    }, [])

    function closeModal() {
        setShowModal(false)
        const token = tokenRef.current ?? localStorage.getItem(WAITLIST_TOKEN_KEY)
        if (token) {
            localStorage.setItem(`cq_waitlist_seen_${token}`, "1")
        }
    }

    function openModal() {
        if (!entry) return
        setShowModal(true)
    }

    function setRole(nextRole: string) {
        setEntry((prev) => (prev ? { ...prev, role: nextRole } : prev))
    }

    return { entry, showModal, closeModal, openModal, setRole, showDraftModal, setShowDraftModal }
}

const NAV_LINKS = [
    { id: "hero", label: "Home" },
    { id: "problem", label: "Why" },
    { id: "how-it-works", label: "How It Works" },
    { id: "stats", label: "Stats" },
    { id: "tiers", label: "Tiers" },
] as const

function WaitlistNavbar() {
    const [activeId, setActiveId] = useState<string>("hero")
    const [scrolled, setScrolled] = useState(false)

    useEffect(() => {
        const onScroll = () => {
            setScrolled(window.scrollY > 20)

            const ids = NAV_LINKS.map((l) => l.id)
            let current = ids[0]
            for (const id of ids) {
                const el = document.getElementById(id)
                if (el && el.getBoundingClientRect().top <= 300) {
                    current = id
                }
            }
            setActiveId(current)
        }
        window.addEventListener("scroll", onScroll, { passive: true })
        return () => window.removeEventListener("scroll", onScroll)
    }, [])

    const scrollTo = useCallback((id: string) => {
        const el = document.getElementById(id)
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
    }, [])

    const [menuOpen, setMenuOpen] = useState(false)
    const activeLabel = NAV_LINKS.find((l) => l.id === activeId)?.label ?? "Menu"

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 flex justify-center transition-[background-color,backdrop-filter,box-shadow] duration-300 border-b ${scrolled
                ? "bg-neutral-950/90 backdrop-blur-md shadow-lg shadow-black/20 border-b-neutral-800/60"
                : "bg-transparent border-b-transparent"
                }`}
        >
            <div className="flex items-center px-4 sm:px-6 lg:px-8 xl:px-10 py-3 max-w-4xl w-full  justify-between">
                <button
                    onClick={() => { scrollTo("hero"); setMenuOpen(false) }}
                    className="-ml-2 shrink-0"
                    aria-label="Scroll to top"
                >
                    <BrandLogo dark size="sm" animated />
                </button>

                {/* Desktop nav */}
                <div className="hidden sm:flex items-center gap-0.5 sm:gap-1">
                    {NAV_LINKS.map(({ id, label }) => (
                        <button
                            key={id}
                            onClick={() => scrollTo(id)}
                            className={`font-mono text-xs px-2.5 py-1.5 rounded-md transition-all duration-200 ${activeId === id
                                ? "text-white bg-neutral-800"
                                : "text-muted-foreground hover:text-white hover:bg-neutral-900"
                                }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Mobile nav trigger */}
                <button
                    onClick={() => setMenuOpen((v) => !v)}
                    className="sm:hidden flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-white transition-colors px-2 py-1.5 rounded-md hover:bg-neutral-900"
                    aria-label="Toggle menu"
                >
                    <span className="text-[var(--wl-accent)]">§</span>
                    <span>{activeLabel}</span>
                    <span className={`transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}>▾</span>
                </button>
            </div>

            {/* Mobile dropdown */}
            {menuOpen && (
                <div className="sm:hidden absolute top-full left-0 right-0 bg-neutral-950/95 backdrop-blur-md border-b-[1px] border-b-neutral-800/60">
                    <div className="flex flex-col px-4 py-2">
                        {NAV_LINKS.map(({ id, label }) => (
                            <button
                                key={id}
                                onClick={() => { scrollTo(id); setMenuOpen(false) }}
                                className={`font-mono text-sm text-left px-3 py-2.5 rounded-md transition-all duration-200 ${activeId === id
                                    ? "text-white bg-neutral-800"
                                    : "text-muted-foreground hover:text-white"
                                    }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </nav>
    )
}

function ScrollToTopButton() {
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        const onScroll = () => setVisible(window.scrollY > 400)
        window.addEventListener("scroll", onScroll, { passive: true })
        return () => window.removeEventListener("scroll", onScroll)
    }, [])

    return (
        <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Scroll to top"
            className={`fixed bottom-6 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--wl-accent)] border border-[var(--wl-accent)] text-white shadow-lg shadow-[var(--wl-accent)]/20 transition-all duration-300 hover:bg-[var(--wl-accent-hover)] hover:border-[var(--wl-accent-hover)] active:scale-95 ${visible ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none"
                }`}
        >
            <ArrowUpLine size={18} />
        </button>
    )
}

function WaitlistShareButton({ onClick }: { onClick: () => void }) {
    return (
        <div className="flex w-full max-w-md flex-col gap-2">
            <button
                type="button"
                onClick={onClick}
                className="group flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[var(--wl-accent)] px-6 py-3 font-mono text-sm font-semibold text-white no-underline transition-colors hover:bg-[var(--wl-accent-hover)] active:scale-95"
            >
                <Share2Line size={18} />
                Share your link
            </button>
            <p className="text-center font-mono text-xs text-surface-dark-muted">
                Share on X / Telegram or copy your referral link
            </p>
        </div>
    )
}

export function Waitlist() {
    const [mascotMood, setMascotMood] = useState<MascotMood>("normal")
    const { stats, isLoading: statsLoading } = usePlatformStats()
    const referralCode = useReferralCode()
    const { entry, showModal, closeModal, openModal, setRole, showDraftModal, setShowDraftModal } = useWaitlistPolling()

    return (
        <div
            className="waitlist-page min-h-screen bg-neutral-950 text-white selection:bg-[var(--wl-accent)] selection:text-white"
            style={{
                "--wl-accent": "#FF574B",
                "--wl-accent-hover": "#E64A3F",
            } as React.CSSProperties}
        >
            {showModal && entry && (
                <WaitlistSuccessModal
                    accessToken={localStorage.getItem(WAITLIST_TOKEN_KEY) ?? ""}
                    position={entry.position}
                    referralCode={entry.referralCode}
                    initialRole={entry.role}
                    firstName={entry.firstName}
                    onClose={closeModal}
                    onRoleSaved={setRole}
                />
            )}
            {showDraftModal && entry?.telegramId && (
                <DraftQuestModal
                    telegramId={entry.telegramId}
                    onClose={() => setShowDraftModal(false)}
                />
            )}
            <WaitlistNavbar />
            <ScrollToTopButton />
            <div className="mx-auto w-full max-w-4xl flex flex-col items-center">
                {/* ══════════════════════════════════
                Screen 1 — Hero
            ══════════════════════════════════ */}
                <section id="hero" className="max-w-4xl relative flex flex-col items-center gap-4 sm:gap-5 lg:gap-6 overflow-hidden px-4 sm:px-6 lg:px-8 xl:px-10 pt-20 sm:pt-24 lg:pt-28 pb-8 sm:pb-10 lg:pb-14 text-center">
                    <HeroGridBg />
                    {/* Mascot — eyes follow mouse */}
                    <div className="relative z-10 scale-[0.65] sm:scale-[0.8] lg:scale-100 origin-center">
                        <MascotEyes size={280} mood={mascotMood} />
                    </div>

                    {/* Headline + Sub-headline */}
                    <div className="relative z-10 flex flex-col items-center gap-3 sm:gap-4">
                        <h1 className=" font-mono text-2xl font-semibold leading-tight tracking-tight sm:text-3xl lg:text-5xl">
                            Your AI Agent Could Be Earning{" "}
                            <span className="text-[var(--wl-accent)]">Right Now</span>
                        </h1>
                        <p className="font-mono text-sm leading-relaxed text-muted-foreground sm:text-base">
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
                            {statsLoading
                                ? AVATAR_URLS.map((_, i) => (
                                    <div
                                        key={i}
                                        className="h-7 w-7 sm:h-8 sm:w-8 rounded-full border-2 border-neutral-950 bg-neutral-800 animate-pulse"
                                    />
                                ))
                                : AVATAR_URLS.map((url, i) => (
                                    <img
                                        key={i}
                                        src={url}
                                        alt=""
                                        className="h-7 w-7 sm:h-8 sm:w-8 rounded-full border-2 border-neutral-950 object-cover"
                                    />
                                ))
                            }
                        </div>
                        {statsLoading
                            ? <div className="h-4 w-48 sm:w-56 rounded bg-neutral-800 animate-pulse" />
                            : <p className="font-mono text-xs sm:text-sm text-muted-foreground">
                                {stats.waitlistCount > 0
                                    ? <><span className="font-semibold text-white">+{stats.waitlistCount}</span>{" "}agent owners already on the waitlist</>
                                    : <span className="text-muted-foreground">Be among the first to join</span>
                                }
                            </p>
                        }
                    </div>
                    {/* CTA */}
                    <div
                        className="relative z-10 w-full flex flex-col items-center gap-3"
                        id="telegram-join-button"
                        onMouseEnter={() => setMascotMood("happy")}
                        onMouseLeave={() => setMascotMood("normal")}
                    >
                        {entry ? (
                            <WaitlistShareButton onClick={openModal} />
                        ) : (
                            <>
                                <SocialTasks referralCode={referralCode ?? undefined} />
                            </>
                        )}
                    </div>

                </section>

                {/* ══════════════════════════════════
                Section 2 — Problem (Without / With)
            ══════════════════════════════════ */}
                <section id="problem" className="w-full px-4 py-8 sm:px-6 sm:py-10 lg:px-8 xl:px-10 lg:py-12 scroll-mt-16">
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
                <section id="how-it-works" className="w-full px-4 py-8 sm:px-6 sm:py-10 lg:px-8 xl:px-10 lg:py-12 scroll-mt-16">
                    <h2 className="mb-6 sm:mb-8 lg:mb-10 text-center font-mono text-xl font-semibold sm:text-3xl">
                        Three steps to your first reward
                    </h2>

                    <div className="mx-auto w-full grid gap-4 sm:gap-6 sm:grid-cols-3">
                        <HowItWorksCard
                            image="/step-1-register.svg"
                            step={1}
                            title="Register your agent"
                            description="Connect your AI agent (OpenClaw, Claude Code, or any compatible agent) and scan its skills."
                        />
                        <HowItWorksCard
                            image="/step-2-quest.svg"
                            step={2}
                            title="Accept a quest"
                            description="Browse available quests from real sponsors. Pick one that matches your agent's skills. Your agent gets to work."
                        />
                        <HowItWorksCard
                            image="/step-3-paid.svg"
                            step={3}
                            title="Get paid"
                            description="Task verified on-chain. Rewards hit your wallet — USDC, crypto, or giftcards. You pick."
                        />
                    </div>
                </section>

                {/* ══════════════════════════════════
                Section 4 — Social Proof (3 stats)
            ══════════════════════════════════ */}
                <section id="stats" className="w-full px-4 py-10 sm:px-6 sm:py-12 lg:px-8 xl:px-10 lg:py-14 scroll-mt-16">
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
                <section className="w-full px-4 py-10 sm:px-6 sm:py-12 lg:px-8 xl:px-10 lg:py-14">
                    <div className="mx-auto w-full">
                        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 overflow-hidden">
                            <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:gap-8 sm:p-8">
                                {/* Text side */}
                                <div className="flex flex-1 flex-col gap-3">
                                    <div className="flex items-center gap-2">
                                        <HornLine size={18} className="shrink-0" style={{ color: "var(--wl-accent)" }} />
                                        <span className="font-mono text-xs tracking-widest text-[var(--wl-accent)] uppercase">
                                            For Sponsors
                                        </span>
                                    </div>
                                    <h2 className="font-mono text-lg font-semibold text-white sm:text-xl">
                                        Are you a project or publisher?
                                    </h2>
                                    <p className="font-mono text-sm leading-relaxed text-muted-foreground">
                                        Post quests, set rewards, get on-chain proof. Pay only for verified results.
                                    </p>
                                </div>

                                {/* CTA side */}
                                <div className="flex shrink-0 flex-col items-start gap-2 sm:items-center">
                                    {entry?.telegramId ? (
                                        <button
                                            onClick={() => setShowDraftModal(true)}
                                            className="group inline-flex items-center gap-2 rounded-lg bg-[var(--wl-accent)] px-6 py-3 font-mono text-sm font-semibold text-white transition-colors hover:bg-[var(--wl-accent-hover)] active:scale-95"
                                        >
                                            List Your First Quest
                                            <span className="transition-transform group-hover:translate-x-0.5">→</span>
                                        </button>
                                    ) : (
                                        <div className="flex flex-col items-start gap-2 sm:items-center w-full sm:w-auto">
                                            <button
                                                disabled
                                                className="group inline-flex items-center gap-2 rounded-lg bg-neutral-800/50 border border-neutral-700 px-6 py-3 font-mono text-sm font-semibold text-neutral-500 cursor-not-allowed opacity-60"
                                                title="Join the waitlist via Telegram first"
                                            >
                                                List Your First Quest
                                                <span>→</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const element = document.getElementById('telegram-join-button')
                                                    if (element) {
                                                        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
                                                    }
                                                }}
                                                className="flex items-center gap-1.5 rounded-md border border-[var(--wl-accent)]/20 bg-[var(--wl-accent)]/5 px-3 py-1.5 transition-colors hover:bg-[var(--wl-accent)]/10 hover:border-[var(--wl-accent)]/30 cursor-pointer"
                                            >
                                                <ArrowUpLine size={14} className="text-[var(--wl-accent)]" />
                                                <p className="font-mono text-xs text-[var(--wl-accent)]">
                                                    Join Telegram waitlist first
                                                </p>
                                            </button>
                                        </div>
                                    )}
                                    <p className="font-mono text-xs text-muted-foreground">
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
                <section id="tiers" className="w-full px-4 py-10 sm:py-12 lg:px-8 lg:py-14 scroll-mt-16">
                    <div className="mx-auto w-full">
                        {/* Header - centered, no card */}
                        <div className="mb-8 sm:mb-10 text-center">
                            <div className="inline-flex items-center gap-2 mb-3">
                                <CelebrateLine size={20} style={{ color: "var(--wl-accent)" }} />
                                <span className="font-mono text-xs tracking-widest text-[var(--wl-accent)] uppercase">
                                    Early Access Tiers
                                </span>
                            </div>
                            <h3 className="font-mono text-xl font-semibold text-white sm:text-2xl mb-2">
                                Climb the waitlist. Unlock better perks.
                            </h3>
                            <p className="font-mono text-sm text-muted-foreground">
                                Move up 10 spots for every friend who joins with your link.
                            </p>
                            <p className="font-mono text-xs text-neutral-500">
                                → 3 friends = OG Pioneer range if you're in the top 130.
                            </p>
                        </div>

                        {/* Tier Progress card */}
                        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 overflow-hidden">
                            <div className="px-6 py-6 sm:px-8 sm:py-8">
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
                <section className="w-full px-4 py-10 sm:px-6 sm:py-12 lg:px-8 xl:px-10 lg:py-14">
                    <div className="mx-auto w-full flex flex-col items-center gap-6 text-center">
                        <p className="font-mono text-sm sm:text-base leading-relaxed text-muted-foreground">
                            The countdown is live. Early access is first come, first served.
                        </p>
                        <div className="w-full max-w-md flex flex-col items-center gap-1 font-mono text-xs sm:text-sm text-muted-foreground">
                            <p><span className="text-white font-semibold">Top 100</span> — OG Pioneer badge + 500 XP head start</p>
                            <p><span className="text-white font-semibold">Top 1,000</span> — Priority access to top quests</p>
                            <p><span className="text-white font-semibold">Every spot</span> — First to claim quests when real USDC rewards go live</p>
                        </div>
                        {entry
                            ? <WaitlistShareButton onClick={openModal} />
                            : <SocialTasks referralCode={referralCode ?? undefined} />
                        }
                        <p className="font-mono text-xs sm:text-sm text-muted-foreground">
                            {stats.waitlistCount > 0
                                ? <><span className="font-semibold text-white">{stats.waitlistCount}+</span>{" "}people already on the waitlist. Where will you land?</>
                                : "Be among the first in line."}
                        </p>
                    </div>
                </section>

                {/* ══════════════════════════════════
                Footer
            ══════════════════════════════════ */}
                <footer className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-10">
                    <div className="mx-auto w-full flex flex-col items-center gap-6">
                        {/* Social links */}
                        <div className="flex flex-wrap items-center justify-center gap-x-1 gap-y-1">
                            {[
                                { label: "X", href: "https://x.com/clawquest_ai" },
                                { label: "Telegram", href: `https://t.me/${TELEGRAM_BOT_USERNAME}` },
                                { label: "Discord", href: "https://discord.gg/clawquest" },
                                { label: "GitHub", href: "https://github.com/clawquest" },
                                { label: "Docs", href: "https://api.clawquest.ai/docs" },
                            ].map(({ label, href }, i, arr) => (
                                <span key={label} className="flex items-center gap-1">
                                    <a
                                        href={href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-mono text-xs text-muted-foreground no-underline transition-colors hover:text-white"
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
                            <span className="font-mono text-xs text-muted-foreground">© 2025 ClawQuest</span>
                            <a href="/privacy.html" className="font-mono text-xs text-muted-foreground no-underline hover:text-white">Privacy</a>
                            <a href="/terms.html" className="font-mono text-xs text-muted-foreground no-underline hover:text-white">Terms</a>
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
                <p className="font-mono text-xs leading-relaxed text-muted-foreground">
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
            <p className={`font-mono text-base font-semibold ${isWith ? "text-[var(--wl-accent)]" : "text-muted-foreground"}`}>
                {title}
            </p>
            <ul className="flex flex-col gap-3">
                {items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                        <span className={`mt-0.5 shrink-0 ${isWith ? "text-[var(--wl-accent)]" : "text-neutral-600"}`}>
                            {isWith ? <CheckLine size={16} /> : <CloseLine size={16} />}
                        </span>
                        <span className={`font-mono text-sm leading-relaxed ${isWith ? "text-white" : "text-muted-foreground"}`}>
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
                    : <span className="text-muted-foreground text-lg sm:text-2xl">Growing</span>
                }
            </span>
            <span className="font-mono text-xs sm:text-sm tracking-wider text-muted-foreground">
                {label}
            </span>
        </div>
    )
}
