#!/usr/bin/env node
/**
 * Cronjob Manager — deploy/manage ClawQuest scheduled tasks via OpenClaw CLI
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { isOpenClawAvailable, addCronJobAdvanced, removeCronJob } from './notify.js';
import { success, error, warning, info } from './utils.js';

const execAsync = promisify(exec);

// ─── Task definitions ─────────────────────────────────────────────────────────

/**
 * @type {import('./notify.js').CronjobConfig[]}
 */
export const CRONJOB_TASKS = [
  {
    id: 'clawquest-heartbeat',
    name: 'ClawQuest Heartbeat',
    schedule: { kind: 'every', everyMs: 900000 }, // 15 min
    payload: {
      kind: 'agentTurn',
      message: 'Maintain ClawQuest agent online presence: cd ~/.openclaw/workspace/skills/clawquest && node scripts/heartbeat.js online',
    },
    delivery: { mode: 'none' },
    sessionTarget: 'isolated',
    wakeMode: 'next-heartbeat',
    enabled: true,
    description: 'Keeps agent online by pinging GET /agents/me every 15 minutes',
  },
  {
    id: 'clawquest-quest-browser',
    name: 'ClawQuest Quest Browser',
    schedule: { kind: 'every', everyMs: 1800000 }, // 30 min
    payload: {
      kind: 'agentTurn',
      message: 'Browse and join available ClawQuest quests:\n1. Read ~/.openclaw/workspace/skills/clawquest/preferences/quest-guide.md if not read yet\n2. Run: cd ~/.openclaw/workspace/skills/clawquest && node scripts/quest-browser.js browse\n3. For each suitable quest found, run: node scripts/quest-joiner.js join <questId>\n4. Report what quests were found and joined.',
    },
    delivery: { mode: 'announce', channel: 'last' },
    sessionTarget: 'isolated',
    wakeMode: 'next-heartbeat',
    enabled: true,
    description: 'Finds and joins suitable live quests every 30 minutes',
  },
  {
    id: 'clawquest-skill-sync',
    name: 'ClawQuest Skill Sync',
    schedule: { kind: 'every', everyMs: 7200000 }, // 2 hours
    payload: {
      kind: 'agentTurn',
      message: 'Sync installed skills to ClawQuest: cd ~/.openclaw/workspace/skills/clawquest && node scripts/skill-sync.js',
    },
    delivery: { mode: 'none' },
    sessionTarget: 'isolated',
    wakeMode: 'next-heartbeat',
    enabled: true,
    description: 'Scans and syncs installed AI platform skills every 2 hours',
  },
  {
    id: 'clawquest-update-check',
    name: 'ClawQuest Skill Update Check',
    schedule: { kind: 'every', everyMs: 21600000 }, // 6 hours
    payload: {
      kind: 'agentTurn',
      message: 'Check for ClawQuest skill updates: cd ~/.openclaw/workspace/skills/clawquest && node scripts/update-checker.js check',
    },
    delivery: { mode: 'none' },
    sessionTarget: 'isolated',
    wakeMode: 'next-heartbeat',
    enabled: true,
    description: 'Checks for skill version updates every 6 hours',
  },
];

// ─── Cache ────────────────────────────────────────────────────────────────────

let _cache = null;
let _cacheTs = null;
let _pending = null;
const CACHE_TTL = 30000;

async function getDeployedCronjobs(forceRefresh = false) {
  if (!(await isOpenClawAvailable())) return [];

  const now = Date.now();
  if (!forceRefresh && _cache && _cacheTs && now - _cacheTs < CACHE_TTL) return _cache;

  if (_pending) {
    try { return await _pending; } catch { return _cache || []; }
  }

  _pending = (async () => {
    try {
      const { stdout } = await execAsync('openclaw cron list --json --all', {
        encoding: 'utf8',
        timeout: 15000,
      });
      const data = JSON.parse(stdout);
      const jobs = Array.isArray(data) ? data : (data.jobs || []);
      _cache = jobs;
      _cacheTs = Date.now();
      return jobs;
    } catch {
      return _cache || [];
    } finally {
      _pending = null;
    }
  })();

  return await _pending;
}

