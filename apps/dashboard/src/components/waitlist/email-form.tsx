import { useState, type FormEvent } from "react"
import { ArrowRightFill } from "@mingcute/react"
import { InlineMessage } from "@/components/ui/inline-message"

interface EmailFormProps {
    onSuccess?: (email: string) => void
    onError?: () => void
    className?: string
    compact?: boolean
    buttonText?: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

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
            const response = await fetch(`${API_BASE}/api/waitlist`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            })

            const data = await response.json()

            if (!response.ok) {
                setError(data.message || "Something went wrong. Please try again.")
                onError?.()
                return
            }

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
                    className="min-h-12 py-3 flex-1 rounded-lg border border-surface-dark-subtle bg-surface-dark px-4 font-mono text-sm text-white placeholder:text-surface-dark-muted focus:border-primary outline-none"
                />
                <button
                    type="submit"
                    disabled={loading}
                    className="group min-h-12 py-3 flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-primary px-6 font-mono text-sm font-semibold text-white transition-colors hover:bg-primary-hover active:scale-95 disabled:opacity-50"
                >
                    {loading ? "Joining..." : <>{buttonText ?? "Join the Waitlist"} <ArrowRightFill size={16} className="inline-block transition-transform group-hover:translate-x-0.5" /></>}
                </button>
            </form>
            {error && <InlineMessage variant="error">{error}</InlineMessage>}
        </div>
    )
}
