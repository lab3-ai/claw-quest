import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const CLAWHUB_BASE = 'https://wry-manatee-359.convex.site/api/v1/skills';

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
    latestVersion: {
        version: string;
    } | null;
    metadata: { os: string[] | null; systems: string[] | null } | null;
}

interface SkillDetail {
    owner: {
        handle: string;
        displayName: string;
        image: string;
    } | null;
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

interface ListResponse {
    items: SkillItem[];
    nextCursor: string | null;
}

async function main() {
    console.log('Seeding clawhub_skills from ClawHub API...\n');

    let cursor: string | null = null;
    let page = 0;
    let inserted = 0;
    let skipped = 0;

    do {
        // sleep for 1 second
        await new Promise(resolve => setTimeout(resolve, 1000));
        const url = cursor
            ? `${CLAWHUB_BASE}?cursor=${encodeURIComponent(cursor)}`
            : CLAWHUB_BASE;

        const res = await fetch(url);
        if (!res.ok) throw new Error(`List API returned ${res.status}`);

        const data: ListResponse = await res.json();
        page++;
        console.log(`Page ${page}: ${data.items.length} items`);

        for (const item of data.items) {
            const exists = await prisma.clawhub_skills.findUnique({
                where: { slug: item.slug },
                select: { id: true },
            });

            if (exists) {
                console.log(`  skip  ${item.slug}`);
                skipped++;
                continue;
            }

            const owner = await fetchOwner(item.slug);

            console.log("new Date(item.createdAt): ", new Date(item.createdAt));
            console.log("new Date(item.updatedAt): ", new Date(item.updatedAt));
            console.log("new Date(item.latestVersion?.createdAt): ", new Date(item.latestVersion?.createdAt ?? 0));

            await prisma.clawhub_skills.create({
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
                },
            });

            console.log(`  insert ${item.slug}`);
            inserted++;
        }

        cursor = data.nextCursor;
    } while (cursor);

    console.log(`\nDone! ${inserted} inserted, ${skipped} skipped.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
