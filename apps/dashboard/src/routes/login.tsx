import { useState } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import { useAuth } from "@/context/AuthContext"
import type { AuthResponse } from "@clawquest/shared"
import "@/styles/login-modal.css"
import "@/styles/login-page.css"

export function Login() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const { login } = useAuth()
    const navigate = useNavigate()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            })

            const data: AuthResponse = await res.json()

            if (!res.ok) {
                throw new Error((data as any).message || "Login failed")
            }

            login(data.token, data.user)
            navigate({ to: "/" })
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
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
