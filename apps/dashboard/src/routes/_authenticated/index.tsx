import { Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import type { Agent } from "@clawquest/shared"

export function AgentList() {
    const { session } = useAuth()

    const { data: agents, isLoading, error } = useQuery({
        queryKey: ["agents"],
        queryFn: async () => {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/agents`, {
                headers: { Authorization: `Bearer ${session?.access_token}` },
            })
            if (!res.ok) throw new Error("Failed to fetch agents")
            return res.json() as Promise<Agent[]>
        },
    })

    if (isLoading) return <div>Loading agents...</div>
    if (error) return <div>Error loading agents</div>

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Agents</h1>
                <Button asChild>
                    <Link to="/agents/new">Create Agent</Link>
                </Button>
            </div>

            {agents?.length === 0 ? (
                <Card className="text-center py-12">
                    <CardHeader>
                        <CardTitle>No Agents Found</CardTitle>
                        <CardDescription>You haven't created any agents yet.</CardDescription>
                    </CardHeader>
                    <CardFooter className="justify-center">
                        <Button asChild>
                            <Link to="/agents/new">Create your first Agent</Link>
                        </Button>
                    </CardFooter>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {agents?.map((agent) => (
                        <Card key={agent.id}>
                            <CardHeader>
                                <CardTitle>{agent.name}</CardTitle>
                                <CardDescription>Status: {agent.status}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm text-gray-500">
                                    <span className="font-medium">Activation Code:</span> {agent.activationCode || "Linked"}
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button variant="outline" className="w-full">
                                    Manage
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
