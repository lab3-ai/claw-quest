#!/usr/bin/env node
/**
 * OpenClaw notification helper — send messages and manage cron jobs via OpenClaw CLI
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { success, error, info, warning } from './utils.js';

const execAsync = promisify(exec);

// ─── Platform check ───────────────────────────────────────────────────────────

export async function isOpenClawAvailable() {
  try {
    await execAsync('which openclaw');
    return true;
  } catch {
    return false;
  }
}

// ─── Messaging ────────────────────────────────────────────────────────────────

export async function sendMessageToUser(message, sessionTarget = 'main') {
  try {
    const escaped = message
      .replace(/"/g, '\\"')
      .replace(/\$/g, '\\$')
      .replace(/`/g, '\\`');
    await execAsync(`openclaw system event --mode now --text "${escaped}"`);
    return true;
  } catch (e) {
    error(`Failed to send message via OpenClaw: ${e.message}`);
    console.log('\n' + '='.repeat(50));
    console.log('MESSAGE TO USER:');
    console.log(message);
    console.log('='.repeat(50) + '\n');
    return false;
  }
}

// ─── Cron helpers ─────────────────────────────────────────────────────────────

export async function cronJobExists(name) {
  try {
    const { stdout } = await execAsync('openclaw cron list', {
      encoding: 'utf8',
      timeout: 10000,
    });
    return stdout.includes(name);
  } catch {
    return false;
  }
}

/**
 * @typedef {Object} CronjobConfig
 * @property {string} name
 * @property {string|Object} schedule - cron string or { kind: 'every', everyMs } | { kind: 'cron', expr }
 * @property {Object} payload - { kind: 'agentTurn', message } | { kind: 'systemEvent', text }
 * @property {'main'|'isolated'} [sessionTarget]
 * @property {'now'|'next-heartbeat'} [wakeMode]
 * @property {Object} [delivery] - { mode: 'announce'|'none', channel? }
 * @property {boolean} [deleteAfterRun]
 * @property {boolean} [enabled]
 */

export async function addCronJobAdvanced(jobConfig) {
  const {
    name,
    schedule,
    payload,
    sessionTarget = 'main',
    wakeMode = 'next-heartbeat',
    delivery,
    deleteAfterRun = false,
    enabled = true,
  } = jobConfig;

  try {
    if (await cronJobExists(name)) {
      warning(`Cron job "${name}" already exists, skipping`);
      return true;
    }

    const escapedName = name.replace(/"/g, '\\"');

    // Build schedule flag
    let scheduleFlag;
    if (typeof schedule === 'string') {
      scheduleFlag = `--cron "${schedule}"`;
    } else if (schedule.kind === 'every') {
      scheduleFlag = `--every ${schedule.everyMs}ms`;
    } else if (schedule.kind === 'cron') {
      scheduleFlag = `--cron "${schedule.expr}"`;
      if (schedule.tz) scheduleFlag += ` --tz "${schedule.tz}"`;
    } else if (schedule.kind === 'at') {
      scheduleFlag = `--at "${schedule.at}"`;
    }

    let command;

    if (sessionTarget === 'main') {
      const text = typeof payload === 'string'
        ? payload
        : (payload.kind === 'systemEvent' ? payload.text : payload.message) || '';
      const escaped = text.replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`');
      command = `openclaw cron add --name "${escapedName}" ${scheduleFlag} --session main --system-event "${escaped}"`;
    } else {
      const message = typeof payload === 'string'
        ? payload
        : (payload.kind === 'agentTurn' ? payload.message : payload.text) || '';
      const escaped = message.replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`');
      command = `openclaw cron add --name "${escapedName}" ${scheduleFlag} --session isolated --message "${escaped}"`;

      if (delivery) {
        if (delivery.mode === 'announce' || !delivery.mode) {
          command += ' --announce';
          if (delivery.channel && delivery.channel !== 'last') {
            command += ` --channel ${delivery.channel}`;
            if (delivery.to) command += ` --to "${delivery.to}"`;
          }
        } else if (delivery.mode === 'none') {
          command += ' --no-deliver';
        }
      }
    }

    command += ` --wake ${wakeMode}`;
    if (deleteAfterRun) command += ' --delete-after-run';
    if (!enabled) command += ' --disabled';

    await execAsync(command, { encoding: 'utf8', timeout: 15000 });
    success(`Cron job created: ${name}`);
    return true;
  } catch (e) {
    error(`Failed to create cron job "${name}": ${e.message}`);
    return false;
  }
}

export async function removeCronJob(nameOrId) {
  try {
    let jobId = nameOrId;

    if (!nameOrId.match(/^[0-9a-f-]{36}$/i)) {
      try {
        const { stdout } = await execAsync('openclaw cron list --json --all', {
          encoding: 'utf8',
          timeout: 10000,
        });
        const data = JSON.parse(stdout);
        const jobs = Array.isArray(data) ? data : (data.jobs || []);
        const job = jobs.find(j => j.name === nameOrId);
        if (job) {
          jobId = job.id;
        } else {
          warning(`Cron job not found: ${nameOrId}`);
          return false;
        }
      } catch (listErr) {
        warning(`Could not list jobs: ${listErr.message}`);
      }
    }

    await execAsync(`openclaw cron remove ${jobId}`, { encoding: 'utf8', timeout: 10000 });
    success(`Cron job removed: ${nameOrId}`);
    return true;
  } catch (e) {
    error(`Failed to remove cron job: ${e.message}`);
    return false;
  }
}

export async function listCronJobs() {
  try {
    const { stdout } = await execAsync('openclaw cron list', {
      encoding: 'utf8',
      timeout: 10000,
    });
    console.log(stdout);
    return true;
  } catch (e) {
    error(`Failed to list cron jobs: ${e.message}`);
    return false;
  }
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

async function main() {
  const command = process.argv[2];

  if (!(await isOpenClawAvailable())) {
    error('OpenClaw CLI not found. Messages will be logged to console instead.');
  }

  try {
    switch (command) {
      case 'send': {
        const message = process.argv[3];
        if (!message) { error('Usage: node notify.js send <message>'); process.exit(1); }
        await sendMessageToUser(message);
        break;
      }
      case 'test': {
        await sendMessageToUser('🦞 Test notification from ClawQuest Skill!');
        break;
      }
      case 'cron-list': {
        await listCronJobs();
        break;
      }
      case 'cron-remove': {
        const name = process.argv[3];
        if (!name) { error('Usage: node notify.js cron-remove <name>'); process.exit(1); }
        await removeCronJob(name);
        break;
      }
      default: {
        console.log('ClawQuest Notification Helper\n');
        console.log('Usage:');
        console.log('  node notify.js send <message>     - Send message to user');
        console.log('  node notify.js test               - Send test notification');
        console.log('  node notify.js cron-list          - List cron jobs');
        console.log('  node notify.js cron-remove <name> - Remove cron job');
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
