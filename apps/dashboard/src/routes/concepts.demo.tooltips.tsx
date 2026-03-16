import { Button } from "@/components/ui/button"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import { AddLine, Dashboard4Line, StarLine, FlashLine, Settings1Line, Delete2Line } from "@mingcute/react"

export function TooltipsDemo() {
    return (
        <TooltipProvider delayDuration={200}>
            <div className="max-w-3xl mx-auto py-8 px-4 space-y-10">
                <div>
                    <h1 className="text-2xl font-semibold mb-1">Tooltips</h1>
                    <p className="text-sm text-muted-foreground">Hover/focus to reveal contextual hints.</p>
                </div>

                {/* Basic */}
                <section className="space-y-3">
                    <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Basic</h2>
                    <div className="flex flex-wrap gap-3">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline">Hover me</Button>
                            </TooltipTrigger>
                            <TooltipContent>This is a tooltip</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="primary">Primary button</Button>
                            </TooltipTrigger>
                            <TooltipContent>Create something new</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="danger">Danger zone</Button>
                            </TooltipTrigger>
                            <TooltipContent>This action is irreversible</TooltipContent>
                        </Tooltip>
                    </div>
                </section>

                {/* Icon buttons */}
                <section className="space-y-3">
                    <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Icon Buttons (essential for icon-only)</h2>
                    <div className="flex flex-wrap gap-3">
                        {[
                            { icon: AddLine, label: "Create Quest" },
                            { icon: Dashboard4Line, label: "Dashboard" },
                            { icon: StarLine, label: "Favorites" },
                            { icon: FlashLine, label: "Quick Actions" },
                            { icon: Settings1Line, label: "Settings" },
                            { icon: Delete2Line, label: "Delete" },
                        ].map(({ icon: Icon, label }) => (
                            <Tooltip key={label}>
                                <TooltipTrigger asChild>
                                    <Button variant="outline" iconOnly>
                                        <Icon size={16} />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>{label}</TooltipContent>
                            </Tooltip>
                        ))}
                    </div>
                </section>

                {/* Positions */}
                <section className="space-y-3">
                    <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Positions</h2>
                    <div className="flex flex-wrap gap-3">
                        {(["top", "bottom", "left", "right"] as const).map(side => (
                            <Tooltip key={side}>
                                <TooltipTrigger asChild>
                                    <Button variant="outline">{side}</Button>
                                </TooltipTrigger>
                                <TooltipContent side={side}>Tooltip on {side}</TooltipContent>
                            </Tooltip>
                        ))}
                    </div>
                </section>

                {/* Sizes */}
                <section className="space-y-3">
                    <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Button Sizes with Tooltips</h2>
                    <div className="flex flex-wrap items-center gap-3">
                        {(["sm", "default", "lg"] as const).map(size => (
                            <Tooltip key={size}>
                                <TooltipTrigger asChild>
                                    <Button variant="outline" iconOnly size={size}>
                                        <StarLine size={size === "sm" ? 14 : 16} />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Size: {size}</TooltipContent>
                            </Tooltip>
                        ))}
                    </div>
                </section>

                {/* Custom content */}
                <section className="space-y-3">
                    <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Rich Content</h2>
                    <div className="flex flex-wrap gap-3">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline">With shortcut</Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <div className="flex items-center gap-2">
                                    <span>New Quest</span>
                                    <kbd className="px-1.5 py-0.5 rounded border border-border bg-bg-2 text-2xs font-mono">⌘N</kbd>
                                </div>
                            </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="text-sm text-muted-foreground underline decoration-dashed cursor-help">What is FCFS?</span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[200px]">
                                First Come, First Served — the first N agents to complete the quest win rewards.
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </section>

                {/* Inline text */}
                <section className="space-y-3">
                    <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Inline Text</h2>
                    <p className="text-sm text-muted-foreground">
                        Rewards are paid in{" "}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="text-foreground font-semibold cursor-help border-b border-dashed border-border">USDC</span>
                            </TooltipTrigger>
                            <TooltipContent>USD Coin — a stablecoin pegged 1:1 to USD</TooltipContent>
                        </Tooltip>
                        {" "}and verified{" "}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="text-foreground font-semibold cursor-help border-b border-dashed border-border">on-chain</span>
                            </TooltipTrigger>
                            <TooltipContent>Transactions recorded on a public blockchain for transparency</TooltipContent>
                        </Tooltip>.
                    </p>
                </section>
            </div>
        </TooltipProvider>
    )
}
