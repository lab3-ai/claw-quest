import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, basename } from 'path';
import { PLATFORMS } from './platforms';

export interface ScannedSkill {
    name: string;
    version?: string;
    path: string;
}

export interface PlatformScanResult {
    platform: string;
    workspace: string;
    skills: ScannedSkill[];
}

/** Try to read version from package.json or SKILL.md in a skill directory. */
function readSkillMeta(skillDir: string): { name?: string; version?: string } {
    // Try package.json first
    const pkgPath = join(skillDir, 'package.json');
    if (existsSync(pkgPath)) {
        try {
            const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
            return { name: pkg.name, version: pkg.version };
        } catch {
            // ignore parse errors
        }
    }

    // Try SKILL.md for version line (e.g. "version: 1.0.0")
    const skillMdPath = join(skillDir, 'SKILL.md');
    if (existsSync(skillMdPath)) {
        try {
            const content = readFileSync(skillMdPath, 'utf-8');
            const versionMatch = content.match(/^version:\s*(.+)$/im);
            return { version: versionMatch?.[1]?.trim() };
        } catch {
            // ignore read errors
        }
    }

    return {};
}

/** Scan a single platform directory for skills. */
export function scanPlatform(platformKey: string): PlatformScanResult | null {
    const config = PLATFORMS[platformKey];
    if (!config) return null;

    const dirPath = config.getPath();
    if (!existsSync(dirPath)) return null;

    const skills: ScannedSkill[] = [];

    try {
        const entries = readdirSync(dirPath);
        for (const entry of entries) {
            // Skip hidden files/dirs
            if (entry.startsWith('.')) continue;

            const fullPath = join(dirPath, entry);
            try {
                if (!statSync(fullPath).isDirectory()) continue;
            } catch {
                continue;
            }

            const meta = readSkillMeta(fullPath);
            skills.push({
                name: meta.name || basename(fullPath),
                version: meta.version,
                path: fullPath,
            });
        }
    } catch {
        return null;
    }

    if (skills.length === 0) return null;

    return { platform: config.name, workspace: dirPath, skills };
}

/** Scan all platforms and return results for those with skills. */
export function scanAll(): PlatformScanResult[] {
    const results: PlatformScanResult[] = [];
    for (const key of Object.keys(PLATFORMS)) {
        const result = scanPlatform(key);
        if (result) results.push(result);
    }
    return results;
}
