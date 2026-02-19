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

interface FormData {
    title: string
    description: string
    sponsor: string
    type: QuestType
    rail: PaymentRail
    rewardType: string
    rewardAmount: string
    totalSlots: string
    expiresAt: string
    tags: string
}

const NETWORKS = ["Ethereum", "Base", "Arbitrum", "Optimism", "Polygon", "Avalanche", "BSC", "Solana"]
const CRYPTO_TOKENS: Record<string, string[]> = {
    Ethereum: ["ETH", "USDC", "USDT", "WETH"],
    Base: ["ETH", "USDC", "USDT"],
    Arbitrum: ["ETH", "USDC", "ARB"],
    Optimism: ["ETH", "USDC", "OP"],
    Polygon: ["MATIC", "USDC", "USDT"],
    Avalanche: ["AVAX", "USDC", "USDT"],
    BSC: ["BNB", "USDC", "BUSD"],
    Solana: ["SOL", "USDC", "USDT"],
}

const PLATFORM_TEMPLATES: Record<string, string[]> = {
    X: ["Follow account", "Like & Retweet post", "Quote tweet with hashtag", "Post original tweet"],
    Discord: ["Join server", "Get member role", "Post in channel"],
    Telegram: ["Join channel", "Join group", "Send message"],
}

const SKILL_SUGGESTIONS = [
    "evm-wallet", "uniswap-v3", "aave-lending", "opensea-nft",
    "twitter-post", "discord-role", "telegram-join", "github-star",
]

// ─── Component ───────────────────────────────────────────────────────────────

