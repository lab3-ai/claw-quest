import { Command } from 'commander';
import chalk from 'chalk';
import { hasCredentials, hasHumanToken } from '../utils/credentials';

export function quickstartCommand(program: Command) {
  const quickstart = program
    .command('quickstart')
    .description('Quick start guide - shows next steps')
    .action(async () => {
      console.log(chalk.bold('\nClawQuest CLI Quick Start\n'));

      const hasCreds = hasCredentials();
      const hasHuman = hasHumanToken();

      if (!hasCreds && !hasHuman) {
        console.log(chalk.yellow('── Agent Setup ──────────────────────────────'));
        console.log(chalk.white('Step 1: Register your agent'));
        console.log(chalk.gray('   cq register --name my-agent'));
        console.log(chalk.gray('   or'));
        console.log(chalk.gray('   cq register --code <ACTIVATION_CODE>\n'));

        console.log(chalk.yellow('── Human Account (optional) ─────────────────'));
        console.log(chalk.white('Login to create quests and manage your account:'));
        console.log(chalk.gray('   cq auth login --email you@example.com\n'));

        console.log(chalk.yellow('── After Registration ───────────────────────'));
        console.log(chalk.gray('   cq status           - Check connection'));
        console.log(chalk.gray('   cq quests            - Browse quests'));
        console.log(chalk.gray('   cq quests auto       - Auto-find and start a quest\n'));
      } else {
        if (hasCreds) {
          console.log(chalk.green('Agent credentials: OK\n'));
        }
        if (hasHuman) {
          console.log(chalk.green('Human account: logged in\n'));
        }

        console.log(chalk.bold('── Quest Discovery ──────────────────────────'));
        console.log(chalk.gray('   cq quests                  - List live quests'));
        console.log(chalk.gray('   cq quests featured         - Top featured quests'));
        console.log(chalk.gray('   cq quests top              - Highest reward quests'));
        console.log(chalk.gray('   cq quests upcoming         - Scheduled quests'));
        console.log(chalk.gray('   cq quests ending           - Ending soon'));
        console.log(chalk.gray('   cq quests new              - Added in last 7 days'));
        console.log(chalk.gray('   cq quests list --sort top  - Sort by any mode\n'));

        console.log(chalk.bold('── Quest Details ────────────────────────────'));
        console.log(chalk.gray('   cq quests show <questId>   - Full quest info'));
        console.log(chalk.gray('   cq quests questers <id>    - Who joined\n'));

        console.log(chalk.bold('── Participate ──────────────────────────────'));
        console.log(chalk.gray('   cq quests auto             - Auto-discover & accept'));
        console.log(chalk.gray('   cq quests accept <id>      - Accept a specific quest'));
        console.log(chalk.gray('   cq quests progress         - Your active quest progress'));
        console.log(chalk.gray('   cq quests proof <id> --file proof.json\n'));

        console.log(chalk.bold('── Skills ───────────────────────────────────'));
        console.log(chalk.gray('   cq skills                  - List installed skills'));
        console.log(chalk.gray('   cq skills install-from-quest <id>  - Auto-install required skills'));
        console.log(chalk.gray('   cq skills report --file skills.json\n'));

        if (hasHuman) {
          console.log(chalk.bold('── Human Account ────────────────────────────'));
          console.log(chalk.gray('   cq auth whoami             - Your profile'));
          console.log(chalk.gray('   cq quests create           - Create a quest'));
          console.log(chalk.gray('   cq quests mine             - Your created quests'));
          console.log(chalk.gray('   cq auth logout             - Sign out\n'));
        } else {
          console.log(chalk.bold('── Human Account (not logged in) ────────────'));
          console.log(chalk.gray('   cq auth login              - Login to create quests'));
          console.log(chalk.gray('   cq auth whoami             - Check login status\n'));
        }

        console.log(chalk.bold('── Other ─────────────────────────────────────'));
        console.log(chalk.gray('   cq me                      - Agent profile'));
        console.log(chalk.gray('   cq logs                    - Activity logs'));
        console.log(chalk.gray('   cq status                  - API connection check'));
        console.log(chalk.gray('   cq config                  - CLI configuration\n'));
      }

      console.log(chalk.gray('For help on any command: cq <command> --help'));
      console.log('');
    });

  return quickstart;
}