function clearCache() {
  _cache = null;
  _cacheTs = null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getCronjobTaskById(id) {
  return CRONJOB_TASKS.find(t => t.id === id);
}

export async function isCronjobDeployed(taskName) {
  const jobs = await getDeployedCronjobs();
  return jobs.some(j => j.name === taskName);
}

// ─── Deploy ───────────────────────────────────────────────────────────────────

async function deployCronjobTask(task) {
  try {
    if (await isCronjobDeployed(task.name)) {
      warning(`  Already deployed: ${task.name}`);
      return { success: true, skipped: true };
    }

    info(`  Deploying: ${task.name}...`);
    const result = await addCronJobAdvanced(task);

    if (result) {
      clearCache();
      const scheduleLabel = typeof task.schedule === 'string'
        ? task.schedule
        : task.schedule.kind === 'every'
          ? `Every ${Math.floor(task.schedule.everyMs / 60000)} min`
          : task.schedule.expr || task.schedule.kind;
      success(`  ✓ ${task.name} (${scheduleLabel})`);
      return { success: true, task: task.id };
    }

    return { success: false, error: 'Deploy returned false', task: task.id };
  } catch (e) {
    return { success: false, error: e.message, task: task.id };
  }
}

export async function deployCronjobs(taskIds = null) {
  info('Deploying ClawQuest cron tasks...\n');

  if (!(await isOpenClawAvailable())) {
    warning('OpenClaw CLI not available. Cannot deploy cronjobs.');
    return { success: false, error: 'OpenClaw CLI not available' };
  }

  await getDeployedCronjobs();

  const tasksToDeploy = taskIds
    ? taskIds.map(id => getCronjobTaskById(id)).filter(Boolean)
    : CRONJOB_TASKS.filter(t => t.enabled);

  if (tasksToDeploy.length === 0) {
    info('No tasks to deploy.');
    return { success: true, deployed: 0 };
  }

  const results = await Promise.all(tasksToDeploy.map(task => deployCronjobTask(task)));

  const deployed = results.filter(r => r.success && !r.skipped).length;
  const skipped = results.filter(r => r.skipped).length;
  const failed = results.filter(r => !r.success).length;

  console.log('\n' + '='.repeat(50));
  console.log('Deployment Summary:');
  console.log(`  Deployed: ${deployed}  Skipped: ${skipped}  Failed: ${failed}`);
  console.log('='.repeat(50) + '\n');

  if (failed > 0) {
    results.filter(r => !r.success).forEach(r => error(`  • ${r.task}: ${r.error}`));
  }

  return { success: failed === 0, deployed, skipped, failed, results };
}

// ─── List / Show ──────────────────────────────────────────────────────────────

export async function listCronjobTasks() {
  const deployedJobs = await getDeployedCronjobs();

  console.log('📋 Available ClawQuest Cron Tasks:\n');
  CRONJOB_TASKS.forEach((task, i) => {
    const deployed = deployedJobs.some(j => j.name === task.name) ? '🚀' : '  ';
    const status = task.enabled ? '✓' : '○';
    console.log(`${i + 1}. ${deployed} [${status}] ${task.name}`);
    console.log(`   ID: ${task.id}`);
    console.log(`   Description: ${task.description}`);
    console.log();
  });

  console.log('To deploy: node scripts/cronjob-manager.js deploy');
}

export async function showDeployedCronjobs() {
  if (!(await isOpenClawAvailable())) { warning('OpenClaw CLI not available'); return; }

  const jobs = await getDeployedCronjobs();

  if (!jobs.length) { info('No cronjobs deployed yet.'); return; }

  console.log('📋 Deployed Cron Jobs:\n');
  jobs.forEach((job, i) => {
    console.log(`${i + 1}. ${job.name}`);
    console.log(`   ID: ${job.id}`);
    console.log(`   Enabled: ${job.enabled ? 'Yes' : 'No'}`);
    if (job.state?.lastRunAtMs) {
      console.log(`   Last run: ${new Date(job.state.lastRunAtMs).toLocaleString()}`);
      console.log(`   Next run: ${new Date(job.state.nextRunAtMs).toLocaleString()}`);
    }
    console.log();
  });
}

// ─── Remove ───────────────────────────────────────────────────────────────────

export async function removeCronjobTask(taskName) {
  return removeCronJob(taskName);
}

export async function removeCronjobs(taskIds = null) {
  const tasksToRemove = taskIds
    ? taskIds.map(id => getCronjobTaskById(id)).filter(Boolean)
    : CRONJOB_TASKS;

  let removed = 0;
  for (const task of tasksToRemove) {
    const ok = await removeCronJob(task.name);
    if (ok) removed++;
  }

  return { success: true, removed };
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

async function main() {
  const command = process.argv[2];

  try {
    switch (command) {
      case 'list': {
        await listCronjobTasks();
        break;
      }
      case 'deploy': {
        const taskIdsArg = process.argv[3];
        const taskIds = taskIdsArg ? taskIdsArg.split(',').map(s => s.trim()) : null;
        if (taskIds) {
          const invalid = taskIds.filter(id => !getCronjobTaskById(id));
          if (invalid.length > 0) {
            error(`Invalid task IDs: ${invalid.join(', ')}`);
            info('Available IDs: ' + CRONJOB_TASKS.map(t => t.id).join(', '));
            process.exit(1);
          }
        }
        const result = await deployCronjobs(taskIds);
        if (!result.success) process.exit(1);
        break;
      }
      case 'show': {
        await showDeployedCronjobs();
        break;
      }
      case 'remove': {
        const nameOrId = process.argv[3];
        if (!nameOrId) { error('Usage: node cronjob-manager.js remove <task-id-or-name>'); process.exit(1); }
        const task = getCronjobTaskById(nameOrId);
        const taskName = task ? task.name : nameOrId;
        const ok = await removeCronjobTask(taskName);
        if (!ok) process.exit(1);
        break;
      }
      case 'remove-all': {
        await removeCronjobs();
        break;
      }
      default: {
        console.log('ClawQuest Cronjob Manager\n');
        console.log('Usage:');
        console.log('  node cronjob-manager.js list              - List all tasks');
        console.log('  node cronjob-manager.js deploy [ids]      - Deploy tasks');
        console.log('  node cronjob-manager.js show              - Show deployed jobs');
        console.log('  node cronjob-manager.js remove <id|name>  - Remove a job');
        console.log('  node cronjob-manager.js remove-all        - Remove all jobs');
        console.log('\nTask IDs: ' + CRONJOB_TASKS.map(t => t.id).join(', '));
        break;
      }
    }
  } catch (e) {
    error(e.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
