/**
 * GitHub Bounty service — business logic for bounty creation, LLM analysis,
 * PR submission verification, and reward distribution.
 */

import type { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';
import { getRepo, getRepoIssues, getReadme, getContributing, getPullRequest, parseGithubPrUrl, GitHubAccessDenied } from './github-rest-client';

const TIMEOUT_MS = 30_000;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BountySuggestion {
    title: string;
    description: string;
    issueNumber?: number;
    difficulty: 'easy' | 'medium' | 'hard';
    suggestedReward: number;
    rewardType: 'USDC' | 'USD' | 'LLM_KEY';
}

export interface AnalyzeRepoResult {
    suggestions?: BountySuggestion[];
}

// ─── LLM Analysis ─────────────────────────────────────────────────────────────

/** Call llm-server, MiniMax, or Anthropic to analyze a repo and suggest bounties.
 *  Priority: LLM_SERVER_URL → MINIMAX_API_KEY → ANTHROPIC_API_KEY
 */
async function callLlmForBountySuggestions(prompt: string): Promise<BountySuggestion[]> {
    const baseUrl = process.env.LLM_SERVER_URL;
    const secretKey = process.env.LLM_SERVER_SECRET_KEY;
    if (baseUrl && secretKey) return callLlmServer(prompt, baseUrl, secretKey);

    const minimaxKey = process.env.MINIMAX_API_KEY;
    if (minimaxKey) return callMinimax(prompt, minimaxKey);

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (anthropicKey) return callAnthropic(prompt, anthropicKey);

    console.warn('[github-bounty] No LLM configured (set MINIMAX_API_KEY, LLM_SERVER_URL, or ANTHROPIC_API_KEY)');
    return [];
}

async function callLlmServer(prompt: string, baseUrl: string, secretKey: string): Promise<BountySuggestion[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'default',
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' },
                temperature: 0.7,
            }),
            signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok) { console.error('[github-bounty] LLM server call failed:', res.status); return []; }
        const data = await res.json() as { choices: Array<{ message: { content: string } }> };
        const content = data.choices?.[0]?.message?.content ?? '{}';
        const parsed = JSON.parse(content) as { bounties?: BountySuggestion[] };
        return Array.isArray(parsed.bounties) ? parsed.bounties : [];
    } catch (err) {
        clearTimeout(timeout);
        console.error('[github-bounty] LLM server error:', err);
        return [];
    }
}

/** Call MiniMax via OpenAI-compatible API (international endpoint). */
async function callMinimax(prompt: string, apiKey: string): Promise<BountySuggestion[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const res = await fetch('https://api.minimaxi.chat/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'MiniMax-Text-01',
                messages: [{ role: 'user', content: prompt + '\n\nRespond with only valid JSON.' }],
                temperature: 0.7,
                max_tokens: 2048,
            }),
            signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok) {
            console.error('[github-bounty] MiniMax call failed:', res.status, await res.text());
            return [];
        }
        const data = await res.json() as { choices: Array<{ message: { content: string } }> };
        const content = data.choices?.[0]?.message?.content ?? '{}';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return [];
        const parsed = JSON.parse(jsonMatch[0]) as { bounties?: BountySuggestion[] };
        return Array.isArray(parsed.bounties) ? parsed.bounties : [];
    } catch (err: any) {
        clearTimeout(timeout);
        console.error('[github-bounty] MiniMax error:', err?.message ?? err);
        return [];
    }
}

async function callAnthropic(prompt: string, apiKey: string): Promise<BountySuggestion[]> {
    try {
        const client = new Anthropic({ apiKey });
        const msg = await client.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 2048,
            messages: [{ role: 'user', content: prompt + '\n\nRespond with only valid JSON.' }],
        });
        const content = msg.content[0].type === 'text' ? msg.content[0].text : '{}';
        // Extract JSON from response (handles markdown code blocks too)
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return [];
        const parsed = JSON.parse(jsonMatch[0]) as { bounties?: BountySuggestion[] };
        return Array.isArray(parsed.bounties) ? parsed.bounties : [];
    } catch (err: any) {
        const msg = err?.message ?? String(err);
        if (msg.includes('credit balance') || msg.includes('insufficient_quota')) {
            console.error('[github-bounty] Anthropic out of credits — top up at console.anthropic.com/settings/billing');
        } else {
            console.error('[github-bounty] Anthropic call error:', msg);
        }
        return [];
    }
}

