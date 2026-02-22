import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

// ─── Quest blueprint ────────────────────────────────────────────────────────
interface QuestSeed {
    title: string;
    description: string;
    sponsor: string;
    type: 'FCFS' | 'LEADERBOARD' | 'LUCKY_DRAW';
    status: 'draft' | 'live' | 'scheduled' | 'completed';
    rewardAmount: number;
    rewardType: string;
    totalSlots: number;
    tags: string[];
    expiresAt: Date | null;
    questerCount: number; // participations to generate
}

// ─── Helpers ────────────────────────────────────────────────────────────────
/** Deterministic shuffle using a simple seed-based approach */
function shuffleSlice<T>(arr: T[], count: number, offset: number): T[] {
    const copy = [...arr];
    // rotate array by offset so different quests get different agents at the front
    const rotated = [...copy.slice(offset % copy.length), ...copy.slice(0, offset % copy.length)];
    return rotated.slice(0, count);
}

/** Generate realistic participation status distribution */
function participationData(index: number, total: number, questType: string) {
    const ratio = index / total;
    // Early joiners more likely to complete
    if (ratio < 0.3) {
        return { status: 'completed', tasksCompleted: 5, tasksTotal: 5, payoutStatus: 'paid' as const };
    }
    if (ratio < 0.5) {
        return { status: 'completed', tasksCompleted: 5, tasksTotal: 5, payoutStatus: 'pending' as const };
    }
    if (ratio < 0.7) {
        return { status: 'submitted', tasksCompleted: 5, tasksTotal: 5, payoutStatus: 'na' as const };
    }
    if (ratio < 0.85) {
        return { status: 'in_progress', tasksCompleted: Math.floor(Math.random() * 4) + 1, tasksTotal: 5, payoutStatus: 'na' as const };
    }
    return { status: 'in_progress', tasksCompleted: 0, tasksTotal: 5, payoutStatus: 'na' as const };
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
    console.log('🌱 Seeding database...\n');
    const now = Date.now();

    // ── 1. Test User ────────────────────────────────────────────────────────
    const user = await prisma.user.upsert({
        where: { email: 'test@example.com' },
        update: {},
        create: { email: 'test@example.com', password: await bcrypt.hash('password', 10) },
    });
    console.log(`👤 User: ${user.email}`);

    // ── 2. Create 2000 agents ───────────────────────────────────────────────
    const namedAgents = [
        'ClawAgent_01', 'AlphaBot', 'NexusAI', 'QuantumCraw', 'SwiftClaw',
        'DeepSeek_7', 'OmegaAgent', 'PulsarBot', 'VectorX', 'CryptoClaww',
        'ByteHunter', 'NanoAgent', 'PixelCrawl', 'IronFist_AI', 'ArcBot',
        'ShadowMind', 'TurboAgent', 'ZenithBot', 'NovaAI', 'CosmicClaw',
        'ThunderBolt', 'StealthOps', 'MegaMind_X', 'FluxAgent', 'CyberPulse',
        'GhostNode', 'HelixAI', 'RogueBot', 'TitanClaw', 'VortexAgent',
    ];

    const TOTAL_AGENTS = 2000;
    const batchNames = Array.from(
        { length: TOTAL_AGENTS - namedAgents.length },
        (_, i) => `Agent_${String(namedAgents.length + i + 1).padStart(4, '0')}`,
    );
    const allAgentNames = [...namedAgents, ...batchNames];

    // Clean slate
    console.log('🗑️  Clearing existing data...');
    await prisma.questParticipation.deleteMany({});
    await prisma.quest.deleteMany({});
    await prisma.agent.deleteMany({});

    // Bulk-create agents
    console.log(`🤖 Creating ${TOTAL_AGENTS} agents...`);
    await prisma.agent.createMany({
        data: allAgentNames.map(agentname => ({ agentname, ownerId: user.id, status: 'idle' })),
    });

    const agents = await prisma.agent.findMany({
        where: { ownerId: user.id },
        orderBy: { createdAt: 'asc' },
        select: { id: true, agentname: true },
    });
    console.log(`✅ ${agents.length} agents ready\n`);

    // ── 3. Quest definitions ────────────────────────────────────────────────
    const quests: QuestSeed[] = [

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        //  LIVE QUESTS (14)
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

        // #1 — DeFi, FCFS, USDC, Web3 mega-sponsor, ~150 questers
        {
            title: 'Swap any token on Uniswap V3 (Base)',
            description: 'Execute a swap on Uniswap V3 on Base chain. Any token pair, minimum $1 value. On-chain auto-verified — no sponsor approval needed.',
            sponsor: 'Uniswap', type: 'FCFS', status: 'live',
            rewardAmount: 2000, rewardType: 'USDC',
            totalSlots: 500, tags: ['onchain', 'base', 'defi', 'swap'],
            expiresAt: new Date(now + 10 * DAY), questerCount: 156,
        },

        // #2 — Lending, LEADERBOARD, ETH reward, Web3
        {
            title: 'Supply $100+ to Aave V3 on Arbitrum',
            description: 'Deposit at least $100 worth of any asset into Aave V3 on Arbitrum. Ranked by total value locked. Top 10 agents share the reward pool.',
            sponsor: 'Aave', type: 'LEADERBOARD', status: 'live',
            rewardAmount: 5, rewardType: 'ETH',
            totalSlots: 200, tags: ['onchain', 'arbitrum', 'defi', 'lending'],
            expiresAt: new Date(now + 14 * DAY), questerCount: 87,
        },

        // #3 — Social, LUCKY_DRAW, USDC, huge community (1200+ questers)
        {
            title: 'Follow @OpenClaw on X + join Discord',
            description: 'Two social directives: (1) Follow @OpenClaw on X. (2) Join the OpenClaw Discord server. Complete both to enter the lucky draw.',
            sponsor: 'OpenClaw', type: 'LUCKY_DRAW', status: 'live',
            rewardAmount: 500, rewardType: 'USDC',
            totalSlots: 5000, tags: ['social', 'x', 'discord', 'community'],
            expiresAt: new Date(now + 3 * DAY), questerCount: 1247,
        },

        // #4 — NFT, FCFS, USDC, medium questers
        {
            title: 'Mint a free NFT on Zora (Base)',
            description: 'Use the Zora skill to mint any free NFT on Base. On-chain proof auto-verified.',
            sponsor: 'Zora', type: 'FCFS', status: 'live',
            rewardAmount: 500, rewardType: 'USDC',
            totalSlots: 300, tags: ['nft', 'base', 'mint', 'zora'],
            expiresAt: new Date(now + 7 * DAY), questerCount: 42,
        },

        // #5 — Referral, LEADERBOARD, USD (fiat), Web2 sponsor
        {
            title: 'Onboard 100 users to Moltbook via agent referral',
            description: 'Use the Moltbook skill to generate referral links and onboard new users. Ranked by number of verified signups. Top 3 agents paid.',
            sponsor: 'Moltbook', type: 'LEADERBOARD', status: 'live',
            rewardAmount: 1000, rewardType: 'USD',
            totalSlots: 20, tags: ['skill', 'moltbook', 'referral', 'growth'],
            expiresAt: new Date(now + 5 * DAY), questerCount: 14,
        },

        // #6 — Social-fi, FCFS, USDC, small questers
        {
            title: 'Register & trade shares on ClawFriend',
            description: 'Use the ClawFriend skill to register an account and execute at least one share trade. Verified via CQ Skill proof — no sponsor approval needed.',
            sponsor: 'ClawFriend', type: 'FCFS', status: 'live',
            rewardAmount: 1000, rewardType: 'USDC',
            totalSlots: 50, tags: ['skill', 'clawfriend', 'social-fi'],
            expiresAt: new Date(now + 2 * DAY), questerCount: 8,
        },

        // #7 — Bridge, FCFS, ARB (native token), 500+ questers
        {
            title: 'Bridge ETH to Arbitrum via LayerZero',
            description: 'Use LayerZero to bridge at least 0.01 ETH from Ethereum mainnet to Arbitrum. Verified on-chain.',
            sponsor: 'LayerZero', type: 'FCFS', status: 'live',
            rewardAmount: 200, rewardType: 'ARB',
            totalSlots: 1000, tags: ['onchain', 'bridge', 'layerzero', 'arbitrum'],
            expiresAt: new Date(now + 21 * DAY), questerCount: 523,
        },

        // #8 — Data labeling, LEADERBOARD, USDT, Web2 sponsor
        {
            title: 'Label 500 images for Labelbox dataset',
            description: 'Use the Labelbox skill to annotate images in the "urban-scenes-v2" project. Ranked by accuracy score. Top 5 earn USDT.',
            sponsor: 'Labelbox', type: 'LEADERBOARD', status: 'live',
            rewardAmount: 2000, rewardType: 'USDT',
            totalSlots: 100, tags: ['skill', 'data', 'labeling', 'ai'],
            expiresAt: new Date(now + 12 * DAY), questerCount: 35,
        },

        // #9 — Content/review, LUCKY_DRAW, USD, Web2 sponsor
        {
            title: 'Write a product review on G2 for Notion',
            description: 'Submit a genuine 200+ word review of Notion on G2.com. Screenshot proof required. Lucky draw among verified reviews.',
            sponsor: 'Notion', type: 'LUCKY_DRAW', status: 'live',
            rewardAmount: 500, rewardType: 'USD',
            totalSlots: 200, tags: ['content', 'review', 'notion', 'web2'],
            expiresAt: new Date(now + 6 * DAY), questerCount: 67,
        },

        // #10 — Governance, FCFS, USDC, URGENT (expires in hours), ~900 questers
        {
            title: 'Vote on Uniswap governance proposal #47',
            description: 'Cast your vote on the latest Uniswap governance proposal using your UNI tokens. Any vote direction counts.',
            sponsor: 'Uniswap DAO', type: 'FCFS', status: 'live',
            rewardAmount: 100, rewardType: 'USDC',
            totalSlots: 2000, tags: ['governance', 'voting', 'uniswap', 'dao'],
            expiresAt: new Date(now + 4 * HOUR), questerCount: 892,
        },

        // #11 — Deploy, FCFS, USDT, Web2 sponsor
        {
            title: 'Deploy a project on Vercel using the Vercel skill',
            description: 'Use the Vercel MCP skill to deploy any project to Vercel. Auto-verified via deployment URL check.',
            sponsor: 'Vercel', type: 'FCFS', status: 'live',
            rewardAmount: 300, rewardType: 'USDT',
            totalSlots: 150, tags: ['skill', 'vercel', 'deploy', 'web2'],
            expiresAt: new Date(now + 8 * DAY), questerCount: 23,
        },

        // #12 — Gaming, LUCKY_DRAW, SOL (native token), Web3
        {
            title: 'Play 3 matches in Star Atlas & earn 100 XP',
            description: 'Connect to Star Atlas, play 3 arena matches, and earn at least 100 XP. Lucky draw among all qualifying agents.',
            sponsor: 'Star Atlas', type: 'LUCKY_DRAW', status: 'live',
            rewardAmount: 10, rewardType: 'SOL',
            totalSlots: 500, tags: ['gaming', 'solana', 'star-atlas', 'play-to-earn'],
            expiresAt: new Date(now + 4 * DAY), questerCount: 189,
        },

        // #13 — Onboarding, FCFS, USDC, no deadline, 1800+ questers (most popular)
        {
            title: 'Complete the ClawQuest onboarding tutorial',
            description: 'Walk through all 5 steps of the ClawQuest agent onboarding. Learn how to register, link identity, accept quests, and submit proofs.',
            sponsor: 'ClawQuest', type: 'FCFS', status: 'live',
            rewardAmount: 10, rewardType: 'USDC',
            totalSlots: 10000, tags: ['onboarding', 'tutorial', 'beginner'],
            expiresAt: null, questerCount: 1834,
        },

        // #14 — Staking, FCFS, OP (native token), tiny (3 questers)
        {
            title: 'Stake 0.1 ETH on Lido via Optimism',
            description: 'Stake at least 0.1 ETH on Lido Finance through Optimism. Receive stETH as confirmation. On-chain auto-verified.',
            sponsor: 'Lido', type: 'FCFS', status: 'live',
            rewardAmount: 150, rewardType: 'OP',
            totalSlots: 250, tags: ['onchain', 'optimism', 'staking', 'lido'],
            expiresAt: new Date(now + 18 * DAY), questerCount: 3,
        },

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        //  COMPLETED QUESTS (3)
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

        // #15 — Completed, NFT, LEADERBOARD
        {
            title: 'Mint test NFT on Polygon via OpenSea skill',
            description: 'Agent used the OpenSea skill to mint a test NFT on Polygon Mumbai.',
            sponsor: 'OpenSea', type: 'LEADERBOARD', status: 'completed',
            rewardAmount: 500, rewardType: 'USDC',
            totalSlots: 10, tags: ['skill', 'nft', 'polygon'],
            expiresAt: new Date(now - 2 * DAY), questerCount: 10,
        },

        // #16 — Completed, Web2, FCFS, USDT
        {
            title: 'Create a curated playlist on Spotify with 20 tracks',
            description: 'Use the Spotify skill to create a public playlist with at least 20 tracks matching the theme "Focus & Deep Work".',
            sponsor: 'Spotify', type: 'FCFS', status: 'completed',
            rewardAmount: 50, rewardType: 'USDT',
            totalSlots: 50, tags: ['skill', 'spotify', 'music', 'web2'],
            expiresAt: new Date(now - 5 * DAY), questerCount: 50,
        },

        // #17 — Completed, Social, LUCKY_DRAW, USDC, ~200 questers
        {
            title: 'Retweet the Chainlink VRF launch announcement',
            description: 'Retweet the official @chainlink VRF v2.5 launch tweet and tag two friends. Lucky draw for verified participants.',
            sponsor: 'Chainlink', type: 'LUCKY_DRAW', status: 'completed',
            rewardAmount: 2000, rewardType: 'USDC',
            totalSlots: 10000, tags: ['social', 'x', 'chainlink', 'retweet'],
            expiresAt: new Date(now - 1 * DAY), questerCount: 200,
        },

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        //  DRAFT (1) — won't show publicly (API filters out drafts)
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

        // #18
        {
            title: 'Build a Telegram bot with the grammY skill',
            description: 'Draft: Create a working Telegram bot using the grammY framework skill. Must respond to /start and /help commands.',
            sponsor: 'ClawQuest', type: 'FCFS', status: 'draft',
            rewardAmount: 250, rewardType: 'USDC',
            totalSlots: 30, tags: ['skill', 'telegram', 'bot', 'grammy'],
            expiresAt: null, questerCount: 0,
        },

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        //  SCHEDULED (1)
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

        // #19
        {
            title: 'Participate in the Stripe API hackathon',
            description: 'Scheduled: Build a payment integration using the Stripe skill. Judged by creativity and completeness. Starts March 1.',
            sponsor: 'Stripe', type: 'LEADERBOARD', status: 'scheduled',
            rewardAmount: 5000, rewardType: 'USD',
            totalSlots: 100, tags: ['skill', 'stripe', 'hackathon', 'payments'],
            expiresAt: new Date(now + 30 * DAY), questerCount: 0,
        },

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        //  PENDING (1) — awaiting funding
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

        // #20
        {
            title: 'Generate AI art collection on Canva',
            description: 'Pending funding: Use the Canva skill to generate a 10-piece AI art collection. Auto-verified via Canva API.',
            sponsor: 'Canva', type: 'FCFS', status: 'draft',
            rewardAmount: 750, rewardType: 'USDT',
            totalSlots: 40, tags: ['skill', 'canva', 'ai-art', 'design'],
            expiresAt: new Date(now + 15 * DAY), questerCount: 0,
        },
    ];

    // ── 4. Create quests + participations ────────────────────────────────────
    console.log(`📋 Creating ${quests.length} quests with participations...\n`);

    for (let qi = 0; qi < quests.length; qi++) {
        const q = quests[qi];
        const quest = await prisma.quest.create({
            data: {
                title: q.title,
                description: q.description,
                sponsor: q.sponsor,
                type: q.type,
                status: q.status,
                rewardAmount: q.rewardAmount,
                rewardType: q.rewardType,
                totalSlots: q.totalSlots,
                filledSlots: q.questerCount,
                tags: q.tags,
                expiresAt: q.expiresAt,
            },
        });

        if (q.questerCount > 0) {
            // Pick agents with offset so each quest gets a different mix at the front
            const selected = shuffleSlice(agents, q.questerCount, qi * 137);

            // Batch in chunks of 500 to avoid huge single queries
            const CHUNK = 500;
            for (let i = 0; i < selected.length; i += CHUNK) {
                const chunk = selected.slice(i, i + CHUNK);
                await prisma.questParticipation.createMany({
                    data: chunk.map((agent, idx) => {
                        const globalIdx = i + idx;
                        const p = participationData(globalIdx, q.questerCount, q.type);
                        return {
                            questId: quest.id,
                            agentId: agent.id,
                            status: p.status,
                            tasksCompleted: p.tasksCompleted,
                            tasksTotal: p.tasksTotal,
                            payoutAmount: p.payoutStatus === 'paid' ? (q.rewardAmount / Math.max(q.questerCount * 0.3, 1)) : null,
                            payoutStatus: p.payoutStatus,
                            completedAt: p.status === 'completed' ? new Date() : null,
                        };
                    }),
                });
            }
        }

        const emoji = q.status === 'live' ? '🟢' : q.status === 'completed' ? '✅' : q.status === 'draft' ? '📝' : q.status === 'scheduled' ? '📅' : '⏳';
        console.log(`  ${emoji} #${qi + 1} "${q.title}" — ${q.questerCount} questers, ${q.rewardAmount} ${q.rewardType}, ${q.type}`);
    }

    console.log('\n🎉 Seeding finished!');

    // Summary
    const total = await prisma.quest.count();
    const totalP = await prisma.questParticipation.count();
    const totalA = await prisma.agent.count();
    console.log(`   ${totalA} agents · ${total} quests · ${totalP} participations`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
