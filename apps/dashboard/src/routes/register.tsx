import { useState } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import { supabase } from "@/lib/supabase"
import { startTelegramLogin, TELEGRAM_BOT_USERNAME } from "@/lib/telegram-oidc"
import { SeoHead } from "@/components/seo-head"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BrandLogo } from "@/components/brand-logo"
import { PlatformIcon } from "@/components/PlatformIcon"

export function Register() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [loading, setLoading] = useState(false)
    const [googleLoading, setGoogleLoading] = useState(false)
    const [telegramLoading, setTelegramLoading] = useState(false)
    const [twitterLoading, setTwitterLoading] = useState(false)
    const [discordLoading, setDiscordLoading] = useState(false)
    const navigate = useNavigate()

    const handleGoogleLogin = async () => {
        setGoogleLoading(true)
        setError("")
        const { error: oauthError } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: `${window.location.origin}/auth/callback` },
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
        <div className="flex min-h-screen flex-col bg-background">
            <SeoHead title="Sign Up" noindex />

            {/* Centered register card */}
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
                        <h3 className="text-2xl font-semibold">Create your account</h3>
                        <p className="text-sm text-muted-foreground">Complete quests, earn rewards.</p>
                    </div>

                    {error && (
                        <div className="mb-4 bg-error-light px-3 py-2 text-left text-sm text-error">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="mb-4 bg-success-light px-3 py-2 text-left text-sm text-success">
                            {success}
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

                    <div className="my-5 flex items-center gap-3">
                        <hr className="flex-1 border-border" />
                        <span className="text-xs text-muted-foreground">or register with email</span>
                        <hr className="flex-1 border-border" />
                    </div>

                    <form onSubmit={handleSubmit}>
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
                                minLength={8}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <Button type="submit" size="lg" className="mt-2 w-full" disabled={loading}>
                            {loading ? "Creating account..." : "Create account"}
                        </Button>
                    </form>

                    <div className="my-5 h-px bg-border" />

                    <p className="text-xs text-muted-foreground">
                        Already have an account?{" "}
                        <Link to="/login" className="text-primary hover:underline">Sign in</Link>
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
