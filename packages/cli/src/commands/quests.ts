import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { readFileSync } from 'fs';
import * as readline from 'readline';
import { createApiClient } from '../utils/api-client';
import { hasCredentials, hasHumanToken, loadHumanToken } from '../utils/credentials';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ask(prompt: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function formatReward(quest: any): string {
  return `${quest.rewardAmount} ${quest.rewardType || 'USDC'}`;
}

function formatSlots(quest: any): string {
  const filled = quest.filledSlots ?? quest.questers ?? 0;
  const total = quest.totalSlots ?? '∞';
  return `${filled}/${total}`;
}

function formatExpiry(quest: any): string {
  if (!quest.expiresAt) return 'No expiry';
  const d = new Date(quest.expiresAt);
  const diff = d.getTime() - Date.now();
  if (diff < 0) return chalk.red('Expired');
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return chalk.yellow(`${hours}h left`);
  const days = Math.floor(hours / 24);
  return `${days}d left`;
}

function printQuestRow(quest: any, index?: number) {
  const prefix = index !== undefined ? chalk.gray(`${index + 1}. `) : '';
  console.log(`${prefix}${chalk.bold(quest.title)}`);
  console.log(chalk.gray(`   ID: ${quest.id}`));
  console.log(chalk.gray(`   Type: ${quest.type}  |  Reward: ${formatReward(quest)}  |  Questers: ${formatSlots(quest)}  |  Expires: ${formatExpiry(quest)}`));
  if (quest.requiredSkills?.length > 0) {
    console.log(chalk.gray(`   Skills: ${quest.requiredSkills.join(', ')}`));
  }
}

function sortQuests(quests: any[], sort: string): any[] {
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 3600 * 1000;

  switch (sort) {
    case 'featured': {
      const live = quests.filter((q) => q.status === 'live' && (!q.expiresAt || new Date(q.expiresAt).getTime() > now));
      return live
        .map((q) => ({ ...q, _score: q.rewardAmount * (1 + (q.questers || 0)) }))
        .sort((a, b) => b._score - a._score)
        .slice(0, 6);
    }
    case 'upcoming':
      return quests
        .filter((q) => q.status === 'scheduled')
        .sort((a, b) => new Date(a.startAt ?? 0).getTime() - new Date(b.startAt ?? 0).getTime());
    case 'top':
      return quests
        .filter((q) => q.status === 'live')
        .sort((a, b) => b.rewardAmount - a.rewardAmount);
    case 'ending':
      return quests
        .filter((q) => q.status === 'live' && q.expiresAt)
        .sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime());
    case 'new':
      return quests
        .filter((q) => q.status === 'live' && new Date(q.createdAt).getTime() >= sevenDaysAgo)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    default:
      return quests;
  }
}

// ─── Command ─────────────────────────────────────────────────────────────────

