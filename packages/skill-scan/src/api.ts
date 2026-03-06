import type { PlatformScanResult } from './scanner';

const DEFAULT_API_BASE = 'https://clawquestapi-production-7c7d.up.railway.app';

export interface SyncResult {
    platform: string;
    synced: number;
    verified: boolean;
    error?: string;
}

/** Send scan results for one platform to the ClawQuest API. */
async function syncPlatform(
    result: PlatformScanResult,
    token: string,
    apiBase: string,
): Promise<SyncResult> {
    const url = `${apiBase}/agents/me/skills/scan`;
    const body = {
        platform: result.platform,
        workspace: result.workspace,
        skills: result.skills.map(s => ({
            name: s.name,
            ...(s.version ? { version: s.version } : {}),
            path: s.path,
        })),
    };

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
    });

    if (res.status === 401) {
        return { platform: result.platform, synced: 0, verified: false, error: 'auth' };
    }

    if (!res.ok) {
        const text = await res.text().catch(() => 'Unknown error');
        return { platform: result.platform, synced: 0, verified: false, error: text };
    }

    const data = await res.json() as { synced: number; verified: boolean };
    return { platform: result.platform, synced: data.synced, verified: data.verified };
}

/** Sync all platform scan results to the API. Returns per-platform results. */
export async function syncAll(
    results: PlatformScanResult[],
    token: string,
    apiBase: string = DEFAULT_API_BASE,
): Promise<SyncResult[]> {
    const syncResults: SyncResult[] = [];
    for (const result of results) {
        const syncResult = await syncPlatform(result, token, apiBase);
        syncResults.push(syncResult);

        // Stop early on auth failure
        if (syncResult.error === 'auth') break;
    }
    return syncResults;
}
