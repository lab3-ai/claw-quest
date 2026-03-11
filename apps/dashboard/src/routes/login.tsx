import { useState } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"
import { startTelegramLogin } from "@/lib/telegram-oidc"
import { SeoHead } from "@/components/seo-head"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BrandLogo } from "@/components/brand-logo"
import { PlatformIcon } from "@/components/PlatformIcon"

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

    // Persist ?redirect= param so post-auth callback can pick it up
    const redirectParam = new URLSearchParams(window.location.search).get("redirect")
    if (redirectParam) {
        localStorage.setItem("clawquest_redirect_after_login", redirectParam)
    }

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
        <div className="flex min-h-screen flex-col bg-background">
            <SeoHead title="Log In" noindex />

            {/* Centered login card */}
            <div className="flex flex-1 items-center justify-center px-4 py-10">
                <div className="w-full max-w-md rounded-base border border-border bg-background p-7 text-center">
                    <div className="mb-1 flex justify-center">
                        <button
                            type="button"
                            onClick={() => navigate({ to: "/home" })}
                            className="cursor-pointer"
                        >
                            <BrandLogo size="sm" />
                        </button>
                    </div>
                    <div className="my-6 flex flex-col gap-1">
                        <h3 className="text-2xl font-bold">Sign in to your account</h3>
                        <p className="text-sm text-muted-foreground">Complete quests, earn rewards.</p>
                    </div>
                    {error && (
                        <div className="mb-4 bg-error-light px-3 py-2 text-left text-sm text-error">
                            {error}
                        </div>
                    )}

                    {/* Google OAuth — no PlatformIcon available, keep inline SVG */}
                    <Button
                        type="button"
                        variant="outline"
                        size="md"
                        className="mb-3 flex w-full items-center justify-center gap-2"
                        onClick={handleGoogleLogin}
                        disabled={googleLoading}
                    >
                        {googleLoading ? "Redirecting..." : (
                            <>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                Continue with Google
                            </>
                        )}
                    </Button>

                    {/* Telegram */}
                    <Button
                        type="button"
                        variant="outline"
                        size="md"
                        className="mb-3 flex w-full items-center justify-center gap-2"
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
                        {telegramLoading ? "Redirecting..." : (
                            <>
                                <PlatformIcon name="telegram" size={16} colored />
                                Continue with Telegram
                            </>
                        )}
                    </Button>

                    {/* X (Twitter) */}
                    <Button
                        type="button"
                        variant="outline"
                        size="md"
                        className="mb-3 flex w-full items-center justify-center gap-2"
                        onClick={handleTwitterLogin}
                        disabled={twitterLoading}
                    >
                        {twitterLoading ? "Redirecting..." : (
                            <>
                                <PlatformIcon name="x" size={16} />
                                Continue with X (Twitter)
                            </>
                        )}
                    </Button>

                    {/* Discord */}
                    <Button
                        type="button"
                        variant="outline"
                        size="md"
                        className="mb-3 flex w-full items-center justify-center gap-2"
                        onClick={handleDiscordLogin}
                        disabled={discordLoading}
                    >
                        {discordLoading ? "Redirecting..." : (
                            <>
                                <PlatformIcon name="discord" size={16} colored />
                                Continue with Discord
                            </>
                        )}
                    </Button>

                    <div className="my-5 flex items-center gap-3">
                        <hr className="flex-1 border-border" />
                        <span className="text-xs text-muted-foreground">or sign in with email</span>
                        <hr className="flex-1 border-border" />
                    </div>

                    <form onSubmit={handleEmailLogin}>
                        <div className="mb-3 space-y-1.5 text-left">
                            <Label className="text-xs">Email</Label>
                            <Input
                                type="email"
                                placeholder="you@example.com"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="mb-3 space-y-1.5 text-left">
                            <Label className="text-xs">Password</Label>
                            <Input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <Button type="submit" size="md" className="mt-2 w-full" disabled={loading}>
                            {loading ? "Signing in..." : "Sign in"}
                        </Button>
                    </form>

                    <div className="my-5 h-px bg-border" />

                    <p className="text-xs text-muted-foreground">
                        Don't have an account?{" "}
                        <Link to="/register" className="text-primary hover:underline">Register</Link>
                    </p>
                </div>
            </div>

            {/* Footer */}
            <footer className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-4 px-4 py-6 text-xs text-muted-foreground">
                <span>ClawQuest v0.1 beta</span>
                <a href="/privacy.html" className="hover:text-foreground">Privacy</a>
                <a href="/terms.html" className="hover:text-foreground">Terms</a>
                <a href="https://api.clawquest.ai/docs" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">API Docs</a>
                <a href="https://t.me/ClawQuest_aibot" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">Telegram Bot</a>
            </footer>
        </div>
    )
}
