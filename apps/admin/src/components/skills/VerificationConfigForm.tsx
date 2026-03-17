/**
 * VerificationConfigForm
 * Full form for editing a skill's verification_config.
 * Renders a live bash-script preview that updates as fields change.
 */
import { useState, useCallback } from 'react';
import { Plus, Trash2, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

// ─── Types (mirrors challenge-generator.ts) ───────────────────────────────────

export type InstallType = 'npx_clawhub' | 'npx_package' | 'pip' | 'npm_global' | 'brew' | 'custom';
export type FetchType = 'curl' | 'wget' | 'custom';

export interface InstallConfig {
    type: InstallType;
    package?: string;
    version?: string;
    command?: string;
}

export interface FetchConfig {
    type: FetchType;
    command?: string;
}

export interface ValidationConfig {
    type: 'non_empty_response' | 'field_exists' | 'custom';
    check_path?: string;
}

export interface VerificationConfigValue {
    skill_display: string;
    task_description: string;
    api_endpoint: string;
    params: Record<string, string>;
    variable_options: Record<string, string[]>;
    submission_fields: string[];
    validation: ValidationConfig;
    install: InstallConfig;
    fetch: FetchConfig;
}

export const defaultVerificationConfig = (): VerificationConfigValue => ({
    skill_display: '',
    task_description: '',
    api_endpoint: '',
    params: {},
    variable_options: {},
    submission_fields: [],
    validation: { type: 'non_empty_response' },
    install: { type: 'npx_clawhub' },
    fetch: { type: 'curl' },
});

// ─── Preview helpers (mirrors challenge-generator logic) ──────────────────────

function installCmd(install: InstallConfig, slug: string): string {
    const pkg = install.package || slug;
    switch (install.type) {
        case 'npx_clawhub': return `npx clawhub@latest install ${slug}`;
        case 'npx_package': return `npx ${pkg}@${install.version || 'latest'}`;
        case 'pip': return `pip install ${pkg}`;
        case 'npm_global': return `npm install -g ${pkg}`;
        case 'brew': return `brew install ${pkg}`;
        case 'custom': return (install.command || '').replace(/\$\{package\}/g, pkg);
        default: return `npx clawhub@latest install ${slug}`;
    }
}

function fetchCmd(fetch: FetchConfig, url: string): string {
    switch (fetch.type) {
        case 'curl': return `RESPONSE=$(curl -s "${url}")`;
        case 'wget': return `RESPONSE=$(wget -q -O - "${url}")`;
        case 'custom': return (fetch.command || '').replace(/\$\{url\}/g, url);
        default: return `RESPONSE=$(curl -s "${url}")`;
    }
}

function buildPreviewScript(cfg: VerificationConfigValue, skillSlug: string): string {
    const exampleParams = Object.entries(cfg.params)
        .map(([k, v]) => {
            const resolved = v.startsWith('${') && v.endsWith('}')
                ? `<${v.slice(2, -1)}>`
                : v;
            return `${encodeURIComponent(k)}=${encodeURIComponent(resolved)}`;
        })
        .join('&');
    const fullUrl = cfg.api_endpoint
        ? `${cfg.api_endpoint}${exampleParams ? '?' + exampleParams : ''}`
        : 'https://example.com/api?param=value';
    const submitUrl = `https://api.clawquest.io/verify/<token>`;

    return `#!/bin/bash
# ClawQuest Skill Verification — ${cfg.skill_display || skillSlug}
# Just run this script — do not modify

# Step 1: Install the skill
${installCmd(cfg.install, skillSlug)}

# Step 2: Fetch challenge data using ${cfg.skill_display || skillSlug}
${fetchCmd(cfg.fetch, fullUrl)}

# Step 3: Submit to ClawQuest
curl -s -X POST "${submitUrl}" \\
  -H "Content-Type: application/json" \\
  -d "{\\"result\\": $RESPONSE, \\"ts\\": \\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\\"}"`;
}

// ─── Small sub-components ─────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <h3 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
            {children}
        </h3>
    );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
                <Label className="text-sm">{label}</Label>
                {hint && (
                    <span title={hint} className="cursor-help opacity-50">
                        <Info size={12} />
                    </span>
                )}
            </div>
            {children}
        </div>
    );
}

