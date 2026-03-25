import { PrismaClient } from '@prisma/client';

export interface TestUser {
  id: string;
  email: string;
  supabaseId: string;
  apiKey?: string;
}

export interface TestAgent {
  id: string;
  agentname: string;
  ownerId: string;
  agentApiKey: string;
}

export interface TestQuest {
  id: string;
  title: string;
  creatorUserId: string;
  rewardAmount: string;
  rewardType: string;
  status: string;
}

/**
 * Create a test user with optional supabase ID
 */
export async function createTestUser(
  prisma: PrismaClient,
  overrides: Partial<{ email: string; supabaseId: string; role: string }> = {}
): Promise<TestUser> {
  const email = overrides.email || `test-${Date.now()}@example.com`;
  const supabaseId = overrides.supabaseId || `sb_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const user = await prisma.user.create({
    data: {
      email,
      supabaseId,
      role: overrides.role || 'user',
      displayName: `Test User ${Date.now()}`,
    },
  });

  return {
    id: user.id,
    email: user.email,
    supabaseId: user.supabaseId!,
  };
}

/**
 * Create a test agent with API key
 */
export async function createTestAgent(
  prisma: PrismaClient,
  ownerId: string,
  overrides: Partial<{ agentname: string }> = {}
): Promise<TestAgent> {
  const agentname = overrides.agentname || `test-agent-${Date.now()}`;
  const agentApiKey = `cq_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const agent = await prisma.agent.create({
    data: {
      agentname,
      ownerId,
      agentApiKey,
      status: 'idle',
    },
  });

  return {
    id: agent.id,
    agentname: agent.agentname,
    ownerId: agent.ownerId!,
    agentApiKey: agent.agentApiKey!,
  };
}

/**
 * Create a test quest
 */
export async function createTestQuest(
  prisma: PrismaClient,
  creatorUserId: string,
  overrides: Partial<{
    title: string;
    status: string;
    rewardType: string;
    rewardAmount: string;
    fundingStatus: string;
    totalSlots: number;
  }> = {}
): Promise<TestQuest> {
  const quest = await prisma.quest.create({
    data: {
      title: overrides.title || `Test Quest ${Date.now()}`,
      description: 'Test quest description',
      sponsor: 'Test Sponsor',
      type: 'FCFS',
      status: overrides.status || 'draft',
      rewardType: overrides.rewardType || 'USDC',
      rewardAmount: overrides.rewardAmount || '100',
      totalSlots: overrides.totalSlots || 10,
      fundingStatus: overrides.fundingStatus || 'unfunded',
      creatorUserId,
      tasks: [
        {
          id: '1',
          platform: 'x',
          action: 'follow_account',
          target: '@testaccount',
          description: 'Follow test account',
        },
      ],
    },
  });

  return {
    id: quest.id,
    title: quest.title,
    creatorUserId: quest.creatorUserId!,
    rewardAmount: quest.rewardAmount.toString(),
    rewardType: quest.rewardType,
    status: quest.status,
  };
}

/**
 * Mock Supabase client that returns valid user
 */
export function createMockSupabase(user: TestUser) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: {
            id: user.supabaseId,
            email: user.email,
            user_metadata: {
              full_name: 'Test User',
            },
          },
        },
        error: null,
      }),
    },
  };
}

/**
 * Clean up test data
 */
export async function cleanupTestData(prisma: PrismaClient, userIds: string[]) {
  // Delete in correct order due to foreign key constraints
  await prisma.questParticipation.deleteMany({
    where: { userId: { in: userIds } },
  });
  await prisma.questDeposit.deleteMany({
    where: { userId: { in: userIds } },
  });
  await prisma.questCollaborator.deleteMany({
    where: { userId: { in: userIds } },
  });
  await prisma.quest.deleteMany({
    where: { creatorUserId: { in: userIds } },
  });
  await prisma.agentSkill.deleteMany({
    where: { agent: { ownerId: { in: userIds } } },
  });
  await prisma.agentLog.deleteMany({
    where: { agent: { ownerId: { in: userIds } } },
  });
  await prisma.agent.deleteMany({
    where: { ownerId: { in: userIds } },
  });
  await prisma.walletLink.deleteMany({
    where: { userId: { in: userIds } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: userIds } },
  });
}
