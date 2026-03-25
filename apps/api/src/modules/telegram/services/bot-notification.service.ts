import { FastifyInstance } from 'fastify';
import { REWARD_TYPE } from '@clawquest/shared';
import { InlineKeyboard } from 'grammy';
import { NOTIFY } from './notification-messages';

/**
 * Safe wrapper — sends a Telegram notification. Never throws.
 * Returns true if sent successfully, false otherwise.
 */
export async function sendNotification(
    server: FastifyInstance,
    telegramId: string | bigint | null | undefined,
    text: string,
    keyboard?: InlineKeyboard,
): Promise<boolean> {
    if (!telegramId || !server.telegram) return false;

    try {
        await server.telegram.bot.api.sendMessage(String(telegramId), text, {
            parse_mode: 'HTML',
            ...(keyboard ? { reply_markup: keyboard } : {}),
        });
        return true;
    } catch (err) {
        server.log.warn({ err, telegramId: String(telegramId) }, 'Telegram notification failed');
        return false;
    }
}

/** Resolve telegramId from a userId (Supabase/Prisma User) */
async function resolveTelegramId(
    server: FastifyInstance,
    userId: string,
): Promise<string | null> {
    try {
        const user = await server.prisma.user.findUnique({
            where: { id: userId },
            select: { telegramId: true },
        });
        return user?.telegramId ?? null;
    } catch {
        return null;
    }
}

// ── Typed notification helpers ──

export async function notifyQuestFunded(
    server: FastifyInstance,
    questId: string,
): Promise<void> {
    const quest = await server.prisma.quest.findUnique({
        where: { id: questId },
        select: { title: true, rewardAmount: true, rewardType: true, creatorUserId: true },
    });
    if (!quest?.creatorUserId) return;

    const tgId = await resolveTelegramId(server, quest.creatorUserId);
    const text = NOTIFY.questFunded(quest.title, String(quest.rewardAmount), quest.rewardType ?? REWARD_TYPE.USDC);
    await sendNotification(server, tgId, text);
}

export async function notifyQuestDistributed(
    server: FastifyInstance,
    questId: string,
): Promise<void> {
    const quest = await server.prisma.quest.findUnique({
        where: { id: questId },
        select: { title: true, creatorUserId: true },
    });
    if (!quest?.creatorUserId) return;

    const tgId = await resolveTelegramId(server, quest.creatorUserId);
    await sendNotification(server, tgId, NOTIFY.questDistributed(quest.title));
}

export async function notifyQuestRefunded(
    server: FastifyInstance,
    questId: string,
): Promise<void> {
    const quest = await server.prisma.quest.findUnique({
        where: { id: questId },
        select: { title: true, creatorUserId: true },
    });
    if (!quest?.creatorUserId) return;

    const tgId = await resolveTelegramId(server, quest.creatorUserId);
    await sendNotification(server, tgId, NOTIFY.questRefunded(quest.title));
}

export async function notifyQuestCancelled(
    server: FastifyInstance,
    questId: string,
): Promise<void> {
    const quest = await server.prisma.quest.findUnique({
        where: { id: questId },
        select: { title: true, creatorUserId: true },
    });
    if (!quest?.creatorUserId) return;

    const tgId = await resolveTelegramId(server, quest.creatorUserId);
    await sendNotification(server, tgId, NOTIFY.questCancelled(quest.title));
}

export async function notifyProofVerified(
    server: FastifyInstance,
    participationId: string,
    status: string,
): Promise<void> {
    const participation = await server.prisma.questParticipation.findUnique({
        where: { id: participationId },
        select: {
            userId: true,
            quest: { select: { title: true } },
        },
    });
    if (!participation?.userId) return;

    const tgId = await resolveTelegramId(server, participation.userId);
    await sendNotification(server, tgId, NOTIFY.proofVerified(participation.quest.title, status));
}

export async function notifyQuestCompleted(
    server: FastifyInstance,
    questId: string,
): Promise<void> {
    const quest = await server.prisma.quest.findUnique({
        where: { id: questId },
        select: { title: true, creatorUserId: true },
    });
    if (!quest?.creatorUserId) return;

    const tgId = await resolveTelegramId(server, quest.creatorUserId);
    await sendNotification(server, tgId, NOTIFY.questCompleted(quest.title));
}
