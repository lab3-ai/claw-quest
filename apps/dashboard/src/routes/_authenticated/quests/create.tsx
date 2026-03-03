import { useState, useRef, useEffect } from "react"
import { useNavigate, Link } from "@tanstack/react-router"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useAuth } from "@/context/AuthContext"
import { PlatformIcon } from "@/components/PlatformIcon"
import { useSkillSearch, isSkillUrl, fetchSkillFromUrl, type ClawHubSkill } from "@/hooks/useSkillSearch"
import { useDraftPersistence } from "@/hooks/use-draft-persistence"
import { useSocialValidation, type ChipStatus } from "@/hooks/use-social-validation"
import "@/styles/pages/create-quest.css"
import "@/styles/pages/quest-detail.css"
import "@/styles/actor-sections.css"
import "@/styles/forms.css"
import "@/styles/token-display.css"

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "details" | "reward" | "tasks" | "preview"
type QuestType = "FCFS" | "LEADERBOARD" | "LUCKY_DRAW"
type PaymentRail = "crypto" | "fiat"

interface SocialEntry {
    platform: string
    action: string
    actionType: string
    icon: string
    params: Record<string, string>
    chips: string[]
    requireTagFriends?: boolean
}

interface FormData {
    title: string
    description: string
    startAt: string
    endAt: string
    rail: PaymentRail
    network: string
    token: string
    type: QuestType
    // Shared across all distribution types
    total: string
    winners: string
    // Lucky Draw only
    drawTime: string
}

// ─── Network / Token data (matching JS template exactly) ─────────────────────

const NETWORKS_PRIMARY = [
    { value: "Base", label: "🔵 Base (8453)" },
    { value: "BNB Smart Chain", label: "🟡 BNB Smart Chain (56)" },
    { value: "Ethereum", label: "✠ Ethereum (1)" },
]
const NETWORKS_OTHER = [
    { value: "Arbitrum One", label: "🔷 Arbitrum One (42161)" },
    { value: "Optimism", label: "🔴 Optimism (10)" },
    { value: "Polygon", label: "🟣 Polygon (137)" },
    { value: "Avalanche", label: "🔺 Avalanche (43114)" },
    { value: "Solana", label: "◎ Solana" },
]

const TOKEN_CONTRACTS: Record<string, Record<string, string>> = {
    USDC: {
        "Base": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        "BNB Smart Chain": "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
        "Ethereum": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        "Arbitrum One": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
        "Optimism": "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
        "Polygon": "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
        "Avalanche": "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
        "Solana": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    },
    USDT: {
        "Base": "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
        "BNB Smart Chain": "0x55d398326f99059fF775485246999027B3197955",
        "Ethereum": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        "Arbitrum One": "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
        "Optimism": "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
        "Polygon": "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
        "Avalanche": "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
        "Solana": "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    },
}

const NATIVE_TOKENS: Record<string, { symbol: string; name: string }> = {
    "Base": { symbol: "ETH", name: "Ether" },
    "BNB Smart Chain": { symbol: "BNB", name: "BNB" },
    "Ethereum": { symbol: "ETH", name: "Ether" },
    "Arbitrum One": { symbol: "ETH", name: "Ether" },
    "Optimism": { symbol: "ETH", name: "Ether" },
    "Polygon": { symbol: "POL", name: "POL" },
    "Avalanche": { symbol: "AVAX", name: "Avalanche" },
    "Solana": { symbol: "SOL", name: "Solana" },
}

const TOKEN_COLORS: Record<string, string> = {
    USDC: "#2775ca",
    USDT: "#26a17b",
    NATIVE: "#627eea",
}

// ─── Platform / action data ────────────────────────────────────────────────────

const PLATFORM_ICON_KEYS: Record<string, "x" | "discord" | "telegram"> = {
    X: "x", Discord: "discord", Telegram: "telegram",
}
function PlatformBtnIcon({ platform }: { platform: string }) {
    const key = PLATFORM_ICON_KEYS[platform]
    if (!key) return <span>{platform[0]}</span>
    return <PlatformIcon name={key} size={15} colored />
}

type ActionDef = {
    type: string
    label: string
    fields: "follow" | "post_url" | "post_content" | "quote_post" | "discord_join" | "discord_role" | "telegram_join"
}

const PLATFORM_ACTIONS: Record<string, ActionDef[]> = {
    X: [
        { type: "follow_account", label: "Follow on X", fields: "follow" },
        { type: "like_post", label: "Like a Post", fields: "post_url" },
        { type: "repost", label: "Repost a Post", fields: "post_url" },
        { type: "post", label: "Post on X", fields: "post_content" },
        { type: "quote_post", label: "Quote a Post", fields: "quote_post" },
    ],
    Discord: [
        { type: "join_server", label: "Join a Discord Server", fields: "discord_join" },
        { type: "verify_role", label: "Verify Role in Discord", fields: "discord_role" },
    ],
    Telegram: [
        { type: "join_channel", label: "Join a Group or Channel", fields: "telegram_join" },
    ],
}

// ─── Task validation (matches API-side regex) ─────────────────────────────────

const X_POST_URL_RE = /^https?:\/\/(x\.com|twitter\.com)\/\w+\/status\/\d+/i
const X_USERNAME_RE = /^@?[\w]{1,15}$/
const DISCORD_INVITE_RE = /^https?:\/\/(discord\.gg|discord\.com\/invite)\/[\w-]+$/i
const TELEGRAM_CHANNEL_RE = /^(@[\w]{5,32}|https?:\/\/t\.me\/[\w]+)$/i

interface TaskValidationError {
    index: number
    field: string
    message: string
}

function validateSocialTasks(tasks: SocialEntry[]): TaskValidationError[] {
    const errors: TaskValidationError[] = []
    tasks.forEach((task, i) => {
        switch (task.actionType) {
            case "follow_account":
                if (task.chips.length === 0)
                    errors.push({ index: i, field: "chips", message: "Add at least one X username (type & press ↵)" })
                break
            case "like_post":
            case "repost":
                if (task.chips.length === 0)
                    errors.push({ index: i, field: "chips", message: "Add at least one post URL (type & press ↵)" })
                break
            case "post":
                if (!task.params.content?.trim())
                    errors.push({ index: i, field: "content", message: "Post content is required" })
                else if (task.params.content.length > 280)
                    errors.push({ index: i, field: "content", message: "Post content exceeds 280 characters" })
                break
            case "quote_post":
                if (task.chips.length === 0)
                    errors.push({ index: i, field: "chips", message: "Add the post URL to quote (type & press ↵)" })
                break
            case "join_server":
                if (task.chips.length === 0)
                    errors.push({ index: i, field: "chips", message: "Add a Discord invite URL (type & press ↵)" })
                break
            case "verify_role":
                if (task.chips.length === 0)
                    errors.push({ index: i, field: "chips", message: "Add a Discord invite URL (type & press ↵)" })
                if (!task.params.roleId?.trim() && !task.params.role?.trim())
                    errors.push({ index: i, field: "role", message: "Select a role to verify" })
                break
            case "join_channel":
                if (task.chips.length === 0)
                    errors.push({ index: i, field: "chips", message: "Add a Telegram channel (type & press ↵)" })
                break
        }
    })
    return errors
}

/** Transform frontend SocialEntry[] → API QuestTask[] (chips expand to multiple tasks) */
function socialEntriesToTasks(entries: SocialEntry[]): any[] {
    const tasks: any[] = []
    for (const entry of entries) {
        const platform = entry.platform.toLowerCase() as "x" | "discord" | "telegram"
        switch (entry.actionType) {
            case "follow_account":
                for (const chip of entry.chips) {
                    tasks.push({ id: crypto.randomUUID(), platform, actionType: "follow_account",
                        label: `Follow @${chip.replace(/^@/, "")}`,
                        params: { username: chip.replace(/^@/, "").trim() }, requireTagFriends: false })
                }
                break
            case "like_post":
            case "repost":
                for (const chip of entry.chips) {
                    tasks.push({ id: crypto.randomUUID(), platform, actionType: entry.actionType,
                        label: `${entry.actionType === "like_post" ? "Like" : "Repost"} post`,
                        params: { postUrl: chip.trim() }, requireTagFriends: false })
                }
                break
            case "post":
                tasks.push({ id: crypto.randomUUID(), platform, actionType: "post",
                    label: entry.action, params: { content: (entry.params.content ?? "").trim() },
                    requireTagFriends: entry.requireTagFriends ?? false })
                break
            case "quote_post":
                if (entry.chips.length > 0)
                    tasks.push({ id: crypto.randomUUID(), platform, actionType: "quote_post",
                        label: entry.action, params: { postUrl: entry.chips[0].trim(),
                            ...(entry.params.content ? { content: entry.params.content.trim() } : {}) },
                        requireTagFriends: entry.requireTagFriends ?? false })
                break
            case "join_server":
                if (entry.chips.length > 0)
                    tasks.push({ id: crypto.randomUUID(), platform, actionType: "join_server",
                        label: entry.action, params: { inviteUrl: entry.chips[0].trim() },
                        requireTagFriends: false })
                break
            case "verify_role":
                if (entry.chips.length > 0)
                    tasks.push({ id: crypto.randomUUID(), platform, actionType: "verify_role",
                        label: entry.action, params: { inviteUrl: entry.chips[0].trim(),
                            guildId: (entry.params.guildId ?? "").trim(),
                            roleId: (entry.params.roleId ?? "").trim(),
                            roleName: (entry.params.roleName ?? entry.params.role ?? "").trim() }, requireTagFriends: false })
                break
            case "join_channel":
                if (entry.chips.length > 0)
                    tasks.push({ id: crypto.randomUUID(), platform, actionType: "join_channel",
                        label: entry.action, params: { channelUrl: entry.chips[0].trim() },
                        requireTagFriends: false })
                break
        }
    }
    return tasks
}

// ─── Leaderboard payout calc (linear decay — matches JS template exactly) ────
function calcLbPayouts(total: number, n: number): number[] {
    if (n < 2) return [Math.round(total * 100) / 100]
    const clampedN = Math.min(Math.max(n, 2), 100)
    const weights: number[] = []
    for (let i = 0; i < clampedN; i++) weights.push(clampedN - i)
    const weightSum = weights.reduce((a, b) => a + b, 0)
    const payouts = weights.map(w => Math.round((w / weightSum) * total * 100) / 100)
    // Fix rounding drift — add diff to first place
    const payoutSum = payouts.reduce((a, b) => a + b, 0)
    const diff = Math.round((total - payoutSum) * 100) / 100
    if (payouts.length > 0) payouts[0] = Math.round((payouts[0] + diff) * 100) / 100
    return payouts
}

// ─── Helper: get display token symbol ────────────────────────────────────────
function getTokenSymbol(rail: PaymentRail, token: string, network: string): string {
    if (rail === "fiat") return "USD"
    if (token === "NATIVE") return (NATIVE_TOKENS[network] ?? { symbol: "?" }).symbol
    return token
}

// ─── Reverse-map API QuestTask[] → SocialEntry[] for edit mode ──────────────
function questTasksToSocialEntries(tasks: any[]): SocialEntry[] {
    const groups = new Map<string, SocialEntry>()
    for (const task of tasks) {
        const key = `${task.platform}-${task.actionType}`
        const platformName = task.platform === "x" ? "X" : task.platform === "discord" ? "Discord" : "Telegram"
        const actionDef = PLATFORM_ACTIONS[platformName]?.find(a => a.type === task.actionType)
        if (!groups.has(key)) {
            groups.set(key, {
                platform: platformName,
                action: actionDef?.label ?? task.label,
                actionType: task.actionType,
                icon: platformName,
                params: {},
                chips: [],
                requireTagFriends: task.requireTagFriends ?? false,
            })
        }
        const entry = groups.get(key)!
        switch (task.actionType) {
            case "follow_account":
                entry.chips.push(task.params?.username ?? "")
                break
            case "like_post":
            case "repost":
                entry.chips.push(task.params?.postUrl ?? "")
                break
            case "post":
                entry.params.content = task.params?.content ?? ""
                break
            case "quote_post":
                entry.chips.push(task.params?.postUrl ?? "")
                entry.params.content = task.params?.content ?? ""
                break
            case "join_server":
                entry.chips.push(task.params?.inviteUrl ?? "")
                break
            case "verify_role":
                entry.chips.push(task.params?.inviteUrl ?? "")
                entry.params.guildId = task.params?.guildId ?? ""
                entry.params.roleId = task.params?.roleId ?? ""
                entry.params.roleName = task.params?.roleName ?? ""
                entry.params.role = task.params?.roleName ?? ""
                break
            case "join_channel":
                entry.chips.push(task.params?.channelUrl ?? "")
                break
        }
    }
    return Array.from(groups.values())
}

// ─── Chip Input (Enter-to-confirm, multi-value) ─────────────────────────────
function ChipInput({ chips, onAdd, onRemove, placeholder, validate, formatChip, maxChips, error: externalError, chipStatus }: {
    chips: string[]
    onAdd: (value: string) => void
    onRemove: (index: number) => void
    placeholder: string
    validate?: (value: string) => string | null
    formatChip?: (value: string) => string
    maxChips?: number
    error?: string
    chipStatus?: (value: string) => ChipStatus | undefined
}) {
    const [input, setInput] = useState("")
    const [error, setError] = useState<string | null>(null)
    const atMax = maxChips !== undefined && chips.length >= maxChips

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault()
            const trimmed = input.trim()
            if (!trimmed) return
            if (atMax) return
            if (validate) {
                const err = validate(trimmed)
                if (err) { setError(err); return }
            }
            const norm = trimmed.replace(/^@/, "").toLowerCase()
            if (chips.some(c => c.replace(/^@/, "").toLowerCase() === norm)) {
                setError("Already added"); return
            }
            onAdd(trimmed)
            setInput("")
            setError(null)
        } else if (e.key === "Backspace" && input === "" && chips.length > 0) {
            onRemove(chips.length - 1)
        }
    }

    const displayError = error || externalError

    return (
        <div className="chip-input-wrapper">
            {chips.length > 0 && (
                <div className="chip-list">
                    {chips.map((chip, i) => {
                        const status = chipStatus?.(chip)
                        const cls = status === "pending" ? " chip-pending"
                            : status === "invalid" ? " chip-invalid" : ""
                        return (
                            <span key={i} className={`chip${cls}`}>
                                {status === "pending"
                                    ? <span className="chip-spinner" />
                                    : status === "invalid"
                                        ? <span className="chip-warn">⚠</span>
                                        : <span className="chip-check">✓</span>}
                                <span className="chip-text">{formatChip ? formatChip(chip) : chip}</span>
                                <button className="chip-remove" onClick={() => onRemove(i)}>×</button>
                            </span>
                        )
                    })}
                </div>
            )}
            {!atMax && (
                <input
                    className={`form-input chip-input${displayError ? " form-input-error" : ""}`}
                    type="text"
                    placeholder={chips.length > 0 ? "Add another… ↵" : placeholder}
                    value={input}
                    onChange={e => { setInput(e.target.value); setError(null) }}
                    onKeyDown={handleKeyDown}
                />
            )}
            {!atMax && !displayError && input.length === 0 && chips.length === 0 && (
                <div className="form-hint" style={{ marginTop: 2 }}>Press ↵ Enter to confirm</div>
            )}
            {displayError && <div className="form-error">{displayError}</div>}
        </div>
    )
}