// ─── Section: Basic ───────────────────────────────────────────────────────────

function BasicSection({ value, onChange }: { value: VerificationConfigValue; onChange: (v: VerificationConfigValue) => void }) {
    return (
        <div className="flex flex-col gap-4">
            <SectionTitle>Basic</SectionTitle>
            <Field label="Skill Display Name" hint="Shown in the verification challenge markdown">
                <Input
                    value={value.skill_display}
                    onChange={e => onChange({ ...value, skill_display: e.target.value })}
                    placeholder="e.g. Bybit Trading"
                />
            </Field>
            <Field label="Task Description" hint="Describes what the agent must do. Use ${variable} for dynamic parts.">
                <textarea
                    className="w-full rounded-md border text-sm px-3 py-2 min-h-[72px] resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                    style={{ background: 'var(--bg-base)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    value={value.task_description}
                    onChange={e => onChange({ ...value, task_description: e.target.value })}
                    placeholder="e.g. Fetch spot kline data for ${symbol} from Bybit API"
                />
            </Field>
        </div>
    );
}

// ─── Section: Install ─────────────────────────────────────────────────────────

const INSTALL_TYPES: { value: InstallType; label: string; desc: string }[] = [
    { value: 'npx_clawhub', label: 'npx clawhub (default)', desc: 'npx clawhub@latest install <slug>' },
    { value: 'npx_package', label: 'npx package', desc: 'npx <package>@<version>' },
    { value: 'pip', label: 'pip', desc: 'pip install <package>' },
    { value: 'npm_global', label: 'npm global', desc: 'npm install -g <package>' },
    { value: 'brew', label: 'brew', desc: 'brew install <package>' },
    { value: 'custom', label: 'custom', desc: 'Full command template' },
];

function InstallSection({ value, onChange, skillSlug }: {
    value: VerificationConfigValue;
    onChange: (v: VerificationConfigValue) => void;
    skillSlug: string;
}) {
    const install = value.install;
    const setInstall = (i: InstallConfig) => onChange({ ...value, install: i });

    return (
        <div className="flex flex-col gap-4">
            <SectionTitle>Install Configuration</SectionTitle>
            <Field label="Install Method">
                <select
                    className="w-full rounded-md border text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
                    style={{ background: 'var(--bg-base)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    value={install.type}
                    onChange={e => setInstall({ ...install, type: e.target.value as InstallType })}
                >
                    {INSTALL_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label} — {t.desc}</option>
                    ))}
                </select>
            </Field>

            {install.type !== 'npx_clawhub' && install.type !== 'custom' && (
                <Field label="Package Name" hint="Leave empty to use the skill slug">
                    <Input
                        value={install.package ?? ''}
                        onChange={e => setInstall({ ...install, package: e.target.value || undefined })}
                        placeholder={`defaults to "${skillSlug}"`}
                    />
                </Field>
            )}

            {install.type === 'npx_package' && (
                <Field label="Version" hint="e.g. 'latest', '1.2.3'. Defaults to latest.">
                    <Input
                        value={install.version ?? ''}
                        onChange={e => setInstall({ ...install, version: e.target.value || undefined })}
                        placeholder="latest"
                    />
                </Field>
            )}

            {install.type === 'custom' && (
                <Field label="Custom Command" hint="Use ${package} as placeholder for the package name">
                    <textarea
                        className="w-full rounded-md border text-sm px-3 py-2 min-h-[64px] font-mono resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                        style={{ background: 'var(--bg-base)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                        value={install.command ?? ''}
                        onChange={e => setInstall({ ...install, command: e.target.value })}
                        placeholder="e.g. curl -fsSL https://example.com/install.sh | sh"
                    />
                </Field>
            )}

            <div className="rounded-md px-3 py-2 text-xs font-mono" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                <span className="opacity-50 mr-2">#</span>
                {installCmd(install, skillSlug) || '…'}
            </div>
        </div>
    );
}

