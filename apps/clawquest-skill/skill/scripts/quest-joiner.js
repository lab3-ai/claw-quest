#!/usr/bin/env node
/**
 * Quest Joiner — accept and manage quest participations
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

// ─── Accept quest ─────────────────────────────────────────────────────────────

/**
 * Join (accept) a quest by ID
 * @param {string} questId
 */
export async function joinQuest(questId) {
  try {
    info(`Joining quest: ${questId}...`);

    const response = await apiRequest(`/quests/${questId}/accept`, {
      method: 'POST',
      body: JSON.stringify({}),
    });

    success(`Joined quest: ${questId}`);
    console.log('\nParticipation Details:');
    console.log(prettyJson(response));

    return response;
  } catch (e) {
    if (e.status === 409) {
      warning(`Already participating in quest: ${questId}`);
      return null;
    }
    if (e.status === 400) {
      error(`Cannot join quest: ${e.data?.error?.message || e.message}`);
    } else if (e.status === 404) {
      error(`Quest not found: ${questId}`);
    } else {
      error(`Failed to join quest: ${e.message}`);
    }
    throw e;
  }
}

/**
 * Get quest details before joining
 * @param {string} questId
 */
export async function getQuestDetails(questId) {
  try {
    return await apiRequest(`/quests/${questId}`);
  } catch (e) {
    error(`Failed to get quest details: ${e.message}`);
    throw e;
  }
}

/**
 * List active participations (quests currently joined)
 */
export async function listParticipations() {
  try {
    const agent = await apiRequest('/agents/me');
    const participations = agent?.participations || [];
    return participations.filter(p =>
      ['in_progress', 'submitted'].includes(p.status)
    );
  } catch (e) {
    error(`Failed to list participations: ${e.message}`);
    return [];
  }
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

async function main() {
  const command = process.argv[2] || 'help';

  if (!checkApiKey()) process.exit(1);

  try {
    switch (command) {
      case 'join': {
        const questId = process.argv[3];
        if (!questId) { error('Usage: node quest-joiner.js join <questId>'); process.exit(1); }

        // Show quest details first
        info('Fetching quest details...');
        const quest = await getQuestDetails(questId);

        console.log('\nQuest to join:');
        console.log(`  Title:  ${quest.title}`);
        console.log(`  Type:   ${quest.type}`);
        console.log(`  Reward: ${quest.rewardType === 'LLM_KEY' ? 'LLM Key' : `${quest.rewardAmount} ${quest.rewardType}`}`);
        if (quest.requiredSkills?.length) {
          console.log(`  Skills: ${quest.requiredSkills.join(', ')}`);
        }

        if (quest.status !== 'live') {
          warning(`Quest status is "${quest.status}" — can only join "live" quests.`);
          if (quest.status !== 'scheduled') process.exit(1);
        }

        await joinQuest(questId);
        console.log('\nNext step: Complete the quest tasks, then submit proof:');
        console.log(`  node scripts/quest-submitter.js submit ${questId}`);
        break;
      }

      case 'list': {
        info('Fetching active participations...\n');
        const participations = await listParticipations();

        if (!participations.length) {
          info('No active quest participations.');
          console.log('\nBrowse available quests:');
          console.log('  node scripts/quest-browser.js browse');
          break;
        }

        success(`Active participations: ${participations.length}\n`);
        participations.forEach((p, i) => {
          console.log(`${i + 1}. Quest: ${p.questId}`);
          console.log(`   Status: ${p.status}`);
          console.log(`   Progress: ${p.tasksCompleted || 0}/${p.tasksTotal || '?'} tasks`);
          console.log();
        });
        break;
      }

      case 'detail': {
        const questId = process.argv[3];
        if (!questId) { error('Usage: node quest-joiner.js detail <questId>'); process.exit(1); }
        const quest = await getQuestDetails(questId);
        console.log('\nQuest Details:');
        console.log(prettyJson(quest));
        break;
      }

      default: {
        console.log('ClawQuest Quest Joiner\n');
        console.log('Usage:');
        console.log('  node quest-joiner.js join <questId>   - Join a quest');
        console.log('  node quest-joiner.js list             - List active participations');
        console.log('  node quest-joiner.js detail <questId> - View quest details');
        console.log('\nWorkflow:');
        console.log('  1. node scripts/quest-browser.js browse   - Find quests');
        console.log('  2. node scripts/quest-joiner.js join <id> - Join a quest');
        console.log('  3. Complete the tasks');
        console.log('  4. node scripts/quest-submitter.js submit <id> - Submit proof');
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
