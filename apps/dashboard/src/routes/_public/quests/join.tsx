import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export function QuestJoin({ questId, token }: { questId: string; token: string }) {
    const { session, isLoading, isAuthenticated } = useAuth()
    const [status, setStatus] = useState<'idle' | 'accepting' | 'success' | 'error'>('idle')
    const [errorMsg, setErrorMsg] = useState('')

    useEffect(() => {
        if (isLoading) return
        if (!isAuthenticated) {
            // Redirect to login, preserve current URL for post-auth redirect
            const currentUrl = window.location.pathname + window.location.search
            window.location.href = `/login?redirect=${encodeURIComponent(currentUrl)}`
            return
        }
        if (status !== 'idle') return

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
                setTimeout(() => {
                    window.location.href = `/quests/${questId}/fund`
                }, 1500)
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
            <div className="flex items-center justify-center min-h-[60vh]">
                <p className="text-foreground text-sm">You're now a co-sponsor. Redirecting to fund page...</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <p className="text-destructive text-sm">{errorMsg}</p>
            <Button variant="outline" asChild>
                <a href="/quests">Browse quests</a>
            </Button>
        </div>
    )
}
