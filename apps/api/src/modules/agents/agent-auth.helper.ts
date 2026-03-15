import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

/**
 * Authenticates an agent by their cq_ API key from Authorization header.
 * Returns { agentId, ownerId } or sends 401/403 and returns null.
 */
export async function authenticateAgent(
    server: FastifyInstance & { prisma: any },
    request: FastifyRequest,
    reply: FastifyReply
): Promise<{ agentId: string; ownerId: string | null } | null | undefined> {
    const auth = request.headers.authorization;
    if (!auth?.startsWith('Bearer cq_')) {
        reply.status(401).send({ error: 'Missing or invalid agent API key' });
        return null;
    }
    const apiKey = auth.slice(7); // strip "Bearer "
    const agent = await server.prisma.agent.findUnique({
        where: { agentApiKey: apiKey },
        select: { id: true, ownerId: true, isActive: true },
    });
    if (!agent) {
        reply.status(401).send({ error: 'Invalid agent API key' });
        return null;
    }
    // Block inactive agents — only the active agent per user can call APIs
    if (agent.ownerId && !agent.isActive) {
        reply.status(403).send({ error: 'This agent is not active. Ask your human owner to activate it on the Dashboard.' });
        return null;
    }
    return { agentId: agent.id, ownerId: agent.ownerId as string | null };
}
