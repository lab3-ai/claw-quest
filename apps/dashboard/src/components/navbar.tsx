import { Link } from "@tanstack/react-router"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { Dashboard4Line, AddLine, DownLine, Compass3Line, Compass3Fill, CodeLine, CodeFill, TrophyLine, TrophyFill, Home4Line, Home4Fill } from "@mingcute/react"
import { getDiceBearUrl } from "@/components/avatarUtils"
import { useEffect, useState } from "react"
import { BrandLogo } from "@/components/brand-logo"

const NAV_ITEMS = [
    { to: "/", label: "Home", icon: Home4Line, iconActive: Home4Fill },
    { to: "/quests", label: "Quests", icon: Compass3Line, iconActive: Compass3Fill },
    { to: "/web3-skills", label: "Web3 Skills", icon: CodeLine, iconActive: CodeFill },
    { to: "/github-bounties", label: "Bounties", icon: TrophyLine, iconActive: TrophyFill },
] as const

/** Desktop nav links with active state styling */
function NavTabs() {
    const linkClass =
        "text-sm font-semibold text-fg-1 no-underline transition-colors duration-200 hover:text-primary [&.active]:text-primary [&.active]:font-semibold py-1.5 mr-4"

    return (
        <nav className="hidden items-center gap-2 lg:flex">
            {NAV_ITEMS.map(({ to, label }) => (
                <Link key={to} to={to} className={linkClass}>
                    {label}
                </Link>
            ))}
        </nav>
    )
}

/** Mobile bottom navigation bar — glass effect on scroll */
function BottomNav({ scrolled }: { scrolled: boolean }) {
    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border backdrop-blur-md bg-bg-base/80 lg:hidden">
            {/* 49px height (Apple HIG tab bar), 44px min touch target */}
            <div className="flex h-13 items-stretch justify-around">
                {NAV_ITEMS.map(({ to, label, icon: Icon, iconActive: IconActive }) => (
                    <Link
                        key={to}
                        to={to}
                        className="group flex flex-1 flex-col items-center justify-center gap-1 text-fg-3 no-underline transition-colors [&.active]:text-primary"
                    >
                        <span className="group-[.active]:hidden"><Icon size={24} /></span>
                        <span className="hidden group-[.active]:block"><IconActive size={24} /></span>
                        <span className="text-2xs leading-none font-medium">{label}</span>
                    </Link>
                ))}
            </div>
            {/* Safe area padding for devices with home indicator */}
            <div className="h-[env(safe-area-inset-bottom)]" />
        </nav>
    )
}

/** Desktop right-side actions (theme, create quest, user menu) */
function DesktopActions({ isAuthenticated, logout, handle, handleLabel }: {
    isAuthenticated: boolean
    logout: () => void
    handle: string
    handleLabel: string
}) {
    return (
        <div className="ml-auto hidden items-center gap-2 lg:flex">
            <ThemeSwitcher />

            {isAuthenticated ? (
                <>
                    <Button asChild variant="primary">
                        <Link to="/quests/new" className="no-underline">
                            <AddLine size={16} />
                            Create Quest
                        </Link>
                    </Button>

                    <Button asChild variant="outline">
                        <Link to="/dashboard" className="no-underline">
                            <Dashboard4Line size={16} />
                            Dashboard
                        </Link>
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                                <img src={getDiceBearUrl(handle, 32)} alt="" className="h-5 w-5 rounded-full" />
                                {handleLabel}
                                <DownLine size={16} />
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
                    <Button asChild variant="primary">
                        <Link to="/quests/new" className="no-underline">
                            <AddLine size={16} />
                            Create Quest
                        </Link>
                    </Button>
                </>
            )}
        </div>
    )
}

export function Navbar() {
    const { isAuthenticated, logout, user } = useAuth()

    const displayName = user?.user_metadata?.full_name as string | undefined
    const handle = displayName ?? user?.email?.split("@")[0] ?? "user"
    const handleLabel = displayName ? handle : `@${handle}`

    const [scrolled, setScrolled] = useState(false)
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8)
        onScroll()
        window.addEventListener("scroll", onScroll, { passive: true })
        return () => window.removeEventListener("scroll", onScroll)
    }, [])

    return (
        <>
            {/* Top header */}
            <header className={`sticky top-0 z-50 bg-bg-base transition-[border-color,backdrop-filter,box-shadow] duration-200 border-b ${scrolled ? "border-border backdrop-blur-md bg-bg-base/80" : "border-border-1"}`}>
                <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 md:px-6">
                    {/* Full logo on desktop, icon-only on mobile */}
                    <Link
                        to="/"
                        className="mr-5 flex items-center gap-2 no-underline max-lg:mr-auto"
                    >
                        <span className="hidden lg:block"><BrandLogo animated /></span>
                        <span className="lg:hidden"><BrandLogo variant="icon" animated /></span>
                    </Link>

                    <div className="hidden lg:block h-4 w-px bg-border-2 mr-3" />

                    <NavTabs />

                    {/* Mobile action buttons */}
                    <div className="flex items-center gap-2 lg:hidden">
                        {isAuthenticated ? (
                            <>
                                <Button asChild variant="primary">
                                    <Link to="/quests/new" className="no-underline">
                                        <AddLine size={16} />
                                        Create
                                    </Link>
                                </Button>
                                <Button asChild variant="outline" iconOnly>
                                    <Link to="/dashboard" className="no-underline">
                                        <Dashboard4Line size={16} />
                                    </Link>
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button asChild variant="outline">
                                    <Link to="/login" className="no-underline">Log in</Link>
                                </Button>
                                <Button asChild variant="primary">
                                    <Link to="/quests/new" className="no-underline">
                                        <AddLine size={16} />
                                        Create
                                    </Link>
                                </Button>
                            </>
                        )}
                    </div>

                    <DesktopActions
                        isAuthenticated={isAuthenticated}
                        logout={logout}
                        handle={handle}
                        handleLabel={handleLabel}
                    />
                </div>
            </header>

            {/* Mobile bottom nav */}
            <BottomNav scrolled={scrolled} />
        </>
    )
}
