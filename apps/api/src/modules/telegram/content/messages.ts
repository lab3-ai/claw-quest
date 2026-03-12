// Centralized bot message strings
// All user-facing text lives here for easy updates

export const MSG = {
    // ── Welcome ──
    welcome:
        'Welcome to ClawQuest! \ud83e\udd9e\n\n' +
        'I help you manage AI agents and quests on ClawQuest.\n\n' +
        'Use the buttons below or type /help to see all commands.',

    welcomeBack: (name: string) =>
        `Welcome back, ${name}! \ud83e\udd9e\n\nWhat would you like to do?`,

    welcomeUnlinked:
        'Welcome to ClawQuest! \ud83e\udd9e\n\n' +
        'Link your account to get the full experience \u2014 browse quests, track status, and create quests.\n\n' +
        'Or just ask me anything about ClawQuest!',

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
        '/register \u2014 Register your agent via activation code\n' +
        '/quests   \u2014 Browse available quests\n' +
        '/accept   \u2014 Accept a quest: /accept <number>\n' +
        '/done     \u2014 Submit quest proof: /done <url>\n' +
        '/status   \u2014 See your linked agents and quests\n' +
        '/verify   \u2014 Claim an agent or quest via verification link\n' +
        '/about    \u2014 Learn about ClawQuest\n' +
        '/help     \u2014 Show this message\n\n' +
        'Dashboard: https://clawquest.ai',

    // ── Status ──
    noLinkedItems:
        'You have no linked agents or quests yet.\n\n' +
        'Use /register to link an agent, or /verify to claim via verification link.',

    // ── Quests list ──
    noLiveQuests: 'No quests are currently available. Check back soon!\n\nDashboard: https://clawquest.ai',
    questListHeader: 'Available Quests:\n\n',
    questListFooter: '\nUse /status to see your active quests.\nDashboard: https://clawquest.ai',

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

    // ── Rate Limit ──
    rateLimited:
        '⏳ You\'re sending messages too fast. Please wait a moment and try again.',

    // ── Fallback ──
    fallbackNoMatch:
        "I didn't recognize that. Type /help to see available commands, or tap the menu button.",

    // ── Waitlist ──
    waitlistJoined: (position: number, referralLink: string) =>
        `🎉 You're *#${position}* in line for early access!\n\n` +
        `ClawQuest is where AI agents complete quests and earn real rewards — USDC, crypto, or fiat.\n\n` +
        `📈 Move up — share your referral link:\n` +
        `\`${referralLink}\`\n\n` +
        `Top 100 → OG Pioneer badge + 500 bonus XP\n` +
        `Top 1,000 → Premium quests 30 min early`,

    waitlistJoinedViaReferral: (
        position: number,
        referralLink: string,
        referrerName: string
    ) =>
        `🎉 You joined via *${referrerName}*'s referral!\n\n` +
        `You're *#${position}* in line — with a *10-spot bonus*! ClawQuest: AI agents complete quests → earn USDC, crypto, fiat.\n\n` +
        `Share your referral link to move up *10 spots* for every friend who joins:\n\n` +
        `\`${referralLink}\`\n\n` +
        `Top 100 → OG Pioneer badge + 500 bonus XP\n` +
        `Top 1,000 → Premium quests 30 min early`,

    waitlistAlreadyJoined: (position: number, referralLink: string) =>
        `👋 You're already on the waitlist at *#${position}*!\n\n` +
        `Your referral link:\n\`${referralLink}\`\n\n` +
        `Every friend who joins = 10 spots closer to the front.\n\n` +
        `📌 Follow us on X for launch updates: https://x.com/clawquest\\_ai`,

    waitlistReferralApplied: (newPosition: number) =>
        `✅ Referral applied! You moved up to *#${newPosition}*.`,

    waitlistReferralReward: (joinerName: string, newPosition: number, referralCount: number) =>
        `🎊 *${joinerName}* joined via your referral link!\n\n` +
        `You moved up to *#${newPosition}* in line.\n` +
        `Total referrals: *${referralCount}*\n\n` +
        `Keep sharing your link to move even higher! 🚀`,

    // ── Accept Quest ──
    acceptNoAgent: '❌ You need to register an agent first. Use /register to link your agent.',
    acceptNoQuest: '❌ Quest not found. Use /quests to see available quests.',
    acceptAlreadyJoined: (title: string) => `⚠️ You already joined "${title}".`,
    acceptQuestFull: (title: string) => `❌ Quest "${title}" is full. All slots have been filled.`,
    acceptSuccess: (title: string, participationId: string) =>
        `✅ Quest accepted: "${title}"\n\nParticipation ID: \`${participationId}\`\n\nUse /done <proof-url> when you complete it.`,
    acceptInvalidArg: '❌ Invalid quest number. Use /quests first, then /accept <number>.',

    // ── Done Quest ──
    doneNoAgent: '❌ You need to register an agent first. Use /register to link your agent.',
    doneNoActiveQuest: '❌ You have no active quests. Use /quests to browse and /accept to join one.',
    doneProofPrompt: 'Please provide proof of completion:\n\nExample: /done https://x.com/your-tweet',
    doneSuccess: '✅ Proof submitted! Your quest is now awaiting verification.\n\nCheck /status for updates.',
    doneInvalidProof: '❌ Invalid proof format. Please provide a valid URL.',

    // ── Errors ──
    genericError: '\u274c An error occurred. Please try again.',
} as const;
