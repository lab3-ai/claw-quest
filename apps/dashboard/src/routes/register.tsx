import { useState } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import { supabase } from "@/lib/supabase"
import { startTelegramLogin } from "@/lib/telegram-oidc"
import { SeoHead } from "@/components/seo-head"
import { Button } from "@/components/ui/button"

export function Register() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [loading, setLoading] = useState(false)
    const [telegramLoading, setTelegramLoading] = useState(false)
    const navigate = useNavigate()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")
        setSuccess("")

        const { error: signUpError } = await supabase.auth.signUp({ email, password })

        if (signUpError) {
            setError(signUpError.message)
        } else {
            setSuccess("Check your email for a confirmation link!")
            setTimeout(() => navigate({ to: "/login" }), 3000)
        }

        setLoading(false)
    }

    return (
        <div className="min-h-screen flex flex-col bg-muted">
            <SeoHead title="Sign Up" noindex />
            <div className="topbar">
                <Link to="/quests" className="topbar-logo">
                    Claw<span>Quest</span>
                </Link>
                <div className="topbar-nav">
                    <Link to="/quests">Quests</Link>
                </div>
            </div>

            <div className="flex-1 flex items-center justify-center px-4 py-10">
                <div className="bg-background rounded border border-border w-full max-w-[380px] p-7 text-center relative">
                    <div className="text-xl font-semibold tracking-tight mb-1 text-foreground">
                        Claw<span className="text-accent">Quest</span>
                    </div>
                    <div className="text-xs text-muted-foreground mb-6">Create your account</div>

                    {error && (
                        <div className="bg-error-light text-error px-3 py-2 rounded text-sm mb-4 text-left">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="bg-success-light text-success px-3 py-2 rounded text-sm mb-4 text-left">
                            {success}
                        </div>
                    )}

                    {/* Telegram OIDC button */}
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full mb-4 flex items-center justify-center gap-2 text-base py-[10px]"
                        onClick={async () => {
                            setTelegramLoading(true)
                            setError("")
                            try {
                                await startTelegramLogin()
                            } catch (e: any) {
                                setError(e.message ?? "Failed to start Telegram login")
                                setTelegramLoading(false)
                            }
                        }}
                        disabled={telegramLoading}
                    >
                        {telegramLoading ? (
                            "Redirecting..."
                        ) : (
                            <>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.03-1.99 1.27-5.62 3.72-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.42-1.43-.88.03-.24.37-.49 1.02-.74 3.98-1.73 6.63-2.87 7.97-3.44 3.79-1.58 4.58-1.86 5.09-1.87.11 0 .37.03.54.17.14.12.18.28.2.45-.01.06.01.24 0 .38z" fill="#2AABEE"/>
                                </svg>
                                Continue with Telegram
                            </>
                        )}
                    </Button>

                    <div className="flex items-center gap-3 my-5">
                        <hr className="flex-1 border-border" />
                        <span className="text-xs text-muted-foreground">or register with email</span>
                        <hr className="flex-1 border-border" />
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="space-y-1.5 mb-3.5 text-left">
                            <label className="block text-xs font-semibold text-foreground mb-1">Email</label>
                            <input
                                className="w-full px-2.5 py-2 text-sm border border-input rounded bg-background text-foreground focus:border-accent focus:ring-2 focus:ring-accent/10 outline-hidden box-border"
                                type="email"
                                placeholder="you@example.com"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5 mb-3.5 text-left">
                            <label className="block text-xs font-semibold text-foreground mb-1">Password</label>
                            <input
                                className="w-full px-2.5 py-2 text-sm border border-input rounded bg-background text-foreground focus:border-accent focus:ring-2 focus:ring-accent/10 outline-hidden box-border"
                                type="password"
                                minLength={8}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full mt-2 text-base py-[10px]"
                            disabled={loading}
                        >
                            {loading ? "Creating account..." : "Create account"}
                        </Button>
                    </form>

                    <div className="h-px bg-border my-5" />

                    <div className="text-xs text-muted-foreground leading-relaxed">
                        Already have an account?{" "}
                        <Link to="/login" className="text-primary hover:underline">Sign in</Link>
                    </div>
                </div>
            </div>

            <div className="footer max-w-4xl mx-auto px-4 py-6">
                <span>ClawQuest v0.1 beta</span>
                <a href="/privacy.html">Privacy</a>
                <a href="/terms.html">Terms</a>
                <a href="https://api.clawquest.ai/docs" target="_blank" rel="noopener noreferrer">API Docs</a>
                <a href="https://t.me/ClawQuest_aibot" target="_blank" rel="noopener noreferrer">Telegram Bot</a>
            </div>
        </div>
    )
}
