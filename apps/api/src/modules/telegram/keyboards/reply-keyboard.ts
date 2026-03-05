import { Keyboard } from 'grammy';

// Labels used for text matching in fallback handler
export const MENU_LABELS = {
    browseQuests: 'Browse Quests',
    myStatus: 'My Status',
    createQuest: 'Create Quest',
    about: 'About',
} as const;

/**
 * Persistent reply keyboard shown at the bottom of the chat.
 * Stays visible after each message (persistent).
 */
export function mainReplyKeyboard(): Keyboard {
    return new Keyboard()
        .text(MENU_LABELS.browseQuests)
        .text(MENU_LABELS.myStatus)
        .row()
        .text(MENU_LABELS.createQuest)
        .text(MENU_LABELS.about)
        .resized()
        .persistent();
}
