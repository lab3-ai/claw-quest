import { useEffect, useRef, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import type { Session } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

function identityMatchesLinking(
    identities: { provider: string }[],
    stored: string,
): boolean {
    const wanted = new Set<string>([stored])
    if (stored === "x") wanted.add("twitter")
    if (stored === "twitter") wanted.add("x")
    return identities.some((i) => wanted.has(i.provider))
}

export function AuthCallback() {
    const navigate = useNavigate()
    const [error, setError] = useState<string | null>(null)
    const finalizedRef = useRef(false)

    useEffect(() => {
        const redirectAfterLogin = () => {
            if (finalizedRef.current) return
            const savedRedirect = localStorage.getItem("clawquest_redirect_after_login")
            if (savedRedirect) {
                localStorage.removeItem("clawquest_redirect_after_login")
                window.location.href = savedRedirect
            } else {
                navigate({ to: "/quests" })
            }
        }

        async function finalizeLinking(session: Session, linkingProvider: string) {
            if (finalizedRef.current) return
            finalizedRef.current = true
            localStorage.removeItem("clawquest_linking_provider")
            if (
                linkingProvider === "twitter" ||
                linkingProvider === "x" ||
                linkingProvider === "discord"
            ) {
                try {
                    await fetch(`${API_BASE}/auth/social/sync`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${session.access_token}`,
                        },
                        body: JSON.stringify({
                            provider: linkingProvider,
                            providerToken: session.provider_token ?? undefined,
                            providerRefreshToken:
                                session.provider_refresh_token ?? undefined,
                        }),
                    })
                } catch {
                    // Non-fatal: auth identity is linked, handle may be missing in profile
                }
            }
            navigate({ to: "/account" })
        }

        /** linkIdentity() often does not emit USER_UPDATED; confirm via identities API instead */
        async function tryCompleteLinking(session: Session): Promise<boolean> {
            const linkingProvider = localStorage.getItem("clawquest_linking_provider")
            if (!linkingProvider) return false

            const maxAttempts = 12
            const delayMs = 300
            for (let attempt = 0; attempt < maxAttempts; attempt++) {
                const { data, error: idError } =
                    await supabase.auth.getUserIdentities()
                if (!idError && data?.identities) {
                    if (identityMatchesLinking(data.identities, linkingProvider)) {
                        await finalizeLinking(session, linkingProvider)
                        return true
                    }
                }
                if (attempt < maxAttempts - 1) {
                    await new Promise((r) => setTimeout(r, delayMs))
                }
            }
            return false
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === "SIGNED_IN" && session) {
                    if (localStorage.getItem("clawquest_linking_provider")) {
                        const ok = await tryCompleteLinking(session)
                        if (!ok && localStorage.getItem("clawquest_linking_provider")) {
                            localStorage.removeItem("clawquest_linking_provider")
                            setError(
                                "Could not confirm account link. Please try again from Account.",
                            )
                        }
                        return
                    }
                    redirectAfterLogin()
                } else if (event === "USER_UPDATED" && session) {
                    const linkingProvider = localStorage.getItem(
                        "clawquest_linking_provider",
                    )
                    if (linkingProvider) {
                        await tryCompleteLinking(session)
                    }
                } else if (event === "SIGNED_OUT") {
                    navigate({ to: "/login" })
                }
            },
        )

        supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
            if (sessionError) {
                setError(sessionError.message)
            } else if (session) {
                const linkingProvider = localStorage.getItem("clawquest_linking_provider")
                if (linkingProvider) {
                    void tryCompleteLinking(session).then((ok) => {
                        if (!ok && localStorage.getItem("clawquest_linking_provider")) {
                            localStorage.removeItem("clawquest_linking_provider")
                            setError(
                                "Could not confirm account link. Please try again from Account.",
                            )
                        }
                    })
                } else {
                    redirectAfterLogin()
                }
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
