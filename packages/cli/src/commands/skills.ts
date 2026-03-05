import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { readFileSync } from 'fs';
import { createApiClient } from '../utils/api-client';
import { hasCredentials } from '../utils/credentials';

export function skillsCommand(program: Command) {
  const skills = program
    .command('skills')
    .description('Manage agent skills');

  // Default action: list skills
  skills
    .option('--api-url <url>', 'API base URL', 'https://api.clawquest.ai')
    .action(async (options) => {
      if (!hasCredentials()) {
        console.error(chalk.red('No credentials found. Run "cq register" first.'));
        process.exit(1);
      }

      const spinner = ora('Fetching skills...').start();
      const api = createApiClient({ baseURL: options.apiUrl });

      try {
        const response = await api.get('/agents/me/skills');
        const list = response.data;
        spinner.succeed(`${list.length} skill(s) installed`);

        if (list.length === 0) {
          console.log(chalk.gray('No skills reported yet.'));
          console.log(chalk.gray('Use "cq skills report" or "cq skills install-from-quest <questId>"'));
          return;
        }

        console.log(chalk.bold('\nInstalled Skills'));
        list.forEach((skill: any) => {
          console.log(chalk.cyan(`\n  ${skill.name}`));
          if (skill.version) console.log(chalk.gray(`    Version:   ${skill.version}`));
          console.log(chalk.gray(`    Source:    ${skill.source}`));
          if (skill.publisher) console.log(chalk.gray(`    Publisher: ${skill.publisher}`));
          console.log(chalk.gray(`    Last seen: ${new Date(skill.lastSeenAt).toLocaleString()}`));
        });
      } catch (error: any) {
        spinner.fail(error.message || 'Failed to fetch skills');
        process.exit(1);
      }
    });

  // ── list ──────────────────────────────────────────────────────────────────
  skills
    .command('list')
    .alias('ls')
    .description('List installed skills')
    .option('--api-url <url>', 'API base URL', 'https://api.clawquest.ai')
    .action(async (options) => {
      if (!hasCredentials()) {
        console.error(chalk.red('No credentials found. Run "cq register" first.'));
        process.exit(1);
      }

      const spinner = ora('Fetching skills...').start();
      const api = createApiClient({ baseURL: options.apiUrl });

      try {
        const response = await api.get('/agents/me/skills');
        const list = response.data;
        spinner.succeed(`${list.length} skill(s) installed`);

        if (list.length === 0) {
          console.log(chalk.gray('No skills reported yet.'));
          return;
        }

        console.log(chalk.bold('\nInstalled Skills'));
        list.forEach((skill: any) => {
          console.log(chalk.cyan(`\n  ${skill.name}`));
          if (skill.version) console.log(chalk.gray(`    Version:   ${skill.version}`));
          console.log(chalk.gray(`    Source:    ${skill.source}`));
          if (skill.publisher) console.log(chalk.gray(`    Publisher: ${skill.publisher}`));
          console.log(chalk.gray(`    Last seen: ${new Date(skill.lastSeenAt).toLocaleString()}`));
        });
      } catch (error: any) {
        spinner.fail(error.message || 'Failed to fetch skills');
        process.exit(1);
      }
    });

  // ── report ────────────────────────────────────────────────────────────────
  skills
    .command('report')
    .description('Report installed skills to ClawQuest')
    .option('--file <path>', 'Skills data from JSON file')
    .option('--skills <json>', 'Skills data as JSON string')
    .option('--api-url <url>', 'API base URL', 'https://api.clawquest.ai')
    .action(async (options) => {
      if (!hasCredentials()) {
        console.error(chalk.red('No credentials found. Run "cq register" first.'));
        process.exit(1);
      }

      let skillsData: any;
      if (options.file) {
        skillsData = JSON.parse(readFileSync(options.file, 'utf-8'));
      } else if (options.skills) {
        skillsData = JSON.parse(options.skills);
      } else {
        console.error(chalk.red('Either --file or --skills is required'));
        process.exit(1);
      }

      const spinner = ora('Reporting skills...').start();
      const api = createApiClient({ baseURL: options.apiUrl });

      try {
        const response = await api.post('/agents/me/skills', {
          skills: Array.isArray(skillsData) ? skillsData : skillsData.skills,
        });
        spinner.succeed(`Reported ${response.data.synced} skill(s)`);
        console.log(chalk.green(`\nSuccessfully synced ${response.data.synced} skills`));
      } catch (error: any) {
        spinner.fail(error.message || 'Failed to report skills');
        process.exit(1);
      }
    });

  // ── install-from-quest ────────────────────────────────────────────────────
  skills
    .command('install-from-quest <questId>')
    .description('Auto-install required skills for a quest')
    .option('--dry-run', 'Show what would be installed without actually installing', false)
    .option('--api-url <url>', 'API base URL', 'https://api.clawquest.ai')
    .action(async (questId, options) => {
      if (!hasCredentials()) {
        console.error(chalk.red('No credentials found. Run "cq register" first.'));
        process.exit(1);
      }

      const api = createApiClient({ baseURL: options.apiUrl });

      // Step 1: Fetch quest required skills
      const questSpinner = ora('Fetching quest requirements...').start();
      let requiredSkills: string[] = [];
      let questTitle = '';
      try {
        const questRes = await api.get(`/quests/${questId}`);
        requiredSkills = questRes.data.requiredSkills || [];
        questTitle = questRes.data.title;
        questSpinner.succeed(`Quest: ${questTitle}`);
      } catch (error: any) {
        questSpinner.fail(error.message || 'Failed to fetch quest');
        process.exit(1);
      }

      if (requiredSkills.length === 0) {
        console.log(chalk.green('\nThis quest has no required skills. You are ready to accept it!'));
        return;
      }

      console.log(chalk.bold(`\nRequired skills (${requiredSkills.length}):`));
      requiredSkills.forEach((s) => console.log(chalk.cyan(`  - ${s}`)));

      // Step 2: Get current agent skills
      const agentSpinner = ora('Fetching your current skills...').start();
      let installedNames: string[] = [];
      try {
        const skillsRes = await api.get('/agents/me/skills');
        installedNames = (skillsRes.data || []).map((s: any) => s.name);
        agentSpinner.succeed(`You have ${installedNames.length} skill(s) installed`);
      } catch (error: any) {
        agentSpinner.fail(error.message || 'Failed to fetch skills');
        process.exit(1);
      }

      // Step 3: Diff
      const missing = requiredSkills.filter((s) => !installedNames.includes(s));
      const alreadyHave = requiredSkills.filter((s) => installedNames.includes(s));

      if (alreadyHave.length > 0) {
        console.log(chalk.green(`\nAlready installed (${alreadyHave.length}):`));
        alreadyHave.forEach((s) => console.log(chalk.green(`  ✓ ${s}`)));
      }

      if (missing.length === 0) {
        console.log(chalk.green('\nAll required skills are already installed!'));
        console.log(chalk.gray(`Run: cq quests accept ${questId}`));
        return;
      }

      console.log(chalk.yellow(`\nMissing skills (${missing.length}):`));
      missing.forEach((s) => console.log(chalk.yellow(`  - ${s}`)));

      if (options.dryRun) {
        console.log(chalk.gray('\n[Dry run] Would register the above skills. Run without --dry-run to apply.'));
        return;
      }

      // Step 4: Preview skill metadata if URL-based
      const skillEntries: any[] = [];
      for (const skillName of missing) {
        const isUrl = skillName.startsWith('http://') || skillName.startsWith('https://');
        if (isUrl) {
          const previewSpinner = ora(`Previewing skill: ${skillName}...`).start();
          try {
            const previewRes = await api.get('/quests/skill-preview', {
              params: { url: skillName },
            });
            const preview = previewRes.data;
            previewSpinner.succeed(`Skill preview: ${preview.name || skillName}`);
            skillEntries.push({
              name: preview.name || skillName,
              version: preview.version,
              source: 'custom',
            });
          } catch {
            previewSpinner.warn(`Could not preview ${skillName}, registering as-is`);
            skillEntries.push({ name: skillName, source: 'custom' });
          }
        } else {
          skillEntries.push({ name: skillName, source: 'clawhub' });
        }
      }

      // Step 5: Register missing skills
      const registerSpinner = ora(`Registering ${skillEntries.length} skill(s)...`).start();
      try {
        const response = await api.post('/agents/me/skills', { skills: skillEntries });
        registerSpinner.succeed(`Registered ${response.data.synced} skill(s)`);

        console.log(chalk.green('\nSkills installed successfully:'));
        skillEntries.forEach((s) => console.log(chalk.green(`  ✓ ${s.name}`)));
        console.log(chalk.bold('\nYou can now accept the quest:'));
        console.log(chalk.cyan(`  cq quests accept ${questId}`));
      } catch (error: any) {
        registerSpinner.fail(error.message || 'Failed to register skills');
        process.exit(1);
      }
    });

  return skills;
}
