import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export function QuestJoin({ questId, token }: { questId: string; token: string }) {
    const { session, isLoading, isAuthenticated } = useAuth()
    const [status, setStatus] = useState<'preview' | 'accepting' | 'success' | 'error'>('preview')
    const [errorMsg, setErrorMsg] = useState('')

    // Redirect to login if not authenticated (preserve invite URL)
    useEffect(() => {
        if (isLoading) return
        if (!isAuthenticated) {
            const currentUrl = window.location.pathname + window.location.search
            window.location.href = `/login?redirect=${encodeURIComponent(currentUrl)}`
        }
    }, [isLoading, isAuthenticated])

    // Fetch quest details for preview
    const { data: quest } = useQuery({
        queryKey: ['quest-preview', questId],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/quests/${questId}`)
            if (!res.ok) return null
            return res.json()
        },
        enabled: !!questId,
    })

    const handleAccept = async () => {
        setStatus('accepting')
        try {
            const res = await fetch(`${API_BASE}/quests/${questId}/collaborate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({ token }),
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.error?.message ?? 'Failed to accept invite')
            }
            setStatus('success')
        } catch (err: any) {
            setStatus('error')
            setErrorMsg(err.message)
        }
    }

    if (isLoading || !isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <p className="text-fg-muted text-sm">Loading...</p>
            </div>
        )
    }

    // Preview: show quest info + accept button
    if (status === 'preview') {
        const totalFunded = quest?.totalFunded ?? 0
        const rewardAmount = quest?.rewardAmount ?? 0
        const fundingPct = rewardAmount > 0 ? Math.min(100, (totalFunded / rewardAmount) * 100) : 0

        return (
            <div className="max-w-[480px] mx-auto py-12 px-4">
                <div className="bg-background border border-border rounded-lg p-6">
                    <p className="text-xs text-fg-muted mb-4">You've been invited as a partner for</p>

                    {quest ? (
                        <>
                            <h2 className="text-lg font-bold text-foreground m-0 mb-2">{quest.title}</h2>
                            {quest.description && (
                                <p className="text-sm text-fg-muted m-0 mb-4 line-clamp-3">{quest.description}</p>
                            )}

                            <div className="flex items-center gap-3 text-xs text-fg-muted mb-3">
                                <span>Reward: <strong className="text-foreground">{rewardAmount} {quest.rewardType}</strong></span>
                                <span>Type: <strong className="text-foreground">{quest.type}</strong></span>
                            </div>

                            {rewardAmount > 0 && (
                                <div className="space-y-1 mb-4">
                                    <div className="flex justify-between text-xs text-fg-muted">
                                        <span>Funding progress</span>
                                        <span>{totalFunded} / {rewardAmount} {quest.rewardType}</span>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary transition-all"
                                            style={{ width: `${fundingPct}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="py-4 text-center text-fg-muted text-sm">Loading quest details...</div>
                    )}

                    <Button className="w-full mt-2" onClick={handleAccept}>
                        Accept & Become Partner
                    </Button>
                </div>
            </div>
        )
    }

    // Accepting state
    if (status === 'accepting') {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <p className="text-fg-muted text-sm">Accepting invite...</p>
            </div>
        )
    }

    // Success: show CTAs
    if (status === 'success') {
        return (
            <div className="max-w-[480px] mx-auto py-12 px-4">
                <div className="bg-background border border-border rounded-lg p-6 text-center">
                    <div className="w-10 h-10 rounded-full bg-success/10 text-success inline-flex items-center justify-center text-lg font-bold mb-3">
                        ✓
                    </div>
                    <h3 className="text-base font-semibold text-foreground m-0 mb-1">You're now a partner!</h3>
                    <p className="text-sm text-fg-muted m-0 mb-5">
                        You can now edit and manage this quest.
                    </p>
                    <div className="flex gap-3 justify-center">
                        <Button variant="outline" asChild>
                            <a href={`/quests/${questId}`}>View Quest</a>
                        </Button>
                        <Button asChild>
                            <a href={`/quests/${questId}/fund`}>Fund Quest</a>
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    // Error state
    return (
        <div className="max-w-[480px] mx-auto py-12 px-4">
            <div className="bg-background border border-border rounded-lg p-6 text-center">
                <p className="text-destructive text-sm mb-4">{errorMsg}</p>
                <div className="flex gap-3 justify-center">
                    <Button variant="outline" asChild>
                        <a href={`/quests/${questId}`}>View Quest</a>
                    </Button>
                    <Button variant="outline" asChild>
                        <a href="/quests">Browse Quests</a>
                    </Button>
                </div>
            </div>
        </div>
    )
}
