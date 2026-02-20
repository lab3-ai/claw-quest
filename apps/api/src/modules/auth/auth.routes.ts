import { FastifyInstance } from 'fastify';

export async function authRoutes(app: FastifyInstance) {
    // Login & Register are handled by Supabase Auth on the frontend.
    // The API only needs /me to return the current Prisma user profile.

    app.get(
        '/me',
        {
            onRequest: [app.authenticate],
            schema: {
                tags: ['Auth'],
                summary: 'Get current user profile (requires Supabase access_token)',
                security: [{ bearerAuth: [] }],
            },
        },
        async (request) => {
            const user = await app.prisma.user.findUniqueOrThrow({
                where: { id: request.user.id },
            });

            return {
                id: user.id,
                email: user.email,
                supabaseId: user.supabaseId,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            };
        }
    );
}
