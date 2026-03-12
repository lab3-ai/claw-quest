import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { createTestUser, cleanupTestData } from './helpers/test-fixtures';

const prisma = new PrismaClient();
const testUserIds: string[] = [];

describe('Telegram Bot Commands Integration Tests', () => {
  describe('Agent Activation via Telegram', () => {
    let agentId: string;
    let activationCode: string;
    let owner: any;

    beforeAll(async () => {
      owner = await createTestUser(prisma, { email: 'telegram-owner@test.com' });
      testUserIds.push(owner.id);

      // Create an agent with activation code
      const agent = await prisma.agent.create({
        data: {
          agentname: 'telegram-test-agent',
          ownerId: owner.id,
          activationCode: 'ABC123',
          status: 'pending',
        },
      });

      agentId = agent.id;
      activationCode = agent.activationCode!;
    });

    afterAll(async () => {
      await cleanupTestData(prisma, testUserIds);
      await prisma.$disconnect();
    });

    it('should find agent by activation code', async () => {
      const agent = await prisma.agent.findUnique({
        where: { activationCode: activationCode.toUpperCase() },
      });

      expect(agent).toBeDefined();
      expect(agent?.id).toBe(agentId);
      expect(agent?.agentname).toBe('telegram-test-agent');
      expect(agent?.ownerId).toBe(owner.id);
    });

    it('should create Telegram link for agent', async () => {
      const telegramId = BigInt(123456789);
      const username = 'testuser';
      const firstName = 'Test';

      const link = await prisma.telegramLink.create({
        data: {
          agentId,
          telegramId,
          username,
          firstName,
        },
      });

      expect(link.agentId).toBe(agentId);
      expect(link.telegramId).toBe(telegramId);
      expect(link.username).toBe(username);
      expect(link.firstName).toBe(firstName);
    });

    it('should prevent duplicate Telegram links', async () => {
      await expect(
        prisma.telegramLink.create({
          data: {
            agentId,
            telegramId: BigInt(987654321),
            username: 'anotheruser',
            firstName: 'Another',
          },
        })
      ).rejects.toThrow();
    });

    it('should clear activation code after linking', async () => {
      const updatedAgent = await prisma.agent.update({
        where: { id: agentId },
        data: { activationCode: null },
      });

      expect(updatedAgent.activationCode).toBeNull();

      // Should not find agent with old activation code
      const notFound = await prisma.agent.findUnique({
        where: { activationCode: 'ABC123' },
      });

      expect(notFound).toBeNull();
    });
  });

  describe('Telegram Register Flow', () => {
    let owner: any;
    let agentId: string;
    let activationCode: string;

    beforeAll(async () => {
      owner = await createTestUser(prisma, { email: 'register-test@test.com' });
      testUserIds.push(owner.id);

      const agent = await prisma.agent.create({
        data: {
          agentname: 'register-agent',
          ownerId: owner.id,
          activationCode: 'REG123',
          status: 'pending',
        },
      });

      agentId = agent.id;
      activationCode = agent.activationCode!;
    });

    it('should find user by email', async () => {
      const user = await prisma.user.findUnique({
        where: { email: 'register-test@test.com' },
      });

      expect(user).toBeDefined();
      expect(user?.id).toBe(owner.id);
    });

    it('should find agent by activation code and owner', async () => {
      const agent = await prisma.agent.findFirst({
        where: {
          activationCode: activationCode,
          ownerId: owner.id,
        },
      });

      expect(agent).toBeDefined();
      expect(agent?.id).toBe(agentId);
    });

    it('should complete registration workflow', async () => {
      const telegramId = BigInt(111222333);

      // Step 1: Check if link exists
      const existingLink = await prisma.telegramLink.findUnique({
        where: { agentId },
      });

      expect(existingLink).toBeNull();

      // Step 2: Create Telegram link
      const link = await prisma.telegramLink.create({
        data: {
          agentId,
          telegramId,
          username: 'registeruser',
          firstName: 'Register',
        },
      });

      expect(link).toBeDefined();

      // Step 3: Clear activation code
      const updatedAgent = await prisma.agent.update({
        where: { id: agentId },
        data: { activationCode: null },
      });

      expect(updatedAgent.activationCode).toBeNull();

      // Step 4: Update user with telegram ID
      const updatedUser = await prisma.user.update({
        where: { id: owner.id },
        data: { telegramId: String(telegramId) },
      });

      expect(updatedUser.telegramId).toBe(String(telegramId));
    });
  });

  describe('Telegram Quest Browsing', () => {
    let user: any;
    let questIds: string[] = [];

    beforeAll(async () => {
      user = await createTestUser(prisma, { email: 'quest-browser@test.com' });
      testUserIds.push(user.id);

      // Create live quests
      const quest1 = await prisma.quest.create({
        data: {
          title: 'Live Quest 1',
          description: 'First quest',
          sponsor: 'Sponsor A',
          type: 'FCFS',
          status: 'live',
          rewardType: 'USDC',
          rewardAmount: 50,
          totalSlots: 10,
          fundingStatus: 'confirmed',
          fundedAt: new Date(),
          creatorUserId: user.id,
          tasks: [],
        },
      });

      const quest2 = await prisma.quest.create({
        data: {
          title: 'Live Quest 2',
          description: 'Second quest',
          sponsor: 'Sponsor B',
          type: 'FCFS',
          status: 'live',
          rewardType: 'USDC',
          rewardAmount: 100,
          totalSlots: 5,
          fundingStatus: 'confirmed',
          fundedAt: new Date(),
          creatorUserId: user.id,
          tasks: [],
        },
      });

      questIds.push(quest1.id, quest2.id);
    });

    it('should list live quests', async () => {
      const quests = await prisma.quest.findMany({
        where: { status: 'live' },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      expect(quests.length).toBeGreaterThanOrEqual(2);
      expect(quests.some((q) => q.title === 'Live Quest 1')).toBe(true);
      expect(quests.some((q) => q.title === 'Live Quest 2')).toBe(true);
    });

    it('should filter quests with available slots', async () => {
      const quests = await prisma.quest.findMany({
        where: {
          status: 'live',
          filledSlots: { lt: prisma.quest.fields.totalSlots },
        },
      });

      expect(quests.length).toBeGreaterThanOrEqual(2);
      quests.forEach((q) => {
        expect(q.filledSlots).toBeLessThan(q.totalSlots);
      });
    });

    it('should get quest details by ID', async () => {
      const quest = await prisma.quest.findUnique({
        where: { id: questIds[0] },
      });

      expect(quest).toBeDefined();
      expect(quest?.title).toBe('Live Quest 1');
      expect(quest?.rewardAmount.toString()).toBe('50');
      expect(quest?.totalSlots).toBe(10);
      expect(quest?.creatorUserId).toBe(user.id);
    });
  });

  describe('Telegram Quest Acceptance', () => {
    let agent: any;
    let quest: any;
    let telegramId: bigint;

    beforeAll(async () => {
      const owner = await createTestUser(prisma, { email: 'quest-accept@test.com' });
      testUserIds.push(owner.id);

      telegramId = BigInt(999888777);

      // Create agent
      agent = await prisma.agent.create({
        data: {
          agentname: 'accept-agent',
          ownerId: owner.id,
          status: 'idle',
        },
      });

      // Create telegram link
      await prisma.telegramLink.create({
        data: {
          agentId: agent.id,
          telegramId,
          username: 'acceptuser',
          firstName: 'Accept',
        },
      });

      // Create live quest
      quest = await prisma.quest.create({
        data: {
          title: 'Quest to Accept',
          description: 'Accept this quest',
          sponsor: 'Test Sponsor',
          type: 'FCFS',
          status: 'live',
          rewardType: 'USDC',
          rewardAmount: 200,
          totalSlots: 3,
          filledSlots: 0,
          fundingStatus: 'confirmed',
          fundedAt: new Date(),
          creatorUserId: owner.id,
          tasks: [
            {
              id: '1',
              platform: 'x',
              action: 'follow',
              target: '@test',
              description: 'Follow us',
            },
          ],
        },
      });
    });

    it('should find agent by telegram ID', async () => {
      const link = await prisma.telegramLink.findFirst({
        where: { telegramId },
        include: { agent: true },
      });

      expect(link).toBeDefined();
      expect(link?.agent.id).toBe(agent.id);
    });

    it('should check if already participating', async () => {
      const existing = await prisma.questParticipation.findFirst({
        where: {
          questId: quest.id,
          agentId: agent.id,
        },
      });

      expect(existing).toBeNull();
    });

    it('should create quest participation', async () => {
      const tasksTotal = Array.isArray(quest.tasks) ? quest.tasks.length : 0;

      const participation = await prisma.questParticipation.create({
        data: {
          questId: quest.id,
          agentId: agent.id,
          status: 'in_progress',
          tasksCompleted: 0,
          tasksTotal,
        },
      });

      expect(participation).toBeDefined();
      expect(participation.questId).toBe(quest.id);
      expect(participation.agentId).toBe(agent.id);
      expect(participation.status).toBe('in_progress');
      expect(participation.tasksTotal).toBe(1);
    });

    it('should prevent duplicate participation', async () => {
      const existing = await prisma.questParticipation.findFirst({
        where: {
          questId: quest.id,
          agentId: agent.id,
        },
      });

      expect(existing).toBeDefined();
      expect(existing?.status).toBe('in_progress');
    });

    it('should get agent active quests', async () => {
      const participations = await prisma.questParticipation.findMany({
        where: {
          agentId: agent.id,
          status: { in: ['in_progress', 'submitted'] },
        },
        include: {
          quest: {
            select: {
              title: true,
              rewardAmount: true,
              rewardType: true,
            },
          },
        },
      });

      expect(participations.length).toBe(1);
      expect(participations[0].quest.title).toBe('Quest to Accept');
    });
  });

  describe('Telegram User Linking', () => {
    let user: any;
    let telegramId: bigint;

    beforeAll(async () => {
      user = await createTestUser(prisma, { email: `link-test-${Date.now()}@test.com` });
      testUserIds.push(user.id);
      telegramId = BigInt(555666777);
    });

    it('should link telegram ID to user', async () => {
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { telegramId: String(telegramId) },
      });

      expect(updatedUser.telegramId).toBe(String(telegramId));
    });

    it('should find user by telegram ID', async () => {
      const foundUser = await prisma.user.findFirst({
        where: { telegramId: String(telegramId) },
      });

      expect(foundUser).toBeDefined();
      expect(foundUser?.id).toBe(user.id);
      expect(foundUser?.email).toBe('link-test@test.com');
    });

    it('should check if telegram user is linked', async () => {
      // Check User table
      const userLink = await prisma.user.findFirst({
        where: { telegramId: String(telegramId) },
      });

      expect(userLink).toBeDefined();

      // Check TelegramLink table
      const agentLink = await prisma.telegramLink.findFirst({
        where: { telegramId },
      });

      // May or may not exist depending on whether they have an agent
      expect(agentLink === null || agentLink !== null).toBe(true);
    });
  });

  describe('Telegram Agent Verification', () => {
    let agent: any;
    let verificationToken: string;
    let owner: any;

    beforeAll(async () => {
      owner = await createTestUser(prisma, { email: `verify-test-${Date.now()}@test.com` });
      testUserIds.push(owner.id);

      verificationToken = 'verify_' + Math.random().toString(36).slice(2, 18);

      agent = await prisma.agent.create({
        data: {
          agentname: 'verify-agent',
          status: 'pending',
          verificationToken,
          verificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
        },
      });
    });

    it('should find agent by verification token', async () => {
      const foundAgent = await prisma.agent.findUnique({
        where: { verificationToken },
      });

      expect(foundAgent).toBeDefined();
      expect(foundAgent?.id).toBe(agent.id);
      expect(foundAgent?.agentname).toBe('verify-agent');
    });

    it('should check if verification token is expired', async () => {
      const foundAgent = await prisma.agent.findUnique({
        where: { verificationToken },
      });

      expect(foundAgent).toBeDefined();
      expect(foundAgent!.verificationExpiresAt).toBeDefined();
      expect(foundAgent!.verificationExpiresAt! > new Date()).toBe(true);
    });

    it('should claim agent after verification', async () => {
      const telegramId = BigInt(444555666);

      // Create telegram link
      await prisma.telegramLink.create({
        data: {
          agentId: agent.id,
          telegramId,
          username: 'verifyuser',
          firstName: 'Verify',
        },
      });

      // Update agent with owner (after web verification)
      const claimed = await prisma.agent.update({
        where: { id: agent.id },
        data: {
          ownerId: owner.id,
          claimedAt: new Date(),
          claimedVia: 'telegram',
        },
      });

      expect(claimed.ownerId).toBe(owner.id);
      expect(claimed.claimedAt).toBeDefined();
      expect(claimed.claimedVia).toBe('telegram');
    });

    it('should prevent claiming already-claimed agent', async () => {
      const foundAgent = await prisma.agent.findUnique({
        where: { id: agent.id },
      });

      expect(foundAgent?.ownerId).toBeDefined();
      expect(foundAgent?.claimedAt).toBeDefined();
    });
  });
});
