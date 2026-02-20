// Platform brand icons — inline SVG for pixel-perfect rendering
// Usage: <PlatformIcon name="x" size={16} />
//        <PlatformIcon name="discord" size={20} colored />  — applies brand color

type PlatformName = "x" | "discord" | "telegram" | "openclaw" | "claude" | "chatgpt" | "cursor"

interface Props {
    name: PlatformName
    size?: number
    className?: string
    colored?: boolean   // if true, applies built-in brand color via style
    style?: React.CSSProperties
}

const BRAND_COLORS: Record<PlatformName, string> = {
    x:         "#000000",
    discord:   "#5865f2",
    telegram:  "#229ed9",
    openclaw:  "#dc2626",
    claude:    "#7c3aed",
    chatgpt:   "#16a34a",
    cursor:    "#0284c7",
}

export function PlatformIcon({ name, size = 16, className, colored, style }: Props) {
    const s = size
    const colorStyle: React.CSSProperties = {
        ...(colored ? { color: BRAND_COLORS[name] } : {}),
        ...style,
    }
    switch (name) {
        case "x":
            return (
                <svg width={s} height={s} viewBox="0 0 300 300" fill="currentColor" className={className} style={colorStyle}>
                    <path d="M178.57 127.15 290.27 0h-26.46l-97.03 110.38L89.34 0H0l117.13 166.93L0 300.25h26.46l102.4-116.59 81.8 116.59h89.34M36.01 19.54H76.66l187.13 262.13h-40.66" />
                </svg>
            )
        case "discord":
            return (
                <svg width={s} height={s} viewBox="0 0 127.14 96.36" fill="currentColor" className={className} style={colorStyle}>
                    <path d="M107.7 8.07A105.15 105.15 0 0081.47 0a72.06 72.06 0 00-3.36 6.83 97.68 97.68 0 00-29.11 0A72.37 72.37 0 0045.64 0a105.89 105.89 0 00-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0032.17 16.15 77.7 77.7 0 006.89-11.11 68.42 68.42 0 01-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0064.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 01-10.87 5.19 77 77 0 006.89 11.1 105.25 105.25 0 0032.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15zM42.45 65.69C36.18 65.69 31 60 31 53.05s5-12.68 11.45-12.68S54 46.05 53.89 53.05 48.84 65.69 42.45 65.69zm42.24 0C78.41 65.69 73.25 60 73.25 53.05s5-12.68 11.44-12.68S96.23 46.05 96.12 53.05 91.08 65.69 84.69 65.69z" />
                </svg>
            )
        case "telegram":
            return (
                <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" className={className} style={colorStyle}>
                    <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
            )
        case "claude":
            // Anthropic asterisk logo
            return (
                <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" className={className} style={colorStyle}>
                    <path d="M12 2 9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z" />
                    <path d="M12 5.5l-1.8 5.2-5.2 1.8 5.2 1.8 1.8 5.2 1.8-5.2 5.2-1.8-5.2-1.8z" opacity="0.4"/>
                </svg>
            )
        case "openclaw":
            // Claw / lobster claw icon
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
