// challenge-generator.ts
// Generates challenge params and bash script from a skill's verification_config.

export type InstallType = 'npx_clawhub' | 'npx_package' | 'pip' | 'npm_global' | 'brew' | 'custom';
export type FetchType = 'curl' | 'wget' | 'custom';

export interface InstallConfig {
    /** How the skill should be installed */
    type: InstallType;
    /** Package name override — defaults to skillSlug when omitted */
    package?: string;
    /** Version tag for npx_package installs — defaults to 'latest' */
    version?: string;
    /** Full command template for 'custom' type — use ${package} as placeholder */
    command?: string;
}

export interface FetchConfig {
    /** How to fetch the challenge URL */
    type: FetchType;
    /** Full command template for 'custom' type — use ${url} as placeholder */
    command?: string;
}

export interface VerificationConfig {
    type: string;
    skill_display: string;
    task_description: string;
    api_endpoint: string;
    params: Record<string, string | number>;
    variable_options: Record<string, (string | number)[]>;
    submission_fields: string[];
    validation: {
        type: string;
        check_path?: string;
    };
    /** Install configuration — defaults to npx_clawhub if omitted (backward compat) */
    install?: InstallConfig;
    /** Fetch configuration — defaults to curl if omitted (backward compat) */
    fetch?: FetchConfig;
}

export interface ResolvedChallenge {
    params: Record<string, string | number>;
    taskDescription: string;
}

/** Pick a random element from an array */
function pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

/** Substitute ${variable} placeholders with resolved values */
function resolveParams(
    template: Record<string, string | number>,
    resolved: Record<string, string | number>
): Record<string, string | number> {
    const result: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(template)) {
        if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
            const varName = value.slice(2, -1);
            result[key] = resolved[varName] ?? value;
        } else {
            result[key] = value;
        }
    }
    return result;
}

/** Resolve a challenge: pick random values for all variables in the config */
export function resolveChallenge(config: VerificationConfig): ResolvedChallenge {
    const resolved: Record<string, string | number> = {};
    for (const [varName, options] of Object.entries(config.variable_options)) {
        resolved[varName] = pickRandom(options);
    }
    const params = resolveParams(config.params, resolved);
    const paramStr = Object.entries(params)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ');
    const taskDescription = `${config.task_description} (${paramStr})`;
    return { params, taskDescription };
}

/** Build URL query string from params */
export function buildQueryString(params: Record<string, string | number>): string {
    return Object.entries(params)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&');
}

/** Generate the install bash command from the install config */
export function generateInstallCommand(install: InstallConfig, skillSlug: string): string {
    const pkg = install.package || skillSlug;
    switch (install.type) {
        case 'npx_clawhub':
            return `npx clawhub@latest install ${skillSlug}`;
        case 'npx_package': {
            const ver = install.version || 'latest';
            return `npx ${pkg}@${ver}`;
        }
        case 'pip':
            return `pip install ${pkg}`;
        case 'npm_global':
            return `npm install -g ${pkg}`;
        case 'brew':
            return `brew install ${pkg}`;
        case 'custom':
            return (install.command || `npx clawhub@latest install ${skillSlug}`).replace(/\$\{package\}/g, pkg);
        default:
            return `npx clawhub@latest install ${skillSlug}`;
    }
}

/** Generate the fetch bash line from the fetch config */
export function generateFetchCommand(fetch: FetchConfig, url: string): string {
    switch (fetch.type) {
        case 'curl':
            return `RESPONSE=$(curl -s "${url}")`;
        case 'wget':
            return `RESPONSE=$(wget -q -O - "${url}")`;
        case 'custom':
            return (fetch.command || `RESPONSE=$(curl -s "${url}")`).replace(/\$\{url\}/g, url);
        default:
            return `RESPONSE=$(curl -s "${url}")`;
    }
}

/** Generate the full markdown challenge response with embedded bash script */
export function generateMarkdown(opts: {
    token: string;
    skillSlug: string;
    skillDisplay: string;
    taskDescription: string;
    apiEndpoint: string;
    params: Record<string, string | number>;
    submitUrl: string;
    expiresAt: Date;
    install?: InstallConfig;
    fetch?: FetchConfig;
}): string {
    const qs = buildQueryString(opts.params);
    const fullUrl = `${opts.apiEndpoint}?${qs}`;
    const expiry = opts.expiresAt.toISOString();

    const installCfg: InstallConfig = opts.install ?? { type: 'npx_clawhub' };
    const fetchCfg: FetchConfig = opts.fetch ?? { type: 'curl' };

    const installCmd = generateInstallCommand(installCfg, opts.skillSlug);
    const fetchCmd = generateFetchCommand(fetchCfg, fullUrl);

    // Determine whether to include the Fetch step (3-step vs 2-step script).
    // Include fetch when: api_endpoint has a valid URL, OR fetch type is 'custom' with its own command.
    const apiEndpointStr = (opts.apiEndpoint ?? '').trim();
    const hasApiEndpoint = apiEndpointStr.length > 0 && fullUrl !== '?';
    const hasCustomFetch = fetchCfg.type === 'custom' && !!fetchCfg.command?.trim();
    const hasValidFetchUrl = hasApiEndpoint || hasCustomFetch;

    const scriptBody = hasValidFetchUrl
        ? `# Step 1: Install the skill
${installCmd}

# Step 2: Fetch challenge data using ${opts.skillDisplay}
${fetchCmd}

# Step 3: Submit to ClawQuest (only if we have data)
if [ -n "$RESPONSE" ]; then
  curl -s -X POST "${opts.submitUrl}" \\
    -H "Content-Type: application/json" \\
    -d "$(jq -cn --argjson r \\"$RESPONSE\\" --arg t \\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\\" '{result:$r,ts:$t}')"
fi`
        : `# Step 1: Install the skill
${installCmd}

# Step 2: Submit install proof to ClawQuest
curl -s -X POST "${opts.submitUrl}" \\
  -H "Content-Type: application/json" \\
  -d "$(jq -cn --arg r \\"skill_installed:${opts.skillSlug}\\" --arg t \\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\\" '{result:$r,ts:$t}')"`;


    return `# ClawQuest Skill Verification

<!-- skill-slug: ${opts.skillSlug} -->

## Challenge
You must prove you have the **${opts.skillDisplay}** skill installed by completing this task:

${opts.taskDescription}

**Expires:** ${expiry}

## How to verify (copy-paste this script)

\`\`\`bash
#!/bin/bash
# ClawQuest Skill Verification — ${opts.skillDisplay}
# Just run this script — do not modify

${scriptBody}
\`\`\`

Run the script above. If ClawQuest accepts your submission, you are verified.
`;
}
