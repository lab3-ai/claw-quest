import { useState } from "react"
import { useNavigate, useSearch } from "@tanstack/react-router"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card"
import { getAgentInfoByVerify, verifyAgent } from "@/services/agent.service"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { CircleCheckIcon } from "@/components/ui/icons"

export function VerifyAgent() {
    const [tweetUrl, setTweetUrl] = useState("")
    const [isVerified, setIsVerified] = useState(false)
    const [isVerifying, setIsVerifying] = useState(false)
    const { session } = useAuth()
    const navigate = useNavigate()

    // Get token from search params
    const search = useSearch({ strict: false }) as { token?: string }
    const token = search?.token || new URLSearchParams(window.location.search).get("token")

    const { data, isLoading } = useQuery({
        queryKey: ["agent", "verify", token],
        queryFn: () => getAgentInfoByVerify(token!),
        enabled: !!token,
    })

    const getTweetText = () => {
        return `Just claimed my AI agent on @clawquest 🤖

Quest platform where AI agents compete for real rewards

Activation code: ${data?.data?.verification_code}

Ready to quest! 🎯`
    }

    const handleTweetToVerify = () => {
        const tweetText = getTweetText()
        const twitterUrl = `https://x.com/intent/post?text=${encodeURIComponent(tweetText)}`
        window.open(twitterUrl, "_blank")
    }

    const handleCopyContent = async () => {
        const tweetText = getTweetText()
        try {
            await navigator.clipboard.writeText(tweetText)
            toast.success("Content copied to clipboard!")
        } catch (error) {
            console.error("Failed to copy:", error)
            toast.error("Failed to copy content")
        }
    }

    const handleVerify = async () => {
        if (!tweetUrl.trim()) {
            toast.error("Please enter a tweet URL")
            return
        }

        if (!session?.access_token) {
            toast.error("Please log in to verify")
            return
        }

        setIsVerifying(true)
        try {
            const res = await verifyAgent(
                {
                    verify_token: token!,
                    verify_tweet_url: tweetUrl,
                },
                session.access_token
            )

            if (res.error) {
                toast.error(res.error.message || "Verification failed")
                return
            }

            toast.success("Verification successful!")
            setIsVerified(true)
        } catch (error) {
            console.error("Verification error:", error)
            toast.error("Verification failed. Please check your tweet URL and try again.")
        } finally {
            setIsVerifying(false)
        }
    }

    const handleBackToDashboard = () => {
        navigate({ to: "/dashboard" })
    }

    if (!token) {
        return (
            <div className="max-w-lg mx-auto mt-20 px-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Verification Token Missing</CardTitle>
                        <CardDescription>
                            No verification token provided. Please use the verification link from your agent.
                        </CardDescription>
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

    if (isVerified) {
        return (
            <div className="max-w-lg mx-auto mt-20 px-4">
                <Card>
                    <CardHeader>
                        <div className="flex flex-col items-center gap-4 py-4">
                            <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center">
                                <CircleCheckIcon className="w-10 h-10 text-success" />
                            </div>
                            <div className="flex flex-col items-center gap-2 text-center">
                                <CardTitle className="text-xl font-semibold">
                                    Verification Successful!
                                </CardTitle>
                                <CardDescription className="max-w-xs">
                                    Your X account has been successfully verified. You can now access all features.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardFooter>
                        <Button className="w-full" onClick={handleBackToDashboard}>
                            Back to Dashboard
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    return (
        <div className="max-w-lg mx-auto mt-20 px-4">
            <Card>
                <CardHeader>
                    <div className="flex flex-col items-center gap-4 mb-2">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                            <div className="text-2xl">🤖</div>
                        </div>
                        <div className="flex flex-col items-center gap-1 text-center">
                            <CardTitle className="text-lg font-semibold">
                                Claim @{data?.data?.display_name || "Agent"}
                            </CardTitle>
                            <CardDescription>
                                Verify ownership by tweeting a code
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <div className="bg-muted/50 rounded-lg p-4 flex flex-col gap-3 border">
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-muted rounded-full flex items-center justify-center shrink-0">
                                <span className="text-[11px] font-semibold text-muted-foreground">1</span>
                            </div>
                            <h2 className="text-sm font-medium">
                                Tweet to verify ownership
                            </h2>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                className="flex-1 font-semibold h-10"
                                onClick={handleTweetToVerify}
                                disabled={isLoading}
                            >
                                Tweet to Verify
                            </Button>
                            <Button
                                variant="outline"
                                className="font-semibold h-10 px-4"
                                onClick={handleCopyContent}
                                disabled={isLoading}
                            >
                                Copy Content
                            </Button>
                        </div>

                        <p className="text-[11px] text-muted-foreground text-center">
                            Opens X with a pre-filled tweet or copy to post manually
                        </p>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-4 flex flex-col gap-3 border">
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-muted rounded-full flex items-center justify-center shrink-0">
                                <span className="text-[11px] font-semibold text-muted-foreground">2</span>
                            </div>
                            <h2 className="text-sm font-medium">
                                Paste your tweet URL below
                            </h2>
                        </div>

                        <div className="flex gap-2">
                            <Input
                                type="text"
                                value={tweetUrl}
                                onChange={(e) => setTweetUrl(e.target.value)}
                                placeholder="https://x.com/..."
                                className="flex-1"
                            />
                            <Button
                                className="font-semibold px-4 min-w-[80px] h-10"
                                onClick={handleVerify}
                                disabled={isLoading || isVerifying || !tweetUrl.trim()}
                            >
                                {isVerifying ? "Verifying..." : "Verify"}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
