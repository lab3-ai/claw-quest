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

    // ── 5. Chain & RPC Registry ──────────────────────────────────────────────
    console.log('\n⛓️  Seeding chain & RPC registry...');

    type ChainSeed = {
        id: number;
        name: string;
        shortName: string;
        nativeCurrency: { symbol: string; name: string; decimals: number };
        explorerUrl: string;
        isTestnet: boolean;
        isEscrowEnabled: boolean;
        rpcs: { url: string; provider: string; priority: number }[];
        contracts: string[]; // from env
    };

    const chainSeeds: ChainSeed[] = [
        {
            id: 8453,
            name: 'Base',
            shortName: 'base',
            nativeCurrency: { symbol: 'ETH', name: 'Ether', decimals: 18 },
            explorerUrl: 'https://basescan.org',
            isTestnet: false,
            isEscrowEnabled: true,
            rpcs: [
                ...(process.env.RPC_URL_8453 ? [{ url: process.env.RPC_URL_8453, provider: 'custom', priority: 1 }] : []),
                ...(process.env.RPC_URL_BASE ? [{ url: process.env.RPC_URL_BASE, provider: 'custom', priority: 2 }] : []),
                { url: 'https://mainnet.base.org', provider: 'public', priority: 20 },
                { url: 'https://base.llamarpc.com', provider: 'public', priority: 30 },
            ],
            contracts: [
                process.env.ESCROW_CONTRACT_8453,
                process.env.ESCROW_CONTRACT,
            ].filter(Boolean) as string[],
        },
        {
            id: 84532,
            name: 'Base Sepolia',
            shortName: 'base-sepolia',
            nativeCurrency: { symbol: 'ETH', name: 'Ether', decimals: 18 },
            explorerUrl: 'https://sepolia.basescan.org',
            isTestnet: true,
            isEscrowEnabled: true,
            rpcs: [
                ...(process.env.RPC_URL_84532 ? [{ url: process.env.RPC_URL_84532, provider: 'custom', priority: 1 }] : []),
                ...(process.env.RPC_URL_BASE_SEPOLIA ? [{ url: process.env.RPC_URL_BASE_SEPOLIA, provider: 'custom', priority: 2 }] : []),
                { url: 'https://sepolia.base.org', provider: 'public', priority: 20 },
            ],
            contracts: [
                process.env.ESCROW_CONTRACT_84532,
                process.env.ESCROW_CONTRACT,
            ].filter(Boolean) as string[],
        },
        {
            id: 56,
            name: 'BNB Smart Chain',
            shortName: 'bnb',
            nativeCurrency: { symbol: 'BNB', name: 'BNB', decimals: 18 },
            explorerUrl: 'https://bscscan.com',
            isTestnet: false,
            isEscrowEnabled: true,
            rpcs: [
                ...(process.env.RPC_URL_56 ? [{ url: process.env.RPC_URL_56, provider: 'custom', priority: 1 }] : []),
                ...(process.env.RPC_URL_BNB ? [{ url: process.env.RPC_URL_BNB, provider: 'custom', priority: 2 }] : []),
                { url: 'https://bsc-dataseed.binance.org', provider: 'public', priority: 20 },
                { url: 'https://bsc-dataseed1.binance.org', provider: 'public', priority: 30 },
                { url: 'https://bsc-dataseed2.binance.org', provider: 'public', priority: 40 },
            ],
            contracts: [
                process.env.ESCROW_CONTRACT_56,
                process.env.ESCROW_CONTRACT,
            ].filter(Boolean) as string[],
        },
    ];

    for (const { rpcs, contracts, ...chainData } of chainSeeds) {
        await prisma.chain.upsert({
            where: { id: chainData.id },
            update: chainData,
            create: chainData,
        });

        // Deduplicate RPCs by URL before upserting
        const uniqueRpcs = rpcs.filter((rpc, idx, arr) => arr.findIndex(r => r.url === rpc.url) === idx);
        for (const rpc of uniqueRpcs) {
            await prisma.chainRpc.upsert({
                where: { chainId_url: { chainId: chainData.id, url: rpc.url } },
                update: { priority: rpc.priority, provider: rpc.provider },
                create: { chainId: chainData.id, ...rpc },
            });
        }

        // Seed active contract addresses from env
        for (const address of contracts) {
            await prisma.escrowContract.upsert({
                where: { chainId_address: { chainId: chainData.id, address } },
                update: { isActive: true },
                create: { chainId: chainData.id, address, isActive: true },
            });
        }

        console.log(`  ⛓️  ${chainData.name} (${chainData.id}) — ${uniqueRpcs.length} RPCs, ${contracts.length} contracts`);
    }

    // ── 5b. X Layer Chain ───────────────────────────────────────────────────
    console.log('\n⛓️  Seeding X Layer chain...');

    await prisma.chain.upsert({
        where: { id: 196 },
        update: {
            name: 'X Layer',
            shortName: 'xlayer',
            nativeCurrency: { symbol: 'OKB', name: 'OKB', decimals: 18 },
            explorerUrl: 'https://www.oklink.com/x-layer',
            isEscrowEnabled: true,
            isActive: true,
        },
        create: {
            id: 196,
            name: 'X Layer',
            shortName: 'xlayer',
            nativeCurrency: { symbol: 'OKB', name: 'OKB', decimals: 18 },
            explorerUrl: 'https://www.oklink.com/x-layer',
            isTestnet: false,
            isEscrowEnabled: true,
            isActive: true,
        },
    });

    const xlayerRpcs = [
        { url: 'https://rpc.xlayer.tech', provider: 'xlayer-official', priority: 10 },
        { url: 'https://xlayerrpc.okx.com', provider: 'okx-official', priority: 20 },
    ];
    for (const rpc of xlayerRpcs) {
        await prisma.chainRpc.upsert({
            where: { chainId_url: { chainId: 196, url: rpc.url } },
            update: { priority: rpc.priority, provider: rpc.provider, isActive: true },
            create: { chainId: 196, ...rpc },
        });
    }

    await prisma.escrowContract.upsert({
        where: { chainId_address: { chainId: 196, address: '0x123105BBf922599D3b77Ce80Ed2F288E0eF31Da7' } },
        update: { isActive: true },
        create: { chainId: 196, address: '0x123105BBf922599D3b77Ce80Ed2F288E0eF31Da7', isActive: true },
    });

    await prisma.escrowCursor.upsert({
        where: { chainId: 196 },
        update: {},
        create: { chainId: 196, lastBlock: BigInt(55674415) },
    });

    console.log('  ⛓️  X Layer (196) — 2 RPCs, 1 contract, cursor at block 55674415');

    // ── 6. LLM Model Catalog ─────────────────────────────────────────────────
    console.log('\n🤖 Seeding LLM model catalog...');

    const llmModels = [
        // Premium tier
        { openrouterId: 'anthropic/claude-opus-4.6',     name: 'Claude Opus 4.6',   provider: 'Anthropic', tier: 'premium', inputPricePer1M: 5.30,  outputPricePer1M: 26.50, contextWindow: 1_000_000 },
        { openrouterId: 'anthropic/claude-sonnet-4.6',   name: 'Claude Sonnet 4.6', provider: 'Anthropic', tier: 'premium', inputPricePer1M: 3.18,  outputPricePer1M: 15.90, contextWindow: 1_000_000 },
        { openrouterId: 'openai/gpt-5.4',                name: 'GPT-5.4',           provider: 'OpenAI',    tier: 'premium', inputPricePer1M: 2.65,  outputPricePer1M: 15.90, contextWindow: 1_000_000 },
        { openrouterId: 'x-ai/grok-4',                   name: 'Grok 4',            provider: 'xAI',       tier: 'premium', inputPricePer1M: 3.18,  outputPricePer1M: 15.90, contextWindow: 256_000   },
        // Mid tier
        { openrouterId: 'google/gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro',    provider: 'Google',    tier: 'mid',     inputPricePer1M: 2.12,  outputPricePer1M: 12.72, contextWindow: 1_000_000 },
        // Budget tier
        { openrouterId: 'openai/gpt-5-mini',             name: 'GPT-5 Mini',        provider: 'OpenAI',    tier: 'budget',  inputPricePer1M: 0.27,  outputPricePer1M: 2.12,  contextWindow: 1_000_000 },
        { openrouterId: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash',    provider: 'Google',    tier: 'budget',  inputPricePer1M: 0.53,  outputPricePer1M: 3.18,  contextWindow: 1_000_000 },
        { openrouterId: 'x-ai/grok-4-fast',              name: 'Grok 4 Fast',       provider: 'xAI',       tier: 'budget',  inputPricePer1M: 0.21,  outputPricePer1M: 0.53,  contextWindow: 2_000_000 },
        { openrouterId: 'moonshotai/kimi-k2.5',          name: 'Kimi K2.5',         provider: 'Moonshot',  tier: 'budget',  inputPricePer1M: 0.48,  outputPricePer1M: 2.33,  contextWindow: 262_000   },
    ];

    for (const model of llmModels) {
        await prisma.llmModel.upsert({
            where: { openrouterId: model.openrouterId },
            update: {
                name: model.name,
                provider: model.provider,
                tier: model.tier,
                inputPricePer1M: model.inputPricePer1M,
                outputPricePer1M: model.outputPricePer1M,
                contextWindow: model.contextWindow,
                isActive: true,
            },
            create: model,
        });
        console.log(`  🧠 ${model.name} (${model.tier}) — in: $${model.inputPricePer1M}/1M, out: $${model.outputPricePer1M}/1M`);
    }

    // ── 7. GitHub Bounties ──────────────────────────────────────────────────
    console.log('\n💰 Seeding GitHub bounties...');

    // Find or create a sponsor user for bounties
    const bountyCreator = await prisma.user.upsert({
        where: { email: 'sponsor@clawquest.dev' },
        update: {},
        create: {
            email: 'sponsor@clawquest.dev',
            displayName: 'ClawQuest Team',
            username: 'clawquest-team',
            role: 'user',
        },
    });

    interface BountySeed {
        repoOwner: string;
        repoName: string;
        title: string;
        description: string;
        rewardAmount: number;
        rewardType: string;
        status: string;
        fundingStatus: string;
        questType: string;
        maxWinners: number;
        deadline: Date | null;
        issueNumber: number | null;
        issueUrl: string | null;
        llmKeyTokenLimit: number | null;
        submissionCount: number; // how many fake submissions to generate
    }

    const bounties: BountySeed[] = [
        // ── Live USDC bounties ──────────────────────────────────────────────
        {
            repoOwner: 'anthropics', repoName: 'claude-code',
            title: 'Add MCP resource caching to reduce latency',
            description: 'Implement a TTL-based cache layer for MCP resource reads. When a resource is fetched, cache it locally with configurable TTL. Support cache invalidation via resource change notifications. Include unit tests and update docs.',
            rewardAmount: 500, rewardType: 'USDC', status: 'live', fundingStatus: 'confirmed',
            questType: 'fcfs', maxWinners: 1,
            deadline: new Date(now + 14 * DAY), issueNumber: 4521, issueUrl: 'https://github.com/anthropics/claude-code/issues/4521',
            llmKeyTokenLimit: null, submissionCount: 2,
        },
        {
            repoOwner: 'vercel', repoName: 'ai',
            title: 'Implement streaming retry with exponential backoff',
            description: 'Add configurable retry logic to streamText() that handles transient provider errors. Use exponential backoff with jitter. Retry should resume from last received token when possible. Must work with all providers.',
            rewardAmount: 300, rewardType: 'USDC', status: 'live', fundingStatus: 'confirmed',
            questType: 'fcfs', maxWinners: 2,
            deadline: new Date(now + 10 * DAY), issueNumber: null, issueUrl: null,
            llmKeyTokenLimit: null, submissionCount: 3,
        },
        {
            repoOwner: 'denoland', repoName: 'deno',
            title: 'Fix WASM module hot-reload in --watch mode',
            description: 'When using --watch mode, changes to .wasm files are detected but the module is not properly reloaded. The cached compiled module needs to be invalidated. Reproduce: create a Rust→WASM project, run with deno --watch, modify the .rs file and rebuild.',
            rewardAmount: 200, rewardType: 'USDC', status: 'live', fundingStatus: 'confirmed',
            questType: 'fcfs', maxWinners: 1,
            deadline: new Date(now + 7 * DAY), issueNumber: 28134, issueUrl: 'https://github.com/denoland/deno/issues/28134',
            llmKeyTokenLimit: null, submissionCount: 1,
        },
        {
            repoOwner: 'shadcn-ui', repoName: 'ui',
            title: 'Add multi-select Combobox component',
            description: 'Create a new multi-select variant of the Combobox component. Support chip display of selected items, search/filter, keyboard navigation, and clear-all. Follow existing component patterns (Radix + Tailwind). Include registry entry and docs.',
            rewardAmount: 150, rewardType: 'USDC', status: 'live', fundingStatus: 'confirmed',
            questType: 'fcfs', maxWinners: 1,
            deadline: new Date(now + 21 * DAY), issueNumber: null, issueUrl: null,
            llmKeyTokenLimit: null, submissionCount: 0,
        },

        // ── Live LLM_KEY bounties (no funding needed) ───────────────────────
        {
            repoOwner: 'langchain-ai', repoName: 'langchainjs',
            title: 'Add Qdrant vector store sparse+dense hybrid search',
            description: 'Implement hybrid search for the Qdrant integration using both sparse (BM25) and dense vectors. The existing QdrantVectorStore class needs a new hybridSearch() method. Include integration test with a real Qdrant instance via Docker.',
            rewardAmount: 0, rewardType: 'LLM_KEY', status: 'live', fundingStatus: 'confirmed',
            questType: 'fcfs', maxWinners: 3,
            deadline: new Date(now + 30 * DAY), issueNumber: 7892, issueUrl: 'https://github.com/langchain-ai/langchainjs/issues/7892',
            llmKeyTokenLimit: 2_000_000, submissionCount: 1,
        },
        {
            repoOwner: 'supabase', repoName: 'supabase',
            title: 'Implement realtime presence cursors for Dashboard SQL editor',
            description: 'Add collaborative cursor presence to the SQL editor in the Supabase dashboard. Show other users\' cursor positions and selections in real-time using Supabase Realtime Presence. Color-code by user. Debounce position updates to 100ms.',
            rewardAmount: 0, rewardType: 'LLM_KEY', status: 'live', fundingStatus: 'confirmed',
            questType: 'leaderboard', maxWinners: 2,
            deadline: new Date(now + 14 * DAY), issueNumber: null, issueUrl: null,
            llmKeyTokenLimit: 5_000_000, submissionCount: 4,
        },

        // ── Completed bounties ──────────────────────────────────────────────
        {
            repoOwner: 'prisma', repoName: 'prisma',
            title: 'Add JSON path filtering for PostgreSQL JSONB columns',
            description: 'Extend Prisma Client to support PostgreSQL JSONB path operators (->>, #>>, @>) in where clauses. Currently only basic Json filtering is supported. This should generate proper SQL using pg jsonb operators.',
            rewardAmount: 400, rewardType: 'USDC', status: 'completed', fundingStatus: 'confirmed',
            questType: 'fcfs', maxWinners: 1,
            deadline: new Date(now - 3 * DAY), issueNumber: 18750, issueUrl: 'https://github.com/prisma/prisma/issues/18750',
            llmKeyTokenLimit: null, submissionCount: 2,
        },
        {
            repoOwner: 'TanStack', repoName: 'router',
            title: 'Fix type inference for nested catch-all routes',
            description: 'Route params type inference breaks when using nested catch-all routes ($...rest inside a layout route). The generated route types show `unknown` instead of `string[]`. Reproducible with file-based routing in a Vite project.',
            rewardAmount: 100, rewardType: 'USDC', status: 'completed', fundingStatus: 'confirmed',
            questType: 'fcfs', maxWinners: 1,
            deadline: new Date(now - 7 * DAY), issueNumber: 3421, issueUrl: 'https://github.com/TanStack/router/issues/3421',
            llmKeyTokenLimit: null, submissionCount: 1,
        },

        // ── More Open bounties (live, no submissions yet) ────────────────────
        {
            repoOwner: 'tauri-apps', repoName: 'tauri',
            title: 'Add system tray balloon notification support on Linux',
            description: 'System tray balloon notifications work on Windows and macOS but fail silently on Linux. Implement using libnotify or D-Bus org.freedesktop.Notifications. Should match the existing Notification API surface.',
            rewardAmount: 300, rewardType: 'USDC', status: 'live', fundingStatus: 'confirmed',
            questType: 'fcfs', maxWinners: 1,
            deadline: new Date(now + 18 * DAY), issueNumber: 11245, issueUrl: 'https://github.com/tauri-apps/tauri/issues/11245',
            llmKeyTokenLimit: null, submissionCount: 0,
        },
        {
            repoOwner: 'vitejs', repoName: 'vite',
            title: 'CSS source maps incorrect with postcss-nesting',
            description: 'When using postcss-nesting, CSS source maps point to wrong lines after transformation. The issue is in the source map composition step. Debug by enabling sourcemap: true in postcss config and checking Chrome DevTools mapping.',
            rewardAmount: 150, rewardType: 'USDC', status: 'live', fundingStatus: 'confirmed',
            questType: 'fcfs', maxWinners: 1,
            deadline: new Date(now + 12 * DAY), issueNumber: null, issueUrl: null,
            llmKeyTokenLimit: null, submissionCount: 0,
        },
        {
            repoOwner: 'drizzle-team', repoName: 'drizzle-orm',
            title: 'Add .returning() support for SQLite batch inserts',
            description: 'SQLite supports RETURNING clause since 3.35.0 but drizzle-orm only supports it for single inserts, not batch. Extend the SQLite dialect to generate RETURNING for insert().values([...]) calls.',
            rewardAmount: 0, rewardType: 'LLM_KEY', status: 'live', fundingStatus: 'confirmed',
            questType: 'fcfs', maxWinners: 2,
            deadline: new Date(now + 25 * DAY), issueNumber: 4102, issueUrl: 'https://github.com/drizzle-team/drizzle-orm/issues/4102',
            llmKeyTokenLimit: 1_500_000, submissionCount: 0,
        },

        // ── More In Review bounties (live, has submissions) ─────────────────
        {
            repoOwner: 'oven-sh', repoName: 'bun',
            title: 'Fix node:cluster IPC message ordering',
            description: 'Messages sent via process.send() in cluster workers arrive out of order under high throughput. The issue is in the libuv IPC pipe buffering. Reproduce with a benchmark that sends 10k numbered messages and checks arrival order.',
            rewardAmount: 500, rewardType: 'USDC', status: 'live', fundingStatus: 'confirmed',
            questType: 'fcfs', maxWinners: 1,
            deadline: new Date(now + 8 * DAY), issueNumber: 19832, issueUrl: 'https://github.com/oven-sh/bun/issues/19832',
            llmKeyTokenLimit: null, submissionCount: 3,
        },
        {
            repoOwner: 'astro-js', repoName: 'astro',
            title: 'Content Collections: add computed fields from frontmatter',
            description: 'Allow defining computed fields in content collection schemas that derive from other frontmatter values (e.g. readingTime from body, slug from title). Currently requires a remark plugin workaround. Should integrate with Zod transform().',
            rewardAmount: 200, rewardType: 'USDC', status: 'live', fundingStatus: 'confirmed',
            questType: 'leaderboard', maxWinners: 2,
            deadline: new Date(now + 15 * DAY), issueNumber: null, issueUrl: null,
            llmKeyTokenLimit: null, submissionCount: 2,
        },
        {
            repoOwner: 'trpc', repoName: 'trpc',
            title: 'Add WebSocket reconnect with message replay',
            description: 'When a WebSocket subscription drops and reconnects, missed messages are lost. Implement a replay buffer on the server (configurable depth) and a sequence-number protocol so the client can resume from last received seq.',
            rewardAmount: 0, rewardType: 'LLM_KEY', status: 'live', fundingStatus: 'confirmed',
            questType: 'fcfs', maxWinners: 1,
            deadline: new Date(now + 20 * DAY), issueNumber: 6891, issueUrl: 'https://github.com/trpc/trpc/issues/6891',
            llmKeyTokenLimit: 3_000_000, submissionCount: 1,
        },

        // ── More Completed bounties ─────────────────────────────────────────
        {
            repoOwner: 'honojs', repoName: 'hono',
            title: 'Fix multipart form parsing crash on empty file fields',
            description: 'When a multipart form includes a file input that was left empty, the parser throws "Cannot read property of undefined". The issue is in the boundary detection code. Add null check and return empty File object.',
            rewardAmount: 100, rewardType: 'USDC', status: 'completed', fundingStatus: 'confirmed',
            questType: 'fcfs', maxWinners: 1,
            deadline: new Date(now - 5 * DAY), issueNumber: 4210, issueUrl: 'https://github.com/honojs/hono/issues/4210',
            llmKeyTokenLimit: null, submissionCount: 1,
        },
        {
            repoOwner: 'unjs', repoName: 'nitro',
            title: 'Add rate limiting middleware with sliding window',
            description: 'Implement a built-in rate limiting middleware using sliding window algorithm. Should support IP-based and header-based identification, configurable window size and max requests, and return proper 429 headers (Retry-After, X-RateLimit-*).',
            rewardAmount: 250, rewardType: 'USDC', status: 'completed', fundingStatus: 'confirmed',
            questType: 'fcfs', maxWinners: 1,
            deadline: new Date(now - 10 * DAY), issueNumber: null, issueUrl: null,
            llmKeyTokenLimit: null, submissionCount: 3,
        },
        {
            repoOwner: 'Effect-TS', repoName: 'effect',
            title: 'Improve Schema.decode error messages for nested unions',
            description: 'When decoding fails on a nested discriminated union, the error message shows all branches instead of the closest match. Implement nearest-match scoring based on the number of successfully decoded fields to surface the most relevant error.',
            rewardAmount: 0, rewardType: 'LLM_KEY', status: 'completed', fundingStatus: 'confirmed',
            questType: 'fcfs', maxWinners: 1,
            deadline: new Date(now - 2 * DAY), issueNumber: 5678, issueUrl: 'https://github.com/Effect-TS/effect/issues/5678',
            llmKeyTokenLimit: 1_000_000, submissionCount: 2,
        },
        {
            repoOwner: 'solidjs', repoName: 'solid-start',
            title: 'Fix server function serialization for Date objects',
            description: 'Date objects passed as arguments to server functions arrive as strings on the server side. The serializer needs to handle Date instances by converting to ISO string and reconstructing on the server. Also affects Map and Set.',
            rewardAmount: 175, rewardType: 'USDC', status: 'completed', fundingStatus: 'confirmed',
            questType: 'fcfs', maxWinners: 1,
            deadline: new Date(now - 14 * DAY), issueNumber: 2345, issueUrl: 'https://github.com/solidjs/solid-start/issues/2345',
            llmKeyTokenLimit: null, submissionCount: 1,
        },

        // ── Draft bounties (not yet funded) ─────────────────────────────────
        {
            repoOwner: 'biomejs', repoName: 'biome',
            title: 'Add auto-fix for useExhaustiveDeps rule',
            description: 'The useExhaustiveDeps lint rule currently only reports missing deps but offers no auto-fix. Implement a safe auto-fix that adds missing dependencies to the dependency array. Must handle ref deps correctly (skip stable refs).',
            rewardAmount: 250, rewardType: 'USDC', status: 'draft', fundingStatus: 'unfunded',
            questType: 'fcfs', maxWinners: 1,
            deadline: null, issueNumber: null, issueUrl: null,
            llmKeyTokenLimit: null, submissionCount: 0,
        },
        {
            repoOwner: 'cloudflare', repoName: 'workers-sdk',
            title: 'Support Durable Object alarms in wrangler dev --local',
            description: 'Durable Object alarms (setAlarm/deleteAlarm) are not supported in local development mode. Implement alarm scheduling and firing in the local miniflare runtime. Should respect the alarm handler and support getAlarm().',
            rewardAmount: 350, rewardType: 'USDC', status: 'draft', fundingStatus: 'unfunded',
            questType: 'fcfs', maxWinners: 1,
            deadline: null, issueNumber: 8234, issueUrl: 'https://github.com/cloudflare/workers-sdk/issues/8234',
            llmKeyTokenLimit: null, submissionCount: 0,
        },
    ];

    // Find existing agents for submissions
    const submitterAgents = await prisma.agent.findMany({
        take: 10,
        select: { id: true, agentname: true },
        orderBy: { createdAt: 'asc' },
    });

    for (const b of bounties) {
        // Skip if already seeded (check by title + repo)
        const existing = await prisma.gitHubBounty.findFirst({
            where: { repoOwner: b.repoOwner, repoName: b.repoName, title: b.title },
        });
        if (existing) {
            console.log(`  ⏭️  ${b.repoOwner}/${b.repoName}: already exists, skipping`);
            continue;
        }

        const bounty = await prisma.gitHubBounty.create({
            data: {
                creatorUserId: bountyCreator.id,
                repoOwner: b.repoOwner,
                repoName: b.repoName,
                title: b.title,
                description: b.description,
                rewardAmount: b.rewardAmount,
                rewardType: b.rewardType,
                status: b.status,
                fundingStatus: b.fundingStatus,
                questType: b.questType,
                maxWinners: b.maxWinners,
                deadline: b.deadline,
                issueNumber: b.issueNumber,
                issueUrl: b.issueUrl,
                llmKeyTokenLimit: b.llmKeyTokenLimit,
            },
        });

        // Create submissions from agents
        if (b.submissionCount > 0 && submitterAgents.length > 0) {
            const agents = submitterAgents.slice(0, b.submissionCount);
            for (let i = 0; i < agents.length; i++) {
                const agent = agents[i];
                const prNum = 100 + Math.floor(Math.random() * 900);
                const subStatus = b.status === 'completed' && i === 0 ? 'approved' : 'pending';
                await prisma.gitHubBountySubmission.create({
                    data: {
                        bountyId: bounty.id,
                        agentId: agent.id,
                        prUrl: `https://github.com/${b.repoOwner}/${b.repoName}/pull/${prNum}`,
                        prNumber: prNum,
                        status: subStatus,
                    },
                }).catch(() => {
                    // skip if duplicate (bountyId, agentId) — idempotent
                });
            }
        }

        const statusIcon = b.status === 'live' ? '🟢' : b.status === 'completed' ? '✅' : '📝';
        const reward = b.rewardType === 'LLM_KEY' ? `${(b.llmKeyTokenLimit! / 1_000_000).toFixed(0)}M tokens` : `$${b.rewardAmount} ${b.rewardType}`;
        console.log(`  ${statusIcon} ${b.repoOwner}/${b.repoName}: ${b.title.slice(0, 50)}... (${reward}, ${b.submissionCount} subs)`);
    }

    console.log(`\n✅ Seeded ${bounties.length} GitHub bounties`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
