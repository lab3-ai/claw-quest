import { PrismaClient } from '@prisma/client';
import { stripe } from './stripe.config';

// ─── Stripe Connect Onboarding (Express Accounts for Winners) ───────────────

/**
 * Create a Stripe Express connected account for a user, or resume onboarding
 * if one already exists. Returns a Stripe-hosted onboarding URL.
 */
export async function createConnectedAccount(
    prisma: PrismaClient,
    userId: string,
    returnUrl: string,
    refreshUrl: string,
): Promise<{ accountId: string; onboardingUrl: string }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    // If user already has a connected account, generate a new onboarding link
    if (user.stripeConnectedAccountId) {
        const link = await stripe.accountLinks.create({
            account: user.stripeConnectedAccountId,
            type: 'account_onboarding',
            return_url: returnUrl,
            refresh_url: refreshUrl,
        });
        return { accountId: user.stripeConnectedAccountId, onboardingUrl: link.url };
    }

    // Create new Express connected account
    const account = await stripe.accounts.create({
        type: 'express',
        email: user.email,
        metadata: { userId: user.id },
        capabilities: {
            transfers: { requested: true },
        },
    });

    // Save account ID to user
    await prisma.user.update({
        where: { id: userId },
        data: { stripeConnectedAccountId: account.id },
    });

    // Generate onboarding link
    const link = await stripe.accountLinks.create({
        account: account.id,
        type: 'account_onboarding',
        return_url: returnUrl,
        refresh_url: refreshUrl,
    });

    return { accountId: account.id, onboardingUrl: link.url };
}

/**
 * Check whether a user's connected account is fully onboarded.
 */
export async function getConnectedAccountStatus(
    prisma: PrismaClient,
    userId: string,
): Promise<{ hasAccount: boolean; isOnboarded: boolean; accountId: string | null }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.stripeConnectedAccountId) {
        return { hasAccount: false, isOnboarded: false, accountId: null };
    }

    try {
        const account = await stripe.accounts.retrieve(user.stripeConnectedAccountId);
        const onboarded = !!(account.details_submitted && account.charges_enabled);

        // Sync onboarded status to DB if changed
        if (onboarded && !user.stripeConnectedOnboarded) {
            await prisma.user.update({
                where: { id: userId },
                data: { stripeConnectedOnboarded: true },
            });
        }

        return {
            hasAccount: true,
            isOnboarded: onboarded,
            accountId: user.stripeConnectedAccountId,
        };
    } catch {
        return { hasAccount: true, isOnboarded: false, accountId: user.stripeConnectedAccountId };
    }
}

/**
 * Generate a Stripe Express dashboard login link for connected account holders.
 */
export async function createDashboardLink(accountId: string): Promise<string> {
    const link = await stripe.accounts.createLoginLink(accountId);
    return link.url;
}
