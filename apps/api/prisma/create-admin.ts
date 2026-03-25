/**
 * Script: create-admin.ts
 * Creates (or resets) the default admin user directly in the DB.
 * No Supabase API calls — DB only.
 *
 * Usage:
 *   cd clawquest/apps/api
 *   pnpm exec tsx prisma/create-admin.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const ADMIN_EMAIL = 'admin-clawquest@clawquest.ai';
const ADMIN_PASSWORD = 'clawquest2026';

async function main() {
    const prisma = new PrismaClient();

    try {
        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);

        console.log(`\nUpserting admin user: ${ADMIN_EMAIL} …`);

        const user = await prisma.user.upsert({
            where: { email: ADMIN_EMAIL },
            update: {
                role: 'admin',
                password: hashedPassword,
            },
            create: {
                email: ADMIN_EMAIL,
                displayName: 'ClawQuest Admin',
                role: 'admin',
                password: hashedPassword,
            },
            select: { id: true, email: true, role: true },
        });

        console.log('\n✅  Admin user ready:');
        console.log(`   Email    : ${user.email}`);
        console.log(`   Password : ${ADMIN_PASSWORD}`);
        console.log(`   Role     : ${user.role}`);
        console.log(`   DB id    : ${user.id}`);
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((err) => {
    console.error('❌  Error:', err.message ?? err);
    process.exit(1);
});
