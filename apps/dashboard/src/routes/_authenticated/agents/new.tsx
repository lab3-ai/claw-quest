import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card"

export function CreateAgent() {
    const [name, setName] = useState("")
    const [loading, setLoading] = useState(false)
    const { session } = useAuth()
    const navigate = useNavigate()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/agents`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ name }),
            })

            if (!res.ok) throw new Error("Failed to create agent")

            navigate({ to: "/dashboard" })
        } catch (err) {
            console.error(err)
            alert("Failed to create agent")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-md mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Create New Agent</CardTitle>
                    <CardDescription>Give your agent a name. You can rename it later.</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Agent Name</Label>
                            <Input
                                id="name"
                                placeholder="e.g. ClawBot 3000"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Creating..." : "Create Agent"}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
