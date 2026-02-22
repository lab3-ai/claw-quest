import { useEffect, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { supabase } from "@/lib/supabase"

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

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === "SIGNED_IN" && session) {
                redirectAfterLogin()
            } else if (event === "SIGNED_OUT") {
                navigate({ to: "/login" })
            }
        })

        // Also handle the case where the session is already available (e.g. page refresh on callback URL)
        supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
            if (sessionError) {
                setError(sessionError.message)
            } else if (session) {
                redirectAfterLogin()
            }
        })

        return () => subscription.unsubscribe()
    }, [navigate])

    if (error) {
        return (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: "16px" }}>
                <div style={{ color: "var(--red)", fontSize: "14px" }}>Authentication failed: {error}</div>
                <a href="/login" style={{ color: "var(--link)", fontSize: "13px" }}>Back to login</a>
            </div>
        )
    }

    return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
            <div style={{ color: "var(--text-muted)", fontSize: "14px" }}>Signing you in...</div>
        </div>
    )
}
