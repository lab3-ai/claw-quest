import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export function QuestJoin({ questId, token }: { questId: string; token: string }) {
    const { session, isLoading, isAuthenticated } = useAuth()
    const [status, setStatus] = useState<'idle' | 'accepting' | 'success' | 'error'>('idle')
    const [errorMsg, setErrorMsg] = useState('')

    // Fetch quest details for the success screen
    const { data: quest } = useQuery({
        queryKey: ['quest-join', questId],
        queryFn: async () => {
            const headers: Record<string, string> = session?.access_token
                ? { Authorization: `Bearer ${session.access_token}` }
                : {}
            const res = await fetch(`${API_BASE}/quests/${questId}`, { headers })
            if (!res.ok) return null
            return res.json()
        },
        enabled: status === 'success' && !!session?.access_token,
    })

    useEffect(() => {
        if (isLoading) return
        if (!isAuthenticated) {
            const currentUrl = window.location.pathname + window.location.search
            window.location.href = `/login?redirect=${encodeURIComponent(currentUrl)}`
            return
        }
        if (status !== 'idle') return

        // Auto-accept invite on page load
        setStatus('accepting')
        fetch(`${API_BASE}/quests/${questId}/collaborate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({ token }),
        })
            .then(async (res) => {
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}))
                    throw new Error(err.error?.message ?? 'Failed to accept invite')
                }
                setStatus('success')
            })
            .catch((err) => {
                setStatus('error')
                setErrorMsg(err.message)
            })
    }, [isAuthenticated, isLoading, status, questId, token, session?.access_token])

    if (isLoading || status === 'idle' || status === 'accepting') {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <p className="text-fg-muted text-sm">Accepting invite...</p>
            </div>
        )
    }

    if (status === 'success') {
        return (
            <div className="max-w-[480px] mx-auto py-16 px-4 text-center">
                <div className="w-10 h-10 rounded-full bg-success/10 text-success inline-flex items-center justify-center text-lg font-bold mb-3">
                    ✓
                </div>
                <h3 className="text-base font-semibold text-foreground m-0 mb-2">
                    You've been invited as a partner!
                </h3>

                {quest && (
                    <div className="bg-muted/50 border border-border rounded-lg p-4 mb-4 text-left">
                        <p className="text-sm font-semibold text-foreground m-0 mb-1">{quest.title}</p>
                        {quest.description && (
                            <p className="text-xs text-fg-muted m-0 line-clamp-2">{quest.description}</p>
                        )}
                    </div>
                )}

                <p className="text-sm text-fg-muted m-0 mb-5">
                    This quest is now available in your Dashboard.
                </p>
                <Button asChild>
                    <a href="/dashboard">Go to Dashboard</a>
                </Button>
            </div>
        )
    }

    return (
        <div className="max-w-[420px] mx-auto py-16 px-4 text-center">
            <p className="text-destructive text-sm mb-4">{errorMsg}</p>
            <Button variant="outline" asChild>
                <a href="/dashboard">Go to Dashboard</a>
            </Button>
        </div>
    )
}