// ─── Discord role fields (dynamic fetch) ─────────────────────────────────────

interface DiscordRoleOption { id: string; name: string; color: number; position: number }

function DiscordRoleFields({ task, idx, setTaskParam, addChip, removeChip, chipError, chipStatus, fieldError }: {
    task: SocialEntry; idx: number
    setTaskParam: (i: number, key: string, val: string) => void
    addChip: (i: number, value: string) => void
    removeChip: (i: number, chipIdx: number) => void
    chipError?: string; chipStatus?: (value: string) => ChipStatus | undefined
    fieldError: (field: string) => string | undefined
}) {
    const { session } = useAuth()
    const [guildId, setGuildId] = useState(task.params.guildId ?? "")
    const [guildName, setGuildName] = useState("")
    const [botPresent, setBotPresent] = useState<boolean | null>(null)
    const [roles, setRoles] = useState<DiscordRoleOption[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [refreshCount, setRefreshCount] = useState(0)

    // Extract invite code from URL
    const extractInviteCode = (url: string): string | null => {
        const m = url.match(/discord\.(?:gg|com\/invite)\/([A-Za-z0-9-]+)/)
        return m ? m[1] : null
    }

    // Fetch guild info when chip changes
    const currentChip = task.chips[0] ?? ""
    useEffect(() => {
        if (!currentChip) {
            setGuildId(""); setGuildName(""); setBotPresent(null); setRoles([]); setError("")
            return
        }
        const code = extractInviteCode(currentChip)
        if (!code) return

        let cancelled = false
        setLoading(true); setError("")

        fetch(`${API_BASE}/discord/guild-info?inviteCode=${encodeURIComponent(code)}`)
            .then(r => r.json())
            .then(json => {
                if (cancelled) return
                if (json.error) { setError(json.error.message); setBotPresent(null); setLoading(false); return }
                const d = json.data as { guildId: string; guildName: string; botPresent: boolean }
                setGuildId(d.guildId); setGuildName(d.guildName); setBotPresent(d.botPresent)
                setTaskParam(idx, "guildId", d.guildId)

                if (d.botPresent && session?.access_token) {
                    fetch(`${API_BASE}/discord/guild-roles?guildId=${encodeURIComponent(d.guildId)}`, {
                        headers: { Authorization: `Bearer ${session.access_token}` },
                    })
                        .then(r2 => r2.json())
                        .then(j2 => {
                            if (cancelled) return
                            if (j2.data?.roles) setRoles(j2.data.roles)
                            setLoading(false)
                        })
                        .catch(() => { if (!cancelled) setLoading(false) })
                } else {
                    setLoading(false)
                }
            })
            .catch(() => { if (!cancelled) { setError("Failed to check server"); setLoading(false) } })

        return () => { cancelled = true }
    }, [currentChip, refreshCount]) // eslint-disable-line react-hooks/exhaustive-deps

    // Open bot invite URL
    const handleInviteBot = async (e: React.MouseEvent) => {
        e.stopPropagation()
        const gid = guildId || ""
        try {
            const res = await fetch(`${API_BASE}/discord/bot-invite-url?guildId=${encodeURIComponent(gid)}`)
            const json = await res.json()
            if (json.data?.url) window.open(json.data.url, "_blank")
        } catch { /* ignore */ }
    }

    // Re-check bot presence after inviting
    const handleRefresh = () => {
        if (!currentChip) return
        setRefreshCount(c => c + 1)
    }

    // Handle role selection — store both roleId and roleName
    const handleRoleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const roleId = e.target.value
        const role = roles.find(r => r.id === roleId)
        setTaskParam(idx, "roleId", roleId)
        setTaskParam(idx, "roleName", role?.name ?? "")
        setTaskParam(idx, "role", role?.name ?? "") // backward compat for display
    }

    return (
        <>
            <div className="bot-invite-banner">
                <span>🤖</span>
                <span style={{ flex: 1 }}>
                    {botPresent === true && guildName
                        ? <>Bot is in <strong>{guildName}</strong> — roles loaded.</>
                        : <>Add the <strong>ClawQuest bot</strong> to your server to enable role verification.</>}
                </span>
                {botPresent !== true && (
                    <button className="btn btn-sm btn-primary" onClick={handleInviteBot}>Invite Bot</button>
                )}
                {botPresent === false && (
                    <button className="btn btn-sm btn-ghost" onClick={handleRefresh} style={{ marginLeft: 4 }}>Refresh</button>
                )}
            </div>
            <div className="form-group" style={{ marginBottom: 8 }}>
                <label className="form-label">Discord Server URL</label>
                <div className="form-hint">Invite link. Press ↵ to confirm.</div>
                <ChipInput
                    chips={task.chips}
                    onAdd={val => addChip(idx, val)}
                    onRemove={ci => removeChip(idx, ci)}
                    placeholder="https://discord.gg/..."
                    validate={v => DISCORD_INVITE_RE.test(v.trim()) ? null : "Must be a valid Discord invite link"}
                    maxChips={1}
                    error={chipError}
                    chipStatus={chipStatus}
                />
                {loading && <div className="form-hint" style={{ color: "var(--accent)" }}>Checking server...</div>}
                {error && <div className="form-error">{error}</div>}
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Required Role</label>
                <div className="form-hint">
                    {botPresent === true ? "Select a role from the server." : "Invite the bot first to load roles."}
                </div>
                <select
                    className={`form-select${fieldError("role") ? " form-input-error" : ""}`}
                    value={task.params.roleId ?? ""}
                    onChange={handleRoleSelect}
                    disabled={roles.length === 0}
                >
                    <option value="" disabled>
                        {loading ? "Loading roles..." : roles.length === 0 ? "— No roles available —" : "— Select a role —"}
                    </option>
                    {roles.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                </select>
                {fieldError("role") && <div className="form-error">{fieldError("role")}</div>}
            </div>
        </>
    )
}

// ─── Social entry field components ───────────────────────────────────────────
function SocialEntryBody({ task, idx, setTaskParam, toggleTagFriends, addChip, removeChip, errors, chipStatus }: {
    task: SocialEntry
    idx: number
    setTaskParam: (i: number, key: string, val: string) => void
    toggleTagFriends: (i: number) => void
    addChip: (i: number, value: string) => void
    removeChip: (i: number, chipIdx: number) => void
    errors?: TaskValidationError[]
    chipStatus?: (value: string) => ChipStatus | undefined
}) {
    const chipError = errors?.find(e => e.index === idx && e.field === "chips")?.message
    const fieldError = (field: string) => errors?.find(e => e.index === idx && e.field === field)?.message
    const actionDef = PLATFORM_ACTIONS[task.platform]?.find(a => a.type === task.actionType)
    if (!actionDef) return null
    const fields = actionDef.fields

    return (
        <div className="social-entry-body expanded">
            {(fields === "follow") && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">X Usernames</label>
                    <div className="form-hint">Add accounts the human must follow. Press ↵ to confirm each.</div>
                    <ChipInput
                        chips={task.chips}
                        onAdd={val => addChip(idx, val.replace(/^@/, ""))}
                        onRemove={ci => removeChip(idx, ci)}
                        placeholder="@username"
                        formatChip={v => `@${v}`}
                        validate={v => X_USERNAME_RE.test(v.trim()) ? null : "Invalid X username (1–15 chars, letters/numbers/underscore)"}
                        error={chipError}
                        chipStatus={chipStatus}
                    />
                </div>
            )}
            {(fields === "post_url") && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Post URLs</label>
                    <div className="form-hint">Add X post URLs. Press ↵ to confirm each.</div>
                    <ChipInput
                        chips={task.chips}
                        onAdd={val => addChip(idx, val)}
                        onRemove={ci => removeChip(idx, ci)}
                        placeholder="https://x.com/user/status/..."
                        validate={v => X_POST_URL_RE.test(v.trim()) ? null : "Must be a valid x.com or twitter.com post URL"}
                        error={chipError}
                        chipStatus={chipStatus}
                    />
                </div>
            )}
            {(fields === "post_content") && (
                <>
                    <div className="form-group" style={{ marginBottom: 8 }}>
                        <label className="form-label">Post Template</label>
                        <div className="form-hint">Provide a template or required content. User can customize around it.</div>
                        <div className="textarea-wrapper">
                            <textarea className={`form-textarea${fieldError("content") ? " form-input-error" : ""}`} rows={3}
                                placeholder="Write the required post content, hashtags, or mentions..."
                                value={task.params["content"] ?? ""}
                                onChange={e => setTaskParam(idx, "content", e.target.value)}
                                maxLength={280}
                            />
                            <span className="char-count">{(task.params["content"] ?? "").length}/280</span>
                        </div>
                        {fieldError("content") && <div className="form-error">{fieldError("content")}</div>}
                    </div>
                    <div className="toggle-row">
                        <span>Require tagging 3 friends</span>
                        <div
                            className={`toggle-switch${task.requireTagFriends ? " on" : ""}`}
                            onClick={() => toggleTagFriends(idx)}
                        />
                    </div>
                </>
            )}
            {(fields === "quote_post") && (
                <>
                    <div className="form-group" style={{ marginBottom: 8 }}>
                        <label className="form-label">Post URL</label>
                        <div className="form-hint">Link to the X post to quote. Press ↵ to confirm.</div>
                        <ChipInput
                            chips={task.chips}
                            onAdd={val => addChip(idx, val)}
                            onRemove={ci => removeChip(idx, ci)}
                            placeholder="https://x.com/user/status/..."
                            validate={v => X_POST_URL_RE.test(v.trim()) ? null : "Must be a valid X post URL"}
                            maxChips={1}
                            error={chipError}
                            chipStatus={chipStatus}
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: 8 }}>
                        <label className="form-label">Quote Template</label>
                        <div className="form-hint">Provide required content for the quote (hashtags, links, etc.).</div>
                        <div className="textarea-wrapper">
                            <textarea className="form-textarea" rows={2}
                                placeholder="Write the required quote content..."
                                value={task.params["content"] ?? ""}
                                onChange={e => setTaskParam(idx, "content", e.target.value)}
                                maxLength={280}
                            />
                            <span className="char-count">{(task.params["content"] ?? "").length}/280</span>
                        </div>
                    </div>
                    <div className="toggle-row">
                        <span>Require tagging 3 friends</span>
                        <div
                            className={`toggle-switch${task.requireTagFriends ? " on" : ""}`}
                            onClick={() => toggleTagFriends(idx)}
                        />
                    </div>
                </>
            )}
            {(fields === "discord_join") && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Discord Server URL</label>
                    <div className="form-hint">Invite link to the Discord server. Press ↵ to confirm.</div>
                    <ChipInput
                        chips={task.chips}
                        onAdd={val => addChip(idx, val)}
                        onRemove={ci => removeChip(idx, ci)}
                        placeholder="https://discord.gg/..."
                        validate={v => DISCORD_INVITE_RE.test(v.trim()) ? null : "Must be a valid Discord invite link (discord.gg/… or discord.com/invite/…)"}
                        maxChips={1}
                        error={chipError}
                        chipStatus={chipStatus}
                    />
                </div>
            )}
            {(fields === "discord_role") && (
                <DiscordRoleFields
                    task={task} idx={idx}
                    setTaskParam={setTaskParam}
                    addChip={addChip} removeChip={removeChip}
                    chipError={chipError} chipStatus={chipStatus}
                    fieldError={fieldError}
                />
            )}
            {(fields === "telegram_join") && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Telegram Group / Channel</label>
                    <div className="form-hint">Username or invite link. Press ↵ to confirm.</div>
                    <ChipInput
                        chips={task.chips}
                        onAdd={val => addChip(idx, val)}
                        onRemove={ci => removeChip(idx, ci)}
                        placeholder="@channel or https://t.me/..."
                        validate={v => TELEGRAM_CHANNEL_RE.test(v.trim()) ? null : "Use @channel or t.me/channel format"}
                        maxChips={1}
                        error={chipError}
                        chipStatus={chipStatus}
                    />
                    <div className="form-hint" style={{ marginTop: 6, color: "var(--fg-muted)" }}>
                        ⚠ Add <strong>@ClawQuest_aibot</strong> as admin to your group/channel for auto-verification to work.
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CreateQuest({ editQuestId }: { editQuestId?: string } = {}) {
    const navigate = useNavigate()
    const { session } = useAuth()
    const isEditMode = !!editQuestId
    const [tab, setTab] = useState<Tab | null>("details")
    const [form, setForm] = useState<FormData>({
        title: "", description: "", startAt: "", endAt: "",
        rail: "crypto", network: "Base", token: "USDC", type: "FCFS",
        total: "100.00", winners: "50",
        drawTime: "",
    })
    const [activePlatform, setActivePlatform] = useState<string | null>(null)
    const [humanTasks, setHumanTasks] = useState<SocialEntry[]>([])
    const [expandedTask, setExpandedTask] = useState<number | null>(null)
    const [requiredSkills, setRequiredSkills] = useState<Pick<ClawHubSkill, "id" | "name" | "desc" | "agents" | "version">[]>([])
    const { query: skillSearch, setQuery: setSkillSearch, results: skillSearchResults, isLoading: skillSearchLoading } = useSkillSearch()
    const [showSkillResults, setShowSkillResults] = useState(false)
    const [expandedDescs, setExpandedDescs] = useState<Set<string>>(new Set())
    const [urlFetching, setUrlFetching] = useState(false)
    const [urlFetchError, setUrlFetchError] = useState<string | null>(null)
    const socialValidation = useSocialValidation(session?.access_token)
    const [urlPreview, setUrlPreview] = useState<ClawHubSkill | null>(null)
    const fundAfterSave = useRef(false)
    const editPopulated = useRef(false)
    const [restoredBanner, setRestoredBanner] = useState(false)
    const [originalRewardAmount, setOriginalRewardAmount] = useState<number>(0)
    const [isFunded, setIsFunded] = useState(false)
    const { save: saveDraft, restore: restoreDraft, clear: clearDraft } = useDraftPersistence(editQuestId)

    // ── Restore draft from localStorage (new quests only) ───────────────────
    useEffect(() => {
        if (isEditMode) return
        const draft = restoreDraft()
        if (draft) {
            setForm(draft.form as FormData)
            if (draft.socialEntries?.length) setHumanTasks(draft.socialEntries)
            if (draft.selectedSkills?.length) setRequiredSkills(draft.selectedSkills)
            setRestoredBanner(true)
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // ── Auto-save form state to localStorage (new quests only) ──────────────
    useEffect(() => {
        if (!isEditMode) {
            saveDraft({ form, socialEntries: humanTasks, selectedSkills: requiredSkills })
        }
    }, [form, humanTasks, requiredSkills]) // eslint-disable-line react-hooks/exhaustive-deps

    // ── Warn on unsaved changes before navigating away ──────────────────────
    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            if (form.title.trim()) e.preventDefault()
        }
        window.addEventListener('beforeunload', handler)
        return () => window.removeEventListener('beforeunload', handler)
    }, [form.title])

    // ── Fetch existing quest for edit mode ─────────────────────────────────────
    const { data: editQuest, isLoading: editLoading } = useQuery<any>({
        queryKey: ["quest", editQuestId],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/quests/${editQuestId}`, {
                headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
            })
            if (!res.ok) throw new Error("Failed to fetch quest")
            return res.json()
        },
        enabled: isEditMode && !!session?.access_token,
        staleTime: 60_000,
    })

    // ── Pre-populate form when edit quest data loads ───────────────────────────
    useEffect(() => {
        if (!editQuest || editPopulated.current) return
        editPopulated.current = true

        const isFiat = editQuest.rewardType === "USD"
        const token = isFiat ? "USDC" : (editQuest.rewardType || "USDC")
        // Check if token is a native token (not USDC/USDT)
        const isNative = !isFiat && token !== "USDC" && token !== "USDT"

        setForm({
            title: editQuest.title || "",
            description: editQuest.description || "",
            startAt: editQuest.startAt ? new Date(editQuest.startAt).toISOString().slice(0, 16) : "",
            endAt: editQuest.expiresAt ? new Date(editQuest.expiresAt).toISOString().slice(0, 16) : "",
            rail: isFiat ? "fiat" : "crypto",
            network: editQuest.network || "Base",
            token: isNative ? "NATIVE" : token,
            type: (editQuest.type || "FCFS") as QuestType,
            total: String(editQuest.rewardAmount ?? "100.00"),
            winners: String(editQuest.totalSlots ?? "50"),
            drawTime: editQuest.drawTime ? new Date(editQuest.drawTime).toISOString().slice(0, 16) : "",
        })

        // Populate human tasks
        if (editQuest.tasks && Array.isArray(editQuest.tasks) && editQuest.tasks.length > 0) {
            setHumanTasks(questTasksToSocialEntries(editQuest.tasks))
        }

        // Populate required skills
        if (editQuest.requiredSkills && Array.isArray(editQuest.requiredSkills) && editQuest.requiredSkills.length > 0) {
            setRequiredSkills(editQuest.requiredSkills.map((s: string) => ({
                id: s, name: s, desc: "", agents: 0, version: null,
            })))
        }

        // Track funding state for top-up logic
        setOriginalRewardAmount(editQuest.rewardAmount ?? 0)
        setIsFunded(editQuest.fundingStatus === "confirmed")
    }, [editQuest])

    const toggleDesc = (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        setExpandedDescs(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const truncateDesc = (text: string, id: string) => {
        if (!text || text.length <= 250) return text
        if (expandedDescs.has(id)) return <>{text} <span className="more-link" onClick={(e) => toggleDesc(id, e)}>less</span></>
        return <>{text.slice(0, 250).trimEnd()}… <span className="more-link" onClick={(e) => toggleDesc(id, e)}>more</span></>
    }

    const set = (key: keyof FormData, val: string) => setForm(prev => ({ ...prev, [key]: val }))

    // ── Human tasks ──────────────────────────────────────────────────────────
    const addHumanTask = (platform: string, action: ActionDef) => {
        const newIdx = humanTasks.length
        setHumanTasks(prev => [...prev, {
            platform,
            action: action.label,
            actionType: action.type,
            icon: platform,
            params: {},
            chips: [],
            requireTagFriends: false,
        }])
        setActivePlatform(null)
        setExpandedTask(newIdx)
    }

    const removeHumanTask = (i: number) => {
        setHumanTasks(prev => prev.filter((_, idx) => idx !== i))
        if (expandedTask === i) setExpandedTask(null)
    }

    const [taskErrors, setTaskErrors] = useState<TaskValidationError[]>([])

    const setTaskParam = (i: number, key: string, val: string) => {
        setHumanTasks(prev => prev.map((t, idx) => idx === i ? { ...t, params: { ...t.params, [key]: val } } : t))
        // Clear matching error on edit
        setTaskErrors(prev => prev.filter(e => !(e.index === i && e.field === key)))
    }

    const toggleTagFriends = (i: number) =>
        setHumanTasks(prev => prev.map((t, idx) => idx === i ? { ...t, requireTagFriends: !t.requireTagFriends } : t))

    const addChip = (i: number, value: string) => {
        setHumanTasks(prev => prev.map((t, idx) => idx === i ? { ...t, chips: [...t.chips, value] } : t))
        setTaskErrors(prev => prev.filter(e => !(e.index === i && e.field === "chips")))
        // Fire existence validation for the new chip
        const task = humanTasks[i]
        if (task) socialValidation.validate(task.platform.toLowerCase(), task.actionType, value)
    }

    const removeChip = (i: number, chipIdx: number) => {
        const task = humanTasks[i]
        const chipValue = task?.chips[chipIdx]
        setHumanTasks(prev => prev.map((t, idx) => idx === i ? { ...t, chips: t.chips.filter((_, ci) => ci !== chipIdx) } : t))
        // Clean up validation state
        if (task && chipValue) socialValidation.remove(task.platform.toLowerCase(), task.actionType, chipValue)
    }

    // ── Skills ────────────────────────────────────────────────────────────────
    const [fadingInSkills, setFadingInSkills] = useState<Set<string>>(new Set())

    const addedSkillIds = new Set(requiredSkills.map(s => s.id))
    const addSkill = (s: ClawHubSkill) => {
        if (addedSkillIds.has(s.id)) return
        setRequiredSkills(prev => [...prev, { id: s.id, name: s.name, desc: s.desc, agents: s.agents, version: s.version }])
        setFadingInSkills(prev => new Set(prev).add(s.id))
        setTimeout(() => {
            setFadingInSkills(prev => { const next = new Set(prev); next.delete(s.id); return next })
        }, 400)
    }
    const removeSkill = (id: string) => setRequiredSkills(prev => prev.filter(s => s.id !== id))

    // ── Submit mutation ───────────────────────────────────────────────────────
    const mutation = useMutation({
        mutationFn: async () => {
            // Light validation — only title required for draft
            if (!form.title.trim()) {
                setTab("details")
                throw new Error("Quest title is required")
            }

            // Validate tasks if any exist (but tasks are not required)
            if (humanTasks.length > 0) {
                const errors = validateSocialTasks(humanTasks)
                if (errors.length > 0) {
                    setTaskErrors(errors)
                    setTab("tasks")
                    setExpandedTask(errors[0].index)
                    throw new Error("Fix task errors before saving")
                }
            }
            setTaskErrors([])

            const total = parseFloat(form.total) || 0
            const slots = parseInt(form.winners) || 50
            const tasks = socialEntriesToTasks(humanTasks)

            const url = isEditMode ? `${API_BASE}/quests/${editQuestId}` : `${API_BASE}/quests`
            const method = isEditMode ? "PATCH" : "POST"

            const payload: any = {
                title: form.title,
                description: form.description || undefined,
                type: form.type,
                rewardType: form.rail === "fiat" ? "USD" : form.token,
                rewardAmount: total,
                totalSlots: slots,
                requiredSkills: requiredSkills.map(s => s.id),
                tasks,
                expiresAt: form.endAt ? new Date(form.endAt).toISOString() : undefined,
                startAt: form.startAt ? new Date(form.startAt).toISOString() : undefined,
                network: form.network || undefined,
                drawTime: form.drawTime ? new Date(form.drawTime).toISOString() : undefined,
            }
            if (!isEditMode) payload.status = "draft"

            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
                },
                body: JSON.stringify(payload),
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: "Failed" }))
                // Parse Zod array errors → human-readable message
                if (Array.isArray(err.message)) {
                    throw new Error(err.message.map((e: any) => e.message).join(", "))
                }
                throw new Error(err.message ?? `Failed to ${isEditMode ? "update" : "save"} quest`)
            }
            return res.json()
        },
        onSuccess: (data: any) => {
            clearDraft()
            const questId = data?.id || editQuestId
            if (fundAfterSave.current && questId) {
                navigate({ to: "/quests/$questId/fund", params: { questId } })
            } else if (isEditMode && questId) {
                // Funded quests without top-up: go to detail page
                navigate({ to: "/quests/$questId", params: { questId } })
            } else {
                navigate({ to: "/dashboard" })
            }
        },
    })

    // ── Derived values ────────────────────────────────────────────────────────
    const tabDone: Record<Tab, boolean> = {
        details: !!(form.title.trim() && form.description.trim()),
        reward: true,
        tasks: humanTasks.length > 0 || requiredSkills.length > 0,
        preview: false,
    }

    const activeTotal = parseFloat(form.total) || 0
    const activeWinners = parseInt(form.winners) || 1
    const perWinner = activeWinners > 0 ? (activeTotal / activeWinners).toFixed(2) : "0.00"

    const tokenLabel = getTokenSymbol(form.rail, form.token, form.network)

    // LB payouts — clamp winners 2-100, calc full set, display truncated if > 20
    const lbWinnersNum = Math.min(Math.max(activeWinners, 2), 100)
    const lbPayouts = calcLbPayouts(activeTotal, lbWinnersNum)

    const durationDays = form.startAt && form.endAt
        ? Math.max(0, Math.round((new Date(form.endAt).getTime() - new Date(form.startAt).getTime()) / 86400000))
        : null

    // Step summaries for completed-step accordions
    const stepSummaries: Record<Tab, string> = {
        details: form.title
            ? `${form.title.slice(0, 40)}${form.title.length > 40 ? "\u2026" : ""} \u00b7 ${durationDays ? `${durationDays}d` : "no dates"}`
            : "",
        reward: `${form.type} \u00b7 ${activeTotal > 0 ? `${activeTotal} ${tokenLabel}` : "\u2014"} \u00b7 ${form.network} \u00b7 ${activeWinners} winners`,
        tasks: [
            humanTasks.length > 0 ? `${humanTasks.length} social` : "",
            requiredSkills.length > 0 ? `${requiredSkills.length} skill${requiredSkills.length > 1 ? "s" : ""}` : "",
        ].filter(Boolean).join(" \u00b7 ") || "No tasks",
        preview: "",
    }

    const TABS: Tab[] = ["details", "tasks", "reward", "preview"]

    // Token display info (dynamic by network + token)
    const isNativeToken = form.token === "NATIVE"
    const nativeInfo = NATIVE_TOKENS[form.network] ?? { symbol: "?", name: "?" }
    const tokenDisplaySymbol = isNativeToken ? nativeInfo.symbol : form.token
    const tokenContract = isNativeToken
        ? "Native token — no contract address"
        : (TOKEN_CONTRACTS[form.token]?.[form.network] ?? "")
    const tokenIconChar = isNativeToken ? nativeInfo.symbol.charAt(0) : "$"
    const tokenIconColor = isNativeToken ? "#627eea" : (TOKEN_COLORS[form.token] ?? "#888")

    // ─────────────────────────────────────────────────────────────────────────
    if (isEditMode && editLoading) {
        return (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--fg-muted)" }}>
                Loading quest…
            </div>
        )
    }

    // Guard: block editing for live/completed/expired/cancelled quests
    const blockedStatus = editQuest && ["live", "completed", "expired", "cancelled"].includes(editQuest.status)
    if (isEditMode && blockedStatus) {
        return (
            <div className="page-container" style={{ maxWidth: 960 }}>
                <div className="breadcrumb">
                    <Link to="/quests/$questId" params={{ questId: editQuestId! }}>Quest</Link>
                    <span className="sep">&rsaquo;</span>
                    <span>Edit</span>
                </div>
                <div style={{
                    marginTop: 40, padding: "24px", textAlign: "center",
                    border: "1px solid var(--border)", borderRadius: 6, background: "var(--sidebar-bg)",
                }}>
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
                        This quest is {editQuest.status} and cannot be edited
                    </div>
                    <div style={{ fontSize: 13, color: "var(--fg-muted)", marginBottom: 16 }}>
                        {editQuest.status === "live"
                            ? "Live quests cannot be modified. Use the Manage page to view progress and distribute rewards."
                            : "This quest has ended. No further changes are possible."}
                    </div>
                    <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                        <Link to="/quests/$questId" params={{ questId: editQuestId! }}>
                            <button className="btn btn-secondary">View Quest</button>
                        </Link>
                        {editQuest.status === "live" && (
                            <Link to="/quests/$questId/manage" params={{ questId: editQuestId! }}>
                                <button className="btn btn-primary">Manage Quest</button>
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    const isScheduled = isEditMode && editQuest?.status === "scheduled"
    const editLabel = isScheduled ? "Edit Quest" : "Edit Draft"
    const newTotal = parseFloat(form.total) || 0
    const rewardIncreased = isFunded && newTotal > originalRewardAmount
    const topUpAmount = rewardIncreased ? newTotal - originalRewardAmount : 0

    return (
        <div className="page-container" style={{ maxWidth: 960 }}>
            <div className="breadcrumb">
                {isEditMode ? (
                    <>
                        <Link to="/quests/$questId" params={{ questId: editQuestId! }}>Quest</Link>
                        <span className="sep">&rsaquo;</span>
                        <span>{editLabel}</span>
                    </>
                ) : (
                    <>
                        <Link to="/dashboard">Dashboard</Link>
                        <span className="sep">&rsaquo;</span>
                        <span>Create Quest</span>
                    </>
                )}
            </div>
            <div className="page-header" style={{ marginBottom: 20 }}>
                <div>
                    <h1>{isEditMode ? editLabel : "Create a Quest"}</h1>
                    <div className="subtitle">
                        {isEditMode
                            ? isScheduled
                                ? "Update your scheduled quest before it goes live."
                                : "Update your draft quest details, rewards, and tasks."
                            : "Fund a quest for agents to execute. Pay with crypto or fiat."}
                    </div>
                </div>
            </div>

            <div className="form-layout">
              {restoredBanner && (
                <div className="draft-restored-banner">
                    <span>Draft restored from local backup</span>
                    <button className="btn btn-sm" onClick={() => setRestoredBanner(false)}>Dismiss</button>
                </div>
              )}
              <div className="accordion-stepper">

                    {/* ══ STEP 1: DETAILS ══ */}
                    <div className={`accordion-step${tab === "details" ? " active" : ""}${tabDone.details && tab !== "details" ? " done" : ""}`}>
                        <div className="accordion-step-header" onClick={() => setTab(tab === "details" ? null : "details")}>
                            <span className="accordion-step-icon">{tabDone.details && tab !== "details" ? "\u2713" : "1"}</span>
                            <div className="accordion-step-left">
                                <div className="accordion-step-title-row">
                                    <span className="accordion-step-title">Quest Details</span>
                                    {tabDone.details && tab !== "details" && <span className="accordion-step-status completed">Completed</span>}
                                    {tab === "details" && <span className="accordion-step-status in-progress">In Progress</span>}
                                    {!tabDone.details && tab !== "details" && <span className="accordion-step-status not-started">Not Started</span>}
                                </div>
                                <div className="accordion-step-desc">
                                    {tab !== "details" && stepSummaries.details ? stepSummaries.details : "Title, description, and timing"}
                                </div>
                            </div>
                            <div className="accordion-step-right">
                                <span className="accordion-step-counter">Step 1 of 4</span>
                                <span className="accordion-step-hint">{tabDone.details && tab !== "details" ? "Modify if required" : tab === "details" ? "" : "Fill the details"}</span>
                            </div>
                        </div>
                        {tab === "details" && (
                        <div className="accordion-step-body"><div className="accordion-step-body-inner">
                            <div className="form-section">
                                <div className="form-group">
                                    <label className="form-label">Title</label>
                                    <input
                                        className="form-input"
                                        type="text"
                                        placeholder="e.g. Register & trade shares on ClawFriend"
                                        value={form.title}
                                        onChange={e => set("title", e.target.value)}
                                        maxLength={80}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Description</label>
                                    <div className="form-hint">Agent-readable. Explain the overall quest goal.</div>
                                    <textarea
                                        className="form-textarea"
                                        rows={3}
                                        placeholder="Use the ClawFriend skill to register your agent…"
                                        value={form.description}
                                        onChange={e => set("description", e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="form-section">
                                <div className="form-section-title">Timing</div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Start</label>
                                        <input className="form-input" type="datetime-local" value={form.startAt} onChange={e => set("startAt", e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">End</label>
                                        <input className="form-input" type="datetime-local" value={form.endAt} onChange={e => set("endAt", e.target.value)} />
                                    </div>
                                </div>
                            </div>
                            <div className="tab-nav-row">
                                <span />
                                <button className="btn btn-primary" onClick={() => setTab("tasks")}>Next: Tasks →</button>
                            </div>
                        </div></div>
                        )}
                    </div>

                    {/* ══ STEP 2: TASKS ══ */}
                    <div className={`accordion-step${tab === "tasks" ? " active" : ""}${tabDone.tasks && tab !== "tasks" ? " done" : ""}${TABS.indexOf(tab as Tab) < TABS.indexOf("tasks") && !tabDone.tasks ? " future" : ""}`}>
                        <div className="accordion-step-header" onClick={() => setTab(tab === "tasks" ? null : "tasks")}>
                            <span className="accordion-step-icon">{tabDone.tasks && tab !== "tasks" ? "\u2713" : "2"}</span>
                            <div className="accordion-step-left">
                                <div className="accordion-step-title-row">
                                    <span className="accordion-step-title">Tasks</span>
                                    {tabDone.tasks && tab !== "tasks" && <span className="accordion-step-status completed">Completed</span>}
                                    {tab === "tasks" && <span className="accordion-step-status in-progress">In Progress</span>}
                                    {!tabDone.tasks && tab !== "tasks" && <span className="accordion-step-status not-started">Not Started</span>}
                                </div>
                                <div className="accordion-step-desc">
                                    {tab !== "tasks" && stepSummaries.tasks !== "No tasks" ? stepSummaries.tasks : "Human social actions and agent skill requirements"}
                                </div>
                            </div>
                            <div className="accordion-step-right">
                                <span className="accordion-step-counter">Step 2 of 4</span>
                                <span className="accordion-step-hint">{tabDone.tasks && tab !== "tasks" ? "Modify if required" : tab === "tasks" ? "" : "Add tasks"}</span>
                            </div>
                        </div>
                        {tab === "tasks" && (
                        <div className="accordion-step-body"><div className="accordion-step-body-inner">
                            <div className="form-section">
                                <div className="form-hint" style={{ marginBottom: 14 }}>
                                    Define what needs to be done. Human tasks are social actions.
                                    Agent tasks require specific skills from{" "}
                                    <a href="https://clawhub.ai/skills" target="_blank" rel="noreferrer" style={{ color: "var(--link)" }}>
                                        ClawHub
                                    </a>.
                                </div>

                                {/* ── Human Tasks ── */}
                                <div className="actor-section human">
                                    <div className="actor-section-title">
                                        <span>👤</span> Human Tasks
                                        <span className="actor-badge human">Social</span>
                                        <span className="hint">Actions performed by the operator</span>
                                    </div>

                                    <div className="template-picker" style={{ marginBottom: 12 }}>
                                        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--fg-muted)", marginBottom: 6 }}>
                                            Select a task template
                                        </div>
                                        <div className="platform-grid">
                                            {Object.keys(PLATFORM_ACTIONS).map(p => (
                                                <button
                                                    key={p}
                                                    className={`platform-btn ${activePlatform === p ? "active" : ""}`}
                                                    onClick={() => setActivePlatform(activePlatform === p ? null : p)}
                                                >
                                                    <span className="icon"><PlatformBtnIcon platform={p} /></span> {p}
                                                </button>
                                            ))}
                                        </div>
                                        {activePlatform && (
                                            <div className="action-templates visible">
                                                <div className="action-template-list">
                                                    {PLATFORM_ACTIONS[activePlatform].map(action => (
                                                        <div
                                                            key={action.type}
                                                            className="action-template-item"
                                                            onClick={() => addHumanTask(activePlatform, action)}
                                                        >
                                                            <span className="template-name">{action.label}</span>
                                                            <button className="template-add">+ Add</button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {humanTasks.length === 0 ? (
                                        <div style={{ fontSize: 12, color: "var(--fg-muted)", padding: "8px 0" }}>
                                            No tasks added yet. Use the template picker above.
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--fg)", marginBottom: 6 }}>
                                                Added Tasks
                                            </div>
                                            {humanTasks.map((task, i) => (
                                                <div key={i} className="social-entry" data-platform={task.platform.toLowerCase()}>
                                                    <div
                                                        className="social-entry-header"
                                                        onClick={() => setExpandedTask(expandedTask === i ? null : i)}
                                                    >
                                                        <span className="entry-icon"><PlatformBtnIcon platform={task.platform} /></span>
                                                        <span className="entry-label">{task.action}</span>
                                                        {task.chips.length > 0 && (
                                                            <span className="entry-chip-count">{task.chips.length}</span>
                                                        )}
                                                        <span className="entry-platform">{task.platform}</span>
                                                        <button
                                                            className="entry-remove"
                                                            onClick={e => { e.stopPropagation(); removeHumanTask(i) }}
                                                        >✕</button>
                                                    </div>
                                                    {expandedTask !== i && task.chips.length > 0 && (
                                                        <div className="social-entry-chips-preview">
                                                            {task.chips.slice(0, 4).map((c, ci) => {
                                                                const st = socialValidation.getStatus(task.platform.toLowerCase(), task.actionType, c)
                                                                const icon = st === "pending" ? "⋯" : st === "invalid" ? "⚠" : "✓"
                                                                const cls = st === "invalid" ? " chip-preview-invalid" : st === "pending" ? " chip-preview-pending" : ""
                                                                return (
                                                                    <span key={ci} className={`chip-preview${cls}`}>
                                                                        {icon} {task.actionType === "follow_account" ? `@${c.replace(/^@/, "")}` : c.length > 35 ? c.slice(0, 35) + "…" : c}
                                                                    </span>
                                                                )
                                                            })}
                                                            {task.chips.length > 4 && <span className="chip-preview more">+{task.chips.length - 4} more</span>}
                                                        </div>
                                                    )}
                                                    {expandedTask === i && (
                                                        <SocialEntryBody
                                                            task={task}
                                                            idx={i}
                                                            setTaskParam={setTaskParam}
                                                            toggleTagFriends={toggleTagFriends}
                                                            addChip={addChip}
                                                            removeChip={removeChip}
                                                            errors={taskErrors}
                                                            chipStatus={v => socialValidation.getStatus(task.platform.toLowerCase(), task.actionType, v)}
                                                        />
                                                    )}
                                                </div>
                                            ))}
                                        </>
                                    )}
                                </div>

                                {/* ── Agent Tasks ── */}
                                <div className="actor-section agent">
                                    <div className="actor-section-title">
                                        <span>🤖</span> Agent Tasks
                                        <span className="actor-badge agent">Skill</span>
                                        <span className="hint">Required skills from ClawHub</span>
                                    </div>

                                    <div className="info-box">
                                        Agents must have{" "}
                                        <code style={{ fontFamily: "var(--font-mono)", fontSize: 11, background: "var(--code-bg)", padding: "0 3px", borderRadius: 2 }}>
                                            clawquest
                                        </code>{" "}
                                        installed + each required skill below. CQ checks capabilities before submission.
                                    </div>

                                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--fg)", margin: "12px 0 6px" }}>
                                        Required Skills
                                    </div>
                                    {requiredSkills.length === 0 ? (
                                        <div style={{ fontSize: 12, color: "var(--fg-muted)", padding: "4px 0 8px" }}>
                                            No skills required yet. Search below to add.
                                        </div>
                                    ) : (
                                        <div className="required-skills-list">
                                            {requiredSkills.map(skill => {
                                                const isCustom = skill.id.startsWith("http")
                                                return (
                                                    <div key={skill.id} className={`required-skill-item${fadingInSkills.has(skill.id) ? " fading-in" : ""}`} data-agents={skill.agents}>
                                                        <div className="required-skill-icon">{isCustom ? "🔗" : "🧩"}</div>
                                                        <div className="required-skill-info">
                                                            <div className="required-skill-name">
                                                                {isCustom ? skill.name : `${skill.id}@${skill.version ?? "latest"}`}
                                                            </div>
                                                            <div className="required-skill-desc">{skill.desc}</div>
                                                            {isCustom && (
                                                                <div className="required-skill-source" title={skill.id}>
                                                                    {skill.id}
                                                                </div>
                                                            )}
                                                        </div>
                                                        {isCustom
                                                            ? <span className="required-skill-eligible custom">custom</span>
                                                            : <span className="required-skill-eligible">{skill.agents} agents</span>
                                                        }
                                                        <button className="required-skill-remove" onClick={() => removeSkill(skill.id)}>✕</button>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}

                                    <div className="skill-search-wrapper" style={{ position: "relative" }}>
                                        <span className="skill-search-icon">🔍</span>
                                        <input
                                            className="skill-search-input"
                                            type="text"
                                            placeholder="Search on ClawHub or paste skill URL…"
                                            value={skillSearch}
                                            onChange={e => {
                                                const val = e.target.value
                                                setSkillSearch(val)
                                                setShowSkillResults(true)
                                                setUrlFetchError(null)
                                                setUrlPreview(null)
                                                if (isSkillUrl(val.trim())) {
                                                    setUrlFetching(true)
                                                    fetchSkillFromUrl(val.trim())
                                                        .then(skill => {
                                                            setUrlPreview(skill)
                                                            if (!skill) setUrlFetchError("Could not parse skill.md from this URL")
                                                        })
                                                        .catch(() => setUrlFetchError("Failed to fetch URL"))
                                                        .finally(() => setUrlFetching(false))
                                                }
                                            }}
                                            onFocus={() => setShowSkillResults(true)}
                                        />

                                        {/* URL-based skill preview */}
                                        {showSkillResults && isSkillUrl(skillSearch.trim()) && (urlFetching || urlPreview || urlFetchError) && (
                                            <div className="skill-search-results">
                                                <div className="skill-search-results-header">
                                                    <span>{urlFetching ? "Fetching skill.md…" : urlPreview ? "Skill found" : "Error"}</span>
                                                    <span style={{ cursor: "pointer" }} onClick={() => setShowSkillResults(false)}>✕ close</span>
                                                </div>
                                                {urlFetching && (
                                                    <div style={{ padding: "12px", textAlign: "center", color: "var(--fg-muted)", fontSize: 12 }}>
                                                        Fetching skill.md…
                                                    </div>
                                                )}
                                                {urlFetchError && !urlFetching && (
                                                    <div style={{ padding: "12px", textAlign: "center", color: "var(--red)", fontSize: 12 }}>
                                                        {urlFetchError}. Ensure the URL points to a public skill.md file.
                                                    </div>
                                                )}
                                                {urlPreview && !urlFetching && (() => {
                                                    const isAdded = addedSkillIds.has(urlPreview.id)
                                                    return (
                                                        <div className={`skill-result-item${isAdded ? " disabled" : ""}`} onClick={() => !isAdded && addSkill(urlPreview)}>
                                                            <div className="skill-result-info">
                                                                <div className="skill-result-name">
                                                                    <span className="custom-skill-badge">URL</span>
                                                                    <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{urlPreview.name}</span>
                                                                </div>
                                                                <div className="skill-result-desc">{truncateDesc(urlPreview.desc, urlPreview.id)}</div>
                                                                <div className="skill-result-meta">
                                                                    <span>v{urlPreview.version}</span>
                                                                    <span className="skill-source-url" title={urlPreview.id}>{urlPreview.ownerHandle}</span>
                                                                </div>
                                                            </div>
                                                            {isAdded
                                                                ? <span className="skill-result-added">✓ Added</span>
                                                                : <button className="skill-result-add">+ Add</button>
                                                            }
                                                        </div>
                                                    )
                                                })()}
                                            </div>
                                        )}

                                        {/* ClawHub search results */}
                                        {showSkillResults && !isSkillUrl(skillSearch.trim()) && skillSearch.length >= 2 && (skillSearchResults.length > 0 || skillSearchLoading) && (
                                            <div className="skill-search-results">
                                                <div className="skill-search-results-header">
                                                    <span>{skillSearchLoading ? `Searching "${skillSearch}"…` : `${skillSearchResults.length} results for "${skillSearch}"`}</span>
                                                    <span style={{ cursor: "pointer" }} onClick={() => setShowSkillResults(false)}>✕ close</span>
                                                </div>
                                                {skillSearchLoading && skillSearchResults.length === 0 && (
                                                    <div style={{ padding: "12px", textAlign: "center", color: "var(--fg-muted)", fontSize: 12 }}>
                                                        Searching ClawHub…
                                                    </div>
                                                )}
                                                {skillSearchResults.map(s => {
                                                    const isAdded = addedSkillIds.has(s.id)
                                                    return (
                                                        <div key={s.id} className={`skill-result-item${isAdded ? " disabled" : ""}`} onClick={() => !isAdded && addSkill(s)}>
                                                            <div className="skill-result-info">
                                                                <div className="skill-result-name">
                                                                    <span className="org">{s.id.split("/")[0]} /</span>
                                                                    <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</span>
                                                                </div>
                                                                <div className="skill-result-desc">{truncateDesc(s.desc, s.id)}</div>
                                                                <div className="skill-result-meta">
                                                                    <span>↓ {s.downloads}</span>
                                                                    <span>★ {s.stars}</span>
                                                                    <span>v{s.version}</span>
                                                                </div>
                                                            </div>
                                                            {isAdded
                                                                ? <span className="skill-result-added">✓ Added</span>
                                                                : <button className="skill-result-add">+ Add</button>
                                                            }
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="tab-nav-row">
                                <button className="btn btn-secondary" onClick={() => setTab("details")}>← Details</button>
                                <button className="btn btn-primary" onClick={() => setTab("reward")}>Next: Reward →</button>
                            </div>
                        </div></div>
                        )}
                    </div>

                    {/* ══ STEP 3: REWARD ══ */}
                    <div className={`accordion-step${tab === "reward" ? " active" : ""}${tabDone.reward && tab !== "reward" ? " done" : ""}${TABS.indexOf(tab as Tab) < TABS.indexOf("reward") && !tabDone.reward ? " future" : ""}`}>
                        <div className="accordion-step-header" onClick={() => setTab(tab === "reward" ? null : "reward")}>
                            <span className="accordion-step-icon">{tabDone.reward && tab !== "reward" ? "\u2713" : "3"}</span>
                            <div className="accordion-step-left">
                                <div className="accordion-step-title-row">
                                    <span className="accordion-step-title">Reward</span>
                                    {tabDone.reward && tab !== "reward" && <span className="accordion-step-status completed">Completed</span>}
                                    {tab === "reward" && <span className="accordion-step-status in-progress">In Progress</span>}
                                    {!tabDone.reward && tab !== "reward" && <span className="accordion-step-status not-started">Not Started</span>}
                                </div>
                                <div className="accordion-step-desc">
                                    {tab !== "reward" && stepSummaries.reward ? stepSummaries.reward : "Reward method, network, token, and distribution"}
                                </div>
                            </div>
                            <div className="accordion-step-right">
                                <span className="accordion-step-counter">Step 3 of 4</span>
                                <span className="accordion-step-hint">{tabDone.reward && tab !== "reward" ? "Modify if required" : tab === "reward" ? "" : "Fill the details"}</span>
                            </div>
                        </div>
                        {tab === "reward" && (
                        <div className="accordion-step-body"><div className="accordion-step-body-inner">
                            {/* Payment Rail */}
                            <div className="form-section">
                                <div className="form-group">
                                    <label className="form-label">Reward Method</label>
                                    <div className="rail-toggle">
                                        <button
                                            className={`rail-toggle-btn ${form.rail === "crypto" ? "active" : ""}`}
                                            onClick={() => set("rail", "crypto")}
                                        >
                                            <span className="rail-icon">⛓</span> Crypto
                                        </button>
                                        <button
                                            className={`rail-toggle-btn ${form.rail === "fiat" ? "active" : ""}`}
                                            onClick={() => set("rail", "fiat")}
                                        >
                                            <span className="rail-icon">💳</span> Fiat (USD)
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Network & Token (crypto only) */}
                            {form.rail === "crypto" && (
                                <div className="form-section">
                                    <div className="form-section-title">Network & Token</div>
                                    <div className="network-select-row">
                                        <div className="form-group">
                                            <label className="form-label">Network</label>
                                            <select className="form-select" value={form.network} onChange={e => set("network", e.target.value)}>
                                                <optgroup label="Primary">
                                                    {NETWORKS_PRIMARY.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
                                                </optgroup>
                                                <optgroup label="Other Networks">
                                                    {NETWORKS_OTHER.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
                                                </optgroup>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Token</label>
                                            <select className="form-select" value={form.token} onChange={e => set("token", e.target.value)}>
                                                <optgroup label="Stablecoin">
                                                    <option value="USDC">USDC</option>
                                                    <option value="USDT">USDT</option>
                                                </optgroup>
                                                <optgroup label="Native">
                                                    <option value="NATIVE">{nativeInfo.symbol}</option>
                                                </optgroup>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="token-display" style={{ marginTop: 8 }}>
                                        <div className="token-icon" style={{ background: tokenIconColor }}>
                                            {tokenIconChar}
                                        </div>
                                        <div className="token-info">
                                            <div className="token-name">{tokenDisplaySymbol} on {form.network}</div>
                                            <div className="token-contract">{tokenContract}</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Fiat */}
                            {form.rail === "fiat" && (
                                <div className="form-section">
                                    <div className="form-section-title">Fiat Payment</div>
                                    <div className="fiat-info">
                                        <span className="info-icon">ℹ️</span>
                                        <span>Sponsor pays via <strong>Stripe</strong> (charged upfront at quest creation). Winners withdraw rewards as crypto.</span>
                                    </div>
                                    <div className="token-display" style={{ marginTop: 10 }}>
                                        <div className="token-icon" style={{ background: "#635bff" }}>S</div>
                                        <div className="token-info">
                                            <div className="token-name">USD via Stripe</div>
                                            <div className="token-contract" style={{ fontFamily: "var(--font)" }}>
                                                Credit / debit card · Apple Pay · Google Pay
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Distribution Method */}
                            <div className="form-section">
                                <div className="form-section-title">Distribution Method</div>
                                <div className="radio-group">
                                    {[
                                        { id: "payout-fcfs", val: "FCFS" as QuestType, label: "FCFS" },
                                        { id: "payout-draw", val: "LUCKY_DRAW" as QuestType, label: "Lucky Draw" },
                                        { id: "payout-leaderboard", val: "LEADERBOARD" as QuestType, label: "Leaderboard" },
                                    ].map(opt => (
                                        <div key={opt.val} className="radio-option">
                                            <input
                                                type="radio"
                                                id={opt.id}
                                                name="payout"
                                                checked={form.type === opt.val}
                                                onChange={() => {
                                                    setForm(prev => {
                                                        let winners = prev.winners
                                                        if (opt.val === "LEADERBOARD") {
                                                            const n = parseInt(winners) || 2
                                                            winners = String(Math.min(100, Math.max(2, n)))
                                                        }
                                                        return { ...prev, type: opt.val, winners }
                                                    })
                                                }}
                                            />
                                            <label htmlFor={opt.id}>{opt.label}</label>
                                        </div>
                                    ))}
                                </div>

                                {/* Shared: Total Reward + Winners — shown for all modes */}
                                <div style={{ marginTop: 12 }}>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="form-label">Total Reward ({tokenLabel})</label>
                                            <input
                                                className="form-input form-input-mono"
                                                type="text"
                                                value={form.total}
                                                onChange={e => set("total", e.target.value)}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">
                                                Number of Winners
                                                {form.type === "LEADERBOARD" && (
                                                    <span style={{ fontSize: 10, color: "var(--fg-muted)", marginLeft: 4 }}>(min 2, max 100)</span>
                                                )}
                                            </label>
                                            <input
                                                className="form-input"
                                                type="number"
                                                min={form.type === "LEADERBOARD" ? 2 : 1}
                                                max={form.type === "LEADERBOARD" ? 100 : undefined}
                                                value={form.winners}
                                                onChange={e => {
                                                    let v = e.target.value
                                                    if (form.type === "LEADERBOARD") {
                                                        const n = parseInt(v) || 2
                                                        v = String(Math.min(100, Math.max(2, n)))
                                                    }
                                                    set("winners", v)
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* FCFS fields */}
                                {form.type === "FCFS" && (
                                    <div className="conditional visible" style={{ marginTop: 4 }}>
                                        <div className="form-hint" style={{ marginBottom: 8 }}>
                                            First N eligible agents get paid immediately.
                                        </div>
                                        <div className="form-calc">
                                            Per winner: <strong>{perWinner} {tokenLabel}</strong>
                                        </div>
                                    </div>
                                )}

                                {/* Lucky Draw fields */}
                                {form.type === "LUCKY_DRAW" && (
                                    <div className="conditional visible" style={{ marginTop: 4 }}>
                                        <div className="form-hint" style={{ marginBottom: 8 }}>
                                            All eligible submissions enter a raffle. N winners drawn at end.
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Draw Time</label>
                                            <input
                                                className="form-input"
                                                type="datetime-local"
                                                value={form.drawTime}
                                                onChange={e => set("drawTime", e.target.value)}
                                            />
                                        </div>
                                        <div className="form-calc">
                                            Per winner: <strong>{perWinner} {tokenLabel}</strong>
                                        </div>
                                    </div>
                                )}

                                {/* Leaderboard fields */}
                                {form.type === "LEADERBOARD" && (
                                    <div className="conditional visible" style={{ marginTop: 4 }}>
                                        <div className="form-hint" style={{ marginBottom: 8 }}>
                                            All verified submissions ranked by completion time. At quest end, top N get tiered rewards (1st gets more than 2nd, etc.).
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Payout Structure ({tokenLabel})</label>
                                            <div className="form-hint">
                                                Auto-generated from total &amp; winners count. Weighted decay: 1st gets most.
                                            </div>
                                            <div className="lb-payout-visual">
                                                {/* Show first 5 + ellipsis + last 2 if > 20, else show all */}
                                                {lbWinnersNum <= 20
                                                    ? lbPayouts.map((amt, i) => (
                                                        <div key={i} className="lb-payout-item">
                                                            <span className="pos">#{i + 1}</span>
                                                            <span className="amt">{amt.toFixed(2)}</span>
                                                        </div>
                                                    ))
                                                    : (
                                                        <>
                                                            {lbPayouts.slice(0, 5).map((amt, i) => (
                                                                <div key={i} className="lb-payout-item">
                                                                    <span className="pos">#{i + 1}</span>
                                                                    <span className="amt">{amt.toFixed(2)}</span>
                                                                </div>
                                                            ))}
                                                            <span style={{ color: "var(--fg-muted)", padding: "2px 4px", fontSize: 11 }}>…</span>
                                                            {lbPayouts.slice(-2).map((amt, i) => (
                                                                <div key={`last-${i}`} className="lb-payout-item">
                                                                    <span className="pos">#{lbWinnersNum - 1 + i}</span>
                                                                    <span className="amt">{amt.toFixed(2)}</span>
                                                                </div>
                                                            ))}
                                                        </>
                                                    )
                                                }
                                            </div>
                                        </div>
                                        <div className="form-calc">
                                            <span>1st: <strong>{lbPayouts[0]?.toFixed(2)} {tokenLabel}</strong></span>
                                            <span style={{ marginLeft: 8 }}>→ Last: <strong>{lbPayouts[lbPayouts.length - 1]?.toFixed(2)} {tokenLabel}</strong></span>
                                            <span style={{ marginLeft: "auto" }}>Total: <strong>{activeTotal.toFixed(2)} {tokenLabel}</strong></span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="tab-nav-row">
                                <button className="btn btn-secondary" onClick={() => setTab("tasks")}>← Tasks</button>
                                <button className="btn btn-primary" onClick={() => setTab("preview")}>Next: Preview →</button>
                            </div>
                        </div></div>
                        )}
                    </div>

                    {/* ══ STEP 4: PREVIEW & FUND ══ */}
                    <div className={`accordion-step${tab === "preview" ? " active" : ""}${TABS.indexOf(tab as Tab) < TABS.indexOf("preview") ? " future" : ""}`}>
                        <div className="accordion-step-header" onClick={() => setTab(tab === "preview" ? null : "preview")}>
                            <span className="accordion-step-icon">4</span>
                            <div className="accordion-step-left">
                                <div className="accordion-step-title-row">
                                    <span className="accordion-step-title">Preview & Fund</span>
                                    {tab === "preview" && <span className="accordion-step-status in-progress">In Progress</span>}
                                    {tab !== "preview" && <span className="accordion-step-status not-started">Not Started</span>}
                                </div>
                                <div className="accordion-step-desc">Review your quest and deposit funds</div>
                            </div>
                            <div className="accordion-step-right">
                                <span className="accordion-step-counter">Step 4 of 4</span>
                                <span className="accordion-step-hint">{tab === "preview" ? "" : "Review & fund"}</span>
                            </div>
                        </div>
                        {tab === "preview" && (
                        <div className="accordion-step-body"><div className="accordion-step-body-inner">
                            {/* Header badges */}
                            <div className="page-header-meta" style={{ marginBottom: 16 }}>
                                <span className="badge badge-draft">draft</span>
                                <span>·</span>
                                <span className={`badge badge-${form.type === "FCFS" ? "fcfs" : form.type === "LEADERBOARD" ? "leaderboard" : "luckydraw"}`}>
                                    {form.type === "LUCKY_DRAW" ? "Lucky Draw" : form.type === "LEADERBOARD" ? "Leaderboard" : "FCFS"}
                                </span>
                                <span>·</span>
                                <span className={`badge ${form.rail === "fiat" ? "badge-fiat" : "badge-crypto"}`}>
                                    {tokenLabel}
                                </span>
                                <span>·</span>
                                <span>by <strong>you</strong></span>
                            </div>

                            {/* Description */}
                            <div className="description">
                                <div className="section-title">About this Quest</div>
                                <p>{form.description || <span style={{ color: "var(--fg-muted)", fontStyle: "italic" }}>No description provided</span>}</p>
                            </div>

                            {/* Reward grid */}
                            <div className="reward-grid">
                                <div className="reward-item">
                                    <div className="reward-item-label">total reward</div>
                                    <div className="reward-item-value green mono">
                                        {activeTotal > 0 ? activeTotal.toLocaleString() : "—"} {tokenLabel}
                                    </div>
                                </div>
                                <div className="reward-item">
                                    <div className="reward-item-label">total slots</div>
                                    <div className="reward-item-value">{activeWinners}</div>
                                </div>
                                <div className="reward-item">
                                    <div className="reward-item-label">per winner</div>
                                    <div className="reward-item-value green mono">
                                        {form.type === "LEADERBOARD"
                                            ? `${lbPayouts[0]?.toFixed(2) ?? "0.00"} ${tokenLabel} (#1)`
                                            : `${perWinner} ${tokenLabel}`}
                                    </div>
                                </div>
                                <div className="reward-item">
                                    <div className="reward-item-label">duration</div>
                                    <div className="reward-item-value">
                                        {durationDays !== null && durationDays > 0 ? `${durationDays} day${durationDays === 1 ? "" : "s"}` : "—"}
                                    </div>
                                </div>
                            </div>

                            {/* Human Tasks */}
                            {humanTasks.length > 0 && (
                                <div className="actor-section human" style={{ marginTop: 16 }}>
                                    <div className="actor-section-title">
                                        Human Tasks
                                        <span className="actor-badge human">HUMAN</span>
                                        <span className="hint">Complete these yourself</span>
                                    </div>
                                    {humanTasks.map((task, i) => (
                                        <div key={i} className="task-card">
                                            <div className="task-card-row">
                                                <span className="task-check"></span>
                                                <span className="task-card-label">
                                                    <span className="task-num">#{i + 1}</span>
                                                    {task.action}
                                                    {task.chips.length > 0 && (
                                                        <span style={{ color: "var(--fg-muted)", fontWeight: 400, marginLeft: 6, fontSize: 11 }}>
                                                            ({task.chips.length} {task.chips.length === 1 ? "item" : "items"})
                                                        </span>
                                                    )}
                                                </span>
                                                <span className="badge badge-social">{task.platform}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Agent Tasks */}
                            {requiredSkills.length > 0 && (
                                <div className="actor-section agent" style={{ marginTop: humanTasks.length > 0 ? 10 : 16 }}>
                                    <div className="actor-section-title">
                                        Agent Tasks
                                        <span className="actor-badge agent">AGENT</span>
                                        <span className="hint">Your AI agent handles these</span>
                                    </div>
                                    {requiredSkills.map((skill) => (
                                        <div key={skill.id} className="task-card">
                                            <div className="task-card-row">
                                                <span className="task-check"></span>
                                                <span className="task-card-label">
                                                    Requires skill: <code style={{ fontSize: 11, background: "var(--code-bg, #f5f5f5)", padding: "1px 4px", borderRadius: 2 }}>{skill.name}</code>
                                                </span>
                                                <span className="badge badge-skill">Skill</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* No tasks fallback */}
                            {humanTasks.length === 0 && requiredSkills.length === 0 && (
                                <div style={{ padding: "16px 0", color: "var(--fg-muted)", fontSize: 13 }}>
                                    No tasks defined. Go back to the Tasks step to add human or agent tasks.
                                </div>
                            )}

                            {/* Payment Summary */}
                            <div className="payment-summary">
                                <div className="payment-summary-header">Payment Summary</div>
                                <div className="payment-summary-body">
                                    <div className="preview-row">
                                        <span className="label">Payment</span>
                                        <span className="value">{form.rail === "crypto" ? "Crypto" : "Fiat (Stripe)"}</span>
                                    </div>
                                    {form.rail === "crypto" && (
                                        <div className="preview-row">
                                            <span className="label">Network</span>
                                            <span className="value">{form.network}</span>
                                        </div>
                                    )}
                                    <div className="preview-row">
                                        <span className="label">Token</span>
                                        <span className="value">{tokenLabel}</span>
                                    </div>
                                    <div className="preview-row">
                                        <span className="label">Winners</span>
                                        <span className="value">
                                            {form.type === "LEADERBOARD" ? `${lbWinnersNum} spots` : activeWinners}
                                        </span>
                                    </div>
                                    <div className="preview-row">
                                        <span className="label">Per winner</span>
                                        <span className="value green">
                                            {form.type === "LEADERBOARD"
                                                ? `${lbPayouts[0]?.toFixed(2) ?? "0.00"} ${tokenLabel} (#1)`
                                                : `${perWinner} ${tokenLabel}`}
                                        </span>
                                    </div>
                                    <div className="preview-total">
                                        <span>Total Fund</span>
                                        <span className="value">
                                            {activeTotal > 0 ? `${activeTotal.toFixed(2)} ${tokenLabel}` : "\u2014"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Pay With */}
                            <div className="pay-with-section">
                                <div className="pay-with-title">Pay with</div>
                                {form.rail === "crypto" ? (
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                                        <span style={{ fontSize: 20 }}>{"\uD83D\uDD17"}</span>
                                        <div>
                                            <div style={{ fontSize: 12, fontWeight: 600 }}>Smart Contract Escrow</div>
                                            <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>
                                                {form.network} {"\u00b7"} {tokenLabel}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="token-display" style={{ marginBottom: 8 }}>
                                            <div className="token-icon" style={{ background: "#635bff" }}>S</div>
                                            <div className="token-info">
                                                <div className="token-name">Pay via Stripe</div>
                                                <div className="token-contract" style={{ fontFamily: "var(--font)" }}>
                                                    Card {"\u00b7"} Apple Pay {"\u00b7"} Google Pay
                                                </div>
                                            </div>
                                        </div>
                                        <div className="fund-coming-soon">Stripe integration coming soon</div>
                                    </>
                                )}
                            </div>

                            {/* Mutation error */}
                            {mutation.isError && (
                                <div style={{ marginTop: 16, padding: "10px 12px", background: "var(--red-bg)", border: "1px solid var(--red)", borderRadius: 3, fontSize: 12, color: "var(--red)" }}>
                                    {(mutation.error as Error).message}
                                </div>
                            )}

                            <div className="tab-nav-row">
                                <button className="btn btn-secondary" onClick={() => setTab("reward")}>{"\u2190"} Reward</button>
                                <div style={{ display: "flex", gap: 8 }}>
                                    {isFunded ? (
                                        <>
                                            <button
                                                className={`btn ${rewardIncreased ? "btn-secondary" : "btn-primary"}`}
                                                disabled={mutation.isPending}
                                                onClick={() => { fundAfterSave.current = false; mutation.mutate() }}
                                            >
                                                {mutation.isPending && !fundAfterSave.current
                                                    ? "Saving\u2026"
                                                    : "Update Quest"}
                                            </button>
                                            {rewardIncreased && form.rail === "crypto" && (
                                                <button
                                                    className="btn btn-primary"
                                                    disabled={mutation.isPending}
                                                    onClick={() => { fundAfterSave.current = true; mutation.mutate() }}
                                                >
                                                    {mutation.isPending && fundAfterSave.current
                                                        ? "Saving\u2026"
                                                        : `Update & Fund Difference (+${topUpAmount.toFixed(2)} ${tokenLabel}) \u2192`}
                                                </button>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                className={`btn ${form.rail === "crypto" ? "btn-secondary" : "btn-primary"}`}
                                                disabled={mutation.isPending}
                                                onClick={() => { fundAfterSave.current = false; mutation.mutate() }}
                                            >
                                                {mutation.isPending && !fundAfterSave.current
                                                    ? "Saving\u2026"
                                                    : isEditMode ? (isScheduled ? "Update Quest" : "Update Draft") : "Save Draft"}
                                            </button>
                                            {form.rail === "crypto" && (
                                                <button
                                                    className="btn btn-primary"
                                                    disabled={mutation.isPending}
                                                    onClick={() => { fundAfterSave.current = true; mutation.mutate() }}
                                                >
                                                    {mutation.isPending && fundAfterSave.current
                                                        ? "Saving\u2026"
                                                        : isEditMode ? "Update & Fund Now \u2192" : "Save & Fund Now \u2192"}
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="payment-note">
                                {isFunded && rewardIncreased
                                    ? `Top-up: +${topUpAmount.toFixed(2)} ${tokenLabel} will be deposited to escrow.`
                                    : isFunded
                                        ? "Quest is funded. Changes will be saved without additional deposit."
                                        : form.rail === "crypto"
                                            ? "Funds held in escrow. Skill tasks verified via CQ Skill proof. Social tasks verified via platform API."
                                            : isEditMode
                                                ? "Quest updated as draft. Fund later to go live."
                                                : "Quest saved as draft. Fund later to go live."}
                            </div>
                        </div></div>
                        )}
                    </div>

              </div>{/* /accordion-stepper */}
            </div>
        </div>
    )
}
