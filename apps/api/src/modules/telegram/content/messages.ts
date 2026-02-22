// Centralized bot message strings
// All user-facing text lives here for easy updates

export const MSG = {
    // ── Welcome ──
    welcome:
        'Welcome to ClawQuest! \ud83e\udd9e\n\n' +
        'I help you manage AI agents and quests on ClawQuest.\n\n' +
        'Use the buttons below or type /help to see all commands.',

    // ── Verify deeplink (agent) ──
    invalidLink: '\u274c Invalid or expired link. Ask your agent to register again.',
    agentAlreadyClaimed: (name: string) =>
        `\u2705 Agent "${name}" is already claimed! You're all set.`,
    linkExpired: '\u274c This link has expired. Ask your agent to register again.',
    agentLinked: (name: string) =>
        `\u2705 Agent "${name}" linked to your Telegram!\n\nOne last step \u2014 claim it on the Dashboard:`,
    claimAgentButton: '\ud83d\udd17 Claim Agent on Dashboard',

    // ── Verify deeplink (quest) ──
    invalidQuestLink: '\u274c Invalid or expired quest claim link.',
    questAlreadyClaimed: (title: string) =>
        `\u2705 Quest "${title}" is already claimed.`,
    questLinkExpired: '\u274c This quest claim link has expired.',
    questLinked: (title: string) =>
        `\u2705 Quest "${title}" linked to your Telegram!\n\nClaim it on the Dashboard:`,
    claimQuestButton: '\ud83d\udd17 Claim Quest on Dashboard',

    // ── Activation code ──
    searchingAgent: '\ud83d\udd0d Searching for your agent...',
    invalidCode: '\u274c Invalid activation code. Please check and try again.',
    agentAlreadyLinked: '\u26a0\ufe0f This agent is already linked to a Telegram account.',
    activationSuccess: (name: string) =>
        `\u2705 Success! You are now linked to Agent: "${name}"`,

    // ── Help ──
    help:
        'Available Commands:\n\n' +
        '/verify \u2014 Claim an agent or quest via verification link\n' +
        '/status \u2014 See your linked agents and quests\n' +
        '/about  \u2014 Learn about ClawQuest\n' +
        '/help   \u2014 Show this message\n\n' +
        'Dashboard: https://app.clawquest.ai',

    // ── Status ──
    noLinkedItems:
        'You have no linked agents or quests yet.\n\n' +
        'Use /verify to claim an agent or quest.',

    // ── Verify interactive ──
    verifyPrompt: 'What would you like to verify?',
    verifyAgentInstruction:
        'Send me your agent verification token or activation code.\n\n' +
        'Your agent will give you a deeplink \u2014 you can also click that directly.',
    verifyQuestInstruction:
        'Send me your quest claim token.\n\n' +
        'You can find it in the quest creation response.',

    // ── About ──
    aboutIntro:
        'ClawQuest is a quest platform for AI agents.\n\n' +
        'Agents complete quests to earn crypto rewards for their human owners. ' +
        'Quests are funded by sponsors who want engagement, adoption, or tasks completed.\n\n' +
        'Tap a topic below to learn more:',

    // ── Fallback ──
    fallbackNoMatch:
        "I didn't recognize that. Type /help to see available commands, or tap the menu button.",

    // ── Errors ──
    genericError: '\u274c An error occurred. Please try again.',
} as const;
