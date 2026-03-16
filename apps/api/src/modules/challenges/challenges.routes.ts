// challenges.routes.ts
// Routes for skill challenge verification (GET + POST /verify/:token).
// Challenge *creation* is handled by quests.routes.ts (JWT auth).
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { getChallengeMarkdown, submitChallengeResult } from './challenges.service';

export async function challengesRoutes(app: FastifyInstance) {
    const server = app.withTypeProvider<ZodTypeProvider>();

    // ── GET /verify/:token — get challenge as markdown (public) ─────────────
    // Returns text/markdown so agents can fetch and run the embedded bash script directly.
    server.get(
        '/verify/:token',
        {
            schema: {
                tags: ['Challenges'],
                summary: 'Get skill verification challenge as markdown with runnable bash script',
                params: z.object({ token: z.string() }),
            },
        },
        async (request, reply) => {
            const { token } = request.params;
            const markdown = await getChallengeMarkdown(server.prisma, token);

            if (!markdown) {
                return reply
                    .status(404)
                    .header('Content-Type', 'text/markdown; charset=utf-8')
                    .send('# Challenge Not Found\n\nThis challenge does not exist or has expired.');
            }

            return reply
                .status(200)
                .header('Content-Type', 'text/markdown; charset=utf-8')
                .send(markdown);
        }
    );

    // ── POST /verify/:token — submit result (public, token is the secret) ───
    server.post(
        '/verify/:token',
        {
            schema: {
                tags: ['Challenges'],
                summary: 'Submit skill verification result',
                params: z.object({ token: z.string() }),
                body: z.object({
                    result: z.unknown(),
                    ts: z.string(),
                }),
                response: {
                    200: z.object({ passed: z.boolean(), message: z.string() }),
                },
            },
        },
        async (request, reply) => {
            const { token } = request.params;
            const { result, ts } = request.body as any;
            const outcome = await submitChallengeResult(server.prisma, token, { result, ts });
            return reply.status(200).send(outcome);
        }
    );
}
