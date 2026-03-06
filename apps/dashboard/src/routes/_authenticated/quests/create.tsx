import { useState, useRef, useEffect } from "react"
import { useNavigate, Link } from "@tanstack/react-router"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useAuth } from "@/context/AuthContext"
import { useSkillSearch, isSkillUrl, fetchSkillFromUrl, type ClawHubSkill } from "@/hooks/useSkillSearch"
import { useDraftPersistence } from "@/hooks/use-draft-persistence"
import { useSocialValidation, type ChipStatus } from "@/hooks/use-social-validation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { PageTitle } from "@/components/page-title"
import { StepDetails } from "./create-quest/StepDetails"
import { StepTasks } from "./create-quest/StepTasks"
import { StepReward } from "./create-quest/StepReward"
import { StepPreview } from "./create-quest/StepPreview"
import { getTokenSymbol } from "./create-quest/constants"

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000"
const ESCROW_NETWORK_MODE = import.meta.env.VITE_ESCROW_NETWORK_MODE ?? "testnet"
const IS_TESTNET = ESCROW_NETWORK_MODE === "testnet"

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
    // Funding method (auto-set based on rail)
    fundingMethod?: "crypto" | "stripe"
}

// ─── Default network (testnet vs mainnet) ─────────────────────────────────────
const DEFAULT_NETWORK = IS_TESTNET ? "Base Sepolia" : "Base"

