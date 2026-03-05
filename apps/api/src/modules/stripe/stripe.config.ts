import Stripe from 'stripe';

// ─── Stripe Configuration ───────────────────────────────────────────────────

export const stripeConfig = {
    /** Stripe secret key (sk_test_... or sk_live_...) */
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    /** Stripe webhook signing secret (whsec_...) */
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    /** Platform fee percentage on distributions (e.g., 0.05 = 5%) */
    platformFeePercent: parseFloat(process.env.STRIPE_PLATFORM_FEE_PERCENT || '0'),
    /** Default currency for fiat quests */
    currency: 'usd' as const,
};

/** Singleton Stripe client — only initialize if key is present */
export const stripe = stripeConfig.secretKey
    ? new Stripe(stripeConfig.secretKey, { typescript: true })
    : (null as unknown as Stripe);

/** Check if Stripe is fully configured */
export function isStripeConfigured(): boolean {
    return !!(stripeConfig.secretKey && stripeConfig.webhookSecret);
}

// Startup log
if (isStripeConfigured()) {
    console.log('[stripe:config] Stripe configured ✓');
} else {
    console.warn('⚠️  Stripe not configured (missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET)');
}
