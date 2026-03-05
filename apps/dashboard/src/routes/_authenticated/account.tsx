import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/context/AuthContext"
import { startTelegramLogin } from "@/lib/telegram-oidc"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { PageTitle } from "@/components/page-title"
import { Input } from "@/components/ui/input"

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
    displayName: string | null
    role: string
    telegramId: string | null
    telegramUsername: string | null
    xId: string | null
    xHandle: string | null
    hasXToken: boolean
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

// Providers available for social linking on account page
const LINK_PROVIDERS = [
    { key: "google", label: "Google", icon: "G", supabaseProvider: "google" },
    { key: "telegram", label: "Telegram", icon: "TG", supabaseProvider: null },
    { key: "twitter", label: "X (Twitter)", icon: "X", supabaseProvider: "twitter" },
    { key: "discord", label: "Discord", icon: "DC", supabaseProvider: "discord" },
]

// Map for displaying legacy connected identities not in LINK_PROVIDERS
const PROVIDER_LABELS: Record<string, { label: string; icon: string }> = {
    google: { label: "Google", icon: "G" },
    github: { label: "GitHub", icon: "GH" },
    telegram: { label: "Telegram", icon: "TG" },
    twitter: { label: "X (Twitter)", icon: "X" },
    discord: { label: "Discord", icon: "DC" },
}

