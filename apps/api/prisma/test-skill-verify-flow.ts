#!/usr/bin/env tsx
/**
 * test-skill-verify-flow.ts
 * End-to-end test: create skill → create quest → verify skill via challenge system
 *
 * Usage:
 *   AGENT_API_KEY=cq_... tsx scripts/test-skill-verify-flow.ts
 *   ADMIN_TOKEN=... AGENT_API_KEY=cq_... tsx scripts/test-skill-verify-flow.ts
 *
 * Requirements: Node >=20, tsx, prisma client, @prisma/client
 * Auto-generates admin JWT from apps/api/.env + local DB if ADMIN_TOKEN not set.
 */

import { createHmac } from 'crypto';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

// ── Config ───────────────────────────────────────────────────────────────────
const API = process.env.API_BASE_URL ?? 'http://localhost:3000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin-clawquest@clawquest.ai';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? '';
let ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? '';
let AGENT_API_KEY = process.env.AGENT_API_KEY ?? '';

const SKILL_SLUG = `test-bybit-trading-${Date.now()}`;
const QUEST_TITLE = `Test Quest — Bybit Skill Verify ${new Date().toLocaleTimeString()}`;

// ── Console helpers ──────────────────────────────────────────────────────────
const c = {
    green: (s: string) => `\x1b[0;32m${s}\x1b[0m`,
    cyan:  (s: string) => `\x1b[0;36m${s}\x1b[0m`,
    yellow:(s: string) => `\x1b[1;33m${s}\x1b[0m`,
    red:   (s: string) => `\x1b[0;31m${s}\x1b[0m`,
};
const ok   = (msg: string) => console.log(c.green(`✓ ${msg}`));
const info = (msg: string) => console.log(c.cyan(`→ ${msg}`));
const warn = (msg: string) => console.log(c.yellow(`⚠ ${msg}`));
const hr   = ()            => console.log(c.cyan('────────────────────────────────────────'));
const fail = (msg: string): never => { console.error(c.red(`✗ ${msg}`)); process.exit(1); };

// ── HTTP helper ──────────────────────────────────────────────────────────────
async function req<T = unknown>(
    method: string,
    url: string,
    opts: { body?: unknown; headers?: Record<string, string> } = {}
): Promise<T> {
    const res = await fetch(url, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...opts.headers,
        },
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
    const text = await res.text();
    if (!res.ok) {
        fail(`HTTP ${res.status} ${method} ${url}\n  ${text}`);
    }
    try { return JSON.parse(text) as T; }
    catch { return text as unknown as T; }
}

// ── Admin JWT generator (dev only) ───────────────────────────────────────────
async function genAdminJwt(): Promise<string> {
    // Read JWT_SECRET from apps/api/.env
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const envPath = join(__dirname, '..', '.env');
    let secret = '';
    try {
        const envContent = readFileSync(envPath, 'utf-8');
        const match = envContent.match(/^(?:ADMIN_JWT_SECRET|JWT_SECRET)=(.+)$/m);
        secret = match?.[1]?.replace(/^"|"$/g, '').trim() ?? '';
    } catch {
        fail('Could not read JWT_SECRET from apps/api/.env');
    }
    if (!secret) fail('JWT_SECRET is empty in apps/api/.env');

    // Query admin user from DB via Prisma
    const prisma = new PrismaClient();
    try {
        const admin = await prisma.user.findFirst({
            where: { role: 'admin' },
            select: { id: true, email: true },
        });
        if (!admin) fail('No admin user found in DB');

        const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
        const now = Math.floor(Date.now() / 1000);
        const payload = { id: admin.id, email: admin.email, role: 'admin', iat: now, exp: now + 86400 };
        const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
        const sig = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
        return `${header}.${body}.${sig}`;
    } finally {
        await prisma.$disconnect();
    }
}

