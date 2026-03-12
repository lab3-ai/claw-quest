import { useState } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"
import { startTelegramLogin, TELEGRAM_BOT_USERNAME } from "@/lib/telegram-oidc"
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
    const [githubLoading, setGithubLoading] = useState(false)
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

    const handleGithubLogin = async () => {
        setGithubLoading(true)
        setError("")
        const { error: oauthError } = await supabase.auth.signInWithOAuth({
            provider: "github",
            options: { redirectTo: `${window.location.origin}/auth/callback` },
        })
        if (oauthError) {
            setError(oauthError.message)
            setGithubLoading(false)
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
                            onClick={() => navigate({ to: "/quests" })}
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

                    {/* Google OAuth */}
                    <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        className="mb-3 flex w-full items-center justify-center gap-2"
                        onClick={handleGoogleLogin}
                        disabled={googleLoading}
                    >
                        {googleLoading ? "Redirecting..." : (
                            <>
                                <PlatformIcon name="google" size={16} />
                                Continue with Google
                            </>
                        )}
                    </Button>

                    {/* Telegram */}
                    <Button
                        type="button"
                        variant="outline"
                        size="lg"
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
                        size="lg"
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
                        size="lg"
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

                    {/* GitHub OAuth button */}
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full mb-4 flex items-center justify-center gap-2 text-base py-2.5"
                        onClick={handleGithubLogin}
                        disabled={githubLoading}
                    >
                        {githubLoading ? (
                            "Redirecting..."
                        ) : (
                            <>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
                                </svg>
                                Continue with GitHub
                            </>
                        )}
                    </Button>

                    <div className="flex items-center gap-3 my-5">
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

                        <Button type="submit" size="lg" className="mt-2 w-full" disabled={loading}>
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
                <a href={`https://t.me/${TELEGRAM_BOT_USERNAME}`} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">Telegram Bot</a>
            </footer>
        </div>
    )
}
