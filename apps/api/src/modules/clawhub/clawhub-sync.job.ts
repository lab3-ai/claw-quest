import type { FastifyInstance } from 'fastify';
import { classifySingleSkill } from '../web3-skills/web3-classify.job';
import { detectVerificationConfig } from './verification-config-registry';

const CLAWHUB_BASE = 'https://wry-manatee-359.convex.site/api/v1/skills';
const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ── Health state ─────────────────────────────────────────────────────────────
export const clawhubSyncHealth = {
    running: false,
    lastSyncAt: null as Date | null,
    lastError: null as string | null,
    lastInserted: 0,
    lastSkipped: 0,
};

// ── ClawHub API types ────────────────────────────────────────────────────────
interface SkillItem {
    slug: string;
    displayName: string;
    summary: string;
    tags: Record<string, string>;
    stats: {
        comments: number;
        downloads: number;
        installsAllTime: number;
        installsCurrent: number;
        stars: number;
        versions: number;
    };
    createdAt: number;
    updatedAt: number;
    latestVersion: { version: string } | null;
}

interface ListResponse {
    items: SkillItem[];
    nextCursor: string | null;
}

interface SkillDetail {
    owner: { handle: string; displayName: string; image: string } | null;
}

async function fetchOwner(slug: string): Promise<SkillDetail['owner']> {
    try {
        const res = await fetch(`${CLAWHUB_BASE}/${encodeURIComponent(slug)}`);
        if (!res.ok) return null;
        const data: SkillDetail = await res.json();
        return data.owner ?? null;
    } catch {
        return null;
    }
}

// ── Priority slugs fetched before pagination ──────────────────────────────────
const PRIORITY_SLUGS = ['clawfriend'];

async function ensurePrioritySlugs(server: FastifyInstance): Promise<void> {
    for (const slug of PRIORITY_SLUGS) {
        const exists = await server.prisma.clawhub_skills.findUnique({
            where: { slug },
            select: { id: true },
        });
        if (exists) continue;

        // Fetch detail directly by slug (no list page needed)
        const res = await fetch(`${CLAWHUB_BASE}/${encodeURIComponent(slug)}`);
        if (!res.ok) {
            server.log.warn(`[clawhub:sync] Priority slug not found: ${slug}`);
            continue;
        }
        const detail = await res.json() as {
            skill: {
                slug: string;
                displayName: string;
                summary: string;
                tags: Record<string, string>;
                stats: {
                    comments: number;
                    downloads: number;
                    installsAllTime: number;
                    installsCurrent: number;
                    stars: number;
                    versions: number;
                };
                createdAt: number;
                updatedAt: number;
            };
            latestVersion: { version: string } | null;
            owner: { handle: string; displayName: string; image: string } | null;
        };

        const s = detail.skill;
        const autoConfig = detectVerificationConfig(s.slug, s.tags ?? {});
        await server.prisma.clawhub_skills.create({
            data: {
                clawhub_id: s.slug,
                slug: s.slug,
                display_name: s.displayName,
                summary: s.summary,
                downloads: s.stats.downloads,
                installs_all_time: s.stats.installsAllTime,
                installs_current: s.stats.installsCurrent,
                stars: s.stats.stars,
                comments: s.stats.comments,
                versions: s.stats.versions,
                latest_version: detail.latestVersion?.version ?? null,
                tags: s.tags ?? {},
                clawhub_created_at: new Date(s.createdAt),
                clawhub_updated_at: new Date(s.updatedAt),
                owner_handle: detail.owner?.handle ?? null,
                owner_display_name: detail.owner?.displayName ?? null,
                owner_image: detail.owner?.image ?? null,
                verification_config: autoConfig ?? undefined,
            },
        });
        server.log.info(`[clawhub:sync] Priority slug inserted: ${slug}`);

        // Auto-classify web3 skills
        const inserted = await server.prisma.clawhub_skills.findUnique({ where: { slug }, select: { id: true } });
        if (inserted) await classifySingleSkill(server, inserted.id);
    }
}

// ── Main sync function ───────────────────────────────────────────────────────
async function runSync(server: FastifyInstance): Promise<void> {
    server.log.info('[clawhub:sync] Starting daily sync...');

    // Ensure priority skills are available before pagination
    await ensurePrioritySlugs(server);

    let cursor: string | null = null;
    let inserted = 0;
    let skipped = 0;

    do {
        const url = cursor
            ? `${CLAWHUB_BASE}?cursor=${encodeURIComponent(cursor)}`
            : CLAWHUB_BASE;

        const res = await fetch(url);
        if (!res.ok) throw new Error(`ClawHub list API returned ${res.status}`);

        const data: ListResponse = await res.json();

        for (const item of data.items) {
            const exists = await server.prisma.clawhub_skills.findUnique({
                where: { slug: item.slug },
                select: { id: true },
            });

            if (exists) {
                skipped++;
                continue;
            }

            // Only call detail API for new skills (to get owner)
            const owner = await fetchOwner(item.slug);
            const autoConfig = detectVerificationConfig(item.slug, item.tags ?? {});

            await server.prisma.clawhub_skills.create({
                data: {
                    clawhub_id: item.slug,
                    slug: item.slug,
                    display_name: item.displayName,
                    summary: item.summary,
                    downloads: item.stats.downloads,
                    installs_all_time: item.stats.installsAllTime,
                    installs_current: item.stats.installsCurrent,
                    stars: item.stats.stars,
                    comments: item.stats.comments,
                    versions: item.stats.versions,
                    latest_version: item.latestVersion?.version ?? null,
                    tags: item.tags ?? {},
                    clawhub_created_at: new Date(item.createdAt),
                    clawhub_updated_at: new Date(item.updatedAt),
                    owner_handle: owner?.handle ?? null,
                    owner_display_name: owner?.displayName ?? null,
                    owner_image: owner?.image ?? null,
                    verification_config: autoConfig ?? undefined,
                },
            });

            server.log.info(`[clawhub:sync] Inserted: ${item.slug}`);

            // Auto-classify web3 skills
            const newSkill = await server.prisma.clawhub_skills.findUnique({ where: { slug: item.slug }, select: { id: true } });
            if (newSkill) await classifySingleSkill(server, newSkill.id);

            inserted++;
        }

        cursor = data.nextCursor;

        // Rate-limit: small delay between pages to avoid hammering ClawHub
        if (cursor) await new Promise(r => setTimeout(r, 500));
    } while (cursor);

    clawhubSyncHealth.lastSyncAt = new Date();
    clawhubSyncHealth.lastInserted = inserted;
    clawhubSyncHealth.lastSkipped = skipped;
    server.log.info(`[clawhub:sync] Done — ${inserted} inserted, ${skipped} skipped`);
}

// ── Job entry point ──────────────────────────────────────────────────────────
export async function startClawhubSyncJob(server: FastifyInstance): Promise<void> {
    clawhubSyncHealth.running = true;
    let timer: NodeJS.Timeout | undefined;

    server.addHook('onClose', () => {
        clawhubSyncHealth.running = false;
        if (timer) clearInterval(timer);
        server.log.info('[clawhub:sync] Stopped');
    });

    // Initial sync on startup
    runSync(server).catch(err => {
        clawhubSyncHealth.lastError = err.message;
        server.log.error({ err }, '[clawhub:sync] Initial sync failed (non-fatal)');
    });

    // Daily recurring sync
    timer = setInterval(() => {
        runSync(server).catch(err => {
            clawhubSyncHealth.lastError = err.message;
            server.log.error({ err }, '[clawhub:sync] Scheduled sync failed');
        });
    }, SYNC_INTERVAL_MS);
}
