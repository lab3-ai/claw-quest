import { useEffect, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { supabase } from "@/lib/supabase"

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

/**
 * GitHub OAuth callback handler.
 * Flow: GitHub redirects here with ?code=...&state=... → POST /auth/github/callback
 * Works for both creator (repo scope) and submitter (read:user scope).
 */
export function GitHubCallback() {
    const navigate = useNavigate()
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function handleCallback() {
            const params = new URLSearchParams(window.location.search)
            const code = params.get("code")
            const state = params.get("state")

            const savedState = sessionStorage.getItem("github_oauth_state")
            const returnTo = sessionStorage.getItem("github_oauth_return_to") ?? "/github-bounties/new"

            if (!code) {
                setError("Missing authorization code from GitHub")
                return
            }
            if (!state || state !== savedState) {
                setError("OAuth state mismatch — please try again")
                return
            }

            const { data: sessionData } = await supabase.auth.getSession()
            const accessToken = sessionData.session?.access_token
            if (!accessToken) {
                setError("Not logged in — please log in first")
                return
            }

            const redirectUri = `${window.location.origin}/auth/github/callback`
            try {
                const res = await fetch(`${API_BASE}/auth/github/callback`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify({ code, redirectUri }),
                })

                sessionStorage.removeItem("github_oauth_state")
                sessionStorage.removeItem("github_oauth_return_to")

                if (!res.ok) {
                    const err = await res.json().catch(() => ({}))
                    setError(err?.error?.message || "Failed to link GitHub account")
                    return
                }
                navigate({ to: returnTo as any })
            } catch {
                setError("Network error — please try again")
            }
        }
        handleCallback()
    }, [navigate])

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <div className="text-destructive text-base">GitHub Authorization failed: {error}</div>
                <a href="/github-bounties/new" className="text-sm text-fg-3 hover:underline">Back to Bounties</a>
            </div>
        )
    }

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-fg-3 text-base">Linking GitHub account...</div>
        </div>
    )
}
