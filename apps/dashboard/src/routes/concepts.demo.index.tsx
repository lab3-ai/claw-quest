import { Link } from "@tanstack/react-router"
import { PageTitle } from "@/components/page-title"
import { Palette2Line, TextLine, BadgeLine, PaintBrushLine } from "@mingcute/react"

const DEMOS = [
    {
        path: "/concepts/demo/buttons",
        title: "Buttons",
        description: "Fill, tonal, outline variants across 6 colors and 4 sizes",
        icon: Palette2Line,
    },
    {
        path: "/concepts/demo/typography",
        title: "Typography",
        description: "Font families, size scale, weights, line heights, and CSS tokens",
        icon: TextLine,
    },
    {
        path: "/concepts/demo/badges",
        title: "Badges",
        description: "Semantic, pill, outline, count variants and quest-specific badges",
        icon: BadgeLine,
    },
    {
        path: "/concepts/demo/colors",
        title: "Colors",
        description: "Design tokens resolved from current theme",
        icon: PaintBrushLine,
    },
] as const

export function DemoIndex() {
    return (
        <div className="mx-auto max-w-5xl px-6 py-8">
            <PageTitle
                title="Design System Demos"
                description="Interactive previews of UI components and design tokens"
            />
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {DEMOS.map(({ path, title, description, icon: Icon }) => (
                    <Link
                        key={path}
                        to={path}
                        className="group flex flex-col gap-3 border border-border-2 p-5 hover:bg-bg-1 transition-colors"
                    >
                        <Icon className="h-5 w-5 text-fg-3 group-hover:text-fg-1 transition-colors" />
                        <div>
                            <h2 className="text-lg font-semibold text-fg-1">{title}</h2>
                            <p className="mt-1 text-sm text-fg-3">{description}</p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    )
}
