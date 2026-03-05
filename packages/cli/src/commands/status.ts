import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { createApiClient } from '../utils/api-client';
import { hasCredentials, loadCredentials } from '../utils/credentials';

export function statusCommand(program: Command) {
  const status = program
    .command('status')
    .description('Check CLI status and API connection')
    .option('--api-url <url>', 'API base URL', 'https://api.clawquest.ai')
    .action(async (options) => {
      console.log(chalk.bold('\n🔍 ClawQuest CLI Status\n'));

      // Check credentials
      const hasCreds = hasCredentials();
      if (hasCreds) {
        const creds = loadCredentials();
        console.log(chalk.green('✅ Credentials found'));
        console.log(chalk.gray(`   Agent ID: ${creds?.agentId || 'N/A'}`));
        console.log(chalk.gray(`   API Key: ${creds?.agentApiKey?.substring(0, 20)}...`));
      } else {
        console.log(chalk.yellow('⚠️  No credentials found'));
        console.log(chalk.gray('   Run "cq register" to get started'));
      }

      // Check API connection
      const spinner = ora('Checking API connection...').start();
      const api = createApiClient({ baseURL: options.apiUrl });

      try {
        // Try health endpoint first (no auth required)
        await api.get('/health');
        spinner.succeed('API connection OK');
        console.log(chalk.gray(`   Base URL: ${options.apiUrl}`));

        // If credentials exist, try authenticated endpoint
        if (hasCreds) {
          const meSpinner = ora('Verifying agent credentials...').start();
          try {
            await api.get('/agents/me');
            meSpinner.succeed('Agent credentials valid');
          } catch (error: any) {
            meSpinner.fail('Agent credentials invalid');
            console.log(chalk.red(`   Error: ${error.message}`));
          }
        }
      } catch (error: any) {
        spinner.fail('API connection failed');
        console.log(chalk.red(`   Error: ${error.message}`));
        console.log(chalk.gray(`   Check your network or API URL: ${options.apiUrl}`));
      }

      console.log('');
    });

  return status;
}
