/** Web3 Skills API routes — public browsing, authenticated submission, admin curation. */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Web3SkillListQuerySchema, Web3SkillSubmissionSchema, Web3AdminReviewSchema } from '@clawquest/shared';
import { requireAdmin } from '../admin/admin.middleware';
import { listWeb3Skills, listCategories, getSkillDetail } from './web3-skills-query.service';
import { submitSkill, listMySubmissions, listPendingReviews, reviewItem } from './web3-skills-admin.service';
import { classifyAllUnclassified } from './web3-classify.job';

export async function web3SkillsRoutes(server: FastifyInstance) {
  // Run classification on startup (non-blocking)
  classifyAllUnclassified(server).catch(err => {
    server.log.error({ err }, '[web3-skills] Initial classification failed');
  });

  // ─── Public: list web3 skills ─────────────────────────────────────────────
  server.get('/', {
    schema: { querystring: Web3SkillListQuerySchema },
  }, async (request) => {
    const query = request.query as z.infer<typeof Web3SkillListQuerySchema>;
    const data = await listWeb3Skills(server, query);
    return { data };
  });

  // ─── Public: categories with counts ───────────────────────────────────────
  server.get('/categories', async () => {
    const data = await listCategories(server);
    return { data };
  });

  // ─── Public: skill detail ─────────────────────────────────────────────────
  server.get('/:slug', {
    schema: { params: z.object({ slug: z.string() }) },
  }, async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const data = await getSkillDetail(server, slug);
    if (!data) return reply.code(404).send({ error: { message: 'Skill not found', code: 'NOT_FOUND' } });
    return { data };
  });

  // ─── Auth: submit a skill ────────────────────────────────────────────────
  server.post('/submit', {
    preHandler: [server.authenticate],
    schema: { body: Web3SkillSubmissionSchema },
  }, async (request) => {
    const body = request.body as z.infer<typeof Web3SkillSubmissionSchema>;
    const data = await submitSkill(server, request.user.id, body);
    return { data };
  });

  // ─── Auth: my submissions ────────────────────────────────────────────────
  server.get('/submissions/mine', {
    preHandler: [server.authenticate],
  }, async (request) => {
    const data = await listMySubmissions(server, request.user.id);
    return { data };
  });

  // ─── Admin: pending reviews ──────────────────────────────────────────────
  server.get('/admin/pending', {
    preHandler: [server.authenticate, requireAdmin],
  }, async () => {
    const data = await listPendingReviews(server);
    return { data };
  });

  // ─── Admin: review item ──────────────────────────────────────────────────
  server.patch('/admin/:id/review', {
    preHandler: [server.authenticate, requireAdmin],
    schema: {
      params: z.object({ id: z.string() }),
      body: Web3AdminReviewSchema,
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as z.infer<typeof Web3AdminReviewSchema>;
    const data = await reviewItem(server, id, request.user.id, body);
    if (!data) return reply.code(404).send({ error: { message: 'Item not found', code: 'NOT_FOUND' } });
    return { data };
  });
}