async function getAgentApiKey(): Promise<string> {
    const prisma = new PrismaClient();
    try {
        const agent = await prisma.agent.findFirst({
            where: { agentApiKey: { not: null }, isActive: true },
            select: { agentApiKey: true },
        });
        return agent?.agentApiKey ?? '';
    } finally {
        await prisma.$disconnect();
    }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
    // ── Resolve admin token ──────────────────────────────────────────────────
    if (!ADMIN_TOKEN && !ADMIN_PASSWORD) {
        warn('No ADMIN_TOKEN or ADMIN_PASSWORD — generating JWT from local DB+secret');
        ADMIN_TOKEN = await genAdminJwt();
        ok('Generated admin JWT from local dev secret');
    }

    // ── Resolve agent API key ────────────────────────────────────────────────
    if (!AGENT_API_KEY) {
        warn('AGENT_API_KEY not set — looking up active agent in DB');
        AGENT_API_KEY = await getAgentApiKey();
        if (!AGENT_API_KEY) fail('No active agent with API key found. Activate one in the Dashboard.');
        ok(`Found agent key: ${AGENT_API_KEY.slice(0, 15)}...`);
    }

    hr();
    info(`API: ${API}`);
    info(`Skill slug: ${SKILL_SLUG}`);
    hr();

    // ── Step 1: Admin token ──────────────────────────────────────────────────
    console.log();
    info('Step 1: Admin login');
    if (ADMIN_TOKEN) {
        ok('Using provided ADMIN_TOKEN (skipping login)');
    } else {
        const resp = await req<{ token?: string; message?: string }>(
            'POST', `${API}/admin/login`,
            { body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } }
        );
        if (!resp.token) fail(`Admin login failed: ${resp.message}`);
        ADMIN_TOKEN = resp.token;
        ok(`Logged in as ${ADMIN_EMAIL}`);
    }

    // ── Step 2: Create skill ─────────────────────────────────────────────────
    console.log();
    info(`Step 2: Create skill '${SKILL_SLUG}' with verification_config`);
    const skillResp = await req<{ skill: { slug: string } }>(
        'POST', `${API}/admin/skills`,
        {
            headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
            body: {
                slug: SKILL_SLUG,
                display_name: 'Bybit Trading (Test)',
                summary: 'Test skill for Bybit spot kline API',
                tags: { category: 'trading', exchange: 'bybit' },
                verification_config: {
                    type: 'api_call',
                    skill_display: 'Bybit Trading',
                    task_description: 'Fetch spot kline (candlestick) data from Bybit API',
                    api_endpoint: 'https://api.bybit.com/v5/market/kline',
                    params: {
                        category: 'spot',
                        symbol: '${symbol}',
                        interval: '${interval}',
                        limit: '${limit}',
                    },
                    variable_options: {
                        symbol: ['DOGEUSDT', 'BTCUSDT', 'ETHUSDT'],
                        interval: ['5', '15', '60'],
                        limit: [3, 5],
                    },
                    submission_fields: ['result', 'ts'],
                    validation: { type: 'non_empty_response', check_path: 'result' },
                },
            },
        }
    );
    if (!skillResp.skill?.slug) fail(`Skill creation failed: ${JSON.stringify(skillResp)}`);
    ok(`Skill created: ${skillResp.skill.slug}`);

    // ── Step 3: Verify verification-info endpoint ────────────────────────────
    console.log();
    info(`Step 3: GET /quests/skills/${SKILL_SLUG}/verification-info`);
    const vfyInfo = await req<{ verification_config?: { task_description?: string } }>(
        'GET', `${API}/quests/skills/${SKILL_SLUG}/verification-info`
    );
    const taskDesc = vfyInfo.verification_config?.task_description;
    if (!taskDesc) fail(`verification-info missing task_description: ${JSON.stringify(vfyInfo)}`);
    ok(`verification-info OK — task_description: ${taskDesc}`);

    // ── Step 4: Create quest ─────────────────────────────────────────────────
    console.log();
    info(`Step 4: Create quest requiring skill '${SKILL_SLUG}'`);
    const expire = new Date(Date.now() + 86_400_000).toISOString();
    const questResp = await req<{ id?: string; message?: string }>(
        'POST', `${API}/quests`,
        {
            headers: { Authorization: `Bearer ${AGENT_API_KEY}` },
            body: {
                title: QUEST_TITLE,
                description: 'Auto-generated test quest for skill verification',
                sponsor: 'TestBot',
                status: 'draft',
                type: 'FCFS',
                rewardType: 'USD',
                rewardAmount: 0,
                totalSlots: 1,
                expiresAt: expire,
                requiredSkills: [SKILL_SLUG],
                tasks: [],
                tags: ['test', 'auto'],
            },
        }
    );
    if (!questResp.id) fail(`Quest creation failed: ${JSON.stringify(questResp)}`);
    const questId = questResp.id;
    ok(`Quest created: ${questId}`);
    info(`Quest URL: ${API}/quests/${questId}`);

    // ── Step 5: Create challenge ─────────────────────────────────────────────
    console.log();
    info(`Step 5: POST /challenges — request challenge for '${SKILL_SLUG}'`);
    const challengeResp = await req<{ token?: string; expiresAt?: string; error?: string }>(
        'POST', `${API}/challenges`,
        {
            headers: { Authorization: `Bearer ${AGENT_API_KEY}` },
            // questId is optional — omit here since the test quest is draft (not publicly accessible)
            body: { skillSlug: SKILL_SLUG },
        }
    );
    if (!challengeResp.token) fail(`Challenge creation failed: ${JSON.stringify(challengeResp)}`);
    const token = challengeResp.token;
    ok(`Challenge created: ${token} (expires ${challengeResp.expiresAt})`);

    // ── Step 6: Fetch challenge markdown ─────────────────────────────────────
    console.log();
    info(`Step 6: GET /verify/${token} — fetch challenge markdown`);
    const markdown = await req<string>('GET', `${API}/verify/${token}`);
    if (!markdown) fail('Empty markdown response');
    ok(`Markdown received (${markdown.length} chars)`);
    console.log();
    console.log(markdown);
    console.log();

    // ── Step 7: Read challenge params and call Bybit ─────────────────────────
    console.log();
    info('Step 7: Read challenge params from DB and call Bybit API');
    const prisma = new PrismaClient();
    let symbol = 'BTCUSDT';
    let interval = '5';
    let limit: string | number = '3';
    try {
        const challenge = await prisma.skillChallenge.findUnique({
            where: { token },
            select: { params: true },
        });
        if (challenge?.params && typeof challenge.params === 'object') {
            const p = challenge.params as Record<string, string | number>;
            symbol = String(p.symbol ?? symbol);
            interval = String(p.interval ?? interval);
            limit = p.limit ?? limit;
        } else {
            warn('Could not read params from DB — using defaults');
        }
    } finally {
        await prisma.$disconnect();
    }
    info(`Resolved params: symbol=${symbol} interval=${interval} limit=${limit}`);

    const bybitUrl = `https://api.bybit.com/v5/market/kline?category=spot&symbol=${symbol}&interval=${interval}&limit=${limit}`;
    info(`Calling Bybit: ${bybitUrl}`);
    const bybitResp = await req<{ result?: { list?: unknown[] } }>('GET', bybitUrl);
    const resultList = bybitResp.result?.list;
    if (!resultList?.length) fail(`Bybit API call failed: ${JSON.stringify(bybitResp)}`);
    ok(`Bybit returned ${resultList.length} candles for ${symbol}`);

    // ── Step 8: Submit result ────────────────────────────────────────────────
    console.log();
    info(`Step 8: POST /verify/${token} — submit result`);
    const submitResp = await req<{ passed: boolean; message: string }>(
        'POST', `${API}/verify/${token}`,
        { body: { result: resultList, ts: new Date().toISOString() } }
    );

    console.log();
    hr();
    if (submitResp.passed) {
        ok(`PASSED: ${submitResp.message}`);
    } else {
        fail(`FAILED: ${submitResp.message}`);
    }
    hr();

    // ── Summary ──────────────────────────────────────────────────────────────
    console.log();
    info('Summary');
    console.log(`  Skill slug:  ${SKILL_SLUG}`);
    console.log(`  Quest ID:    ${questId}`);
    console.log(`  Token:       ${token}`);
    console.log(`  Result:      passed=${submitResp.passed}`);
    console.log();
    info(`Quest (draft — not publicly visible): ${API}/quests/${questId}`);
    info(`To view in UI: publish the quest first, then open http://localhost:5173/quests/${questId}`);
    console.log();
}

main().catch((err) => {
    console.error(c.red(`✗ Unexpected error: ${err?.message ?? err}`));
    process.exit(1);
});
