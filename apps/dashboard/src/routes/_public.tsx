import { Outlet, Link } from "@tanstack/react-router"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import { useState } from "react"

export function PublicLayout() {
    const { isAuthenticated, logout, user } = useAuth()
    const [mobileOpen, setMobileOpen] = useState(false)

    const displayName = user?.user_metadata?.full_name as string | undefined
    const handle = displayName ?? user?.email?.split("@")[0] ?? "user"
    const handleLabel = displayName ? handle : `@${handle}`

    return (
        <div className="flex min-h-screen flex-col">
            {/* Topbar */}
            <header className="sticky top-0 z-50 bg-background">
                <div className="mx-auto flex h-14 max-w-[1100px] items-center gap-2 px-6">
                    <Link
                        to="/quests"
                        className="mr-5 flex items-center gap-1.5 no-underline"
                    >
                        {/* <img src="/logo-clawquest.png" alt="ClawQuest" className="h-10 w-auto object-contain" /> */}
                        <span className="text-base font-semibold text-foreground">CLAWQUEST</span>
                    </Link>

                    {/* Desktop nav */}
                    <nav className="hidden items-center gap-1 sm:flex">
                        <Link
                            to="/quests"
                            className="px-0 py-1.5 text-sm text-muted-foreground no-underline hover:text-foreground [&.active]:font-semibold [&.active]:text-foreground [&.active]:border-b-2 [&.active]:border-foreground"
                        >
                            Quests
                        </Link>
                    </nav>

                    {/* Mobile hamburger */}
                    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                        <SheetTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="ml-auto sm:hidden"
                                aria-label="Menu"
                            >
                                <svg
                                    className="h-5 w-5"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                    viewBox="0 0 24 24"
                                >
                                    <path d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-64">
                            <SheetHeader>
                                <SheetTitle>Menu</SheetTitle>
                            </SheetHeader>
                            <nav className="mt-4 flex flex-col gap-1">
                                <Link
                                    to="/quests"
                                    onClick={() => setMobileOpen(false)}
                                    className="rounded px-3 py-2.5 text-sm text-foreground no-underline hover:bg-muted"
                                >
                                    Quests
                                </Link>
                                {isAuthenticated ? (
                                    <>
                                        <Link
                                            to="/dashboard"
                                            onClick={() => setMobileOpen(false)}
                                            className="rounded px-3 py-2.5 text-sm text-foreground no-underline hover:bg-muted"
                                        >
                                            Dashboard
                                        </Link>
                                        <Link
                                            to="/account"
                                            onClick={() => setMobileOpen(false)}
                                            className="rounded px-3 py-2.5 text-sm text-foreground no-underline hover:bg-muted"
                                        >
                                            Account
                                        </Link>
                                        <div className="my-1 h-px bg-border" />
                                        <button
                                            onClick={() => {
                                                logout()
                                                setMobileOpen(false)
                                            }}
                                            className="rounded px-3 py-2.5 text-left text-sm text-destructive hover:bg-muted"
                                        >
                                            Log out
                                        </button>
                                    </>
                                ) : (
                                    <Link
                                        to="/login"
                                        onClick={() => setMobileOpen(false)}
                                        className="rounded px-3 py-2.5 text-sm text-foreground no-underline hover:bg-muted"
                                    >
                                        Log in
                                    </Link>
                                )}
                            </nav>
                        </SheetContent>
                    </Sheet>

                    {/* Desktop right */}
                    <div className="ml-auto hidden items-center gap-3 sm:flex">
                        {isAuthenticated ? (
                            <>
                                <Button asChild>
                                    <Link to="/quests/new" className="no-underline">
                                        + Create Quest
                                    </Link>
                                </Button>

                                <Button asChild variant="outline">
                                    <Link to="/dashboard" className="no-underline">
                                        Dashboard
                                    </Link>
                                </Button>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline">
                                            {handleLabel}
                                            <svg
                                                className="h-3 w-3 ml-1"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth={2}
                                                viewBox="0 0 24 24"
                                            >
                                                <path d="m6 9 6 6 6-6" />
                                            </svg>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-40">
                                        <DropdownMenuItem asChild>
                                            <Link to="/account" className="no-underline">
                                                Account
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={() => logout()}
                                            className="text-destructive focus:text-destructive"
                                        >
                                            Log out
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </>
                        ) : (
                            <>
                                <Button asChild variant="outline">
                                    <Link to="/login" className="no-underline">
                                        Log in
                                    </Link>
                                </Button>
                                <Button asChild>
                                    <Link to="/quests/new" className="no-underline">
                                        + Create Quest
                                    </Link>
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </header>

            <div className="page-container flex-1">
                <Outlet />
            </div>

            {/* Footer */}
            <footer className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-center gap-4 px-6 py-6 text-xs text-muted-foreground max-sm:flex-col max-sm:gap-2 max-sm:py-4">
                <span>ClawQuest v0.1 beta</span>
                <a
                    href="/privacy.html"
                    className="text-muted-foreground no-underline hover:text-foreground"
                >
                    Privacy
                </a>
                <a
                    href="/terms.html"
                    className="text-muted-foreground no-underline hover:text-foreground"
                >
                    Terms
                </a>
                <a
                    href="https://api.clawquest.ai/docs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground no-underline hover:text-foreground"
                >
                    API Docs
                </a>
                <a
                    href="https://t.me/ClawQuest_aibot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground no-underline hover:text-foreground"
                >
                    Telegram Bot
                </a>
            </footer>
        </div>
    )
}