export function Account() {
    const { session, user: supabaseUser } = useAuth()
    const queryClient = useQueryClient()
    const token = session?.access_token

    const [walletInput, setWalletInput] = useState("")
    const [walletError, setWalletError] = useState("")
    const [walletActionPending, setWalletActionPending] = useState("") // wallet id being acted on
    const [unlinkError, setUnlinkError] = useState("")
    const [linkError, setLinkError] = useState("")
    const [unlinkPending, setUnlinkPending] = useState("")
    const [linkPending, setLinkPending] = useState("")
    const [xAuthPending, setXAuthPending] = useState(false)

    // Profile editing state
    const [editingField, setEditingField] = useState<"displayName" | "username" | null>(null)
    const [editValue, setEditValue] = useState("")
    const [editError, setEditError] = useState("")

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

    // Remove wallet mutation
    const removeWallet = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`${API_BASE}/wallets/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.error?.message ?? "Failed to remove wallet")
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["wallets"] })
            setWalletError("")
        },
        onError: (err: Error) => setWalletError(err.message),
        onSettled: () => setWalletActionPending(""),
    })

    // Set primary wallet mutation
    const setPrimaryWallet = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`${API_BASE}/wallets/${id}/primary`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.error?.message ?? "Failed to set primary wallet")
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["wallets"] })
            setWalletError("")
        },
        onError: (err: Error) => setWalletError(err.message),
        onSettled: () => setWalletActionPending(""),
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

    // Update profile mutation
    const updateProfile = useMutation({
        mutationFn: async (data: { displayName?: string; username?: string }) => {
            const res = await fetch(`${API_BASE}/auth/me`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(data),
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: { message: "Failed to update profile" } }))
                throw new Error(err.error?.message ?? "Failed to update profile")
            }
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["auth", "me"] })
            setEditingField(null)
            setEditValue("")
            setEditError("")
        },
        onError: (err: Error) => {
            setEditError(err.message)
        },
    })

    function startEdit(field: "displayName" | "username") {
        setEditingField(field)
        setEditError("")
        setEditValue(field === "displayName" ? (profile?.displayName ?? "") : (profile?.username ?? ""))
    }

    function handleSaveEdit() {
        if (!editingField) return
        const value = editValue.trim()
        if (editingField === "username" && value && !/^[a-z0-9][a-z0-9_-]{1,18}[a-z0-9]$/.test(value)) {
            setEditError("3-20 chars: lowercase letters, numbers, hyphens")
            return
        }
        updateProfile.mutate({ [editingField]: value || (editingField === "displayName" ? "" : undefined) })
    }

    // OAuth identities from Supabase session
    const identities = supabaseUser?.identities ?? []
    const linkedProviders = new Set(identities.map(i => i.provider))

    // Find connected identities not in LINK_PROVIDERS (e.g. GitHub after disabling)
    const linkProviderKeys = new Set(LINK_PROVIDERS.map(p => p.key))
    const legacyIdentities = identities.filter(i => !linkProviderKeys.has(i.provider))

    async function handleLinkProvider(supabaseProvider: string) {
        setLinkError("")
        setUnlinkError("")
        setLinkPending(supabaseProvider)
        try {
            // Store provider so callback.tsx can detect this is an identity-link flow
            localStorage.setItem("clawquest_linking_provider", supabaseProvider)
            const { error } = await supabase.auth.linkIdentity({
                provider: supabaseProvider as any,
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                    // Request extra Discord scopes for role verification (guilds.members.read)
                    ...(supabaseProvider === "discord" && {
                        scopes: "identify email guilds guilds.members.read",
                    }),
                },
            })
            if (error) throw error
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to link provider"
            setLinkError(msg)
        } finally {
            setLinkPending("")
        }
    }

    async function handleUnlinkProvider(providerKey: string) {
        setUnlinkError("")
        setLinkError("")

        // Lockout prevention: need at least 1 identity remaining after unlink
        const totalIdentities = identities.length
        const hasTelegram = !!profile?.telegramId
        if (!hasTelegram && totalIdentities <= 1) {
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

    async function handleUnlinkTelegram() {
        setUnlinkError("")
        setLinkError("")

        // Lockout prevention: block if Telegram is the only sign-in method
        const nonTelegramIdentities = identities.filter(i => i.provider !== "telegram")
        if (nonTelegramIdentities.length === 0) {
            setUnlinkError("Cannot unlink — this is your only sign-in method.")
            return
        }

        setUnlinkPending("telegram")
        try {
            const res = await fetch(`${API_BASE}/auth/social/telegram`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) {
                const body = await res.json().catch(() => ({}))
                throw new Error(body?.error?.message ?? "Failed to unlink Telegram")
            }
            queryClient.invalidateQueries({ queryKey: ["auth", "me"] })
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to unlink Telegram"
            setUnlinkError(msg)
        } finally {
            setUnlinkPending("")
        }
    }

    async function handleXReadAccess() {
        setXAuthPending(true)
        try {
            const res = await fetch(`${API_BASE}/auth/x/authorize`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.error?.message ?? "Failed to get X authorize URL")
            }
            const { url, state, codeVerifier } = await res.json()
            localStorage.setItem("x_code_verifier", codeVerifier)
            localStorage.setItem("x_oauth_state", state)
            window.location.href = url
        } catch (err: unknown) {
            setLinkError(err instanceof Error ? err.message : "Failed to authorize X")
            setXAuthPending(false)
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
        <div className="">
            <div className="mb-6"><PageTitle title="Account" /></div>

            {/* Profile */}
            <div className="border border-border rounded mb-5 bg-background">
                <div className="text-sm font-semibold px-4 py-2.5 border-b border-border bg-muted text-foreground">Profile</div>
                <div className="p-4">
                    {profileLoading ? (
                        <>
                            <div className="flex items-baseline py-1.5 text-sm"><span className="skeleton" style={{ width: "100%", height: 16 }} /></div>
                            <div className="flex items-baseline py-1.5 text-sm border-t border-border pt-2 mt-0.5"><span className="skeleton" style={{ width: "100%", height: 16 }} /></div>
                            <div className="flex items-baseline py-1.5 text-sm border-t border-border pt-2 mt-0.5"><span className="skeleton" style={{ width: "60%", height: 16 }} /></div>
                        </>
                    ) : profileError ? (
                        <div className="text-xs text-destructive py-3 flex items-center gap-2">
                            Failed to load profile.{" "}
                            <Button variant="secondary" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["auth", "me"] })}>Retry</Button>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-baseline py-1.5 text-sm justify-between">
                                <span className="w-[120px] shrink-0 font-semibold text-muted-foreground text-xs">Display Name</span>
                                <span className="text-foreground">
                                    {editingField === "displayName" ? (
                                        <span className="flex gap-1.5 items-center">
                                            <input
                                                type="text"
                                                value={editValue}
                                                onChange={e => setEditValue(e.target.value)}
                                                maxLength={50}
                                                placeholder="Your display name"
                                                className="text-base px-2 py-0.5 w-[180px] border border-input rounded bg-background text-foreground outline-hidden focus:border-accent"
                                                autoFocus
                                                onKeyDown={e => { if (e.key === "Enter") handleSaveEdit(); if (e.key === "Escape") setEditingField(null) }}
                                            />
                                            <Button size="sm" onClick={handleSaveEdit} disabled={updateProfile.isPending}>
                                                {updateProfile.isPending ? "…" : "Save"}
                                            </Button>
                                            <Button variant="secondary" size="sm" onClick={() => setEditingField(null)}>Cancel</Button>
                                        </span>
                                    ) : (
                                        <span className="flex gap-2 items-center">
                                            {profile?.displayName || <span className="text-muted-foreground italic">Not set</span>}
                                            <Button variant="outline" size="sm" className="text-xs px-2 py-0.5" onClick={() => startEdit("displayName")}>Edit</Button>
                                        </span>
                                    )}
                                </span>
                            </div>
                            <div className="flex items-baseline py-1.5 text-sm border-t border-border pt-2 mt-0.5 justify-between">
                                <span className="w-[120px] shrink-0 font-semibold text-muted-foreground text-xs">Username</span>
                                <span className="text-foreground">
                                    {editingField === "username" ? (
                                        <span className="flex gap-1.5 items-center flex-wrap justify-end">
                                            <input
                                                type="text"
                                                value={editValue}
                                                onChange={e => setEditValue(e.target.value.toLowerCase())}
                                                maxLength={20}
                                                placeholder="username"
                                                className="text-base px-2 py-0.5 w-[180px] border border-input rounded bg-background text-foreground outline-hidden focus:border-accent"
                                                autoFocus
                                                onKeyDown={e => { if (e.key === "Enter") handleSaveEdit(); if (e.key === "Escape") setEditingField(null) }}
                                            />
                                            <Button size="sm" onClick={handleSaveEdit} disabled={updateProfile.isPending}>
                                                {updateProfile.isPending ? "…" : "Save"}
                                            </Button>
                                            <Button variant="secondary" size="sm" onClick={() => setEditingField(null)}>Cancel</Button>
                                            <span className="text-xs text-muted-foreground w-full text-right">3-20 chars, lowercase letters, numbers, hyphens</span>
                                        </span>
                                    ) : (
                                        <span className="flex gap-2 items-center">
                                            {profile?.username ? `@${profile.username}` : <span className="text-muted-foreground italic">Not set</span>}
                                            <Button variant="outline" size="sm" className="text-xs px-2 py-0.5" onClick={() => startEdit("username")}>Edit</Button>
                                        </span>
                                    )}
                                </span>
                            </div>
                            {editError && <div className="text-xs text-destructive py-3 flex items-center gap-2 mt-1">{editError}</div>}
                            <div className="flex items-baseline py-1.5 text-sm border-t border-border pt-2 mt-0.5 justify-between">
                                <span className="w-[120px] shrink-0 font-semibold text-muted-foreground text-xs">Email</span>
                                <span className="text-foreground">
                                    {profile?.email?.match(/^tg_\d+@tg\.clawquest\.ai$/)
                                        ? <span className="text-muted-foreground italic">No email linked</span>
                                        : (profile?.email ?? supabaseUser?.email ?? "—")}
                                </span>
                            </div>
                            <div className="flex items-baseline py-1.5 text-sm border-t border-border pt-2 mt-0.5 justify-between">
                                <span className="w-[120px] shrink-0 font-semibold text-muted-foreground text-xs">Member since</span>
                                <span className="text-foreground">
                                    {profile?.createdAt ? formatDate(profile.createdAt) : "—"}
                                </span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Connected Accounts */}
            <div className="border border-border rounded mb-5 bg-background">
                <div className="text-sm font-semibold px-4 py-2.5 border-b border-border bg-muted text-foreground">Connected Accounts</div>
                <div className="p-4">
                    {LINK_PROVIDERS.map((p, idx) => {
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
                            <div key={p.key} className={`flex items-center gap-2.5 py-2 text-sm min-w-0${idx > 0 ? " border-t border-border" : ""}`}>
                                <span className="w-5 text-center text-sm shrink-0">{p.icon}</span>
                                <span className="font-semibold min-w-[90px]">{p.label}</span>

                                {isTelegram ? (
                                    telegramLinked ? (
                                        <>
                                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                                <span className="text-success text-xs font-semibold">Connected</span>
                                                <span className="text-muted-foreground text-xs">
                                                    {profile?.telegramUsername ? `@${profile.telegramUsername}` : ""}
                                                </span>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-[12px] px-[10px] py-1 min-w-[70px]"
                                                disabled={unlinkPending === "telegram"}
                                                onClick={() => handleUnlinkTelegram()}
                                            >
                                                {unlinkPending === "telegram" ? "Unlinking…" : "Unlink"}
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex-1" />
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-[12px] px-[10px] py-1 min-w-[70px]"
                                                onClick={() => startTelegramLogin("link")}
                                            >
                                                Link
                                            </Button>
                                        </>
                                    )
                                ) : isLinked ? (
                                    <>
                                        <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-end">
                                            <span className="text-success text-xs font-semibold">Connected</span>
                                            {detail && <span className="text-muted-foreground text-xs">{detail}</span>}
                                            {/* X read access button: show when X linked but no read token yet */}
                                            {p.key === "twitter" && profile?.xId && !profile?.hasXToken && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="ml-2 text-[12px] px-[10px] py-1"
                                                    disabled={xAuthPending}
                                                    onClick={handleXReadAccess}
                                                >
                                                    {xAuthPending ? "Redirecting…" : "Authorize read access"}
                                                </Button>
                                            )}
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-[12px] px-[10px] py-1 min-w-[70px]"
                                            disabled={unlinkPending === p.key}
                                            onClick={() => handleUnlinkProvider(p.key)}
                                        >
                                            {unlinkPending === p.key ? "Unlinking…" : "Unlink"}
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex-1" />
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-[12px] px-[10px] py-1 min-w-[70px]"
                                            disabled={linkPending === p.supabaseProvider}
                                            onClick={() => handleLinkProvider(p.supabaseProvider!)}
                                        >
                                            {linkPending === p.supabaseProvider ? "Linking…" : "Link"}
                                        </Button>
                                    </>
                                )}
                            </div>
                        )
                    })}

                    {/* Legacy connected identities (providers removed from LINK_PROVIDERS but still in Supabase) */}
                    {legacyIdentities.map(identity => {
                        const info = PROVIDER_LABELS[identity.provider] ?? { label: identity.provider, icon: "?" }
                        const detail = (identity.identity_data?.email as string) || (identity.identity_data?.user_name as string) || ""
                        return (
                            <div key={identity.id} className="flex items-center gap-2.5 py-2 text-sm min-w-0 opacity-70 border-t border-border">
                                <span className="w-5 text-center text-sm shrink-0">{info.icon}</span>
                                <span className="font-semibold min-w-[90px]">{info.label}</span>
                                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                    <span className="text-success text-xs font-semibold">Connected</span>
                                    {detail && <span className="text-muted-foreground text-xs">{detail}</span>}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-[12px] px-[10px] py-1 min-w-[70px]"
                                    disabled={unlinkPending === identity.provider}
                                    onClick={() => handleUnlinkProvider(identity.provider)}
                                >
                                    {unlinkPending === identity.provider ? "Unlinking…" : "Unlink"}
                                </Button>
                            </div>
                        )
                    })}

                    {(unlinkError || linkError) && (
                        <div className="text-xs text-destructive py-3 flex items-center gap-2 mt-2">{unlinkError || linkError}</div>
                    )}
                </div>
            </div>

            {/* Wallets */}
            <div className="border border-border rounded mb-5 bg-background">
                <div className="text-sm font-semibold px-4 py-2.5 border-b border-border bg-muted text-foreground">Wallets</div>
                <div className="p-4">
                    {walletsLoading ? (
                        <div className="flex items-baseline py-1.5 text-sm"><span className="skeleton" style={{ width: "100%", height: 16 }} /></div>
                    ) : walletsError ? (
                        <div className="text-xs text-destructive py-3 flex items-center gap-2">
                            Failed to load wallets.{" "}
                            <Button variant="secondary" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["wallets"] })}>Retry</Button>
                        </div>
                    ) : wallets.length === 0 ? (
                        <div className="text-xs text-muted-foreground py-2">No wallets linked yet.</div>
                    ) : (
                        wallets.map((w, idx) => (
                            <div key={w.id} className={`flex items-center gap-2.5 py-2 text-sm${idx > 0 ? " border-t border-border" : ""}`}>
                                <span className="font-mono text-xs text-foreground">{shortenAddress(w.address)}</span>
                                {w.chainId && (
                                    <span className="text-xs text-muted-foreground">
                                        {CHAIN_NAMES[w.chainId] ?? `Chain ${w.chainId}`}
                                    </span>
                                )}
                                {w.isPrimary && <span className="text-xs font-semibold text-accent">Primary</span>}
                                {!w.isPrimary && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="ml-auto text-xs px-2 py-0.5"
                                        disabled={walletActionPending === w.id}
                                        onClick={() => { setWalletActionPending(w.id); setPrimaryWallet.mutate(w.id) }}
                                    >
                                        {walletActionPending === w.id ? "…" : "Set primary"}
                                    </Button>
                                )}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={`${w.isPrimary ? "ml-auto" : "ml-1.5"} text-xs px-2 py-0.5 text-destructive`}
                                    disabled={walletActionPending === w.id}
                                    onClick={() => { setWalletActionPending(w.id); removeWallet.mutate(w.id) }}
                                >
                                    {walletActionPending === w.id ? "…" : "Remove"}
                                </Button>
                            </div>
                        ))
                    )}
                    <form className="flex gap-2 items-center mt-3 pt-3 border-t border-border" onSubmit={handleLinkWallet}>
                        <label htmlFor="wallet-address" className="sr-only">Wallet address</label>
                        <Input
                            id="wallet-address"
                            name="wallet-address"
                            type="text"
                            placeholder="0x..."
                            autoComplete="off"
                            className="flex-1 font-mono text-xs h-8"
                            value={walletInput}
                            onChange={e => setWalletInput(e.target.value)}
                        />
                        <Button type="submit" size="sm" disabled={linkWallet.isPending}>
                            {linkWallet.isPending ? "Linking\u2026" : "+ Link wallet"}
                        </Button>
                    </form>
                    {walletError && <div className="text-xs text-destructive mt-1.5">{walletError}</div>}
                </div>
            </div>
        </div>
    )
}
