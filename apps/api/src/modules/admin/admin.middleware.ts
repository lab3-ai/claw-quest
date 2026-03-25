import { FastifyRequest, FastifyReply } from 'fastify';

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user || request.user.role !== 'admin') {
        return reply.status(403).send({
            message: 'Admin access required',
            code: 'FORBIDDEN',
        });
    }
}
