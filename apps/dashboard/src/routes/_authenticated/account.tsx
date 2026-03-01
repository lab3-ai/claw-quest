import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/context/AuthContext"
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

export function Account() {
    const { session, user: supabaseUser } = useAuth()
    const queryClient = useQueryClient()
    const token = session?.access_token

    const [walletInput, setWalletInput] = useState("")
    const [walletError, setWalletError] = useState("")

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

    const providers = [
        { key: "google", label: "Google", icon: "G" },
        { key: "github", label: "GitHub", icon: "GH" },
        { key: "telegram", label: "Telegram", icon: "TG" },
        { key: "twitter", label: "X (Twitter)", icon: "X" },
        { key: "discord", label: "Discord", icon: "DC" },
    ]

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
                                <span className="account-value">{profile?.email ?? supabaseUser?.email ?? "—"}</span>
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
                        const isPlaceholder = p.key === "telegram" || p.key === "twitter" || p.key === "discord"

                        return (
                            <div key={p.key} className="account-provider" style={{ minWidth: 0 }}>
                                <span className="account-provider-icon">{p.icon}</span>
                                <span className="account-provider-name">{p.label}</span>
                                {isLinked ? (
                                    <>
                                        <span className="account-provider-status-linked">Connected</span>
                                        <span className="account-provider-detail">
                                            {identity?.identity_data?.email ?? ""}
                                        </span>
                                    </>
                                ) : isPlaceholder ? (
                                    <span className="account-provider-status-placeholder">Coming soon</span>
                                ) : (
                                    <span className="account-provider-status-placeholder">Not linked</span>
                                )}
                            </div>
                        )
                    })}
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
