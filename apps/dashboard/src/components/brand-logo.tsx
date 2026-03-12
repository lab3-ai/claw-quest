import { cn } from "@/lib/utils"

type LogoVariant = "full" | "icon" | "text"
type LogoSize = "xs" | "sm" | "md" | "lg"

interface BrandLogoProps {
    variant?: LogoVariant
    /** Size preset — uses CSS scale for consistent proportions */
    size?: LogoSize
    /** Apply CSS invert for dark backgrounds */
    dark?: boolean
    /** Enable blink animation on the eyes */
    animated?: boolean
    className?: string
}

const SCALE: Record<LogoSize, string> = {
    xs: "scale-75",
    sm: "scale-90",
    md: "scale-100",
    lg: "scale-125",
}

/** Inline SVG app icon — eyes blink on hover, and continuously when `animated` */
function AppIcon({ animated = false }: { animated?: boolean }) {
    return (
        <svg
            className={cn("cq-icon h-8 w-auto", animated && "cq-auto")}
            viewBox="0 0 3178 3178"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            <style>{`
                @keyframes cq-blink {
                    0%, 90%, 100% { transform: scaleY(1); }
                    95% { transform: scaleY(0.1); }
                }
                @keyframes cq-blink-hover {
                    0%, 40%, 100% { transform: scaleY(1); }
                    20%, 70% { transform: scaleY(0.1); }
                }
                .cq-eye {
                    transform-box: fill-box;
                    transform-origin: center;
                }
                /* Auto-blink when animated */
                .cq-icon.cq-auto .cq-eye {
                    animation: cq-blink 4s ease-in-out infinite;
                }
                .cq-icon.cq-auto .cq-eye-r {
                    animation-delay: 0.1s;
                }
                /* Hover: rapid double-blink */
                .cq-icon:hover .cq-eye {
                    animation: cq-blink-hover 0.6s ease-in-out 1 !important;
                }
                .cq-icon:hover .cq-eye-r {
                    animation: cq-blink-hover 0.6s ease-in-out 0.08s 1 !important;
                }
            `}</style>
            <rect width="3178" height="3178" fill="#FF574B" />
            {/* Jaw + chin */}
            <path d="M2310.37 1574.67V1856.69C2310.37 1874.56 2309.44 1892.23 2307.59 1909.61C2302.72 1956.13 2291.44 2000.73 2274.7 2042.56C2200.94 2226.83 2020.67 2357 1810.04 2357H1230.77C954.449 2357 730.472 2133 730.472 1856.69V1574.67H991.532V1917.87C991.532 2023.76 1077.38 2109.57 1183.27 2109.57H1857.57C1863.49 2109.57 1869.35 2109.29 1875.14 2108.77C1946.9 2102.27 2007.26 2056.18 2034.2 1992.56C2043.94 1969.6 2049.31 1944.35 2049.31 1917.87V1574.67H2310.37Z" fill="white" />
            {/* Claw tail */}
            <path d="M2422.6 2357H1668.59L1924.92 2169.24L2044.93 2081.32L2200.29 1967.53L2251.21 2018.58L2471.27 2239.22C2514.6 2282.66 2483.91 2356.97 2422.63 2356.97L2422.6 2357Z" fill="white" />
            {/* Left ear */}
            <path d="M995.147 1493.36V1214.37C995.147 1176.54 1025.77 1145.89 1063.56 1145.89H1323.14C1308.83 982.869 1172.04 855 1005.43 855C829.271 855 686.445 997.964 686.445 1174.29C686.445 1350.61 823.762 1487.97 995.147 1493.39V1493.36Z" fill="white" />
            {/* Right ear */}
            <path d="M2039.38 1214.4V1493.39C2210.64 1487.32 2347.62 1346.78 2347.62 1174.32C2347.62 1001.86 2204.41 855 2027.77 855C1860.74 855 1723.58 982.882 1709.23 1145.91H1970.78C2008.67 1145.91 2039.38 1176.57 2039.38 1214.4Z" fill="white" />
            {/* Left eye */}
            <circle className="cq-eye" cx="1296.01" cy="1578.15" r="126.67" fill="white" />
            {/* Right eye */}
            <circle className="cq-eye cq-eye-r" cx="1744.15" cy="1578.15" r="126.67" fill="white" />
        </svg>
    )
}

/**
 * ClawQuest brand logo component.
 * - `full` (default): app icon + logo text side by side
 * - `icon`: app icon only
 * - `text`: logo text only
 *
 * Uses CSS `scale` for responsive sizing to preserve aspect ratio.
 * Use `dark` prop on dark backgrounds to invert the logo text.
 * Use `animated` to enable a subtle eye-blink on the icon.
 */
export function BrandLogo({
    variant = "full",
    size = "md",
    dark = false,
    animated = false,
    className,
}: BrandLogoProps) {
    const showIcon = variant === "full" || variant === "icon"
    const showText = variant === "full" || variant === "text"

    return (
        <span className={cn("flex origin-center items-center gap-2", SCALE[size], className)}>
            {showIcon && <AppIcon animated={animated} />}
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
