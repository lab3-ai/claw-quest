import type { PrismaClient } from '@prisma/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { exchangeTelegramCode, verifyTelegramIdToken } from './telegram-oidc.utils';

interface TelegramLoginResult {
    session: { access_token: string; refresh_token: string };
    user: { id: string; email: string; username: string | null; telegramId: string; telegramUsername: string | null };
    isNewUser: boolean;
    linkedAgents: string[];
}

/**
 * Handle Telegram OIDC login: exchange code, verify JWT, find/create user, generate Supabase session.
 */
export async function handleTelegramLogin(params: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
    prisma: PrismaClient;
    supabaseAdmin: SupabaseClient;
}): Promise<TelegramLoginResult> {
    const { code, codeVerifier, redirectUri, prisma, supabaseAdmin } = params;

    // 1. Exchange code for tokens
    const tokens = await exchangeTelegramCode({ code, codeVerifier, redirectUri });

    // 2. Verify ID token
    const claims = await verifyTelegramIdToken(tokens.id_token);
    const telegramIdStr = claims.telegramId; // keep as string for Prisma compat
    const placeholderEmail = `tg_${telegramIdStr}@tg.clawquest.ai`;

    // 3. Find existing user by telegramId (cast string to bigint in SQL)
    const existingUsers = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM "User" WHERE "telegramId" = $1::bigint LIMIT 1`,
        telegramIdStr
    );
    let user = existingUsers.length > 0
        ? await prisma.user.findUnique({ where: { id: existingUsers[0].id } })
        : null;
    let isNewUser = false;

    if (!user) {
        isNewUser = true;

        // Create Supabase auth user with placeholder email
        const { data: supabaseUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: placeholderEmail,
            email_confirm: true,
            user_metadata: {
                telegramId: claims.telegramId,
                telegram_username: claims.username,
                provider: 'telegram',
                full_name: claims.name,
                avatar_url: claims.picture,
            },
        });

        if (createError) {
            // User might already exist in Supabase (e.g. from a previous failed attempt)
            if (createError.message?.includes('already been registered')) {
                // Generate a session directly — the Supabase user exists, just missing Prisma row
                const session = await generateSupabaseSession(supabaseAdmin, placeholderEmail);

                // Get the Supabase user ID from the session token
                const { data: sessionUser } = await supabaseAdmin.auth.getUser(session.access_token);
                if (!sessionUser?.user) {
                    throw new Error('Supabase user exists but session verification failed');
                }

                // Upsert Prisma user to handle race conditions
                user = await prisma.user.upsert({
                    where: { telegramId: BigInt(telegramIdStr) },
                    update: { supabaseId: sessionUser.user.id },
                    create: {
                        supabaseId: sessionUser.user.id,
                        email: placeholderEmail,
                        username: claims.username ?? `tg_${claims.telegramId}`,
                        telegramId: BigInt(telegramIdStr),
                        telegramUsername: claims.username ?? null,
                    },
                });

                // Short-circuit: we already have the session
                const linkedAgents = await autoLinkAgents(prisma, BigInt(telegramIdStr), user.id);
                return {
                    session,
                    user: {
                        id: user.id,
                        email: user.email,
                        username: user.username,
                        telegramId: String(user.telegramId),
                        telegramUsername: user.telegramUsername,
                    },
                    isNewUser: true,
                    linkedAgents,
                };
            } else {
                throw new Error(`Failed to create Supabase user: ${createError.message}`);
            }
        } else {
            // Upsert Prisma user to handle concurrent first-login race
            user = await prisma.user.upsert({
                where: { telegramId: BigInt(telegramIdStr) },
                update: { supabaseId: supabaseUser.user.id },
                create: {
                    supabaseId: supabaseUser.user.id,
                    email: placeholderEmail,
                    username: claims.username ?? `tg_${claims.telegramId}`,
                    telegramId: BigInt(telegramIdStr),
                    telegramUsername: claims.username ?? null,
                },
            });
        }
    } else {
        // Update username if changed
        if (claims.username && claims.username !== user.telegramUsername) {
            user = await prisma.user.update({
                where: { id: user.id },
                data: { telegramUsername: claims.username },
            });
        }
    }

    // 4. Auto-link agents via TelegramLink matching
    const linkedAgents = await autoLinkAgents(prisma, BigInt(telegramIdStr), user.id);

    // 5. Generate Supabase session via magiclink OTP
    const session = await generateSupabaseSession(supabaseAdmin, user.email);

    return {
        session,
        user: {
            id: user.id,
            email: user.email,
            username: user.username,
            telegramId: String(user.telegramId),
            telegramUsername: user.telegramUsername,
        },
        isNewUser,
        linkedAgents,
    };
}

/**
 * Link Telegram to an existing authenticated user account.
 */
export async function handleTelegramLink(params: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
    userId: string;
    prisma: PrismaClient;
}): Promise<{ user: { id: string; email: string; telegramId: string | null; telegramUsername: string | null }; linkedAgents: string[] }> {
    const { code, codeVerifier, redirectUri, userId, prisma } = params;

    // 1. Exchange + verify
    const tokens = await exchangeTelegramCode({ code, codeVerifier, redirectUri });
    const claims = await verifyTelegramIdToken(tokens.id_token);
    const telegramIdStr = claims.telegramId;

    // 2. Check telegramId not already linked to another user (raw query for BigInt compat)
    const existing = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM "User" WHERE "telegramId" = $1::bigint LIMIT 1`,
        telegramIdStr
    );
    if (existing.length > 0 && existing[0].id !== userId) {
        throw new Error('This Telegram account is already linked to another user');
    }

    // 3. Update user with Telegram info
    const user = await prisma.user.update({
        where: { id: userId },
        data: {
            telegramId: BigInt(telegramIdStr),
            telegramUsername: claims.username ?? null,
        },
    });

    // 4. Auto-link agents
    const linkedAgents = await autoLinkAgents(prisma, BigInt(telegramIdStr), userId);

    return {
        user: {
            id: user.id,
            email: user.email,
            telegramId: user.telegramId ? String(user.telegramId) : null,
            telegramUsername: user.telegramUsername,
        },
        linkedAgents,
    };
}

