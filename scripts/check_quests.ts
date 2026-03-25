import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Users ---');
    const users = await prisma.user.findMany({
        select: { id: true, email: true, supabaseId: true }
    });
    console.table(users);

    console.log('\n--- Quests ---');
    const quests = await prisma.quest.findMany({
        select: { id: true, title: true, creatorUserId: true, status: true }
    });
    console.table(quests);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
