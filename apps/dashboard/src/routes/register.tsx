import { useState } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import { supabase } from "@/lib/supabase"
import { SeoHead } from "@/components/seo-head"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BrandLogo } from "@/components/brand-logo"
import { EyeLine, EyeCloseLine } from "@mingcute/react"
import { InlineMessage } from "@/components/ui/inline-message"

export function Register() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const navigate = useNavigate()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")
        setSuccess("")

        if (!email || !password || !confirmPassword) {
            setError("Please fill out all fields")
            setLoading(false)
            return
        }
        if (password.length < 8) {
            setError("Password must be at least 8 characters")
            setLoading(false)
            return
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match")
            setLoading(false)
            return
        }

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
        <div className="flex min-h-screen flex-col bg-bg-base">
            <SeoHead title="Sign Up" noindex />

            <div className="flex flex-1 items-start justify-center px-4 pt-8 md:items-center md:py-10">
                <div className="w-full max-w-md px-0 py-0 md:rounded-base md:border md:border-border-2 md:bg-bg-1 md:px-4 md:py-7 text-center page-fade-in">
                    <div className="flex justify-center">
                        <button
                            type="button"
                            onClick={() => navigate({ to: "/" })}
                            className="cursor-pointer"
                            aria-label="Go to homepage"
                        >
                            <BrandLogo size="sm" />
                        </button>
                    </div>
                    <div className="mt-4 mb-6 flex flex-col gap-1">
                        <h3 className="text-2xl font-semibold">Create your account</h3>
                        <p className="text-sm text-fg-3">Complete quests, earn rewards.</p>
                    </div>

                    {error && (
                        <InlineMessage variant="error" className="mb-4">{error}</InlineMessage>
                    )}
                    {success && (
                        <InlineMessage variant="success" className="mb-4">{success}</InlineMessage>
                    )}

                    <form onSubmit={handleSubmit} noValidate>
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
                                        className="absolute right-0 top-0 h-full px-3 text-fg-3 hover:text-fg-1 transition-colors cursor-pointer"
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? <EyeCloseLine size={16} /> : <EyeLine size={16} />}
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="mb-3 space-y-1.5 text-left">
                            <Label className="text-xs">Confirm Password</Label>
                            <div className="relative">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="pr-10"
                                />
                                {confirmPassword && (
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-0 top-0 h-full px-3 text-fg-3 hover:text-fg-1 transition-colors cursor-pointer"
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? <EyeCloseLine size={16} /> : <EyeLine size={16} />}
                                    </button>
                                )}
                            </div>
                        </div>

                        <Button type="submit" variant="primary" size="lg" className="mt-2 w-full" disabled={loading}>
                            {loading ? "Creating account..." : "Create account"}
                        </Button>
                    </form>

                    <div className="my-5 h-px bg-border" />

                    <p className="text-xs text-fg-3">
                        Already have an account?{" "}
                        <Link to="/login" className="text-primary hover:underline">Sign in</Link>
                    </p>
                </div>
            </div>

            <footer className="flex flex-col items-center gap-3 py-6 text-xs text-fg-3">
                <nav className="flex items-center gap-2">
                    <a href="/quests" className="hover:text-fg-1 transition-colors">Quests</a>
                    <span className="h-1 w-1 rounded-full bg-border-2" />
                    <a href="/web3-skills" className="hover:text-fg-1 transition-colors">Skills</a>
                    <span className="h-1 w-1 rounded-full bg-border-2" />
                    <a href="/github-bounties" className="hover:text-fg-1 transition-colors">Bounties</a>
                    <span className="h-1 w-1 rounded-full bg-border-2" />
                    <a href="https://api.clawquest.ai/docs" target="_blank" rel="noopener noreferrer" className="hover:text-fg-1 transition-colors">Docs</a>
                    <span className="h-1 w-1 rounded-full bg-border-2" />
                    <a href="https://t.me/clawquest_bot" target="_blank" rel="noopener noreferrer" className="hover:text-fg-1 transition-colors">Telegram</a>
                    <span className="h-1 w-1 rounded-full bg-border-2" />
                    <a href="https://x.com/clawquest" target="_blank" rel="noopener noreferrer" className="hover:text-fg-1 transition-colors">X</a>
                </nav>
            </footer>
        </div>
    )
}
