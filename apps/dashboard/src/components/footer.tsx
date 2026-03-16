import { TELEGRAM_BOT_USERNAME } from "@/lib/telegram-oidc"

const LINKS: { href: string; label: string; external?: boolean }[] = [
    { href: "/quests", label: "Quests" },
    { href: "/web3-skills", label: "Skills" },
    { href: "/github-bounties", label: "Bounties" },
    { href: "https://api.clawquest.ai/docs", label: "Docs", external: true },
    { href: `https://t.me/${TELEGRAM_BOT_USERNAME}`, label: "Telegram", external: true },
    { href: "https://x.com/clawquest", label: "X", external: true },
]

export function Footer() {
    return (
        <footer className="mx-auto flex max-w-6xl w-full items-center justify-between px-4 md:px-6 py-4 text-xs text-muted-foreground max-md:flex-col max-md:gap-3 max-md:py-6">
            <div className="flex items-center gap-2">
                <img src="/appicon.svg" alt="ClawQuest" className="h-5 w-5" />
                <span className="text-muted-foreground">&copy; {new Date().getFullYear()} ClawQuest</span>
            </div>
            <nav className="flex flex-wrap items-center justify-end gap-2 flex-1">
                {LINKS.map(({ href, label, external }, i) => (
                    <span key={href} className="flex items-center gap-2">
                        {i > 0 && <span className="h-1 w-1 rounded-full bg-border-2" />}
                        <a
                            href={href}
                            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                            className="text-muted-foreground no-underline hover:text-foreground transition-colors"
                        >
                            {label}
                        </a>
                    </span>
                ))}
            </nav>
            
        </footer>
    )
}
