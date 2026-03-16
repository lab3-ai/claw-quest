import { useEffect, useState } from 'react'
import { useParams, Link, useSearch } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from "@/components/breadcrumb"

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export function FundSuccess() {
    const { questId } = useParams({ strict: false }) as { questId: string }
    const { session } = useAuth()
    const search = useSearch({ strict: false }) as { session_id?: string }
    const [status, setStatus] = useState<'verifying' | 'success' | 'pending' | 'error' | 'coming_soon'>('verifying')

    const token = session?.access_token

    // Verify session status if session_id provided (for display only, not for confirmation)
    const { data: sessionData } = useQuery({
        queryKey: ['stripe-session', search.session_id],
        queryFn: async () => {
            if (!search.session_id) return null
            const res = await fetch(`${API_BASE}/stripe/checkout/session/${search.session_id}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (res.status === 400) {
                const body = await res.json().catch(() => ({}))
                if (body?.message === 'Coming Soon') return { comingSoon: true } as const
            }
            if (!res.ok) throw new Error('Failed to verify session')
            return res.json()
        },
        enabled: !!search.session_id && !!token,
        retry: 2,
    })

    // Poll quest status - only webhook can update fundingStatus to 'confirmed'
    const { data: quest } = useQuery({
        queryKey: ['quest', questId],
        queryFn: async () => {
            const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
            const res = await fetch(`${API_BASE}/quests/${questId}`, { headers })
            if (!res.ok) throw new Error('Quest not found')
            return res.json()
        },
        enabled: !!questId,
        refetchInterval: (query) => {
            const data = query.state.data as any
            // Keep polling if funding is pending - wait for webhook to confirm
            return data?.fundingStatus === 'pending' ? 5000 : false
        },
    })

    // Coming Soon: Stripe endpoints return 400
    const isComingSoon = sessionData && 'comingSoon' in sessionData && sessionData.comingSoon === true

    // Update status based on quest data only (webhook-confirmed status)
    useEffect(() => {
        if (isComingSoon) {
            setStatus('coming_soon')
            return
        }
        if (quest) {
            if (quest.fundingStatus === 'confirmed' || quest.status === 'live' || quest.status === 'scheduled') {
                setStatus('success')
            } else if (quest.fundingStatus === 'pending') {
                setStatus('pending')
            } else {
                setStatus('error')
            }
        } else {
            setStatus('verifying')
        }
    }, [quest, isComingSoon])

    return (
        <div className="max-w-xl mx-auto py-8 px-4">
            <div className="mb-4">
                <Breadcrumb items={[
                    { label: "Quests", to: "/quests" },
                    { label: quest?.title || "Quest", to: "/quests/$questId", params: { questId } },
                    { label: "Payment" },
                ]} />
            </div>

            <div className="bg-background border border-border rounded-lg p-8 text-center">
                {status === 'verifying' && (
                    <>
                        <div
                            className="w-12 h-12 rounded-full border-[3px] border-border border-t-[#635bff] animate-spin mx-auto mb-4"
                            style={{ borderTopColor: '#635bff' }}
                        />
                        <h2 className="text-xl font-semibold text-foreground m-0 mb-2">Verifying Payment</h2>
                        <p className="text-sm text-fg-3 m-0">
                            Please wait while we confirm your payment...
                        </p>
                    </>
                )}

                {status === 'pending' && (
                    <>
                        <div
                            className="w-12 h-12 rounded-full border-[3px] border-border border-t-[#635bff] animate-spin mx-auto mb-4"
                            style={{ borderTopColor: '#635bff' }}
                        />
                        <h2 className="text-xl font-semibold text-foreground m-0 mb-2">Waiting for Payment Confirmation</h2>
                        <p className="text-sm text-fg-3 m-0 mb-4">
                            Your payment has been received and is being processed by our payment provider.
                        </p>
                        <p className="text-xs text-fg-3 m-0 mb-4">
                            This page will automatically update once your payment is confirmed. This usually takes a few seconds.
                        </p>
                        {sessionData?.paid && (
                            <p className="text-xs text-fg-3 m-0">
                                ✓ Payment received - waiting for final confirmation...
                            </p>
                        )}
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="w-16 h-16 rounded-full bg-success text-white inline-flex items-center justify-center text-3xl font-semibold mb-4">
                            ✓
                        </div>
                        <h2 className="text-xl font-semibold text-foreground m-0 mb-2">Payment Successful!</h2>
                        <p className="text-sm text-fg-3 m-0 mb-6">
                            Your quest has been funded successfully and is now {quest?.status === 'scheduled' ? 'scheduled' : 'live'}.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <Button asChild>
                                <Link to="/quests/$questId" params={{ questId }}>View Quest</Link>
                            </Button>
                            <Button asChild variant="outline">
                                <Link to="/dashboard">Go to Dashboard</Link>
                            </Button>
                        </div>
                    </>
                )}

                {status === 'coming_soon' && (
                    <>
                        <div className="w-16 h-16 rounded-full bg-muted inline-flex items-center justify-center text-3xl font-semibold mb-4 text-muted-foreground">
                            🚧
                        </div>
                        <h2 className="text-xl font-semibold text-foreground m-0 mb-2">Stripe Payments Coming Soon</h2>
                        <p className="text-sm text-fg-3 m-0 mb-6">
                            Stripe payments are temporarily unavailable. Please check back later.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <Button asChild>
                                <Link to="/quests/$questId" params={{ questId }}>Back to Quest</Link>
                            </Button>
                            <Button asChild variant="outline">
                                <Link to="/quests">Browse Quests</Link>
                            </Button>
                        </div>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="w-16 h-16 rounded-full bg-error text-white inline-flex items-center justify-center text-3xl font-semibold mb-4">
                            ✕
                        </div>
                        <h2 className="text-xl font-semibold text-foreground m-0 mb-2">Payment Not Confirmed</h2>
                        <p className="text-sm text-fg-3 m-0 mb-6">
                            We couldn't confirm your payment. This might be because:
                        </p>
                        <ul className="text-sm text-fg-3 text-left mb-6 space-y-2 max-w-md mx-auto">
                            <li>• The payment is still processing (please wait a moment)</li>
                            <li>• The payment was cancelled</li>
                            <li>• There was an issue with the payment</li>
                        </ul>
                        <div className="flex gap-3 justify-center">
                            <Button asChild>
                                <Link to="/quests/$questId/fund" params={{ questId }}>Try Again</Link>
                            </Button>
                            <Button asChild variant="outline">
                                <Link to="/quests/$questId" params={{ questId }}>Back to Quest</Link>
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
