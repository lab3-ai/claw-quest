import { useState } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card"
import type { AuthResponse } from "@clawquest/shared"

export function Register() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const { login } = useAuth()
    const navigate = useNavigate()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            })

            const data: AuthResponse = await res.json()

            if (!res.ok) {
                throw new Error((data as any).message || "Registration failed")
            }

            login(data.token, data.user)
            navigate({ to: "/" })
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
            <Card className="w-[350px]">
                <CardHeader>
                    <CardTitle>Register</CardTitle>
                    <CardDescription>Create a new account to start your journey.</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        {error && <div className="text-red-500 text-sm">{error}</div>}
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="m@example.com"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                minLength={8}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-2">
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Creating account..." : "Register"}
                        </Button>
                        <div className="text-sm text-center">
                            Already have an account?{" "}
                            <Link to="/login" className="underline">
                                Login
                            </Link>
                        </div>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
