import { hostname } from 'os';
import type { PlatformScanResult } from './scanner';

export const DEFAULT_API_BASE = 'https://api.clawquest.ai';

function generateAgentname(): string {
    const host = hostname().split('.')[0].toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 20);
    const suffix = Math.random().toString(36).slice(2, 6);
    return `${host}-${suffix}`;
}

export interface SelfRegisterResult {
    agentId: string;
    agentApiKey: string;
    verificationToken: string;
    claimUrl: string;
    verificationCode: string;
    telegramDeeplink: string;
    message: string;
}

export interface SkillSyncResult {
    platform: string;
    synced: number;
    error?: string;
}

export async function selfRegister(
    apiBase: string,
    agentname?: string,
    platform?: string,
): Promise<SelfRegisterResult> {
    const resolvedName = agentname || generateAgentname();
    const res = await fetch(`${apiBase}/agents/self-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentname: resolvedName, platform }),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => 'Unknown error');
        throw new Error(`Self-register failed (${res.status}): ${text}`);
    }

    return res.json() as Promise<SelfRegisterResult>;
}

export async function syncSkills(
    scanResult: PlatformScanResult,
    agentApiKey: string,
    apiBase: string,
): Promise<SkillSyncResult> {
    const body = {
        platform: scanResult.platform,
        workspace: scanResult.workspace,
        skills: scanResult.skills.map(s => ({
            name: s.name,
            ...(s.version ? { version: s.version } : {}),
            path: s.path,
        })),
    };

    const res = await fetch(`${apiBase}/agents/me/skills/scan`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${agentApiKey}`,
        },
        body: JSON.stringify(body),
    });

    if (res.status === 401) {
        return { platform: scanResult.platform, synced: 0, error: 'Invalid agent API key' };
    }

    if (!res.ok) {
        const text = await res.text().catch(() => 'Unknown error');
        return { platform: scanResult.platform, synced: 0, error: text };
    }

    const data = await res.json() as { synced: number };
    return { platform: scanResult.platform, synced: data.synced };
}
