import { DemoLayout } from "@/components/demo-layout"

/* ── Color token groups ── */

const BACKGROUNDS = [
    { token: "--bg-1", tw: "bg-bg-1", label: "bg-1 — base surface" },
    { token: "--bg-2", tw: "bg-bg-2", label: "bg-2 — body, navbar" },
    { token: "--bg-3", tw: "bg-bg-3", label: "bg-3 — hover, skeleton" },
    { token: "--bg-4", tw: "bg-bg-4", label: "bg-4 — muted, disabled" },
]

const FOREGROUNDS = [
    { token: "--fg-1", tw: "text-fg-1", label: "fg-1 — max contrast" },
    { token: "--fg-2", tw: "text-fg-2", label: "fg-2 — secondary text" },
    { token: "--fg-3", tw: "text-fg-3", label: "fg-3 — muted text" },
    { token: "--fg-4", tw: "text-fg-4", label: "fg-4 — disabled text" },
]

const BORDERS = [
    { token: "--border-1", tw: "border-border-1", label: "border-1 — subtle" },
    { token: "--border-2", tw: "border-border-2", label: "border-2 — default" },
    { token: "--border-3", tw: "border-border-3", label: "border-3 — emphasis" },
    { token: "--border-4", tw: "border-border-4", label: "border-4 — strong" },
]

const ACCENT = [
    { token: "--accent", tw: "bg-accent / text-accent", label: "accent" },
    { token: "--accent-hover", tw: "bg-accent-hover", label: "accent-hover" },
    { token: "--accent-light", tw: "bg-accent-light", label: "accent-light" },
    { token: "--accent-border", tw: "border-border-accent", label: "accent-border" },
    { token: "--accent-fg", tw: "text-accent-foreground", label: "accent-fg" },
]

const PRIMARY = [
    { token: "--primary", tw: "bg-primary / text-primary", label: "primary" },
    { token: "--primary-hover", tw: "hover:bg-primary-hover", label: "primary-hover" },
    { token: "--primary-fg", tw: "text-primary-foreground", label: "primary-fg" },
]

const SUCCESS = [
    { token: "--success", tw: "text-success / bg-success", label: "success" },
    { token: "--success-light", tw: "bg-success-light", label: "success-light" },
    { token: "--success-border", tw: "border-border-success", label: "success-border" },
]

const ERROR = [
    { token: "--error", tw: "text-error / bg-error", label: "error" },
    { token: "--error-light", tw: "bg-error-light", label: "error-light" },
    { token: "--error-border", tw: "border-border-error", label: "error-border" },
]

const WARNING = [
    { token: "--warning", tw: "text-warning / bg-warning", label: "warning" },
    { token: "--warning-light", tw: "bg-warning-light", label: "warning-light" },
    { token: "--warning-border", tw: "border-border-warning", label: "warning-border" },
]

const INFO = [
    { token: "--info", tw: "text-info / bg-info", label: "info" },
    { token: "--info-light", tw: "bg-info-light", label: "info-light" },
    { token: "--info-border", tw: "border-border-info", label: "info-border" },
]

const ACTORS = [
    { token: "--human-fg", tw: "text-human", label: "human" },
    { token: "--human-bg", tw: "bg-human-bg", label: "human-bg" },
    { token: "--human-border", tw: "border-human-border", label: "human-border" },
    { token: "--agent-fg", tw: "text-agent", label: "agent" },
    { token: "--agent-bg", tw: "bg-agent-bg", label: "agent-bg" },
    { token: "--agent-border", tw: "border-agent-border", label: "agent-border" },
    { token: "--skill-fg", tw: "text-skill", label: "skill" },
    { token: "--skill-bg", tw: "bg-skill-bg", label: "skill-bg" },
    { token: "--skill-border", tw: "border-skill-border", label: "skill-border" },
]

const SURFACE_DARK = [
    { token: "--surface-dark", tw: "bg-surface-dark", label: "surface-dark" },
    { token: "--surface-dark-subtle", tw: "bg-surface-dark-subtle", label: "surface-dark-subtle" },
    { token: "--surface-dark-fg", tw: "text-surface-dark-fg", label: "surface-dark-fg" },
    { token: "--surface-dark-muted", tw: "text-surface-dark-muted", label: "surface-dark-muted" },
]

const PLATFORM = [
    { token: "--telegram", label: "telegram" },
    { token: "--discord", label: "discord" },
    { token: "--x-twitter", label: "x-twitter" },
    { token: "--stripe-fg", label: "stripe" },
]

const SHADCN_ALIASES = [
    { token: "--bg-1", tw: "bg-background", label: "background → bg-1" },
    { token: "--fg-1", tw: "text-foreground", label: "foreground → fg-1" },
    { token: "--bg-4", tw: "bg-muted", label: "muted → bg-4" },
    { token: "--fg-3", tw: "text-muted-foreground", label: "muted-foreground → fg-3" },
    { token: "--bg-1", tw: "bg-card", label: "card → bg-1" },
    { token: "--border-2", tw: "border-border", label: "border → border-2" },
    { token: "--border-2", tw: "border-input", label: "input → border-2" },
    { token: "--error", tw: "text-destructive", label: "destructive → error" },
]

const LINKS = [
    { token: "--link", tw: "text-link", label: "link" },
    { token: "--link-visited", label: "link-visited" },
]

/* ── Swatch component ── */

function Swatch({ token, tw, label }: { token: string; tw?: string; label: string }) {
    return (
        <div className="flex items-center gap-3">
            <div
                className="h-10 w-10 shrink-0 border border-border-2"
                style={{ backgroundColor: `var(${token})` }}
            />
            <div className="min-w-0">
                <p className="text-sm font-semibold text-fg-1 truncate">{label}</p>
                <p className="text-2xs text-fg-3 font-mono truncate">
                    {tw ?? token}
                </p>
            </div>
        </div>
    )
}

/* ── Section component ── */

function Section({ title, items }: { title: string; items: { token: string; tw?: string; label: string }[] }) {
    return (
        <div>
            <h2 className="text-lg font-semibold text-fg-1 mb-4">{title}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {items.map((item) => (
                    <Swatch key={item.label} {...item} />
                ))}
            </div>
        </div>
    )
}

/* ── Page ── */

export function ColorsDemo() {
    return (
        <DemoLayout title="Colors" description="Design tokens resolved from current theme.">
            <Section title="Background" items={BACKGROUNDS} />
            <Section title="Foreground" items={FOREGROUNDS} />
            <Section title="Border" items={BORDERS} />
            <Section title="Accent" items={ACCENT} />
            <Section title="Primary" items={PRIMARY} />
            <Section title="Success" items={SUCCESS} />
            <Section title="Error" items={ERROR} />
            <Section title="Warning" items={WARNING} />
            <Section title="Info" items={INFO} />
            <Section title="Actors" items={ACTORS} />
            <Section title="Surface Dark" items={SURFACE_DARK} />
            <Section title="Links" items={LINKS} />
            <Section title="Platform" items={PLATFORM} />
            <Section title="shadcn/ui Aliases" items={SHADCN_ALIASES} />
        </DemoLayout>
    )
}
