/**
 * Backfill script: populate username for existing users from email prefix.
 *
 * Run with:
 *   npx tsx prisma/backfill-username.ts
 *
 * Safe to run multiple times — skips users who already have a username.
 * Handles duplicate email prefixes by appending a numeric suffix.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const usersWithoutUsername = await prisma.user.findMany({
        where: { username: null },
        select: { id: true, email: true },
    });

    if (usersWithoutUsername.length === 0) {
        console.log('All users already have a username. Nothing to do.');
        return;
    }

    console.log(`Found ${usersWithoutUsername.length} user(s) without username. Backfilling...`);

    let updated = 0;
    let skipped = 0;

    for (const user of usersWithoutUsername) {
        const baseUsername = user.email.split('@')[0].toLowerCase();
        let candidate = baseUsername;
        let suffix = 1;

        // Find a unique username
        while (true) {
            const existing = await prisma.user.findUnique({
                where: { username: candidate },
                select: { id: true },
            });
            if (!existing || existing.id === user.id) break;
            candidate = `${baseUsername}${suffix}`;
            suffix++;
        }

        try {
            await prisma.user.update({
                where: { id: user.id },
                data: { username: candidate },
            });
            console.log(`  ✓ ${user.email} → @${candidate}`);
            updated++;
        } catch (err: any) {
            console.error(`  ✗ ${user.email}: ${err.message}`);
            skipped++;
        }
    }

    console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
