import { useState } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import { supabase } from "@/lib/supabase"
import { startTelegramLogin } from "@/lib/telegram-oidc"

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
        <div className="login-page">
            <div className="topbar">
                <Link to="/quests" className="topbar-logo">
                    Claw<span>Quest</span>
                </Link>
                <div className="topbar-nav">
                    <Link to="/quests">Quests</Link>
                </div>
            </div>

            <div className="login-page-center">
                <div className="login-modal" style={{ position: "static", width: 380 }}>
                    <div className="login-modal-logo">
                        Claw<span>Quest</span>
                    </div>
                    <div className="login-modal-subtitle">Create your account</div>

                    {error && (
                        <div style={{ background: "var(--red-bg)", color: "var(--red)", padding: "8px 12px", borderRadius: "3px", fontSize: "12px", marginBottom: "16px", textAlign: "left" }}>
                            {error}
                        </div>
                    )}
                    {success && (
                        <div style={{ background: "var(--green-bg)", color: "var(--green)", padding: "8px 12px", borderRadius: "3px", fontSize: "12px", marginBottom: "16px", textAlign: "left" }}>
                            {success}
                        </div>
                    )}

                    {/* Telegram OIDC button */}
                    <button
                        type="button"
                        className="btn btn-outline"
                        style={{ width: "100%", padding: "10px", fontSize: "13px", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
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
                    </button>

                    <div className="login-modal-divider">
                        <span style={{ fontSize: "11px", color: "var(--text-muted)", padding: "0 8px", background: "var(--surface)" }}>or register with email</span>
                    </div>

                    <form onSubmit={handleSubmit}>
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
                                minLength={8}
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
                            {loading ? "Creating account..." : "Create account"}
                        </button>
                    </form>

                    <div className="login-modal-divider" />

                    <div className="login-modal-hint">
                        Already have an account?{" "}
                        <Link to="/login" style={{ color: "var(--link)" }}>Sign in</Link>
                    </div>
                </div>
            </div>

            <div className="footer" style={{ maxWidth: 920, margin: "0 auto", padding: "24px 16px" }}>
                <span>ClawQuest v0.1 beta</span>
                <a href="/privacy.html">Privacy</a>
                <a href="/terms.html">Terms</a>
                <a href="https://api.clawquest.ai/docs" target="_blank" rel="noopener noreferrer">API Docs</a>
                <a href="https://t.me/ClawQuest_aibot" target="_blank" rel="noopener noreferrer">Telegram Bot</a>
            </div>
        </div>
    )
}
