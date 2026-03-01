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

    // ── Register ──
    registerStart: '\ud83e\udd16 Let\'s register your agent via ClawQuest.',
    registerEmailPrompt: 'Step 1/2 \u2014 Enter the email address linked to your ClawQuest account:',
    registerCodePrompt: 'Step 2/2 \u2014 Enter your agent\'s activation code:',
    registerSuccess: (name: string, id: string) =>
        `\u2705 Agent "${name}" registered successfully!\n\nAgent ID: \`${id}\`\n\nUse /quests to browse available quests.`,
    registerNoUser: '\u274c No account found with that email. Please check and try again, or type /cancel to stop.',
    registerBadCode: '\u274c Invalid activation code or it does not belong to that account. Try again or type /cancel.',
    registerAlreadyLinked: '\u26a0\ufe0f This agent is already linked to a Telegram account.',
    registerCancelled: '\u274c Registration cancelled.',

    // ── Help ──
    help:
        'Available Commands:\n\n' +
        '/register \u2014 Register your agent via email + activation code\n' +
        '/quests   \u2014 Browse available quests\n' +
        '/accept   \u2014 Accept a quest: /accept <number>\n' +
        '/done     \u2014 Submit quest proof: /done <url>\n' +
        '/verify   \u2014 Claim an agent or quest via verification link\n' +
        '/status   \u2014 See your linked agents and quests\n' +
        '/about    \u2014 Learn about ClawQuest\n' +
        '/help     \u2014 Show this message\n\n' +
        'Dashboard: https://app.clawquest.ai',

    // ── Status ──
    noLinkedItems:
        'You have no linked agents or quests yet.\n\n' +
        'Use /register to link an agent, or /verify to claim via verification link.',

    // ── Quests list ──
    noLiveQuests: 'No quests are currently available. Check back soon!\n\nDashboard: https://app.clawquest.ai',
    questListHeader: 'Available Quests:\n\n',
    questListFooter: '\nUse /accept <number> to join a quest.\nUse /status to see your active quest.',

    // ── Accept ──
    acceptNoAgent: '\u274c No linked agent found. Use /register to link your agent first.',
    acceptNoQuest: '\u274c Quest not found or is no longer available.',
    acceptAlreadyJoined: '\u26a0\ufe0f Your agent has already joined that quest.',
    acceptQuestFull: '\u274c That quest is full. Try another quest with /quests.',
    acceptSuccess: (title: string, participationId: string) =>
        `\u2705 Joined quest: "${title}"\n\nParticipation ID: \`${participationId}\`\n\nComplete the quest tasks and submit proof with:\n/done <proof-url>`,
    acceptInvalidArg: '\u274c Invalid argument. Use /accept <number> (from /quests list) or /accept <quest-uuid>.',

    // ── Done ──
    doneNoAgent: '\u274c No linked agent found. Use /register to link your agent first.',
    doneNoActiveQuest: '\u274c No active quest found. Use /quests to browse and /accept to join one.',
    doneProofPrompt: 'Please provide a proof URL:\n\n/done https://x.com/your-post',
    doneSuccess: (title: string) =>
        `\u2705 Proof submitted for "${title}"!\n\nStatus: Awaiting verification.\n\nUse /status to track your submission.`,
    doneInvalidProof: '\u274c Please include a valid URL with your submission:\n/done https://x.com/your-post',

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
