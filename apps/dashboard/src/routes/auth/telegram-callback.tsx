import { useEffect, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { supabase } from "@/lib/supabase"
import { consumeOidcParams } from "@/lib/telegram-oidc"

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

export function TelegramCallback() {
    const navigate = useNavigate()
    const [error, setError] = useState<string | null>(null)
    const [status, setStatus] = useState("Verifying Telegram login...")

    useEffect(() => {
        handleCallback()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    async function handleCallback() {
        try {
            // 1. Extract code + state from URL
            const params = new URLSearchParams(window.location.search)
            const code = params.get("code")
            const urlState = params.get("state")

            if (!code || !urlState) {
                setError("Missing authorization code or state parameter")
                return
            }

            // 2. Retrieve stored PKCE params
            const stored = consumeOidcParams()
            if (!stored) {
                setError("Session expired — please try logging in again")
                return
            }

            // 3. Validate state
            if (urlState !== stored.state) {
                setError("Invalid state parameter — possible CSRF attack")
                return
            }

            const redirectUri = `${window.location.origin}/auth/telegram/callback`

            if (stored.flow === "link") {
                // Link flow — attach Telegram to existing account
                // Get token directly from Supabase (avoids race with useAuth context)
                setStatus("Linking Telegram account...")
                const { data: sessionData } = await supabase.auth.getSession()
                const token = sessionData.session?.access_token
                if (!token) {
                    setError("Not authenticated — please log in first")
                    return
                }

                const res = await fetch(`${API_BASE}/auth/telegram/link`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        code,
                        codeVerifier: stored.codeVerifier,
                        redirectUri,
                    }),
                })

                if (!res.ok) {
                    const err = await res.json().catch(() => ({ error: { message: "Link failed" } }))
                    throw new Error(err.error?.message ?? "Failed to link Telegram")
                }

                // Redirect back to account page
                navigate({ to: "/account" })
                return
            }

            // Login flow
            setStatus("Exchanging authorization code...")
            const res = await fetch(`${API_BASE}/auth/telegram`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    code,
                    codeVerifier: stored.codeVerifier,
                    redirectUri,
                }),
            })

            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: { message: "Login failed" } }))
                throw new Error(err.error?.message ?? "Telegram login failed")
            }

            const data = await res.json()

            // Set Supabase session — triggers onAuthStateChange → AuthContext updated
            setStatus("Setting up session...")
            const { error: sessionError } = await supabase.auth.setSession({
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
            })

            if (sessionError) {
                throw new Error(`Session error: ${sessionError.message}`)
            }

            // Redirect
            const savedRedirect = localStorage.getItem("clawquest_redirect_after_login")
            if (savedRedirect) {
                localStorage.removeItem("clawquest_redirect_after_login")
                window.location.href = savedRedirect
            } else {
                navigate({ to: "/quests" })
            }
        } catch (err: any) {
            setError(err.message ?? "An unexpected error occurred")
        }
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <div className="text-error text-base max-w-[400px] text-center">
                    Telegram login failed: {error}
                </div>
                <a href="/login" className="text-link text-sm">Back to login</a>
            </div>
        )
    }

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-muted-foreground text-base">{status}</div>
        </div>
    )
}
