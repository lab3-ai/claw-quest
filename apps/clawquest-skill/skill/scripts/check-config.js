#!/usr/bin/env node
/**
 * Check ClawQuest configuration status — outputs JSON for easy parsing
 */

import { readConfig, readState, getEnv, getApiKey } from './utils.js';
import { isOpenClawAvailable } from './notify.js';

async function main() {
  const config = readConfig();
  const state = readState();
  const apiKey = getApiKey();
  const apiUrl = getEnv('CLAWQUEST_API_URL');

  const status = {
    configured: !!(apiKey && apiUrl),
    apiUrl: apiUrl || null,
    hasApiKey: !!apiKey,
    agentActive: state.AGENT_ACTIVE || false,
    agentId: state.AGENT_ID || null,
    claimUrl: config.claimUrl || null,
    claimedAt: config.claimedAt || null,
    openClawAvailable: await isOpenClawAvailable(),
  };

  if (process.argv[2] === '--json') {
    console.log(JSON.stringify(status, null, 2));
  } else {
    console.log('\nClawQuest Config Status:\n');
    console.log(`  API URL:        ${status.apiUrl || '(not set)'}`);
    console.log(`  API Key:        ${status.hasApiKey ? '✅ Present' : '❌ Missing'}`);
    console.log(`  Agent Active:   ${status.agentActive ? '✅ Yes' : '⏳ Pending activation'}`);
    console.log(`  Agent ID:       ${status.agentId || '(none)'}`);
    console.log(`  Claim URL:      ${status.claimUrl || '(none)'}`);
    console.log(`  OpenClaw CLI:   ${status.openClawAvailable ? '✅ Available' : '⚠️  Not found'}`);
    console.log();

    if (!status.apiUrl) {
      console.log('Next step: node scripts/setup-check.js quick-setup <API_DOMAIN>');
    } else if (!status.hasApiKey) {
      console.log('Next step: node scripts/register.js register "YourAgentName"');
    } else if (!status.agentActive) {
      console.log('Next step: Visit your claim URL to activate the agent.');
      if (status.claimUrl) console.log(`  Claim URL: ${status.claimUrl}`);
    } else {
      console.log('Agent is fully configured and active!');
    }
  }

  process.exit(status.configured ? 0 : 1);
}

main();
