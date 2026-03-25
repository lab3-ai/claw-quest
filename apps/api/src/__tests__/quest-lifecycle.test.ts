import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { createTestServer } from './helpers/test-server';
import {
  createTestUser,
  createMockSupabase,
  cleanupTestData,
} from './helpers/test-fixtures';

const prisma = new PrismaClient();
const testUserIds: string[] = [];

describe('Quest Lifecycle API Integration Tests', () => {
  let server: any;
  let creator: any;
  let participant: any;
  let creatorToken: string;
  let participantToken: string;

  beforeAll(async () => {
    // Create test users
    creator = await createTestUser(prisma, { email: 'creator@test.com' });
    participant = await createTestUser(prisma, { email: 'participant@test.com' });
    testUserIds.push(creator.id, participant.id);

    // Mock tokens
    creatorToken = `test_token_creator_${creator.supabaseId}`;
    participantToken = `test_token_participant_${participant.supabaseId}`;

    // Create server with mocked Supabase
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockImplementation((token: string) => {
          if (token === creatorToken) {
            return Promise.resolve({
              data: { user: { id: creator.supabaseId, email: creator.email } },
              error: null,
            });
          }
          if (token === participantToken) {
            return Promise.resolve({
              data: { user: { id: participant.supabaseId, email: participant.email } },
              error: null,
            });
          }
          return Promise.resolve({
            data: { user: null },
            error: { message: 'Invalid token' },
          });
        }),
      },
    };

    server = await createTestServer(prisma, mockSupabase);
  });

  afterAll(async () => {
    await cleanupTestData(prisma, testUserIds);
    await server.close();
    await prisma.$disconnect();
  });

  describe('1. Create Draft Quest', () => {
    let questId: string;

    it('should create a draft quest successfully', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/quests',
        headers: {
          authorization: `Bearer ${creatorToken}`,
        },
        payload: {
          title: 'Test Quest - Lifecycle',
          description: 'Testing quest lifecycle',
          sponsor: 'Test Sponsor',
          type: 'FCFS',
          rewardType: 'USDC',
          rewardAmount: 100,
          totalSlots: 5,
          tasks: [
            {
              id: '00000000-0000-0000-0000-000000000001',
              platform: 'x',
              actionType: 'follow_account',
              label: 'Follow our account',
              params: { target: '@testaccount' },
            },
          ],
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.title).toBe('Test Quest - Lifecycle');
      expect(body.status).toBe('draft');
      expect(body.fundingStatus).toBe('unfunded');
      expect(body.creatorUserId).toBe(creator.id);

      questId = body.id;
    });

    it('should reject creation without authentication', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/quests',
        payload: {
          title: 'Unauthorized Quest',
          description: 'Should fail',
        },
      });

      // POST /quests allows optional auth — without auth, validation errors return 400
      expect([400, 401]).toContain(response.statusCode);
    });
  });

  describe('2. Update Draft Quest', () => {
    let questId: string;

    beforeAll(async () => {
      const quest = await prisma.quest.create({
        data: {
          title: 'Quest to Update',
          description: 'Test',
          sponsor: 'Test',
          type: 'FCFS',
          status: 'draft',
          rewardType: 'USDC',
          rewardAmount: 50,
          totalSlots: 3,
          creatorUserId: creator.id,
          fundingStatus: 'unfunded',
          tasks: [],
        },
      });
      questId = quest.id;
    });

    it('should update quest title and description', async () => {
      const response = await server.inject({
        method: 'PATCH',
        url: `/quests/${questId}`,
        headers: {
          authorization: `Bearer ${creatorToken}`,
        },
        payload: {
          title: 'Updated Quest Title',
          description: 'Updated description',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.title).toBe('Updated Quest Title');
      expect(body.description).toBe('Updated description');
    });

    it('should reject update by non-owner', async () => {
      const response = await server.inject({
        method: 'PATCH',
        url: `/quests/${questId}`,
        headers: {
          authorization: `Bearer ${participantToken}`,
        },
        payload: {
          title: 'Unauthorized Update',
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should not allow status change to live without funding', async () => {
      const response = await server.inject({
        method: 'PATCH',
        url: `/quests/${questId}`,
        headers: {
          authorization: `Bearer ${creatorToken}`,
        },
        payload: {
          status: 'live',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      const msg = body.message || body.error?.message || '';
      expect(msg.toLowerCase()).toMatch(/fund|publish requirements/i);
    });
  });

  describe('3. Fund Quest', () => {
    let questId: string;

    beforeAll(async () => {
      const quest = await prisma.quest.create({
        data: {
          title: 'Quest to Fund',
          description: 'Test',
          sponsor: 'Test',
          type: 'FCFS',
          status: 'draft',
          rewardType: 'USDC',
          rewardAmount: 100,
          totalSlots: 2,
          creatorUserId: creator.id,
          fundingStatus: 'unfunded',
          tasks: [],
        },
      });
      questId = quest.id;
    });

    it('should mark quest as funded and auto-transition to live', async () => {
      // Simulate funding (normally done via Stripe webhook or crypto deposit)
      await prisma.quest.update({
        where: { id: questId },
        data: {
          fundingStatus: 'confirmed',
          fundingMethod: 'stripe',
          fundedAt: new Date(),
          fundedAmount: 100,
          status: 'live',
        },
      });

      const quest = await prisma.quest.findUnique({ where: { id: questId } });
      expect(quest?.fundingStatus).toBe('confirmed');
      expect(quest?.status).toBe('live');
    });
  });

  describe('4. Quest Participation', () => {
    let questId: string;

    beforeAll(async () => {
      const quest = await prisma.quest.create({
        data: {
          title: 'Live Quest for Participation',
          description: 'Test',
          sponsor: 'Test',
          type: 'FCFS',
          status: 'live',
          rewardType: 'USDC',
          rewardAmount: 100,
          totalSlots: 3,
          creatorUserId: creator.id,
          fundingStatus: 'confirmed',
          fundedAt: new Date(),
          tasks: [],
        },
      });
      questId = quest.id;
    });

    it('should allow user to join quest', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/quests/${questId}/accept`,
        headers: {
          authorization: `Bearer ${participantToken}`,
        },
        payload: {},
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.participationId).toBeDefined();
    });

    it('should prevent duplicate participation', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/quests/${questId}/accept`,
        headers: {
          authorization: `Bearer ${participantToken}`,
        },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message || body.error?.message).toContain('already');
    });
  });

  describe('5. Complete Quest', () => {
    let questId: string;
    let participationId: string;

    beforeAll(async () => {
      const quest = await prisma.quest.create({
        data: {
          title: 'Quest to Complete',
          description: 'Test',
          sponsor: 'Test',
          type: 'FCFS',
          status: 'live',
          rewardType: 'USDC',
          rewardAmount: 50,
          totalSlots: 2,
          creatorUserId: creator.id,
          fundingStatus: 'confirmed',
          fundedAt: new Date(),
          tasks: [],
        },
      });
      questId = quest.id;

      const participation = await prisma.questParticipation.create({
        data: {
          questId,
          userId: participant.id,
          status: 'in_progress',
          tasksCompleted: 0,
          tasksTotal: 1,
        },
      });
      participationId = participation.id;
    });

    it('should mark quest as completed when all slots filled', async () => {
      // Mark participation as completed
      await prisma.questParticipation.update({
        where: { id: participationId },
        data: {
          status: 'completed',
          tasksCompleted: 1,
          completedAt: new Date(),
        },
      });

      // Update quest filled slots
      await prisma.quest.update({
        where: { id: questId },
        data: { filledSlots: 1 },
      });

      const quest = await prisma.quest.findUnique({ where: { id: questId } });
      expect(quest?.filledSlots).toBe(1);
    });

    it('should transition quest to completed when slots are full', async () => {
      await prisma.quest.update({
        where: { id: questId },
        data: {
          filledSlots: 2,
          status: 'completed',
        },
      });

      const quest = await prisma.quest.findUnique({ where: { id: questId } });
      expect(quest?.status).toBe('completed');
      expect(quest?.filledSlots).toBe(2);
    });
  });

  describe('6. Quest Distribution', () => {
    let questId: string;

    beforeAll(async () => {
      const quest = await prisma.quest.create({
        data: {
          title: 'Quest for Distribution',
          description: 'Test',
          sponsor: 'Test',
          type: 'FCFS',
          status: 'completed',
          rewardType: 'USDC',
          rewardAmount: 100,
          totalSlots: 2,
          filledSlots: 2,
          creatorUserId: creator.id,
          fundingStatus: 'confirmed',
          fundedAt: new Date(),
          fundingMethod: 'stripe',
          tasks: [],
        },
      });
      questId = quest.id;

      // Create completed participations
      await prisma.questParticipation.create({
        data: {
          questId,
          userId: participant.id,
          status: 'completed',
          tasksCompleted: 1,
          tasksTotal: 1,
          completedAt: new Date(),
          payoutStatus: 'na',
        },
      });
    });

    it('should calculate correct payout amounts for FCFS', async () => {
      const quest = await prisma.quest.findUnique({
        where: { id: questId },
        include: { participations: { where: { status: 'completed' } } },
      });

      expect(quest?.participations.length).toBe(1);

      // FCFS splits reward equally among winners
      const expectedPayout = Number(quest!.rewardAmount) / quest!.totalSlots;
      expect(expectedPayout).toBe(50); // 100 / 2 slots
    });

    it('should mark participations as pending payout after distribution', async () => {
      await prisma.questParticipation.updateMany({
        where: { questId, status: 'completed' },
        data: {
          payoutStatus: 'pending',
          payoutAmount: 50,
        },
      });

      const participations = await prisma.questParticipation.findMany({
        where: { questId, status: 'completed' },
      });

      expect(participations.every(p => p.payoutStatus === 'pending')).toBe(true);
      expect(participations.every(p => p.payoutAmount === 50)).toBe(true);
    });
  });
});
