import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { createTestServer } from './helpers/test-server';
import {
  createTestUser,
  createTestAgent,
  cleanupTestData,
} from './helpers/test-fixtures';

const prisma = new PrismaClient();
const testUserIds: string[] = [];

describe('Auth API Integration Tests', () => {
  let server: any;

  beforeAll(async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockImplementation((token: string) => {
          // Valid JWT token format
          if (token.startsWith('valid_jwt_')) {
            const userId = token.replace('valid_jwt_', '');
            return Promise.resolve({
              data: {
                user: {
                  id: userId,
                  email: `user-${userId}@test.com`,
                  user_metadata: { full_name: 'Test User' },
                },
              },
              error: null,
            });
          }
          // Invalid token
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

  describe('JWT Validation', () => {
    it('should accept valid Supabase JWT token', async () => {
      const supabaseId = `sb_${Date.now()}`;
      const token = `valid_jwt_${supabaseId}`;

      const response = await server.inject({
        method: 'GET',
        url: '/auth/me',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.email).toBe(`user-${supabaseId}@test.com`);
      expect(body.supabaseId).toBe(supabaseId);

      // Clean up created user
      const user = await prisma.user.findUnique({
        where: { supabaseId },
      });
      if (user) {
        testUserIds.push(user.id);
      }
    });

    it('should reject invalid JWT token', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/auth/me',
        headers: {
          authorization: 'Bearer invalid_token_12345',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('Invalid');
    });

    it('should reject missing authorization header', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/auth/me',
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('Missing');
    });

    it('should reject malformed authorization header', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/auth/me',
        headers: {
          authorization: 'InvalidFormat token123',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('Agent API Key Authentication', () => {
    let testUser: any;
    let testAgent: any;

    beforeAll(async () => {
      testUser = await createTestUser(prisma, { email: 'agent-owner@test.com' });
      testAgent = await createTestAgent(prisma, testUser.id, { agentname: 'test-agent' });
      testUserIds.push(testUser.id);
    });

    it('should authenticate with valid agent API key', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/auth/me',
        headers: {
          authorization: `Bearer ${testAgent.agentApiKey}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe(testUser.id);
      expect(body.email).toBe('agent-owner@test.com');
    });

    it('should reject invalid agent API key', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/auth/me',
        headers: {
          authorization: 'Bearer agent_key_invalid_12345',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('Invalid');
    });

    it('should reject agent API key with no owner', async () => {
      // Create an agent without owner
      const orphanAgent = await prisma.agent.create({
        data: {
          agentname: 'orphan-agent',
          agentApiKey: 'agent_key_orphan_12345',
          status: 'idle',
        },
      });

      const response = await server.inject({
        method: 'GET',
        url: '/auth/me',
        headers: {
          authorization: 'Bearer agent_key_orphan_12345',
        },
      });

      expect(response.statusCode).toBe(401);

      // Clean up
      await prisma.agent.delete({ where: { id: orphanAgent.id } });
    });
  });

  describe('Telegram OIDC Authentication', () => {
    it('should reject Telegram login with missing code', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/telegram',
        payload: {
          codeVerifier: 'test-verifier',
          redirectUri: 'http://localhost:5173/auth/telegram/callback',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject Telegram login with missing codeVerifier', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/telegram',
        payload: {
          code: 'test-code',
          redirectUri: 'http://localhost:5173/auth/telegram/callback',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject Telegram login with invalid redirect URI', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/telegram',
        payload: {
          code: 'test-code',
          codeVerifier: 'test-verifier',
          redirectUri: 'https://malicious-site.com/callback',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should accept valid redirect URIs', async () => {
      const validUris = [
        'http://localhost:5173/callback',
        'http://127.0.0.1:5173/callback',
        'https://clawquest.ai/callback',
        'https://www.clawquest.ai/callback',
      ];

      for (const uri of validUris) {
        const response = await server.inject({
          method: 'POST',
          url: '/auth/telegram',
          payload: {
            code: 'test-code',
            codeVerifier: 'test-verifier',
            redirectUri: uri,
          },
        });

        // Will fail due to invalid code, but should pass URI validation
        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.error?.message).not.toContain('Invalid redirect URI');
      }
    });
  });

  describe('User Profile Updates', () => {
    let testUser: any;
    let userToken: string;

    beforeAll(async () => {
      const supabaseId = `sb_profile_${Date.now()}`;
      testUser = await createTestUser(prisma, {
        email: 'profile-test@test.com',
        supabaseId,
      });
      testUserIds.push(testUser.id);
      userToken = `valid_jwt_${supabaseId}`;
    });

    it('should update user display name', async () => {
      const response = await server.inject({
        method: 'PATCH',
        url: '/auth/me',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          displayName: 'Updated Display Name',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.displayName).toBe('Updated Display Name');
    });

    it('should update username with valid format', async () => {
      const response = await server.inject({
        method: 'PATCH',
        url: '/auth/me',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          username: 'validuser123',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.username).toBe('validuser123');
    });

    it('should reject invalid username format', async () => {
      const invalidUsernames = [
        'ab', // too short
        'UPPERCASE', // uppercase not allowed
        'user@name', // invalid characters
        'user name', // spaces not allowed
        '-username', // cannot start with hyphen
        'username-', // cannot end with hyphen
      ];

      for (const username of invalidUsernames) {
        const response = await server.inject({
          method: 'PATCH',
          url: '/auth/me',
          headers: {
            authorization: `Bearer ${userToken}`,
          },
          payload: { username },
        });

        expect(response.statusCode).toBe(400);
      }
    });

    it('should reject duplicate username', async () => {
      const anotherUser = await createTestUser(prisma, {
        email: 'another@test.com',
      });
      testUserIds.push(anotherUser.id);

      await prisma.user.update({
        where: { id: anotherUser.id },
        data: { username: 'taken-username' },
      });

      const response = await server.inject({
        method: 'PATCH',
        url: '/auth/me',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          username: 'taken-username',
        },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      expect(body.error?.code).toBe('USERNAME_TAKEN');
    });

    it('should reject empty update', async () => {
      const response = await server.inject({
        method: 'PATCH',
        url: '/auth/me',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error?.code).toBe('EMPTY_UPDATE');
    });
  });

  describe('Social Identity Sync', () => {
    let testUser: any;
    let userToken: string;

    beforeAll(async () => {
      const supabaseId = `sb_social_${Date.now()}`;
      testUser = await createTestUser(prisma, {
        email: 'social-test@test.com',
        supabaseId,
      });
      testUserIds.push(testUser.id);
      userToken = `valid_jwt_${supabaseId}`;
    });

    it('should accept Google/GitHub sync without further action', async () => {
      const providers = ['google', 'github'];

      for (const provider of providers) {
        const response = await server.inject({
          method: 'POST',
          url: '/auth/social/sync',
          headers: {
            authorization: `Bearer ${userToken}`,
          },
          payload: { provider },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.ok).toBe(true);
      }
    });

    it('should require authentication for social sync', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/social/sync',
        payload: {
          provider: 'x',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
