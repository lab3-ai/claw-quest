import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export interface ClawQuestConfig {
    agentApiKey?: string;
    verificationToken?: string;
    claimUrl?: string;
    claimedAt?: string | null;
}

const CONFIG_DIR = join(homedir(), '.clawquest');
const CONFIG_PATH = join(CONFIG_DIR, 'config.json');

export function loadConfig(): ClawQuestConfig {
    if (!existsSync(CONFIG_PATH)) return {};
    try {
        return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')) as ClawQuestConfig;
    } catch {
        return {};
    }
}

export function saveConfig(cfg: ClawQuestConfig): void {
    if (!existsSync(CONFIG_DIR)) {
        mkdirSync(CONFIG_DIR, { recursive: true });
    }
    writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf-8');
}
