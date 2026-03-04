import { useEffect, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { supabase } from "@/lib/supabase"

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

/**
 * Handles X OAuth2 PKCE callback: exchanges code for read tokens via backend.
 * Flow: X redirects here with ?code=...&state=... → frontend sends code+codeVerifier to POST /auth/x/callback
 */
export function XCallback() {
    const navigate = useNavigate()
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function handleCallback() {
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

            // Get token directly from Supabase (avoids race with useAuth context)
            const { data: sessionData } = await supabase.auth.getSession()
            const accessToken = sessionData.session?.access_token
            if (!accessToken) {
                setError("Not logged in — please log in first")
                return
            }

            // Exchange code for tokens
            const redirectUri = `${window.location.origin}/auth/x/callback`
            try {
                const res = await fetch(`${API_BASE}/auth/x/callback`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify({ code, codeVerifier, redirectUri }),
                })

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
            } catch {
                setError("Network error — please try again")
            }
        }
        handleCallback()
    }, [navigate])

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <div className="text-error text-base">X Authorization failed: {error}</div>
                <a href="/account" className="text-link text-sm">Back to Settings</a>
            </div>
        )
    }

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-muted-foreground text-base">Linking X account...</div>
        </div>
    )
}
