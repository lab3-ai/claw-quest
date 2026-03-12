#!/usr/bin/env node
/**
 * Setup orchestrator for ClawQuest skill
 * Handles API domain config, cron deployment, and agent registration
 */

import {
  updateConfig,
  readState,
  writeState,
  updateState,
  getEnv,
  getApiKey,
  success,
  error,
  warning,
  info,
  prettyJson,
} from './utils.js';
import { isOpenClawAvailable } from './notify.js';
import { deployCronjobs } from './cronjob-manager.js';

// ─── Step constants ───────────────────────────────────────────────────────────

const STEPS = {
  API_DOMAIN: 'api-domain',
  CRON_JOB: 'cron-job',
  REGISTER: 'register',
};

const STATUS = { PENDING: 'pending', RUNNING: 'running', DONE: 'done', ERROR: 'error', SKIPPED: 'skipped' };

function getStepStatus() {
  return readState().stepStatus || {};
}

function updateStepStatus(stepName, status, errorMsg = null) {
  const state = readState();
  if (!state.stepStatus) state.stepStatus = {};
  state.stepStatus[stepName] = { status, error: errorMsg, timestamp: new Date().toISOString() };
  writeState(state);
}

// ─── URL validation ───────────────────────────────────────────────────────────

function isValidUrl(s) {
  try { new URL(s); return true; } catch { return false; }
}

// ─── Step executors ───────────────────────────────────────────────────────────

async function executeApiDomainStep(apiDomainArg) {
  updateStepStatus(STEPS.API_DOMAIN, STATUS.RUNNING);

  const existing = getEnv('CLAWQUEST_API_URL');
  if (existing && isValidUrl(existing)) {
    success(`API domain already configured: ${existing}`);
    updateStepStatus(STEPS.API_DOMAIN, STATUS.DONE);
    return { success: true, url: existing };
  }

  if (!apiDomainArg) {
    const msg = 'API_DOMAIN is required. Provide it as argument.';
    updateStepStatus(STEPS.API_DOMAIN, STATUS.ERROR, msg);
    return { success: false, error: msg };
  }

  if (!isValidUrl(apiDomainArg)) {
    const msg = `Invalid URL: ${apiDomainArg}`;
    updateStepStatus(STEPS.API_DOMAIN, STATUS.ERROR, msg);
    return { success: false, error: msg };
  }

  updateConfig({ CLAWQUEST_API_URL: apiDomainArg });
  updateState({ API_DOMAIN_CONFIGURED: true });
  success(`API domain configured: ${apiDomainArg}`);
  updateStepStatus(STEPS.API_DOMAIN, STATUS.DONE);
  return { success: true, url: apiDomainArg };
}

async function executeCronJobStep() {
  updateStepStatus(STEPS.CRON_JOB, STATUS.RUNNING);

  if (!(await isOpenClawAvailable())) {
    warning('OpenClaw CLI not available. Skipping cron setup.');
    updateStepStatus(STEPS.CRON_JOB, STATUS.SKIPPED);
    return { success: true, skipped: true };
  }

  try {
    const result = await deployCronjobs();
    if (result.success) {
      success(`${result.deployed} cron task(s) deployed`);
      updateStepStatus(STEPS.CRON_JOB, STATUS.DONE);
      return { success: true, deployed: result.deployed };
    }
    const msg = result.error || 'Failed to deploy cron tasks';
    updateStepStatus(STEPS.CRON_JOB, STATUS.ERROR, msg);
    return { success: false, error: msg };
  } catch (e) {
    updateStepStatus(STEPS.CRON_JOB, STATUS.ERROR, e.message);
    return { success: false, error: e.message };
  }
}

async function executeRegisterStep(agentname) {
  updateStepStatus(STEPS.REGISTER, STATUS.RUNNING);

  if (!agentname) {
    info('No agent name provided, skipping registration.');
    updateStepStatus(STEPS.REGISTER, STATUS.SKIPPED);
    return { success: true, skipped: true };
  }

  if (getApiKey()) {
    success('Agent already registered, skipping.');
    updateStepStatus(STEPS.REGISTER, STATUS.DONE);
    return { success: true, alreadyRegistered: true };
  }

  try {
    const { selfRegister } = await import('./register.js');
    const response = await selfRegister(agentname);
    updateStepStatus(STEPS.REGISTER, STATUS.DONE);
    return { success: true, response, claimUrl: response.claimUrl };
  } catch (e) {
    const msg = e.status === 409
      ? `Agentname "${agentname}" already taken`
      : e.message;
    updateStepStatus(STEPS.REGISTER, STATUS.ERROR, msg);
    return { success: false, error: msg, nameTaken: e.status === 409 };
  }
}

// ─── Orchestration ────────────────────────────────────────────────────────────

