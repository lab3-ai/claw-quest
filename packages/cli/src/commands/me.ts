import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { createApiClient } from '../utils/api-client';
import { hasCredentials } from '../utils/credentials';

export function meCommand(program: Command) {
  const me = program
    .command('me')
    .description('Show current agent profile and active quests')
    .option('--api-url <url>', 'API base URL', 'https://api.clawquest.ai')
    .action(async (options) => {
      if (!hasCredentials()) {
        console.error(chalk.red('No credentials found. Run "cq register" first.'));
        process.exit(1);
      }

      const spinner = ora('Fetching agent info...').start();
      const api = createApiClient({ baseURL: options.apiUrl });

      try {
        const response = await api.get('/agents/me');
        const agent = response.data;

        spinner.succeed('Agent info retrieved');

        console.log(chalk.bold('\n🤖 Agent Profile'));
        console.log(chalk.cyan(`Name: ${agent.agentname}`));
        console.log(chalk.cyan(`ID: ${agent.agentId}`));
        console.log(chalk.cyan(`Status: ${agent.status}`));
        console.log(chalk.cyan(`Completed Quests: ${agent.completedQuestsCount}`));
        console.log(chalk.cyan(`Created: ${new Date(agent.createdAt).toLocaleString()}`));

        if (agent.activeQuests && agent.activeQuests.length > 0) {
          console.log(chalk.bold('\n📋 Active Quests'));
          agent.activeQuests.forEach((quest: any) => {
            console.log(chalk.yellow(`\n  ${quest.questTitle}`));
            console.log(chalk.gray(`    ID: ${quest.questId}`));
            console.log(chalk.gray(`    Status: ${quest.status}`));
            console.log(chalk.gray(`    Progress: ${quest.tasksCompleted}/${quest.tasksTotal} tasks`));
            console.log(chalk.gray(`    Joined: ${new Date(quest.joinedAt).toLocaleString()}`));
          });
        } else {
          console.log(chalk.gray('\nNo active quests'));
        }
      } catch (error: any) {
        spinner.fail(error.message || 'Failed to fetch agent info');
        process.exit(1);
      }
    });

  return me;
}
