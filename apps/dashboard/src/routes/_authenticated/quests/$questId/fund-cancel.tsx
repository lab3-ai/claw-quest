import { useParams, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export function FundCancel() {
    const { questId } = useParams({ strict: false }) as { questId: string }
    const { session } = useAuth()

    const token = session?.access_token

    const { data: quest } = useQuery({
        queryKey: ['quest', questId],
        queryFn: async () => {
            const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
            const res = await fetch(`${API_BASE}/quests/${questId}`, { headers })
            if (!res.ok) throw new Error('Quest not found')
            return res.json()
        },
        enabled: !!questId,
    })

    return (
        <div className="max-w-[560px] mx-auto py-8 px-4">
            <nav className="flex items-center gap-1 text-xs text-fg-muted mb-4">
                <Link to="/quests" className="hover:text-foreground transition-colors">Quests</Link>
                <span className="text-fg-muted">/</span>
                <Link to="/quests/$questId" params={{ questId }} className="hover:text-foreground transition-colors">
                    {quest?.title || 'Quest'}
                </Link>
                <span className="text-fg-muted">/</span>
                <span className="text-foreground">Payment</span>
            </nav>

            <div className="bg-background border border-border rounded-lg p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-warning text-white inline-flex items-center justify-center text-3xl font-bold mb-4">
                    ⚠
                </div>
                <h2 className="text-xl font-bold text-foreground m-0 mb-2">Payment Cancelled</h2>
                <p className="text-sm text-fg-muted m-0 mb-6">
                    You cancelled the payment process. No charges were made to your card.
                </p>
                <div className="flex gap-3 justify-center">
                    <Button asChild>
                        <Link to="/quests/$questId/fund" params={{ questId }}>Try Again</Link>
                    </Button>
                    <Button asChild variant="outline">
                        <Link to="/quests/$questId" params={{ questId }}>Back to Quest</Link>
                    </Button>
                </div>
            </div>
        </div>
    )
}
