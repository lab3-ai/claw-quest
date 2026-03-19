import { Badge } from "@/components/ui/badge"
import { QuestTypeBadge, QuestStatusBadge, RewardBadge } from "@/components/quest-badges"
import { CheckLine, CloseLine, TimeLine, InformationLine, AlertLine } from "@mingcute/react"
import { DemoLayout } from "@/components/demo-layout"

/* ── Badge variant data ── */

const SEMANTIC_VARIANTS = [
    { variant: "default", label: "Default", desc: "text-fg-1" },
    { variant: "success", label: "Success", desc: "text-success" },
    { variant: "error", label: "Error", desc: "text-error" },
    { variant: "warning", label: "Warning", desc: "text-warning" },
    { variant: "info", label: "Info", desc: "text-info" },
    { variant: "muted", label: "Muted", desc: "text-fg-3" },
] as const

const PILL_OUTLINE_VARIANTS = [
    { variant: "pill", label: "Pill", desc: "border + text-fg-2" },
    { variant: "outline", label: "Outline", desc: "border-2 + bg-2 + text-fg-1" },
    { variant: "outline-success", label: "Outline Success", desc: "border-success/40 + bg-success-light" },
    { variant: "outline-error", label: "Outline Error", desc: "border-error/40 + bg-error-light" },
    { variant: "outline-primary", label: "Outline Primary", desc: "border-primary/40 + bg-primary/5 + text-fg-1" },
    { variant: "outline-warning", label: "Outline Warning", desc: "border-warning/40 + bg-warning-light" },
    { variant: "outline-muted", label: "Outline Muted", desc: "border + bg-2 + text-fg-3" },
] as const

const FILLED_VARIANTS = [
    { variant: "filled-success", label: "Filled Success", desc: "bg-success-light + text-success" },
    { variant: "filled-error", label: "Filled Error", desc: "bg-error-light + text-error" },
    { variant: "filled-warning", label: "Filled Warning", desc: "bg-warning-light + text-warning" },
    { variant: "filled-muted", label: "Filled Muted", desc: "bg-3 + text-fg-3" },
] as const

const COUNT_VARIANTS = [
    { variant: "count", value: "12", desc: "bg-fg-1 + text-bg-1" },
    { variant: "count-muted", value: "5", desc: "bg-3 + text-fg-2" },
    { variant: "count-outline", value: "4", desc: "border + text-fg-3" },
    { variant: "count-primary", value: "8", desc: "bg-primary + text-primary-fg" },
    { variant: "count-primary-inverted", value: "6", desc: "bg-primary-fg + text-primary" },
    { variant: "count-success", value: "3", desc: "bg-success" },
    { variant: "count-error", value: "1", desc: "bg-error" },
    { variant: "count-warning", value: "2", desc: "bg-warning" },
    { variant: "count-info", value: "7", desc: "bg-info" },
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
            <h2 className="text-lg font-semibold text-fg-1 border-b border-border-2pb-2">{title}</h2>
            {children}
        </section>
    )
}

function VariantRow({ variant, label, desc }: { variant: string; label: string; desc?: string }) {
    return (
        <div className="flex items-center gap-4 px-4 py-3 border-t border-border-2first:border-t-0">
            <code className="text-xs text-accent font-semibold w-44 shrink-0">{variant}</code>
            <Badge variant={variant as any}>{label}</Badge>
            {desc && <span className="text-2xs text-fg-3 ml-auto font-mono">{desc}</span>}
        </div>
    )
}

