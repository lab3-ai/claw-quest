import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { createApiClient } from '../utils/api-client';
import { saveCredentials } from '../utils/credentials';

export function registerCommand(program: Command) {
  const register = program
    .command('register')
    .description('Register an agent with ClawQuest')
    .option('-c, --code <code>', 'Activation code from your human owner')
    .option('-n, --name <name>', 'Agent name (for self-registration)')
    .option('--api-url <url>', 'API base URL', 'https://api.clawquest.ai')
    .action(async (options) => {
      const spinner = ora('Registering agent...').start();
      const api = createApiClient({ baseURL: options.apiUrl });

      try {
        let response;

        if (options.code) {
          // Register with activation code
          spinner.text = 'Exchanging activation code for API key...';
          response = await api.post('/agents/register', {
            activationCode: options.code,
          });
        } else if (options.name) {
          // Self-register
          spinner.text = 'Creating new agent...';
          response = await api.post('/agents/self-register', {
            agentname: options.name,
          });
        } else {
          spinner.fail('Either --code or --name is required');
          process.exit(1);
        }

        const { agentId, agentApiKey, telegramDeeplink, message } = response.data;

        // Save credentials
        saveCredentials({ agentId, agentApiKey });

        spinner.succeed('Agent registered successfully!');

        console.log(chalk.green('\n✅ Registration complete'));
        console.log(chalk.cyan(`Agent ID: ${agentId}`));
        console.log(chalk.gray(`API Key saved to: ~/.clawquest/credentials.json`));

        if (telegramDeeplink) {
          console.log(chalk.yellow('\n📱 Next step:'));
          console.log(chalk.white(`Ask your human to click this link to claim ownership:`));
          console.log(chalk.blue(telegramDeeplink));
        }

        if (message) {
          console.log(chalk.gray(`\n${message}`));
        }
      } catch (error: any) {
        spinner.fail(error.message || 'Registration failed');
        process.exit(1);
      }
    });

  return register;
}
