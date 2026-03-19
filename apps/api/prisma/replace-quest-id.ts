/**
 * Replace a Quest's ID with a new ID.
 * Updates all FK references across related tables.
 *
 * Usage:
 *   cd apps/api
 *   npx tsx prisma/replace-quest-id.ts <OLD_ID> <NEW_ID>
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const [oldId, newId] = process.argv.slice(2);

  if (!oldId || !newId) {
    console.error('Usage: npx tsx prisma/replace-quest-id.ts <OLD_ID> <NEW_ID>');
    process.exit(1);
  }

  if (oldId === newId) {
    console.error('Old and new IDs are the same. Nothing to do.');
    process.exit(1);
  }

  // Verify old quest exists
  const oldQuest = await prisma.quest.findUnique({ where: { id: oldId } });
  if (!oldQuest) {
    console.error(`Quest "${oldId}" not found.`);
    process.exit(1);
  }

  // Verify new ID doesn't already exist
  const existing = await prisma.quest.findUnique({ where: { id: newId } });
  if (existing) {
    console.error(`Quest with ID "${newId}" already exists.`);
    process.exit(1);
  }

  console.log(`Replacing quest ID: ${oldId} → ${newId}`);
  console.log(`Quest: "${oldQuest.title}" (status: ${oldQuest.status})`);

  // Count related records
  const [collaborators, deposits, participations, challenges] = await Promise.all([
    prisma.questCollaborator.count({ where: { questId: oldId } }),
    prisma.questDeposit.count({ where: { questId: oldId } }),
    prisma.questParticipation.count({ where: { questId: oldId } }),
    prisma.skillChallenge.count({ where: { questId: oldId } }),
  ]);
  const depositsEscrow = await prisma.questDeposit.count({ where: { escrowQuestId: oldId } });

  console.log(`Related records: collaborators=${collaborators}, deposits=${deposits}, participations=${participations}, challenges=${challenges}, escrowDeposits=${depositsEscrow}`);

  // Use raw SQL in a transaction since Prisma doesn't allow PK updates
  // Use $executeRawUnsafe for SET CONSTRAINTS (not parameterizable)
  await prisma.$transaction(async (tx) => {
    // Defer all FK constraint checks until end of transaction
    await tx.$executeRawUnsafe(`SET CONSTRAINTS ALL DEFERRED`);

    // 1. Update the Quest PK first (constraints deferred, so FKs won't fail)
    await tx.$executeRaw`UPDATE "Quest" SET "id" = ${newId} WHERE "id" = ${oldId}`;
    console.log(`  ✓ Quest.id updated`);

    // 2. Update all FK references
    if (collaborators > 0) {
      await tx.$executeRaw`UPDATE "QuestCollaborator" SET "questId" = ${newId} WHERE "questId" = ${oldId}`;
      console.log(`  ✓ QuestCollaborator: ${collaborators} rows`);
    }

    if (deposits > 0) {
      await tx.$executeRaw`UPDATE "QuestDeposit" SET "questId" = ${newId} WHERE "questId" = ${oldId}`;
      console.log(`  ✓ QuestDeposit.questId: ${deposits} rows`);
    }

    if (depositsEscrow > 0) {
      await tx.$executeRaw`UPDATE "QuestDeposit" SET "escrowQuestId" = ${newId} WHERE "escrowQuestId" = ${oldId}`;
      console.log(`  ✓ QuestDeposit.escrowQuestId: ${depositsEscrow} rows`);
    }

    if (participations > 0) {
      await tx.$executeRaw`UPDATE "QuestParticipation" SET "questId" = ${newId} WHERE "questId" = ${oldId}`;
      console.log(`  ✓ QuestParticipation: ${participations} rows`);
    }

    if (challenges > 0) {
      await tx.$executeRaw`UPDATE "SkillChallenge" SET "questId" = ${newId} WHERE "questId" = ${oldId}`;
      console.log(`  ✓ SkillChallenge: ${challenges} rows`);
    }

    const escrowRefs = await tx.$executeRaw`UPDATE "Quest" SET "escrowQuestId" = ${newId} WHERE "escrowQuestId" = ${oldId}`;
    if (escrowRefs > 0) {
      console.log(`  ✓ Quest.escrowQuestId refs: ${escrowRefs} rows`);
    }
    // Constraints validated at COMMIT
  });

  // Verify
  const updated = await prisma.quest.findUnique({ where: { id: newId } });
  if (updated) {
    console.log(`\nDone! Quest "${updated.title}" now has ID: ${newId}`);
  } else {
    console.error('\nERROR: Verification failed — quest not found with new ID.');
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error('Failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
