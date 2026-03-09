import { useState, type FormEvent } from "react"
import { ArrowRightLine } from "@mingcute/react"
import { InlineMessage } from "@/components/ui/inline-message"

interface EmailFormProps {
    onSuccess?: (email: string) => void
    onError?: () => void
    className?: string
    compact?: boolean
    buttonText?: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function EmailForm({ onSuccess, onError, className = "", compact, buttonText }: EmailFormProps) {
    const [email, setEmail] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    async function handleSubmit(e: FormEvent) {
        e.preventDefault()

        if (!email.trim()) {
            setError("Please enter your email address.")
            onError?.()
            return
        }
        if (!EMAIL_RE.test(email)) {
            setError("Please enter a valid email address.")
            onError?.()
            return
        }

        setLoading(true)
        setError("")

        try {
            /* TODO: Replace with actual API call (Loops / Resend / DB) */
            await new Promise((r) => setTimeout(r, 800))
            onSuccess?.(email)
        } catch {
            setError("Something went wrong. Please try again.")
            onError?.()
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={`flex w-full max-w-lg flex-col gap-2 ${className}`}>
            <form
                noValidate
                onSubmit={handleSubmit}
                className={`flex w-full ${compact ? "flex-row gap-2" : "flex-col gap-3 sm:flex-row sm:gap-2"}`}
            >
                <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError("") }}
                    placeholder="your@email.com"
                    className="min-h-12 py-3 flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-4 font-mono text-sm text-white placeholder:text-neutral-500 focus:border-[var(--wl-accent)] outline-none"
                />
                <button
                    type="submit"
                    disabled={loading}
                    className="group min-h-12 py-3 flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[var(--wl-accent)] px-6 font-mono text-sm font-semibold text-white transition-colors hover:bg-[var(--wl-accent-hover)] active:scale-95 disabled:opacity-50"
                >
                    {loading ? "Joining..." : <>{buttonText ?? "Join the Waitlist"} <ArrowRightLine size={16} className="inline-block transition-transform group-hover:translate-x-0.5" /></>}
                </button>
            </form>
            {error && <InlineMessage variant="error">{error}</InlineMessage>}
        </div>
    )
}
