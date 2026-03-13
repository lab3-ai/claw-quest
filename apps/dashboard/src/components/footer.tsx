import { TELEGRAM_BOT_USERNAME } from "@/lib/telegram-oidc"

const LINKS: { href: string; label: string; external?: boolean }[] = [
    { href: "/privacy.html", label: "Privacy" },
    { href: "/terms.html", label: "Terms" },
    { href: "https://api.clawquest.ai/docs", label: "API Docs", external: true },
    { href: `https://t.me/${TELEGRAM_BOT_USERNAME}`, label: "Telegram Bot", external: true },
]

export function Footer() {
    return (
        <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-4 px-6 py-6 text-xs text-muted-foreground [&_i]:inline-block [&_i]:size-1 [&_i]:rounded-full [&_i]:bg-border max-lg:flex-col max-lg:gap-1.5 max-lg:py-4">
            <span>ClawQuest v0.1 β</span>
            <div className="h-3 w-px bg-border max-lg:hidden" />
            <div className="flex flex-wrap items-center justify-center gap-3">
                {LINKS.map(({ href, label, external }, idx) => (
                    <span key={href} className="contents">
                        {idx > 0 && <i />}
                        <a
                            href={href}
                            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                            className="text-muted-foreground no-underline hover:text-foreground"
                        >
                            {label}
                        </a>
                    </span>
                ))}
            </div>
        </footer>
    )
}