function buildAnalysisPrompt(repoData: {
    owner: string; name: string; description: string | null;
    stars: number; language: string | null; topics: string[];
    issues: Array<{ number: number; title: string; labels: string[]; reactions: number }>;
    readme: string | null;
    contributing: string | null;
}): string {
    const issueLines = repoData.issues.map(i => {
        const labels = i.labels.length ? ` [${i.labels.join(', ')}]` : '';
        return `  #${i.number}${labels} ${i.title} (${i.reactions} 👍)`;
    }).join('\n');

    return `Repo: ${repoData.owner}/${repoData.name}
Stars: ${repoData.stars} | Language: ${repoData.language ?? 'unknown'} | Topics: ${repoData.topics.join(', ') || 'none'}
Description: ${repoData.description ?? 'none'}

Open issues (sorted by reactions):
${issueLines || '  (no open issues)'}

README (first 1000 chars):
${repoData.readme ?? '(not available)'}
${repoData.contributing ? `\nCONTRIBUTING.md (first 500 chars):\n${repoData.contributing}` : ''}

Suggest 5-8 GitHub bounties this repo owner could create to attract contributors.
For AI-friendly tasks (code generation, docs, tests), prefer rewardType "LLM_KEY".
For complex bug fixes or features, prefer rewardType "USDC" or "USD".

Return a JSON object with key "bounties" containing an array with these fields:
- title: string (clear, action-oriented, max 100 chars)
- description: string (2-3 sentences explaining the task and acceptance criteria)
- issueNumber: number or null (link to a specific issue if applicable)
- difficulty: "easy" | "medium" | "hard"
- suggestedReward: number (USD value — easy: 25-100, medium: 100-500, hard: 500-2000)
- rewardType: "USDC" | "USD" | "LLM_KEY"`;
}

/** Analyze a GitHub repo and return LLM-generated bounty suggestions.
 *  Uses server-side GITHUB_TOKEN — only public repos supported in MVP.
 */
export async function analyzeRepo(
    repoUrl: string,
): Promise<AnalyzeRepoResult> {
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/?\s#]+)/);
    if (!match) throw new Error('Invalid GitHub repo URL');
    const owner = match[1];
    const repo = match[2].replace(/\.git$/, '');

    const token = process.env.GITHUB_TOKEN ?? null;

    let repoData, issues, readme, contributing;

    async function fetchAll(t: string | null) {
        return Promise.all([
            getRepo(owner, repo, t),
            getRepoIssues(owner, repo, t),
            getReadme(owner, repo, t),
            getContributing(owner, repo, t).catch(() => null),
        ]);
    }

    try {
        [repoData, issues, readme, contributing] = await fetchAll(token);
    } catch (err) {
        // Org restricts PAT access — fallback to unauthenticated (public repos only)
        if (err instanceof GitHubAccessDenied && token) {
            [repoData, issues, readme, contributing] = await fetchAll(null);
        } else {
            throw err;
        }
    }

    const prompt = buildAnalysisPrompt({
        owner,
        name: repoData.full_name.split('/')[1],
        description: repoData.description,
        stars: repoData.stargazers_count,
        language: repoData.language,
        topics: repoData.topics ?? [],
        issues: issues.map(i => ({
            number: i.number,
            title: i.title,
            labels: i.labels.map(l => l.name),
            reactions: i.reactions.total_count,
        })),
        readme,
        contributing,
    });

    const suggestions = await callLlmForBountySuggestions(prompt);
    return { suggestions };
}

