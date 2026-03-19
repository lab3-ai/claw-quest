import { REWARD_TYPE } from "@clawquest/shared"

/** Maps reward type → local SVG file in /tokens/ */
const TOKEN_SLUG_MAP: Record<string, string> = {
    [REWARD_TYPE.USDC]: 'usdc',
    [REWARD_TYPE.USDT]: 'usdt',
    [REWARD_TYPE.USD]: 'usd',
    'ETH': 'eth',
    'SOL': 'sol',
    'ARB': 'arb',
    'OP': 'op',
}

interface TokenIconProps {
    token: string
    size?: number
    className?: string
}

export function TokenIcon({ token, size = 16, className, tint }: TokenIconProps & { tint?: "primary" | "neutral" }) {
    const slug = TOKEN_SLUG_MAP[token.toUpperCase()]
    if (!slug) return null
    const tintClass = tint === "primary"
        ? "brightness-0 [filter:brightness(0)_invert(1)] opacity-40"
        : tint === "neutral"
            ? "grayscale opacity-60"
            : ""
    return (
        <img
            src={`/tokens/${slug}.svg`}
            alt={token}
            width={size}
            height={size}
            className={`${tintClass} ${className ?? ""}`}
            loading="lazy"
        />
    )
}
