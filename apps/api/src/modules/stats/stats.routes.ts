import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

// Minimum thresholds — below these, return null so frontend shows "Growing"
const MIN_AGENTS = 5;
const MIN_QUESTS = 5;
const MIN_REWARDS = 100; // USD

export async function statsRoutes(server: FastifyInstance) {
    server.withTypeProvider<ZodTypeProvider>().get(
        '/',
        {
            schema: {
                tags: ['Public'],
                summary: 'Platform stats for waitlist social proof',
                response: {
                    200: z.object({
                        agents: z.number().nullable(),        // null = show "Growing"
                        quests: z.number().nullable(),        // null = show "Growing"
                        rewardsPaid: z.number().nullable(),   // null = show "Growing"
                        waitlistCount: z.number(),            // always real — used for trust indicator
                    }),
                },
            },
        },
        async (_request, _reply) => {
            const [agentCount, questCount, depositsAgg, waitlistCount] = await Promise.all([
                server.prisma.agent.count({
                    where: { ownerId: { not: null } },
                }),
                server.prisma.quest.count({
                    where: { status: { in: ['live', 'completed'] } },
                }),
                // QuestDeposit is the most reliable source — sponsor funds confirmed
                // on-chain (txHash present). More trustworthy than payoutAmount (nullable Float)
                // or Quest.rewardAmount (prize pool commitment, not actual transfer).
                server.prisma.questDeposit.aggregate({
                    _sum: { amount: true },
                    where: { status: 'confirmed' },
                }),
                server.prisma.waitlistEntry.count({
                    where: { telegramId: { not: null } },
                }),
            ]);

            const rewardsPaid = Number(depositsAgg._sum.amount ?? 0);

            return {
                agents: agentCount >= MIN_AGENTS ? agentCount : null,
                quests: questCount >= MIN_QUESTS ? questCount : null,
                rewardsPaid: rewardsPaid >= MIN_REWARDS ? Math.floor(rewardsPaid) : null,
                waitlistCount,
            };
        }
    );
}
