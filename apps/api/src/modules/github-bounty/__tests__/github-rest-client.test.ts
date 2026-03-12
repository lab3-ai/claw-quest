import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getRepo,
  getRepoIssues,
  getReadme,
  getContributing,
  listRepos,
  getPullRequest,
  parseGithubRepoUrl,
  parseGithubPrUrl,
  GitHubAuthRequired,
  GitHubAccessDenied,
} from '../github-rest-client';

describe('github-rest-client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── getRepo ──
  describe('getRepo', () => {
    it('returns repo metadata on success', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 123,
          full_name: 'owner/repo',
          description: 'Test repo',
          stargazers_count: 100,
          language: 'TypeScript',
          topics: ['testing'],
          open_issues_count: 5,
          private: false,
        }),
      });
      const repo = await getRepo('owner', 'repo', 'token');
      expect(repo.full_name).toBe('owner/repo');
      expect(repo.stargazers_count).toBe(100);
    });

    it('throws error when repo not found', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({ ok: false });
      await expect(getRepo('owner', 'missing', 'token')).rejects.toThrow('GitHub repo not found');
    });

    it('throws GitHubAuthRequired for 401 without token', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({ status: 401, ok: false });
      await expect(getRepo('owner', 'repo')).rejects.toThrow(GitHubAuthRequired);
    });

    it('throws GitHubAccessDenied for 403 with token', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({ status: 403, ok: false });
      await expect(getRepo('owner', 'repo', 'token')).rejects.toThrow(GitHubAccessDenied);
    });
  });

  // ── getRepoIssues ──
  describe('getRepoIssues', () => {
    it('returns issues sorted by reactions', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { number: 1, title: 'Issue 1', labels: [], reactions: { total_count: 5 } },
          { number: 2, title: 'Issue 2', labels: [], reactions: { total_count: 10 } },
        ],
      });
      const issues = await getRepoIssues('owner', 'repo', 'token');
      expect(issues).toHaveLength(2);
      expect(issues[0].number).toBe(1);
    });

    it('filters out PRs from results', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { number: 1, title: 'Issue', labels: [], reactions: { total_count: 5 } },
          { number: 2, title: 'PR', labels: [], reactions: { total_count: 5 }, pull_request: {} },
        ],
      });
      const issues = await getRepoIssues('owner', 'repo', 'token');
      expect(issues).toHaveLength(1);
      expect(issues[0].number).toBe(1);
    });

    it('returns empty array on error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({ ok: false });
      const issues = await getRepoIssues('owner', 'repo', 'token');
      expect(issues).toEqual([]);
    });
  });

  // ── getReadme ──
  describe('getReadme', () => {
    it('decodes and truncates README content', async () => {
      const content = Buffer.from('# Test README\n\nThis is a test.'.repeat(100)).toString('base64');
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content, encoding: 'base64' }),
      });
      const readme = await getReadme('owner', 'repo', 'token');
      expect(readme).toBeTruthy();
      expect(readme!.length).toBeLessThanOrEqual(1000);
      expect(readme).toContain('# Test README');
    });

    it('returns null when README not found', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({ ok: false });
      const readme = await getReadme('owner', 'repo', 'token');
      expect(readme).toBeNull();
    });

    it('returns null for non-base64 encoding', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: 'raw', encoding: 'utf-8' }),
      });
      const readme = await getReadme('owner', 'repo', 'token');
      expect(readme).toBeNull();
    });

    it('returns null on fetch error', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));
      const readme = await getReadme('owner', 'repo', 'token');
      expect(readme).toBeNull();
    });
  });

  // ── getContributing ──
  describe('getContributing', () => {
    it('decodes and truncates CONTRIBUTING.md', async () => {
      const content = Buffer.from('# Contributing\n\nFollow these rules.'.repeat(50)).toString('base64');
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content, encoding: 'base64' }),
      });
      const contributing = await getContributing('owner', 'repo', 'token');
      expect(contributing).toBeTruthy();
      expect(contributing!.length).toBeLessThanOrEqual(500);
      expect(contributing).toContain('# Contributing');
    });

    it('returns null when CONTRIBUTING.md not found', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({ ok: false });
      const contributing = await getContributing('owner', 'repo', 'token');
      expect(contributing).toBeNull();
    });
  });

  // ── listRepos ──
  describe('listRepos', () => {
    it('fetches org repos first', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { full_name: 'org/repo1', name: 'repo1', description: 'Test', stargazers_count: 10, language: 'JS', html_url: 'url', open_issues_count: 0 },
        ],
      });
      const repos = await listRepos('org', 'token');
      expect(repos).toHaveLength(1);
      expect(repos[0].full_name).toBe('org/repo1');
    });

    it('falls back to user repos when org fails', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: false }) // org with token fails
        .mockResolvedValueOnce({ ok: false }) // org without token fails
        .mockResolvedValueOnce({ // user with token succeeds
          ok: true,
          json: async () => [{ full_name: 'user/repo', name: 'repo', description: null, stargazers_count: 5, language: 'TS', html_url: 'url', open_issues_count: 1 }],
        });
      const repos = await listRepos('user', 'token');
      expect(repos).toHaveLength(1);
      expect(repos[0].full_name).toBe('user/repo');
    });

    it('throws error when all endpoints fail', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false });
      await expect(listRepos('missing', 'token')).rejects.toThrow('GitHub org/user not found');
    });
  });

  // ── getPullRequest ──
  describe('getPullRequest', () => {
    it('returns PR details on success', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          number: 123,
          title: 'Test PR',
          state: 'open',
          user: { login: 'author' },
          html_url: 'https://github.com/owner/repo/pull/123',
          merged_at: null,
          created_at: '2025-01-01T00:00:00Z',
        }),
      });
      const pr = await getPullRequest('owner', 'repo', 123, 'token');
      expect(pr).toBeTruthy();
      expect(pr!.number).toBe(123);
      expect(pr!.user.login).toBe('author');
    });

    it('returns null when PR not found', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({ ok: false });
      const pr = await getPullRequest('owner', 'repo', 999, 'token');
      expect(pr).toBeNull();
    });

    it('returns null on fetch error', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network'));
      const pr = await getPullRequest('owner', 'repo', 123, 'token');
      expect(pr).toBeNull();
    });
  });

  // ── parseGithubRepoUrl ──
  describe('parseGithubRepoUrl', () => {
    it('parses valid HTTPS repo URL', () => {
      const result = parseGithubRepoUrl('https://github.com/owner/repo');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('parses valid repo URL with .git suffix', () => {
      const result = parseGithubRepoUrl('https://github.com/owner/repo.git');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('returns null for invalid URL', () => {
      expect(parseGithubRepoUrl('https://gitlab.com/owner/repo')).toBeNull();
      expect(parseGithubRepoUrl('not-a-url')).toBeNull();
    });
  });

  // ── parseGithubPrUrl ──
  describe('parseGithubPrUrl', () => {
    it('parses valid PR URL', () => {
      const result = parseGithubPrUrl('https://github.com/owner/repo/pull/123');
      expect(result).toEqual({ owner: 'owner', repo: 'repo', prNumber: 123 });
    });

    it('returns null for invalid PR URL', () => {
      expect(parseGithubPrUrl('https://github.com/owner/repo')).toBeNull();
      expect(parseGithubPrUrl('https://github.com/owner/repo/issues/123')).toBeNull();
    });
  });
});
