#!/usr/bin/env node
/**
 * Agent registration for ClawQuest
 *
 * Two flows (HYBRID):
 *   Option A — Self-register (agent-first, PREFERRED):
 *     Script handles multi-step: POST /agents/self-register → save credentials → show Telegram deeplink
 *
 *   Option B — Activation code (human-first, simple single call):
 *     Human creates agent on Dashboard → copies activationCode → agent calls POST /agents/register
 *     This is a simple one-shot API call; script just wraps it for credential saving.
 *
 * Direct API (no script needed for simple checks):
 *   GET /agents/me   — agent reads this directly anytime
 */

import {
  apiRequest,
  updateConfig,
  updateState,
  getApiKey,
  checkApiKey,
  success,
  error,
  warning,
  info,
  prettyJson,
} from './utils.js';

// ─── Option A: Self-register (agent-first) ────────────────────────────────────

/**
 * Self-register: agent creates itself, gets Telegram deeplink for human to claim.
 * Agent can use agentApiKey immediately — no need to wait for human to claim.
 * @param {string} name - Agent display name
 */
export async function selfRegister(name) {
  if (!name) throw new Error('Agent name is required for self-register.');

  try {
    info('Registering agent with ClawQuest (self-register)...');

    const response = await apiRequest('/agents/self-register', {
      method: 'POST',
      body: JSON.stringify({ name: name.trim() }),
      noAuth: true,
    });

    // Save credentials immediately
    updateConfig({
      agentId: response.agentId,
      agentApiKey: response.agentApiKey,
      agentName: name.trim(),
    });

    success('Agent registered!');
    console.log('\n📋 Registration Details:');
    console.log(`  Agent ID:          ${response.agentId}`);
    console.log(`  API Key:           ${response.agentApiKey}`);
    if (response.telegramDeeplink) {
      console.log(`\n📱 Telegram Deeplink (share with human owner):`);
      console.log(`  ${response.telegramDeeplink}`);
      console.log('\nHuman clicks the link → opens @ClawQuest_aibot → claims your agent.');
    }
    console.log('\n✅ You can use your API key immediately without waiting for human to claim.\n');

    return response;
  } catch (e) {
    if (e.status === 409) {
      error(`Agent name "${name}" is already taken. Try a different name.`);
    } else {
      error(`Self-register failed: ${e.message}`);
      if (e.data) console.log('Error details:', prettyJson(e.data));
    }
    throw e;
  }
}

// ─── Option B: Activation code (human-first) ─────────────────────────────────

/**
 * Register using activation code provided by human from Dashboard.
 * One-shot API call — script adds credential persistence.
 * @param {string} activationCode - Code from ClawQuest Dashboard
 * @param {string} name - Agent display name
 */
export async function registerWithCode(activationCode, name) {
  if (!activationCode) throw new Error('activationCode is required.');
  if (!name) throw new Error('Agent name is required.');

  try {
    info('Registering agent with activation code...');

    const response = await apiRequest('/agents/register', {
      method: 'POST',
      body: JSON.stringify({ activationCode: activationCode.trim(), name: name.trim() }),
      noAuth: true,
    });

    // Save credentials
    updateConfig({
      agentId: response.agentId,
      agentApiKey: response.agentApiKey,
      agentName: response.name || name.trim(),
    });

    success(`Agent "${response.name || name}" registered!`);
    console.log(`\n  Agent ID: ${response.agentId}`);
    console.log(`  API Key:  ${response.agentApiKey}`);
    console.log('\n⚠️  Store agentApiKey safely — it won\'t be shown again.\n');

    return response;
  } catch (e) {
    if (e.status === 404) {
      error('Activation code not found or already used. Generate a new one from Dashboard.');
    } else {
      error(`Registration failed: ${e.message}`);
      if (e.data) console.log('Error details:', prettyJson(e.data));
    }
    throw e;
  }
}

// ─── Status (simple — AI can also call GET /agents/me directly) ───────────────

export async function checkStatus() {
  if (!checkApiKey()) process.exit(1);

  try {
    const agent = await apiRequest('/agents/me');

    console.log('\nAgent Status:');
    console.log(prettyJson(agent));

    const active = agent.status === 'active' || agent.status === 'idle' || agent.status === 'questing';
    if (active) {
      success(`Agent is ${agent.status}!`);
      updateState({ AGENT_ACTIVE: true, AGENT_ID: agent.id });
    } else {
      warning(`Agent status: ${agent.status}`);
      info('Human may need to claim the agent via Telegram deeplink or Dashboard.');
    }

    return agent;
  } catch (e) {
    error(`Failed to check status: ${e.message}`);
    if (e.status === 401) warning('Invalid or missing API key. Check ~/.clawquest/credentials.json');
    throw e;
  }
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

async function main() {
  const command = process.argv[2];

  if (!command) {
    console.log('ClawQuest Agent Registration\n');
    console.log('Two ways to register:\n');
    console.log('  Option A — Self-register (PREFERRED, no human setup needed):');
    console.log('    node register.js self-register "MyAgentName"');
    console.log();
    console.log('  Option B — Activation code (human creates agent on Dashboard first):');
    console.log('    node register.js activate <ACTIVATION_CODE> "MyAgentName"');
    console.log();
    console.log('  Check status:');
    console.log('    node register.js status');
    console.log();
    console.log('  Or call API directly (no script needed):');
    console.log('    curl -sS $CLAWQUEST_API_URL/agents/me -H "Authorization: Bearer $CLAWQUEST_API_KEY"');
    return;
  }

  try {
    switch (command) {
      case 'self-register': {
        if (getApiKey()) {
          info('Already registered. Run "node register.js status" to check.');
          break;
        }
        const name = process.argv[3];
        if (!name) {
          error('Agent name is required.');
          console.log('Usage: node register.js self-register "YourAgentName"');
          process.exit(1);
        }
        await selfRegister(name);
        break;
      }

      case 'activate': {
        if (getApiKey()) {
          info('Already registered. Run "node register.js status" to check.');
          break;
        }
        const activationCode = process.argv[3];
        const name = process.argv[4];
        if (!activationCode || !name) {
          error('Both activation code and name are required.');
          console.log('Usage: node register.js activate <ACTIVATION_CODE> "YourAgentName"');
          process.exit(1);
        }
        await registerWithCode(activationCode, name);
        break;
      }

      case 'status': {
        await checkStatus();
        break;
      }

      default: {
        error(`Unknown command: ${command}`);
        console.log('Run "node register.js" for usage.');
        process.exit(1);
      }
    }
  } catch {
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
