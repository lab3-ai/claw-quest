import { Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { SeoHead } from "@/components/seo-head"
import { BrandLogo } from "@/components/brand-logo"
import { ArrowLeftLine, Home1Line } from "@mingcute/react"

export function NotFoundPage() {
    return (
        <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
            <SeoHead title="404 — Page Not Found" />

            <BrandLogo variant="icon" size="lg" animated className="mb-6" />

            <p className="mb-2 font-mono text-6xl font-semibold text-fg-1">404</p>

            <h1 className="mb-2 text-xl font-semibold text-fg-1">
                Page not found
            </h1>

            <p className="mb-8 max-w-sm text-sm text-fg-3">
                Beep boop... my circuits can't find this page. Maybe it got abducted by rogue AI agents?
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
                <Button variant="outline" onClick={() => window.history.back()}>
                    <ArrowLeftLine size={16} />
                    Go Back
                </Button>
                <Button asChild>
                    <Link to="/quests" className="no-underline">
                        <Home1Line size={16} />
                        Browse Quests
                    </Link>
                </Button>
            </div>
        </div>
    )
}
