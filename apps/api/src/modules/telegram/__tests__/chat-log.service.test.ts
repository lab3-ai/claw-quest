import { describe, it, expect, vi } from 'vitest';
import { logMessage, getRecentMessages } from '../services/chat-log.service';

// Mock Fastify server with Prisma
const mockCreate = vi.fn().mockResolvedValue({});
const mockFindMany = vi.fn().mockResolvedValue([]);
const mockServer = {
    prisma: {
        botChatLog: {
            create: mockCreate,
            findMany: mockFindMany,
        },
    },
    log: {
        error: vi.fn(),
    },
} as any;

describe('chat-log.service', () => {
    it('logMessage calls prisma.create with correct data', async () => {
        await logMessage(mockServer, 12345, 'inbound', 'chat', 'hello world');

        expect(mockCreate).toHaveBeenCalledWith({
            data: {
                telegramId: BigInt(12345),
                direction: 'inbound',
                type: 'chat',
                text: 'hello world',
                meta: undefined,
            },
        });
    });

    it('logMessage includes meta when provided', async () => {
        await logMessage(mockServer, 12345, 'outbound', 'bot_response', 'reply', { source: 'claude' });

        expect(mockCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
                meta: { source: 'claude' },
            }),
        });
    });

    it('logMessage truncates text to 4000 chars', async () => {
        const longText = 'x'.repeat(5000);
        await logMessage(mockServer, 12345, 'inbound', 'chat', longText);

        expect(mockCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
                text: 'x'.repeat(4000),
            }),
        });
    });

    it('logMessage catches and logs errors', async () => {
        mockCreate.mockRejectedValueOnce(new Error('DB error'));
        await logMessage(mockServer, 12345, 'inbound', 'chat', 'test');

        expect(mockServer.log.error).toHaveBeenCalled();
    });

    it('getRecentMessages returns results in chronological order', async () => {
        mockFindMany.mockResolvedValueOnce([
            { direction: 'outbound', text: 'response' },
            { direction: 'inbound', text: 'question' },
        ]);

        const result = await getRecentMessages(mockServer, 12345);

        expect(result).toEqual([
            { direction: 'inbound', text: 'question' },
            { direction: 'outbound', text: 'response' },
        ]);
        expect(mockFindMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    telegramId: BigInt(12345),
                    type: { in: ['chat', 'bot_response'] },
                },
                orderBy: { createdAt: 'desc' },
                take: 10,
            }),
        );
    });
});
