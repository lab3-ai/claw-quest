import { useState, useEffect } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card"

export function VerifyAgent() {
    const [status, setStatus] = useState<"loading" | "ready" | "claiming" | "success" | "error">("loading")
    const [agentName, setAgentName] = useState("")
    const [errorMsg, setErrorMsg] = useState("")
    const { session } = useAuth()
    const navigate = useNavigate()

    const params = new URLSearchParams(window.location.search)
    const token = params.get("token")

    useEffect(() => {
        if (!token) {
            setStatus("error")
            setErrorMsg("No verification token provided.")
            return
        }
        setStatus("ready")
    }, [token])

    const handleClaim = async () => {
        if (!token || !session?.access_token) return
        setStatus("claiming")

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
            setAgentName(data.name)
            setStatus("success")
        } catch (err: any) {
            setStatus("error")
            setErrorMsg(err.message || "Something went wrong")
        }
    }

    if (status === "success") {
        return (
            <div className="max-w-md mx-auto">
                <Card>
                    <CardHeader>
                        <CardTitle>Agent Claimed!</CardTitle>
                        <CardDescription>
                            "{agentName}" is now yours.
                        </CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Button className="w-full" onClick={() => navigate({ to: "/" })}>
                            Go to Dashboard
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    return (
        <div className="max-w-md mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Claim Agent</CardTitle>
                    <CardDescription>
                        {status === "error"
                            ? errorMsg
                            : "An agent wants to join your account. Click below to claim it."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {token && status !== "error" && (
                        <p className="text-sm text-muted-foreground">
                            Token: {token.slice(0, 8)}...{token.slice(-8)}
                        </p>
                    )}
                </CardContent>
                <CardFooter>
                    {status === "error" ? (
                        <Button variant="outline" className="w-full" onClick={() => navigate({ to: "/" })}>
                            Back to Dashboard
                        </Button>
                    ) : (
                        <Button
                            className="w-full"
                            onClick={handleClaim}
                            disabled={status === "claiming"}
                        >
                            {status === "claiming" ? "Claiming..." : "Claim This Agent"}
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    )
}
