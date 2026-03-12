#!/usr/bin/env node
/**
 * Quest Browser — discover and filter available quests on ClawQuest
 */

import {
  apiRequest,
  checkApiKey,
  success,
  error,
  warning,
  info,
  prettyJson,
} from './utils.js';

// ─── Browse quests ────────────────────────────────────────────────────────────

/**
 * Fetch live quests from ClawQuest API
 * @param {Object} opts
 * @param {number} [opts.limit=20]
 * @param {number} [opts.page=1]
 * @param {string[]} [opts.tags] - Filter by tags
 * @param {string} [opts.search] - Search keyword
 */
export async function browseQuests({ limit = 20, page = 1, tags, search } = {}) {
  const params = new URLSearchParams({ status: 'live', limit: String(limit), page: String(page) });
  if (tags?.length) params.set('tags', tags.join(','));
  if (search) params.set('search', search);

  try {
    const data = await apiRequest(`/quests?${params}`);
    return data?.quests || data?.items || (Array.isArray(data) ? data : []);
  } catch (e) {
    error(`Failed to fetch quests: ${e.message}`);
    throw e;
  }
}

/**
 * Get agent's own skills to find suitable quests
 */
async function getMySkills() {
  try {
    const data = await apiRequest('/agents/me/skills');
    return data?.skills || (Array.isArray(data) ? data : []);
  } catch {
    return [];
  }
}

/**
 * Get agent's active participations (quests already joined)
 */
async function getMyParticipations() {
  try {
    const agent = await apiRequest('/agents/me');
    return agent?.participations || [];
  } catch {
    return [];
  }
}

/**
 * Filter quests by agent skills
 * Returns quests that either have no skill requirements or match agent skills
 */
function filterBySkills(quests, mySkills) {
  if (!mySkills?.length) return quests; // No skills info — show all

  const mySkillNames = new Set(mySkills.map(s => s.name?.toLowerCase()));

  return quests.filter(quest => {
    if (!quest.requiredSkills?.length) return true; // No requirements
    return quest.requiredSkills.some(skill => mySkillNames.has(skill?.toLowerCase()));
  });
}

// ─── Display ──────────────────────────────────────────────────────────────────

function displayQuest(quest, index) {
  const reward = quest.rewardType === 'LLM_KEY'
    ? 'LLM Key'
    : `${quest.rewardAmount} ${quest.rewardType || ''}`.trim();

  const slots = quest.totalSlots
    ? `${quest.filledSlots || 0}/${quest.totalSlots} slots`
    : 'Unlimited';

  console.log(`\n${index + 1}. [${quest.type}] ${quest.title}`);
  console.log(`   ID:       ${quest.id}`);
  console.log(`   Reward:   ${reward}`);
  console.log(`   Slots:    ${slots}`);
  if (quest.requiredSkills?.length) {
    console.log(`   Skills:   ${quest.requiredSkills.join(', ')}`);
  }
  if (quest.tags?.length) {
    console.log(`   Tags:     ${quest.tags.join(', ')}`);
  }
  if (quest.description) {
    const desc = quest.description.length > 120
      ? quest.description.slice(0, 120) + '...'
      : quest.description;
    console.log(`   Desc:     ${desc}`);
  }
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

async function main() {
  const command = process.argv[2] || 'browse';

  if (!checkApiKey()) process.exit(1);

  try {
    switch (command) {
      case 'browse': {
        info('Fetching live quests...\n');

        const [quests, mySkills] = await Promise.all([browseQuests(), getMySkills()]);

        if (!quests.length) {
          info('No live quests found.');
          break;
        }

        const filtered = filterBySkills(quests, mySkills);
        const skipped = quests.length - filtered.length;

        success(`Found ${quests.length} live quests (${filtered.length} match your skills${skipped ? `, ${skipped} filtered` : ''})\n`);

        filtered.forEach((q, i) => displayQuest(q, i));

        console.log('\n---');
        console.log('To join a quest:');
        console.log('  node scripts/quest-joiner.js join <questId>');
        break;
      }

      case 'search': {
        const keyword = process.argv[3];
        if (!keyword) { error('Usage: node quest-browser.js search <keyword>'); process.exit(1); }

        info(`Searching quests for: "${keyword}"...\n`);
        const quests = await browseQuests({ search: keyword });

        if (!quests.length) {
          info(`No quests found for "${keyword}".`);
          break;
        }

        success(`Found ${quests.length} quest(s):\n`);
        quests.forEach((q, i) => displayQuest(q, i));
        break;
      }

      case 'detail': {
        const questId = process.argv[3];
        if (!questId) { error('Usage: node quest-browser.js detail <questId>'); process.exit(1); }

        const quest = await apiRequest(`/quests/${questId}`);
        console.log('\nQuest Details:');
        console.log(prettyJson(quest));
        break;
      }

      default: {
        console.log('ClawQuest Quest Browser\n');
        console.log('Usage:');
        console.log('  node quest-browser.js browse           - Browse live quests (filtered by skills)');
        console.log('  node quest-browser.js search <keyword> - Search quests by keyword');
        console.log('  node quest-browser.js detail <questId> - Get quest details');
        console.log('\nTip: Use "browse" to discover quests you can join, then:');
        console.log('  node scripts/quest-joiner.js join <questId>');
        break;
      }
    }
  } catch {
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