async function executeSetupSteps(apiDomainArg, agentname) {
  const results = {};

  // Step 1: API domain (sequential, others depend on it)
  info('[1/3] Configuring API domain...');
  results[STEPS.API_DOMAIN] = await executeApiDomainStep(apiDomainArg);
  if (!results[STEPS.API_DOMAIN].success) {
    error('API domain setup failed. Aborting.');
    return results;
  }

  // Steps 2 & 3: Run in parallel
  info('[2/3 & 3/3] Deploying cron jobs and registering agent (parallel)...');
  const [cronResult, registerResult] = await Promise.all([
    executeCronJobStep(),
    executeRegisterStep(agentname),
  ]);

  results[STEPS.CRON_JOB] = cronResult;
  results[STEPS.REGISTER] = registerResult;

  return results;
}

// ─── Status print ─────────────────────────────────────────────────────────────

function printStepStatus() {
  const stepStatus = getStepStatus();
  console.log('\nSetup Step Status:\n');
  for (const [, stepKey] of Object.entries(STEPS)) {
    const s = stepStatus[stepKey];
    if (!s) { console.log(`  ${stepKey}: ⚪ pending`); continue; }
    const icon = { done: '✅', error: '❌', running: '🔄', skipped: '⏭️ ', pending: '⚪' }[s.status] || '⚪';
    console.log(`  ${stepKey}: ${icon} ${s.status}`);
    if (s.error) console.log(`    Error: ${s.error}`);
    if (s.timestamp) console.log(`    Last run: ${new Date(s.timestamp).toLocaleString()}`);
  }
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

async function main() {
  const command = process.argv[2];

  try {
    switch (command) {
      case 'quick-setup': {
        console.log('🦞 ClawQuest Quick Setup\n');

        const apiDomainArg = process.argv[3];
        const agentname = process.argv[4];

        if (!apiDomainArg) {
          error('API_DOMAIN is required');
          info('Usage: node setup-check.js quick-setup <API_DOMAIN> [AGENT_NAME]');
          info('Example: node setup-check.js quick-setup https://api.clawquest.ai "MyAgent"');
          process.exit(1);
        }

        const start = Date.now();
        const results = await executeSetupSteps(apiDomainArg, agentname);
        const duration = ((Date.now() - start) / 1000).toFixed(2);

        console.log('\n' + '='.repeat(60));
        console.log(`Setup completed in ${duration}s\n`);

        let hasErrors = false;
        for (const [step, result] of Object.entries(results)) {
          if (!result.success && !result.skipped) {
            error(`[${step}] Failed: ${result.error}`);
            hasErrors = true;
          }
        }

        if (hasErrors) {
          error('Some steps failed. Run "node setup-check.js status" to review.');
          console.log('='.repeat(60));
          break;
        }

        success('All steps completed!');

        const regResult = results[STEPS.REGISTER];
        if (regResult?.success && !regResult.skipped && !regResult.alreadyRegistered) {
          console.log('\n📋 Agent Registration:');
          console.log(`  Claim URL: ${regResult.claimUrl}`);
          console.log('\nShare the claim URL with your human owner to activate the agent.');
        } else if (!agentname) {
          info('\nTo register your agent, run:');
          info(`  node setup-check.js quick-setup ${apiDomainArg} "YourAgentName"`);
          info('Or: node scripts/register.js register "YourAgentName"');
        }

        console.log('='.repeat(60));
        break;
      }

      case 'status': {
        printStepStatus();
        break;
      }

      case 'reset': {
        const state = readState();
        state.stepStatus = {};
        writeState(state);
        success('Step status reset');
        break;
      }

      case 'check': {
        const apiUrl = getEnv('CLAWQUEST_API_URL');
        const apiKey = getApiKey();
        console.log('\nClawQuest Setup Check:\n');
        console.log(`  API URL:  ${apiUrl ? `✅ ${apiUrl}` : '❌ Not configured'}`);
        console.log(`  API Key:  ${apiKey ? '✅ Present' : '❌ Not registered'}`);
        console.log(`  OpenClaw: ${(await isOpenClawAvailable()) ? '✅ Available' : '⚠️  Not found'}`);
        console.log();
        process.exit(apiUrl && apiKey ? 0 : 1);
        break;
      }

      default: {
        console.log('ClawQuest Setup\n');
        console.log('Usage:');
        console.log('  node setup-check.js quick-setup <API_DOMAIN> [AGENT_NAME]  - Auto-setup');
        console.log('  node setup-check.js check                                  - Check configuration');
        console.log('  node setup-check.js status                                 - Show step status');
        console.log('  node setup-check.js reset                                  - Reset step status');
        console.log('\nExamples:');
        console.log('  node setup-check.js quick-setup https://api.clawquest.ai "MyAgent"');
        console.log('  node setup-check.js check');
        break;
      }
    }
  } catch (e) {
    error(e.message);
    process.exit(1);
  }
}

export { executeSetupSteps, getStepStatus, updateStepStatus };

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
