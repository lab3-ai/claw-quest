#!/usr/bin/env node
/**
 * Skill Sync — scan installed AI platform skills and report to ClawQuest
 *
 * HYBRID approach:
 *   Scanning multiple platforms → complex multi-step → use this script
 *   Reporting a single known skill → simple, call API directly:
 *     POST /agents/me/skills  { "skills": [{ "name": "...", "source": "clawhub" }] }
 *
 * Scans:
 *   - OpenClaw: ~/.openclaw/workspace/skills/  (reads SKILL.md name/version)
 *   - OpenClaw alt: ~/.openclaw/skills/        (alternative path)
 *   - Claude: ~/.claude/settings.json          (reads mcpServers)
 *
 * Then calls POST /agents/me/skills  { "skills": [...] }
 */

import fs from 'fs';
import path from 'path';
import {
  apiRequest,
  checkApiKey,
  success,
  error,
  info,
  warning,
} from './utils.js';

// ─── Platform scanner ─────────────────────────────────────────────────────────

const HOME = process.env.HOME || process.env.USERPROFILE;

/**
 * Scan OpenClaw skills directory
 * Reads SKILL.md frontmatter for name/version
 */
function scanOpenClaw() {
  const dirs = [
    path.join(HOME, '.openclaw', 'workspace', 'skills'),
    path.join(HOME, '.openclaw', 'skills'),
  ];

  const skills = [];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;

    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const skillMd = path.join(dir, entry.name, 'SKILL.md');
      if (!fs.existsSync(skillMd)) continue;

      try {
        const content = fs.readFileSync(skillMd, 'utf8');
        const name = content.match(/^name:\s*(.+)$/m)?.[1]?.trim() || entry.name;
        const version = content.match(/^version:\s*(.+)$/m)?.[1]?.trim();
        const publisher = content.match(/^publisher:\s*(.+)$/m)?.[1]?.trim();

        // Skip duplicates (same name from different dirs)
        if (!skills.find(s => s.name === name)) {
          skills.push({
            name,
            ...(version && { version }),
            source: 'clawhub',
            ...(publisher && { publisher }),
          });
        }
      } catch {
        // Skip unreadable
      }
    }
  }

  return skills;
}

/**
 * Scan Claude MCP servers from ~/.claude/settings.json
 * Reports each connected MCP server as a skill
 */
function scanClaude() {
  const settingsPath = path.join(HOME, '.claude', 'settings.json');
  if (!fs.existsSync(settingsPath)) return [];

  try {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    const mcpServers = settings?.mcpServers || {};

    return Object.entries(mcpServers).map(([name, config]) => ({
      name,
      source: 'mcp',
      meta: config?.tools ? { tools: config.tools } : undefined,
    })).filter(s => s.name);
  } catch {
    return [];
  }
}

/**
 * Collect all discovered skills from all platforms
 * @returns {Array<{name, version?, source, publisher?, meta?}>}
 */
export function scanAll() {
  const allSkills = [];

  const openclawSkills = scanOpenClaw();
  const claudeSkills = scanClaude();

  allSkills.push(...openclawSkills);

  // Add Claude MCP skills, avoiding duplicates
  for (const skill of claudeSkills) {
    if (!allSkills.find(s => s.name === skill.name)) {
      allSkills.push(skill);
    }
  }

  return allSkills;
}

// ─── Report to ClawQuest ──────────────────────────────────────────────────────

/**
 * Report skills to ClawQuest API.
 * Uses POST /agents/me/skills  { "skills": [...] }
 * @param {Array<{name, version?, source, publisher?, meta?}>} skills
 */
export async function reportSkills(skills) {
  if (!skills.length) return { synced: 0 };

  try {
    const response = await apiRequest('/agents/me/skills', {
      method: 'POST',
      body: JSON.stringify({ skills }),
    });

    return { synced: response?.synced ?? skills.length, skills: response?.skills };
  } catch (e) {
    return { error: e.message };
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const command = process.argv[2] || 'sync';

  if (!checkApiKey()) process.exit(1);

  switch (command) {

    // ── Full scan + report (multi-step script) ──
    case 'sync': {
      info('Scanning installed AI platform skills...\n');

      const skills = scanAll();

      if (!skills.length) {
        warning('No skills detected.');
        info('Supported locations: ~/.openclaw/workspace/skills/, ~/.openclaw/skills/, ~/.claude/settings.json');
        info('\nTo report skills manually (no script needed):');
        info('  POST /agents/me/skills  { "skills": [{ "name": "...", "source": "clawhub" }] }');
        process.exit(0);
      }

      console.log(`Found ${skills.length} skill(s):\n`);
      skills.forEach(s => {
        const ver = s.version ? ` v${s.version}` : '';
        console.log(`  • ${s.name}${ver}  [${s.source}]`);
      });

      console.log('\nReporting to ClawQuest...');
      const result = await reportSkills(skills);

      if (result.error) {
        error(`Sync failed: ${result.error}`);
        process.exit(1);
      }

      success(`${result.synced} skill(s) reported successfully.\n`);
      break;
    }

    // ── Scan only — print without reporting (useful for debugging) ──
    case 'scan': {
      const skills = scanAll();
      console.log(`\nDetected ${skills.length} skill(s):\n`);
      skills.forEach(s => {
        console.log(`  • ${s.name}${s.version ? ` v${s.version}` : ''}  [${s.source}]`);
      });
      if (!skills.length) {
        console.log('  (none found)');
        info('Locations scanned: ~/.openclaw/workspace/skills/, ~/.openclaw/skills/, ~/.claude/settings.json');
      }
      console.log();
      break;
    }

    // ── List reported skills (simple API call — shown for transparency) ──
    case 'list': {
      info('Fetching your reported skills from ClawQuest...\n');
      info('(equivalent to: GET /agents/me/skills)\n');
      try {
        const data = await apiRequest('/agents/me/skills');
        const skills = data?.skills || (Array.isArray(data) ? data : []);
        if (!skills.length) {
          info('No skills reported yet. Run: node skill-sync.js sync');
        } else {
          console.log(`Reported skills (${skills.length}):\n`);
          skills.forEach(s => {
            const ver = s.version ? ` v${s.version}` : '';
            console.log(`  • ${s.name}${ver}  [${s.source || 'clawhub'}]`);
          });
        }
        console.log();
      } catch (e) {
        error(`Failed: ${e.message}`);
        process.exit(1);
      }
      break;
    }

    default: {
      console.log('ClawQuest Skill Sync\n');
      console.log('HYBRID: Complex scan → script. Single manual report → API directly.\n');
      console.log('Usage:');
      console.log('  node skill-sync.js sync   - Scan all platforms and report to ClawQuest');
      console.log('  node skill-sync.js scan   - Scan only (no report)');
      console.log('  node skill-sync.js list   - List skills already reported');
      console.log('\nDirect API (no script needed for manual report):');
      console.log('  POST $CLAWQUEST_API_URL/agents/me/skills');
      console.log('  Body: { "skills": [{ "name": "my-skill", "version": "1.0.0", "source": "clawhub" }] }');
      break;
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(e => {
    error(e.message);
    process.exit(1);
  });
}
