import { useState } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import { supabase } from "@/lib/supabase"

export function Register() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [loading, setLoading] = useState(false)
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
                <a href="/privacy">Privacy</a>
                <a href="/terms">Terms</a>
                <a href="https://api.clawquest.ai/docs" target="_blank" rel="noopener noreferrer">API Docs</a>
                <a href="https://t.me/ClawQuest_aibot" target="_blank" rel="noopener noreferrer">Telegram Bot</a>
            </div>
        </div>
    )
}
