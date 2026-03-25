import { loadConfig, saveConfig } from './config';
import { selfRegister, syncSkills, DEFAULT_API_BASE } from './api';
import { scanAll } from './scanner';
import { PLATFORMS } from './platforms';

const VERSION = '0.0.1';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pad(s: string, len: number): string {
    return s.padEnd(len);
}

function shortPath(p: string): string {
    return p.replace(process.env.HOME || '', '~');
}

// ─── Arg parsing ─────────────────────────────────────────────────────────────

function parseArgs(argv: string[]): { apiBase: string; agentname?: string; verbose: boolean; version: boolean } {
    const args = argv.slice(2);
    let apiBase = DEFAULT_API_BASE;
    let agentname: string | undefined;
    let verbose = false;
    let version = false;

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--api': apiBase = args[++i]; break;
            case '--name': agentname = args[++i]; break;
            case '--verbose': case '-v': verbose = true; break;
            case '--version': version = true; break;
            case '--help': case '-h':
                console.log('Usage: clawquest-skill [--api <url>] [--name <agentname>] [--verbose] [--version]');
                process.exit(0);
        }
    }

    return { apiBase, agentname, verbose, version };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    const { apiBase, agentname, verbose, version: showVersion } = parseArgs(process.argv);

    if (showVersion) {
        console.log(VERSION);
        process.exit(0);
    }

    console.log(`\n🦞 ClawQuest Skill v${VERSION}`);

    const config = loadConfig();

    // Step 1: Self-register if no API key stored
    if (!config.agentApiKey) {
        console.log('\nRegistering with ClawQuest...\n');

        let result;
        try {
            result = await selfRegister(apiBase, agentname);
        } catch (err: any) {
            if (err?.cause?.code === 'ECONNREFUSED' || err?.cause?.code === 'ENOTFOUND') {
                console.error('Could not reach ClawQuest API. Check your internet connection.\n');
            } else {
                console.error('Registration failed:', err.message, '\n');
            }
            process.exit(1);
        }

        saveConfig({
            agentApiKey: result.agentApiKey,
            verificationToken: result.verificationToken,
            claimUrl: result.claimUrl,
            claimedAt: null,
        });

        console.log('✅ Agent registered!');
        console.log(`📋 Claim URL:         ${result.claimUrl}`);
        console.log(`🔑 Verification Code: ${result.verificationCode}`);
        console.log('⏳ Share these with your human owner to activate.\n');
    }

    const agentApiKey = config.agentApiKey!;

    // Step 2: Scan all platforms — show full table including not-installed
    console.log('\nScanning platforms...\n');
    const scanResults = scanAll();

    for (const key of Object.keys(PLATFORMS)) {
        const platform = PLATFORMS[key];
        const result = scanResults.find(r => r.platform === platform.name);
        if (result) {
            const count = result.skills.length;
            console.log(`  ✓ ${pad(platform.name, 13)} ${count} skill${count !== 1 ? 's' : ''} found   (${shortPath(result.workspace)})`);
            if (verbose) {
                for (const skill of result.skills) {
                    const ver = skill.version ? ` v${skill.version}` : '';
                    console.log(`      - ${skill.name}${ver}`);
                }
            }
        } else {
            console.log(`  ✗ ${pad(platform.name, 13)} not installed`);
        }
    }

    if (scanResults.length === 0) {
        console.log('\nNo AI platforms detected. Install at least one platform first.\n');
        process.exit(1);
    }

    // Step 3: Sync each platform
    console.log('\nSyncing to ClawQuest...\n');

    try {
        let totalSynced = 0;
        let platformCount = 0;

        for (const result of scanResults) {
            const sync = await syncSkills(result, agentApiKey, apiBase);
            if (sync.error) {
                console.log(`  ✗ ${pad(result.platform, 13)} sync failed: ${sync.error}`);
            } else {
                totalSynced += sync.synced;
                platformCount++;
                console.log(`  ✓ ${pad(result.platform, 13)} ${sync.synced} skill${sync.synced !== 1 ? 's' : ''} verified`);
            }
        }

        const p = platformCount !== 1 ? 's' : '';
        const s = totalSynced !== 1 ? 's' : '';
        console.log(`\nDone! ${totalSynced} skill${s} verified across ${platformCount} platform${p} ✨\n`);
    } catch (err: any) {
        if (err?.cause?.code === 'ECONNREFUSED' || err?.cause?.code === 'ENOTFOUND') {
            console.error('\nCould not reach ClawQuest API. Check your internet connection.\n');
        } else {
            console.error('\nUnexpected error:', err.message, '\n');
        }
        process.exit(1);
    }
}

main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
