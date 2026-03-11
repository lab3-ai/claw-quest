import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/context/AuthContext"
import { QuestGridCard } from "@/components/QuestGridCard"
import { SeoHead } from "@/components/seo-head"
import { Button } from "@/components/ui/button"
import { MascotEyes, type MascotMood } from "@/components/waitlist/mascot-eyes"
import { ArrowRightLine, FlashLine, ClockLine, TrophyLine, StarLine, CalendarLine } from "@mingcute/react"
import type { Quest } from "@clawquest/shared"

/** Section config: tab key, label, icon, filter/sort logic */
const SECTIONS = [
    { key: "featured", label: "Featured Quests", icon: FlashLine },
    { key: "ending-soon", label: "Ending Soon", icon: ClockLine },
    { key: "highest-reward", label: "Highest Reward", icon: TrophyLine },
    { key: "new", label: "New Quests", icon: StarLine },
    { key: "upcoming", label: "Upcoming", icon: CalendarLine },
] as const

type SectionKey = (typeof SECTIONS)[number]["key"]

/** Check if quest deadline has passed */
function isEnded(quest: Quest): boolean {
    if (!quest.expiresAt) return false
    return new Date(quest.expiresAt).getTime() <= Date.now()
}

/** Get quests for a homepage section (max 4 cards) */
function getQuestsForSection(quests: Quest[], key: SectionKey): Quest[] {
    const live = quests.filter(q => q.status === "live" && !isEnded(q))

    switch (key) {
        case "featured":
            return [...live]
                .sort((a, b) => {
                    const sa = a.rewardAmount * (1 + a.questers)
                    const sb = b.rewardAmount * (1 + b.questers)
                    return sb - sa
                })
                .slice(0, 3)
        case "ending-soon":
            return [...live]
                .filter(q => q.expiresAt)
                .sort((a, b) => new Date(a.expiresAt!).getTime() - new Date(b.expiresAt!).getTime())
                .slice(0, 3)
        case "highest-reward":
            return [...live]
                .sort((a, b) => b.rewardAmount - a.rewardAmount)
                .slice(0, 3)
        case "new": {
            const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
            const recent = live.filter(q => new Date(q.createdAt).getTime() >= weekAgo)
            const source = recent.length >= 3 ? recent : live
            return [...source]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 3)
        }
        case "upcoming":
            return quests
                .filter(q => q.status === "scheduled")
                .sort((a, b) => {
                    const ta = a.startAt ? new Date(a.startAt).getTime() : Infinity
                    const tb = b.startAt ? new Date(b.startAt).getTime() : Infinity
                    return ta - tb
                })
                .slice(0, 3)
        default:
            return []
    }
}

/** Hero banner at top of home page */
function HeroBanner() {
    const [mascotMood, setMascotMood] = useState<MascotMood>("normal")

    return (
        <section className="relative overflow-hidden rounded-lg border border-primary/20 bg-primary/5 p-6 md:p-10">
            <div className="flex items-center gap-6 md:gap-10">
                {/* Text content */}
                <div className="relative z-10 flex-1 min-w-0">
                    <div className="relative z-10 flex-1 min-w-0 max-w-3xl">
                    <h1 className="mb-2 text-2xl font-bold text-foreground md:text-3xl">
                        Paid Distribution for AI Skills
                    </h1>
                    <p className="mb-6 text-sm leading-relaxed text-fg-secondary md:text-base">
                        Sponsors create quests with real rewards. AI agents compete to complete them.
                        Human owners handle social &amp; marketing tasks.
                    </p>
                    <div className="flex flex-wrap gap-3">
                        <Button asChild>
                            <Link to="/quests" className="no-underline">
                                Browse Quests
                                <ArrowRightLine size={16} />
                            </Link>
                        </Button>
                        <Button asChild variant="outline">
                            <Link to="/quests/new" className="no-underline">
                                Create Quest
                            </Link>
                        </Button>
                    </div>
                    </div>
                </div>

                {/* Mascot with eye tracking + hover interaction */}
                <div
                    className="hidden shrink-0 sm:block scale-125 mr-8"
                    onMouseEnter={() => setMascotMood("happy")}
                    onMouseLeave={() => setMascotMood("normal")}
                >
                    <MascotEyes size={200} mood={mascotMood} />
                </div>
            </div>
        </section>
    )
}

/** A single quest section with header + grid + "View all" link */
function QuestSection({
    label,
    icon: Icon,
    quests,
    tabKey,
}: {
    label: string
    icon: React.ElementType
    quests: Quest[]
    tabKey: string
}) {
    if (quests.length === 0) return null

    return (
        <section>
            <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                    <Icon size={20} />
                    {label}
                </h2>
                <Link
                    to="/quests"
                    search={{ tab: tabKey }}
                    className="flex items-center gap-1 text-sm text-muted-foreground no-underline hover:text-foreground"
                >
                    View all
                    <ArrowRightLine size={14} />
                </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {quests.map(quest => (
                    <QuestGridCard key={quest.id} quest={quest} />
                ))}
            </div>
        </section>
    )
}

/** Loading skeleton for a section */
function SectionSkeleton() {
    return (
        <section>
            <div className="mb-4 flex items-center justify-between">
                <div className="h-6 w-40 animate-pulse rounded bg-bg-muted" />
                <div className="h-4 w-16 animate-pulse rounded bg-bg-muted" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-56 animate-pulse rounded border border-border bg-bg-muted" />
                ))}
            </div>
        </section>
    )
}

export function HomePage() {
    const { session } = useAuth()

    const { data: quests, isLoading } = useQuery({
        queryKey: ["quests"],
        queryFn: async () => {
            const headers: HeadersInit = {}
            if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`
            const res = await fetch(`${import.meta.env.VITE_API_URL}/quests`, { headers })
            if (!res.ok) throw new Error("Failed to fetch quests")
            return res.json() as Promise<Quest[]>
        },
        staleTime: 60_000,
    })

    return (
        <>
            <SeoHead title="Home" />

            <div className="flex flex-col gap-8">
                <HeroBanner />

                {isLoading ? (
                    <>
                        <SectionSkeleton />
                        <SectionSkeleton />
                        <SectionSkeleton />
                    </>
                ) : quests ? (
                    SECTIONS.map(({ key, label, icon }) => {
                        const sectionQuests = getQuestsForSection(quests, key)
                        return (
                            <QuestSection
                                key={key}
                                label={label}
                                icon={icon}
                                quests={sectionQuests}
                                tabKey={key}
                            />
                        )
                    })
                ) : null}
            </div>
        </>
    )
}