export function BadgesDemo() {
    return (
        <DemoLayout title="Badges" description="Badge variants, quest badges, and usage examples.">

            {/* Semantic variants */}
            <Section title="Semantic Variants">
                <p className="text-xs text-fg-3">Plain colored text, no background or border. For inline status indicators.</p>
                <div className="border border-border-2rounded-lg overflow-hidden">
                    {SEMANTIC_VARIANTS.map(v => (
                        <VariantRow key={v.variant} variant={v.variant} label={v.label} desc={v.desc} />
                    ))}
                </div>
            </Section>

            {/* Pill & outline variants */}
            <Section title="Pill & Outline Variants">
                <p className="text-xs text-fg-3">Rounded badges with border. For tags, categories, and subtle labels.</p>
                <div className="border border-border-2rounded-lg overflow-hidden">
                    {PILL_OUTLINE_VARIANTS.map(v => (
                        <VariantRow key={v.variant} variant={v.variant} label={v.label} desc={v.desc} />
                    ))}
                </div>
            </Section>

            {/* Filled variants */}
            <Section title="Filled Variants">
                <p className="text-xs text-fg-3">Solid background badges. For status indicators that need more visual weight.</p>
                <div className="border border-border-2rounded-lg overflow-hidden">
                    {FILLED_VARIANTS.map(v => (
                        <VariantRow key={v.variant} variant={v.variant} label={v.label} desc={v.desc} />
                    ))}
                </div>
            </Section>

            {/* With icons */}
            <Section title="With Icons">
                <p className="text-xs text-fg-3">Badges composed with MingCute icons for richer semantics.</p>
                <div className="flex flex-wrap gap-3 p-4 border border-border-2rounded-lg bg-bg-1">
                    <Badge variant="filled-success"><CheckLine size={12} /> Verified</Badge>
                    <Badge variant="filled-error"><CloseLine size={12} /> Failed</Badge>
                    <Badge variant="filled-warning"><AlertLine size={12} /> Pending</Badge>
                    <Badge variant="outline"><TimeLine size={12} /> Scheduled</Badge>
                    <Badge variant="pill"><InformationLine size={12} /> Info tag</Badge>
                </div>
            </Section>

            {/* Quest Type badges */}
            <Section title="Quest Type Badges">
                <p className="text-xs text-fg-3">
                    <code className="text-accent">{"<QuestTypeBadge>"}</code> — icon + colored text per quest type.
                </p>
                <div className="flex flex-wrap gap-6 p-4 border border-border-2rounded-lg bg-bg-1">
                    {QUEST_TYPES.map(t => (
                        <div key={t} className="flex flex-col items-center gap-2">
                            <QuestTypeBadge type={t} />
                            <code className="text-2xs text-fg-3">{t}</code>
                        </div>
                    ))}
                </div>
            </Section>

            {/* Quest Status badges */}
            <Section title="Quest Status Badges">
                <p className="text-xs text-fg-3">
                    <code className="text-accent">{"<QuestStatusBadge>"}</code> — filled/outline badge per quest status. "live" includes a pulsing dot.
                </p>
                <div className="flex flex-wrap gap-3 p-4 border border-border-2rounded-lg bg-bg-1">
                    {QUEST_STATUSES.map(s => (
                        <div key={s} className="flex flex-col items-center gap-2">
                            <QuestStatusBadge status={s} />
                            <code className="text-2xs text-fg-3">{s}</code>
                        </div>
                    ))}
                </div>
            </Section>

            {/* Reward badges */}
            <Section title="Reward Badges">
                <p className="text-xs text-fg-3">
                    <code className="text-accent">{"<RewardBadge>"}</code> — token icon + amount.
                </p>
                <div className="flex flex-wrap gap-6 p-4 border border-border-2rounded-lg bg-bg-1">
                    {REWARD_TYPES.map(r => (
                        <div key={r.type} className="flex flex-col items-center gap-2">
                            <RewardBadge type={r.type} amount={r.amount} />
                            <code className="text-2xs text-fg-3">{r.type}</code>
                        </div>
                    ))}
                </div>
            </Section>

            {/* Count badges */}
            <Section title="Count Badges">
                <p className="text-xs text-fg-3">Filled pill with number, used in tabs and navigation counters.</p>
                <div className="border border-border-2rounded-lg overflow-hidden">
                    {COUNT_VARIANTS.map(({ variant, value, desc }) => (
                        <div key={variant} className="flex items-center gap-4 px-4 py-3 border-t border-border-2first:border-t-0">
                            <code className="text-xs text-accent font-semibold w-48 shrink-0">{variant}</code>
                            <Badge variant={variant as any}>{value}</Badge>
                            <Badge variant={variant as any}>128</Badge>
                            <span className="text-2xs text-fg-3 ml-auto font-mono">{desc}</span>
                        </div>
                    ))}
                </div>
            </Section>

            {/* Composition examples */}
            <Section title="Composition Examples">
                <p className="text-xs text-fg-3">Real-world usage patterns combining badges in context.</p>
                <div className="grid gap-3">
                    <div className="p-4 rounded-lg border border-border-2bg-bg-1 flex flex-col gap-3">
                        <span className="text-2xs font-semibold text-accent uppercase tracking-wider">Quest card header</span>
                        <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline-primary" className="text-sm font-semibold gap-1.5 px-2.5 py-1">200 ARB</Badge>
                            <Badge variant="outline" className="uppercase">FCFS</Badge>
                            <Badge variant="pill">onchain</Badge>
                            <Badge variant="pill">bridge</Badge>
                        </div>
                    </div>

                    <div className="p-4 rounded-lg border border-border-2bg-bg-1 flex flex-col gap-3">
                        <span className="text-2xs font-semibold text-accent uppercase tracking-wider">Status row</span>
                        <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="filled-success"><CheckLine size={12} /> 3 passed</Badge>
                            <Badge variant="filled-error"><CloseLine size={12} /> 1 failed</Badge>
                            <Badge variant="filled-warning"><AlertLine size={12} /> 2 pending</Badge>
                            <Badge variant="outline-muted">12 total</Badge>
                        </div>
                    </div>

                    <div className="p-4 rounded-lg border border-border-2bg-bg-1 flex flex-col gap-3">
                        <span className="text-2xs font-semibold text-accent uppercase tracking-wider">Skill tags</span>
                        <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="pill">DeFi</Badge>
                            <Badge variant="pill">Smart Contracts</Badge>
                            <Badge variant="pill">Solidity</Badge>
                            <Badge variant="pill">Auditing</Badge>
                        </div>
                    </div>
                </div>
            </Section>

            {/* Token mapping reference */}
            <Section title="Token Mapping">
                <p className="text-xs text-fg-3">Badge variants use numbered design tokens, not shadcn defaults.</p>
                <div className="p-4 rounded-lg border border-border-2bg-bg-1">
                    <pre className="text-xs font-mono text-fg-3 leading-relaxed overflow-auto">{`/* Numbered tokens used in badge variants */
default     → text-fg-1      (not text-foreground)
muted       → text-fg-3      (not text-muted-foreground)
outline     → border-2 bg-2  (not bg-muted/50)
outline-muted → border bg-2 text-fg-3
filled-muted → bg-3 text-fg-3 (not bg-muted)

/* Semantic tokens (unchanged) */
success/error/warning/info → use semantic color tokens`}</pre>
                </div>
            </Section>

        </DemoLayout>
    )
}