// ─── Bounty CRUD ──────────────────────────────────────────────────────────────

export interface CreateBountyInput {
    repoOwner: string;
    repoName: string;
    title: string;
    description: string;
    rewardAmount: number;
    rewardType: 'USDC' | 'USD' | 'LLM_KEY';
    questType?: 'fcfs' | 'leaderboard';
    maxWinners?: number;
    deadline?: string;
    issueNumber?: number;
    issueUrl?: string;
    llmKeyTokenLimit?: number;
}

/** Create a single bounty. LLM_KEY bounties go live immediately; others stay draft. */
export async function createBounty(prisma: PrismaClient, userId: string, input: CreateBountyInput) {
    const isLlmKey = input.rewardType === 'LLM_KEY';
    return prisma.gitHubBounty.create({
        data: {
            creatorUserId: userId,
            repoOwner: input.repoOwner,
            repoName: input.repoName,
            title: input.title,
            description: input.description,
            rewardAmount: input.rewardAmount,
            rewardType: input.rewardType,
            questType: input.questType ?? 'fcfs',
            maxWinners: input.maxWinners ?? 1,
            deadline: input.deadline ? new Date(input.deadline) : null,
            issueNumber: input.issueNumber ?? null,
            issueUrl: input.issueUrl ?? null,
            llmKeyTokenLimit: isLlmKey ? (input.llmKeyTokenLimit ?? 1_000_000) : null,
            // LLM_KEY bounties skip funding — go live immediately
            status: isLlmKey ? 'live' : 'draft',
            fundingStatus: isLlmKey ? 'confirmed' : 'unfunded',
        },
    });
}

/** Bulk create bounties from suggestions. */
export async function createBounties(prisma: PrismaClient, userId: string, inputs: CreateBountyInput[]) {
    const created = await Promise.all(inputs.map(input => createBounty(prisma, userId, input)));
    return created;
}

/** List live bounties, paginated. */
export async function listBounties(prisma: PrismaClient, opts: {
    page?: number; limit?: number; rewardType?: string; repoOwner?: string; repoName?: string;
}) {
    const page = opts.page ?? 1;
    const limit = Math.min(opts.limit ?? 20, 50);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { status: 'live' };
    if (opts.rewardType) where.rewardType = opts.rewardType;
    if (opts.repoOwner) where.repoOwner = opts.repoOwner;
    if (opts.repoName) where.repoName = opts.repoName;

    const [bounties, total] = await Promise.all([
        prisma.gitHubBounty.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
            include: { _count: { select: { submissions: true } } },
        }),
        prisma.gitHubBounty.count({ where }),
    ]);

    return { bounties, total, page, limit };
}

/** List bounties created by a user (all statuses). */
export async function listMyBounties(prisma: PrismaClient, userId: string) {
    return prisma.gitHubBounty.findMany({
        where: { creatorUserId: userId },
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { submissions: true } } },
    });
}

// ─── PR Submission ─────────────────────────────────────────────────────────────

/** Submit a PR to a bounty. Verifies ownership via GitHub API. */
export async function submitPr(prisma: PrismaClient, bountyId: string, userId: string, prUrl: string): Promise<
    | { error: string }
    | { submission: unknown }
