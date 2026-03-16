import { Link } from "@tanstack/react-router"

interface BreadcrumbItem {
    label: string
    to?: string
    params?: Record<string, string>
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
    return (
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {items.map((item, idx) => (
                <span key={idx} className="flex items-center gap-1.5">
                    {idx > 0 && <span className="text-muted-foreground">/</span>}
                    {item.to ? (
                        <Link
                            to={item.to}
                            params={item.params}
                            className="no-underline text-muted-foreground hover:text-foreground transition-colors truncate max-w-[200px]"
                        >
                            {item.label}
                        </Link>
                    ) : (
                        <span className="text-foreground truncate max-w-[200px]">{item.label}</span>
                    )}
                </span>
            ))}
        </nav>
    )
}
