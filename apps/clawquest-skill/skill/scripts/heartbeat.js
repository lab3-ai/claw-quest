#!/usr/bin/env node
/**
 * Heartbeat script — keeps agent online and monitors activation
 */

import {
  apiRequest,
  updateState,
  getState,
  checkApiKey,
  success,
  error,
  warning,
  info,
} from './utils.js';
import { sendMessageToUser, isOpenClawAvailable } from './notify.js';

// ─── Online presence ──────────────────────────────────────────────────────────

async function maintainOnlinePresence() {
  if (!checkApiKey(false)) {
    warning('Agent not registered yet. Skipping online presence check.');
    return null;
  }

  try {
    const agent = await apiRequest('/agents/me');

    const displayName = agent.agentname || agent.id || 'Agent';
    success(`Agent online: ${displayName} (${agent.status})`);

    if (agent.status === 'active') {
      const wasActive = getState('AGENT_ACTIVE');
      if (!wasActive) {
        updateState({ AGENT_ACTIVE: true, AGENT_ID: agent.id });
        success('Agent activation detected! State updated.');

        if (await isOpenClawAvailable()) {
          await sendMessageToUser(
            `🎉 Your ClawQuest agent is now active!\n\nYour agent can now discover and join quests.\n\nRun: node scripts/quest-browser.js browse`
          );
        }
      }
    }

    return agent;
  } catch (e) {
    error(`Online presence failed: ${e.message}`);
    if (e.status === 401) warning('API key may be invalid or agent not yet activated.');
    throw e;
  }
}

// ─── Activation monitor ───────────────────────────────────────────────────────

async function monitorActivation() {
  if (!checkApiKey(false)) {
    warning('Not registered yet. Cannot monitor activation.');
    return { notRegistered: true };
  }

  if (getState('AGENT_ACTIVE') === true) {
    info('Agent already active.');
    return { active: true, alreadyActive: true };
  }

  try {
    const agent = await apiRequest('/agents/me');

    if (agent.status === 'active') {
      success('Agent is now ACTIVE!');
      updateState({
        AGENT_ACTIVE: true,
        AGENT_ID: agent.id,
        ACTIVATION_TIMESTAMP: new Date().toISOString(),
      });
      info('Agent is ready to browse and join quests.');
      return { active: true };
    }

    warning(`Agent status: ${agent.status}. Waiting for human to complete verification.`);
    return { active: false, status: agent.status };
  } catch (e) {
    error(`Activation check failed: ${e.message}`);
    throw e;
  }
}

// ─── Full heartbeat ───────────────────────────────────────────────────────────

async function runHeartbeat() {
  console.log('🫀 Running ClawQuest Heartbeat...\n');

  const results = { timestamp: new Date().toISOString(), checks: [] };

  // Check 1: Online presence
  try {
    info('[1/2] Maintaining online presence...');
    const agent = await maintainOnlinePresence();
    results.checks.push({ name: 'online_presence', status: 'success', data: agent });
  } catch (e) {
    results.checks.push({ name: 'online_presence', status: 'error', error: e.message });
  }

  // Check 2: Activation (only if not yet active)
  if (getState('AGENT_ACTIVE') !== true) {
    try {
      info('[2/2] Monitoring activation...');
      const activationStatus = await monitorActivation();
      results.checks.push({ name: 'activation', status: 'success', data: activationStatus });
    } catch (e) {
      results.checks.push({ name: 'activation', status: 'error', error: e.message });
    }
  } else {
    info('[2/2] Agent already active (skipping activation check)');
    results.checks.push({ name: 'activation', status: 'skipped' });
  }

  const passed = results.checks.filter(c => c.status === 'success').length;
  const failed = results.checks.filter(c => c.status === 'error').length;

  console.log('\n' + '='.repeat(50));
  if (failed === 0) {
    success(`Heartbeat complete: ${passed}/${results.checks.length} checks passed`);
  } else {
    warning(`Heartbeat complete: ${passed} passed, ${failed} failed`);
  }

  return results;
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

async function main() {
  const command = process.argv[2];

  try {
    switch (command) {
      case 'run': await runHeartbeat(); break;
      case 'online': await maintainOnlinePresence(); break;
      case 'activation': await monitorActivation(); break;
      default: {
        console.log('ClawQuest Heartbeat\n');
        console.log('Usage:');
        console.log('  node heartbeat.js run         - Run full heartbeat');
        console.log('  node heartbeat.js online      - Maintain online presence only');
        console.log('  node heartbeat.js activation  - Check activation status only');
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
