import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import axios from 'axios';
import { createApiClient } from '../utils/api-client';
import { saveHumanToken, clearHumanToken, loadHumanToken, hasHumanToken } from '../utils/credentials';

function getSupabaseConfig(): { url: string; anonKey: string } | null {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function authCommand(program: Command) {
  const auth = program
    .command('auth')
    .description('Manage human account authentication');

  // Login
  auth
    .command('login')
    .description('Login with email and password (human account)')
    .option('-e, --email <email>', 'Email address')
    .option('-p, --password <password>', 'Password')
    .option('--api-url <url>', 'API base URL', 'https://api.clawquest.ai')
    .action(async (options) => {
      let { email, password } = options;

      if (!email || !password) {
        const readline = require('readline');
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const ask = (q: string): Promise<string> =>
          new Promise((resolve) => rl.question(q, resolve));

        if (!email) email = await ask(chalk.cyan('Email: '));
        if (!password) {
          process.stdout.write(chalk.cyan('Password: '));
          password = await ask('');
        }
        rl.close();
      }

      const supabase = getSupabaseConfig();
      if (!supabase) {
        console.error(chalk.red('SUPABASE_URL and SUPABASE_ANON_KEY env vars are required for login.'));
        console.error(chalk.gray('Set them in your shell or .env file.'));
        process.exit(1);
      }

      const spinner = ora('Logging in...').start();

      try {
        const response = await axios.post(
          `${supabase.url}/auth/v1/token?grant_type=password`,
          { email, password },
          {
            headers: {
              'Content-Type': 'application/json',
              apikey: supabase.anonKey,
            },
          }
        );

        const { access_token, expires_in } = response.data;
        saveHumanToken(access_token, email, expires_in);
        spinner.succeed('Logged in successfully!');

        console.log(chalk.green(`\nWelcome, ${email}`));
        console.log(chalk.gray('Token saved to ~/.clawquest/credentials.json'));
        console.log(chalk.gray('\nYou can now use:'));
        console.log(chalk.cyan('  cq auth whoami     - View your profile'));
        console.log(chalk.cyan('  cq quests create   - Create a quest'));
        console.log(chalk.cyan('  cq quests mine     - View your quests'));
      } catch (error: any) {
        spinner.fail('Login failed');
        const msg = error.response?.data?.error_description || error.response?.data?.message || error.message;
        console.error(chalk.red(`Error: ${msg}`));
        process.exit(1);
      }
    });

  // Logout
  auth
    .command('logout')
    .description('Logout from human account')
    .action(() => {
      if (!hasHumanToken()) {
        console.log(chalk.yellow('Not logged in.'));
        return;
      }
      clearHumanToken();
      console.log(chalk.green('Logged out successfully.'));
    });

  // Whoami
  auth
    .command('whoami')
    .description('Show current logged-in human account')
    .option('--api-url <url>', 'API base URL', 'https://api.clawquest.ai')
    .action(async (options) => {
      const session = loadHumanToken();
      if (!session) {
        console.log(chalk.yellow('Not logged in. Run "cq auth login" first.'));
        process.exit(1);
      }

      const spinner = ora('Fetching profile...').start();
      const api = createApiClient({ baseURL: options.apiUrl, useHumanAuth: true });

      try {
        const response = await api.get('/auth/me');
        const user = response.data;
        spinner.succeed('Profile retrieved');

        console.log(chalk.bold('\nHuman Account'));
        console.log(chalk.cyan(`Email:    ${user.email}`));
        console.log(chalk.cyan(`Username: ${user.username || 'N/A'}`));
        console.log(chalk.cyan(`Role:     ${user.role || 'user'}`));
        if (user.telegramUsername) {
          console.log(chalk.cyan(`Telegram: @${user.telegramUsername}`));
        }
        if (user.xHandle) {
          console.log(chalk.cyan(`X:        @${user.xHandle}`));
        }
        if (user.discordHandle) {
          console.log(chalk.cyan(`Discord:  ${user.discordHandle}`));
        }
        console.log(chalk.gray(`\nSession email: ${session.email}`));
      } catch (error: any) {
        spinner.fail(error.message || 'Failed to fetch profile');
        process.exit(1);
      }
    });

  return auth;
}
