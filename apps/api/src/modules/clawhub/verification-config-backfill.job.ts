import { Prisma } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

const BACKFILL_INTERVAL_MS = 6 * 60 * 60 * 1000; // every 6 hours
const BATCH_SIZE = 50;

export const verificationConfigBackfillHealth = {
    running: false,
    lastRunAt: null as Date | null,
    lastError: null as string | null,
    lastUpdated: 0,
};

function buildDefaultConfig(displayName: string) {
    return {
        type: 'api_call',
        skill_display: displayName,
        task_description: `Verify that you have the ${displayName} skill installed`,
        api_endpoint: '',
        params: {},
        variable_options: {},
        submission_fields: ['result', 'ts'],
        validation: { type: 'non_empty_response' },
        install: { type: 'npx_clawhub' },
    };
}

async function runBackfill(server: FastifyInstance): Promise<void> {
    server.log.info('[verification-config:backfill] Starting...');

    let totalUpdated = 0;

    // Process in batches to avoid memory issues with 20k+ records
    while (true) {
        const batch = await server.prisma.clawhub_skills.findMany({
            where: { verification_config: { equals: Prisma.DbNull } },
            select: { id: true, slug: true, display_name: true },
            take: BATCH_SIZE,
        });

        if (batch.length === 0) break;

        for (const skill of batch) {
            await server.prisma.clawhub_skills.update({
                where: { id: skill.id },
                data: { verification_config: buildDefaultConfig(skill.display_name) },
            });
        }

        totalUpdated += batch.length;
        server.log.info(`[verification-config:backfill] Updated ${totalUpdated} so far...`);
    }

    verificationConfigBackfillHealth.lastRunAt = new Date();
    verificationConfigBackfillHealth.lastUpdated = totalUpdated;
    server.log.info(`[verification-config:backfill] Done — ${totalUpdated} skills updated`);
}

export async function startVerificationConfigBackfillJob(server: FastifyInstance): Promise<void> {
    verificationConfigBackfillHealth.running = true;
    let timer: NodeJS.Timeout | undefined;

    server.addHook('onClose', () => {
        verificationConfigBackfillHealth.running = false;
        if (timer) clearInterval(timer);
        server.log.info('[verification-config:backfill] Stopped');
    });

    // Run on startup
    runBackfill(server).catch(err => {
        verificationConfigBackfillHealth.lastError = err.message;
        server.log.error({ err }, '[verification-config:backfill] Initial run failed (non-fatal)');
    });

    // Recurring — picks up any new skills inserted without config
    timer = setInterval(() => {
        runBackfill(server).catch(err => {
            verificationConfigBackfillHealth.lastError = err.message;
            server.log.error({ err }, '[verification-config:backfill] Scheduled run failed');
        });
    }, BACKFILL_INTERVAL_MS);
}
