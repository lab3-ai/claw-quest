// verification-config-registry.ts
// Maps known skill slug patterns/tags to default verification_config templates.
// Crawler auto-populates configs for recognizable skills on first insert.
// Admin can always override via PATCH /admin/skills/:slug/verification-config.

export interface SkillPattern {
    slugContains?: string[];
    tagValues?: string[];
    config: Record<string, unknown>;
}

export const VERIFICATION_CONFIG_REGISTRY: SkillPattern[] = [
    {
        slugContains: ['bybit'],
        tagValues: ['bybit', 'trading', 'defi'],
        config: {
            type: 'api_call',
            skill_display: 'Bybit Trading',
            task_description: 'Fetch spot kline (candlestick) data from Bybit API',
            api_endpoint: 'https://api.bybit.com/v5/market/kline',
            params: {
                category: 'spot',
                symbol: '${symbol}',
                interval: '${interval}',
                limit: '${limit}',
            },
            variable_options: {
                symbol: ['DOGEUSDT', 'BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
                interval: ['5', '15', '60'],
                limit: [3, 5],
            },
            submission_fields: ['result', 'ts'],
            validation: { type: 'non_empty_response', check_path: 'result' },
        },
    },
    {
        slugContains: ['coingecko', 'coin-gecko'],
        tagValues: ['coingecko', 'price', 'crypto'],
        config: {
            type: 'api_call',
            skill_display: 'CoinGecko Price',
            task_description: 'Fetch current price of a coin from CoinGecko API',
            api_endpoint: 'https://api.coingecko.com/api/v3/simple/price',
            params: {
                ids: '${coin}',
                vs_currencies: 'usd',
            },
            variable_options: {
                coin: ['bitcoin', 'ethereum', 'dogecoin', 'solana'],
            },
            submission_fields: ['result', 'ts'],
            validation: { type: 'non_empty_response', check_path: 'result' },
        },
    },
];

/** Detect a default verification_config for a skill based on slug and tags. Returns null if no pattern matches. */
export function detectVerificationConfig(
    slug: string,
    tags: Record<string, string>
): Record<string, unknown> | null {
    const slugLower = slug.toLowerCase();
    const tagValues = Object.values(tags).map(v => v.toLowerCase());

    for (const pattern of VERIFICATION_CONFIG_REGISTRY) {
        const slugMatch = pattern.slugContains?.some(s => slugLower.includes(s));
        const tagMatch = pattern.tagValues?.some(t => tagValues.includes(t));
        if (slugMatch || tagMatch) {
            return pattern.config;
        }
    }
    return null;
}
