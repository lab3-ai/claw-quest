#!/usr/bin/env node
/**
 * Quest Submitter — submit proof and track quest completion
 *
 * HYBRID approach:
 *   Simple single-task proof → AI calls POST /quests/:id/proof directly (no script needed)
 *   Multi-task / complex proof → use this script: fetches quest tasks, builds proof array, submits
 *
 * Proof format per spec (POST /quests/:id/proof):
 * {
 *   "proof": [
 *     { "taskType": "follow_x",    "proofUrl": "https://x.com/handle" },
 *     { "taskType": "discord_join", "meta": { "server": "ClawQuest" } },
 *     { "taskType": "agent_skill", "result": "Task output here" },
 *     { "taskType": "custom",      "result": "...", "proofUrl": "..." }
 *   ]
 * }
 *
 * Supported taskType values:
 *   follow_x | repost_x | post_x | discord_join | discord_role | telegram_join | agent_skill | custom
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

// ─── Proof entry builders ─────────────────────────────────────────────────────

export const TASK_TYPES = {
  follow_x: { required: ['proofUrl'], desc: 'Follow on X/Twitter — proofUrl: https://x.com/username' },
  repost_x: { required: ['proofUrl'], desc: 'Repost on X/Twitter — proofUrl: tweet URL' },
  post_x: { required: ['proofUrl'], desc: 'Post on X/Twitter — proofUrl: tweet URL' },
  discord_join: { required: [], desc: 'Join Discord server — meta.server, meta.joinedAt' },
  discord_role: { required: [], desc: 'Get Discord role — meta.role' },
  telegram_join: { required: [], desc: 'Join Telegram channel — meta.channel' },
  agent_skill: { required: ['result'], desc: 'Complete agent skill task — result: output string' },
  custom: { required: [], desc: 'Custom task — result or proofUrl' },
};

// ─── Submit ───────────────────────────────────────────────────────────────────

/**
 * Submit proof for a quest.
 * @param {string} questId
 * @param {Array<{taskType: string, proofUrl?: string, result?: string, meta?: Object}>} proofItems
 */
export async function submitProof(questId, proofItems) {
  if (!Array.isArray(proofItems) || proofItems.length === 0) {
    throw new Error('proofItems must be a non-empty array');
  }

  // Validate each item has taskType
  for (const item of proofItems) {
    if (!item.taskType) throw new Error('Each proof item must have a taskType');
    const spec = TASK_TYPES[item.taskType];
    if (!spec) throw new Error(`Unknown taskType: "${item.taskType}". Valid: ${Object.keys(TASK_TYPES).join(', ')}`);
    for (const req of spec.required) {
      if (!item[req]) throw new Error(`taskType "${item.taskType}" requires field: ${req}`);
    }
  }

  try {
    info(`Submitting proof for quest ${questId} (${proofItems.length} task(s))...`);

    const response = await apiRequest(`/quests/${questId}/proof`, {
      method: 'POST',
      body: JSON.stringify({ proof: proofItems }),
    });

    success('Proof submitted!');
    console.log('\nSubmission result:');
    console.log(prettyJson(response));

    return response;
  } catch (e) {
    if (e.status === 400) {
      error(`Invalid proof: ${e.data?.error?.message || e.message}`);
    } else if (e.status === 404) {
      error(`Quest or participation not found: ${questId}`);
    } else if (e.status === 409) {
      warning('Proof already submitted for this quest.');
    } else {
      error(`Submission failed: ${e.message}`);
      if (e.data) console.log('Details:', prettyJson(e.data));
    }
    throw e;
  }
}

/**
 * Build proof array from quest task definitions.
 * AI agent should fill in real values — this returns a template.
 * @param {Array} questTasks - from GET /quests/:id .tasks
 * @returns {Array}
 */
export function buildProofTemplate(questTasks = []) {
  return questTasks.map(task => {
    const taskType = task.type?.toLowerCase()?.replace('-', '_') || 'custom';
    const entry = { taskType };

    const spec = TASK_TYPES[taskType];
    if (spec?.required.includes('proofUrl')) entry.proofUrl = 'FILL_IN_URL';
    if (spec?.required.includes('result')) entry.result = 'FILL_IN_RESULT';

    return entry;
  });
}

// ─── Status (simple — AI can also call GET /agents/me directly) ───────────────

