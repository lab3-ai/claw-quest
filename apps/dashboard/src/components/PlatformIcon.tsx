// Platform brand icons — uses local SVG files from /brands/ directory
// Usage: <PlatformIcon name="x" size={16} />
//        <PlatformIcon name="discord" size={20} colored />  — applies brand color via CSS filter

type PlatformName = "x" | "discord" | "telegram" | "google" | "openclaw" | "claude" | "chatgpt" | "cursor"

interface Props {
    name: PlatformName
    size?: number
    className?: string
    colored?: boolean
    style?: React.CSSProperties
}

// Brands with local SVG files in /brands/ (already have color baked in)
const FILE_BRANDS: PlatformName[] = ["x", "discord", "telegram", "google"]

export function PlatformIcon({ name, size = 16, className, colored, style }: Props) {
    const s = size

    // File-based brands — X icon needs invert in dark mode
    if (FILE_BRANDS.includes(name)) {
        return (
            <img
                src={`/brands/${name}.svg`}
                alt={name}
                width={s}
                height={s}
                className={`${name === "x" ? "dark:invert" : ""} ${className ?? ""}`}
                style={style}
                loading="lazy"
            />
        )
    }

    // Inline SVG fallbacks for icons without files
    const colorStyle: React.CSSProperties = {
        ...(colored ? { color: BRAND_COLORS[name] } : {}),
        ...style,
    }
    switch (name) {
        case "claude":
            return (
                <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" className={className} style={colorStyle}>
                    <path d="M12 2 9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z" />
                    <path d="M12 5.5l-1.8 5.2-5.2 1.8 5.2 1.8 1.8 5.2 1.8-5.2 5.2-1.8-5.2-1.8z" opacity="0.4"/>
                </svg>
            )
        case "openclaw":
            return (
                <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" className={className} style={colorStyle}>
                    <path d="M12 2C8.5 2 6 4.5 6 7.5c0 1.5.6 2.9 1.5 3.9L6 13l1.5 1.5 1.8-1.8c.8.4 1.7.8 2.7.8s1.9-.4 2.7-.8l1.8 1.8L18 13l-1.5-1.6c.9-1 1.5-2.4 1.5-3.9C18 4.5 15.5 2 12 2zm0 2c2.2 0 4 1.8 4 3.5 0 1-.4 1.9-1.1 2.6L14 11H10l-.9-.9C8.4 9.4 8 8.5 8 7.5 8 5.8 9.8 4 12 4z"/>
                    <path d="M9.5 7.5a.5.5 0 100 1 .5.5 0 000-1zM14.5 7.5a.5.5 0 100 1 .5.5 0 000-1z"/>
                    <path d="M10 13h4v2l1 1v3H9v-3l1-1z"/>
                </svg>
            )
        case "chatgpt":
            return (
                <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" className={className} style={colorStyle}>
                    <path d="M22.282 9.821a5.985 5.985 0 00-.516-4.91 6.046 6.046 0 00-6.51-2.9A6.065 6.065 0 004.981 4.18a5.985 5.985 0 00-3.998 2.9 6.046 6.046 0 00.743 7.097 5.98 5.98 0 00.51 4.911 6.051 6.051 0 006.515 2.9A5.985 5.985 0 0013.26 24a6.056 6.056 0 005.772-4.206 5.99 5.99 0 003.997-2.9 6.056 6.056 0 00-.747-7.073zM13.26 22.43a4.476 4.476 0 01-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 00.392-.681v-6.737l2.02 1.168a.071.071 0 01.038.052v5.583a4.504 4.504 0 01-4.494 4.494zM3.6 18.304a4.47 4.47 0 01-.535-3.014l.142.085 4.783 2.759a.771.771 0 00.78 0l5.843-3.369v2.332a.08.08 0 01-.033.062L9.74 19.95a4.5 4.5 0 01-6.14-1.646zM2.34 7.896a4.485 4.485 0 012.366-1.973V11.6a.766.766 0 00.388.677l5.815 3.355-2.02 1.168a.076.076 0 01-.071 0L4.06 14.126A4.501 4.501 0 012.34 7.896zm16.597 3.855l-5.833-3.387 2.02-1.164a.076.076 0 01.071 0l4.758 2.744a4.496 4.496 0 01-.681 8.12v-5.677a.79.79 0 00-.335-.636zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 00-.785 0L9.409 9.23V6.897a.066.066 0 01.028-.061l4.757-2.744a4.496 4.496 0 016.664 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 01-.038-.057V6.075a4.496 4.496 0 017.375-3.453l-.142.08L8.704 5.46a.795.795 0 00-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
                </svg>
            )
        case "cursor":
            return (
                <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" className={className} style={colorStyle}>
                    <path d="M4 2l16 10-9 2-3 8z"/>
                </svg>
            )
        default:
            return null
    }
}

const BRAND_COLORS: Partial<Record<PlatformName, string>> = {
    openclaw:  "#dc2626",
    claude:    "#7c3aed",
    chatgpt:   "#16a34a",
    cursor:    "#0284c7",
}
