import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { createTestServer } from './helpers/test-server';
import { createTestUser, cleanupTestData } from './helpers/test-fixtures';

const prisma = new PrismaClient();
const testUserIds: string[] = [];

describe('Agent API Integration Tests', () => {
  let server: any;
  let owner: any;

  beforeAll(async () => {
    owner = await createTestUser(prisma, { email: 'agent-owner@test.com' });
    testUserIds.push(owner.id);

    const mockSupabase = {
      auth: {
        getUser: (token: string) => {
          if (token === `valid_jwt_${owner.supabaseId}`) {
            return Promise.resolve({
              data: {
                user: {
                  id: owner.supabaseId,
                  email: owner.email,
                },
              },
              error: null,
            });
          }
          return Promise.resolve({
            data: { user: null },
            error: { message: 'Invalid token' },
          });
        },
      },
    };

    server = await createTestServer(prisma, mockSupabase);
  });

  afterAll(async () => {
    await cleanupTestData(prisma, testUserIds);
    await server.close();
    await prisma.$disconnect();
  });

  describe('Agent Registration via Activation Code', () => {
    let agentId: string;
    let activationCode: string;

    it('should create an agent with activation code', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/agents',
        headers: {
          authorization: `Bearer valid_jwt_${owner.supabaseId}`,
        },
        payload: {
          agentname: 'test-agent-1',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.agentname).toBe('test-agent-1');
      expect(body.activationCode).toBeDefined();
      expect(body.activationCode).toHaveLength(6);
      expect(body.status).toBe('idle'); // Default status from schema
      expect(body.ownerId).toBe(owner.id);

      agentId = body.id;
      activationCode = body.activationCode;
    });

    it('should list user agents', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/agents',
        headers: {
          authorization: `Bearer valid_jwt_${owner.supabaseId}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
      expect(body.some((a: any) => a.agentname === 'test-agent-1')).toBe(true);
    });

    it('should get agent details', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/agents/${agentId}`,
        headers: {
          authorization: `Bearer valid_jwt_${owner.supabaseId}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe(agentId);
      expect(body.agentname).toBe('test-agent-1');
      expect(body.activationCode).toBe(activationCode);
    });

    it('should reject getting agent details without auth', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/agents/${agentId}`,
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('Agent Skills Reporting', () => {
    let agent: any;
    let agentApiKey: string;

    beforeAll(async () => {
      // Create agent directly in database with API key
      agent = await prisma.agent.create({
        data: {
          agentname: 'skills-test-agent',
          ownerId: owner.id,
          agentApiKey: `cq_skills_test_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          status: 'idle',
        },
      });

      agentApiKey = agent.agentApiKey!;
    });

    it('should report installed skills', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/agents/me/skills',
        headers: {
          authorization: `Bearer ${agentApiKey}`,
        },
        payload: {
          skills: [
            {
              name: 'sponge-wallet',
              version: '1.0.0',
              source: 'clawhub',
              publisher: 'paysponge',
            },
            {
              name: 'web-scraper',
              version: '2.1.0',
              source: 'mcp',
              publisher: 'test-publisher',
            },
            {
              name: 'custom-skill',
              source: 'custom',
            },
          ],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.synced).toBe(3);
      expect(body.skills).toHaveLength(3);
      expect(body.skills[0].name).toBe('sponge-wallet');
      expect(body.skills[0].version).toBe('1.0.0');
      expect(body.skills[0].source).toBe('clawhub');
      expect(body.skills[0].publisher).toBe('paysponge');
      expect(body.skills[0].lastSeenAt).toBeDefined();
    });

    it('should update existing skills on re-report', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/agents/me/skills',
        headers: {
          authorization: `Bearer ${agentApiKey}`,
        },
        payload: {
          skills: [
            {
              name: 'sponge-wallet',
              version: '1.1.0', // updated version
              source: 'clawhub',
              publisher: 'paysponge',
            },
          ],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.synced).toBe(1);
      expect(body.skills[0].name).toBe('sponge-wallet');
      expect(body.skills[0].version).toBe('1.1.0'); // version updated
    });

    it('should reject skills reporting without authentication', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/agents/me/skills',
        payload: {
          skills: [
            {
              name: 'test-skill',
              source: 'clawhub',
            },
          ],
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject empty skills array', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/agents/me/skills',
        headers: {
          authorization: `Bearer ${agentApiKey}`,
        },
        payload: {
          skills: [],
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject skills with invalid source', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/agents/me/skills',
        headers: {
          authorization: `Bearer ${agentApiKey}`,
        },
        payload: {
          skills: [
            {
              name: 'test-skill',
              source: 'invalid-source',
            },
          ],
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Agent Quest Participation', () => {
    let agent: any;
    let agentApiKey: string;
    let questId: string;

    beforeAll(async () => {
      // Create agent directly in database with API key
      agent = await prisma.agent.create({
        data: {
          agentname: 'quest-test-agent',
          ownerId: owner.id,
          agentApiKey: `cq_quest_test_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          status: 'idle',
        },
      });

      agentApiKey = agent.agentApiKey!;

      // Create a live quest
      const quest = await prisma.quest.create({
        data: {
          title: 'Test Quest for Agent',
          description: 'Test quest',
          sponsor: 'Test Sponsor',
          type: 'FCFS',
          status: 'live',
          rewardType: 'USDC',
          rewardAmount: 100,
          totalSlots: 5,
          fundingStatus: 'confirmed',
          fundedAt: new Date(),
          creatorUserId: owner.id,
          tasks: [],
        },
      });
      questId = quest.id;
    });

    it('should show active quests when agent participates', async () => {
      // Create a participation for the agent
      await prisma.questParticipation.create({
        data: {
          questId,
          agentId: agent.id,
          status: 'in_progress',
          tasksCompleted: 0,
          tasksTotal: 1,
        },
      });

      const response = await server.inject({
        method: 'GET',
        url: '/agents/me',
        headers: {
          authorization: `Bearer ${agentApiKey}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.activeQuests).toHaveLength(1);
      expect(body.activeQuests[0].questTitle).toBe('Test Quest for Agent');
      expect(body.activeQuests[0].status).toBe('in_progress');
      expect(body.activeQuests[0].tasksCompleted).toBe(0);
      expect(body.activeQuests[0].tasksTotal).toBe(1);
    });

    it('should show completed quests count', async () => {
      // Mark the participation as completed
      await prisma.questParticipation.updateMany({
        where: { agentId: agent.id },
        data: {
          status: 'completed',
          tasksCompleted: 1,
          completedAt: new Date(),
        },
      });

      const response = await server.inject({
        method: 'GET',
        url: '/agents/me',
        headers: {
          authorization: `Bearer ${agentApiKey}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.activeQuests).toHaveLength(0); // no longer in_progress
      expect(body.completedQuestsCount).toBe(1);
    });
  });
});
