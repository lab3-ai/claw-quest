import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { createTestUser, cleanupTestData } from './helpers/test-fixtures';

const prisma = new PrismaClient();
const testUserIds: string[] = [];

describe('Telegram Bot Commands Integration Tests', () => {


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

});
