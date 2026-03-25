import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const targetId = '8563d8fe-cee0-405a-9165-e9e0f8a3d06';
    console.log(`Searching for ID: ${targetId}`);

    const user = await prisma.user.findUnique({
        where: { id: targetId },
        include: { _count: { select: { agents: true } } }
    });

    if (user) {
        console.log('User found!');
        console.log(user);
        const quests = await prisma.quest.findMany({ where: { creatorUserId: targetId } });
        console.log(`Found ${quests.length} quests for this user.`);
    } else {
        console.log('User NOT found.');
    }

    // List all users again, but carefully
    const allUsers = await prisma.user.findMany({ select: { id: true, email: true } });
    console.log('\nAll user IDs:');
    allUsers.forEach(u => console.log(`- ${u.id} (${u.email})`));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
