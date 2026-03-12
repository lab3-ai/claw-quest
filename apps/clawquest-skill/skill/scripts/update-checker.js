#!/usr/bin/env node
/**
 * Update Checker — check if a newer version of this skill is available
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  apiRequest,
  checkApiKey,
  success,
  error,
  warning,
  info,
} from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Version detection ────────────────────────────────────────────────────────

function getCurrentVersion() {
  // Try to read version from SKILL.md in parent directory
  const skillMdPath = path.join(__dirname, '..', 'SKILL.md');
  if (fs.existsSync(skillMdPath)) {
    const content = fs.readFileSync(skillMdPath, 'utf8');
    const match = content.match(/^version:\s*(.+)$/m);
    if (match) return match[1].trim();
  }
  return '1.0.0';
}

// ─── Check ────────────────────────────────────────────────────────────────────

export async function checkForUpdates() {
  const currentVersion = getCurrentVersion();

  try {
    info(`Checking for updates... (current: v${currentVersion})`);

    const response = await apiRequest(`/skill-version?current=${currentVersion}&skill=clawquest`);

    if (response.update_available || response.updateAvailable) {
      const latest = response.latest_version || response.latestVersion;
      warning(`Update available: v${currentVersion} → v${latest}`);

      if (response.changelog) {
        console.log('\nChangelog:');
        console.log(response.changelog);
      }

      info('\nTo update: reinstall via clawhub or download from https://www.clawquest.ai');

      return { updateAvailable: true, currentVersion, latestVersion: latest };
    }

    success(`Skill is up to date: v${currentVersion}`);
    return { updateAvailable: false, currentVersion };
  } catch (e) {
    // Don't crash on update check failure
    warning(`Update check failed: ${e.message}`);
    return { updateAvailable: false, error: e.message };
  }
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

async function main() {
  const command = process.argv[2] || 'check';

  if (!checkApiKey()) process.exit(1);

  try {
    switch (command) {
      case 'check': {
        await checkForUpdates();
        break;
      }
      case 'version': {
        console.log(getCurrentVersion());
        break;
      }
      default: {
        console.log('ClawQuest Skill Update Checker\n');
        console.log('Usage:');
        console.log('  node update-checker.js check   - Check for updates');
        console.log('  node update-checker.js version - Print current version');
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
