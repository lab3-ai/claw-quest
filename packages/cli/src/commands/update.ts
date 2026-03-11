import { Command } from 'commander';
import chalk from 'chalk';
import { version, name as packageName } from '../../package.json';

export function updateCommand(program: Command) {
  program
    .command('update')
    .description('Show how to update ClawQuest CLI to the latest version')
    .option('--npm', 'Show npm install command')
    .option('--pnpm', 'Show pnpm install command')
    .action((options) => {
      console.log(chalk.bold('\nClawQuest CLI Update\n'));
      console.log(chalk.cyan(`Current version: ${version}`));
      console.log(chalk.gray(`Package: ${packageName}\n`));

      const usePnpm = options.pnpm || (!options.npm && process.env.npm_config_user_agent?.includes('pnpm'));
      const useNpm = options.npm || !usePnpm;

      console.log(chalk.bold('Update commands:\n'));

      if (useNpm) {
        console.log(chalk.cyan('npm (global):'));
        console.log(chalk.gray('  npm install -g @clawquest.ai/cli@latest\n'));
      }

      if (usePnpm) {
        console.log(chalk.cyan('pnpm (global):'));
        console.log(chalk.gray('  pnpm add -g @clawquest.ai/cli@latest\n'));
      }

      console.log(chalk.bold('Tips:\n'));
      console.log(chalk.gray('- After updating, run:'));
      console.log(chalk.cyan('  cq --version'));
      console.log(chalk.gray('  to verify you are on the latest version.\n'));
    });
}

