import { useEffect, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useAuth } from "@/context/AuthContext"

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

/**
 * Handles X OAuth2 PKCE callback: exchanges code for read tokens via backend.
 * Flow: X redirects here with ?code=...&state=... → frontend sends code+codeVerifier to POST /auth/x/callback
 */
export function XCallback() {
    const navigate = useNavigate()
    const { session } = useAuth()
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const code = params.get("code")
        const state = params.get("state")

        // Retrieve PKCE verifier + state from sessionStorage (set before redirect)
        const savedState = sessionStorage.getItem("x_oauth_state")
        const codeVerifier = sessionStorage.getItem("x_oauth_code_verifier")

        if (!code) {
            setError("Missing authorization code from X")
            return
        }
        if (!state || state !== savedState) {
            setError("OAuth state mismatch — please try again")
            return
        }
        if (!codeVerifier) {
            setError("Missing PKCE verifier — please try again from Settings")
            return
        }
        if (!session?.access_token) {
            setError("Not logged in — please log in first")
            return
        }

        // Exchange code for tokens
        const redirectUri = `${window.location.origin}/auth/x/callback`
        fetch(`${API_BASE}/auth/x/callback`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ code, codeVerifier, redirectUri }),
        })
            .then(async (res) => {
                // Clean up sessionStorage
                sessionStorage.removeItem("x_oauth_state")
                sessionStorage.removeItem("x_oauth_code_verifier")

                if (!res.ok) {
                    const err = await res.json().catch(() => ({}))
                    setError(err?.error?.message || "Failed to link X account")
                    return
                }
                // Success — redirect to account settings
                navigate({ to: "/account" })
            })
            .catch(() => {
                setError("Network error — please try again")
            })
    }, [session?.access_token, navigate])

    if (error) {
        return (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: "16px" }}>
                <div style={{ color: "var(--red)", fontSize: "14px" }}>X Authorization failed: {error}</div>
                <a href="/account" style={{ color: "var(--link)", fontSize: "13px" }}>Back to Settings</a>
            </div>
        )
    }

    return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
            <div style={{ color: "var(--text-muted)", fontSize: "14px" }}>Linking X account...</div>
        </div>
    )
}
