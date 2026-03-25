import { Link } from "@tanstack/react-router"

interface BreadcrumbItem {
    label: string
    to?: string
    params?: Record<string, string>
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
    return (
        <nav className="flex items-center gap-1.5 text-xs text-fg-3">
            {items.map((item, idx) => (
                <span key={idx} className="flex items-center gap-1.5">
                    {idx > 0 && <span className="text-fg-3">/</span>}
                    {item.to ? (
                        <Link
                            to={item.to}
                            params={item.params}
                            className="no-underline text-fg-3 hover:text-fg-1 transition-colors truncate max-w-[200px]"
                        >
                            {item.label}
                        </Link>
                    ) : (
                        <span className="text-fg-1 truncate max-w-[200px]">{item.label}</span>
                    )}
                </span>
            ))}
        </nav>
    )
}
