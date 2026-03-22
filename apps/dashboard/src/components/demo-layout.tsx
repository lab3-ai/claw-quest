import { Link } from "@tanstack/react-router"
import { ThemeSwitcher } from "./theme-switcher"
import { ArrowLeftFill } from "@mingcute/react"

interface DemoLayoutProps {
    title: string
    description: string
    children: React.ReactNode
}

/** Shared layout for /concepts/demo/* pages — top bar with back link + theme toggle */
export function DemoLayout({ title, description, children }: DemoLayoutProps) {
    return (
        <div className="min-h-screen bg-bg-base text-fg-1">
            {/* Top bar */}
            <div className="sticky top-0 z-10 bg-bg-base/80 backdrop-blur-sm border-b border-border-2">
                <div className="max-w-4xl mx-auto px-6 sm:px-10 py-3 flex items-center justify-between">
                    <Link
                        to="/concepts/demo"
                        className="inline-flex items-center gap-1.5 text-xs text-fg-3 hover:text-fg-1 transition-colors no-underline"
                    >
                        <ArrowLeftFill size={14} />
                        Demo Index
                    </Link>
                    <ThemeSwitcher />
                </div>
            </div>

            {/* Content */}
            <div className="p-6 sm:p-10 max-w-4xl mx-auto flex flex-col gap-10">
                <div>
                    <h1 className="text-3xl font-semibold font-heading mb-1">{title}</h1>
                    <p className="text-sm text-fg-3">{description}</p>
                </div>
                {children}
                <footer className="text-2xs text-fg-3 border-t border-border-2 pt-4 pb-8">
                    ClawQuest Design System v3
                </footer>
            </div>
        </div>
    )
}
