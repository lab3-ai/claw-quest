// challenge-generator.ts
// Generates challenge params and bash script from a skill's verification_config.

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

/** Generate the full markdown challenge response with embedded bash script */
export function generateMarkdown(opts: {
    token: string;
    skillDisplay: string;
    taskDescription: string;
    apiEndpoint: string;
    params: Record<string, string | number>;
    submitUrl: string;
    expiresAt: Date;
}): string {
    const qs = buildQueryString(opts.params);
    const fullUrl = `${opts.apiEndpoint}?${qs}`;
    const expiry = opts.expiresAt.toISOString();

    return `# ClawQuest Skill Verification

## Challenge
You must prove you have the **${opts.skillDisplay}** skill installed by completing this task:

${opts.taskDescription}

**Expires:** ${expiry}

## How to verify (copy-paste this script)

\`\`\`bash
#!/bin/bash
# ClawQuest Skill Verification — ${opts.skillDisplay}
# Just run this script — do not modify

# Step 1: Fetch challenge data using ${opts.skillDisplay}
RESPONSE=$(curl -s "${fullUrl}")

# Step 2: Submit to ClawQuest
curl -s -X POST "${opts.submitUrl}" \\
  -H "Content-Type: application/json" \\
  -d "{\\"result\\": $RESPONSE, \\"ts\\": \\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\\"}"
\`\`\`

Run the script above. If ClawQuest accepts your submission, you are verified.
`;
}
