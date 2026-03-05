import { useState } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"
import { startTelegramLogin } from "@/lib/telegram-oidc"
import { Button } from "@/components/ui/button"

export function Login() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const [googleLoading, setGoogleLoading] = useState(false)
    const [telegramLoading, setTelegramLoading] = useState(false)
    const [twitterLoading, setTwitterLoading] = useState(false)
    const [discordLoading, setDiscordLoading] = useState(false)
    const { isAuthenticated } = useAuth()
    const navigate = useNavigate()

    // If already authenticated, redirect to saved URL or quests
    if (isAuthenticated) {
        const savedRedirect = localStorage.getItem("clawquest_redirect_after_login")
        if (savedRedirect) {
            localStorage.removeItem("clawquest_redirect_after_login")
            window.location.href = savedRedirect
        } else {
            navigate({ to: "/quests" })
        }
        return null
    }

    const handleGoogleLogin = async () => {
        setGoogleLoading(true)
        setError("")
        const { error: oauthError } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        })
        if (oauthError) {
            setError(oauthError.message)
            setGoogleLoading(false)
        }
        // On success, browser redirects to Google → then to /auth/callback
    }

    const handleTwitterLogin = async () => {
        setTwitterLoading(true)
        setError("")
        const { error: oauthError } = await supabase.auth.signInWithOAuth({
            provider: "twitter",
            options: { redirectTo: `${window.location.origin}/auth/callback` },
        })
        if (oauthError) {
            setError(oauthError.message)
            setTwitterLoading(false)
        }
    }

    const handleDiscordLogin = async () => {
        setDiscordLoading(true)
        setError("")
        const { error: oauthError } = await supabase.auth.signInWithOAuth({
            provider: "discord",
            options: { redirectTo: `${window.location.origin}/auth/callback` },
        })
        if (oauthError) {
            setError(oauthError.message)
            setDiscordLoading(false)
        }
    }

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

        if (signInError) {
            setError(signInError.message)
        } else {
            const savedRedirect = localStorage.getItem("clawquest_redirect_after_login")
            if (savedRedirect) {
                localStorage.removeItem("clawquest_redirect_after_login")
                window.location.href = savedRedirect
            } else {
                navigate({ to: "/quests" })
            }
        }

        setLoading(false)
    }

    return (
        <div className="min-h-screen flex flex-col bg-muted">
            {/* Topbar */}
            <header className="sticky top-0 z-50 bg-background border-b border-border">
                <div className="mx-auto flex h-14 max-w-[1100px] items-center gap-2 px-6">
                    <Link
                        to="/quests"
                        className="mr-5 flex items-center gap-1.5 no-underline"
                    >
                        <span className="text-base font-semibold text-foreground uppercase">
                            Claw<span className="text-accent uppercase">Quest</span>
                        </span>
                    </Link>

                    {/* Desktop nav */}
                    <nav className="hidden items-center gap-1 sm:flex">
                        <Link
                            to="/quests"
                            className="px-0 py-1.5 text-sm text-muted-foreground no-underline hover:text-foreground transition-colors"
                        >
                            Quests
                        </Link>
                    </nav>
                </div>
            </header>

            {/* Centered login card */}
            <div className="flex-1 flex items-center justify-center px-4 py-10">
                <div className="bg-background rounded border border-border w-[380px] p-7 text-center relative">
                    <div className="text-xl font-bold tracking-tight mb-1 text-foreground">
                        Claw<span className="text-accent">Quest</span>
                    </div>
                    <div className="text-xs text-muted-foreground mb-6">Sign in to your account</div>

                    {error && (
                        <div className="bg-error-light text-error px-3 py-2 rounded text-sm mb-4 text-left">
                            {error}
                        </div>
                    )}

                    {/* Google OAuth button */}
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full mb-4 flex items-center justify-center gap-2 text-base py-[10px]"
                        onClick={handleGoogleLogin}
                        disabled={googleLoading}
                    >
                        {googleLoading ? (
                            "Redirecting..."
                        ) : (
                            <>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                Continue with Google
                            </>
                        )}
                    </Button>

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
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.03-1.99 1.27-5.62 3.72-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.42-1.43-.88.03-.24.37-.49 1.02-.74 3.98-1.73 6.63-2.87 7.97-3.44 3.79-1.58 4.58-1.86 5.09-1.87.11 0 .37.03.54.17.14.12.18.28.2.45-.01.06.01.24 0 .38z" fill="#2AABEE" />
                                </svg>
                                Continue with Telegram
                            </>
                        )}
                    </Button>

                    {/* X (Twitter) OAuth button */}
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full mb-4 flex items-center justify-center gap-2 text-base py-[10px]"
                        onClick={handleTwitterLogin}
                        disabled={twitterLoading}
                    >
                        {twitterLoading ? (
                            "Redirecting..."
                        ) : (
                            <>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                </svg>
                                Continue with X (Twitter)
                            </>
                        )}
                    </Button>

                    {/* Discord OAuth button */}
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full mb-4 flex items-center justify-center gap-2 text-base py-[10px]"
                        onClick={handleDiscordLogin}
                        disabled={discordLoading}
                    >
                        {discordLoading ? (
                            "Redirecting..."
                        ) : (
                            <>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="#5865F2" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.031.055a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                                </svg>
                                Continue with Discord
                            </>
                        )}
                    </Button>

                    <div className="flex items-center gap-3 my-5">
                        <hr className="flex-1 border-border" />
                        <span className="text-xs text-muted-foreground">or sign in with email</span>
                        <hr className="flex-1 border-border" />
                    </div>

                    <form onSubmit={handleEmailLogin}>
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
                            {loading ? "Signing in..." : "Sign in"}
                        </Button>
                    </form>

                    <div className="h-px bg-border my-5" />

                    <div className="text-xs text-muted-foreground leading-relaxed">
                        Don't have an account?{" "}
                        <Link to="/register" className="text-primary hover:underline">Register</Link>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="footer max-w-[920px] mx-auto px-4 py-6">
                <span>ClawQuest v0.1 beta</span>
                <a href="/privacy.html">Privacy</a>
                <a href="/terms.html">Terms</a>
                <a href="https://api.clawquest.ai/docs" target="_blank" rel="noopener noreferrer">API Docs</a>
                <a href="https://t.me/ClawQuest_aibot" target="_blank" rel="noopener noreferrer">Telegram Bot</a>
            </div>
        </div>
    )
}