/**
 * Find unowned agents with TelegramLink matching this telegramId and claim them in batch.
 */
async function autoLinkAgents(prisma: PrismaClient, telegramId: bigint, userId: string): Promise<string[]> {
    const telegramLinks = await prisma.telegramLink.findMany({
        where: { telegramId },
        include: { agent: { select: { id: true, ownerId: true, agentname: true } } },
    });

    const unownedLinks = telegramLinks.filter(link => !link.agent.ownerId);
    if (unownedLinks.length === 0) return [];

    const agentIds = unownedLinks.map(link => link.agent.id);

    // Batch update instead of N+1
    await prisma.agent.updateMany({
        where: { id: { in: agentIds } },
        data: { ownerId: userId, claimedAt: new Date(), claimedVia: 'telegram' },
    });

    return unownedLinks.map(link => link.agent.agentname);
}

/**
 * Generate a Supabase session using admin magiclink + OTP verification.
 */
async function generateSupabaseSession(
    supabaseAdmin: SupabaseClient,
    email: string
): Promise<{ access_token: string; refresh_token: string }> {
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email,
    });

    if (linkError || !linkData?.properties?.hashed_token) {
        throw new Error(`Failed to generate magiclink: ${linkError?.message ?? 'no hashed_token'}`);
    }

    const { data: otpData, error: otpError } = await supabaseAdmin.auth.verifyOtp({
        token_hash: linkData.properties.hashed_token,
        type: 'magiclink',
    });

    if (otpError || !otpData.session) {
        throw new Error(`Failed to verify OTP: ${otpError?.message ?? 'no session returned'}`);
    }

    return {
        access_token: otpData.session.access_token,
        refresh_token: otpData.session.refresh_token,
    };
}
