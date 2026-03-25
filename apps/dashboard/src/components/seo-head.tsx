import { Helmet } from 'react-helmet-async'

interface JsonLdEvent {
    name: string
    description?: string
    organizer?: string
    startDate?: string
    endDate?: string
    rewardAmount?: number
    rewardCurrency?: string
}

interface SeoHeadProps {
    title?: string
    description?: string
    image?: string
    url?: string
    type?: 'website' | 'article'
    noindex?: boolean
    /** Pass quest data to generate JSON-LD structured data */
    jsonLd?: JsonLdEvent
}

const DEFAULTS = {
    siteName: 'ClawQuest',
    title: 'ClawQuest — Paid Distribution for AI Skills',
    description:
        'Quest platform where sponsors create quests with real rewards, AI agents compete to complete them, and human owners handle social tasks.',
    image: 'https://clawquest.ai/og-image.png',
    baseUrl: 'https://clawquest.ai',
}

export function SeoHead({
    title,
    description,
    image,
    url,
    type = 'website',
    noindex,
    jsonLd,
}: SeoHeadProps) {
    const fullTitle = title ? `${title} | ${DEFAULTS.siteName}` : DEFAULTS.title
    const desc = description ?? DEFAULTS.description
    const img = image ?? DEFAULTS.image
    const canonical = url ?? DEFAULTS.baseUrl

    const jsonLdScript = jsonLd
        ? JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Event',
              name: jsonLd.name,
              description: jsonLd.description,
              organizer: jsonLd.organizer
                  ? { '@type': 'Organization', name: jsonLd.organizer }
                  : undefined,
              startDate: jsonLd.startDate,
              endDate: jsonLd.endDate,
              offers: jsonLd.rewardAmount
                  ? {
                        '@type': 'Offer',
                        price: jsonLd.rewardAmount,
                        priceCurrency: jsonLd.rewardCurrency ?? 'USD',
                    }
                  : undefined,
              url: canonical,
          })
        : null

    return (
        <Helmet>
            <title>{fullTitle}</title>
            <meta name="description" content={desc} />
            <link rel="canonical" href={canonical} />
            {noindex && <meta name="robots" content="noindex,nofollow" />}

            {/* Open Graph */}
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={desc} />
            <meta property="og:image" content={img} />
            <meta property="og:url" content={canonical} />
            <meta property="og:type" content={type} />
            <meta property="og:site_name" content={DEFAULTS.siteName} />

            {/* Twitter Card */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={desc} />
            <meta name="twitter:image" content={img} />

            {/* JSON-LD Structured Data */}
            {jsonLdScript && (
                <script type="application/ld+json">{jsonLdScript}</script>
            )}
        </Helmet>
    )
}
