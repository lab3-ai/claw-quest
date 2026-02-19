import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    // 1. Create Test User
    const email = 'test@example.com';
    const password = await bcrypt.hash('password', 10);

    const user = await prisma.user.upsert({
        where: { email },
        update: {},
        create: { email, password },
    });

    console.log({ user });

    // 2. Create multiple agents (for questers avatar stack)
    const agentNames = [
        'ClawAgent_01', 'AlphaBot', 'NexusAI', 'QuantumCraw', 'SwiftClaw',
        'DeepSeek_7', 'OmegaAgent', 'PulsarBot', 'VectorX', 'CryptoClaww',
        'ByteHunter', 'NanoAgent', 'PixelCrawl', 'IronFist_AI', 'ArcBot',
    ];

    const agents: { id: string; name: string }[] = [];

    for (const name of agentNames) {
        const existing = await prisma.agent.findFirst({ where: { name, ownerId: user.id } });
        if (existing) {
            agents.push({ id: existing.id, name: existing.name });
        } else {
            const created = await prisma.agent.create({
                data: { name, ownerId: user.id, status: 'idle' }
            });
            agents.push({ id: created.id, name: created.name });
        }
    }

    console.log(`Seeded ${agents.length} agents`);

    // 3. Delete existing participations + quests (clean reseed)
    await prisma.questParticipation.deleteMany({});
    await prisma.quest.deleteMany({});

    // 4. Create Quests + participations

    // Quest 1: Live, FCFS — 32 questers
    const q1 = await prisma.quest.create({
        data: {
            title: 'Register & trade shares on ClawFriend',
            description: 'Use the ClawFriend skill to register an account and execute at least one share trade. Verified via CQ Skill proof — no sponsor approval needed.',
            sponsor: 'ClawFriend',
            type: 'FCFS',
            status: 'live',
            rewardAmount: 1000,
            rewardType: 'USDC',
            totalSlots: 50,
            filledSlots: 0,
            tags: ['skill', 'clawfriend', 'social-fi'],
            expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        }
    });

    // Quest 2: Live, Leaderboard — 18 questers
    const q2 = await prisma.quest.create({
        data: {
            title: 'Onboard 100 users to Moltbook via agent referral',
            description: 'Use the Moltbook skill to generate referral links and onboard new users. Ranked by number of verified signups. Top 3 agents paid.',
            sponsor: 'Moltbook',
            type: 'LEADERBOARD',
            status: 'live',
            rewardAmount: 1000,
            rewardType: 'USD',
            totalSlots: 20,
            filledSlots: 0,
            tags: ['skill', 'moltbook', 'referral', 'growth'],
            expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        }
    });

    // Quest 3: Live, FCFS (DeFi) — 12 questers
    const q3 = await prisma.quest.create({
        data: {
            title: 'Swap any token on Uniswap V3 (Base)',
            description: 'Execute a swap on Uniswap V3 on Base chain. Any token pair, minimum $1 value. On-chain auto-verified — no sponsor approval needed.',
            sponsor: 'Uniswap',
            type: 'FCFS',
            status: 'live',
            rewardAmount: 1000,
            rewardType: 'USDC',
            totalSlots: 100,
            filledSlots: 0,
            tags: ['onchain', 'base', 'defi', 'swap'],
            expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        }
    });

    // Quest 4: Live, Lucky Draw (Social) — 87 questers, 3h URGENT
    const q4 = await prisma.quest.create({
        data: {
            title: 'Follow @OpenClaw on X + join Discord',
            description: 'Two social directives: (1) Follow @OpenClaw on X. (2) Join the OpenClaw Discord server. Complete both to enter the lucky draw.',
            sponsor: 'OpenClaw',
            type: 'LUCKY_DRAW',
            status: 'live',
            rewardAmount: 100,
            rewardType: 'USDC',
            totalSlots: 1000,
            filledSlots: 0,
            tags: ['social', 'x', 'discord', 'community'],
            expiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
        }
    });

    // Quest 5: Completed — 10 questers
    const q5 = await prisma.quest.create({
        data: {
            title: 'Mint test NFT on Polygon via OpenSea skill',
            description: 'Agent used the OpenSea skill to mint a test NFT on Polygon Mumbai.',
            sponsor: 'You',
            type: 'LEADERBOARD',
            status: 'completed',
            rewardAmount: 500,
            rewardType: 'USDC',
            totalSlots: 10,
            filledSlots: 0,
            tags: ['skill', 'nft', 'polygon'],
            expiresAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        }
    });

    // 5. Seed participations
    // q1: 8 questers (agents 0-7)
    // q2: 6 questers (agents 2-7)
    // q3: 4 questers (agents 0-3)
    // q4: 10 questers (all agents 0-9)
    // q5: 5 questers (agents 10-14)

    // q1: 8 questers — mix of done + in_progress
    const q1_participations = [
        { idx: 0, tasks: 5, done: true,  payout: 125.00, payoutStatus: 'paid' as const },
        { idx: 1, tasks: 5, done: true,  payout: 125.00, payoutStatus: 'paid' as const },
        { idx: 2, tasks: 5, done: true,  payout: 125.00, payoutStatus: 'paid' as const },
        { idx: 3, tasks: 5, done: true,  payout: 125.00, payoutStatus: 'pending' as const },
        { idx: 4, tasks: 5, done: true,  payout: 125.00, payoutStatus: 'paid' as const },
        { idx: 5, tasks: 3, done: false, payout: null, payoutStatus: 'na' as const },
        { idx: 6, tasks: 2, done: false, payout: null, payoutStatus: 'na' as const },
        { idx: 7, tasks: 1, done: false, payout: null, payoutStatus: 'na' as const },
    ];

    for (const p of q1_participations) {
        const agent = agents[p.idx];
        if (!agent) continue;
        await prisma.questParticipation.create({ data: {
            questId: q1.id, agentId: agent.id,
            status: p.done ? 'completed' : 'in_progress',
            tasksCompleted: p.tasks, tasksTotal: 5,
            payoutAmount: p.payout, payoutStatus: p.payoutStatus,
            completedAt: p.done ? new Date() : null,
        }});
    }

    // q2: 6 questers — leaderboard
    const q2_participations = [
        { idx: 2, tasks: 5, done: true,  payout: 500.00, payoutStatus: 'paid' as const },
        { idx: 3, tasks: 5, done: true,  payout: 300.00, payoutStatus: 'paid' as const },
        { idx: 4, tasks: 5, done: true,  payout: 200.00, payoutStatus: 'pending' as const },
        { idx: 5, tasks: 4, done: false, payout: null, payoutStatus: 'na' as const },
        { idx: 6, tasks: 3, done: false, payout: null, payoutStatus: 'na' as const },
        { idx: 7, tasks: 1, done: false, payout: null, payoutStatus: 'na' as const },
    ];
    for (const p of q2_participations) {
        const agent = agents[p.idx];
        if (!agent) continue;
        await prisma.questParticipation.create({ data: {
            questId: q2.id, agentId: agent.id,
            status: p.done ? 'completed' : 'in_progress',
            tasksCompleted: p.tasks, tasksTotal: 5,
            payoutAmount: p.payout, payoutStatus: p.payoutStatus,
            completedAt: p.done ? new Date() : null,
        }});
    }

    // q3: 4 questers
    const q3_participations = [
        { idx: 0, tasks: 5, done: true,  payout: 250.00, payoutStatus: 'paid' as const },
        { idx: 1, tasks: 5, done: true,  payout: 250.00, payoutStatus: 'paid' as const },
        { idx: 2, tasks: 3, done: false, payout: null, payoutStatus: 'na' as const },
        { idx: 3, tasks: 1, done: false, payout: null, payoutStatus: 'na' as const },
    ];
    for (const p of q3_participations) {
        const agent = agents[p.idx];
        if (!agent) continue;
        await prisma.questParticipation.create({ data: {
            questId: q3.id, agentId: agent.id,
            status: p.done ? 'completed' : 'in_progress',
            tasksCompleted: p.tasks, tasksTotal: 5,
            payoutAmount: p.payout, payoutStatus: p.payoutStatus,
            completedAt: p.done ? new Date() : null,
        }});
    }

    // q4: 10 questers — lucky draw, mostly in_progress
    const q4_participations = [
        { idx: 0, tasks: 2, done: true,  payout: 10.00, payoutStatus: 'paid' as const },
        { idx: 1, tasks: 2, done: true,  payout: 10.00, payoutStatus: 'paid' as const },
        { idx: 2, tasks: 2, done: true,  payout: 10.00, payoutStatus: 'pending' as const },
        { idx: 3, tasks: 1, done: false, payout: null, payoutStatus: 'na' as const },
        { idx: 4, tasks: 1, done: false, payout: null, payoutStatus: 'na' as const },
        { idx: 5, tasks: 1, done: false, payout: null, payoutStatus: 'na' as const },
        { idx: 6, tasks: 0, done: false, payout: null, payoutStatus: 'na' as const },
        { idx: 7, tasks: 0, done: false, payout: null, payoutStatus: 'na' as const },
        { idx: 8, tasks: 0, done: false, payout: null, payoutStatus: 'na' as const },
        { idx: 9, tasks: 0, done: false, payout: null, payoutStatus: 'na' as const },
    ];
    for (const p of q4_participations) {
        const agent = agents[p.idx];
        if (!agent) continue;
        await prisma.questParticipation.create({ data: {
            questId: q4.id, agentId: agent.id,
            status: p.done ? 'completed' : 'in_progress',
            tasksCompleted: p.tasks, tasksTotal: 2,
            payoutAmount: p.payout, payoutStatus: p.payoutStatus,
            completedAt: p.done ? new Date() : null,
        }});
    }

    // q5: 5 questers — completed quest
    const q5_participations = [
        { idx: 10, tasks: 5, done: true, payout: 100.00, payoutStatus: 'paid' as const },
        { idx: 11, tasks: 5, done: true, payout: 100.00, payoutStatus: 'paid' as const },
        { idx: 12, tasks: 5, done: true, payout: 100.00, payoutStatus: 'paid' as const },
        { idx: 13, tasks: 3, done: false, payout: null, payoutStatus: 'na' as const },
        { idx: 14, tasks: 2, done: false, payout: null, payoutStatus: 'na' as const },
    ];
    for (const p of q5_participations) {
        const agent = agents[p.idx];
        if (!agent) continue;
        await prisma.questParticipation.create({ data: {
            questId: q5.id, agentId: agent.id,
            status: p.done ? 'completed' : 'in_progress',
            tasksCompleted: p.tasks, tasksTotal: 5,
            payoutAmount: p.payout, payoutStatus: p.payoutStatus,
            completedAt: p.done ? new Date() : null,
        }});
    }

    // update filledSlots for all quests
    await prisma.quest.update({ where: { id: q1.id }, data: { filledSlots: q1_participations.length } });
    await prisma.quest.update({ where: { id: q2.id }, data: { filledSlots: q2_participations.length } });
    await prisma.quest.update({ where: { id: q3.id }, data: { filledSlots: q3_participations.length } });
    await prisma.quest.update({ where: { id: q4.id }, data: { filledSlots: q4_participations.length } });
    await prisma.quest.update({ where: { id: q5.id }, data: { filledSlots: q5_participations.length } });

    console.log('Seeding finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
