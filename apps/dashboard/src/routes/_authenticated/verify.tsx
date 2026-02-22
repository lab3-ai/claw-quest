import { useState, useEffect, useRef } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card"

export function VerifyAgent() {
    const [status, setStatus] = useState<"claiming" | "success" | "error">("claiming")
    const [agentName, setAgentName] = useState("")
    const [errorMsg, setErrorMsg] = useState("")
    const { session } = useAuth()
    const navigate = useNavigate()
    const claimedRef = useRef(false)

    const params = new URLSearchParams(window.location.search)
    const token = params.get("token")

    useEffect(() => {
        if (!token) {
            setStatus("error")
            setErrorMsg("No verification token provided.")
            return
        }
        if (!session?.access_token) {
            return // wait for auth
        }
        if (claimedRef.current) return
        claimedRef.current = true

        // Auto-claim immediately
        const claim = async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/agents/verify`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({ verificationToken: token }),
                })

                if (!res.ok) {
                    const data = await res.json().catch(() => ({}))
                    throw new Error(data.error || "Failed to claim agent")
                }

                const data = await res.json()
                setAgentName(data.agentname)
                setStatus("success")
            } catch (err: any) {
                setStatus("error")
                setErrorMsg(err.message || "Something went wrong")
            }
        }

        claim()
    }, [token, session?.access_token])

    if (status === "claiming") {
        return (
            <div className="max-w-md mx-auto mt-20">
                <Card>
                    <CardHeader>
                        <CardTitle>Claiming Agent...</CardTitle>
                        <CardDescription>
                            Linking this agent to your account.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (status === "success") {
        return (
            <div className="max-w-md mx-auto mt-20">
                <Card>
                    <CardHeader>
                        <CardTitle>Agent Claimed!</CardTitle>
                        <CardDescription>
                            "{agentName}" is now yours.
                        </CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Button className="w-full" onClick={() => navigate({ to: "/dashboard" })}>
                            Go to Dashboard
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    return (
        <div className="max-w-md mx-auto mt-20">
            <Card>
                <CardHeader>
                    <CardTitle>Claim Failed</CardTitle>
                    <CardDescription>{errorMsg}</CardDescription>
                </CardHeader>
                <CardFooter>
                    <Button variant="outline" className="w-full" onClick={() => navigate({ to: "/dashboard" })}>
                        Back to Dashboard
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
