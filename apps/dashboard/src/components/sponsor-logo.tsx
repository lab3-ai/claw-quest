/** Maps sponsor display name → local SVG file in /sponsors/ */
const SPONSOR_SLUG_MAP: Record<string, string> = {
    'uniswap': 'uniswap',
    'uniswap dao': 'uniswap',
    'aave': 'aave',
    'openclaw': 'openclaw',
    'zora': 'zora',
    'moltbook': 'moltbook',
    'clawfriend': 'clawfriend',
    'layerzero': 'layerzero',
    'labelbox': 'labelbox',
    'notion': 'notion',
    'vercel': 'vercel',
    'star atlas': 'star-atlas',
    'clawquest': 'clawquest',
    'lido': 'lido',
    'opensea': 'opensea',
    'spotify': 'spotify',
    'chainlink': 'chainlink',
    'stripe': 'stripe',
    'canva': 'canva',
}

function getSponsorSlug(sponsor: string): string | null {
    return SPONSOR_SLUG_MAP[sponsor.toLowerCase()] ?? null
}

interface SponsorLogoProps {
    sponsor: string
    size?: number
    className?: string
}

export function SponsorLogo({ sponsor, size = 16, className }: SponsorLogoProps) {
    const slug = getSponsorSlug(sponsor)
    if (!slug) return null
    return (
        <img
            src={`/sponsors/${slug}.svg`}
            alt={sponsor}
            width={size}
            height={size}
            className={className}
            loading="lazy"
        />
    )
}
