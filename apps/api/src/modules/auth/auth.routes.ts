import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { RegisterSchema, LoginSchema, AuthResponse } from '@clawquest/shared';
import { hashPassword, verifyPassword } from '../../utils/passwords';

export async function authRoutes(app: FastifyInstance) {
    const server = app.withTypeProvider<ZodTypeProvider>();

    server.post<{ Body: typeof RegisterSchema; Reply: AuthResponse }>(
        '/register',
        {
            schema: {
                body: RegisterSchema,
                tags: ['Auth'],
                summary: 'Register a new user',
            },
        },
        async (request, reply) => {
            const { email, password } = request.body;

            // Check existing
            const existing = await server.prisma.user.findUnique({
                where: { email },
            });

            if (existing) {
                return reply.status(409).send({
                    message: 'User already exists',
                    code: 'USER_EXISTS',
                } as any);
            }

            // Hash password
            const passwordHash = await hashPassword(password);

            // Create user
            const user = await server.prisma.user.create({
                data: {
                    email,
                    password: passwordHash,
                },
            });

            // Sign token
            const token = app.jwt.sign({
                id: user.id,
                email: user.email,
            });

            return {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt,
                },
            };
        }
    );

    server.post<{ Body: typeof LoginSchema; Reply: AuthResponse }>(
        '/login',
        {
            schema: {
                body: LoginSchema,
                tags: ['Auth'],
                summary: 'Login with email and password',
            },
        },
        async (request, reply) => {
            const { email, password } = request.body;

            // Find user
            const user = await server.prisma.user.findUnique({
                where: { email },
            });

            if (!user || !user.password) {
                return reply.status(401).send({
                    message: 'Invalid credentials',
                    code: 'INVALID_CREDENTIALS',
                } as any);
            }

            // Verify password
            const isValid = await verifyPassword(password, user.password);

            if (!isValid) {
                return reply.status(401).send({
                    message: 'Invalid credentials',
                    code: 'INVALID_CREDENTIALS',
                } as any);
            }

            // Sign token
            const token = app.jwt.sign({
                id: user.id,
                email: user.email,
            });

            return {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt,
                },
            };
        }
    );

    server.get(
        '/me',
        {
            onRequest: [app.authenticate],
            schema: {
                tags: ['Auth'],
                summary: 'Get current user profile',
                security: [{ bearerAuth: [] }],
            },
        },
        async (request) => {
            const user = await server.prisma.user.findUniqueOrThrow({
                where: { id: request.user.id },
            });

            return {
                id: user.id,
                email: user.email,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            };
        }
    );
}
