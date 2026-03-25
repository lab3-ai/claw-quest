import { useState, useEffect, useRef } from "react"

interface AnimatedCounterProps {
    target: number
    prefix?: string
    suffix?: string
    duration?: number
}

export function AnimatedCounter({
    target,
    prefix = "",
    suffix = "",
    duration = 2000,
}: AnimatedCounterProps) {
    const [count, setCount] = useState(0)
    const [started, setStarted] = useState(false)
    const ref = useRef<HTMLSpanElement>(null)

    /* Start animation when element enters viewport */
    useEffect(() => {
        const el = ref.current
        if (!el) return

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) setStarted(true)
            },
            { threshold: 0.3 }
        )
        observer.observe(el)
        return () => observer.disconnect()
    }, [])

    /* Animate count-up */
    useEffect(() => {
        if (!started) return

        const start = performance.now()
        let raf: number

        function step(now: number) {
            const progress = Math.min((now - start) / duration, 1)
            /* ease-out cubic */
            const eased = 1 - Math.pow(1 - progress, 3)
            setCount(Math.round(eased * target))
            if (progress < 1) raf = requestAnimationFrame(step)
        }

        raf = requestAnimationFrame(step)
        return () => cancelAnimationFrame(raf)
    }, [started, target, duration])

    return (
        <span ref={ref} className="tabular-nums">
            {prefix}
            {count.toLocaleString()}
            {suffix}
        </span>
    )
}
