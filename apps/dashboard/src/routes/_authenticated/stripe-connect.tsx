import { useQuery, useMutation } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export function StripeConnect() {
    const { session } = useAuth()
    const token = session?.access_token

    const { data: status, isLoading } = useQuery<{
        hasAccount: boolean
        isOnboarded: boolean
        accountId: string | null
    }>({
        queryKey: ['stripe-connect-status'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/stripe/connect/status`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) throw new Error('Failed to check status')
            return res.json()
        },
        enabled: !!token,
    })

    const onboardMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`${API_BASE}/stripe/connect/onboard`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    returnUrl: window.location.href,
                    refreshUrl: window.location.href,
                }),
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.message || 'Failed to start onboarding')
            }
            return res.json()
        },
        onSuccess: (data: { onboardingUrl: string }) => {
            window.location.href = data.onboardingUrl
        },
    })

    const dashboardMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`${API_BASE}/stripe/connect/dashboard`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) throw new Error('Failed to get dashboard link')
            return res.json()
        },
        onSuccess: (data: { dashboardUrl: string }) => {
            window.open(data.dashboardUrl, '_blank')
        },
    })

    if (isLoading) {
        return (
            <div className="max-w-xl mx-auto py-8 px-4">
                <div className="bg-background border border-border rounded-lg p-8">
                    <div className="text-center text-muted-foreground py-12">Loading...</div>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-xl mx-auto py-8 px-4">
            <div className="bg-background border border-border rounded-lg p-8">
                {/* Header */}
                <div className="flex gap-4 items-start mb-6">
                    <div className="w-10 h-10 rounded-lg bg-(--stripe-fg) text-white flex items-center justify-center font-bold text-lg shrink-0">S</div>
                    <div>
                        <h2 className="text-xl font-bold text-foreground">Stripe Payout Account</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Connect your Stripe account to receive fiat rewards from quests.
                        </p>
                    </div>
                </div>

                {/* Status indicator */}
                <div className="flex items-center gap-2 px-4 py-3 rounded-md bg-bg-subtle border border-border text-sm text-foreground mb-6">
                    <div className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        status?.isOnboarded ? "bg-success"
                            : status?.hasAccount ? "bg-warning"
                                : "bg-border-heavy"
                    )} />
                    <span>
                        {status?.isOnboarded
                            ? 'Account connected and ready to receive payouts'
                            : status?.hasAccount
                                ? 'Account created — onboarding incomplete'
                                : 'No account connected yet'}
                    </span>
                </div>

                {/* Error */}
                {onboardMutation.isError && (
                    <p className="text-error text-xs mb-4">{(onboardMutation.error as Error).message}</p>
                )}

                {/* Actions */}
                <div className="flex gap-2 mb-6">
                    {!status?.isOnboarded && (
                        <Button
                            className="bg-(--stripe-fg) hover:bg-(--stripe-fg)/90 text-white"
                            disabled={onboardMutation.isPending}
                            onClick={() => onboardMutation.mutate()}
                        >
                            {onboardMutation.isPending
                                ? 'Redirecting…'
                                : status?.hasAccount
                                    ? 'Complete Onboarding →'
                                    : 'Connect Stripe Account →'}
                        </Button>
                    )}

                    {status?.isOnboarded && (
                        <Button
                            variant="secondary"
                            disabled={dashboardMutation.isPending}
                            onClick={() => dashboardMutation.mutate()}
                        >
                            {dashboardMutation.isPending ? 'Opening…' : 'Open Stripe Dashboard'}
                        </Button>
                    )}
                </div>

                {/* Info */}
                <div className="pt-5 border-t border-border">
                    <h4 className="text-sm font-semibold text-foreground mb-2">How it works</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                        When you win a fiat-funded quest, the reward is automatically transferred
                        to your Stripe account. From there, Stripe pays out to your bank account
                        on a rolling basis (typically 2-7 business days).
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        Stripe handles identity verification and tax compliance. Your information
                        is securely managed by Stripe — ClawQuest never sees your bank details.
                    </p>
                </div>
            </div>
        </div>
    )
}
