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

/* 5×7 dot-matrix font — each digit is a 7-row array of 5-bit bitmasks */
const FONT: Record<string, number[]> = {
    "0": [0b01110, 0b10001, 0b10011, 0b10101, 0b11001, 0b10001, 0b01110],
    "1": [0b00100, 0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
    "2": [0b01110, 0b10001, 0b00001, 0b00110, 0b01000, 0b10000, 0b11111],
    "3": [0b01110, 0b10001, 0b00001, 0b00110, 0b00001, 0b10001, 0b01110],
    "4": [0b00010, 0b00110, 0b01010, 0b10010, 0b11111, 0b00010, 0b00010],
    "5": [0b11111, 0b10000, 0b11110, 0b00001, 0b00001, 0b10001, 0b01110],
    "6": [0b00110, 0b01000, 0b10000, 0b11110, 0b10001, 0b10001, 0b01110],
    "7": [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b01000, 0b01000],
    "8": [0b01110, 0b10001, 0b10001, 0b01110, 0b10001, 0b10001, 0b01110],
    "9": [0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b00010, 0b01100],
}

/* Dot sizes: 4px on mobile, 6px on desktop */
const DOT_SM = 4
const DOT_LG = 6
const GAP_SM = 1.5
const GAP_LG = 2

/** Renders a single 5×7 dot-matrix digit */
function DotDigit({ char, dotSize, gap }: { char: string; dotSize: number; gap: number }) {
    const pattern = FONT[char] ?? FONT["0"]
    return (
        <div
            className="grid"
            style={{
                gridTemplateColumns: `repeat(5, ${dotSize}px)`,
                gridTemplateRows: `repeat(7, ${dotSize}px)`,
                gap: `${gap}px`,
            }}
        >
            {pattern.flatMap((row, r) =>
                [4, 3, 2, 1, 0].map((col) => {
                    const on = (row >> col) & 1
                    return (
                        <span
                            key={`${r}-${col}`}
                            className="rounded-sm"
                            style={{
                                width: dotSize,
                                height: dotSize,
                                background: on
                                    ? "var(--wl-accent)"
                                    : "rgba(255,255,255,0.04)",
                                boxShadow: on
                                    ? "0 0 4px var(--wl-accent), 0 0 8px color-mix(in srgb, var(--wl-accent) 30%, transparent)"
                                    : "none",
                                transition: "background 0.3s, box-shadow 0.3s",
                            }}
                        />
                    )
                })
            )}
        </div>
    )
}

/** Colon separator — two glowing dots */
function DotSeparator({ dotSize, height }: { dotSize: number; height: number }) {
    return (
        <div className="flex flex-col items-center justify-center px-1 sm:px-3" style={{ height, gap: dotSize * 2 }}>
            {[0, 1].map((i) => (
                <span
                    key={i}
                    className="rounded-sm"
                    style={{
                        width: dotSize,
                        height: dotSize,
                        background: "var(--wl-accent)",
                        boxShadow: "0 0 4px var(--wl-accent), 0 0 8px color-mix(in srgb, var(--wl-accent) 30%, transparent)",
                    }}
                />
            ))}
        </div>
    )
}

function Segment({ value, label, dotSize, gap }: { value: number; label: string; dotSize: number; gap: number }) {
    const str = String(value).padStart(2, "0")
    return (
        <div className="flex flex-col items-center gap-2 sm:gap-3">
            <div className="flex gap-1 sm:gap-2">
                <DotDigit char={str[0]} dotSize={dotSize} gap={gap} />
                <DotDigit char={str[1]} dotSize={dotSize} gap={gap} />
            </div>
            <span className="font-mono text-2xs uppercase tracking-widest text-neutral-500">
                {label}
            </span>
        </div>
    )
}

/** Hook: returns true when viewport matches the media query */
function useMediaQuery(query: string) {
    const [matches, setMatches] = useState(() =>
        typeof window !== "undefined" ? window.matchMedia(query).matches : false
    )
    useEffect(() => {
        const mql = window.matchMedia(query)
        const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
        mql.addEventListener("change", handler)
        setMatches(mql.matches)
        return () => mql.removeEventListener("change", handler)
    }, [query])
    return matches
}

export function CountdownTimer() {
    const [time, setTime] = useState(calcTimeLeft)
    const tick = useCallback(() => setTime(calcTimeLeft), [])
    const isDesktop = useMediaQuery("(min-width: 640px)")

    const dotSize = isDesktop ? DOT_LG : DOT_SM
    const gap = isDesktop ? GAP_LG : GAP_SM
    /* Total digit height = 7 dots × dotSize + 6 gaps × gap */
    const digitHeight = 7 * dotSize + 6 * gap

    useEffect(() => {
        const id = setInterval(tick, 1000)
        return () => clearInterval(id)
    }, [tick])

    const isExpired = time.days + time.hours + time.minutes + time.seconds === 0
    if (isExpired) {
        return <p className="font-mono text-sm text-fg-3">Launching Soon</p>
    }

    return (
        <div className="flex flex-col items-center gap-4">
            <p className="font-mono text-xs uppercase tracking-widest text-neutral-500">
                Early access opens in
            </p>
            <div className="flex items-start gap-1 sm:gap-2">
                <Segment value={time.days} label="Days" dotSize={dotSize} gap={gap} />
                <DotSeparator dotSize={dotSize} height={digitHeight} />
                <Segment value={time.hours} label="Hours" dotSize={dotSize} gap={gap} />
                <DotSeparator dotSize={dotSize} height={digitHeight} />
                <Segment value={time.minutes} label="Mins" dotSize={dotSize} gap={gap} />
                <DotSeparator dotSize={dotSize} height={digitHeight} />
                <Segment value={time.seconds} label="Secs" dotSize={dotSize} gap={gap} />
            </div>
        </div>
    )
}
