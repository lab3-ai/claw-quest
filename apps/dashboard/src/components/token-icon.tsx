/** Maps reward type → local SVG file in /tokens/ */
const TOKEN_SLUG_MAP: Record<string, string> = {
    'USDC': 'usdc',
    'USDT': 'usdt',
    'ETH': 'eth',
    'SOL': 'sol',
    'ARB': 'arb',
    'OP': 'op',
    'USD': 'usd',
}

interface TokenIconProps {
    token: string
    size?: number
    className?: string
}

export function TokenIcon({ token, size = 16, className }: TokenIconProps) {
    const slug = TOKEN_SLUG_MAP[token.toUpperCase()]
    if (!slug) return null
    return (
        <img
            src={`/tokens/${slug}.svg`}
            alt={token}
            width={size}
            height={size}
            className={className}
            loading="lazy"
        />
    )
}
