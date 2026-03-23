import { Link } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeSwitcher } from "@/components/theme-switcher";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Dashboard4Line,
  Dashboard4Fill,
  AddLine,
  Compass3Line,
  Compass3Fill,
  CodeLine,
  CodeFill,
  TrophyLine,
  TrophyFill,
  Home4Line,
  Home4Fill,
  User3Line,
  User3Fill,
  ExitLine,
  ExitFill,
  Wallet4Line,
  Wallet4Fill,
} from "@mingcute/react";
import { getUserAvatarUrl } from "@/components/avatarUtils";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";

const NAV_ITEMS = [
  { to: "/", label: "Home", icon: Home4Line, iconActive: Home4Fill },
  {
    to: "/quests",
    label: "Quests",
    icon: Compass3Line,
    iconActive: Compass3Fill,
  },
  {
    to: "/web3-skills",
    label: "Web3 Skills",
    icon: CodeLine,
    iconActive: CodeFill,
  },
  {
    to: "/github-bounties",
    label: "Bounties",
    icon: TrophyLine,
    iconActive: TrophyFill,
  },
  {
    to: "/wallet",
    label: "Wallet",
    icon: Wallet4Line,
    iconActive: Wallet4Fill,
  },
] as const;

/** Desktop nav links with active state styling */
function NavTabs() {
  const linkClass =
    "text-sm font-semibold text-fg-1 no-underline transition-colors duration-200 hover:text-primary [&.active]:text-primary [&.active]:font-semibold py-1.5 mr-4";

  return (
    <nav className="hidden items-center gap-2 lg:flex">
      {NAV_ITEMS.map(({ to, label }) => (
        <Link key={to} to={to} className={linkClass}>
          {label}
        </Link>
      ))}
    </nav>
  );
}

/** Mobile bottom navigation bar — glass effect on scroll */
function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-md bg-bg-base/80 lg:hidden">
      {/* 49px height (Apple HIG tab bar), 44px min touch target */}
      <div className="flex h-13 items-stretch justify-around">
        {NAV_ITEMS.map(({ to, label, icon: Icon, iconActive: IconActive }) => (
          <Link
            key={to}
            to={to}
            className="group flex flex-1 flex-col items-center justify-center gap-1 text-fg-3 no-underline transition-colors [&.active]:text-primary"
          >
            <span className="group-[.active]:hidden">
              <Icon size={24} />
            </span>
            <span className="hidden group-[.active]:block">
              <IconActive size={24} />
            </span>
            <span className="text-2xs leading-none font-medium">{label}</span>
          </Link>
        ))}
      </div>
      {/* Safe area padding for devices with home indicator */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}

