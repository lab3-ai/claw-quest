import { useQuery, useMutation } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import '@/styles/pages/stripe-connect.css'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export function StripeConnect() {
    const { session } = useAuth()
    const token = session?.access_token

    // ── Check onboarding status ─────────────────────────────────────────────
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

    // ── Start onboarding ────────────────────────────────────────────────────
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

    // ── Open Stripe dashboard ───────────────────────────────────────────────
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
            <div className="stripe-connect-page">
                <div className="stripe-connect-card">
                    <div className="stripe-connect-loading">Loading...</div>
                </div>
            </div>
        )
    }

    return (
        <div className="stripe-connect-page">
            <div className="stripe-connect-card">
                <div className="stripe-connect-header">
                    <div className="stripe-connect-logo">S</div>
                    <div>
                        <h2>Stripe Payout Account</h2>
                        <p className="stripe-connect-subtitle">
                            Connect your Stripe account to receive fiat rewards from quests.
                        </p>
                    </div>
                </div>

                {/* Status indicator */}
                <div className="stripe-connect-status">
                    <div className={`stripe-status-dot ${status?.isOnboarded ? 'active' : status?.hasAccount ? 'pending' : 'inactive'}`} />
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
                    <p className="stripe-connect-error">{(onboardMutation.error as Error).message}</p>
                )}

                {/* Actions */}
                <div className="stripe-connect-actions">
                    {!status?.isOnboarded && (
                        <button
                            className="btn btn-stripe"
                            disabled={onboardMutation.isPending}
                            onClick={() => onboardMutation.mutate()}
                        >
                            {onboardMutation.isPending
                                ? 'Redirecting…'
                                : status?.hasAccount
                                    ? 'Complete Onboarding →'
                                    : 'Connect Stripe Account →'}
                        </button>
                    )}

                    {status?.isOnboarded && (
                        <button
                            className="btn btn-secondary"
                            disabled={dashboardMutation.isPending}
                            onClick={() => dashboardMutation.mutate()}
                        >
                            {dashboardMutation.isPending ? 'Opening…' : 'Open Stripe Dashboard'}
                        </button>
                    )}
                </div>

                {/* Info */}
                <div className="stripe-connect-info">
                    <h4>How it works</h4>
                    <p>
                        When you win a fiat-funded quest, the reward is automatically transferred
                        to your Stripe account. From there, Stripe pays out to your bank account
                        on a rolling basis (typically 2-7 business days).
                    </p>
                    <p>
                        Stripe handles identity verification and tax compliance. Your information
                        is securely managed by Stripe — ClawQuest never sees your bank details.
                    </p>
                </div>
            </div>
        </div>
    )
}
