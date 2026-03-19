import { Button } from "@/components/ui/button"
import { StarLine, DeleteLine, Settings1Line, AddLine } from "@mingcute/react"
import { DemoLayout } from "@/components/demo-layout"

const VARIANTS = [
    "default",
    "primary",
    "danger",
    "success",
    "warning",
    "info",
    "default-tonal",
    "primary-tonal",
    "danger-tonal",
    "success-tonal",
    "warning-tonal",
    "info-tonal",
    "outline",
    "default-outline",
    "primary-outline",
    "danger-outline",
    "success-outline",
    "warning-outline",
    "info-outline",
    "ghost",
    "link",
] as const

const SIZES = ["sm", "default", "lg", "xl"] as const

export function ConceptsDemoButtons() {
    return (
        <DemoLayout title="Buttons" description="Fill, tonal, outline variants across 6 colors and 4 sizes.">

            {/* All variants × default size */}
            <section className="space-y-4">
                <h2 className="text-lg font-semibold">Variants</h2>
                <div className="flex flex-wrap items-center gap-3">
                    {VARIANTS.map((v) => (
                        <Button key={v} variant={v}>
                            {v}
                        </Button>
                    ))}
                </div>
            </section>

            {/* All sizes × default variant */}
            <section className="space-y-4">
                <h2 className="text-lg font-semibold">Sizes</h2>
                <div className="flex flex-wrap items-end gap-3">
                    {SIZES.map((s) => (
                        <Button key={s} size={s}>
                            {s}
                        </Button>
                    ))}
                </div>
            </section>

            {/* Variant × Size matrix */}
            <section className="space-y-4">
                <h2 className="text-lg font-semibold">Variant × Size</h2>
                <div className="overflow-x-auto">
                    <table className="border-collapse">
                        <thead>
                            <tr>
                                <th className="p-2 text-left text-xs text-fg-3">Variant</th>
                                {SIZES.map((s) => (
                                    <th key={s} className="p-2 text-center text-xs text-fg-3">{s}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {VARIANTS.map((v) => (
                                <tr key={v}>
                                    <td className="p-2 font-mono text-xs">{v}</td>
                                    {SIZES.map((s) => (
                                        <td key={s} className="p-2">
                                            <Button variant={v} size={s}>
                                                Label
                                            </Button>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Icon buttons */}
            <section className="space-y-4">
                <h2 className="text-lg font-semibold">Icon Buttons (iconOnly)</h2>
                <div className="space-y-3">
                    {(["default", "primary", "danger", "success", "warning", "info", "default-tonal", "primary-tonal", "danger-tonal", "outline", "ghost"] as const).map((v) => (
                        <div key={v} className="flex items-center gap-3">
                            <span className="w-36 font-mono text-xs text-fg-3">{v}</span>
                            {SIZES.map((s) => (
                                <Button key={s} variant={v} size={s} iconOnly>
                                    <StarLine size={s === "sm" ? 14 : s === "xl" ? 22 : 16} />
                                </Button>
                            ))}
                        </div>
                    ))}
                </div>
            </section>

            {/* With icons */}
            <section className="space-y-4">
                <h2 className="text-lg font-semibold">With Icons</h2>
                <div className="flex flex-wrap items-center gap-3">
                    <Button>
                        <AddLine size={16} /> Create
                    </Button>
                    <Button variant="danger">
                        <DeleteLine size={16} /> Delete
                    </Button>
                    <Button variant="primary">
                        <Settings1Line size={16} /> Settings
                    </Button>
                    <Button variant="primary-tonal">
                        <StarLine size={16} /> Favorite
                    </Button>
                    <Button variant="outline">
                        <Settings1Line size={16} /> Options
                    </Button>
                </div>
            </section>

            {/* Disabled */}
            <section className="space-y-4">
                <h2 className="text-lg font-semibold">Disabled</h2>
                <div className="flex flex-wrap items-center gap-3">
                    {VARIANTS.filter((v) => v !== "link").map((v) => (
                        <Button key={v} variant={v} disabled>
                            {v}
                        </Button>
                    ))}
                </div>
            </section>
        </DemoLayout>
    )
}