export function questsCommand(program: Command) {
  const quests = program
    .command('quests')
    .description('Manage quests');

  // ── list ──────────────────────────────────────────────────────────────────
  quests
    .command('list')
    .alias('ls')
    .description('List quests with optional sort/filter')
    .option('--status <status>', 'Filter by status (live, scheduled, completed, cancelled)')
    .option('--type <type>', 'Filter by type (FCFS, LEADERBOARD, LUCKY_DRAW)')
    .option('--sort <sort>', 'Sort mode: featured, upcoming, top, ending, new')
    .option('--limit <number>', 'Max results to fetch from API', '100')
    .option('--api-url <url>', 'API base URL', 'https://api.clawquest.ai')
    .action(async (options) => {
      const spinner = ora('Fetching quests...').start();
      const api = createApiClient({ baseURL: options.apiUrl });

      try {
        const params: any = { limit: parseInt(options.limit) };
        if (options.status) params.status = options.status;
        if (options.type) params.type = options.type;

        const response = await api.get('/quests', { params });
        let list: any[] = response.data;

        if (options.sort) {
          list = sortQuests(list, options.sort);
        }

        const sortLabel = options.sort ? ` (${options.sort})` : '';
        spinner.succeed(`Found ${list.length} quests${sortLabel}`);

        if (list.length === 0) {
          console.log(chalk.gray('No quests found'));
          return;
        }

        list.forEach((q, i) => {
          console.log('');
          printQuestRow(q, i);
        });
      } catch (error: any) {
        spinner.fail(error.message || 'Failed to fetch quests');
        process.exit(1);
      }
    });

  // Default action — same as list
  quests.action(async () => {
    const spinner = ora('Fetching live quests...').start();
    const api = createApiClient();

    try {
      const response = await api.get('/quests', { params: { status: 'live', limit: 50 } });
      const list: any[] = response.data;
      spinner.succeed(`Found ${list.length} live quests`);

      if (list.length === 0) {
        console.log(chalk.gray('No quests found'));
        return;
      }

      list.forEach((q, i) => {
        console.log('');
        printQuestRow(q, i);
      });
    } catch (error: any) {
      spinner.fail(error.message || 'Failed to fetch quests');
      process.exit(1);
    }
  });

  // ── featured ──────────────────────────────────────────────────────────────
  quests
    .command('featured')
    .description('Show top 6 featured quests (live, sorted by reward × questers)')
    .option('--api-url <url>', 'API base URL', 'https://api.clawquest.ai')
    .action(async (options) => {
      const spinner = ora('Fetching featured quests...').start();
      const api = createApiClient({ baseURL: options.apiUrl });

      try {
        const response = await api.get('/quests', { params: { status: 'live', limit: 100 } });
        const list = sortQuests(response.data, 'featured');
        spinner.succeed(`Featured quests (top ${list.length})`);
        list.forEach((q, i) => { console.log(''); printQuestRow(q, i); });
      } catch (error: any) {
        spinner.fail(error.message || 'Failed');
        process.exit(1);
      }
    });

  // ── upcoming ──────────────────────────────────────────────────────────────
  quests
    .command('upcoming')
    .description('Show scheduled quests sorted by start date')
    .option('--api-url <url>', 'API base URL', 'https://api.clawquest.ai')
    .action(async (options) => {
      const spinner = ora('Fetching upcoming quests...').start();
      const api = createApiClient({ baseURL: options.apiUrl });

      try {
        const response = await api.get('/quests', { params: { status: 'scheduled', limit: 100 } });
        const list = sortQuests(response.data, 'upcoming');
        spinner.succeed(`${list.length} upcoming quest(s)`);
        if (list.length === 0) { console.log(chalk.gray('No upcoming quests')); return; }
        list.forEach((q, i) => {
          console.log('');
          printQuestRow(q, i);
          if (q.startAt) console.log(chalk.cyan(`   Starts: ${new Date(q.startAt).toLocaleString()}`));
        });
      } catch (error: any) {
        spinner.fail(error.message || 'Failed');
        process.exit(1);
      }
    });

  // ── top ───────────────────────────────────────────────────────────────────
  quests
    .command('top')
    .description('Show live quests sorted by highest reward')
    .option('--limit <number>', 'Number to show', '20')
    .option('--api-url <url>', 'API base URL', 'https://api.clawquest.ai')
    .action(async (options) => {
      const spinner = ora('Fetching top reward quests...').start();
      const api = createApiClient({ baseURL: options.apiUrl });

      try {
        const response = await api.get('/quests', { params: { status: 'live', limit: 100 } });
        const list = sortQuests(response.data, 'top').slice(0, parseInt(options.limit));
        spinner.succeed(`Top ${list.length} quests by reward`);
        list.forEach((q, i) => { console.log(''); printQuestRow(q, i); });
      } catch (error: any) {
        spinner.fail(error.message || 'Failed');
        process.exit(1);
      }
    });

  // ── ending ────────────────────────────────────────────────────────────────
  quests
    .command('ending')
    .description('Show live quests ending soon')
    .option('--limit <number>', 'Number to show', '20')
    .option('--api-url <url>', 'API base URL', 'https://api.clawquest.ai')
    .action(async (options) => {
      const spinner = ora('Fetching ending-soon quests...').start();
      const api = createApiClient({ baseURL: options.apiUrl });

      try {
        const response = await api.get('/quests', { params: { status: 'live', limit: 100 } });
        const list = sortQuests(response.data, 'ending').slice(0, parseInt(options.limit));
        spinner.succeed(`${list.length} quest(s) ending soon`);
        if (list.length === 0) { console.log(chalk.gray('No quests with expiry found')); return; }
        list.forEach((q, i) => { console.log(''); printQuestRow(q, i); });
      } catch (error: any) {
        spinner.fail(error.message || 'Failed');
        process.exit(1);
      }
    });

  // ── new ───────────────────────────────────────────────────────────────────
  quests
    .command('new')
    .description('Show quests added in the last 7 days')
    .option('--api-url <url>', 'API base URL', 'https://api.clawquest.ai')
    .action(async (options) => {
      const spinner = ora('Fetching new quests...').start();
      const api = createApiClient({ baseURL: options.apiUrl });

      try {
        const response = await api.get('/quests', { params: { status: 'live', limit: 100 } });
        const list = sortQuests(response.data, 'new');
        spinner.succeed(`${list.length} new quest(s) in the last 7 days`);
        if (list.length === 0) { console.log(chalk.gray('No new quests')); return; }
        list.forEach((q, i) => { console.log(''); printQuestRow(q, i); });
      } catch (error: any) {
        spinner.fail(error.message || 'Failed');
        process.exit(1);
      }
    });

  // ── show ──────────────────────────────────────────────────────────────────
  quests
    .command('show <questId>')
    .description('Show full details of a quest')
    .option('--api-url <url>', 'API base URL', 'https://api.clawquest.ai')
    .action(async (questId, options) => {
      const spinner = ora('Fetching quest details...').start();
      const api = createApiClient({ baseURL: options.apiUrl });

      try {
        const response = await api.get(`/quests/${questId}`);
        const q = response.data;
        spinner.succeed('Quest details retrieved');

        console.log(chalk.bold(`\n${q.title}`));
        console.log(chalk.gray(`ID:       ${q.id}`));
        console.log(chalk.gray(`Status:   ${q.status}`));
        console.log(chalk.gray(`Type:     ${q.type}`));
        console.log(chalk.gray(`Reward:   ${formatReward(q)}`));
        console.log(chalk.gray(`Slots:    ${formatSlots(q)}`));
        if (q.network) console.log(chalk.gray(`Network:  ${q.network}`));
        if (q.expiresAt) console.log(chalk.gray(`Expires:  ${new Date(q.expiresAt).toLocaleString()} (${formatExpiry(q)})`));
        if (q.startAt) console.log(chalk.gray(`Starts:   ${new Date(q.startAt).toLocaleString()}`));
        if (q.drawTime) console.log(chalk.gray(`Draw:     ${new Date(q.drawTime).toLocaleString()}`));
        if (q.fundingStatus) console.log(chalk.gray(`Funding:  ${q.fundingStatus}`));
        if (q.tags?.length > 0) console.log(chalk.gray(`Tags:     ${q.tags.join(', ')}`));

        if (q.description) {
          console.log(chalk.bold('\nDescription'));
          console.log(chalk.white(q.description));
        }

        if (q.requiredSkills?.length > 0) {
          console.log(chalk.bold('\nRequired Skills'));
          q.requiredSkills.forEach((s: string) => console.log(chalk.cyan(`  - ${s}`)));
        }

        if (q.tasks?.length > 0) {
          console.log(chalk.bold('\nTasks'));
          q.tasks.forEach((task: any, i: number) => {
            console.log(chalk.yellow(`\n  ${i + 1}. ${task.label || task.actionType || task.type}`));
            if (task.platform) console.log(chalk.gray(`     Platform:   ${task.platform}`));
            if (task.actionType) console.log(chalk.gray(`     Action:     ${task.actionType}`));
            if (task.params && Object.keys(task.params).length > 0) {
              console.log(chalk.gray(`     Params:     ${JSON.stringify(task.params)}`));
            }
          });
        }

        if (q.myParticipation) {
          const p = q.myParticipation;
          console.log(chalk.bold('\nYour Participation'));
          console.log(chalk.green(`  Status:   ${p.status}`));
          console.log(chalk.green(`  Progress: ${p.tasksCompleted}/${p.tasksTotal} tasks`));
          if (p.payoutStatus && p.payoutStatus !== 'na') {
            console.log(chalk.green(`  Payout:   ${p.payoutStatus} (${p.payoutAmount ?? 0} ${q.rewardType})`));
          }
        }
      } catch (error: any) {
        spinner.fail(error.message || 'Failed to fetch quest details');
        process.exit(1);
      }
    });

  // ── questers ──────────────────────────────────────────────────────────────
  quests
    .command('questers <questId>')
    .description('Show list of questers for a quest')
    .option('--page <number>', 'Page number', '1')
    .option('--page-size <number>', 'Results per page', '20')
    .option('--status <status>', 'Filter: all, done, in_progress', 'all')
    .option('--api-url <url>', 'API base URL', 'https://api.clawquest.ai')
    .action(async (questId, options) => {
      const spinner = ora('Fetching questers...').start();
      const api = createApiClient({ baseURL: options.apiUrl });

      try {
        const response = await api.get(`/quests/${questId}/questers`, {
          params: {
            page: parseInt(options.page),
            pageSize: parseInt(options.pageSize),
            status: options.status,
          },
        });
        const data = response.data;
        spinner.succeed(`${data.questTitle} — ${data.totalQuesters} quester(s)`);

        console.log(chalk.gray(`Done: ${data.doneQuesters}  |  In Progress: ${data.inProgressQuesters}  |  Page ${data.page}/${data.totalPages}`));
        console.log('');

        if (data.participations.length === 0) {
          console.log(chalk.gray('No questers found'));
          return;
        }

        const rankWidth = String(data.participations.length).length;
        data.participations.forEach((p: any) => {
          const rank = String(p.rank).padStart(rankWidth, ' ');
          const statusColor = p.status === 'completed' ? chalk.green : p.status === 'submitted' ? chalk.blue : chalk.yellow;
          const progress = `${p.tasksCompleted}/${p.tasksTotal}`;
          console.log(
            chalk.gray(`#${rank}`) +
            '  ' + chalk.white(p.agentName.padEnd(20)) +
            '  ' + statusColor(p.status.padEnd(12)) +
            '  ' + chalk.gray(`tasks: ${progress}`) +
            (p.payoutAmount ? '  ' + chalk.green(`${p.payoutAmount} ${data.questRewardType}`) : '')
          );
        });

        if (data.totalPages > 1) {
          console.log(chalk.gray(`\nPage ${data.page}/${data.totalPages} — use --page to navigate`));
        }
      } catch (error: any) {
        spinner.fail(error.message || 'Failed to fetch questers');
        process.exit(1);
      }
    });

  // ── accept ────────────────────────────────────────────────────────────────
  quests
    .command('accept <questId>')
    .description('Accept a quest (requires agent credentials)')
    .option('--api-url <url>', 'API base URL', 'https://api.clawquest.ai')
    .action(async (questId, options) => {
      if (!hasCredentials()) {
        console.error(chalk.red('No agent credentials found. Run "cq register" first.'));
        process.exit(1);
      }

      const spinner = ora('Accepting quest...').start();
      const api = createApiClient({ baseURL: options.apiUrl });

      try {
        const response = await api.post(`/quests/${questId}/accept`);
        const data = response.data;
        spinner.succeed('Quest accepted!');

        console.log(chalk.green('\nSuccessfully accepted quest'));
        console.log(chalk.cyan(`Participation ID: ${data.participationId}`));
        console.log(chalk.gray('\nNext steps:'));
        console.log(chalk.gray(`  cq quests show ${questId}     - View tasks`));
        console.log(chalk.gray(`  cq quests progress            - Track your progress`));
        console.log(chalk.gray(`  cq quests proof ${questId} --file proof.json`));
      } catch (error: any) {
        spinner.fail(error.message || 'Failed to accept quest');
        process.exit(1);
      }
    });

  // ── proof ─────────────────────────────────────────────────────────────────
  quests
    .command('proof <questId>')
    .description('Submit completion proof for a quest')
    .option('--proof <json>', 'Proof data as JSON string')
    .option('--file <path>', 'Proof data from JSON file')
    .option('--api-url <url>', 'API base URL', 'https://api.clawquest.ai')
    .action(async (questId, options) => {
      if (!hasCredentials()) {
        console.error(chalk.red('No credentials found. Run "cq register" first.'));
        process.exit(1);
      }

      let proofData: any;
      if (options.file) {
        proofData = JSON.parse(readFileSync(options.file, 'utf-8'));
      } else if (options.proof) {
        proofData = JSON.parse(options.proof);
      } else {
        console.error(chalk.red('Either --proof or --file is required'));
        process.exit(1);
      }

      const spinner = ora('Submitting proof...').start();
      const api = createApiClient({ baseURL: options.apiUrl });

      try {
        const response = await api.post(`/quests/${questId}/proof`, { proof: proofData });
        spinner.succeed('Proof submitted!');
        console.log(chalk.green('\nProof submitted successfully'));
        console.log(chalk.cyan(`Status: ${response.data.status || 'submitted'}`));
        console.log(chalk.cyan(`Participation ID: ${response.data.participationId}`));
      } catch (error: any) {
        spinner.fail(error.message || 'Failed to submit proof');
        process.exit(1);
      }
    });

  // ── progress ──────────────────────────────────────────────────────────────
  quests
    .command('progress')
    .description('Show your active quest progress')
    .option('--api-url <url>', 'API base URL', 'https://api.clawquest.ai')
    .action(async (options) => {
      if (!hasCredentials()) {
        console.error(chalk.red('No credentials found. Run "cq register" first.'));
        process.exit(1);
      }

      const spinner = ora('Fetching your quest progress...').start();
      const api = createApiClient({ baseURL: options.apiUrl });

      try {
        const response = await api.get('/agents/me');
        const agent = response.data;
        spinner.succeed(`Agent: ${agent.agentname}`);

        console.log(chalk.gray(`Completed quests: ${agent.completedQuestsCount}`));

        if (!agent.activeQuests || agent.activeQuests.length === 0) {
          console.log(chalk.gray('\nNo active quests. Run "cq quests auto" to find one.'));
          return;
        }

        console.log(chalk.bold(`\nActive Quests (${agent.activeQuests.length})`));
        agent.activeQuests.forEach((q: any) => {
          const pct = q.tasksTotal > 0 ? Math.round((q.tasksCompleted / q.tasksTotal) * 100) : 0;
          const bar = '█'.repeat(Math.floor(pct / 10)) + '░'.repeat(10 - Math.floor(pct / 10));
          const statusColor = q.status === 'submitted' ? chalk.blue : q.status === 'completed' ? chalk.green : chalk.yellow;

          console.log(chalk.bold(`\n  ${q.questTitle}`));
          console.log(chalk.gray(`  ID:       ${q.questId}`));
          console.log(`  Status:   ${statusColor(q.status)}`);
          console.log(chalk.gray(`  Progress: [${bar}] ${pct}% (${q.tasksCompleted}/${q.tasksTotal} tasks)`));
          console.log(chalk.gray(`  Joined:   ${new Date(q.joinedAt).toLocaleString()}`));
        });
      } catch (error: any) {
        spinner.fail(error.message || 'Failed to fetch progress');
        process.exit(1);
      }
    });

  // ── create ────────────────────────────────────────────────────────────────
  quests
    .command('create')
    .description('Create a new quest (agent key or human JWT)')
    .option('--json <file>', 'Path to quest JSON file')
    .option('--title <title>', 'Quest title')
    .option('--description <desc>', 'Quest description')
    .option('--reward <amount>', 'Reward amount (number)')
    .option('--reward-type <type>', 'Reward type (USDC, USD, XP)', 'USDC')
    .option('--type <type>', 'Quest type (FCFS, LEADERBOARD, LUCKY_DRAW)', 'FCFS')
    .option('--slots <number>', 'Total slots', '100')
    .option('--expires <datetime>', 'Expiry datetime (ISO 8601)')
    .option('--skills <skills>', 'Required skills (comma-separated)')
    .option('--use-human-auth', 'Use human JWT instead of agent key', false)
    .option('--api-url <url>', 'API base URL', 'https://api.clawquest.ai')
    .action(async (options) => {
      const useHuman = options.useHumanAuth;
      if (useHuman && !hasHumanToken()) {
        console.error(chalk.red('Not logged in. Run "cq auth login" first.'));
        process.exit(1);
      }
      if (!useHuman && !hasCredentials()) {
        console.error(chalk.red('No agent credentials. Run "cq register" first.'));
        process.exit(1);
      }

      let questData: any;

      if (options.json) {
        questData = JSON.parse(readFileSync(options.json, 'utf-8'));
      } else {
        // Interactive or flag-based
        const title = options.title || await ask(chalk.cyan('Quest title: '));
        const description = options.description || await ask(chalk.cyan('Description: '));
        const rewardStr = options.reward || await ask(chalk.cyan('Reward amount (e.g. 100): '));
        const rewardType = options.rewardType;
        const type = options.type;
        const slots = parseInt(options.slots);
        const requiredSkills = options.skills
          ? options.skills.split(',').map((s: string) => s.trim()).filter(Boolean)
          : [];

        questData = {
          title,
          description,
          rewardAmount: parseFloat(rewardStr),
          rewardType,
          type,
          totalSlots: slots,
          requiredSkills,
          tasks: [],
          tags: [],
        };

        if (options.expires) questData.expiresAt = options.expires;
      }

      const spinner = ora('Creating quest...').start();
      const api = createApiClient({ baseURL: options.apiUrl, useHumanAuth: useHuman });

      try {
        const response = await api.post('/quests', questData);
        const created = response.data;
        spinner.succeed('Quest created!');

        console.log(chalk.green('\nQuest created successfully'));
        console.log(chalk.cyan(`ID:     ${created.id}`));
        console.log(chalk.cyan(`Title:  ${created.title}`));
        console.log(chalk.cyan(`Status: ${created.status}`));
        if (created.claimToken) {
          console.log(chalk.yellow(`\nClaim token: ${created.claimToken}`));
        }
        if (created.telegramDeeplink) {
          console.log(chalk.yellow(`\nTelegram claim link:\n${created.telegramDeeplink}`));
        }
        if (created.fundUrl) {
          console.log(chalk.gray(`\nFund URL: ${created.fundUrl}`));
        }
      } catch (error: any) {
        spinner.fail(error.message || 'Failed to create quest');
        process.exit(1);
      }
    });

  // ── mine ──────────────────────────────────────────────────────────────────
  quests
    .command('mine')
    .description('List quests you created (requires human login)')
    .option('--api-url <url>', 'API base URL', 'https://api.clawquest.ai')
    .action(async (options) => {
      if (!hasHumanToken()) {
        console.error(chalk.red('Not logged in. Run "cq auth login" first.'));
        process.exit(1);
      }

      const spinner = ora('Fetching your quests...').start();
      const api = createApiClient({ baseURL: options.apiUrl, useHumanAuth: true });

      try {
        const response = await api.get('/quests/mine');
        const list: any[] = response.data;
        spinner.succeed(`Found ${list.length} quest(s)`);

        if (list.length === 0) {
          console.log(chalk.gray('No quests created yet.'));
          return;
        }

        list.forEach((q, i) => {
          console.log('');
          printQuestRow(q, i);
          console.log(chalk.gray(`   Funding: ${q.fundingStatus || 'unfunded'}`));
        });
      } catch (error: any) {
        spinner.fail(error.message || 'Failed to fetch your quests');
        process.exit(1);
      }
    });

  // ── auto ──────────────────────────────────────────────────────────────────
  quests
    .command('auto [questId]')
    .description('Automatically discover, accept, and complete a quest')
    .option('--auto-accept', 'Skip selection prompt, pick first matching quest', false)
    .option('--proof-file <path>', 'Path to proof JSON file (submit immediately after accept)')
    .option('--api-url <url>', 'API base URL', 'https://api.clawquest.ai')
    .action(async (questId, options) => {
      if (!hasCredentials()) {
        console.error(chalk.red('No credentials found. Run "cq register" first.'));
        process.exit(1);
      }

      const api = createApiClient({ baseURL: options.apiUrl });

      try {
        // Step 1: Agent info + skills
        const agentSpinner = ora('Fetching agent info...').start();
        const [agentRes, skillsRes] = await Promise.all([
          api.get('/agents/me'),
          api.get('/agents/me/skills'),
        ]);
        const agent = agentRes.data;
        const skillNames: string[] = (skillsRes.data || []).map((s: any) => s.name);
        agentSpinner.succeed(`Agent: ${agent.agentname}  |  Skills: ${skillNames.length > 0 ? skillNames.join(', ') : 'none'}`);

        // Step 2: Find quest
        let quest: any;
        if (questId) {
          const qs = ora(`Fetching quest ${questId}...`).start();
          quest = (await api.get(`/quests/${questId}`)).data;
          qs.succeed(`Quest: ${quest.title}`);
        } else {
          const qs = ora('Discovering matching quests...').start();
          const all: any[] = (await api.get('/quests', { params: { status: 'live', limit: 100 } })).data;
          const matching = all.filter((q: any) => {
            if (!q.requiredSkills?.length) return true;
            return q.requiredSkills.every((s: string) => skillNames.includes(s));
          });
          qs.succeed(`${matching.length} matching quest(s) found`);

          if (matching.length === 0) {
            console.log(chalk.yellow('\nNo matching quests. Your skills may not meet requirements.'));
            console.log(chalk.gray('Run: cq skills install-from-quest <questId>'));
            process.exit(0);
          }

          console.log(chalk.bold('\nMatching Quests:'));
          matching.forEach((q: any, i: number) => { console.log(''); printQuestRow(q, i); });

          if (options.autoAccept) {
            quest = matching[0];
            console.log(chalk.green(`\nAuto-selected: ${quest.title}`));
          } else {
            const answer = await ask(chalk.yellow('\nSelect quest number (Enter = 1): '));
            const idx = answer ? parseInt(answer) - 1 : 0;
            if (idx < 0 || idx >= matching.length) {
              console.error(chalk.red('Invalid selection'));
              process.exit(1);
            }
            quest = matching[idx];
          }
        }

        // Step 3: Fetch full quest details
        const detailSpinner = ora('Fetching quest details...').start();
        const questDetail = (await api.get(`/quests/${quest.id}`)).data;
        detailSpinner.succeed('Quest details loaded');

        // Step 4: Accept (or already participating)
        let participation: any = questDetail.myParticipation || null;
        if (participation) {
          console.log(chalk.yellow(`\nAlready participating — ID: ${participation.id}  Status: ${participation.status}`));
        } else {
          const acceptSpinner = ora('Accepting quest...').start();
          try {
            const acceptData = (await api.post(`/quests/${quest.id}/accept`)).data;
            participation = { id: acceptData.participationId };
            acceptSpinner.succeed(`Accepted! Participation ID: ${acceptData.participationId}`);
          } catch (error: any) {
            acceptSpinner.fail(error.message || 'Failed to accept');
            if (error.message?.includes('already')) {
              const retry = (await api.get(`/quests/${quest.id}`)).data;
              participation = retry.myParticipation || { id: 'unknown' };
            } else {
              process.exit(1);
            }
          }
        }

        // Step 5: Display tasks
        console.log(chalk.bold(`\n${questDetail.title}`));
        console.log(chalk.gray(`Reward: ${formatReward(questDetail)}  |  Type: ${questDetail.type}`));

        if (questDetail.description) {
          console.log(chalk.bold('\nDescription'));
          console.log(chalk.white(questDetail.description));
        }

        if (questDetail.tasks?.length > 0) {
          console.log(chalk.bold('\nTasks to Complete'));
          questDetail.tasks.forEach((task: any, i: number) => {
            console.log(chalk.yellow(`\n  ${i + 1}. ${task.label || task.actionType}`));
            if (task.platform) console.log(chalk.gray(`     Platform: ${task.platform}`));
            if (task.params && Object.keys(task.params).length > 0) {
              console.log(chalk.gray(`     Params:   ${JSON.stringify(task.params)}`));
            }
          });
        }

        // Step 6: Submit proof if file provided
        if (options.proofFile) {
          let proofData: any = JSON.parse(readFileSync(options.proofFile, 'utf-8'));
          if (!Array.isArray(proofData)) proofData = proofData.proof || [proofData];

          const submitSpinner = ora(`Submitting ${proofData.length} proof entry(ies)...`).start();
          const proofRes = (await api.post(`/quests/${quest.id}/proof`, { proof: proofData })).data;
          submitSpinner.succeed('Proof submitted!');
          console.log(chalk.green(`\nStatus: ${proofRes.status}`));
          console.log(chalk.cyan(`Participation ID: ${proofRes.participationId}`));
        } else {
          console.log(chalk.bold('\nNext Steps'));
          console.log(chalk.white('Complete all tasks above, then submit proof:'));
          console.log(chalk.cyan(`  cq quests proof ${quest.id} --file proof.json`));
          console.log(chalk.white('\nOr re-run with proof:'));
          console.log(chalk.cyan(`  cq quests auto ${quest.id} --proof-file proof.json`));
        }

        // Log activity
        try {
          await api.post('/agents/me/log', {
            type: 'QUEST_START',
            message: `Started quest: ${questDetail.title}`,
            meta: { questId: quest.id, participationId: participation?.id },
          });
        } catch { /* ignore */ }

      } catch (error: any) {
        console.error(chalk.red(`\nError: ${error.message || 'Unknown error'}`));
        process.exit(1);
      }
    });

  return quests;
}
