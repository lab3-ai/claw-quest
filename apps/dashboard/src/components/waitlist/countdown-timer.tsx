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

const DOT_SIZE = 6
const GAP = 2

/** Renders a single 5×7 dot-matrix digit */
function DotDigit({ char }: { char: string }) {
    const pattern = FONT[char] ?? FONT["0"]
    return (
        <div
            className="grid"
            style={{
                gridTemplateColumns: `repeat(5, ${DOT_SIZE}px)`,
                gridTemplateRows: `repeat(7, ${DOT_SIZE}px)`,
                gap: `${GAP}px`,
            }}
        >
            {pattern.flatMap((row, r) =>
                [4, 3, 2, 1, 0].map((col) => {
                    const on = (row >> col) & 1
                    return (
                        <span
                            key={`${r}-${col}`}
                            className="rounded-full"
                            style={{
                                width: DOT_SIZE,
                                height: DOT_SIZE,
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

/** Colon separator — two glowing dots, aligned to digit grid baseline */
function DotSeparator() {
    /* Total digit height = 7 dots × 6px + 6 gaps × 2px = 54px. Center two 6px dots with 12px gap between. */
    return (
        <div className="flex flex-col items-center justify-center px-2 sm:px-3" style={{ height: 54, gap: 12 }}>
            {[0, 1].map((i) => (
                <span
                    key={i}
                    className="rounded-full"
                    style={{
                        width: DOT_SIZE,
                        height: DOT_SIZE,
                        background: "var(--wl-accent)",
                        boxShadow: "0 0 4px var(--wl-accent), 0 0 8px color-mix(in srgb, var(--wl-accent) 30%, transparent)",
                    }}
                />
            ))}
        </div>
    )
}

function Segment({ value, label }: { value: number; label: string }) {
    const str = String(value).padStart(2, "0")
    return (
        <div className="flex flex-col items-center gap-2.5">
            <div className="flex gap-1.5 sm:gap-2">
                <DotDigit char={str[0]} />
                <DotDigit char={str[1]} />
            </div>
            <span className="font-mono text-[11px] uppercase tracking-widest text-neutral-500">
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
        return <p className="font-mono text-sm text-muted-foreground">Launching Soon</p>
    }

    return (
        <div className="flex flex-col items-center gap-3">
            <p className="font-mono text-[11px] uppercase tracking-widest text-neutral-500">
                Early access opens in
            </p>
            <div className="flex items-start gap-2 scale-80 sm:scale-100">
                <Segment value={time.days} label="Days" />
                <DotSeparator />
                <Segment value={time.hours} label="Hours" />
                <DotSeparator />
                <Segment value={time.minutes} label="Mins" />
                <DotSeparator />
                <Segment value={time.seconds} label="Secs" />
            </div>
        </div>
    )
}
