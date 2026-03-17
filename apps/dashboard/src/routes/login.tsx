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
import { EyeLine, EyeCloseLine } from "@mingcute/react"
import { InlineMessage } from "@/components/ui/inline-message"

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
    const [showPassword, setShowPassword] = useState(false)
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

        if (!email || !password) {
            setError("Please fill out all fields")
            setLoading(false)
            return
        }

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
            <div className="flex flex-1 items-start justify-center px-4 pt-8 md:items-center md:py-10">
                <div className="w-full max-w-md px-0 py-0 md:rounded-base md:border md:border-border md:bg-bg-1 md:px-4 md:py-7 text-center page-fade-in">
                    <div className="flex justify-center">
                        <button
                            type="button"
                            onClick={() => navigate({ to: "/" })}
                            className="cursor-pointer"
                        >
                            <BrandLogo size="sm" />
                        </button>
                    </div>
                    <div className="mt-4 mb-6 flex flex-col gap-1">
                        <h3 className="text-2xl font-semibold">Sign in to your account</h3>
                        <p className="text-sm text-muted-foreground">Complete quests, earn rewards.</p>
                    </div>
                    {/* Google OAuth */}
                    <Button
                        type="button"
                        variant="default-tonal"
                        size="lg"
                        className="mb-3 w-full gap-3"
                        onClick={handleGoogleLogin}
                        disabled={googleLoading}
                    >
                        {googleLoading ? "Redirecting..." : (
                            <>
                                <PlatformIcon name="google" size={20} />
                                Continue with Google
                            </>
                        )}
                    </Button>

                    {/* Telegram */}
                    <Button
                        type="button"
                        variant="default-tonal"
                        size="lg"
                        className="mb-3 w-full gap-3"
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
                                <PlatformIcon name="telegram" size={20} colored />
                                Continue with Telegram
                            </>
                        )}
                    </Button>

                    {/* X (Twitter) */}
                    <Button
                        type="button"
                        variant="default-tonal"
                        size="lg"
                        className="mb-3 w-full gap-3"
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
                        variant="default-tonal"
                        size="lg"
                        className="mb-3 w-full gap-3"
                        onClick={handleDiscordLogin}
                        disabled={discordLoading}
                    >
                        {discordLoading ? "Redirecting..." : (
                            <>
                                <PlatformIcon name="discord" size={20} colored />
                                Continue with Discord
                            </>
                        )}
                    </Button>

                    {/* GitHub OAuth button */}
                    <Button
                        type="button"
                        variant="default-tonal"
                        size="lg"
                        className="mb-4 w-full gap-3"
                        onClick={handleGithubLogin}
                        disabled={githubLoading}
                    >
                        {githubLoading ? (
                            "Redirecting..."
                        ) : (
                            <>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
                                </svg>
                                Continue with GitHub
                            </>
                        )}
                    </Button>

                    <div className="flex items-center gap-3 my-2">
                        <hr className="flex-1 border-border" />
                        <span className="text-xs text-muted-foreground">or sign in with email</span>
                        <hr className="flex-1 border-border" />
                    </div>

                    {error && (
                        <InlineMessage variant="error" className="mb-3">{error}</InlineMessage>
                    )}

                    <form onSubmit={handleEmailLogin} noValidate>
                        <div className="mb-3 space-y-1.5 text-left">
                            <Label className="text-xs">Email</Label>
                            <Input
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="mb-3 space-y-1.5 text-left">
                            <Label className="text-xs">Password</Label>
                            <div className="relative">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pr-10"
                                />
                                {password && (
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                    >
                                        {showPassword ? <EyeCloseLine size={16} /> : <EyeLine size={16} />}
                                    </button>
                                )}
                            </div>
                        </div>

                        <Button type="submit" variant="primary" size="lg" className="mt-2 w-full" disabled={loading}>
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

            <footer className="flex flex-col items-center gap-3 py-6 text-xs text-muted-foreground">
                <nav className="flex items-center gap-2">
                    <a href="/quests" className="hover:text-foreground transition-colors">Quests</a>
                    <span className="h-1 w-1 rounded-full bg-border-2" />
                    <a href="/web3-skills" className="hover:text-foreground transition-colors">Skills</a>
                    <span className="h-1 w-1 rounded-full bg-border-2" />
                    <a href="/github-bounties" className="hover:text-foreground transition-colors">Bounties</a>
                    <span className="h-1 w-1 rounded-full bg-border-2" />
                    <a href="https://api.clawquest.ai/docs" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Docs</a>
                    <span className="h-1 w-1 rounded-full bg-border-2" />
                    <a href="https://t.me/clawquest_bot" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Telegram</a>
                    <span className="h-1 w-1 rounded-full bg-border-2" />
                    <a href="https://x.com/clawquest" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">X</a>
                </nav>
            </footer>
        </div>
    )
}
