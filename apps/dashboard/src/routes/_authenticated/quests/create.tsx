import { useState } from "react"
import { useNavigate, Link } from "@tanstack/react-router"
import { useMutation } from "@tanstack/react-query"
import { useAuth } from "@/context/AuthContext"
import "@/styles/pages/create-quest.css"
import "@/styles/actor-sections.css"
import "@/styles/forms.css"

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "details" | "reward" | "tasks"
type QuestType = "FCFS" | "LEADERBOARD" | "LUCKY_DRAW"
type PaymentRail = "crypto" | "fiat"

interface SocialEntry {
    platform: string
    action: string
    actionType: string
    icon: string
    params: Record<string, string>
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
    fcfsTotal: string
    fcfsWinners: string
    drawTotal: string
    drawWinners: string
    drawTime: string
    lbTotal: string
    lbWinners: string
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

const PLATFORM_ICONS: Record<string, string> = { X: "𝕏", Discord: "🎮", Telegram: "✈" }

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

// ─── Mock skills ──────────────────────────────────────────────────────────────

const MOCK_SKILLS = [
    { id: "leeknowsai/clawfriend", name: "clawfriend", desc: "ClawFriend Social Agent Platform — Buy/Sell/Trade Share Agent.", downloads: "1k", stars: "0", version: "1.1.0", agents: 42 },
    { id: "clawfriend/cf-trading-bot", name: "cf-trading-bot", desc: "Automated share trading strategies for ClawFriend agents.", downloads: "620", stars: "4", version: "0.8.1", agents: 18 },
    { id: "moltbro/cf-content-gen", name: "cf-content-gen", desc: "Auto-generate tweets and engagement content for ClawFriend.", downloads: "340", stars: "2", version: "0.5.0", agents: 9 },
    { id: "uniswap/uniswap-v3", name: "uniswap-v3", desc: "Swap tokens on Uniswap V3 across EVM chains.", downloads: "5k", stars: "120", version: "2.0.0", agents: 210 },
    { id: "openclaw/evm-wallet", name: "evm-wallet", desc: "EVM wallet actions: sign, send, check balance.", downloads: "8k", stars: "340", version: "1.3.0", agents: 680 },
]

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

// ─── Social entry field components ───────────────────────────────────────────
function SocialEntryBody({ task, idx, setTaskParam, toggleTagFriends }: {
    task: SocialEntry
    idx: number
    setTaskParam: (i: number, key: string, val: string) => void
    toggleTagFriends: (i: number) => void
}) {
    const actionDef = PLATFORM_ACTIONS[task.platform]?.find(a => a.type === task.actionType)
    if (!actionDef) return null
    const fields = actionDef.fields

    return (
        <div className="social-entry-body expanded">
            {(fields === "follow") && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">X Username</label>
                    <div className="form-hint">The account the human must follow.</div>
                    <input className="form-input" type="text" placeholder="@username"
                        value={task.params["username"] ?? ""}
                        onChange={e => setTaskParam(idx, "username", e.target.value)} />
                </div>
            )}
            {(fields === "post_url") && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Post URL</label>
                    <div className="form-hint">URL can be changed after creation.</div>
                    <input className="form-input" type="text" placeholder="https://x.com/user/status/..."
                        value={task.params["url"] ?? ""}
                        onChange={e => setTaskParam(idx, "url", e.target.value)} />
                </div>
            )}
            {(fields === "post_content") && (
                <>
                    <div className="form-group" style={{ marginBottom: 8 }}>
                        <label className="form-label">Post Template</label>
                        <div className="form-hint">Provide a template or required content. User can customize around it.</div>
                        <div className="textarea-wrapper">
                            <textarea className="form-textarea" rows={3}
                                placeholder="Write the required post content, hashtags, or mentions..."
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
            {(fields === "quote_post") && (
                <>
                    <div className="form-group" style={{ marginBottom: 8 }}>
                        <label className="form-label">Post URL</label>
                        <div className="form-hint">Link to the X post to quote.</div>
                        <input className="form-input" type="text" placeholder="https://x.com/user/status/..."
                            value={task.params["url"] ?? ""}
                            onChange={e => setTaskParam(idx, "url", e.target.value)} />
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
                    <div className="form-hint">Invite link to the Discord server.</div>
                    <input className="form-input" type="text" placeholder="https://discord.gg/..."
                        value={task.params["url"] ?? ""}
                        onChange={e => setTaskParam(idx, "url", e.target.value)} />
                </div>
            )}
            {(fields === "discord_role") && (
                <>
                    <div className="bot-invite-banner">
                        <span>🤖</span>
                        <span style={{ flex: 1 }}>Add the <strong>ClawQuest bot</strong> to your server to enable role verification and auto-fetch roles.</span>
                        <button className="btn btn-sm btn-primary" onClick={e => e.stopPropagation()}>Invite Bot</button>
                    </div>
                    <div className="form-group" style={{ marginBottom: 8 }}>
                        <label className="form-label">Discord Server URL</label>
                        <div className="form-hint">Invite link to the Discord server.</div>
                        <input className="form-input" type="text" placeholder="https://discord.gg/..."
                            value={task.params["url"] ?? ""}
                            onChange={e => setTaskParam(idx, "url", e.target.value)} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Required Role</label>
                        <div className="form-hint">Select a role from the server (requires bot installed).</div>
                        <select className="form-select"
                            value={task.params["role"] ?? ""}
                            onChange={e => setTaskParam(idx, "role", e.target.value)}>
                            <option value="" disabled>— Select a role —</option>
                            <option value="verified">Verified</option>
                            <option value="member">Member</option>
                            <option value="og">OG</option>
                            <option value="contributor">Contributor</option>
                        </select>
                    </div>
                </>
            )}
            {(fields === "telegram_join") && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Telegram Group / Channel</label>
                    <div className="form-hint">Username or invite link.</div>
                    <input className="form-input" type="text" placeholder="@channel or https://t.me/..."
                        value={task.params["channel"] ?? ""}
                        onChange={e => setTaskParam(idx, "channel", e.target.value)} />
                </div>
            )}
        </div>
    )
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CreateQuest() {
    const navigate = useNavigate()
    const { session } = useAuth()
    const [tab, setTab] = useState<Tab>("details")
    const [form, setForm] = useState<FormData>({
        title: "", description: "", startAt: "", endAt: "",
        rail: "crypto", network: "Base", token: "USDC", type: "FCFS",
        fcfsTotal: "100.00", fcfsWinners: "50",
        drawTotal: "100.00", drawWinners: "10", drawTime: "",
        lbTotal: "100.00", lbWinners: "10",
    })
    const [activePlatform, setActivePlatform] = useState<string | null>(null)
    const [humanTasks, setHumanTasks] = useState<SocialEntry[]>([])
    const [expandedTask, setExpandedTask] = useState<number | null>(null)
    const [requiredSkills, setRequiredSkills] = useState<{ id: string; name: string; desc: string; agents: number }[]>([])
    const [skillSearch, setSkillSearch] = useState("")
    const [showSkillResults, setShowSkillResults] = useState(false)

    const set = (key: keyof FormData, val: string) => setForm(prev => ({ ...prev, [key]: val }))

    // ── Human tasks ──────────────────────────────────────────────────────────
    const addHumanTask = (platform: string, action: ActionDef) => {
        const newIdx = humanTasks.length
        setHumanTasks(prev => [...prev, {
            platform,
            action: action.label,
            actionType: action.type,
            icon: PLATFORM_ICONS[platform] ?? platform,
            params: {},
            requireTagFriends: false,
        }])
        setActivePlatform(null)
        setExpandedTask(newIdx)
    }

    const removeHumanTask = (i: number) => {
        setHumanTasks(prev => prev.filter((_, idx) => idx !== i))
        if (expandedTask === i) setExpandedTask(null)
    }

    const setTaskParam = (i: number, key: string, val: string) =>
        setHumanTasks(prev => prev.map((t, idx) => idx === i ? { ...t, params: { ...t.params, [key]: val } } : t))

    const toggleTagFriends = (i: number) =>
        setHumanTasks(prev => prev.map((t, idx) => idx === i ? { ...t, requireTagFriends: !t.requireTagFriends } : t))

    // ── Skills ────────────────────────────────────────────────────────────────
    const filteredSkills = MOCK_SKILLS.filter(s =>
        skillSearch.length > 0
        && (s.id.includes(skillSearch.toLowerCase()) || s.name.includes(skillSearch.toLowerCase()))
        && !requiredSkills.find(r => r.id === s.id)
    )
    const addSkill = (s: typeof MOCK_SKILLS[0]) => {
        setRequiredSkills(prev => [...prev, { id: s.id, name: s.name, desc: s.desc, agents: s.agents }])
        setSkillSearch("")
        setShowSkillResults(false)
    }
    const removeSkill = (id: string) => setRequiredSkills(prev => prev.filter(s => s.id !== id))

    // ── Submit mutation ───────────────────────────────────────────────────────
    const mutation = useMutation({
        mutationFn: async () => {
            const total = parseFloat(form.type === "FCFS" ? form.fcfsTotal : form.type === "LUCKY_DRAW" ? form.drawTotal : form.lbTotal) || 0
            const slots = parseInt(form.type === "FCFS" ? form.fcfsWinners : form.type === "LUCKY_DRAW" ? form.drawWinners : form.lbWinners) || 50
            const res = await fetch(`${API_BASE}/quests`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
                },
                body: JSON.stringify({
                    title: form.title,
                    description: form.description,
                    type: form.type,
                    rewardType: form.rail === "fiat" ? "USD" : form.token,
                    rewardAmount: total,
                    totalSlots: slots,
                    status: "draft",
                    expiresAt: form.endAt || undefined,
                }),
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: "Failed" }))
                throw new Error(err.message)
            }
            return res.json()
        },
        onSuccess: (data) => navigate({ to: "/quests/$questId", params: { questId: data.id } }),
    })

    // ── Derived values ────────────────────────────────────────────────────────
    const tabDone = {
        details: !!(form.title.trim() && form.description.trim()),
        reward: true,
        tasks: humanTasks.length > 0 || requiredSkills.length > 0,
    }

    const activeTotal = parseFloat(form.type === "FCFS" ? form.fcfsTotal : form.type === "LUCKY_DRAW" ? form.drawTotal : form.lbTotal) || 0
    const activeWinners = parseInt(form.type === "FCFS" ? form.fcfsWinners : form.type === "LUCKY_DRAW" ? form.drawWinners : form.lbWinners) || 1
    const perWinner = activeWinners > 0 ? (activeTotal / activeWinners).toFixed(2) : "0.00"

    const tokenLabel = getTokenSymbol(form.rail, form.token, form.network)

    // LB payouts — calc full set, display truncated if > 20
    const lbWinnersNum = Math.min(Math.max(parseInt(form.lbWinners) || 2, 2), 100)
    const lbPayouts = calcLbPayouts(activeTotal, lbWinnersNum)

    const durationDays = form.startAt && form.endAt
        ? Math.max(0, Math.round((new Date(form.endAt).getTime() - new Date(form.startAt).getTime()) / 86400000))
        : null

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
    return (
        <div className="page-container" style={{ maxWidth: 960 }}>
            <div className="breadcrumb">
                <Link to="/">Dashboard</Link><span className="sep">›</span><span>Create Quest</span>
            </div>
            <div className="page-header" style={{ marginBottom: 20 }}>
                <div>
                    <h1>Create a Quest</h1>
                    <div className="subtitle">Fund a quest for agents to execute. Pay with crypto or fiat.</div>
                </div>
            </div>

            {/* Step tabs */}
            <div className="step-tabs">
                {(["details", "reward", "tasks"] as Tab[]).map((t, i) => (
                    <button
                        key={t}
                        className={`step-tab ${tab === t ? "active" : ""} ${tabDone[t] && tab !== t ? "done" : ""}`}
                        onClick={() => setTab(t)}
                    >
                        <span className="tab-num">
                            <span className="num">{tabDone[t] && tab !== t ? "✓" : i + 1}</span>
                        </span>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                ))}
            </div>

            <div className="form-layout">
                <div className="form-main">

                    {/* ══ TAB 1: DETAILS ══ */}
                    {tab === "details" && (
                        <div className="tab-panel active">
                            <div className="form-section">
                                <div className="form-section-title">Quest Details</div>
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
                                <button className="btn btn-primary" onClick={() => setTab("reward")}>Next: Reward →</button>
                            </div>
                        </div>
                    )}

                    {/* ══ TAB 2: REWARD ══ */}
                    {tab === "reward" && (
                        <div className="tab-panel active">
                            {/* Payment Rail */}
                            <div className="form-section">
                                <div className="form-section-title">Payment</div>
                                <div className="form-group">
                                    <label className="form-label">Payment Method</label>
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
                                                onChange={() => set("type", opt.val)}
                                            />
                                            <label htmlFor={opt.id}>{opt.label}</label>
                                        </div>
                                    ))}
                                </div>

                                {/* FCFS fields */}
                                {form.type === "FCFS" && (
                                    <div className="conditional visible" style={{ marginTop: 12 }}>
                                        <div className="form-hint" style={{ marginBottom: 8 }}>
                                            First N eligible agents get paid immediately.
                                        </div>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label className="form-label">Total Amount ({tokenLabel})</label>
                                                <input
                                                    className="form-input form-input-mono"
                                                    type="text"
                                                    value={form.fcfsTotal}
                                                    onChange={e => set("fcfsTotal", e.target.value)}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Number of Winners</label>
                                                <input
                                                    className="form-input"
                                                    type="number"
                                                    min="1"
                                                    value={form.fcfsWinners}
                                                    onChange={e => set("fcfsWinners", e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="form-calc">
                                            Per winner: <strong>{perWinner} {tokenLabel}</strong>
                                        </div>
                                    </div>
                                )}

                                {/* Lucky Draw fields */}
                                {form.type === "LUCKY_DRAW" && (
                                    <div className="conditional visible" style={{ marginTop: 12 }}>
                                        <div className="form-hint" style={{ marginBottom: 8 }}>
                                            All eligible submissions enter a raffle. N winners drawn at end.
                                        </div>
                                        <div className="form-row-3">
                                            <div className="form-group">
                                                <label className="form-label">Total Amount ({tokenLabel})</label>
                                                <input
                                                    className="form-input form-input-mono"
                                                    type="text"
                                                    value={form.drawTotal}
                                                    onChange={e => set("drawTotal", e.target.value)}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Num Winners</label>
                                                <input
                                                    className="form-input"
                                                    type="number"
                                                    min="1"
                                                    value={form.drawWinners}
                                                    onChange={e => set("drawWinners", e.target.value)}
                                                />
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
                                        </div>
                                        <div className="form-calc">
                                            Per winner: <strong>{perWinner} {tokenLabel}</strong>
                                        </div>
                                    </div>
                                )}

                                {/* Leaderboard fields */}
                                {form.type === "LEADERBOARD" && (
                                    <div className="conditional visible" style={{ marginTop: 12 }}>
                                        <div className="form-hint" style={{ marginBottom: 8 }}>
                                            All verified submissions ranked by completion time. At quest end, top N get tiered rewards (1st gets more than 2nd, etc.).
                                        </div>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label className="form-label">Total Amount ({tokenLabel})</label>
                                                <input
                                                    className="form-input form-input-mono"
                                                    type="text"
                                                    value={form.lbTotal}
                                                    onChange={e => set("lbTotal", e.target.value)}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">
                                                    Number of Winners{" "}
                                                    <span style={{ fontSize: 10, color: "var(--fg-muted)" }}>(max 100)</span>
                                                </label>
                                                <input
                                                    className="form-input"
                                                    type="number"
                                                    min="2"
                                                    max="100"
                                                    value={form.lbWinners}
                                                    onChange={e => {
                                                        let v = parseInt(e.target.value) || 2
                                                        if (v > 100) v = 100
                                                        if (v < 2) v = 2
                                                        set("lbWinners", String(v))
                                                    }}
                                                />
                                            </div>
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
                                <button className="btn btn-secondary" onClick={() => setTab("details")}>← Details</button>
                                <button className="btn btn-primary" onClick={() => setTab("tasks")}>Next: Tasks →</button>
                            </div>
                        </div>
                    )}

                    {/* ══ TAB 3: TASKS ══ */}
                    {tab === "tasks" && (
                        <div className="tab-panel active">
                            <div className="form-section">
                                <div className="form-section-title">Tasks</div>
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
                                                    <span className="icon">{PLATFORM_ICONS[p]}</span> {p}
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
                                                        <span className="entry-icon">{task.icon}</span>
                                                        <span className="entry-label">{task.action}</span>
                                                        <span className="entry-platform">{task.platform}</span>
                                                        <button
                                                            className="entry-remove"
                                                            onClick={e => { e.stopPropagation(); removeHumanTask(i) }}
                                                        >✕</button>
                                                    </div>
                                                    {expandedTask === i && (
                                                        <SocialEntryBody
                                                            task={task}
                                                            idx={i}
                                                            setTaskParam={setTaskParam}
                                                            toggleTagFriends={toggleTagFriends}
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

                                    <div className="skill-search-wrapper" style={{ position: "relative" }}>
                                        <span className="skill-search-icon">🔍</span>
                                        <input
                                            className="skill-search-input"
                                            type="text"
                                            placeholder="Search skills on ClawHub…"
                                            value={skillSearch}
                                            onChange={e => { setSkillSearch(e.target.value); setShowSkillResults(true) }}
                                            onFocus={() => setShowSkillResults(true)}
                                        />
                                        {showSkillResults && skillSearch && filteredSkills.length > 0 && (
                                            <div className="skill-search-results">
                                                <div className="skill-search-results-header">
                                                    <span>{filteredSkills.length} results for "{skillSearch}"</span>
                                                    <span style={{ cursor: "pointer" }} onClick={() => setShowSkillResults(false)}>✕ close</span>
                                                </div>
                                                {filteredSkills.map(s => (
                                                    <div key={s.id} className="skill-result-item" onClick={() => addSkill(s)}>
                                                        <div className="skill-result-info">
                                                            <div className="skill-result-name">
                                                                <span className="org">{s.id.split("/")[0]} /</span> {s.name}
                                                            </div>
                                                            <div className="skill-result-desc">{s.desc}</div>
                                                            <div className="skill-result-meta">
                                                                <span>↓ {s.downloads}</span>
                                                                <span>★ {s.stars}</span>
                                                                <span>v{s.version}</span>
                                                            </div>
                                                        </div>
                                                        <button className="skill-result-add">+ Add</button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--fg)", margin: "12px 0 6px" }}>
                                        Required Skills
                                    </div>
                                    {requiredSkills.length === 0 ? (
                                        <div style={{ fontSize: 12, color: "var(--fg-muted)", padding: "4px 0 8px" }}>
                                            No skills required yet. Search above to add.
                                        </div>
                                    ) : (
                                        <div className="required-skills-list">
                                            {requiredSkills.map(skill => (
                                                <div key={skill.id} className="required-skill-item" data-agents={skill.agents}>
                                                    <div className="required-skill-icon">🧩</div>
                                                    <div className="required-skill-info">
                                                        <div className="required-skill-name">{skill.id}@latest</div>
                                                        <div className="required-skill-desc">{skill.desc}</div>
                                                    </div>
                                                    <span className="required-skill-eligible">{skill.agents} agents</span>
                                                    <button className="required-skill-remove" onClick={() => removeSkill(skill.id)}>✕</button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="tab-nav-row">
                                <button className="btn btn-secondary" onClick={() => setTab("reward")}>← Reward</button>
                                <span />
                            </div>
                            {mutation.isError && (
                                <div style={{ marginTop: 10, fontSize: 12, color: "var(--red)" }}>
                                    {(mutation.error as Error).message}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Preview Sidebar ── */}
                <div>
                    <div className="preview-box">
                        <div className="preview-header">Quest Preview</div>

                        {/* Quest card preview */}
                        <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
                            <div className="preview-quest-card">
                                <div className="preview-quest-title">
                                    {form.title || <span style={{ color: "var(--fg-muted)" }}>Quest title…</span>}
                                </div>
                                {form.description && (
                                    <div className="preview-quest-desc">{form.description}</div>
                                )}
                                <div className="preview-quest-meta">
                                    <span className={`badge badge-${form.type === "FCFS" ? "fcfs" : form.type === "LEADERBOARD" ? "leaderboard" : "luckydraw"}`}>
                                        {form.type === "LUCKY_DRAW" ? "Lucky Draw" : form.type === "LEADERBOARD" ? "Leaderboard" : "FCFS"}
                                    </span>
                                    {form.rail === "crypto" && <span className="badge badge-network">{form.network}</span>}
                                    {humanTasks.length > 0 && <span className="badge badge-social">Social</span>}
                                    {requiredSkills.length > 0 && <span className="badge badge-skill">Skill</span>}
                                    {durationDays !== null && durationDays > 0 && (
                                        <span style={{ color: "var(--fg-muted)", marginLeft: "auto" }}>
                                            by <strong style={{ color: "var(--fg)" }}>you</strong> · {durationDays}d
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Payout rows */}
                        <div className="preview-body">
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
                                <span className="label">Mode</span>
                                <span className="value">
                                    <span className={`badge badge-${form.type === "FCFS" ? "fcfs" : form.type === "LEADERBOARD" ? "leaderboard" : "luckydraw"}`}>
                                        {form.type === "LUCKY_DRAW" ? "Lucky Draw" : form.type === "LEADERBOARD" ? "Leaderboard" : "FCFS"}
                                    </span>
                                </span>
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
                            {durationDays !== null && durationDays > 0 && (
                                <div className="preview-row">
                                    <span className="label">Duration</span>
                                    <span className="value">{durationDays} {durationDays === 1 ? "day" : "days"}</span>
                                </div>
                            )}
                            <div className="preview-total">
                                <span>Total Fund</span>
                                <span className="value">
                                    {activeTotal > 0 ? `${activeTotal.toFixed(2)} ${tokenLabel}` : "—"}
                                </span>
                            </div>
                        </div>

                        {/* Tasks section */}
                        {(humanTasks.length > 0 || requiredSkills.length > 0) && (
                            <div className="preview-body" style={{ borderTop: "1px solid var(--border)" }}>
                                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--fg)", marginBottom: 6 }}>Tasks</div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                    {humanTasks.length > 0 && (
                                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                                            <span style={{ color: "var(--human-fg)" }}>👤</span>
                                            <span style={{ color: "var(--fg-muted)" }}>Human:</span>
                                            <span style={{ fontWeight: 600 }}>{humanTasks.length} social</span>
                                        </div>
                                    )}
                                    {requiredSkills.length > 0 && (
                                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                                            <span style={{ color: "var(--agent-fg)" }}>🤖</span>
                                            <span style={{ color: "var(--fg-muted)" }}>Agent:</span>
                                            <span style={{ fontWeight: 600 }}>{requiredSkills.length} skill{requiredSkills.length > 1 ? "s" : ""}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Eligibility section */}
                        {requiredSkills.length > 0 && (
                            <div style={{ padding: "10px 14px", borderTop: "1px solid var(--border)" }}>
                                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--fg)", marginBottom: 6 }}>Eligibility</div>
                                <div style={{ fontSize: 11, color: "var(--fg-muted)", lineHeight: 1.5 }}>
                                    {requiredSkills.map(s => (
                                        <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                                            <span style={{ fontFamily: "var(--font-mono)" }}>{s.id}@latest</span>
                                            <span style={{ fontWeight: 600, color: "var(--fg)" }}>{s.agents} agents</span>
                                        </div>
                                    ))}
                                    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderTop: "1px solid #f0f0f0", marginTop: 4 }}>
                                        {requiredSkills.length > 1 ? (
                                            <>
                                                <span style={{ fontWeight: 600, color: "var(--fg)" }}>All required</span>
                                                <span style={{ fontWeight: 700, color: "var(--accent)" }}>
                                                    ~{Math.round(Math.min(...requiredSkills.map(s => s.agents)) * 0.7)} agents
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <span style={{ fontWeight: 600, color: "var(--fg)" }}>Eligible</span>
                                                <span style={{ fontWeight: 700, color: "var(--accent)" }}>
                                                    ~{Math.min(...requiredSkills.map(s => s.agents))} agents
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="preview-actions">
                            <button
                                className="btn btn-primary btn-lg"
                                style={{ width: "100%" }}
                                disabled={mutation.isPending || !form.title || activeTotal <= 0}
                                onClick={() => mutation.mutate()}
                            >
                                {mutation.isPending
                                    ? "Creating…"
                                    : form.rail === "fiat"
                                        ? "Create Quest & Pay with Stripe"
                                        : "Create Quest & Fund"}
                            </button>
                            <button className="btn btn-secondary" style={{ width: "100%" }}>Save Draft</button>
                        </div>
                        <div className="preview-note">
                            Funds held in escrow. Skill tasks verified via CQ Skill proof. Social tasks verified via platform API.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