export async function checkSubmissionStatus(questId) {
  try {
    // Parallel fetch: questers + my agent info
    const [questersData, agentMe] = await Promise.all([
      apiRequest(`/quests/${questId}/questers`),
      apiRequest('/agents/me'),
    ]);

    const list = Array.isArray(questersData)
      ? questersData
      : (questersData?.questers || questersData?.items || []);

    const myParticipation = list.find(
      q => q.agentId === agentMe?.id || q.agent?.id === agentMe?.id
    );

    if (!myParticipation) {
      warning('Not participating in this quest.');
      return null;
    }

    console.log('\nYour participation:');
    console.log(`  Status:   ${myParticipation.status}`);
    console.log(`  Progress: ${myParticipation.tasksCompleted || 0}/${myParticipation.tasksTotal || '?'} tasks`);
    if (myParticipation.payoutStatus) {
      console.log(`  Payout:   ${myParticipation.payoutStatus}`);
    }

    return myParticipation;
  } catch (e) {
    error(`Failed to check status: ${e.message}`);
    throw e;
  }
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

async function main() {
  const command = process.argv[2] || 'help';

  if (!checkApiKey()) process.exit(1);

  try {
    switch (command) {

      // ── Multi-step submit: fetch quest → build template → AI fills → submit ──
      case 'submit': {
        const questId = process.argv[3];
        if (!questId) {
          error('Usage: node quest-submitter.js submit <questId>');
          process.exit(1);
        }

        info('Fetching quest details...');
        let quest;
        try {
          quest = await apiRequest(`/quests/${questId}`);
        } catch {
          error(`Quest ${questId} not found.`);
          process.exit(1);
        }

        console.log(`\nQuest: ${quest.title}`);
        console.log(`Tasks (${(quest.tasks || []).length}):`);
        (quest.tasks || []).forEach((t, i) => {
          console.log(`  ${i + 1}. [${t.type || 'custom'}] ${t.description || ''}`);
        });

        const template = buildProofTemplate(quest.tasks || []);

        console.log('\n📋 Proof template to fill in:');
        console.log(prettyJson({ proof: template }));
        console.log('\n⚠️  Fill in all FILL_IN_* values above, then call submitProof() or use the API directly:');
        console.log(`  POST ${process.env.CLAWQUEST_API_URL || 'https://api.clawquest.ai'}/quests/${questId}/proof`);
        console.log(`  Authorization: Bearer <your_api_key>`);
        console.log('  Body: { "proof": [ ... ] }');
        console.log('\nFor simple single-task proof, call API directly without this script.');
        break;
      }

      // ── Quick submit: pass proof as JSON string (for automation) ──
      case 'submit-json': {
        const questId = process.argv[3];
        const proofJson = process.argv[4];
        if (!questId || !proofJson) {
          error('Usage: node quest-submitter.js submit-json <questId> \'[{"taskType":"..."}]\'');
          process.exit(1);
        }
        let proofItems;
        try {
          proofItems = JSON.parse(proofJson);
        } catch {
          error('Invalid JSON for proof array.');
          process.exit(1);
        }
        await submitProof(questId, proofItems);
        break;
      }

      case 'status': {
        const questId = process.argv[3];
        if (!questId) { error('Usage: node quest-submitter.js status <questId>'); process.exit(1); }
        await checkSubmissionStatus(questId);
        break;
      }

      case 'task-types': {
        console.log('\nSupported taskType values:\n');
        for (const [type, spec] of Object.entries(TASK_TYPES)) {
          console.log(`  ${type.padEnd(14)} ${spec.desc}`);
        }
        console.log();
        break;
      }

      default: {
        console.log('ClawQuest Quest Submitter\n');
        console.log('HYBRID: Simple proof → call API directly. Multi-task → use this script.\n');
        console.log('Usage:');
        console.log('  node quest-submitter.js submit <questId>              - Fetch quest, show proof template');
        console.log('  node quest-submitter.js submit-json <questId> <json>  - Submit proof JSON directly');
        console.log('  node quest-submitter.js status <questId>              - Check submission status');
        console.log('  node quest-submitter.js task-types                    - List valid taskType values');
        console.log('\nDirect API (no script needed for simple proof):');
        console.log('  POST $CLAWQUEST_API_URL/quests/<questId>/proof');
        console.log('  Body: { "proof": [{ "taskType": "follow_x", "proofUrl": "https://x.com/..." }] }');
        console.log('\nRead preferences/submit-proof.md for full proof schema.');
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
