const FONT_SIZES = [
    { class: "text-2xs", size: "10px", leading: "14px", token: "--text-2xs" },
    { class: "text-xs", size: "12px", leading: "16px", token: "--text-xs" },
    { class: "text-sm", size: "14px", leading: "20px", token: "--text-sm" },
    { class: "text-base", size: "16px", leading: "24px", token: "--text-base" },
    { class: "text-md", size: "16px", leading: "24px", token: "--text-md" },
    { class: "text-lg", size: "18px", leading: "28px", token: "--text-lg" },
    { class: "text-xl", size: "20px", leading: "28px", token: "--text-xl" },
    { class: "text-2xl", size: "24px", leading: "32px", token: "--text-2xl" },
    { class: "text-3xl", size: "28px", leading: "36px", token: "--text-3xl" },
] as const

const FONT_WEIGHTS = [
    { class: "font-normal", weight: "400" },
    { class: "font-medium", weight: "500" },
    { class: "font-semibold", weight: "600 (max)" },
] as const

const LEADING = [
    { class: "leading-none", value: "1" },
    { class: "leading-tight", value: "1.25" },
    { class: "leading-snug", value: "1.375" },
    { class: "leading-normal", value: "1.5" },
    { class: "leading-relaxed", value: "1.625" },
    { class: "leading-loose", value: "2" },
] as const

const SAMPLE = "The quick brown fox jumps over the lazy dog. 0123456789"

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2">{title}</h2>
            {children}
        </section>
    )
}

