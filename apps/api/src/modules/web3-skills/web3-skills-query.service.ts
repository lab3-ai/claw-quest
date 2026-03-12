/** Public query logic for Web3 Skills — list, detail, categories. */

import type { FastifyInstance } from 'fastify';
import type { Web3SkillListQuery } from '@clawquest/shared';
import { WEB3_CATEGORIES } from './web3-categories';

// ─── Unified skill item shape returned to clients ─────────────────────────────
interface SkillListItem {
  slug: string;
  name: string;
  summary: string | null;
  category: string | null;
  source: 'clawhub' | 'community';
  featured: boolean;
  downloads: number;
  stars: number;
  installs: number;
  version: string | null;
  ownerHandle: string | null;
  ownerDisplayName: string | null;
  ownerImage: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  createdAt: string;
}

// ─── List web3 skills (paginated, filtered, sorted) ──────────────────────────
export async function listWeb3Skills(server: FastifyInstance, query: Web3SkillListQuery) {
  const { page, limit, category, q, sort, source } = query;
  const skip = (page - 1) * limit;

  const items: SkillListItem[] = [];
  let total = 0;

  // ClawHub skills
  if (source === 'all' || source === 'clawhub') {
    const where: Record<string, unknown> = { is_web3: true };
    if (category) where.web3_category = category;
    if (q) where.OR = [
      { display_name: { contains: q, mode: 'insensitive' } },
      { summary: { contains: q, mode: 'insensitive' } },
    ];

    const orderBy = sort === 'newest'
      ? { clawhub_created_at: 'desc' as const }
      : sort === 'stars'
        ? { stars: 'desc' as const }
        : { downloads: 'desc' as const };

    const [rows, count] = await Promise.all([
      server.prisma.clawhub_skills.findMany({
        where,
        orderBy: [{ featured: 'desc' }, { featured_order: 'asc' }, orderBy],
        skip: source === 'all' ? undefined : skip,
        take: source === 'all' ? undefined : limit,
      }),
      server.prisma.clawhub_skills.count({ where }),
    ]);

    for (const r of rows) {
      items.push({
        slug: r.slug, name: r.display_name, summary: r.summary,
        category: r.web3_category, source: 'clawhub', featured: r.featured,
        downloads: r.downloads, stars: r.stars, installs: r.installs_all_time,
        version: r.latest_version, ownerHandle: r.owner_handle,
        ownerDisplayName: r.owner_display_name, ownerImage: r.owner_image,
        logoUrl: null, websiteUrl: null,
        createdAt: (r.clawhub_created_at ?? r.crawled_at).toISOString(),
      });
    }
    total += count;
  }

  // Community submissions (approved only)
  if (source === 'all' || source === 'community') {
    const where: Record<string, unknown> = { status: 'approved' };
    if (category) where.category = category;
    if (q) where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { summary: { contains: q, mode: 'insensitive' } },
    ];

    const orderBy = sort === 'newest'
      ? { created_at: 'desc' as const }
      : { created_at: 'desc' as const };

    const [rows, count] = await Promise.all([
      server.prisma.web3_skill_submissions.findMany({
        where, orderBy,
        skip: source === 'all' ? undefined : skip,
        take: source === 'all' ? undefined : limit,
        include: { submitter: { select: { displayName: true, username: true } } },
      }),
      server.prisma.web3_skill_submissions.count({ where }),
    ]);

    for (const r of rows) {
      items.push({
        slug: r.slug, name: r.name, summary: r.summary,
        category: r.category, source: 'community', featured: false,
        downloads: 0, stars: 0, installs: 0, version: null,
        ownerHandle: r.submitter.username, ownerDisplayName: r.submitter.displayName,
        ownerImage: null, logoUrl: r.logo_url, websiteUrl: r.website_url,
        createdAt: r.created_at.toISOString(),
      });
    }
    total += count;
  }

  // Sort combined results — featured first, then by sort criteria
  items.sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    if (sort === 'popular') return b.downloads - a.downloads;
    if (sort === 'stars') return b.stars - a.stars;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const paginated = source === 'all' ? items.slice(skip, skip + limit) : items;
  const totalPages = Math.ceil(total / limit);

  return { items: paginated, total, page, limit, totalPages };
}

// ─── Categories with counts ──────────────────────────────────────────────────
export async function listCategories(server: FastifyInstance) {
  const results: Array<{ name: string; count: number }> = [];

  for (const cat of WEB3_CATEGORIES) {
    const count = await server.prisma.clawhub_skills.count({
      where: { is_web3: true, web3_category: cat },
    });
    if (count > 0) results.push({ name: cat, count });
  }

  const communityCounts = await server.prisma.web3_skill_submissions.groupBy({
    by: ['category'],
    where: { status: 'approved' },
    _count: true,
  });
  for (const cc of communityCounts) {
    const existing = results.find(r => r.name === cc.category);
    if (existing) existing.count += cc._count;
    else results.push({ name: cc.category, count: cc._count });
  }

  return results.sort((a, b) => b.count - a.count);
}

// ─── Single skill detail ────────────────────────────────────────────────────
export async function getSkillDetail(server: FastifyInstance, slug: string) {
  const clawhub = await server.prisma.clawhub_skills.findUnique({ where: { slug } });

  if (clawhub && clawhub.is_web3) {
    return {
      slug: clawhub.slug, name: clawhub.display_name, summary: clawhub.summary,
      description: null, category: clawhub.web3_category, source: 'clawhub' as const,
      featured: clawhub.featured, downloads: clawhub.downloads, stars: clawhub.stars,
      installs: clawhub.installs_all_time, version: clawhub.latest_version,
      ownerHandle: clawhub.owner_handle, ownerDisplayName: clawhub.owner_display_name,
      ownerImage: clawhub.owner_image, logoUrl: null, websiteUrl: null, githubUrl: null,
      tags: typeof clawhub.tags === 'object' && clawhub.tags ? Object.keys(clawhub.tags as Record<string, string>) : [],
      createdAt: (clawhub.clawhub_created_at ?? clawhub.crawled_at).toISOString(),
    };
  }

  const submission = await server.prisma.web3_skill_submissions.findUnique({
    where: { slug },
    include: { submitter: { select: { displayName: true, username: true } } },
  });

  if (submission && submission.status === 'approved') {
    return {
      slug: submission.slug, name: submission.name, summary: submission.summary,
      description: submission.description, category: submission.category,
      source: 'community' as const, featured: false, downloads: 0, stars: 0, installs: 0,
      version: null, ownerHandle: submission.submitter.username,
      ownerDisplayName: submission.submitter.displayName, ownerImage: null,
      logoUrl: submission.logo_url, websiteUrl: submission.website_url,
      githubUrl: submission.github_url, tags: submission.tags,
      createdAt: submission.created_at.toISOString(),
    };
  }

  return null;
}
