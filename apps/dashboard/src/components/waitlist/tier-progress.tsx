import { useEffect, useRef, useState } from "react"
import { CelebrateLine } from "@mingcute/react"

interface TierProgressProps {
    totalSignups: number
    position?: number | null
    email?: string
}

const TIERS = [
    { name: "OG Pioneer", max: 100, perk: "OG Discord badge + 500 bonus XP" },
    { name: "Early Access", max: 1000, perk: "Premium quests 30 min before public" },
]

export function TierProgress({ totalSignups, position, email }: TierProgressProps) {
    const ref = useRef<HTMLDivElement>(null)
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        const el = ref.current
        if (!el) return
        const obs = new IntersectionObserver(
            ([entry]) => setVisible(entry.isIntersecting),
            { threshold: 0.3 }
        )
        obs.observe(el)
        return () => obs.disconnect()
    }, [])

    return (
        <div ref={ref} className="w-full max-w-lg space-y-5 py-5">
            {/* Current position indicator */}
            {position != null && (
                <div className="flex flex-col items-center gap-4 rounded-lg bg-[var(--wl-accent)] px-5 py-5">
                    <CelebrateLine size={40} className="text-white/90" />
                    <div className="flex flex-col items-center gap-1">
                        {email && (
                            <p className="font-mono text-xs text-white/80">
                                Hey, {email}
                            </p>
                        )}
                        <p className="font-mono text-lg font-semibold text-white">
                            You're #{position} in line
                        </p>
                    </div>
                </div>
            )}

            {TIERS.map((tier) => {
                const filled = Math.min(totalSignups, tier.max)
                const pct = (filled / tier.max) * 100

                return (
                    <div key={tier.name} className="space-y-2">
                        <div className="flex items-center justify-between font-mono text-xs">
                            <span className="text-white">{tier.name}</span>
                            <span className="text-neutral-500">
                                <span className="text-neutral-300">{filled}</span>/{tier.max} claimed
                            </span>
                        </div>

                        {/* Bar — fills on scroll into view */}
                        <div className="h-2 w-full overflow-hidden bg-neutral-800">
                            <div
                                className="h-full bg-[var(--wl-accent)] transition-all duration-1000 ease-out"
                                style={{ width: visible ? `${pct}%` : "0%" }}
                            />
                        </div>

                        <p className="font-mono text-xs text-neutral-500">
                            {tier.perk}
                        </p>
                    </div>
                )
            })}

            <p className="text-center font-mono text-xs text-neutral-400">
                Refer a friend → move up 10 spots
            </p>
        </div>
    )
}