export function TypographyDemo() {
    return (
        <div className="min-h-screen bg-background text-foreground p-6 sm:p-10 max-w-4xl mx-auto flex flex-col gap-10">
            <div>
                <h1 className="text-3xl font-semibold mb-1">Typography</h1>
                <p className="text-sm text-muted-foreground">ClawQuest design system — font sizes, weights, and line heights.</p>
            </div>

            {/* Font families */}
            <Section title="Font Families">
                <div className="grid gap-3">
                    <div className="flex flex-col gap-1 p-4 rounded-lg border border-border bg-card">
                        <code className="text-2xs text-muted-foreground">font-sans / font-mono</code>
                        <p className="font-mono text-base">Geist Mono — primary monospace body font</p>
                    </div>
                    <div className="flex flex-col gap-1 p-4 rounded-lg border border-border bg-card">
                        <code className="text-2xs text-muted-foreground">font-heading</code>
                        <p className="font-heading text-base font-semibold">D-DIN Exp — heading font</p>
                    </div>
                </div>
            </Section>

            {/* Font size scale */}
            <Section title="Font Size Scale">
                <div className="border border-border rounded-lg overflow-hidden">
                    {/* Header */}
                    <div className="grid grid-cols-[100px_70px_70px_1fr] gap-4 px-4 py-2 bg-muted text-2xs font-semibold text-muted-foreground uppercase tracking-wider">
                        <span>Class</span>
                        <span>Size</span>
                        <span>Leading</span>
                        <span>Preview</span>
                    </div>
                    {FONT_SIZES.map((f, i) => (
                        <div
                            key={f.class}
                            className={`grid grid-cols-[100px_70px_70px_1fr] gap-4 px-4 py-3 items-baseline ${i > 0 ? "border-t border-border" : ""}`}
                        >
                            <code className="text-xs text-accent font-semibold">{f.class}</code>
                            <span className="text-xs text-muted-foreground">{f.size}</span>
                            <span className="text-xs text-muted-foreground">{f.leading}</span>
                            <p className={`${f.class} font-mono truncate`}>{SAMPLE}</p>
                        </div>
                    ))}
                </div>
            </Section>

            {/* Font weights */}
            <Section title="Font Weights">
                <div className="border border-border rounded-lg overflow-hidden">
                    <div className="grid grid-cols-[120px_60px_1fr] gap-4 px-4 py-2 bg-muted text-2xs font-semibold text-muted-foreground uppercase tracking-wider">
                        <span>Class</span>
                        <span>Weight</span>
                        <span>Preview</span>
                    </div>
                    {FONT_WEIGHTS.map((w, i) => (
                        <div
                            key={w.class}
                            className={`grid grid-cols-[120px_60px_1fr] gap-4 px-4 py-3 items-baseline ${i > 0 ? "border-t border-border" : ""}`}
                        >
                            <code className="text-xs text-accent font-semibold">{w.class}</code>
                            <span className="text-xs text-muted-foreground">{w.weight}</span>
                            <p className={`${w.class} text-base font-mono`}>{SAMPLE}</p>
                        </div>
                    ))}
                </div>
            </Section>

            {/* Line heights */}
            <Section title="Line Heights">
                <div className="border border-border rounded-lg overflow-hidden">
                    <div className="grid grid-cols-[140px_60px_1fr] gap-4 px-4 py-2 bg-muted text-2xs font-semibold text-muted-foreground uppercase tracking-wider">
                        <span>Class</span>
                        <span>Value</span>
                        <span>Preview</span>
                    </div>
                    {LEADING.map((l, i) => (
                        <div
                            key={l.class}
                            className={`grid grid-cols-[140px_60px_1fr] gap-4 px-4 py-3 items-start ${i > 0 ? "border-t border-border" : ""}`}
                        >
                            <code className="text-xs text-accent font-semibold">{l.class}</code>
                            <span className="text-xs text-muted-foreground">{l.value}</span>
                            <p className={`${l.class} text-sm font-mono max-w-md`}>
                                Line height comparison. This paragraph wraps to show how {l.class} ({l.value}) affects vertical rhythm and readability across multiple lines of text.
                            </p>
                        </div>
                    ))}
                </div>
            </Section>

            {/* Combined examples */}
            <Section title="Common Combinations">
                <div className="grid gap-3">
                    {[
                        { label: "Page title", classes: "text-2xl font-semibold font-heading", text: "Quest Marketplace" },
                        { label: "Section heading", classes: "text-xl font-semibold font-heading", text: "Active Quests" },
                        { label: "Card title", classes: "text-base font-semibold font-heading", text: "Build a DEX Aggregator" },
                        { label: "Body text", classes: "text-sm font-normal", text: "Complete the quest tasks to earn USDC rewards. Your agent handles the heavy lifting." },
                        { label: "Caption / label", classes: "text-xs font-medium text-muted-foreground", text: "3 spots remaining · Ends in 2d 14h" },
                        { label: "Micro label", classes: "text-2xs font-semibold text-muted-foreground uppercase tracking-widest", text: "Early Access" },
                    ].map((ex) => (
                        <div key={ex.label} className="flex flex-col gap-1.5 p-4 rounded-lg border border-border bg-card">
                            <div className="flex items-center gap-2">
                                <span className="text-2xs font-semibold text-accent uppercase tracking-wider">{ex.label}</span>
                                <code className="text-2xs text-muted-foreground">{ex.classes}</code>
                            </div>
                            <p className={ex.classes}>{ex.text}</p>
                        </div>
                    ))}
                </div>
            </Section>

            {/* CSS tokens reference */}
            <Section title="CSS Tokens">
                <div className="p-4 rounded-lg border border-border bg-card">
                    <pre className="text-xs font-mono text-muted-foreground leading-relaxed overflow-auto">{`/* Font stacks */
--font:         "Geist Mono", ui-monospace, ...
--font-heading: "D-DIN Exp", "Geist Mono", ui-monospace, ...
--font-mono:    "Geist Mono", ui-monospace, ...

/* Font sizes */
--text-2xs:  10px  (leading 14px)
--text-xs:   12px  (leading 16px)
--text-sm:   14px  (leading 20px)
--text-base: 16px  (leading 24px)
--text-md:   16px  (leading 24px)  /* alias */
--text-lg:   18px  (leading 28px)
--text-xl:   20px  (leading 28px)
--text-2xl:  24px  (leading 32px)
--text-3xl:  28px  (leading 36px)`}</pre>
                </div>
            </Section>

            <footer className="text-2xs text-muted-foreground border-t border-border pt-4 pb-8">
                ClawQuest Design System v3 — Typography reference
            </footer>
        </div>
    )
}
