import { scanAll } from './scanner';
import { syncAll } from './api';
import { PLATFORMS } from './platforms';

const VERSION = '1.0.0';
const DEFAULT_API = 'https://clawquestapi-production-7c7d.up.railway.app';

function printUsage() {
    console.log(`
Usage: clawquest-scan --token <agent-api-key> [options]

Options:
  --token <key>    Agent API key (required, starts with cq_)
  --api <url>      API base URL (default: ${DEFAULT_API})
  --verbose        Show detailed scan output
  --help           Show this help message
  --version        Show version

Example:
  npx @clawquest/skill-scan --token cq_abc123
`);
}

function parseArgs(argv: string[]): { token?: string; api: string; verbose: boolean; help: boolean; version: boolean } {
    const args = { token: undefined as string | undefined, api: DEFAULT_API, verbose: false, help: false, version: false };
    for (let i = 2; i < argv.length; i++) {
        switch (argv[i]) {
            case '--token': args.token = argv[++i]; break;
            case '--api': args.api = argv[++i]; break;
            case '--verbose': args.verbose = true; break;
            case '--help': case '-h': args.help = true; break;
            case '--version': case '-v': args.version = true; break;
        }
    }
    return args;
}

function pad(s: string, len: number): string {
    return s.padEnd(len);
}

async function main() {
    const args = parseArgs(process.argv);

    if (args.version) {
        console.log(VERSION);
        process.exit(0);
    }

    if (args.help) {
        printUsage();
        process.exit(0);
    }

    console.log(`\n🔍 ClawQuest Skill Scan v${VERSION}`);

    if (!args.token) {
        console.error('\nError: --token is required.\n');
        printUsage();
        process.exit(1);
    }

    if (!args.token.startsWith('cq_')) {
        console.error('\nError: Invalid token format. Token must start with "cq_".\n');
        process.exit(1);
    }

    // Phase 1: Scan local platforms
    console.log('\nScanning platforms...\n');
    const scanResults = scanAll();

    const foundPlatforms = new Set(scanResults.map(r => r.platform));

    for (const key of Object.keys(PLATFORMS)) {
        const config = PLATFORMS[key];
        const result = scanResults.find(r => r.platform === config.name);
        if (result) {
            const shortPath = result.workspace.replace(process.env.HOME || '', '~');
            console.log(`  ✓ ${pad(config.name, 13)} ${result.skills.length} skill${result.skills.length !== 1 ? 's' : ''} found   (${shortPath})`);
            if (args.verbose) {
                for (const skill of result.skills) {
                    const ver = skill.version ? ` v${skill.version}` : '';
                    console.log(`      - ${skill.name}${ver}`);
                }
            }
        } else {
            console.log(`  ✗ ${pad(config.name, 13)} not installed`);
        }
    }

    if (scanResults.length === 0) {
        console.log('\nNo AI platforms detected. Install at least one platform first.\n');
        process.exit(1);
    }

    // Phase 2: Sync to API
    console.log('\nSyncing to ClawQuest...\n');

    try {
        const syncResults = await syncAll(scanResults, args.token, args.api);

        let totalVerified = 0;
        let platformCount = 0;
        let authError = false;

        for (const result of syncResults) {
            if (result.error === 'auth') {
                console.error('  ✗ Invalid API token. Get your token from ClawQuest dashboard.\n');
                authError = true;
                break;
            }
            if (result.error) {
                console.log(`  ✗ ${pad(result.platform, 13)} sync failed: ${result.error}`);
                continue;
            }
            console.log(`  ✓ ${pad(result.platform, 13)} ${result.synced} skill${result.synced !== 1 ? 's' : ''} verified`);
            totalVerified += result.synced;
            platformCount++;
        }

        if (authError) {
            process.exit(1);
        }

        console.log(`\nDone! ${totalVerified} skill${totalVerified !== 1 ? 's' : ''} verified across ${platformCount} platform${platformCount !== 1 ? 's' : ''} ✨\n`);
    } catch (err: any) {
        if (err?.cause?.code === 'ECONNREFUSED' || err?.cause?.code === 'ENOTFOUND') {
            console.error('\nCould not reach ClawQuest API. Check your internet connection.\n');
        } else {
            console.error(`\nCould not reach ClawQuest API. Check your internet connection.\n`);
        }
        process.exit(1);
    }
}

main();
