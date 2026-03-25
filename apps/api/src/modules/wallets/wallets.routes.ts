import { FastifyInstance } from 'fastify';
import { z } from 'zod';

const WALLET_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

const WalletSchema = z.object({
    id: z.string(),
    address: z.string(),
    chainId: z.number().nullable(),
    isPrimary: z.boolean(),
    createdAt: z.string(),
});

export async function walletsRoutes(server: FastifyInstance) {
    // ─── POST /wallets — Link a wallet to user ────────────────────────────────
    server.post(
        '/',
        {
            onRequest: [server.authenticate],
            schema: {
                tags: ['Wallets'],
                summary: 'Link a wallet address to the authenticated user',
                security: [{ bearerAuth: [] }],
                body: z.object({
                    address: z.string().regex(WALLET_ADDRESS_RE, 'Invalid wallet address'),
                    chainId: z.number().int().optional(),
                }),
                response: { 200: WalletSchema },
            },
        },
        async (request) => {
            const userId = request.user.id;
            const { address, chainId } = request.body as { address: string; chainId?: number };

            // Normalize address to lowercase for consistent comparison
            const normalizedAddress = address.toLowerCase();

            // First wallet becomes primary
            const existingCount = await server.prisma.walletLink.count({ where: { userId } });

            const wallet = await server.prisma.walletLink.upsert({
                where: { userId_address: { userId, address: normalizedAddress } },
                update: { chainId: chainId ?? undefined },
                create: {
                    userId,
                    address: normalizedAddress,
                    chainId: chainId ?? null,
                    isPrimary: existingCount === 0,
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
            onRequest: [server.authenticate],
            schema: {
                tags: ['Wallets'],
                summary: 'List wallets linked to the authenticated user',
                security: [{ bearerAuth: [] }],
                response: { 200: z.array(WalletSchema) },
            },
        },
        async (request) => {
            const userId = request.user.id;

            const wallets = await server.prisma.walletLink.findMany({
                where: { userId },
                orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
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

    // ─── DELETE /wallets/:id — Remove a wallet ────────────────────────────────
    server.delete(
        '/:id',
        {
            onRequest: [server.authenticate],
            schema: {
                tags: ['Wallets'],
                summary: 'Remove a linked wallet',
                security: [{ bearerAuth: [] }],
                params: z.object({ id: z.string() }),
                response: { 200: z.object({ ok: z.boolean() }) },
            },
        },
        async (request, reply) => {
            const userId = request.user.id;
            const { id } = request.params as { id: string };

            const wallet = await server.prisma.walletLink.findUnique({ where: { id } });
            if (!wallet || wallet.userId !== userId) {
                return reply.status(404).send({ error: { message: 'Wallet not found', code: 'WALLET_NOT_FOUND' } });
            }

            await server.prisma.walletLink.delete({ where: { id } });

            // If deleted wallet was primary, promote the oldest remaining wallet
            if (wallet.isPrimary) {
                const next = await server.prisma.walletLink.findFirst({
                    where: { userId },
                    orderBy: { createdAt: 'asc' },
                });
                if (next) {
                    await server.prisma.walletLink.update({
                        where: { id: next.id },
                        data: { isPrimary: true },
                    });
                }
            }

            return { ok: true };
        }
    );

    // ─── PATCH /wallets/:id/primary — Set wallet as primary ──────────────────
    server.patch(
        '/:id/primary',
        {
            onRequest: [server.authenticate],
            schema: {
                tags: ['Wallets'],
                summary: 'Set a wallet as the primary wallet',
                security: [{ bearerAuth: [] }],
                params: z.object({ id: z.string() }),
                response: { 200: WalletSchema },
            },
        },
        async (request, reply) => {
            const userId = request.user.id;
            const { id } = request.params as { id: string };

            const wallet = await server.prisma.walletLink.findUnique({ where: { id } });
            if (!wallet || wallet.userId !== userId) {
                return reply.status(404).send({ error: { message: 'Wallet not found', code: 'WALLET_NOT_FOUND' } });
            }

            // Transaction: clear all primary flags → set this one
            const [, updated] = await server.prisma.$transaction([
                server.prisma.walletLink.updateMany({
                    where: { userId, isPrimary: true },
                    data: { isPrimary: false },
                }),
                server.prisma.walletLink.update({
                    where: { id },
                    data: { isPrimary: true },
                }),
            ]);

            return {
                id: updated.id,
                address: updated.address,
                chainId: updated.chainId,
                isPrimary: updated.isPrimary,
                createdAt: updated.createdAt.toISOString(),
            };
        }
    );
}