/** Desktop right-side actions (theme, create quest, user menu) */
function DesktopActions({
  isAuthenticated,
  logout,
  handle,
  handleLabel,
  email,
  avatarUrl,
}: {
  isAuthenticated: boolean;
  logout: () => void;
  handle: string;
  handleLabel: string;
  email?: string;
  avatarUrl: string;
}) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="ml-auto hidden items-center gap-2 lg:flex">
        <ThemeSwitcher />

        {isAuthenticated ? (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button asChild variant="primary-outline">
                  <Link to="/quests/new" className="no-underline">
                    <AddLine size={16} />
                    Create Quest
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Create a new quest</TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <button className="h-8 w-8 rounded overflow-hidden cursor-pointer p-0.5 border border-border-2 bg-bg-1 hover:opacity-70 transition-opacity">
                      <img
                        src={avatarUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>{handleLabel}</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-52">
                {/* User info header */}
                <div className="flex items-center gap-3 px-2 py-2">
                  <img
                    src={avatarUrl}
                    alt=""
                    className="h-9 w-9 rounded shrink-0 object-cover"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-fg-1 truncate">
                      {handleLabel}
                    </div>
                    <div className="text-xs text-fg-3 truncate">
                      {email ?? handle}
                    </div>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="group">
                  <Link to="/dashboard" className="no-underline">
                    <span className="relative h-4 w-4 shrink-0">
                      <Dashboard4Line
                        size={16}
                        className="absolute inset-0 transition-opacity duration-150 group-data-[highlighted]:opacity-0"
                      />
                      <Dashboard4Fill
                        size={16}
                        className="absolute inset-0 transition-opacity duration-150 opacity-0 group-data-[highlighted]:opacity-100"
                      />
                    </span>
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="group">
                  <Link to="/account" className="no-underline">
                    <span className="relative h-4 w-4 shrink-0">
                      <User3Line
                        size={16}
                        className="absolute inset-0 transition-opacity duration-150 group-data-[highlighted]:opacity-0"
                      />
                      <User3Fill
                        size={16}
                        className="absolute inset-0 transition-opacity duration-150 opacity-0 group-data-[highlighted]:opacity-100"
                      />
                    </span>
                    Account
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => logout()}
                  className="group text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                >
                  <span className="relative h-4 w-4 shrink-0">
                    <ExitLine
                      size={16}
                      className="absolute inset-0 transition-opacity duration-150 group-data-[highlighted]:opacity-0"
                    />
                    <ExitFill
                      size={16}
                      className="absolute inset-0 transition-opacity duration-150 opacity-0 group-data-[highlighted]:opacity-100"
                    />
                  </span>
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
            <Button asChild variant="primary-outline">
              <Link to="/quests/new" className="no-underline">
                <AddLine size={16} />
                Create Quest
              </Link>
            </Button>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}

export function Navbar() {
  const { isAuthenticated, logout, user } = useAuth();

  const displayName = user?.user_metadata?.full_name as string | undefined;
  const handle = displayName ?? user?.email?.split("@")[0] ?? "user";
  const handleLabel = displayName ? handle : `@${handle}`;
  const avatarUrl = getUserAvatarUrl(user, handle, 40);

  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* Top header */}
      <header
        className={`sticky top-0 z-50 bg-bg-base transition-[border-color,backdrop-filter,box-shadow] duration-200 border-b ${scrolled ? "border-border-2 backdrop-blur-md bg-bg-base/80" : "border-border-2"}`}
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 md:px-6">
          {/* Full logo on desktop, icon-only on mobile */}
          <Link
            to="/"
            className="mr-5 flex items-center gap-2 no-underline max-lg:mr-auto"
          >
            <span className="hidden lg:block">
              <BrandLogo animated />
            </span>
            <span className="lg:hidden">
              <BrandLogo variant="icon" animated />
            </span>
          </Link>

          <div className="hidden lg:block h-4 w-px bg-border-2 mr-3" />

          <NavTabs />

          {/* Mobile action buttons */}
          <div className="flex items-center gap-2 lg:hidden">
            <ThemeSwitcher />
            {isAuthenticated ? (
              <>
                <Button asChild variant="primary-outline" size="default">
                  <Link to="/quests/new" className="no-underline">
                    <AddLine size={16} />
                    Create
                  </Link>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="h-8 w-8 rounded overflow-hidden cursor-pointer p-0.5 border border-border-2 bg-bg-1 hover:opacity-70 transition-opacity">
                      <img
                        src={avatarUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <div className="flex items-center gap-3 px-2 py-2">
                      <img
                        src={avatarUrl}
                        alt=""
                        className="h-9 w-9 rounded shrink-0 object-cover"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-fg-1 truncate">
                          {handleLabel}
                        </div>
                        <div className="text-2xs text-fg-3 truncate">
                          {user?.email ?? handle}
                        </div>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild className="group">
                      <Link to="/dashboard" className="no-underline">
                        <span className="relative h-4 w-4 shrink-0">
                          <Dashboard4Line
                            size={16}
                            className="absolute inset-0 transition-opacity duration-150 group-data-[highlighted]:opacity-0"
                          />
                          <Dashboard4Fill
                            size={16}
                            className="absolute inset-0 transition-opacity duration-150 opacity-0 group-data-[highlighted]:opacity-100"
                          />
                        </span>
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="group">
                      <Link to="/account" className="no-underline">
                        <span className="relative h-4 w-4 shrink-0">
                          <User3Line
                            size={16}
                            className="absolute inset-0 transition-opacity duration-150 group-data-[highlighted]:opacity-0"
                          />
                          <User3Fill
                            size={16}
                            className="absolute inset-0 transition-opacity duration-150 opacity-0 group-data-[highlighted]:opacity-100"
                          />
                        </span>
                        Account
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => logout()}
                      className="group text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                    >
                      <span className="relative h-4 w-4 shrink-0">
                        <ExitLine
                          size={16}
                          className="absolute inset-0 transition-opacity duration-150 group-data-[highlighted]:opacity-0"
                        />
                        <ExitFill
                          size={16}
                          className="absolute inset-0 transition-opacity duration-150 opacity-0 group-data-[highlighted]:opacity-100"
                        />
                      </span>
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button asChild variant="outline" size="default">
                  <Link to="/login" className="no-underline">
                    Log in
                  </Link>
                </Button>
                <Button asChild variant="primary-outline" size="default">
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
            email={user?.email}
            avatarUrl={avatarUrl}
          />
        </div>
      </header>

      {/* Mobile bottom nav */}
      <BottomNav />
    </>
  );
}