export function CreateQuest() {
    const navigate = useNavigate()
    const { token } = useAuth()
    const [tab, setTab] = useState<Tab>("details")
    const [form, setForm] = useState<FormData>({
        title: "",
        description: "",
        sponsor: "",
        type: "FCFS",
        rail: "crypto",
        rewardType: "USDC",
        rewardAmount: "",
        totalSlots: "50",
        expiresAt: "",
        tags: "",
    })
    const [network, setNetwork] = useState("Base")
    const [humanTasks, setHumanTasks] = useState<{ platform: string; action: string }[]>([])
    const [requiredSkills, setRequiredSkills] = useState<string[]>([])
    const [skillSearch, setSkillSearch] = useState("")
    const [activePlatform, setActivePlatform] = useState<string | null>(null)

    const set = (key: keyof FormData, val: string) =>
        setForm(prev => ({ ...prev, [key]: val }))

    const addHumanTask = (platform: string, action: string) => {
        setHumanTasks(prev => [...prev, { platform, action }])
        setActivePlatform(null)
    }

    const removeHumanTask = (i: number) =>
        setHumanTasks(prev => prev.filter((_, idx) => idx !== i))

    const addSkill = (skill: string) => {
        if (!requiredSkills.includes(skill)) {
            setRequiredSkills(prev => [...prev, skill])
        }
        setSkillSearch("")
    }

    const removeSkill = (skill: string) =>
        setRequiredSkills(prev => prev.filter(s => s !== skill))

    const filteredSkills = SKILL_SUGGESTIONS.filter(
        s => s.includes(skillSearch.toLowerCase()) && !requiredSkills.includes(s)
    )

    const mutation = useMutation({
        mutationFn: async () => {
            const payload = {
                title: form.title,
                description: form.description,
                sponsor: form.sponsor || "Anonymous",
                type: form.type,
                rewardType: form.rail === "fiat" ? "USD" : form.rewardType,
                rewardAmount: parseInt(form.rewardAmount) || 0,
                totalSlots: parseInt(form.totalSlots) || 50,
                status: "draft",
                tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
                expiresAt: form.expiresAt || undefined,
            }
            const res = await fetch(`${API_BASE}/quests`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(payload),
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: "Failed to create quest" }))
                throw new Error(err.message || "Failed to create quest")
            }
            return res.json()
        },
        onSuccess: (data) => {
            navigate({ to: "/quests/$questId", params: { questId: data.id } })
        },
    })

    const canProceed = {
        details: form.title.trim() && form.description.trim(),
        reward: form.rewardAmount && parseInt(form.rewardAmount) > 0,
        tasks: true,
    }

    const tabDone = {
        details: canProceed.details,
        reward: canProceed.reward,
        tasks: humanTasks.length > 0 || requiredSkills.length > 0,
    }

    const tabs: { id: Tab; label: string; num: number }[] = [
        { id: "details", label: "Details", num: 1 },
        { id: "reward", label: "Reward", num: 2 },
        { id: "tasks", label: "Tasks", num: 3 },
    ]

    // Preview data
    const previewReward = parseInt(form.rewardAmount) || 0
    const previewSlots = parseInt(form.totalSlots) || 50
    const previewPerSlot = previewSlots > 0 ? (previewReward / previewSlots).toFixed(2) : "0.00"

    return (
        <div className="page-container" style={{ maxWidth: 960 }}>
            {/* Breadcrumb */}
            <div className="breadcrumb">
                <Link to="/">Dashboard</Link>
                <span className="sep">›</span>
                <span>Create Quest</span>
            </div>

            {/* Page header */}
            <div className="page-header" style={{ marginBottom: 20 }}>
                <div>
                    <h1>Create a Quest</h1>
                    <div className="page-header-meta">
                        Set up a quest for agents to complete
                    </div>
                </div>
            </div>

            {/* Step tabs */}
            <div className="step-tabs">
                {tabs.map(t => (
                    <button
                        key={t.id}
                        className={`step-tab ${tab === t.id ? "active" : ""} ${tabDone[t.id] && tab !== t.id ? "done" : ""}`}
                        onClick={() => setTab(t.id)}
                    >
                        <span className="tab-num">{tabDone[t.id] && tab !== t.id ? "✓" : t.num}</span>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Form layout */}
            <div className="form-layout">
                {/* ── Main form ── */}
                <div className="form-main">

                    {/* ── Tab 1: Details ── */}
                    {tab === "details" && (
                        <>
                            <div className="form-section">
                                <div className="form-section-title">Quest Info</div>

                                <div className="form-group">
                                    <label className="form-label">Title <span style={{ color: "var(--red)" }}>*</span></label>
                                    <input
                                        className="form-input"
                                        placeholder="e.g. DeFi Yield Farming Campaign"
                                        value={form.title}
                                        onChange={e => set("title", e.target.value)}
                                        maxLength={80}
                                    />
                                    <div className="char-count">{form.title.length} / 80</div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Description <span style={{ color: "var(--red)" }}>*</span></label>
                                    <textarea
                                        className="form-textarea"
                                        placeholder="Describe what participants need to do and why…"
                                        value={form.description}
                                        onChange={e => set("description", e.target.value)}
                                        rows={4}
                                    />
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Sponsor / Brand</label>
                                        <input
                                            className="form-input"
                                            placeholder="e.g. Aave Protocol"
                                            value={form.sponsor}
                                            onChange={e => set("sponsor", e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Tags <span className="form-hint">(comma-separated)</span></label>
                                        <input
                                            className="form-input"
                                            placeholder="defi, yield, farming"
                                            value={form.tags}
                                            onChange={e => set("tags", e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Total Slots</label>
                                        <input
                                            className="form-input"
                                            type="number"
                                            min="1"
                                            max="10000"
                                            value={form.totalSlots}
                                            onChange={e => set("totalSlots", e.target.value)}
                                        />
                                        <div className="form-hint">Max number of agents that can participate</div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Expires At</label>
                                        <input
                                            className="form-input"
                                            type="datetime-local"
                                            value={form.expiresAt}
                                            onChange={e => set("expiresAt", e.target.value)}
                                        />
                                        <div className="form-hint">Leave blank for no expiry</div>
                                    </div>
                                </div>
                            </div>

                            <div className="tab-nav-row">
                                <span />
                                <button
                                    className="btn btn-primary"
                                    disabled={!canProceed.details}
                                    onClick={() => setTab("reward")}
                                >
                                    Next: Reward →
                                </button>
                            </div>
                        </>
                    )}

                    {/* ── Tab 2: Reward ── */}
                    {tab === "reward" && (
                        <>
                            <div className="form-section">
                                <div className="form-section-title">Payment Rail</div>
                                <div className="rail-toggle">
                                    <button
                                        className={`rail-toggle-btn ${form.rail === "crypto" ? "active" : ""}`}
                                        onClick={() => set("rail", "crypto")}
                                    >
                                        ⬡ Crypto
                                    </button>
                                    <button
                                        className={`rail-toggle-btn ${form.rail === "fiat" ? "active" : ""}`}
                                        onClick={() => set("rail", "fiat")}
                                    >
                                        $ Fiat (Stripe)
                                    </button>
                                </div>
                            </div>

                            {form.rail === "crypto" && (
                                <div className="form-section">
                                    <div className="form-section-title">Token & Network</div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="form-label">Network</label>
                                            <select
                                                className="form-select"
                                                value={network}
                                                onChange={e => {
                                                    setNetwork(e.target.value)
                                                    set("rewardType", CRYPTO_TOKENS[e.target.value]?.[0] ?? "USDC")
                                                }}
                                            >
                                                {NETWORKS.map(n => (
                                                    <option key={n} value={n}>{n}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Token</label>
                                            <select
                                                className="form-select"
                                                value={form.rewardType}
                                                onChange={e => set("rewardType", e.target.value)}
                                            >
                                                {(CRYPTO_TOKENS[network] ?? ["USDC"]).map(t => (
                                                    <option key={t} value={t}>{t}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="token-display" style={{ marginBottom: 14 }}>
                                        <span className="token-icon">⬡</span>
                                        <div className="token-info">
                                            <span className="token-name">{form.rewardType}</span>
                                            <span className="token-network">on {network}</span>
                                        </div>
                                        <span className="badge badge-crypto">{form.rewardType}</span>
                                    </div>
                                </div>
                            )}

                            {form.rail === "fiat" && (
                                <div className="fiat-info">
                                    <span>💳</span>
                                    <div>
                                        <strong>Fiat payouts via Stripe</strong>
                                        <div style={{ fontSize: 11, marginTop: 2 }}>Rewards distributed in USD. Stripe fee ~2.9% + $0.30 per payout.</div>
                                    </div>
                                </div>
                            )}

                            <div className="form-section">
                                <div className="form-section-title">Reward Amount & Distribution</div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Total Reward Pool <span style={{ color: "var(--red)" }}>*</span></label>
                                        <input
                                            className="form-input"
                                            type="number"
                                            min="0"
                                            placeholder="e.g. 5000"
                                            value={form.rewardAmount}
                                            onChange={e => set("rewardAmount", e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Per Participant</label>
                                        <div className="form-calc">
                                            {previewSlots > 0 ? `≈ ${previewPerSlot} ${form.rail === "fiat" ? "USD" : form.rewardType} / slot` : "—"}
                                        </div>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Distribution Type</label>
                                    <div className="radio-group">
                                        {[
                                            { val: "FCFS", label: "FCFS" },
                                            { val: "LEADERBOARD", label: "Leaderboard" },
                                            { val: "LUCKY_DRAW", label: "Lucky Draw" },
                                        ].map(opt => (
                                            <div key={opt.val} className="radio-option">
                                                <input
                                                    id={`type-${opt.val}`}
                                                    type="radio"
                                                    name="type"
                                                    value={opt.val}
                                                    checked={form.type === opt.val as QuestType}
                                                    onChange={() => set("type", opt.val)}
                                                />
                                                <label htmlFor={`type-${opt.val}`}>{opt.label}</label>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ fontSize: 11, color: "var(--fg-muted)", marginTop: 6 }}>
                                        {form.type === "FCFS" && "Equal share to first N agents who complete all tasks."}
                                        {form.type === "LEADERBOARD" && "Top performers get a larger share. Ranked by completion speed."}
                                        {form.type === "LUCKY_DRAW" && "Random selection among all agents who complete the quest."}
                                    </div>
                                </div>

                                {form.type === "LEADERBOARD" && previewReward > 0 && (
                                    <div className="lb-payout-visual" style={{ marginTop: 8 }}>
                                        <div style={{ fontSize: 11, color: "var(--fg-muted)", marginBottom: 6, fontWeight: 600 }}>Estimated Payout Structure</div>
                                        {[
                                            { rank: "1st", pct: 30 },
                                            { rank: "2nd", pct: 20 },
                                            { rank: "3rd", pct: 15 },
                                            { rank: "4-10th", pct: 25 },
                                            { rank: "Rest", pct: 10 },
                                        ].map(p => (
                                            <div key={p.rank} className="lb-payout-item">
                                                <span className="pos">{p.rank}</span>
                                                <span className="amt">
                                                    {Math.round(previewReward * p.pct / 100).toLocaleString()} {form.rewardType}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="tab-nav-row">
                                <button className="btn" onClick={() => setTab("details")}>← Back</button>
                                <button
                                    className="btn btn-primary"
                                    disabled={!canProceed.reward}
                                    onClick={() => setTab("tasks")}
                                >
                                    Next: Tasks →
                                </button>
                            </div>
                        </>
                    )}

                    {/* ── Tab 3: Tasks ── */}
                    {tab === "tasks" && (
                        <>
                            {/* Human Tasks */}
                            <div className="actor-section human">
                                <div className="actor-section-title">
                                    Human Tasks
                                    <span className="actor-badge human">HUMAN</span>
                                    <span className="hint">Social actions participants do manually</span>
                                </div>

                                {/* Template picker */}
                                <div className="template-picker">
                                    <div style={{ fontSize: 11, color: "var(--fg-muted)", marginBottom: 8, fontWeight: 600 }}>
                                        Add from template:
                                    </div>
                                    <div className="platform-grid">
                                        {Object.keys(PLATFORM_TEMPLATES).map(p => (
                                            <button
                                                key={p}
                                                className={`platform-btn ${activePlatform === p ? "active" : ""}`}
                                                onClick={() => setActivePlatform(activePlatform === p ? null : p)}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                    {activePlatform && (
                                        <div className="action-template-list">
                                            {PLATFORM_TEMPLATES[activePlatform].map(action => (
                                                <div
                                                    key={action}
                                                    className="action-template-item"
                                                    onClick={() => addHumanTask(activePlatform, action)}
                                                >
                                                    <span className="template-name">{action}</span>
                                                    <button className="template-add">+ Add</button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Added tasks */}
                                {humanTasks.length === 0 && (
                                    <div style={{ fontSize: 12, color: "var(--fg-muted)", padding: "10px 0" }}>
                                        No tasks added yet. Use the template picker above.
                                    </div>
                                )}
                                {humanTasks.map((task, i) => (
                                    <div key={i} className="social-entry">
                                        <div className="social-entry-header">
                                            <span className="badge badge-social">{task.platform}</span>
                                            <span style={{ flex: 1, fontSize: 12, fontWeight: 500 }}>{task.action}</span>
                                            <button
                                                className="social-entry-remove"
                                                onClick={() => removeHumanTask(i)}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Agent Tasks */}
                            <div className="actor-section agent">
                                <div className="actor-section-title">
                                    Agent Tasks
                                    <span className="actor-badge agent">AGENT</span>
                                    <span className="hint">On-chain / automated actions</span>
                                </div>

                                <div className="info-box" style={{ marginBottom: 12 }}>
                                    <span>ℹ️</span>
                                    <span>Agent tasks are defined by <strong>CQ Skills</strong>. Add the skills your quest requires below.</span>
                                </div>

                                {/* Skill search */}
                                <div className="skill-search-wrapper">
                                    <input
                                        className="form-input skill-search-input"
                                        placeholder="Search skills (e.g. uniswap-v3, evm-wallet)…"
                                        value={skillSearch}
                                        onChange={e => setSkillSearch(e.target.value)}
                                    />
                                    {skillSearch && filteredSkills.length > 0 && (
                                        <div className="skill-search-results">
                                            {filteredSkills.map(s => (
                                                <div
                                                    key={s}
                                                    className="skill-result-item"
                                                    onClick={() => addSkill(s)}
                                                >
                                                    <div className="skill-result-info">
                                                        <span className="skill-result-name">{s}</span>
                                                    </div>
                                                    <button className="skill-result-add">+ Add</button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Required skills list */}
                                {requiredSkills.length === 0 && (
                                    <div style={{ fontSize: 12, color: "var(--fg-muted)", padding: "8px 0" }}>
                                        No skills required yet. Search above to add.
                                    </div>
                                )}
                                <div className="required-skills-list">
                                    {requiredSkills.map(skill => (
                                        <div key={skill} className="required-skill-item">
                                            <div className="required-skill-icon">⚙</div>
                                            <div className="required-skill-info">
                                                <span className="required-skill-name">{skill}</span>
                                            </div>
                                            <button className="required-skill-remove" onClick={() => removeSkill(skill)}>×</button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="tab-nav-row">
                                <button className="btn" onClick={() => setTab("reward")}>← Back</button>
                                <button
                                    className="btn btn-primary"
                                    disabled={mutation.isPending || !form.title || !form.rewardAmount}
                                    onClick={() => mutation.mutate()}
                                >
                                    {mutation.isPending ? "Creating…" : "Create Quest & Fund →"}
                                </button>
                            </div>

                            {mutation.isError && (
                                <div style={{ marginTop: 10, fontSize: 12, color: "var(--red)" }}>
                                    {(mutation.error as Error).message}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* ── Preview sidebar ── */}
                <div>
                    <div className="preview-box">
                        <div className="preview-header">Preview</div>
                        <div className="preview-body">
                            {/* Mini quest card preview */}
                            <div className="preview-quest-card">
                                <div className="preview-quest-title">
                                    {form.title || <span style={{ color: "var(--fg-muted)" }}>Quest title…</span>}
                                </div>
                                {form.description && (
                                    <div className="preview-quest-desc">{form.description}</div>
                                )}
                                <div className="preview-quest-meta">
                                    <span className={`badge badge-${form.type === "FCFS" ? "fcfs" : form.type === "LEADERBOARD" ? "leaderboard" : "luckydraw"}`}>{form.type}</span>
                                    {form.tags && form.tags.split(",").slice(0, 3).map(t => t.trim()).filter(Boolean).map(tag => (
                                        <span key={tag} className="tag">{tag}</span>
                                    ))}
                                </div>
                            </div>

                            <div className="preview-row">
                                <span className="label">Total reward</span>
                                <span className="value green">
                                    {previewReward > 0 ? `${previewReward.toLocaleString()} ${form.rail === "fiat" ? "USD" : form.rewardType}` : "—"}
                                </span>
                            </div>
                            <div className="preview-row">
                                <span className="label">Per participant</span>
                                <span className="value">
                                    {previewReward > 0 ? `≈ ${previewPerSlot}` : "—"}
                                </span>
                            </div>
                            <div className="preview-row">
                                <span className="label">Slots</span>
                                <span className="value">{previewSlots}</span>
                            </div>
                            <div className="preview-row">
                                <span className="label">Distribution</span>
                                <span className="value">{form.type}</span>
                            </div>
                            <div className="preview-row">
                                <span className="label">Human tasks</span>
                                <span className="value">{humanTasks.length}</span>
                            </div>
                            <div className="preview-row">
                                <span className="label">Agent skills</span>
                                <span className="value">{requiredSkills.length}</span>
                            </div>
                        </div>

                        <div className="preview-actions">
                            <button
                                className="btn btn-primary"
                                disabled={mutation.isPending || !form.title || !form.rewardAmount}
                                onClick={() => mutation.mutate()}
                            >
                                {mutation.isPending ? "Creating…" : "Create Quest →"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
