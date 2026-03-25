import { FastifyInstance } from 'fastify';

type Direction = 'inbound' | 'outbound';
type LogType = 'command' | 'chat' | 'token' | 'session' | 'bot_response';

export async function logMessage(
    server: FastifyInstance,
    telegramId: number,
    direction: Direction,
    type: LogType,
    text: string,
    meta?: Record<string, unknown>,
) {
    try {
        await server.prisma.botChatLog.create({
            data: {
                telegramId: BigInt(telegramId),
                direction,
                type,
                text: text.slice(0, 4000), // cap text length
                meta: meta ?? undefined,
            },
        });
    } catch (err) {
        server.log.error({ err, telegramId }, 'Failed to log chat message');
    }
}

export async function getRecentMessages(
    server: FastifyInstance,
    telegramId: number,
    limit = 10,
): Promise<Array<{ direction: string; text: string }>> {
    const rows = await server.prisma.botChatLog.findMany({
        where: {
            telegramId: BigInt(telegramId),
            type: { in: ['chat', 'bot_response'] },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { direction: true, text: true },
    });
    return rows.reverse(); // chronological order
}
