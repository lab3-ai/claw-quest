import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { QUEST_STATUS } from '@clawquest/shared';

const SITE_URL = 'https://clawquest.ai';
const SITEMAP_CACHE_SECONDS = 3600; // 1 hour

export async function seoRoutes(server: FastifyInstance) {
    // ── GET /seo/sitemap.xml — Dynamic sitemap with all public quests ────────
    server.get('/sitemap.xml', async (_request, reply) => {
        const quests = await server.prisma.quest.findMany({
            where: {
                status: { in: [QUEST_STATUS.LIVE, QUEST_STATUS.COMPLETED] },
            },
            select: { id: true, updatedAt: true },
            orderBy: { updatedAt: 'desc' },
        });

        const staticUrls = [
            { loc: `${SITE_URL}/quests`, changefreq: 'daily', priority: '1.0' },
            { loc: `${SITE_URL}/login`, changefreq: 'monthly', priority: '0.3' },
            { loc: `${SITE_URL}/register`, changefreq: 'monthly', priority: '0.3' },
            { loc: `${SITE_URL}/privacy.html`, changefreq: 'yearly', priority: '0.1' },
            { loc: `${SITE_URL}/terms.html`, changefreq: 'yearly', priority: '0.1' },
        ];

        const questUrls = quests.map((q) => ({
            loc: `${SITE_URL}/quests/${q.id}`,
            lastmod: q.updatedAt.toISOString().split('T')[0],
            changefreq: 'weekly',
            priority: '0.8',
        }));

        const urls = [...staticUrls, ...questUrls];

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
    .map(
        (u) => `  <url>
    <loc>${u.loc}</loc>
    ${('lastmod' in u && u.lastmod) ? `<lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
    )
    .join('\n')}
</urlset>`;

        reply
            .header('Content-Type', 'application/xml; charset=utf-8')
            .header('Cache-Control', `public, max-age=${SITEMAP_CACHE_SECONDS}`)
            .send(xml);
    });

    // ── GET /seo/og/:questId — OG meta HTML for social crawlers ─────────────
    server.get<{ Params: { questId: string } }>(
        '/og/:questId',
        {
            schema: {
                params: z.object({ questId: z.string().uuid() }),
            },
        },
        async (request, reply) => {
            const { questId } = request.params;
            const quest = await server.prisma.quest.findUnique({
                where: { id: questId },
                select: {
                    id: true,
                    title: true,
                    description: true,
                    sponsor: true,
                    rewardAmount: true,
                    rewardType: true,
                    type: true,
                    status: true,
                },
            });

            if (!quest) {
                reply.status(404).send({ error: { message: 'Quest not found', code: 'NOT_FOUND' } });
                return;
            }

            const title = `${quest.title} | ClawQuest`;
            const description =
                quest.description?.slice(0, 155) ||
                `${quest.sponsor} quest — ${quest.rewardAmount} ${quest.rewardType} reward`;
            const url = `${SITE_URL}/quests/${quest.id}`;
            const image = `${SITE_URL}/og-image.png`;

            const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="ClawQuest" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${image}" />
  <script>window.location.replace("${url}");</script>
</head>
<body>
  <p>Redirecting to <a href="${url}">${escapeHtml(quest.title)}</a>...</p>
</body>
</html>`;

            reply.header('Content-Type', 'text/html; charset=utf-8').send(html);
        }
    );
}

/** Escape HTML special chars to prevent XSS in meta tags */
function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
