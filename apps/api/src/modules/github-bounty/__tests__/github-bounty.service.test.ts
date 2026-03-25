import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  analyzeRepo,
  createBounty,
  createBounties,
  listBounties,
  listMyBounties,
  submitPr,
  updateSubmissionStatus,
} from '../github-bounty.service';

const mockPrisma = {
  gitHubBounty: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  gitHubBountySubmission: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
  $transaction: vi.fn((ops) => Promise.all(Array.isArray(ops) ? ops : [ops])),
} as any;

// Mock github-rest-client functions
vi.mock('../github-rest-client', () => ({
  getRepo: vi.fn(),
  getRepoIssues: vi.fn(),
  getReadme: vi.fn(),
  getContributing: vi.fn(),
  getPullRequest: vi.fn(),
  parseGithubPrUrl: vi.fn(),
  GitHubAccessDenied: class GitHubAccessDenied extends Error {},
}));

describe('github-bounty.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GITHUB_TOKEN = 'test-token';
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── analyzeRepo ──
  describe('analyzeRepo', () => {
    it('analyzes repo and returns LLM suggestions', async () => {
      const { getRepo, getRepoIssues, getReadme, getContributing } = await import('../github-rest-client');

      vi.mocked(getRepo).mockResolvedValueOnce({
        id: 1,
        full_name: 'owner/repo',
        description: 'Test repo',
        stargazers_count: 100,
        language: 'TypeScript',
        topics: ['testing'],
        open_issues_count: 5,
        private: false,
      });
      vi.mocked(getRepoIssues).mockResolvedValueOnce([
        { number: 1, title: 'Bug fix', labels: [{ name: 'bug' }], body: null, reactions: { total_count: 5 } },
      ]);
      vi.mocked(getReadme).mockResolvedValueOnce('# Test README');
      vi.mocked(getContributing).mockResolvedValueOnce('# Contributing guide');

      // Mock LLM call
      process.env.ANTHROPIC_API_KEY = 'test-key';
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: '{"bounties":[{"title":"Fix bug","description":"Fix the reported bug","difficulty":"medium","suggestedReward":200,"rewardType":"USDC"}]}' }],
        }),
      });

      const result = await analyzeRepo('https://github.com/owner/repo');
      expect(result.suggestions).toBeDefined();
    });

    it('throws error for invalid repo URL', async () => {
      await expect(analyzeRepo('https://gitlab.com/invalid')).rejects.toThrow('Invalid GitHub repo URL');
    });

    it('handles repo URL with .git suffix', async () => {
      const { getRepo, getRepoIssues, getReadme, getContributing } = await import('../github-rest-client');

      vi.mocked(getRepo).mockResolvedValueOnce({
        id: 1, full_name: 'owner/repo', description: null, stargazers_count: 0,
        language: null, topics: [], open_issues_count: 0, private: false,
      });
      vi.mocked(getRepoIssues).mockResolvedValueOnce([]);
      vi.mocked(getReadme).mockResolvedValueOnce(null);
      vi.mocked(getContributing).mockResolvedValueOnce(null);

      process.env.LLM_SERVER_URL = 'http://llm-server';
      process.env.LLM_SERVER_SECRET_KEY = 'secret';
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: '{"bounties":[]}' } }] }),
      });

      await analyzeRepo('https://github.com/owner/repo.git');
      expect(getRepo).toHaveBeenCalledWith('owner', 'repo', 'test-token');
    });
  });

  // ── createBounty ──
  describe('createBounty', () => {
    it('creates LLM_KEY bounty with live status', async () => {
      mockPrisma.gitHubBounty.create.mockResolvedValueOnce({
        id: 'bounty-1',
        rewardType: 'LLM_KEY',
        status: 'live',
        fundingStatus: 'confirmed',
      });

      const bounty = await createBounty(mockPrisma, 'user-1', {
        repoOwner: 'owner',
        repoName: 'repo',
        title: 'Test bounty for LLM key',
        description: 'Complete this task for an LLM key reward',
        rewardAmount: 0,
        rewardType: 'LLM_KEY',
      });

      expect(bounty.status).toBe('live');
      expect(bounty.fundingStatus).toBe('confirmed');
      expect(mockPrisma.gitHubBounty.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'live',
            fundingStatus: 'confirmed',
            llmKeyTokenLimit: 1_000_000,
          }),
        })
      );
    });

    it('creates USDC bounty with draft status', async () => {
      mockPrisma.gitHubBounty.create.mockResolvedValueOnce({
        id: 'bounty-2',
        rewardType: 'USDC',
        status: 'draft',
        fundingStatus: 'unfunded',
      });

      const bounty = await createBounty(mockPrisma, 'user-1', {
        repoOwner: 'owner',
        repoName: 'repo',
        title: 'Test bounty for USDC',
        description: 'Complete this task for USDC reward',
        rewardAmount: 500,
        rewardType: 'USDC',
      });

      expect(bounty.status).toBe('draft');
      expect(bounty.fundingStatus).toBe('unfunded');
    });

    it('sets custom llmKeyTokenLimit when provided', async () => {
      mockPrisma.gitHubBounty.create.mockResolvedValueOnce({ id: 'bounty-3' });

      await createBounty(mockPrisma, 'user-1', {
        repoOwner: 'owner',
        repoName: 'repo',
        title: 'Test bounty',
        description: 'Test description for the bounty',
        rewardAmount: 0,
        rewardType: 'LLM_KEY',
        llmKeyTokenLimit: 500_000,
      });

      expect(mockPrisma.gitHubBounty.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ llmKeyTokenLimit: 500_000 }),
        })
      );
    });
  });

  // ── createBounties ──
  describe('createBounties', () => {
    it('bulk creates multiple bounties', async () => {
      mockPrisma.gitHubBounty.create.mockResolvedValue({ id: 'bounty' });

      const bounties = await createBounties(mockPrisma, 'user-1', [
        {
          repoOwner: 'owner', repoName: 'repo', title: 'Bounty 1',
          description: 'First bounty description', rewardAmount: 100, rewardType: 'USDC',
        },
        {
          repoOwner: 'owner', repoName: 'repo', title: 'Bounty 2',
          description: 'Second bounty description', rewardAmount: 200, rewardType: 'USD',
        },
      ]);

      expect(bounties).toHaveLength(2);
      expect(mockPrisma.gitHubBounty.create).toHaveBeenCalledTimes(2);
    });
  });

  // ── listBounties ──
  describe('listBounties', () => {
    it('returns paginated live bounties', async () => {
      mockPrisma.gitHubBounty.findMany.mockResolvedValueOnce([
        { id: 'b1', title: 'Bounty 1', status: 'live' },
        { id: 'b2', title: 'Bounty 2', status: 'live' },
      ]);
      mockPrisma.gitHubBounty.count.mockResolvedValueOnce(10);

      const result = await listBounties(mockPrisma, { page: 1, limit: 2 });

      expect(result.bounties).toHaveLength(2);
      expect(result.total).toBe(10);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
    });

    it('filters by rewardType', async () => {
      mockPrisma.gitHubBounty.findMany.mockResolvedValueOnce([]);
      mockPrisma.gitHubBounty.count.mockResolvedValueOnce(0);

      await listBounties(mockPrisma, { rewardType: 'LLM_KEY' });

      expect(mockPrisma.gitHubBounty.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ rewardType: 'LLM_KEY' }),
        })
      );
    });

    it('filters by repoOwner and repoName', async () => {
      mockPrisma.gitHubBounty.findMany.mockResolvedValueOnce([]);
      mockPrisma.gitHubBounty.count.mockResolvedValueOnce(0);

      await listBounties(mockPrisma, { repoOwner: 'test', repoName: 'repo' });

      expect(mockPrisma.gitHubBounty.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ repoOwner: 'test', repoName: 'repo' }),
        })
      );
    });
  });

  // ── listMyBounties ──
  describe('listMyBounties', () => {
    it('returns all bounties created by user', async () => {
      mockPrisma.gitHubBounty.findMany.mockResolvedValueOnce([
        { id: 'b1', creatorUserId: 'user-1', status: 'live' },
        { id: 'b2', creatorUserId: 'user-1', status: 'draft' },
      ]);

      const bounties = await listMyBounties(mockPrisma, 'user-1');

      expect(bounties).toHaveLength(2);
      expect(mockPrisma.gitHubBounty.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { creatorUserId: 'user-1' },
        })
      );
    });
  });

  // ── submitPr ──
  describe('submitPr', () => {
    beforeEach(() => {
      mockPrisma.gitHubBounty.findUnique.mockResolvedValue({
        id: 'bounty-1',
        repoOwner: 'owner',
        repoName: 'repo',
        status: 'live',
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        githubHandle: 'testuser',
      });
    });

    it('creates submission for valid PR', async () => {
      const { parseGithubPrUrl, getPullRequest } = await import('../github-rest-client');

      vi.mocked(parseGithubPrUrl).mockReturnValueOnce({ owner: 'owner', repo: 'repo', prNumber: 123 });
      vi.mocked(getPullRequest).mockResolvedValueOnce({
        number: 123,
        title: 'Fix bug',
        state: 'open',
        user: { login: 'testuser' },
        html_url: 'https://github.com/owner/repo/pull/123',
        merged_at: null,
        created_at: '2025-01-01T00:00:00Z',
      });
      mockPrisma.gitHubBountySubmission.findFirst.mockResolvedValueOnce(null);
      mockPrisma.gitHubBountySubmission.create.mockResolvedValueOnce({
        id: 'sub-1',
        bountyId: 'bounty-1',
        userId: 'user-1',
        prUrl: 'https://github.com/owner/repo/pull/123',
        status: 'pending',
      });

      const result = await submitPr(mockPrisma, 'bounty-1', 'user-1', 'https://github.com/owner/repo/pull/123');

      expect(result).toHaveProperty('submission');
      expect(mockPrisma.gitHubBountySubmission.create).toHaveBeenCalled();
    });

    it('rejects invalid PR URL', async () => {
      const { parseGithubPrUrl } = await import('../github-rest-client');
      vi.mocked(parseGithubPrUrl).mockReturnValueOnce(null);

      const result = await submitPr(mockPrisma, 'bounty-1', 'user-1', 'invalid-url');

      expect(result).toEqual({ error: 'Invalid GitHub PR URL' });
    });

    it('rejects PR from wrong repo', async () => {
      const { parseGithubPrUrl } = await import('../github-rest-client');
      vi.mocked(parseGithubPrUrl).mockReturnValueOnce({ owner: 'different', repo: 'repo', prNumber: 123 });

      const result = await submitPr(mockPrisma, 'bounty-1', 'user-1', 'https://github.com/different/repo/pull/123');

      expect(result).toHaveProperty('error');
      expect(result.error).toContain('PR must be from');
    });

    it('rejects when bounty not found', async () => {
      mockPrisma.gitHubBounty.findUnique.mockResolvedValueOnce(null);
      const { parseGithubPrUrl } = await import('../github-rest-client');
      vi.mocked(parseGithubPrUrl).mockReturnValueOnce({ owner: 'owner', repo: 'repo', prNumber: 123 });

      const result = await submitPr(mockPrisma, 'missing', 'user-1', 'https://github.com/owner/repo/pull/123');

      expect(result).toEqual({ error: 'Bounty not found' });
    });

    it('rejects when bounty not live', async () => {
      mockPrisma.gitHubBounty.findUnique.mockResolvedValueOnce({ status: 'draft', repoOwner: 'owner', repoName: 'repo' });
      const { parseGithubPrUrl } = await import('../github-rest-client');
      vi.mocked(parseGithubPrUrl).mockReturnValueOnce({ owner: 'owner', repo: 'repo', prNumber: 123 });

      const result = await submitPr(mockPrisma, 'bounty-1', 'user-1', 'https://github.com/owner/repo/pull/123');

      expect(result).toEqual({ error: 'Bounty is not accepting submissions' });
    });

    it('rejects when GitHub account not linked', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'user-1', githubHandle: null });
      const { parseGithubPrUrl } = await import('../github-rest-client');
      vi.mocked(parseGithubPrUrl).mockReturnValueOnce({ owner: 'owner', repo: 'repo', prNumber: 123 });

      const result = await submitPr(mockPrisma, 'bounty-1', 'user-1', 'https://github.com/owner/repo/pull/123');

      expect(result).toEqual({ error: 'GitHub account not linked — log in with GitHub first' });
    });

    it('rejects duplicate submission', async () => {
      const { parseGithubPrUrl, getPullRequest } = await import('../github-rest-client');
      vi.mocked(parseGithubPrUrl).mockReturnValueOnce({ owner: 'owner', repo: 'repo', prNumber: 123 });
      vi.mocked(getPullRequest).mockResolvedValueOnce({
        number: 123, title: 'Fix', state: 'open', user: { login: 'testuser' },
        html_url: 'url', merged_at: null, created_at: '2025-01-01T00:00:00Z',
      });
      mockPrisma.gitHubBountySubmission.findFirst.mockResolvedValueOnce({ id: 'existing' });

      const result = await submitPr(mockPrisma, 'bounty-1', 'user-1', 'https://github.com/owner/repo/pull/123');

      expect(result).toEqual({ error: 'You have already submitted a PR for this bounty' });
    });
  });

  // ── updateSubmissionStatus ──
  describe('updateSubmissionStatus', () => {
    beforeEach(() => {
      mockPrisma.gitHubBounty.findUnique.mockResolvedValue({
        id: 'bounty-1',
        creatorUserId: 'creator-1',
        status: 'live',
        maxWinners: 1,
        rewardType: 'USDC',
        _count: { submissions: 0 },
      });
    });

    it('approves submission and marks bounty complete when max winners reached', async () => {
      mockPrisma.gitHubBountySubmission.update.mockResolvedValueOnce({ id: 'sub-1', status: 'approved' });
      mockPrisma.gitHubBounty.update.mockResolvedValueOnce({ id: 'bounty-1', status: 'completed' });
      mockPrisma.$transaction.mockImplementation(async (ops) => {
        const results = [];
        for (const op of ops) {
          results.push(await op);
        }
        return results;
      });

      const result = await updateSubmissionStatus(mockPrisma, 'bounty-1', 'sub-1', 'creator-1', 'approve');

      expect(result).toHaveProperty('submission');
      expect(mockPrisma.gitHubBountySubmission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sub-1' },
          data: expect.objectContaining({ status: 'approved' }),
        })
      );
    });

    it('rejects submission without closing bounty', async () => {
      mockPrisma.gitHubBountySubmission.update.mockResolvedValueOnce({ id: 'sub-1', status: 'rejected' });

      const result = await updateSubmissionStatus(mockPrisma, 'bounty-1', 'sub-1', 'creator-1', 'reject');

      expect(result.submission).toBeDefined();
      expect(mockPrisma.gitHubBountySubmission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'rejected' },
        })
      );
    });

    it('returns error when bounty not found', async () => {
      mockPrisma.gitHubBounty.findUnique.mockResolvedValueOnce(null);

      const result = await updateSubmissionStatus(mockPrisma, 'missing', 'sub-1', 'creator-1', 'approve');

      expect(result).toEqual({ error: 'Bounty not found' });
    });

    it('returns error when user is not creator', async () => {
      const result = await updateSubmissionStatus(mockPrisma, 'bounty-1', 'sub-1', 'other-user', 'approve');

      expect(result).toEqual({ error: 'Unauthorized' });
    });

    it('returns error when max winners already reached', async () => {
      mockPrisma.gitHubBounty.findUnique.mockResolvedValueOnce({
        id: 'bounty-1',
        creatorUserId: 'creator-1',
        status: 'live',
        maxWinners: 1,
        _count: { submissions: 1 },
      });

      const result = await updateSubmissionStatus(mockPrisma, 'bounty-1', 'sub-1', 'creator-1', 'approve');

      expect(result).toEqual({ error: 'Max winners (1) already reached' });
    });
  });
});
