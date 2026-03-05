import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const CONFIG_DIR = join(homedir(), '.clawquest');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

interface Config {
  apiUrl?: string;
  defaultLimit?: number;
}

function loadConfig(): Config {
  try {
    if (existsSync(CONFIG_FILE)) {
      const content = readFileSync(CONFIG_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch {
    // Ignore errors
  }
  return {};
}

function saveConfig(config: Config): void {
  try {
    mkdirSync(CONFIG_DIR, { recursive: true });
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (error) {
    throw new Error(`Failed to save config: ${error}`);
  }
}

export function configCommand(program: Command) {
  const config = program
    .command('config')
    .description('Manage CLI configuration')
    .action(() => {
      const currentConfig = loadConfig();
      console.log(chalk.bold('\n⚙️  ClawQuest CLI Configuration\n'));

      if (Object.keys(currentConfig).length === 0) {
        console.log(chalk.gray('No configuration set'));
        console.log(chalk.gray('\nUse "cq config set <key> <value>" to set options'));
      } else {
        Object.entries(currentConfig).forEach(([key, value]) => {
          console.log(chalk.cyan(`${key}:`), chalk.white(String(value)));
        });
      }

      console.log(chalk.gray(`\nConfig file: ${CONFIG_FILE}`));
      console.log('');
    });

  config
    .command('set <key> <value>')
    .description('Set a configuration value')
    .action((key: string, value: string) => {
      const currentConfig = loadConfig();

      // Validate key
      const validKeys = ['apiUrl', 'defaultLimit'];
      if (!validKeys.includes(key)) {
        console.error(chalk.red(`Invalid key. Valid keys: ${validKeys.join(', ')}`));
        process.exit(1);
      }

      // Parse value
      let parsedValue: any = value;
      if (key === 'defaultLimit') {
        parsedValue = parseInt(value);
        if (isNaN(parsedValue)) {
          console.error(chalk.red('defaultLimit must be a number'));
          process.exit(1);
        }
      }

      currentConfig[key as keyof Config] = parsedValue;
      saveConfig(currentConfig);
      console.log(chalk.green(`✅ Set ${key} = ${value}`));
    });

  config
    .command('get <key>')
    .description('Get a configuration value')
    .action((key: string) => {
      const currentConfig = loadConfig();
      const value = currentConfig[key as keyof Config];

      if (value === undefined) {
        console.log(chalk.yellow(`No value set for ${key}`));
      } else {
        console.log(value);
      }
    });

  config
    .command('unset <key>')
    .description('Remove a configuration value')
    .action((key: string) => {
      const currentConfig = loadConfig();
      if (currentConfig[key as keyof Config] === undefined) {
        console.log(chalk.yellow(`No value set for ${key}`));
        return;
      }

      delete currentConfig[key as keyof Config];
      saveConfig(currentConfig);
      console.log(chalk.green(`✅ Removed ${key}`));
    });

  return config;
}
