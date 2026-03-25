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
    opts: { skillSlug: string; questId?: string; userId?: string }
) {
    // skillSlug may be "owner/slug" format (e.g. "@vincent/vincent1") — extract just the slug part
    const slugPart = opts.skillSlug.includes('/')
        ? opts.skillSlug.slice(opts.skillSlug.indexOf('/') + 1)
        : opts.skillSlug;

    // If challenge is tied to a quest, check quest hasn't expired
    if (opts.questId) {
        const quest = await prisma.quest.findUnique({
            where: { id: opts.questId },
            select: { expiresAt: true, status: true },
        });
        if (!quest) throw new Error('Quest not found');
        if (quest.expiresAt && quest.expiresAt < new Date()) {
            throw new Error('Quest has expired — verification is no longer available');
        }
        if (quest.status === 'completed') {
            throw new Error('Quest is completed — verification is no longer available');
        }
    }

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
            userId: opts.userId ?? null,
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

    // Validate timestamp: must be valid, not in the future, and within challenge lifetime
    const tsDate = new Date(submission.ts);
    if (isNaN(tsDate.getTime())) {
        return { passed: false, message: 'Invalid timestamp format' };
    }
    const now = new Date();
    const toleranceMs = 2 * 60 * 1000;
    // ts must not be in the future (with tolerance for clock skew)
    if (tsDate > new Date(now.getTime() + toleranceMs)) {
        return { passed: false, message: 'Timestamp cannot be in the future' };
    }
    // ts must be after challenge was created (with tolerance)
    const earliest = new Date(challenge.createdAt.getTime() - toleranceMs);
    if (tsDate < earliest) {
        return { passed: false, message: 'Timestamp is before challenge was created' };
    }
    // ts must be before challenge expires (with tolerance)
    const latest = new Date(challenge.expiresAt.getTime() + toleranceMs);
    if (tsDate > latest) {
        return { passed: false, message: 'Timestamp is after challenge expired' };
    }

    // Validate the actual result payload, not the whole submission wrapper
    const passed = validateResult(submission.result, config);

    await prisma.skillChallenge.update({
        where: { token },
        data: { result: submission as any, passed, verifiedAt: new Date() },
    });

    if (passed && challenge.userId) {
        // Resolve full skill name from quest.requiredSkills as authoritative source
        let fullSkillName = challenge.skillSlug;
        if (challenge.questId) {
            const quest = await prisma.quest.findUnique({
                where: { id: challenge.questId },
                select: { requiredSkills: true },
            });
            const match = (quest?.requiredSkills as string[] ?? []).find(sk => {
                const slug = sk.includes('/') ? sk.slice(sk.indexOf('/') + 1) : sk;
                return slug === challenge.skillSlug;
            });
            if (match) fullSkillName = match;
        } else {
            const skillRecord = await prisma.clawhub_skills.findUnique({
                where: { slug: challenge.skillSlug },
                select: { owner_handle: true },
            });
            if (skillRecord?.owner_handle) {
                fullSkillName = `@${skillRecord.owner_handle}/${challenge.skillSlug}`;
            }
        }

        // Mark AgentSkill as verified on the user's agent (for UI display)
        const agent = await prisma.agent.findFirst({
            where: { ownerId: challenge.userId },
            orderBy: { createdAt: 'asc' },
            select: { id: true },
        });
        if (agent) {
            await prisma.agentSkill.upsert({
                where: { agentId_name: { agentId: agent.id, name: fullSkillName } },
                update: { verified: true },
                create: { agentId: agent.id, name: fullSkillName, verified: true, source: 'challenge' },
            });
        }

        // Increment tasksCompleted on the quester's participation, then auto-complete if all done
        if (challenge.questId) {
            const participation = await prisma.questParticipation.findFirst({
                where: { questId: challenge.questId, userId: challenge.userId },
                select: { id: true, tasksCompleted: true, tasksTotal: true },
            });
            if (participation) {
                const newTasksCompleted = participation.tasksCompleted + 1;
                const allDone = newTasksCompleted >= participation.tasksTotal;
                await prisma.questParticipation.update({
                    where: { id: participation.id },
                    data: {
                        tasksCompleted: newTasksCompleted,
                        ...(allDone && {
                            status: 'completed',
                            completedAt: new Date(),
                        }),
                    },
                });
            }
        }
    }

    return {
        passed,
        message: passed
            ? 'Verification passed! Skill confirmed.'
            : 'Verification failed. The result did not meet the expected criteria.',
    };
}

/** Check value is truthy — rejects null, undefined, false, 0, "", empty array */
function isTruthyValue(val: unknown): boolean {
    if (val === null || val === undefined || val === false || val === 0 || val === '') return false;
    if (Array.isArray(val)) return val.length > 0;
    return true;
}

function validateResult(result: unknown, config: VerificationConfig): boolean {
    try {
        if (config.validation.type === 'non_empty_response') {
            const path = config.validation.check_path;
            if (!path) return isTruthyValue(result);
            const parts = path.split('.');
            let val: unknown = result;
            for (const part of parts) {
                if (val == null || typeof val !== 'object') return false;
                val = (val as Record<string, unknown>)[part];
            }
            return isTruthyValue(val);
        }
        return isTruthyValue(result);
    } catch {
        return false;
    }
}
