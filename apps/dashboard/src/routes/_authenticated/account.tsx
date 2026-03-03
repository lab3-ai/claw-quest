import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/context/AuthContext"
import { startTelegramLogin } from "@/lib/telegram-oidc"
import { supabase } from "@/lib/supabase"
import "@/styles/pages/account.css"

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

interface Wallet {
    id: string
    address: string
    chainId: number | null
    isPrimary: boolean
    createdAt: string
}

interface UserProfile {
    id: string
    email: string
    username: string | null
    role: string
    telegramId: string | null
    telegramUsername: string | null
    xId: string | null
    xHandle: string | null
    discordId: string | null
    discordHandle: string | null
    createdAt: string
}

const CHAIN_NAMES: Record<number, string> = {
    1: "Ethereum",
    8453: "Base",
    84532: "Base Sepolia",
    10: "Optimism",
    42161: "Arbitrum",
}

function shortenAddress(addr: string) {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function formatDate(iso: string) {
    return new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" }).format(new Date(iso))
}

const providers = [
    { key: "google", label: "Google", icon: "G", supabaseProvider: "google" },
    { key: "github", label: "GitHub", icon: "GH", supabaseProvider: "github" },
    { key: "telegram", label: "Telegram", icon: "TG", supabaseProvider: null },
    { key: "twitter", label: "X (Twitter)", icon: "X", supabaseProvider: "twitter" },
    { key: "discord", label: "Discord", icon: "DC", supabaseProvider: "discord" },
]

export function Account() {
    const { session, user: supabaseUser } = useAuth()
    const queryClient = useQueryClient()
    const token = session?.access_token

    const [walletInput, setWalletInput] = useState("")
    const [walletError, setWalletError] = useState("")
    const [unlinkError, setUnlinkError] = useState("")
    const [unlinkPending, setUnlinkPending] = useState("")

    // Fetch profile from API
    const { data: profile, isLoading: profileLoading, isError: profileError } = useQuery<UserProfile>({
        queryKey: ["auth", "me"],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/auth/me`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) throw new Error("Failed to fetch profile")
            return res.json()
        },
        enabled: !!token,
    })

    // Fetch wallets
    const { data: wallets = [], isLoading: walletsLoading, isError: walletsError } = useQuery<Wallet[]>({
        queryKey: ["wallets"],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/wallets`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) throw new Error("Failed to fetch wallets")
            return res.json()
        },
        enabled: !!token,
    })

    // Link wallet mutation
    const linkWallet = useMutation({
        mutationFn: async (address: string) => {
            const res = await fetch(`${API_BASE}/wallets`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ address }),
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: "Failed to link wallet" }))
                throw new Error(err.message ?? "Failed to link wallet")
            }
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["wallets"] })
            setWalletInput("")
            setWalletError("")
        },
        onError: (err: Error) => {
            setWalletError(err.message)
        },
    })

    // OAuth identities from Supabase session
    const identities = supabaseUser?.identities ?? []
    const linkedProviders = new Set(identities.map(i => i.provider))

    async function handleLinkProvider(supabaseProvider: string) {
        // Store provider so callback.tsx can detect this is an identity-link flow
        localStorage.setItem("clawquest_linking_provider", supabaseProvider)
        await supabase.auth.linkIdentity({
            provider: supabaseProvider as any,
            options: { redirectTo: `${window.location.origin}/auth/callback` },
        })
    }

    async function handleUnlinkProvider(providerKey: string) {
        setUnlinkError("")

        // Lockout prevention: block if this is the only remaining sign-in method
        const nonTelegramIdentities = identities.filter(i => i.provider !== "telegram")
        const hasTelegram = !!profile?.telegramId
        if (!hasTelegram && nonTelegramIdentities.length <= 1) {
            setUnlinkError("Cannot unlink — this is your only sign-in method.")
            return
        }

        const identity = identities.find(i => i.provider === providerKey)
        if (!identity) return

        setUnlinkPending(providerKey)
        try {
            const { error } = await supabase.auth.unlinkIdentity(identity)
            if (error) throw error

            // Clear Prisma fields for Twitter/Discord only
            if (providerKey === "twitter" || providerKey === "discord") {
                const res = await fetch(`${API_BASE}/auth/social/${providerKey}`, {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token}` },
                })
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}))
                    throw new Error(body?.error?.message ?? "Failed to clear social profile data")
                }
            }

            queryClient.invalidateQueries({ queryKey: ["auth", "me"] })
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to unlink provider"
            setUnlinkError(msg)
        } finally {
            setUnlinkPending("")
        }
    }

    function handleLinkWallet(e: React.FormEvent) {
        e.preventDefault()
        setWalletError("")
        const addr = walletInput.trim()
        if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
            setWalletError("Invalid wallet address")
            return
        }
        linkWallet.mutate(addr)
    }

    return (
        <div className="account-page">
            <h1>Account</h1>

            {/* Profile */}
            <div className="account-section">
                <div className="account-section-header">Profile</div>
                <div className="account-section-body">
                    {profileLoading ? (
                        <>
                            <div className="account-row"><span className="skeleton" style={{ width: "100%", height: 16 }} /></div>
                            <div className="account-row"><span className="skeleton" style={{ width: "100%", height: 16 }} /></div>
                            <div className="account-row"><span className="skeleton" style={{ width: "60%", height: 16 }} /></div>
                        </>
                    ) : profileError ? (
                        <div className="account-error">
                            Failed to load profile.{" "}
                            <button className="btn btn-sm btn-secondary" onClick={() => queryClient.invalidateQueries({ queryKey: ["auth", "me"] })}>Retry</button>
                        </div>
                    ) : (
                        <>
                            <div className="account-row">
                                <span className="account-label">Email</span>
                                <span className="account-value">
                                    {profile?.email?.match(/^tg_\d+@tg\.clawquest\.ai$/)
                                        ? <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>No email linked</span>
                                        : (profile?.email ?? supabaseUser?.email ?? "—")}
                                </span>
                            </div>
                            <div className="account-row">
                                <span className="account-label">Username</span>
                                <span className="account-value">{profile?.username ?? "—"}</span>
                            </div>
                            <div className="account-row">
                                <span className="account-label">Member since</span>
                                <span className="account-value">
                                    {profile?.createdAt ? formatDate(profile.createdAt) : "—"}
                                </span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Connected Accounts */}
            <div className="account-section">
                <div className="account-section-header">Connected Accounts</div>
                <div className="account-section-body">
                    {providers.map(p => {
                        const identity = identities.find(i => i.provider === p.key)
                        const isLinked = linkedProviders.has(p.key)
                        const isTelegram = p.key === "telegram"
                        const telegramLinked = isTelegram && !!profile?.telegramId

                        // Build handle/email detail text
                        let detail = ""
                        if (p.key === "twitter" && profile?.xHandle) detail = `@${profile.xHandle}`
                        else if (p.key === "discord" && profile?.discordHandle) detail = `@${profile.discordHandle}`
                        else if (identity?.identity_data?.email) detail = identity.identity_data.email as string
                        else if (identity?.identity_data?.user_name) detail = identity.identity_data.user_name as string

                        return (
                            <div key={p.key} className="account-provider" style={{ minWidth: 0 }}>
                                <span className="account-provider-icon">{p.icon}</span>
                                <span className="account-provider-name">{p.label}</span>

                                {isTelegram ? (
                                    telegramLinked ? (
                                        <>
                                            <span className="account-provider-status-linked">Connected</span>
                                            <span className="account-provider-detail">
                                                {profile?.telegramUsername ? `@${profile.telegramUsername}` : ""}
                                            </span>
                                        </>
                                    ) : (
                                        <button
                                            className="btn btn-sm btn-outline"
                                            style={{ marginLeft: "auto", fontSize: "12px", padding: "4px 10px" }}
                                            onClick={() => startTelegramLogin("link")}
                                        >
                                            Link
                                        </button>
                                    )
                                ) : isLinked ? (
                                    <>
                                        <span className="account-provider-status-linked">Connected</span>
                                        {detail && <span className="account-provider-detail">{detail}</span>}
                                        <button
                                            className="btn btn-sm btn-outline"
                                            style={{ marginLeft: "8px", fontSize: "12px", padding: "4px 10px" }}
                                            disabled={unlinkPending === p.key}
                                            onClick={() => handleUnlinkProvider(p.key)}
                                        >
                                            {unlinkPending === p.key ? "Unlinking…" : "Unlink"}
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        className="btn btn-sm btn-outline"
                                        style={{ marginLeft: "auto", fontSize: "12px", padding: "4px 10px" }}
                                        onClick={() => handleLinkProvider(p.supabaseProvider!)}
                                    >
                                        Link
                                    </button>
                                )}
                            </div>
                        )
                    })}

                    {unlinkError && (
                        <div className="account-error" style={{ marginTop: "8px" }}>{unlinkError}</div>
                    )}
                </div>
            </div>

            {/* Wallets */}
            <div className="account-section">
                <div className="account-section-header">Wallets</div>
                <div className="account-section-body">
                    {walletsLoading ? (
                        <div className="account-row"><span className="skeleton" style={{ width: "100%", height: 16 }} /></div>
                    ) : walletsError ? (
                        <div className="account-error">
                            Failed to load wallets.{" "}
                            <button className="btn btn-sm btn-secondary" onClick={() => queryClient.invalidateQueries({ queryKey: ["wallets"] })}>Retry</button>
                        </div>
                    ) : wallets.length === 0 ? (
                        <div className="account-wallet-empty">No wallets linked yet.</div>
                    ) : (
                        wallets.map(w => (
                            <div key={w.id} className="account-wallet">
                                <span className="account-wallet-address">{shortenAddress(w.address)}</span>
                                {w.chainId && (
                                    <span className="account-wallet-chain">
                                        {CHAIN_NAMES[w.chainId] ?? `Chain ${w.chainId}`}
                                    </span>
                                )}
                                {w.isPrimary && <span className="account-wallet-primary">Primary</span>}
                            </div>
                        ))
                    )}
                    <form className="account-wallet-form" onSubmit={handleLinkWallet}>
                        <label htmlFor="wallet-address" className="sr-only">Wallet address</label>
                        <input
                            id="wallet-address"
                            name="wallet-address"
                            type="text"
                            placeholder="0x..."
                            autoComplete="off"
                            value={walletInput}
                            onChange={e => setWalletInput(e.target.value)}
                        />
                        <button type="submit" className="btn btn-sm" disabled={linkWallet.isPending}>
                            {linkWallet.isPending ? "Linking\u2026" : "+ Link wallet"}
                        </button>
                    </form>
                    {walletError && <div className="account-wallet-error">{walletError}</div>}
                </div>
            </div>
        </div>
    )
}
