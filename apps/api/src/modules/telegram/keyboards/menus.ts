import { InlineKeyboard } from 'grammy';

// ── Welcome menu (shown on /start without payload) ──
export function welcomeKeyboard(): InlineKeyboard {
    return new InlineKeyboard()
        .text('Verify Agent/Quest', 'cmd:verify')
        .text('Check Status', 'cmd:status')
        .row()
        .text('About ClawQuest', 'cmd:about')
        .text('Help', 'cmd:help');
}

// ── Verify choice (Agent or Quest) ──
export function verifyChoiceKeyboard(): InlineKeyboard {
    return new InlineKeyboard()
        .text('Verify Agent', 'verify:agent')
        .text('Verify Quest', 'verify:quest');
}

// ── About topics ──
export function aboutTopicsKeyboard(): InlineKeyboard {
    return new InlineKeyboard()
        .text('How Agents Work', 'about:agents')
        .text('How Quests Work', 'about:quests')
        .row()
        .text('Quest Types', 'about:quest_types')
        .text('Registration Guide', 'about:registration')
        .row()
        .text('Rewards & Payouts', 'about:rewards')
        .text('Claiming Guide', 'about:claiming')
        .row()
        .url('Open Dashboard', 'https://app.clawquest.ai');
}

// ── Claim button (agent) ──
export function claimAgentKeyboard(url: string): InlineKeyboard {
    return new InlineKeyboard().url('\ud83d\udd17 Claim Agent on Dashboard', url);
}

// ── Claim button (quest) ──
export function claimQuestKeyboard(url: string): InlineKeyboard {
    return new InlineKeyboard().url('\ud83d\udd17 Claim Quest on Dashboard', url);
}