// ─── Section: Fetch ───────────────────────────────────────────────────────────

const FETCH_TYPES: { value: FetchType; label: string }[] = [
    { value: 'curl', label: 'curl (default)' },
    { value: 'wget', label: 'wget' },
    { value: 'custom', label: 'custom' },
];

function FetchSection({ value, onChange }: { value: VerificationConfigValue; onChange: (v: VerificationConfigValue) => void }) {
    const fetch = value.fetch;
    const setFetch = (f: FetchConfig) => onChange({ ...value, fetch: f });

    return (
        <div className="flex flex-col gap-4">
            <SectionTitle>Fetch Configuration</SectionTitle>
            <Field label="Fetch Method">
                <select
                    className="w-full rounded-md border text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
                    style={{ background: 'var(--bg-base)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    value={fetch.type}
                    onChange={e => setFetch({ ...fetch, type: e.target.value as FetchType })}
                >
                    {FETCH_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                </select>
            </Field>

            {fetch.type === 'custom' && (
                <Field label="Custom Command" hint="Use ${url} as placeholder for the full API URL">
                    <textarea
                        className="w-full rounded-md border text-sm px-3 py-2 min-h-[64px] font-mono resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                        style={{ background: 'var(--bg-base)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                        value={fetch.command ?? ''}
                        onChange={e => setFetch({ ...fetch, command: e.target.value })}
                        placeholder="RESPONSE=$(curl -s &quot;${url}&quot;)"
                    />
                </Field>
            )}

            <div className="rounded-md px-3 py-2 text-xs font-mono" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                <span className="opacity-50 mr-2">#</span>
                {fetchCmd(fetch, '<url>')}
            </div>
        </div>
    );
}

// ─── Section: API + Params ────────────────────────────────────────────────────

function ApiSection({ value, onChange }: { value: VerificationConfigValue; onChange: (v: VerificationConfigValue) => void }) {
    const paramEntries = Object.entries(value.params);

    function setParam(oldKey: string, newKey: string, val: string) {
        const next: Record<string, string> = {};
        for (const [k, v] of Object.entries(value.params)) {
            if (k === oldKey) {
                if (newKey) next[newKey] = val;
            } else {
                next[k] = v;
            }
        }
        onChange({ ...value, params: next });
    }

    function addParam() {
        onChange({ ...value, params: { ...value.params, '': '' } });
    }

    function removeParam(key: string) {
        const next = { ...value.params };
        delete next[key];
        onChange({ ...value, params: next });
    }

    return (
        <div className="flex flex-col gap-4">
            <SectionTitle>API Endpoint & Parameters</SectionTitle>
            <Field label="API Endpoint URL">
                <Input
                    value={value.api_endpoint}
                    onChange={e => onChange({ ...value, api_endpoint: e.target.value })}
                    placeholder="https://api.example.com/v5/market/kline"
                />
            </Field>

            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <Label className="text-sm">Query Parameters</Label>
                    <Button variant="outline" size="sm" onClick={addParam} className="gap-1 h-7 text-xs">
                        <Plus size={12} /> Add Param
                    </Button>
                </div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Values can reference variables using <code className="font-mono bg-muted px-1 rounded">{'${variable}'}</code>
                </p>
                {paramEntries.length === 0 && (
                    <div className="text-xs py-3 text-center rounded-md" style={{ color: 'var(--text-muted)', background: 'var(--bg-tertiary)' }}>
                        No parameters yet
                    </div>
                )}
                {paramEntries.map(([k, v], i) => (
                    <div key={i} className="flex items-center gap-2">
                        <Input
                            className="flex-1 font-mono text-xs"
                            value={k}
                            onChange={e => setParam(k, e.target.value, v)}
                            placeholder="param name"
                        />
                        <Input
                            className="flex-1 font-mono text-xs"
                            value={v}
                            onChange={e => setParam(k, k, e.target.value)}
                            placeholder="value or ${variable}"
                        />
                        <Button variant="ghost" size="sm" onClick={() => removeParam(k)} className="shrink-0 text-destructive hover:text-destructive">
                            <Trash2 size={14} />
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Section: Variables ───────────────────────────────────────────────────────

function VariablesSection({ value, onChange }: { value: VerificationConfigValue; onChange: (v: VerificationConfigValue) => void }) {
    const varEntries = Object.entries(value.variable_options);

    function setVar(oldKey: string, newKey: string, options: string[]) {
        const next: Record<string, string[]> = {};
        for (const [k, v] of Object.entries(value.variable_options)) {
            if (k === oldKey) {
                if (newKey) next[newKey] = options;
            } else {
                next[k] = v;
            }
        }
        onChange({ ...value, variable_options: next });
    }

    function addVar() {
        onChange({ ...value, variable_options: { ...value.variable_options, '': [] } });
    }

    function removeVar(key: string) {
        const next = { ...value.variable_options };
        delete next[key];
        onChange({ ...value, variable_options: next });
    }

    return (
        <div className="flex flex-col gap-4">
            <SectionTitle>Variable Options</SectionTitle>
            <p className="text-xs -mt-2" style={{ color: 'var(--text-muted)' }}>
                Define variables referenced in params. The challenge system picks a random value for each variable per attempt.
            </p>
            <div className="flex flex-col gap-3">
                <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={addVar} className="gap-1 h-7 text-xs">
                        <Plus size={12} /> Add Variable
                    </Button>
                </div>
                {varEntries.length === 0 && (
                    <div className="text-xs py-3 text-center rounded-md" style={{ color: 'var(--text-muted)', background: 'var(--bg-tertiary)' }}>
                        No variables defined
                    </div>
                )}
                {varEntries.map(([k, options], i) => (
                    <div key={i} className="rounded-lg border p-3 flex flex-col gap-2" style={{ borderColor: 'var(--border)', background: 'var(--bg-base)' }}>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-mono shrink-0" style={{ color: 'var(--text-muted)' }}>$&#123;</span>
                            <Input
                                className="flex-1 font-mono text-xs"
                                value={k}
                                onChange={e => setVar(k, e.target.value, options)}
                                placeholder="variable_name"
                            />
                            <span className="text-xs font-mono shrink-0" style={{ color: 'var(--text-muted)' }}>&#125;</span>
                            <Button variant="ghost" size="sm" onClick={() => removeVar(k)} className="shrink-0 text-destructive hover:text-destructive">
                                <Trash2 size={14} />
                            </Button>
                        </div>
                        <div className="flex flex-col gap-1">
                            <Label className="text-xs" style={{ color: 'var(--text-muted)' }}>Options (comma-separated)</Label>
                            <Input
                                className="text-xs font-mono"
                                value={options.join(', ')}
                                onChange={e => setVar(k, k, e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                                placeholder="BTCUSDT, ETHUSDT, DOGEUSDT"
                            />
                            {options.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {options.map((opt, j) => (
                                        <span key={j} className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                                            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                                            {opt}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Section: Submission Fields ───────────────────────────────────────────────

function SubmissionSection({ value, onChange }: { value: VerificationConfigValue; onChange: (v: VerificationConfigValue) => void }) {
    const [draft, setDraft] = useState('');

    function addField() {
        const trimmed = draft.trim();
        if (!trimmed || value.submission_fields.includes(trimmed)) return;
        onChange({ ...value, submission_fields: [...value.submission_fields, trimmed] });
        setDraft('');
    }

    function removeField(field: string) {
        onChange({ ...value, submission_fields: value.submission_fields.filter(f => f !== field) });
    }

    return (
        <div className="flex flex-col gap-4">
            <SectionTitle>Submission Fields</SectionTitle>
            <p className="text-xs -mt-2" style={{ color: 'var(--text-muted)' }}>
                JSON fields the agent must submit. Used to validate the response.
            </p>
            <div className="flex gap-2">
                <Input
                    className="text-sm font-mono"
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addField(); } }}
                    placeholder="e.g. result"
                />
                <Button variant="outline" onClick={addField} className="shrink-0">
                    <Plus size={14} />
                </Button>
            </div>
            {value.submission_fields.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {value.submission_fields.map(f => (
                        <span key={f} className="flex items-center gap-1.5 text-sm font-mono px-2.5 py-1 rounded-md border"
                            style={{ borderColor: 'var(--border)', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                            {f}
                            <button onClick={() => removeField(f)} className="opacity-50 hover:opacity-100 transition-opacity">
                                <Trash2 size={11} />
                            </button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Section: Validation ──────────────────────────────────────────────────────

function ValidationSection({ value, onChange }: { value: VerificationConfigValue; onChange: (v: VerificationConfigValue) => void }) {
    const val = value.validation;
    const setVal = (v: ValidationConfig) => onChange({ ...value, validation: v });

    return (
        <div className="flex flex-col gap-4">
            <SectionTitle>Validation</SectionTitle>
            <Field label="Validation Type">
                <select
                    className="w-full rounded-md border text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
                    style={{ background: 'var(--bg-base)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    value={val.type}
                    onChange={e => setVal({ ...val, type: e.target.value as ValidationConfig['type'] })}
                >
                    <option value="non_empty_response">non_empty_response — response must not be empty/null</option>
                    <option value="field_exists">field_exists — a specific JSON field must exist in the response</option>
                    <option value="custom">custom — manual validation (no automated check)</option>
                </select>
            </Field>
            {val.type === 'field_exists' && (
                <Field label="Check Path" hint="Dot-separated JSON path, e.g. result.0.open">
                    <Input
                        value={val.check_path ?? ''}
                        onChange={e => setVal({ ...val, check_path: e.target.value })}
                        placeholder="e.g. result"
                    />
                </Field>
            )}
        </div>
    );
}

// ─── Main Form ────────────────────────────────────────────────────────────────

interface Props {
    skillSlug: string;
    value: VerificationConfigValue;
    onChange: (v: VerificationConfigValue) => void;
}

export function VerificationConfigForm({ skillSlug, value, onChange }: Props) {
    const preview = buildPreviewScript(value, skillSlug);

    const handleChange = useCallback((v: VerificationConfigValue) => {
        onChange(v);
    }, [onChange]);

    return (
        <div className="flex gap-6">
            {/* Left: form panels */}
            <div className="flex-1 min-w-0 flex flex-col gap-6">
                {/* Panel */}
                {[
                    <BasicSection key="basic" value={value} onChange={handleChange} />,
                    <InstallSection key="install" value={value} onChange={handleChange} skillSlug={skillSlug} />,
                    <FetchSection key="fetch" value={value} onChange={handleChange} />,
                    <ApiSection key="api" value={value} onChange={handleChange} />,
                    <VariablesSection key="vars" value={value} onChange={handleChange} />,
                    <SubmissionSection key="submit" value={value} onChange={handleChange} />,
                    <ValidationSection key="validation" value={value} onChange={handleChange} />,
                ].map((section, i) => (
                    <div key={i} className="rounded-xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
                        {section}
                    </div>
                ))}
            </div>

            {/* Right: live preview */}
            <div className="w-[380px] shrink-0 sticky top-6 self-start">
                <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-tertiary)' }}>
                        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                            Script Preview
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                            Live
                        </span>
                    </div>
                    <pre
                        className="text-[11px] font-mono leading-relaxed p-4 overflow-auto max-h-[calc(100vh-160px)]"
                        style={{ background: 'var(--bg-base)', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
                    >
                        {preview}
                    </pre>
                </div>
            </div>
        </div>
    );
}
