import { FastifyInstance } from 'fastify';
import { z } from 'zod';

const WALLET_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export async function walletsRoutes(server: FastifyInstance) {
    // ─── POST /wallets — Link a wallet to user ────────────────────────────────
    server.post(
        '/',
        {
            schema: {
                tags: ['Wallets'],
                summary: 'Link a wallet address to the authenticated user',
                body: z.object({
                    address: z.string().regex(WALLET_ADDRESS_RE, 'Invalid wallet address'),
                    chainId: z.number().int().optional(),
                }),
                response: {
                    200: z.object({
                        id: z.string(),
                        address: z.string(),
                        chainId: z.number().nullable(),
                        isPrimary: z.boolean(),
                        createdAt: z.string(),
                    }),
                },
            },
        },
        async (request, reply) => {
            await server.authenticate(request, reply);
            const userId = request.user.id;
            const { address, chainId } = request.body as { address: string; chainId?: number };

            // Normalize address to lowercase for consistent comparison
            const normalizedAddress = address.toLowerCase();

            // Check if user has any wallets (first one becomes primary)
            const existingCount = await server.prisma.walletLink.count({
                where: { userId },
            });

            const wallet = await server.prisma.walletLink.upsert({
                where: {
                    userId_address: { userId, address: normalizedAddress },
                },
                update: {
                    chainId: chainId ?? undefined,
                },
                create: {
                    userId,
                    address: normalizedAddress,
                    chainId: chainId ?? null,
                    isPrimary: existingCount === 0, // first wallet is primary
                },
            });

            return {
                id: wallet.id,
                address: wallet.address,
                chainId: wallet.chainId,
                isPrimary: wallet.isPrimary,
                createdAt: wallet.createdAt.toISOString(),
            };
        }
    );

    // ─── GET /wallets — List user's wallets ───────────────────────────────────
    server.get(
        '/',
        {
            schema: {
                tags: ['Wallets'],
                summary: 'List wallets linked to the authenticated user',
                response: {
                    200: z.array(z.object({
                        id: z.string(),
                        address: z.string(),
                        chainId: z.number().nullable(),
                        isPrimary: z.boolean(),
                        createdAt: z.string(),
                    })),
                },
            },
        },
        async (request, reply) => {
            await server.authenticate(request, reply);
            const userId = request.user.id;

            const wallets = await server.prisma.walletLink.findMany({
                where: { userId },
                orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
            });

            return wallets.map(w => ({
                id: w.id,
                address: w.address,
                chainId: w.chainId,
                isPrimary: w.isPrimary,
                createdAt: w.createdAt.toISOString(),
            }));
        }
    );
}
