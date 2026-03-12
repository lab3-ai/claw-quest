import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { ZodTypeProvider, serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { githubBountyRoutes } from '../github-bounty.routes';
import * as service from '../github-bounty.service';
import * as restClient from '../github-rest-client';

// Mock the service and rest client modules
vi.mock('../github-bounty.service');
vi.mock('../github-rest-client');

describe('github-bounty.routes', () => {
  let app: FastifyInstance;
  const mockUser = { id: 'user-123', username: 'testuser' };
  const bountyId = '123e4567-e89b-12d3-a456-426614174000';
  const submissionId = '223e4567-e89b-12d3-a456-426614174001';

  beforeEach(async () => {
    vi.clearAllMocks();

    app = Fastify({ logger: false }).withTypeProvider<ZodTypeProvider>();

    // Set up Zod validation
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    // Mock Prisma client
    app.decorate('prisma', {
      gitHubBounty: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      gitHubBountySubmission: {
        findMany: vi.fn(),
      },
    });

    // Mock authenticate decorator
    app.decorate('authenticate', async (request: any) => {
      request.user = mockUser;
    });

    await app.register(githubBountyRoutes, { prefix: '/github-bounties' });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  // ── POST /analyze-repo ──
  describe('POST /analyze-repo', () => {
    it('returns LLM-suggested bounties for valid repo', async () => {
      vi.mocked(service.analyzeRepo).mockResolvedValueOnce({
        suggestions: [
          {
            title: 'Fix bug in parser',
            description: 'Fix the parsing issue in the main module',
            difficulty: 'medium',
            suggestedReward: 200,
            rewardType: 'USDC',
          },
        ],
      });

      const response = await app.inject({
        method: 'POST',
        url: '/github-bounties/analyze-repo',
        payload: { repoUrl: 'https://github.com/owner/repo' },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.suggestions).toBeDefined();
      expect(body.suggestions).toHaveLength(1);
    });

    it('rejects invalid repo URL', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/github-bounties/analyze-repo',
        payload: { repoUrl: 'not-a-github-url' },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ── GET /list-repos ──
  describe('GET /list-repos', () => {
    it('returns list of repos for valid owner', async () => {
      vi.mocked(restClient.listRepos).mockResolvedValueOnce([
        {
          full_name: 'owner/repo1',
          name: 'repo1',
          description: 'Test repo',
          stargazers_count: 100,
          language: 'TypeScript',
          html_url: 'https://github.com/owner/repo1',
          open_issues_count: 5,
        },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/github-bounties/list-repos?owner=owner',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.repos).toHaveLength(1);
      expect(body.repos[0].name).toBe('repo1');
    });

    it('returns 404 when org/user not found', async () => {
      vi.mocked(restClient.listRepos).mockRejectedValueOnce(new Error('GitHub org/user not found: missing'));

      const response = await app.inject({
        method: 'GET',
        url: '/github-bounties/list-repos?owner=missing',
      });

      expect(response.statusCode).toBe(404);
      const body = response.json();
      expect(body.error.code).toBe('ORG_NOT_FOUND');
    });
  });

  // ── GET / ──
  describe('GET /', () => {
    it('returns paginated list of live bounties', async () => {
      vi.mocked(service.listBounties).mockResolvedValueOnce({
        bounties: [
          { id: 'b1', title: 'Bounty 1', status: 'live' },
          { id: 'b2', title: 'Bounty 2', status: 'live' },
        ],
        total: 10,
        page: 1,
        limit: 20,
      } as any);

      const response = await app.inject({
        method: 'GET',
        url: '/github-bounties',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.bounties).toHaveLength(2);
      expect(body.total).toBe(10);
    });

    it('accepts query filters', async () => {
      vi.mocked(service.listBounties).mockResolvedValueOnce({
        bounties: [],
        total: 0,
        page: 1,
        limit: 10,
      } as any);

      await app.inject({
        method: 'GET',
        url: '/github-bounties?rewardType=LLM_KEY&page=1&limit=10',
      });

      expect(service.listBounties).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ rewardType: 'LLM_KEY', page: 1, limit: 10 })
      );
    });
  });

  // ── GET /mine ──
  describe('GET /mine', () => {
    it('returns bounties created by current user', async () => {
      vi.mocked(service.listMyBounties).mockResolvedValueOnce([
        { id: 'b1', creatorUserId: 'user-123', title: 'My Bounty' },
      ] as any);

      const response = await app.inject({
        method: 'GET',
        url: '/github-bounties/mine',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveLength(1);
      expect(service.listMyBounties).toHaveBeenCalledWith(expect.anything(), 'user-123');
    });
  });

  // ── POST / ──
  describe('POST /', () => {
    it('creates a new bounty', async () => {
      vi.mocked(service.createBounty).mockResolvedValueOnce({
        id: bountyId,
        title: 'New Bounty',
        status: 'draft',
      } as any);

      const response = await app.inject({
        method: 'POST',
        url: '/github-bounties',
        payload: {
          repoOwner: 'owner',
          repoName: 'repo',
          title: 'Fix critical bug in authentication',
          description: 'There is a critical security bug in the auth module that needs immediate attention',
          rewardAmount: 500,
          rewardType: 'USDC',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.id).toBe(bountyId);
    });

    it('validates required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/github-bounties',
        payload: {
          repoOwner: 'owner',
          title: 'Too short', // Title too short (min 10 chars)
          description: 'Short', // Description too short (min 20 chars)
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ── POST /bulk ──
  describe('POST /bulk', () => {
    it('bulk creates multiple bounties', async () => {
      vi.mocked(service.createBounties).mockResolvedValueOnce([
        { id: 'b1', title: 'Bounty 1' },
        { id: 'b2', title: 'Bounty 2' },
      ] as any);

      const response = await app.inject({
        method: 'POST',
        url: '/github-bounties/bulk',
        payload: {
          bounties: [
            {
              repoOwner: 'owner',
              repoName: 'repo',
              title: 'First bounty for testing',
              description: 'Description for the first bounty in bulk creation',
              rewardAmount: 100,
              rewardType: 'USD',
            },
            {
              repoOwner: 'owner',
              repoName: 'repo',
              title: 'Second bounty for testing',
              description: 'Description for the second bounty in bulk creation',
              rewardAmount: 200,
              rewardType: 'USDC',
            },
          ],
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.bounties).toHaveLength(2);
    });
  });

  // ── GET /:id ──
  describe('GET /:id', () => {
    it('returns bounty by ID', async () => {
      app.prisma.gitHubBounty.findUnique = vi.fn().mockResolvedValueOnce({
        id: bountyId,
        title: 'Test Bounty',
        _count: { submissions: 3 },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/github-bounties/${bountyId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.id).toBe(bountyId);
    });

    it('returns 404 when bounty not found', async () => {
      app.prisma.gitHubBounty.findUnique = vi.fn().mockResolvedValueOnce(null);

      const response = await app.inject({
        method: 'GET',
        url: `/github-bounties/${bountyId}`,
      });

      expect(response.statusCode).toBe(404);
      const body = response.json();
      expect(body.error.code).toBe('NOT_FOUND');
    });
  });

  // ── PATCH /:id ──
  describe('PATCH /:id', () => {
    it('updates a draft bounty', async () => {
      app.prisma.gitHubBounty.findUnique = vi.fn().mockResolvedValueOnce({
        id: bountyId,
        creatorUserId: 'user-123',
        status: 'draft',
      });
      app.prisma.gitHubBounty.update = vi.fn().mockResolvedValueOnce({
        id: bountyId,
        title: 'Updated Bounty',
      });

      const response = await app.inject({
        method: 'PATCH',
        url: `/github-bounties/${bountyId}`,
        payload: {
          title: 'Updated title for the bounty',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.title).toBe('Updated Bounty');
    });

    it('returns 403 when user is not creator', async () => {
      app.prisma.gitHubBounty.findUnique = vi.fn().mockResolvedValueOnce({
        id: bountyId,
        creatorUserId: 'other-user',
        status: 'draft',
      });

      const response = await app.inject({
        method: 'PATCH',
        url: `/github-bounties/${bountyId}`,
        payload: { title: 'Unauthorized update' },
      });

      expect(response.statusCode).toBe(403);
    });

    it('returns 400 when bounty is not draft', async () => {
      app.prisma.gitHubBounty.findUnique = vi.fn().mockResolvedValueOnce({
        id: bountyId,
        creatorUserId: 'user-123',
        status: 'live',
      });

      const response = await app.inject({
        method: 'PATCH',
        url: `/github-bounties/${bountyId}`,
        payload: { title: 'Cannot update live bounty' },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error.code).toBe('NOT_DRAFT');
    });
  });

  // ── DELETE /:id ──
  describe('DELETE /:id', () => {
    it('cancels a bounty', async () => {
      app.prisma.gitHubBounty.findUnique = vi.fn().mockResolvedValueOnce({
        id: bountyId,
        creatorUserId: 'user-123',
        status: 'live',
      });
      app.prisma.gitHubBounty.update = vi.fn().mockResolvedValueOnce({
        id: bountyId,
        status: 'cancelled',
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/github-bounties/${bountyId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.ok).toBe(true);
    });

    it('returns 400 when bounty is already completed', async () => {
      app.prisma.gitHubBounty.findUnique = vi.fn().mockResolvedValueOnce({
        id: bountyId,
        creatorUserId: 'user-123',
        status: 'completed',
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/github-bounties/${bountyId}`,
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error.code).toBe('ALREADY_COMPLETED');
    });
  });

  // ── POST /:id/submit ──
  describe('POST /:id/submit', () => {
    it('submits a PR to a bounty', async () => {
      vi.mocked(service.submitPr).mockResolvedValueOnce({
        submission: {
          id: submissionId,
          bountyId: bountyId,
          prUrl: 'https://github.com/owner/repo/pull/123',
          status: 'pending',
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: `/github-bounties/${bountyId}/submit`,
        payload: {
          prUrl: 'https://github.com/owner/repo/pull/123',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.id).toBe(submissionId);
    });

    it('returns 400 on submission error', async () => {
      vi.mocked(service.submitPr).mockResolvedValueOnce({
        error: 'PR must be from owner/repo',
      });

      const response = await app.inject({
        method: 'POST',
        url: `/github-bounties/${bountyId}/submit`,
        payload: {
          prUrl: 'https://github.com/wrong/repo/pull/123',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error.code).toBe('SUBMISSION_ERROR');
    });
  });

  // ── GET /my-submissions ──
  describe('GET /my-submissions', () => {
    it('returns current user submissions', async () => {
      app.prisma.gitHubBountySubmission.findMany = vi.fn().mockResolvedValueOnce([
        {
          id: submissionId,
          userId: 'user-123',
          prUrl: 'https://github.com/owner/repo/pull/123',
          bounty: { id: 'b1', title: 'Test Bounty' },
        },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/github-bounties/my-submissions',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveLength(1);
      expect(body[0].userId).toBe('user-123');
    });
  });

  // ── GET /:id/submissions ──
  describe('GET /:id/submissions', () => {
    it('returns submissions for a bounty', async () => {
      app.prisma.gitHubBounty.findUnique = vi.fn().mockResolvedValueOnce({ id: bountyId });
      app.prisma.gitHubBountySubmission.findMany = vi.fn().mockResolvedValueOnce([
        {
          id: submissionId,
          bountyId: bountyId,
          user: { id: 'u1', username: 'user1' },
        },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: `/github-bounties/${bountyId}/submissions`,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveLength(1);
    });
  });

  // ── PATCH /:id/submissions/:subId ──
  describe('PATCH /:id/submissions/:subId', () => {
    it('approves a submission', async () => {
      vi.mocked(service.updateSubmissionStatus).mockResolvedValueOnce({
        submission: {
          id: submissionId,
          status: 'approved',
        },
      });

      const response = await app.inject({
        method: 'PATCH',
        url: `/github-bounties/${bountyId}/submissions/${submissionId}`,
        payload: {
          action: 'approve',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.id).toBe(submissionId);
      expect(body.status).toBe('approved');
    });

    it('rejects a submission', async () => {
      vi.mocked(service.updateSubmissionStatus).mockResolvedValueOnce({
        submission: {
          id: submissionId,
          status: 'rejected',
        },
      });

      const response = await app.inject({
        method: 'PATCH',
        url: `/github-bounties/${bountyId}/submissions/${submissionId}`,
        payload: {
          action: 'reject',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.status).toBe('rejected');
    });

    it('returns 400 on action error', async () => {
      vi.mocked(service.updateSubmissionStatus).mockResolvedValueOnce({
        error: 'Max winners already reached',
      });

      const response = await app.inject({
        method: 'PATCH',
        url: `/github-bounties/${bountyId}/submissions/${submissionId}`,
        payload: {
          action: 'approve',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error.code).toBe('ACTION_ERROR');
    });
  });
});
