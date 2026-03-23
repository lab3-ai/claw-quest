import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { DemoLayout } from "@/components/demo-layout"

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-fg-1 border-b border-border-2 pb-2">{title}</h2>
            {children}
        </section>
    )
}

export function InputsDemo() {
    return (
        <DemoLayout title="Inputs & Textarea" description="Form input components — states, sizes, and validation patterns.">

            {/* Sizes */}
            <Section title="Input — Sizes">
                <p className="text-xs text-fg-3">Matches button sizes: <code className="text-accent">md</code> (h-8), <code className="text-accent">lg</code> (h-9, default), <code className="text-accent">xl</code> (h-10).</p>
                <div className="grid gap-4 max-w-lg">
                    <div className="flex flex-col gap-2">
                        <Label>md (h-8)</Label>
                        <Input inputSize="md" placeholder="Size md — h-8" />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label>lg (h-9) — default</Label>
                        <Input inputSize="lg" placeholder="Size lg — h-9" />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label>xl (h-10)</Label>
                        <Input inputSize="xl" placeholder="Size xl — h-10" />
                    </div>
                </div>
            </Section>

            {/* Default States */}
            <Section title="Input — States">
                <div className="grid gap-4 max-w-lg">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="default">Default</Label>
                        <Input id="default" placeholder="Enter text..." />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="with-value">With value</Label>
                        <Input id="with-value" defaultValue="Hello world" />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="disabled">Disabled</Label>
                        <Input id="disabled" placeholder="Disabled input" disabled />
                    </div>
                </div>
            </Section>

            {/* Input Types */}
            <Section title="Input — Types">
                <div className="grid gap-4 max-w-lg">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" placeholder="you@example.com" />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="password">Password</Label>
                        <Input id="password" type="password" placeholder="••••••••" />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="number">Number</Label>
                        <Input id="number" type="number" placeholder="0" />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="search">Search</Label>
                        <Input id="search" type="search" placeholder="Search..." />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="url">URL</Label>
                        <Input id="url" type="url" placeholder="https://..." />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="date">Date</Label>
                        <Input id="date" type="datetime-local" />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="file">File</Label>
                        <Input id="file" type="file" />
                    </div>
                </div>
            </Section>

            {/* Validation States */}
            <Section title="Input — Validation States">
                <div className="grid gap-4 max-w-lg">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="normal">Normal</Label>
                        <Input id="normal" placeholder="Normal input" />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="error" className="text-error">Title *</Label>
                        <Input id="error" placeholder="Required field" className="border-destructive focus-visible:ring-destructive" />
                        <span className="text-xs text-error">Title is required</span>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="success">Verified</Label>
                        <Input id="success" defaultValue="0x1234...abcd" className="border-success focus-visible:ring-success" />
                        <span className="text-xs text-success">Wallet verified</span>
                    </div>
                </div>
            </Section>

            {/* Textarea */}
            <Section title="Textarea">
                <div className="grid gap-4 max-w-lg">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="ta-default">Default</Label>
                        <Textarea id="ta-default" placeholder="Enter description..." />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="ta-value">With value</Label>
                        <Textarea id="ta-value" defaultValue="Use the ClawFriend skill to register your agent and complete the onboarding tutorial. This quest verifies basic agent capabilities." />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="ta-disabled">Disabled</Label>
                        <Textarea id="ta-disabled" placeholder="Cannot edit" disabled />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="ta-error" className="text-error">Description *</Label>
                        <Textarea id="ta-error" placeholder="Required" className="border-destructive focus-visible:ring-destructive" />
                        <span className="text-xs text-error">Description is required</span>
                    </div>
                </div>
            </Section>

            {/* With Labels + Helper text */}
            <Section title="Form Pattern — Label + Input + Helper">
                <div className="grid gap-4 max-w-lg p-4 border border-border-2 rounded bg-bg-1">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="form-title" className="font-semibold">Title *</Label>
                        <Input id="form-title" placeholder="e.g. Bridge 100 USDC to Arbitrum" />
                        <span className="text-xs text-fg-3">Short, descriptive title for the quest</span>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="form-desc" className="font-semibold">Description</Label>
                        <span className="text-xs text-fg-3 -mt-1">Agent-readable. Explain the overall quest goal.</span>
                        <Textarea id="form-desc" placeholder="Use the ClawFriend skill to register your agent..." rows={4} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="form-start" className="font-semibold">Start</Label>
                            <Input id="form-start" type="datetime-local" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="form-end" className="font-semibold">End</Label>
                            <Input id="form-end" type="datetime-local" />
                        </div>
                    </div>
                </div>
            </Section>

            {/* Token Reference */}
            <Section title="Token Reference">
                <div className="p-4 rounded border border-border-2 bg-bg-1">
                    <pre className="text-xs font-mono text-fg-3 leading-relaxed overflow-auto">{`/* Input sizes (matches button) */
md:           h-8  px-3  text-sm
lg:           h-9  px-3  text-sm  (default)
xl:           h-10 px-3  text-sm

/* Shared tokens */
border:       border-border-2 → hover:border-border-3 → focus:border-fg-1
background:   bg-bg-base
placeholder:  text-fg-3
radius:       rounded-button (2px)
transition:   all 200ms

/* Textarea */
min-height:   min-h-[80px]
(same border/bg/focus as Input)`}</pre>
                </div>
            </Section>

        </DemoLayout>
    )
}
