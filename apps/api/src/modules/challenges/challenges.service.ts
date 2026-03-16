// challenges.service.ts
// Business logic for creating, fetching, and verifying skill challenges.
import { randomBytes } from 'crypto';
import type { PrismaClient } from '@prisma/client';
import {
    type VerificationConfig,
    resolveChallenge,
    generateMarkdown,
} from './challenge-generator';

const CHALLENGE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

// API_BASE_URL: public URL of this API server
// Add to .env.example: API_BASE_URL=http://localhost:3000
const API_BASE_URL = process.env.API_BASE_URL ?? 'https://api.clawquest.ai';

function generateToken(): string {
    return 'cq_ch_' + randomBytes(8).toString('hex');
}

export async function createChallenge(
    prisma: PrismaClient,
    opts: { skillSlug: string; questId?: string; agentId?: string }
) {
    // skillSlug may be "owner/slug" format (e.g. "@vincent/vincent1") — extract just the slug part
    const slugPart = opts.skillSlug.includes('/')
        ? opts.skillSlug.slice(opts.skillSlug.indexOf('/') + 1)
        : opts.skillSlug;

    const skill = await prisma.clawhub_skills.findUnique({
        where: { slug: slugPart },
        select: { display_name: true, verification_config: true },
    });

    if (!skill) throw new Error(`Skill not found: ${slugPart}`);
    if (!skill.verification_config) {
        throw new Error(`Skill "${slugPart}" has no verification_config set`);
    }

    const config = skill.verification_config as unknown as VerificationConfig;
    const { params, taskDescription } = resolveChallenge(config);
    const token = generateToken();
    const expiresAt = new Date(Date.now() + CHALLENGE_EXPIRY_MS);

    const challenge = await prisma.skillChallenge.create({
        data: {
            token,
            skillSlug: slugPart,
            questId: opts.questId ?? null,
            agentId: opts.agentId ?? null,
            params,
            expiresAt,
        },
    });

    const verifyUrl = `${process.env.FRONTEND_URL ?? 'https://clawquest.ai'}/verify/${token}`;
    return { token, verifyUrl, challenge };
}

export async function getChallengeMarkdown(
    prisma: PrismaClient,
    token: string
): Promise<string | null> {
    const challenge = await prisma.skillChallenge.findUnique({ where: { token } });
    if (!challenge) return null;
    if (challenge.expiresAt < new Date()) return null;

    const skill = await prisma.clawhub_skills.findUnique({
        where: { slug: challenge.skillSlug },
        select: { display_name: true, verification_config: true },
    });
    if (!skill?.verification_config) return null;

    const config = skill.verification_config as unknown as VerificationConfig;
    const params = challenge.params as Record<string, string | number>;

    // Build task description from stored params (deterministic, not random again)
    const paramStr = Object.entries(params).map(([k, v]) => `${k}=${v}`).join(', ');
    const taskDescription = `${config.task_description} (${paramStr})`;

    return generateMarkdown({
        token,
        skillSlug: challenge.skillSlug,
        skillDisplay: skill.display_name,
        taskDescription,
        apiEndpoint: config.api_endpoint,
        params,
        submitUrl: `${API_BASE_URL}/verify/${token}`,
        expiresAt: challenge.expiresAt,
    });
}

export async function submitChallengeResult(
    prisma: PrismaClient,
    token: string,
    submission: { result: unknown; ts: string }
): Promise<{ passed: boolean; message: string }> {
    const challenge = await prisma.skillChallenge.findUnique({ where: { token } });

    if (!challenge) return { passed: false, message: 'Challenge not found' };
    if (challenge.verifiedAt) return { passed: false, message: 'Challenge already submitted' };
    if (challenge.expiresAt < new Date()) return { passed: false, message: 'Challenge expired' };

    const skill = await prisma.clawhub_skills.findUnique({
        where: { slug: challenge.skillSlug },
        select: { verification_config: true },
    });
    if (!skill?.verification_config) {
        return { passed: false, message: 'Skill verification not configured' };
    }

    const config = skill.verification_config as unknown as VerificationConfig;
    const passed = validateResult(submission, config);

    await prisma.skillChallenge.update({
        where: { token },
        data: { result: submission as any, passed, verifiedAt: new Date() },
    });

    if (passed) {
        // Mark AgentSkill as verified
        if (challenge.agentId) {
            await prisma.agentSkill.updateMany({
                where: { agentId: challenge.agentId, name: challenge.skillSlug },
                data: { verified: true },
            });
        }

        // Increment QuestParticipation.tasksCompleted
        if (challenge.questId && challenge.agentId) {
            await prisma.questParticipation.updateMany({
                where: { questId: challenge.questId, agentId: challenge.agentId },
                data: { tasksCompleted: { increment: 1 } },
            });
        }
    }

    return {
        passed,
        message: passed
            ? 'Verification passed! Skill confirmed.'
            : 'Verification failed. The result did not meet the expected criteria.',
    };
}

function validateResult(result: unknown, config: VerificationConfig): boolean {
    try {
        if (config.validation.type === 'non_empty_response') {
            const path = config.validation.check_path;
            if (!path) return result !== null && result !== undefined;
            const parts = path.split('.');
            let val: unknown = result;
            for (const part of parts) {
                if (val == null || typeof val !== 'object') return false;
                val = (val as Record<string, unknown>)[part];
            }
            if (Array.isArray(val)) return val.length > 0;
            return val !== null && val !== undefined;
        }
        return result !== null && result !== undefined;
    } catch {
        return false;
    }
}
