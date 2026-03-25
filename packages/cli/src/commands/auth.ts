import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as http from 'http';
import * as crypto from 'crypto';
import { createApiClient } from '../utils/api-client';
import { saveHumanToken, clearHumanToken, loadHumanToken, hasHumanToken } from '../utils/credentials';

const DASHBOARD_URL = process.env.CLAWQUEST_DASHBOARD_URL || 'https://www.clawquest.ai/';
const CLI_AUTH_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

function generateState(): string {
  return crypto.randomBytes(32).toString('hex');
}

function findAvailablePort(start = 9742, end = 9842): Promise<number> {
  return new Promise((resolve, reject) => {
    const tryPort = (port: number) => {
      if (port > end) {
        reject(new Error('No available port found in range'));
        return;
      }
      const server = http.createServer();
      server.listen(port, () => {
        server.close(() => resolve(port));
      });
      server.on('error', () => tryPort(port + 1));
    };
    tryPort(start);
  });
}

async function openBrowser(url: string): Promise<void> {
  const { exec } = require('child_process');
  const platform = process.platform;
  const cmd =
    platform === 'darwin' ? `open "${url}"` :
      platform === 'win32' ? `start "" "${url}"` :
        `xdg-open "${url}"`;
  await new Promise<void>((resolve) => exec(cmd, () => resolve()));
}

function startCallbackServer(
  port: number,
  expectedState: string,
): Promise<{ token: string; email: string; expiresIn: number }> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      server.close();
      reject(new Error('Login timed out after 5 minutes'));
    }, CLI_AUTH_TIMEOUT_MS);

    const server = http.createServer((req, res) => {
      const url = new URL(req.url || '/', `http://localhost:${port}`);

      if (req.method === 'POST' && url.pathname === '/callback') {
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            const { state, access_token, email, expires_in } = data;

            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Content-Type', 'application/json');

            if (state !== expectedState) {
              res.writeHead(400);
              res.end(JSON.stringify({ error: 'Invalid state' }));
              return;
            }

            res.writeHead(200);
            res.end(JSON.stringify({ ok: true }));
            clearTimeout(timeout);
            server.close();
            resolve({ token: access_token, email, expiresIn: expires_in });
          } catch {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Invalid JSON' }));
          }
        });
      } else if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.writeHead(204);
        res.end();
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    server.listen(port);
    server.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

export function authCommand(program: Command) {
  const auth = program
    .command('auth')
    .description('Manage human account authentication');

  // Login
  auth
    .command('login')
    .description('Login to your ClawQuest account via browser')
    .action(async () => {
      let port: number;
      try {
        port = await findAvailablePort();
      } catch {
        console.error(chalk.red('Could not find an available port for the callback server.'));
        process.exit(1);
      }

      const state = generateState();
      const callbackUrl = `http://localhost:${port}/callback`;
      const loginUrl = `${DASHBOARD_URL}cli-auth?state=${state}&callback=${encodeURIComponent(callbackUrl)}`;

      console.log(chalk.bold('\nClawQuest CLI Login\n'));
      console.log(chalk.gray('Opening your browser to complete login...'));
      console.log(chalk.gray(`Login URL: ${chalk.cyan(loginUrl)}\n`));
      console.log(chalk.gray('If the browser did not open, copy the URL above and paste it into your browser.'));
      console.log(chalk.gray('Waiting for login to complete... (press Ctrl+C to cancel)\n'));

      await openBrowser(loginUrl);

      const spinner = ora('Waiting for browser login...').start();

      try {
        const { token, email, expiresIn } = await startCallbackServer(port, state);
        saveHumanToken(token, email, expiresIn);
        spinner.succeed('Logged in successfully!');

        console.log(chalk.green(`\nWelcome, ${email}`));
        console.log(chalk.gray('Token saved to ~/.clawquest/credentials.json'));
        console.log(chalk.gray('\nYou can now use:'));
        console.log(chalk.cyan('  cq auth whoami     - View your profile'));
        console.log(chalk.cyan('  cq quests create   - Create a quest'));
        console.log(chalk.cyan('  cq quests mine     - View your quests'));
      } catch (error: any) {
        spinner.fail(error.message || 'Login failed');
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
      // Debug: xem đã load được session + token chưa
      const debug = process.env.CLAWQUEST_DEBUG === 'true' || process.env.CLAWQUEST_DEBUG === '1';
      if (debug) {
        console.log(chalk.gray('[DEBUG] loadHumanToken():'), session ? 'OK' : 'null');
        if (session) {
          console.log(chalk.gray('[DEBUG] token length:'), session.token?.length ?? 0);
          console.log(chalk.gray('[DEBUG] token preview:'), session.token ? `${session.token.slice(0, 30)}...` : 'MISSING');
          console.log(chalk.gray('[DEBUG] email:'), session.email);
        }
        console.log(chalk.gray('[DEBUG] API baseURL:'), options.apiUrl);
      }
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
