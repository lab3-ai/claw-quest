/** Admin + submission logic for Web3 Skills — submit, review, pending list, my submissions. */

import type { FastifyInstance } from 'fastify';
import type { Web3AdminReview } from '@clawquest/shared';

// ─── Submit a skill ──────────────────────────────────────────────────────────
export async function submitSkill(
  server: FastifyInstance,
  userId: string,
  data: { name: string; summary: string; description?: string; website_url?: string; github_url?: string; logo_url?: string; category: string; tags: string[] },
) {
  // Generate slug from name
  let slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  // Check uniqueness across both tables
  const existsClawhub = await server.prisma.clawhub_skills.findUnique({ where: { slug }, select: { id: true } });
  const existsSubmission = await server.prisma.web3_skill_submissions.findUnique({ where: { slug }, select: { id: true } });

  if (existsClawhub || existsSubmission) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  return server.prisma.web3_skill_submissions.create({
    data: {
      name: data.name,
      slug,
      summary: data.summary,
      description: data.description,
      website_url: data.website_url,
      github_url: data.github_url,
      logo_url: data.logo_url,
      category: data.category,
      tags: data.tags,
      submitted_by: userId,
    },
  });
}

// ─── My submissions ──────────────────────────────────────────────────────────
export async function listMySubmissions(server: FastifyInstance, userId: string) {
  return server.prisma.web3_skill_submissions.findMany({
    where: { submitted_by: userId },
    orderBy: { created_at: 'desc' },
  });
}

// ─── Admin: pending items ────────────────────────────────────────────────────
export async function listPendingReviews(server: FastifyInstance) {
  const submissions = await server.prisma.web3_skill_submissions.findMany({
    where: { status: 'pending' },
    orderBy: { created_at: 'asc' },
    include: { submitter: { select: { displayName: true, email: true } } },
  });

  return { submissions };
}

// ─── Admin: review (approve/reject/override) ────────────────────────────────
export async function reviewItem(
  server: FastifyInstance,
  itemId: string,
  adminId: string,
  review: Web3AdminReview,
) {
  // Try as submission first
  const submission = await server.prisma.web3_skill_submissions.findUnique({ where: { id: itemId } });
  if (submission) {
    const status = review.action === 'approve' ? 'approved' : review.action === 'reject' ? 'rejected' : submission.status;
    return server.prisma.web3_skill_submissions.update({
      where: { id: itemId },
      data: {
        status,
        category: review.category ?? submission.category,
        reviewed_by: adminId,
        reviewed_at: new Date(),
        review_note: review.review_note,
      },
    });
  }

  // Try as clawhub skill (override)
  const skill = await server.prisma.clawhub_skills.findUnique({ where: { id: itemId } });
  if (skill) {
    const adminOverride = review.is_web3 ?? null;
    const isWeb3 = adminOverride !== null ? adminOverride : skill.web3_auto_detected;

    return server.prisma.clawhub_skills.update({
      where: { id: itemId },
      data: {
        web3_admin_override: adminOverride,
        is_web3: isWeb3,
        web3_category: review.category ?? skill.web3_category,
        featured: review.featured ?? skill.featured,
        featured_order: review.featured_order ?? skill.featured_order,
      },
    });
  }

  return null;
}
