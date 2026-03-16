import { Badge } from "@/components/ui/badge"
import { QuestTypeBadge, QuestStatusBadge, RewardBadge } from "@/components/quest-badges"
import { CheckLine, CloseLine, TimeLine, InformationLine, AlertLine } from "@mingcute/react"

/* ── Badge variant data ── */

const SEMANTIC_VARIANTS = [
    { variant: "default", label: "Default" },
    { variant: "success", label: "Success" },
    { variant: "error", label: "Error" },
    { variant: "warning", label: "Warning" },
    { variant: "info", label: "Info" },
    { variant: "muted", label: "Muted" },
] as const

const PILL_VARIANTS = [
    { variant: "pill", label: "Pill" },
    { variant: "outline", label: "Outline" },
    { variant: "outline-success", label: "Outline Success" },
    { variant: "outline-error", label: "Outline Error" },
    { variant: "outline-warning", label: "Outline Warning" },
    { variant: "outline-muted", label: "Outline Muted" },
] as const

const FILLED_VARIANTS = [
    { variant: "filled-success", label: "Filled Success" },
    { variant: "filled-error", label: "Filled Error" },
    { variant: "filled-warning", label: "Filled Warning" },
    { variant: "filled-muted", label: "Filled Muted" },
] as const

const QUEST_TYPES = ["FCFS", "LEADERBOARD", "LUCKY_DRAW"] as const
const QUEST_STATUSES = ["live", "scheduled", "draft", "pending", "completed", "expired", "cancelled", "rejected"] as const
const REWARD_TYPES = [
    { type: "USDC", amount: 500 },
    { type: "USDT", amount: 1000 },
    { type: "USD", amount: 250 },
] as const

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2">{title}</h2>
            {children}
        </section>
    )
}

function VariantRow({ variant, label }: { variant: string; label: string }) {
    return (
        <div className="flex items-center gap-4 px-4 py-3 border-t border-border first:border-t-0">
            <code className="text-xs text-accent font-semibold w-40 shrink-0">{variant}</code>
            <Badge variant={variant as any}>{label}</Badge>
        </div>
    )
}

