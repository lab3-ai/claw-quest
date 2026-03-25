import { z } from 'zod';

// ─── Request schemas ────────────────────────────────────────────────────────

export const walletPortfolioQuerySchema = z.object({
    address: z.string().min(1, 'Wallet address required'),
    chainIds: z.string().optional().default('1,8453,56'),
});

// ─── Response schemas ───────────────────────────────────────────────────────

export const portfolioTokenSchema = z.object({
    symbol: z.string(),
    chainName: z.string(),
    balance: z.string(),
    valueUsd: z.string(),
    logoUrl: z.string().nullable(),
});

export const walletPortfolioResponseSchema = z.object({
    data: z.object({
        totalValueUsd: z.string(),
        tokens: z.array(portfolioTokenSchema),
    }).nullable(),
    error: z.string().optional(),
});

// ─── Types ──────────────────────────────────────────────────────────────────

export type WalletPortfolioQuery = z.infer<typeof walletPortfolioQuerySchema>;
export type PortfolioToken = z.infer<typeof portfolioTokenSchema>;
export type WalletPortfolioResponse = z.infer<typeof walletPortfolioResponseSchema>;
