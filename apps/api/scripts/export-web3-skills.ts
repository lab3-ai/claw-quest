/** One-time export: reset classifications, re-run, export web3 skills to JSON. */

import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { classifySkill } from '../src/modules/web3-skills/web3-classify.job';

const prisma = new PrismaClient();

async function main() {
  // Step 1: Reset all classifications in one query
  const { count: resetCount } = await prisma.clawhub_skills.updateMany({
    data: { is_web3: false, web3_auto_detected: false, web3_category: null },
  });
  console.log(`[reset] Reset ${resetCount} skills`);

  // Step 2: Fetch all skills, classify in memory, batch update only web3 ones
  const allSkills = await prisma.clawhub_skills.findMany({
    select: { id: true, slug: true, display_name: true, summary: true, tags: true },
  });

  const web3Skills: Array<{ id: string; category: string | null }> = [];
  for (const skill of allSkills) {
    const { isWeb3, category } = classifySkill(skill);
    if (isWeb3) web3Skills.push({ id: skill.id, category });
  }

  console.log(`[classify] ${web3Skills.length} / ${allSkills.length} skills classified as web3`);

  // Batch update in chunks of 500 using $transaction
  const CHUNK = 500;
  for (let i = 0; i < web3Skills.length; i += CHUNK) {
    const chunk = web3Skills.slice(i, i + CHUNK);
    await prisma.$transaction(
      chunk.map(s => prisma.clawhub_skills.update({
        where: { id: s.id },
        data: { web3_auto_detected: true, web3_category: s.category, is_web3: true },
      }))
    );
    console.log(`  updated ${Math.min(i + CHUNK, web3Skills.length)} / ${web3Skills.length}`);
  }

  // Step 3: Export
  const skills = await prisma.clawhub_skills.findMany({
    where: { is_web3: true },
    select: {
      slug: true, display_name: true, summary: true, web3_category: true, tags: true,
      downloads: true, stars: true, installs_all_time: true, installs_current: true,
      owner_handle: true, owner_display_name: true, owner_image: true,
      latest_version: true, clawhub_created_at: true, clawhub_updated_at: true,
    },
    orderBy: { downloads: 'desc' },
  });

  const outPath = resolve(__dirname, '../../exports/web3-skills.json');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(skills, null, 2));
  console.log(`[export] Exported ${skills.length} skills to ${outPath}`);

  // Step 4: Stats
  console.log('\n── Top 20 by downloads ──');
  for (const s of skills.slice(0, 20)) {
    console.log(`  ${s.downloads.toLocaleString().padStart(8)}  ${(s.web3_category ?? 'Other').padEnd(16)}  ${s.display_name}`);
  }

  console.log('\n── Category breakdown ──');
  const cats: Record<string, number> = {};
  for (const s of skills) {
    const cat = s.web3_category ?? 'Other';
    cats[cat] = (cats[cat] ?? 0) + 1;
  }
  Object.entries(cats).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
    console.log(`  ${count.toString().padStart(5)}  ${cat}`);
  });
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
