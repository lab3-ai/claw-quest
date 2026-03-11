/**
 * GitHub REST API client for fetching repo data used in bounty analysis.
 * Uses optional access token for authenticated requests (higher rate limits + private repos).
 */

const GITHUB_API = 'https://api.github.com';
const TIMEOUT_MS = 10_000;

export class GitHubAuthRequired extends Error {
    constructor() { super('GitHub authentication required to access this repo'); }
}

export class GitHubAccessDenied extends Error {
    constructor() { super('GitHub access denied for this repo'); }
}

function buildHeaders(token?: string | null): Record<string, string> {
    const headers: Record<string, string> = { 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
}

async function githubFetch(url: string, token?: string | null): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(url, { headers: buildHeaders(token), signal: controller.signal });
        clearTimeout(timeout);
        if (res.status === 401 || res.status === 403) {
            if (!token) throw new GitHubAuthRequired();
            throw new GitHubAccessDenied();
        }
        return res;
    } catch (err) {
        clearTimeout(timeout);
        throw err;
    }
}

export interface GitHubRepo {
    id: number;
    full_name: string;
    description: string | null;
    stargazers_count: number;
    language: string | null;
    topics: string[];
    open_issues_count: number;
    private: boolean;
}

export interface GitHubIssue {
    number: number;
    title: string;
    body: string | null;
    labels: Array<{ name: string }>;
    reactions: { total_count: number };
}

export interface GitHubPullRequest {
    number: number;
    title: string;
    state: string;
    user: { login: string };
    html_url: string;
    merged_at: string | null;
    created_at: string;
}

/** Fetch repository metadata. Throws GitHubAuthRequired for private repos without token. */
export async function getRepo(owner: string, repo: string, token?: string | null): Promise<GitHubRepo> {
    const res = await githubFetch(`${GITHUB_API}/repos/${owner}/${repo}`, token);
    if (!res.ok) throw new Error(`GitHub repo not found: ${owner}/${repo}`);
    return res.json() as Promise<GitHubRepo>;
}

/** Fetch open issues sorted by reactions (most popular first). Returns up to 20. */
export async function getRepoIssues(owner: string, repo: string, token?: string | null): Promise<GitHubIssue[]> {
    const url = `${GITHUB_API}/repos/${owner}/${repo}/issues?state=open&sort=reactions&direction=desc&per_page=20`;
    const res = await githubFetch(url, token);
    if (!res.ok) return [];
    const issues = await res.json() as GitHubIssue[];
    // Filter out PRs (GitHub issues API includes PRs)
    return issues.filter((i: any) => !i.pull_request);
}

/** Fetch and decode README content (first 1000 chars). Returns null if not found. */
export async function getReadme(owner: string, repo: string, token?: string | null): Promise<string | null> {
    try {
        const res = await githubFetch(`${GITHUB_API}/repos/${owner}/${repo}/readme`, token);
        if (!res.ok) return null;
        const data = await res.json() as { content: string; encoding: string };
        if (data.encoding !== 'base64') return null;
        const text = Buffer.from(data.content, 'base64').toString('utf-8');
        return text.slice(0, 1000); // Truncate for LLM prompt
    } catch {
        return null;
    }
}

/** Fetch CONTRIBUTING.md content (first 500 chars). Returns null if not found. */
export async function getContributing(owner: string, repo: string, token?: string | null): Promise<string | null> {
    try {
        const res = await githubFetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/CONTRIBUTING.md`, token);
        if (!res.ok) return null;
        const data = await res.json() as { content: string; encoding: string };
        if (data.encoding !== 'base64') return null;
        const text = Buffer.from(data.content, 'base64').toString('utf-8');
        return text.slice(0, 500);
    } catch {
        return null;
    }
}

export interface GitHubRepoSummary {
    full_name: string;
    name: string;
    description: string | null;
    stargazers_count: number;
    language: string | null;
    html_url: string;
    open_issues_count: number;
}

/** List repos for a GitHub org or user (tries org first, falls back to user).
 *  Falls back to unauthenticated request if token is denied (e.g. org restricts PATs).
 *  Returns up to 30 sorted by stars.
 */
export async function listRepos(owner: string, token?: string | null): Promise<GitHubRepoSummary[]> {
    const orgUrl = `${GITHUB_API}/orgs/${owner}/repos?type=public&sort=stargazers&per_page=30`;
    const userUrl = `${GITHUB_API}/users/${owner}/repos?type=public&sort=stargazers&per_page=30`;

    async function tryFetch(url: string, t: string | null | undefined): Promise<Response | null> {
        try {
            const res = await githubFetch(url, t);
            return res.ok ? res : null;
        } catch {
            return null; // 401/403/404 → try next
        }
    }

    // Try org with token → org without token → user with token → user without token
    let res = await tryFetch(orgUrl, token)
        ?? await tryFetch(orgUrl, null)
        ?? await tryFetch(userUrl, token)
        ?? await tryFetch(userUrl, null);

    if (!res) throw new Error(`GitHub org/user not found: ${owner}`);
    return res.json() as Promise<GitHubRepoSummary[]>;
}

/** Verify a PR exists and return its details. Returns null if not found. */
export async function getPullRequest(owner: string, repo: string, prNumber: number, token?: string | null): Promise<GitHubPullRequest | null> {
    try {
        const res = await githubFetch(`${GITHUB_API}/repos/${owner}/${repo}/pulls/${prNumber}`, token);
        if (!res.ok) return null;
        return res.json() as Promise<GitHubPullRequest>;
    } catch {
        return null;
    }
}

/** Parse owner and repo name from a GitHub URL. Returns null if invalid. */
export function parseGithubRepoUrl(url: string): { owner: string; repo: string } | null {
    const match = url.match(/github\.com\/([^/]+)\/([^/?\s#]+)/);
    if (!match) return null;
    return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
}

/** Parse PR number from a GitHub PR URL. Returns null if invalid. */
export function parseGithubPrUrl(url: string): { owner: string; repo: string; prNumber: number } | null {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
    if (!match) return null;
    return { owner: match[1], repo: match[2], prNumber: parseInt(match[3], 10) };
}
