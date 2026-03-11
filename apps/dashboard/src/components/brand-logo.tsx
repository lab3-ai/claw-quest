import { cn } from "@/lib/utils"

type LogoVariant = "full" | "icon" | "text"
type LogoSize = "xs" | "sm" | "md" | "lg"

interface BrandLogoProps {
    variant?: LogoVariant
    /** Size preset — uses CSS scale for consistent proportions */
    size?: LogoSize
    /** Apply CSS invert for dark backgrounds */
    dark?: boolean
    className?: string
}

const SCALE: Record<LogoSize, string> = {
    xs: "scale-75",
    sm: "scale-90",
    md: "scale-100",
    lg: "scale-125",
}

/**
 * ClawQuest brand logo component.
 * - `full` (default): app icon + logo text side by side
 * - `icon`: app icon only
 * - `text`: logo text only
 *
 * Uses CSS `scale` for responsive sizing to preserve aspect ratio.
 * Use `dark` prop on dark backgrounds to invert the logo text.
 */
export function BrandLogo({
    variant = "full",
    size = "md",
    dark = false,
    className,
}: BrandLogoProps) {
    const showIcon = variant === "full" || variant === "icon"
    const showText = variant === "full" || variant === "text"

    return (
        <span className={cn("flex origin-center items-center gap-2", SCALE[size], className)}>
            {showIcon && (
                <img
                    src="/appicon.svg"
                    alt=""
                    className="h-8 w-auto object-contain"
                    draggable={false}
                />
            )}
            {showText && (
                <img
                    src="/logo-clawquest.svg"
                    alt="ClawQuest"
                    className={cn("h-4 w-auto object-contain dark:invert", dark && "invert")}
                    draggable={false}
                />
            )}
        </span>
    )
}
