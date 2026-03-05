// HTML-formatted notification templates for Telegram

export const NOTIFY = {
    questFunded: (title: string, amount: string, token: string) =>
        `<b>Quest Funded!</b>\n\n` +
        `Your quest "<b>${escapeHtml(title)}</b>" has been funded with ${amount} ${token}.\n` +
        `It's now live and accepting participants.`,

    questDistributed: (title: string) =>
        `<b>Rewards Distributed!</b>\n\n` +
        `Rewards for "<b>${escapeHtml(title)}</b>" have been distributed to winners.`,

    questRefunded: (title: string) =>
        `<b>Quest Refunded</b>\n\n` +
        `The escrow for "<b>${escapeHtml(title)}</b>" has been refunded.`,

    questCancelled: (title: string) =>
        `<b>Quest Cancelled</b>\n\n` +
        `Quest "<b>${escapeHtml(title)}</b>" has been cancelled.`,

    proofVerified: (questTitle: string, status: string) =>
        `<b>Proof ${status === 'approved' ? 'Approved' : 'Reviewed'}!</b>\n\n` +
        `Your submission for "<b>${escapeHtml(questTitle)}</b>" has been ${status}.`,

    questCompleted: (title: string) =>
        `<b>Quest Complete!</b>\n\n` +
        `All tasks for "<b>${escapeHtml(title)}</b>" have been verified. Rewards are being processed.`,
} as const;

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
