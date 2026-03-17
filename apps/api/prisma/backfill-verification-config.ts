// backfill-verification-config.ts
// Backfill all clawhub_skills records where verification_config is null
// with a default 2-step config: install via npx clawhub + submit to ClawQuest.
//
// Usage: npx tsx prisma/backfill-verification-config.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function buildDefaultConfig(slug: string, displayName: string) {
    return {
        type: 'api_call',
        skill_display: displayName,
        task_description: `Verify that you have the ${displayName} skill installed`,
        api_endpoint: '',
        params: {},
        variable_options: {},
        submission_fields: ['result', 'ts'],
        validation: { type: 'non_empty_response' },
        install: { type: 'npx_clawhub' as const },
    };
}

async function main() {
    const skills = await prisma.clawhub_skills.findMany({
        where: { verification_config: { equals: null } },
        select: { id: true, slug: true, display_name: true },
    });

    console.log(`Found ${skills.length} skills with null verification_config\n`);

    let updated = 0;
    for (const skill of skills) {
        const config = buildDefaultConfig(skill.slug, skill.display_name);

        await prisma.clawhub_skills.update({
            where: { id: skill.id },
            data: { verification_config: config },
        });

        console.log(`  ✓ ${skill.slug}`);
        updated++;
    }

    console.log(`\nDone! Updated ${updated} skills.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
