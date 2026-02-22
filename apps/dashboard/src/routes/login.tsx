import { useState } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"
import "@/styles/login-modal.css"
import "@/styles/login-page.css"

export function Login() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const [googleLoading, setGoogleLoading] = useState(false)
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
        <div className="login-page">
            {/* Topbar */}
            <div className="topbar">
                <Link to="/quests" className="topbar-logo">
                    Claw<span>Quest</span>
                </Link>
                <div className="topbar-nav">
                    <Link to="/quests">Quests</Link>
                </div>
            </div>

            {/* Centered login card */}
            <div className="login-page-center">
                <div className="login-modal" style={{ position: "static", width: 380 }}>
                    <div className="login-modal-logo">
                        Claw<span>Quest</span>
                    </div>
                    <div className="login-modal-subtitle">Sign in to your account</div>

                    {error && (
                        <div style={{ background: "var(--red-bg)", color: "var(--red)", padding: "8px 12px", borderRadius: "3px", fontSize: "12px", marginBottom: "16px", textAlign: "left" }}>
                            {error}
                        </div>
                    )}

                    {/* Google OAuth button */}
                    <button
                        type="button"
                        className="btn btn-outline"
                        style={{ width: "100%", padding: "10px", fontSize: "13px", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                        onClick={handleGoogleLogin}
                        disabled={googleLoading}
                    >
                        {googleLoading ? (
                            "Redirecting..."
                        ) : (
                            <>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                </svg>
                                Continue with Google
                            </>
                        )}
                    </button>

                    <div className="login-modal-divider">
                        <span style={{ fontSize: "11px", color: "var(--text-muted)", padding: "0 8px", background: "var(--surface)" }}>or sign in with email</span>
                    </div>

                    <form onSubmit={handleEmailLogin}>
                        <div className="login-form-group">
                            <label className="login-label">Email</label>
                            <input
                                className="login-input"
                                type="email"
                                placeholder="you@example.com"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="login-form-group">
                            <label className="login-label">Password</label>
                            <input
                                className="login-input"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ width: "100%", padding: "10px", fontSize: "13px", marginTop: "8px" }}
                            disabled={loading}
                        >
                            {loading ? "Signing in..." : "Sign in"}
                        </button>
                    </form>

                    <div className="login-modal-divider" />

                    <div className="login-modal-hint">
                        Don't have an account?{" "}
                        <Link to="/register" style={{ color: "var(--link)" }}>Register</Link>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="footer" style={{ maxWidth: 920, margin: "0 auto", padding: "24px 16px" }}>
                <span>ClawQuest v0.1 beta</span>
                <a href="#">API Docs</a>
                <a href="#">Telegram Bot</a>
            </div>
        </div>
    )
}