export function BadgesDemo() {
    return (
        <div className="min-h-screen bg-background text-foreground p-6 sm:p-10 max-w-4xl mx-auto flex flex-col gap-10">
            <div>
                <h1 className="text-3xl font-semibold font-heading mb-1">Badges</h1>
                <p className="text-sm text-muted-foreground">ClawQuest design system — badge variants, quest badges, and usage examples.</p>
            </div>

            {/* Semantic variants */}
            <Section title="Semantic Variants">
                <p className="text-xs text-muted-foreground">Plain colored text, no background or border. For inline status indicators.</p>
                <div className="border border-border rounded-lg overflow-hidden">
                    {SEMANTIC_VARIANTS.map(v => (
                        <VariantRow key={v.variant} variant={v.variant} label={v.label} />
                    ))}
                </div>
            </Section>

            {/* Pill & outline variants */}
            <Section title="Pill & Outline Variants">
                <p className="text-xs text-muted-foreground">Rounded badges with border. For tags, categories, and subtle labels.</p>
                <div className="border border-border rounded-lg overflow-hidden">
                    {PILL_VARIANTS.map(v => (
                        <VariantRow key={v.variant} variant={v.variant} label={v.label} />
                    ))}
                </div>
            </Section>

            {/* Filled variants */}
            <Section title="Filled Variants">
                <p className="text-xs text-muted-foreground">Solid background badges. For status indicators that need more visual weight.</p>
                <div className="border border-border rounded-lg overflow-hidden">
                    {FILLED_VARIANTS.map(v => (
                        <VariantRow key={v.variant} variant={v.variant} label={v.label} />
                    ))}
                </div>
            </Section>

            {/* With icons */}
            <Section title="With Icons">
                <p className="text-xs text-muted-foreground">Badges composed with MingCute icons for richer semantics.</p>
                <div className="flex flex-wrap gap-3 p-4 border border-border rounded-lg bg-card">
                    <Badge variant="filled-success"><CheckLine size={12} /> Verified</Badge>
                    <Badge variant="filled-error"><CloseLine size={12} /> Failed</Badge>
                    <Badge variant="filled-warning"><AlertLine size={12} /> Pending</Badge>
                    <Badge variant="outline"><TimeLine size={12} /> Scheduled</Badge>
                    <Badge variant="pill"><InformationLine size={12} /> Info tag</Badge>
                </div>
            </Section>

            {/* Quest Type badges */}
            <Section title="Quest Type Badges">
                <p className="text-xs text-muted-foreground">
                    <code className="text-accent">{"<QuestTypeBadge>"}</code> — icon + colored text per quest type.
                </p>
                <div className="flex flex-wrap gap-6 p-4 border border-border rounded-lg bg-card">
                    {QUEST_TYPES.map(t => (
                        <div key={t} className="flex flex-col items-center gap-2">
                            <QuestTypeBadge type={t} />
                            <code className="text-2xs text-muted-foreground">{t}</code>
                        </div>
                    ))}
                </div>
            </Section>

            {/* Quest Status badges */}
            <Section title="Quest Status Badges">
                <p className="text-xs text-muted-foreground">
                    <code className="text-accent">{"<QuestStatusBadge>"}</code> — filled/outline badge per quest status. "live" includes a pulsing dot.
                </p>
                <div className="flex flex-wrap gap-3 p-4 border border-border rounded-lg bg-card">
                    {QUEST_STATUSES.map(s => (
                        <div key={s} className="flex flex-col items-center gap-2">
                            <QuestStatusBadge status={s} />
                            <code className="text-2xs text-muted-foreground">{s}</code>
                        </div>
                    ))}
                </div>
            </Section>

            {/* Reward badges */}
            <Section title="Reward Badges">
                <p className="text-xs text-muted-foreground">
                    <code className="text-accent">{"<RewardBadge>"}</code> — token icon + amount.
                </p>
                <div className="flex flex-wrap gap-6 p-4 border border-border rounded-lg bg-card">
                    {REWARD_TYPES.map(r => (
                        <div key={r.type} className="flex flex-col items-center gap-2">
                            <RewardBadge type={r.type} amount={r.amount} />
                            <code className="text-2xs text-muted-foreground">{r.type}</code>
                        </div>
                    ))}
                </div>
            </Section>

            {/* Count badges */}
            <Section title="Count Badges">
                <p className="text-xs text-muted-foreground">Filled pill with number, used in tabs and navigation counters.</p>
                <div className="border border-border rounded-lg overflow-hidden">
                    {([
                        { variant: "count", label: "count", value: "12" },
                        { variant: "count-muted", label: "count-muted", value: "5" },
                        { variant: "count-primary", label: "count-primary", value: "8" },
                        { variant: "count-primary-inverted", label: "count-primary-inverted", value: "6" },
                        { variant: "count-success", label: "count-success", value: "3" },
                        { variant: "count-error", label: "count-error", value: "1" },
                        { variant: "count-warning", label: "count-warning", value: "2" },
                        { variant: "count-info", label: "count-info", value: "7" },
                    ] as const).map(({ variant, value }) => (
                        <div key={variant} className="flex items-center gap-4 px-4 py-3 border-t border-border first:border-t-0">
                            <code className="text-xs text-accent font-semibold w-48 shrink-0">{variant}</code>
                            <Badge variant={variant}>{value}</Badge>
                            <Badge variant={variant}>128</Badge>
                        </div>
                    ))}
                </div>
            </Section>

            {/* Composition examples */}
            <Section title="Composition Examples">
                <p className="text-xs text-muted-foreground">Real-world usage patterns combining badges in context.</p>
                <div className="grid gap-3">
                    {/* Card-like example */}
                    <div className="p-4 rounded-lg border border-border bg-card flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                            <span className="text-2xs font-semibold text-accent uppercase tracking-wider">Quest card header</span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <QuestStatusBadge status="live" />
                            <QuestTypeBadge type="FCFS" />
                            <span className="text-muted-foreground text-xs">·</span>
                            <RewardBadge type="USDC" amount={500} />
                        </div>
                    </div>

                    {/* Tag list example */}
                    <div className="p-4 rounded-lg border border-border bg-card flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                            <span className="text-2xs font-semibold text-accent uppercase tracking-wider">Skill tags</span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="pill">DeFi</Badge>
                            <Badge variant="pill">Smart Contracts</Badge>
                            <Badge variant="pill">Solidity</Badge>
                            <Badge variant="pill">Auditing</Badge>
                        </div>
                    </div>

                    {/* Status list example */}
                    <div className="p-4 rounded-lg border border-border bg-card flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                            <span className="text-2xs font-semibold text-accent uppercase tracking-wider">Mixed status row</span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="filled-success"><CheckLine size={12} /> 3 passed</Badge>
                            <Badge variant="filled-error"><CloseLine size={12} /> 1 failed</Badge>
                            <Badge variant="filled-warning"><AlertLine size={12} /> 2 pending</Badge>
                            <Badge variant="outline-muted">12 total</Badge>
                        </div>
                    </div>
                </div>
            </Section>

            {/* Code reference */}
            <Section title="Code Reference">
                <div className="p-4 rounded-lg border border-border bg-card">
                    <pre className="text-xs font-mono text-muted-foreground leading-relaxed overflow-auto">{`/* Base badge — src/components/ui/badge.tsx */
<Badge variant="default|success|error|warning|info|muted">...</Badge>
<Badge variant="pill|outline|outline-success|outline-error|...">...</Badge>
<Badge variant="filled-success|filled-error|filled-warning|filled-muted">...</Badge>
<Badge variant="count|count-muted|count-primary|count-primary-inverted">3</Badge>
<Badge variant="count-success|count-error|count-warning|count-info">3</Badge>

/* Quest badges — src/components/quest-badges.tsx */
<QuestTypeBadge type="FCFS|LEADERBOARD|LUCKY_DRAW" />
<QuestStatusBadge status="live|scheduled|draft|..." />
<RewardBadge type="USDC" amount={500} />`}</pre>
                </div>
            </Section>

            <footer className="text-2xs text-muted-foreground border-t border-border pt-4 pb-8">
                ClawQuest Design System v3 — Badges reference
            </footer>
        </div>
    )
}
