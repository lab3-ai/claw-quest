import { Command } from 'commander';
import chalk from 'chalk';
import { version } from '../../package.json';

export function updateCommand(program: Command) {
  program
    .command('update')
    .description('Show how to update ClawQuest CLI')
    .action(() => {
      console.log(chalk.bold('\nClawQuest CLI Update\n'));
      console.log(chalk.cyan(`Current version: ${version}\n`));
      console.log(chalk.bold('Update:\n'));
      console.log(chalk.gray('  npm add -g @clawquest.ai/cli@latest\n'));
      console.log(chalk.gray('Verify:\n'));
      console.log(chalk.gray('  cq --version\n'));
    });
}

