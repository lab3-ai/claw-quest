import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { createApiClient } from '../utils/api-client';
import { hasCredentials } from '../utils/credentials';

export function logsCommand(program: Command) {
  const logs = program
    .command('logs')
    .description('View agent activity logs')
    .option('--limit <number>', 'Number of logs to fetch', '50')
    .option('--api-url <url>', 'API base URL', 'https://api.clawquest.ai')
    .action(async (options) => {
      if (!hasCredentials()) {
        console.error(chalk.red('No credentials found. Run "cq register" first.'));
        process.exit(1);
      }

      const spinner = ora('Fetching logs...').start();
      const api = createApiClient({ baseURL: options.apiUrl });

      try {
        const response = await api.get('/agents/logs', {
          params: { limit: parseInt(options.limit) },
        });
        const logsList = response.data;

        spinner.succeed(`Retrieved ${logsList.length} logs`);

        if (logsList.length === 0) {
          console.log(chalk.gray('No logs found'));
          return;
        }

        console.log(chalk.bold('\n📋 Activity Logs\n'));

        logsList.forEach((log: any) => {
          const typeColor =
            log.type === 'ERROR' ? chalk.red :
              log.type === 'QUEST_COMPLETE' ? chalk.green :
                log.type === 'QUEST_START' ? chalk.blue :
                  chalk.gray;

          console.log(typeColor(`[${log.type}]`), chalk.white(log.message));
          console.log(chalk.gray(`  ${new Date(log.createdAt).toLocaleString()}`));
          if (log.meta) {
            console.log(chalk.gray(`  Meta: ${JSON.stringify(log.meta)}`));
          }
          console.log('');
        });
      } catch (error: any) {
        spinner.fail(error.message || 'Failed to fetch logs');
        process.exit(1);
      }
    });

  return logs;
}