> {
    const parsed = parseGithubPrUrl(prUrl);
    if (!parsed) return { error: 'Invalid GitHub PR URL' };

    const bounty = await prisma.gitHubBounty.findUnique({ where: { id: bountyId } });
    if (!bounty) return { error: 'Bounty not found' };
    if (bounty.status !== 'live') return { error: 'Bounty is not accepting submissions' };

    // Verify PR belongs to the bounty's repo
    if (parsed.owner.toLowerCase() !== bounty.repoOwner.toLowerCase() ||
        parsed.repo.toLowerCase() !== bounty.repoName.toLowerCase()) {
        return { error: `PR must be from ${bounty.repoOwner}/${bounty.repoName}` };
    }

    // Load user to check GitHub handle (synced from Supabase on login)
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.githubHandle) return { error: 'GitHub account not linked — log in with GitHub first' };

    // Verify PR via GitHub API using server token
    const pr = await getPullRequest(parsed.owner, parsed.repo, parsed.prNumber, process.env.GITHUB_TOKEN ?? null);
    if (!pr) return { error: 'PR not found on GitHub' };
    if (pr.user.login.toLowerCase() !== user.githubHandle.toLowerCase()) {
        return { error: `PR was opened by @${pr.user.login}, not @${user.githubHandle}` };
    }

    // Check for duplicate submission
    const existing = await prisma.gitHubBountySubmission.findFirst({
        where: { bountyId, userId },
    });
    if (existing) return { error: 'You have already submitted a PR for this bounty' };

    const submission = await prisma.gitHubBountySubmission.create({
        data: { bountyId, userId, prUrl, prNumber: parsed.prNumber, status: 'pending' },
    });
    return { submission };
}

// ─── Submission Approval ───────────────────────────────────────────────────────

/** Approve or reject a submission. On approval, issues LLM key or marks for fiat payout. */
export async function updateSubmissionStatus(
    prisma: PrismaClient,
    bountyId: string,
    submissionId: string,
    creatorUserId: string,
    action: 'approve' | 'reject',
): Promise<{ error?: string; submission?: unknown }> {
    const bounty = await prisma.gitHubBounty.findUnique({
        where: { id: bountyId },
        include: { _count: { select: { submissions: { where: { status: 'approved' } } } } },
    });
    if (!bounty) return { error: 'Bounty not found' };
    if (bounty.creatorUserId !== creatorUserId) return { error: 'Unauthorized' };
    if (bounty.status === 'completed') return { error: 'Bounty is already completed' };

    if (action === 'approve') {
        // Enforce winner cap
        if (bounty._count.submissions >= bounty.maxWinners) {
            return { error: `Max winners (${bounty.maxWinners}) already reached` };
        }

        let llmRewardApiKey: string | null = null;
        let llmRewardIssuedAt: Date | null = null;

        // Issue LLM key for LLM_KEY reward type
        if (bounty.rewardType === 'LLM_KEY') {
            llmRewardApiKey = await issueLlmKeyForBounty(bounty.id, submissionId, bounty.llmKeyTokenLimit ?? 1_000_000);
            if (llmRewardApiKey) llmRewardIssuedAt = new Date();
        }

        const newApprovedCount = bounty._count.submissions + 1;
        const [submission] = await prisma.$transaction([
            prisma.gitHubBountySubmission.update({
                where: { id: submissionId },
                data: { status: 'approved', llmRewardApiKey, llmRewardIssuedAt },
            }),
            // Close bounty if all winner slots are filled
            ...(newApprovedCount >= bounty.maxWinners
                ? [prisma.gitHubBounty.update({ where: { id: bountyId }, data: { status: 'completed' } })]
                : []
            ),
        ]);
        return { submission };
    }

    // Reject
    const submission = await prisma.gitHubBountySubmission.update({
        where: { id: submissionId },
        data: { status: 'rejected' },
    });
    return { submission };
}

/** Issue a single LLM API key via llm-server for a bounty submission. */
async function issueLlmKeyForBounty(bountyId: string, submissionId: string, maxTokenUsage: number): Promise<string | null> {
    const baseUrl = process.env.LLM_SERVER_URL;
    const secretKey = process.env.LLM_SERVER_SECRET_KEY;
    if (!baseUrl || !secretKey) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
        const res = await fetch(`${baseUrl}/api/v1/keys`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                secret_key: secretKey,
                name: `bounty-${bountyId.slice(0, 8)}-${submissionId.slice(0, 8)}`,
                max_token_usage: maxTokenUsage,
            }),
            signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok) return null;
        const data = await res.json() as { api_key: string };
        return data.api_key ?? null;
    } catch {
        clearTimeout(timeout);
        return null;
    }
}
