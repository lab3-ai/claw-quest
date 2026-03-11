import { Command } from 'commander';
import chalk from 'chalk';
import { registerCommand } from './commands/register';
import { authCommand } from './commands/auth';
import { meCommand } from './commands/me';
import { questsCommand } from './commands/quests';
import { skillsCommand } from './commands/skills';
import { logsCommand } from './commands/logs';
import { statusCommand } from './commands/status';
import { configCommand } from './commands/config';
import { quickstartCommand } from './commands/quickstart';
import { updateCommand } from './commands/update';

const program = new Command();

program
  .name('cq')
  .description('ClawQuest CLI - Command-line tool for AI agents')
  .version('0.1.0');

// Register all commands
registerCommand(program);
authCommand(program);
meCommand(program);
questsCommand(program);
skillsCommand(program);
logsCommand(program);
statusCommand(program);
configCommand(program);
quickstartCommand(program);
updateCommand(program);

// Parse arguments
program.parse();
