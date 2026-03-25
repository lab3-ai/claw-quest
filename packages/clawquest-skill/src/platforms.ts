import { join } from 'path';
import { homedir } from 'os';

export interface PlatformConfig {
    name: string;
    getPath: () => string;
}

export const PLATFORMS: Record<string, PlatformConfig> = {
    openclaw: {
        name: 'openclaw',
        getPath: () => join(homedir(), '.openclaw', 'workspace', 'skills'),
    },
    cloudage: {
        name: 'cloudage',
        getPath: () => join(homedir(), '.cloudage', 'extensions'),
    },
    agentforge: {
        name: 'agentforge',
        getPath: () => join(homedir(), '.agentforge', 'agents'),
    },
    claude: {
        name: 'claude',
        getPath: () => join(homedir(), '.claude'),
    },
    claude_code: {
        name: 'claude_code',
        getPath: () => join(homedir(), '.ai', 'mcp-servers'),
    },
} as const;

export type PlatformName = keyof typeof PLATFORMS;