// ─── Platform / action data ────────────────────────────────────────────────────

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
                    tasks.push({
                        id: crypto.randomUUID(), platform, actionType: "follow_account",
                        label: `Follow @${chip.replace(/^@/, "")}`,
                        params: { username: chip.replace(/^@/, "").trim() }, requireTagFriends: false
                    })
                }
                break
            case "like_post":
            case "repost":
                for (const chip of entry.chips) {
                    tasks.push({
                        id: crypto.randomUUID(), platform, actionType: entry.actionType,
                        label: `${entry.actionType === "like_post" ? "Like" : "Repost"} post`,
                        params: { postUrl: chip.trim() }, requireTagFriends: false
                    })
                }
                break
            case "post":
                tasks.push({
                    id: crypto.randomUUID(), platform, actionType: "post",
                    label: entry.action, params: { content: (entry.params.content ?? "").trim() },
                    requireTagFriends: entry.requireTagFriends ?? false
                })
                break
            case "quote_post":
                if (entry.chips.length > 0)
                    tasks.push({
                        id: crypto.randomUUID(), platform, actionType: "quote_post",
                        label: entry.action, params: {
                            postUrl: entry.chips[0].trim(),
                            ...(entry.params.content ? { content: entry.params.content.trim() } : {})
                        },
                        requireTagFriends: entry.requireTagFriends ?? false
                    })
                break
            case "join_server":
                if (entry.chips.length > 0)
                    tasks.push({
                        id: crypto.randomUUID(), platform, actionType: "join_server",
                        label: entry.action, params: { inviteUrl: entry.chips[0].trim() },
                        requireTagFriends: false
                    })
                break
            case "verify_role":
                if (entry.chips.length > 0)
                    tasks.push({
                        id: crypto.randomUUID(), platform, actionType: "verify_role",
                        label: entry.action, params: {
                            inviteUrl: entry.chips[0].trim(),
                            guildId: (entry.params.guildId ?? "").trim(),
                            roleId: (entry.params.roleId ?? "").trim(),
                            roleName: (entry.params.roleName ?? entry.params.role ?? "").trim()
                        }, requireTagFriends: false
                    })
                break
            case "join_channel":
                if (entry.chips.length > 0)
                    tasks.push({
                        id: crypto.randomUUID(), platform, actionType: "join_channel",
                        label: entry.action, params: { channelUrl: entry.chips[0].trim() },
                        requireTagFriends: false
                    })
                break
        }
    }
    return tasks
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
        <div>
            {chips.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {chips.map((chip, i) => {
                        const status = chipStatus?.(chip)
                        return (
                            <span key={i} className={cn(
                                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs border leading-tight",
                                status === "pending" ? "bg-muted border-border"
                                    : status === "invalid" ? "bg-error-light border-warning"
                                        : "bg-accent-light border-accent-border text-foreground"
                            )}>
                                {status === "pending"
                                    ? <span className="inline-block size-2.5 border-[1.5px] border-border border-t-muted-foreground rounded-full animate-spin" />
                                    : status === "invalid"
                                        ? <span className="text-warning text-xs font-bold">⚠</span>
                                        : <span className="text-success text-xs font-bold">✓</span>}
                                <span className="font-mono text-xs">{formatChip ? formatChip(chip) : chip}</span>
                                <button className="bg-transparent border-none text-muted-foreground text-base cursor-pointer px-px leading-none ml-0.5 hover:text-destructive" onClick={() => onRemove(i)}>×</button>
                            </span>
                        )
                    })}
                </div>
            )}
            {!atMax && (
                <input
                    className={cn("flex h-9 w-full rounded border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 chip-input", displayError && "border-destructive focus-visible:ring-destructive")}
                    type="text"
                    placeholder={chips.length > 0 ? "Add another… ↵" : placeholder}
                    value={input}
                    onChange={e => { setInput(e.target.value); setError(null) }}
                    onKeyDown={handleKeyDown}
                />
            )}
            {!atMax && !displayError && input.length === 0 && chips.length === 0 && (
                <div className="text-xs text-muted-foreground mb-1 leading-snug" style={{ marginTop: 2 }}>Press ↵ Enter to confirm</div>
            )}
            {displayError && <div className="text-xs text-destructive mt-0.5 leading-snug">{displayError}</div>}
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
            <div className="flex items-center gap-2 px-2.5 py-2 bg-indigo-50 border border-indigo-300 rounded text-xs text-foreground mb-2">
                <span>🤖</span>
                <span style={{ flex: 1 }}>
                    {botPresent === true && guildName
                        ? <>Bot is in <strong>{guildName}</strong> — roles loaded.</>
                        : <>Add the <strong>ClawQuest bot</strong> to your server to enable role verification.</>}
                </span>
                {botPresent !== true && (
                    <Button size="sm" onClick={handleInviteBot}>Invite Bot</Button>
                )}
                {botPresent === false && (
                    <Button variant="ghost" size="sm" className="ml-1" onClick={handleRefresh}>Refresh</Button>
                )}
            </div>
            <div className="space-y-1.5 mb-3.5" style={{ marginBottom: 8 }}>
                <Label>Discord Server URL</Label>
                <div className="text-xs text-muted-foreground mb-1 leading-snug">Invite link. Press ↵ to confirm.</div>
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
                {loading && <div className="text-xs text-muted-foreground mb-1 leading-snug" style={{ color: "var(--accent)" }}>Checking server...</div>}
                {error && <div className="text-xs text-destructive mt-0.5 leading-snug">{error}</div>}
            </div>
            <div className="space-y-1.5 mb-3.5" style={{ marginBottom: 0 }}>
                <Label>Required Role</Label>
                <div className="text-xs text-muted-foreground mb-1 leading-snug">
                    {botPresent === true ? "Select a role from the server." : "Invite the bot first to load roles."}
                </div>
                <select
                    className={cn("flex h-9 w-full rounded border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring", fieldError("role") && "border-destructive focus-visible:ring-destructive")}
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
                {fieldError("role") && <div className="text-xs text-destructive mt-0.5 leading-snug">{fieldError("role")}</div>}
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
        <div className="block px-3 py-2.5">
            {(fields === "follow") && (
                <div className="space-y-1.5 mb-0">
                    <Label>X Usernames</Label>
                    <div className="text-xs text-muted-foreground mb-1 leading-snug">Add accounts the human must follow. Press ↵ to confirm each.</div>
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
                <div className="space-y-1.5 mb-0">
                    <Label>Post URLs</Label>
                    <div className="text-xs text-muted-foreground mb-1 leading-snug">Add X post URLs. Press ↵ to confirm each.</div>
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
                    <div className="space-y-1.5 mb-3.5" style={{ marginBottom: 8 }}>
                        <Label>Post Template</Label>
                        <div className="text-xs text-muted-foreground mb-1 leading-snug">Provide a template or required content. User can customize around it.</div>
                        <div className="relative">
                            <Textarea
                                className={cn(fieldError("content") && "border-destructive focus-visible:ring-destructive")}
                                rows={3}
                                placeholder="Write the required post content, hashtags, or mentions..."
                                value={task.params["content"] ?? ""}
                                onChange={e => setTaskParam(idx, "content", e.target.value)}
                                maxLength={280}
                            />
                            <span className="absolute bottom-1.5 right-2 text-xs text-muted-foreground font-mono pointer-events-none">{(task.params["content"] ?? "").length}/280</span>
                        </div>
                        {fieldError("content") && <div className="text-xs text-destructive mt-0.5 leading-snug">{fieldError("content")}</div>}
                    </div>
                    <div className="flex items-center justify-between py-1.5 text-xs text-foreground">
                        <span>Require tagging 3 friends</span>
                        <Switch
                            checked={task.requireTagFriends ?? false}
                            onCheckedChange={() => toggleTagFriends(idx)}
                        />
                    </div>
                </>
            )}
            {(fields === "quote_post") && (
                <>
                    <div className="space-y-1.5 mb-3.5" style={{ marginBottom: 8 }}>
                        <Label>Post URL</Label>
                        <div className="text-xs text-muted-foreground mb-1 leading-snug">Link to the X post to quote. Press ↵ to confirm.</div>
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
                    <div className="space-y-1.5 mb-3.5" style={{ marginBottom: 8 }}>
                        <Label>Quote Template</Label>
                        <div className="text-xs text-muted-foreground mb-1 leading-snug">Provide required content for the quote (hashtags, links, etc.).</div>
                        <div className="relative">
                            <Textarea
                                rows={2}
                                placeholder="Write the required quote content..."
                                value={task.params["content"] ?? ""}
                                onChange={e => setTaskParam(idx, "content", e.target.value)}
                                maxLength={280}
                            />
                            <span className="absolute bottom-1.5 right-2 text-xs text-muted-foreground font-mono pointer-events-none">{(task.params["content"] ?? "").length}/280</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between py-1.5 text-xs text-foreground">
                        <span>Require tagging 3 friends</span>
                        <Switch
                            checked={task.requireTagFriends ?? false}
                            onCheckedChange={() => toggleTagFriends(idx)}
                        />
                    </div>
                </>
            )}
            {(fields === "discord_join") && (
                <div className="space-y-1.5 mb-0">
                    <Label>Discord Server URL</Label>
                    <div className="text-xs text-muted-foreground mb-1 leading-snug">Invite link to the Discord server. Press ↵ to confirm.</div>
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
                <div className="space-y-1.5 mb-0">
                    <Label>Telegram Group / Channel</Label>
                    <div className="text-xs text-muted-foreground mb-1 leading-snug">Username or invite link. Press ↵ to confirm.</div>
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
                    <div className="text-xs text-muted-foreground mb-1 leading-snug" style={{ marginTop: 6 }}>
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
        rail: "crypto", network: DEFAULT_NETWORK, token: "USDC", type: "FCFS",
        total: "100.00", winners: "50",
        drawTime: "",
        fundingMethod: "crypto",
    })
    const [activePlatform, setActivePlatform] = useState<string | null>(null)
    const [humanTasks, setHumanTasks] = useState<SocialEntry[]>([])
    const [expandedTask, setExpandedTask] = useState<number | null>(null)
    const [requiredSkills, setRequiredSkills] = useState<Pick<ClawHubSkill, "id" | "name" | "desc" | "agents" | "version">[]>([])
    const [requireVerified, setRequireVerified] = useState(false)
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
        // Determine fundingMethod from existing quest or default based on rail
        const fundingMethod = editQuest.fundingMethod || (isFiat ? "stripe" : "crypto")

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
            fundingMethod: fundingMethod as "crypto" | "stripe",
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
        if (editQuest.requireVerified) setRequireVerified(true)

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
        if (expandedDescs.has(id)) return <>{text} <span className="text-primary cursor-pointer text-xs font-medium ml-0.5 hover:underline" onClick={(e) => toggleDesc(id, e)}>less</span></>
        return <>{text.slice(0, 250).trimEnd()}… <span className="text-primary cursor-pointer text-xs font-medium ml-0.5 hover:underline" onClick={(e) => toggleDesc(id, e)}>more</span></>
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
    const addedSkillIds = new Set(requiredSkills.map(s => s.id))
    const addSkill = (s: ClawHubSkill) => {
        if (addedSkillIds.has(s.id)) return
        setRequiredSkills(prev => [...prev, { id: s.id, name: s.name, desc: s.desc, agents: s.agents, version: s.version }])
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

            // Always calculate fundingMethod from current rail value
            const fundingMethod: "crypto" | "stripe" = form.rail === "fiat" ? "stripe" : "crypto"

            const payload: any = {
                title: form.title,
                description: form.description || undefined,
                type: form.type,
                rewardType: form.rail === "fiat" ? "USD" : form.token,
                rewardAmount: total,
                totalSlots: slots,
                requiredSkills: requiredSkills.map(s => s.id),
                requireVerified,
                tasks,
                expiresAt: form.endAt ? new Date(form.endAt).toISOString() : undefined,
                startAt: form.startAt ? new Date(form.startAt).toISOString() : undefined,
                network: form.network || undefined,
                drawTime: form.drawTime ? new Date(form.drawTime).toISOString() : undefined,
                fundingMethod,
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
    const tokenLabel = getTokenSymbol(form.rail, form.token, form.network)

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
                <nav className="flex items-center gap-1.5 py-3 text-xs text-muted-foreground">
                    <Link to="/quests/$questId" params={{ questId: editQuestId! }}>Quest</Link>
                    <span>›</span>
                    <span>Edit</span>
                </nav>
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
                        <Button asChild variant="secondary">
                            <Link to="/quests/$questId" params={{ questId: editQuestId! }}>View Quest</Link>
                        </Button>
                        {editQuest.status === "live" && (
                            <Button asChild>
                                <Link to="/quests/$questId/manage" params={{ questId: editQuestId! }}>Manage Quest</Link>
                            </Button>
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
        <div className="">
            <nav className="flex items-center gap-1.5 py-3 text-xs text-muted-foreground">
                {isEditMode ? (
                    <>
                        <Link to="/quests/$questId" params={{ questId: editQuestId! }}>Quest</Link>
                        <span>›</span>
                        <span>{editLabel}</span>
                    </>
                ) : (
                    <>
                        <Link to="/dashboard">Dashboard</Link>
                        <span>›</span>
                        <span>Create Quest</span>
                    </>
                )}
            </nav>
            <div className="flex justify-between items-end py-5 pb-3 border-b border-border mb-0" style={{ marginBottom: 20 }}>
                <PageTitle
                    title={isEditMode ? editLabel : "Create a Quest"}
                    description={isEditMode
                        ? isScheduled
                            ? "Update your scheduled quest before it goes live."
                            : "Update your draft quest details, rewards, and tasks."
                        : "Fund a quest for agents to execute. Pay with crypto or fiat."}
                />
            </div>

            <div className=" w-full flex flex-col items-center">
                <div className="w-full">
                    {/* {restoredBanner && (
                        <div className="w-full bg-info-light border border-info rounded px-4 py-2 flex justify-between 
                        items-center mb-4 text-base text-foreground">
                            <span>Draft restored from local backup</span>
                            <Button size="sm" onClick={() => setRestoredBanner(false)}>Dismiss</Button>
                        </div>
                    )} */}
                    <div className="relative">

                        {/* ══ STEP 1: DETAILS ══ */}
                        <StepDetails
                            isActive={tab === "details"}
                            isDone={tabDone.details && tab !== "details"}
                            form={{
                                title: form.title,
                                description: form.description,
                                startAt: form.startAt,
                                endAt: form.endAt,
                            }}
                            stepSummary={stepSummaries.details}
                            onToggle={() => setTab(tab === "details" ? null : "details")}
                            onFieldChange={(key, value) => set(key, value)}
                            onNext={() => setTab("tasks")}
                        />

                        {/* ══ STEP 2: TASKS ══ */}
                        <StepTasks
                            isActive={tab === "tasks"}
                            isDone={tabDone.tasks && tab !== "tasks"}
                            isFuture={TABS.indexOf(tab as Tab) < TABS.indexOf("tasks") && !tabDone.tasks}
                            stepSummary={stepSummaries.tasks}
                            activePlatform={activePlatform}
                            expandedTask={expandedTask}
                            humanTasks={humanTasks}
                            requiredSkills={requiredSkills}
                            skillSearch={skillSearch}
                            skillSearchResults={skillSearchResults}
                            skillSearchLoading={skillSearchLoading}
                            showSkillResults={showSkillResults}
                            urlFetching={urlFetching}
                            urlPreview={urlPreview}
                            urlFetchError={urlFetchError}
                            taskErrors={taskErrors}
                            addedSkillIds={addedSkillIds}
                            expandedDescs={expandedDescs}
                            onToggle={() => setTab(tab === "tasks" ? null : "tasks")}
                            onSetActivePlatform={setActivePlatform}
                            onAddHumanTask={addHumanTask}
                            onRemoveHumanTask={removeHumanTask}
                            onSetExpandedTask={setExpandedTask}
                            onSetTaskParam={setTaskParam}
                            onToggleTagFriends={toggleTagFriends}
                            onAddChip={addChip}
                            onRemoveChip={removeChip}
                            onSetSkillSearch={setSkillSearch}
                            onSetShowSkillResults={setShowSkillResults}
                            onAddSkill={addSkill}
                            onRemoveSkill={removeSkill}
                            onSetUrlFetching={setUrlFetching}
                            onSetUrlPreview={setUrlPreview}
                            onSetUrlFetchError={setUrlFetchError}
                            onToggleDesc={(id) => {
                                setExpandedDescs(prev => {
                                    const next = new Set(prev)
                                    if (next.has(id)) next.delete(id)
                                    else next.add(id)
                                    return next
                                })
                            }}
                            onTruncateDesc={truncateDesc}
                            onChipStatus={(platform, actionType, value) => socialValidation.getStatus(platform, actionType, value)}
                            onPrevious={() => setTab("details")}
                            onNext={() => setTab("reward")}
                            SocialEntryBody={SocialEntryBody}
                            isSkillUrl={isSkillUrl}
                            fetchSkillFromUrl={fetchSkillFromUrl}
                            requireVerified={requireVerified}
                            onSetRequireVerified={setRequireVerified}
                        />

                        {/* ══ STEP 3: REWARD ══ */}
                        <StepReward
                            isActive={tab === "reward"}
                            isDone={tabDone.reward && tab !== "reward"}
                            isFuture={TABS.indexOf(tab as Tab) < TABS.indexOf("reward") && !tabDone.reward}
                            form={{
                                rail: form.rail,
                                network: form.network,
                                token: form.token,
                                type: form.type,
                                total: form.total,
                                winners: form.winners,
                                drawTime: form.drawTime,
                            }}
                            stepSummary={stepSummaries.reward}
                            onToggle={() => setTab(tab === "reward" ? null : "reward")}
                            onFieldChange={(key, value) => {
                                if (key === "rail") {
                                    const fundingMethod: "crypto" | "stripe" = value === "fiat" ? "stripe" : "crypto"
                                    setForm(prev => ({ ...prev, rail: value as PaymentRail, fundingMethod }))
                                } else if (key === "type") {
                                    setForm(prev => {
                                        if (value === "LEADERBOARD") {
                                            const n = parseInt(prev.winners) || 2
                                            return { ...prev, type: value as QuestType, winners: String(Math.min(100, Math.max(2, n))) }
                                        }
                                        return { ...prev, type: value as QuestType }
                                    })
                                } else {
                                    set(key, value as string)
                                }
                            }}
                            onNext={() => setTab("preview")}
                            onPrevious={() => setTab("tasks")}
                        />

                        {/* ══ STEP 4: PREVIEW & FUND ══ */}
                        <StepPreview
                            isActive={tab === "preview"}
                            isFuture={TABS.indexOf(tab as Tab) < TABS.indexOf("preview")}
                            form={{
                                title: form.title,
                                description: form.description,
                                startAt: form.startAt,
                                endAt: form.endAt,
                                rail: form.rail,
                                network: form.network,
                                token: form.token,
                                type: form.type,
                                total: form.total,
                                winners: form.winners,
                            }}
                            humanTasks={humanTasks}
                            requiredSkills={requiredSkills}
                            isEditMode={isEditMode}
                            isScheduled={isScheduled}
                            isFunded={isFunded}
                            rewardIncreased={rewardIncreased}
                            topUpAmount={topUpAmount}
                            mutation={{
                                isPending: mutation.isPending,
                                isError: mutation.isError,
                                error: mutation.error as Error | null,
                            }}
                            onToggle={() => setTab(tab === "preview" ? null : "preview")}
                            onPrevious={() => setTab("reward")}
                            onSaveDraft={() => { fundAfterSave.current = false; mutation.mutate() }}
                            onSaveAndFund={() => { fundAfterSave.current = true; mutation.mutate() }}
                            onUpdate={() => { fundAfterSave.current = false; mutation.mutate() }}
                            onUpdateAndFund={() => { fundAfterSave.current = true; mutation.mutate() }}
                        />

                    </div>
                </div>
            </div>
        </div>
    )
}
