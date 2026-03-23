import { useEffect, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { supabase } from "@/lib/supabase"

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

export function AuthCallback() {
    const navigate = useNavigate()
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        // Supabase handles the OAuth code exchange automatically via onAuthStateChange
        // We just need to wait for the session to be set, then redirect
        const redirectAfterLogin = () => {
            const savedRedirect = localStorage.getItem("clawquest_redirect_after_login")
            if (savedRedirect) {
                localStorage.removeItem("clawquest_redirect_after_login")
                window.location.href = savedRedirect
            } else {
                navigate({ to: "/quests" })
            }
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === "SIGNED_IN" && session) {
                // Skip redirect if this is a linking flow — wait for USER_UPDATED instead
                if (localStorage.getItem("clawquest_linking_provider")) return
                redirectAfterLogin()
            } else if (event === "USER_UPDATED" && session) {
                // Identity linking callback — guard with localStorage key to avoid spurious triggers
                const linkingProvider = localStorage.getItem("clawquest_linking_provider")
                if (linkingProvider) {
                    localStorage.removeItem("clawquest_linking_provider")
                    // Sync handle to Prisma for Twitter/Discord (Google/GitHub are no-ops on backend)
                    if (linkingProvider === "twitter" || linkingProvider === "x" || linkingProvider === "discord") {
                        try {
                            await fetch(`${API_BASE}/auth/social/sync`, {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                    Authorization: `Bearer ${session.access_token}`,
                                },
                                body: JSON.stringify({
                                    provider: linkingProvider,
                                    // Send Discord/Twitter OAuth token for role verification (guilds.members.read)
                                    providerToken: session.provider_token ?? undefined,
                                    providerRefreshToken: session.provider_refresh_token ?? undefined,
                                }),
                            })
                        } catch {
                            // Non-fatal: auth identity is linked, handle will be missing in profile
                        }
                    }
                    navigate({ to: "/account" })
                }
            } else if (event === "SIGNED_OUT") {
                navigate({ to: "/login" })
            }
        })

        // Also handle the case where the session is already available (e.g. page refresh on callback URL).
        // Skip redirect if identity linking is in progress — let onAuthStateChange handle USER_UPDATED.
        supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
            if (sessionError) {
                setError(sessionError.message)
            } else if (session) {
                const linkingProvider = localStorage.getItem("clawquest_linking_provider")
                if (!linkingProvider) redirectAfterLogin()
            }
        })

        return () => subscription.unsubscribe()
    }, [navigate])

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <div className="text-error text-base">Authentication failed: {error}</div>
                <a href="/login" className="text-link text-sm">Back to login</a>
            </div>
        )
    }

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-fg-3 text-base">Signing you in...</div>
        </div>
    )
}
