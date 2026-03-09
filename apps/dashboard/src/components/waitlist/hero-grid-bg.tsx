import { useEffect, useRef } from "react"

/**
 * Gradient mesh blobs — slow-moving ambient background.
 */
export function HeroGridBg() {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        let raf: number
        let t = 0
        let w = 0
        let h = 0

        /* ── Gradient blobs ── */
        const blobs = [
            { cx: 0.3, cy: 0.35, rx: 0.2, ry: 0.14, color: [255, 87, 75], speed: 0.4, phase: 0 },
            { cx: 0.7, cy: 0.45, rx: 0.16, ry: 0.15, color: [140, 60, 180], speed: 0.3, phase: 2 },
            { cx: 0.5, cy: 0.28, rx: 0.22, ry: 0.12, color: [255, 120, 80], speed: 0.25, phase: 4 },
            { cx: 0.6, cy: 0.6, rx: 0.14, ry: 0.18, color: [100, 40, 160], speed: 0.35, phase: 1 },
        ]

        function resize() {
            const dpr = Math.min(window.devicePixelRatio || 1, 2)
            w = canvas!.offsetWidth
            h = canvas!.offsetHeight
            canvas!.width = w * dpr
            canvas!.height = h * dpr
            ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
        }

        resize()
        window.addEventListener("resize", resize)

        function draw() {
            t += 0.005
            ctx!.clearRect(0, 0, w, h)

            /* ── Layer 1: Gradient blobs ── */
            ctx!.save()
            ctx!.filter = "blur(80px)"
            for (const blob of blobs) {
                const x = (blob.cx + Math.sin(t * blob.speed + blob.phase) * 0.08) * w
                const y = (blob.cy + Math.cos(t * blob.speed * 0.7 + blob.phase) * 0.06) * h
                const radius = Math.max(blob.rx * w, blob.ry * h)
                const [r, g, b] = blob.color
                const grad = ctx!.createRadialGradient(x, y, 0, x, y, radius)
                grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.18)`)
                grad.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.06)`)
                grad.addColorStop(1, "transparent")
                ctx!.fillStyle = grad
                ctx!.fillRect(0, 0, w, h)
            }
            ctx!.restore()

            /* Pulse rings removed */

            raf = requestAnimationFrame(draw)
        }

        raf = requestAnimationFrame(draw)
        return () => {
            cancelAnimationFrame(raf)
            window.removeEventListener("resize", resize)
        }
    }, [])

    return (
        <canvas
            ref={canvasRef}
            className="pointer-events-none absolute inset-0 h-full w-full"
            aria-hidden="true"
        />
    )
}
