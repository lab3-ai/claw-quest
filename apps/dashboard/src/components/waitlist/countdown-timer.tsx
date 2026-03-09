import { useState, useEffect, useCallback } from "react"

const LAUNCH_DATE = new Date("2026-04-15T00:00:00Z")

function calcTimeLeft() {
    const diff = Math.max(0, LAUNCH_DATE.getTime() - Date.now())
    return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
    }
}

function Digit({ char }: { char: string }) {
    return (
        <span className="inline-block w-[0.65em] text-center tabular-nums">{char}</span>
    )
}

function Segment({ value, label }: { value: number; label: string }) {
    const str = String(value).padStart(2, "0")
    return (
        <div className="flex w-full flex-1 flex-col items-center gap-1 rounded-lg bg-neutral-800/80 py-3 sm:py-4">
            <span className="font-mono text-2xl font-semibold tracking-widest text-white sm:text-4xl">
                <Digit char={str[0]} />
                <Digit char={str[1]} />
            </span>
            <span className="text-xs capitalize tracking-wider text-neutral-400">
                {label}
            </span>
        </div>
    )
}

export function CountdownTimer() {
    const [time, setTime] = useState(calcTimeLeft)
    const tick = useCallback(() => setTime(calcTimeLeft), [])

    useEffect(() => {
        const id = setInterval(tick, 1000)
        return () => clearInterval(id)
    }, [tick])

    const isExpired = time.days + time.hours + time.minutes + time.seconds === 0
    if (isExpired) {
        return <p className="font-mono text-sm text-neutral-400">Launching Soon</p>
    }

    return (
        <div className="w-full max-w-lg rounded-lg border border-neutral-700/60 px-3 py-3 sm:px-5 sm:py-4">
            <p className="mb-3 sm:mb-4 text-center font-mono text-xs sm:text-sm text-neutral-400">
                Early access opens in
            </p>
            <div className="flex items-center gap-2 sm:gap-4">
                <Segment value={time.days} label="Day" />
                <Segment value={time.hours} label="Hour" />
                <Segment value={time.minutes} label="Minute" />
                <Segment value={time.seconds} label="Second" />
            </div>
        </div>
    )
}
