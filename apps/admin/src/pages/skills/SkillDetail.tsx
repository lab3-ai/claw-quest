import { useState, useEffect } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Save, RotateCcw, Star, Package } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useEnv } from '@/context/EnvContext';
import { Button } from '@/components/ui/button';
import {
    VerificationConfigForm,
    defaultVerificationConfig,
    type VerificationConfigValue,
} from '@/components/skills/VerificationConfigForm';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function coerceToConfigValue(raw: Record<string, unknown> | null): VerificationConfigValue | null {
    if (!raw) return null;
    const def = defaultVerificationConfig();
    return {
        skill_display: (raw.skill_display as string) ?? '',
        task_description: (raw.task_description as string) ?? '',
        api_endpoint: (raw.api_endpoint as string) ?? '',
        params: (raw.params as Record<string, string>) ?? {},
        variable_options: Object.fromEntries(
            Object.entries((raw.variable_options as Record<string, unknown[]>) ?? {}).map(
                ([k, v]) => [k, (v as (string | number)[]).map(String)]
            )
        ),
        submission_fields: ((raw.submission_fields as unknown[]) ?? []).map(String),
        validation: (raw.validation as VerificationConfigValue['validation']) ?? def.validation,
        install: (raw.install as VerificationConfigValue['install']) ?? def.install,
        fetch: (raw.fetch as VerificationConfigValue['fetch']) ?? def.fetch,
    };
}

function configValueToPayload(cfg: VerificationConfigValue): Record<string, unknown> {
    return {
        type: 'api_call',
        skill_display: cfg.skill_display,
        task_description: cfg.task_description,
        api_endpoint: cfg.api_endpoint,
        params: cfg.params,
        variable_options: cfg.variable_options,
        submission_fields: cfg.submission_fields,
        validation: cfg.validation,
        install: cfg.install,
        fetch: cfg.fetch,
    };
}

// ─── Info chip ───────────────────────────────────────────────────────────────

function Chip({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
    return (
        <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
            <Icon size={12} />
            {label}
        </span>
    );
}

// ─── SkillDetail Page ─────────────────────────────────────────────────────────

export function SkillDetail() {
    const { slug } = useParams({ from: '/auth/skills/$slug' });
    const { env } = useEnv();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data, isLoading, error } = useQuery({
        queryKey: ['admin', 'skill', slug, env],
        queryFn: () => api.getSkill(slug),
    });

    const skill = data?.skill;

    const [config, setConfig] = useState<VerificationConfigValue | null>(null);
    const [isDirty, setIsDirty] = useState(false);

    // Initialise form when data loads
    useEffect(() => {
        if (!skill) return;
        const parsed = coerceToConfigValue(skill.verification_config);
        setConfig(parsed ?? defaultVerificationConfig());
        setIsDirty(false);
    }, [skill]);

    function handleChange(v: VerificationConfigValue) {
        setConfig(v);
        setIsDirty(true);
    }

    function handleReset() {
        if (!skill) return;
        const parsed = coerceToConfigValue(skill.verification_config);
        setConfig(parsed ?? defaultVerificationConfig());
        setIsDirty(false);
    }

    const saveMutation = useMutation({
        mutationFn: () => {
            if (!config) throw new Error('No config');
            return api.updateVerificationConfig(slug, configValueToPayload(config));
        },
        onSuccess: () => {
            toast.success('Verification config saved');
            queryClient.invalidateQueries({ queryKey: ['admin', 'skill', slug] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'skills'] });
            setIsDirty(false);
        },
        onError: (e: Error) => toast.error(e.message),
    });

    if (isLoading) {
        return (
            <div className="p-6 flex items-center justify-center h-48">
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</span>
            </div>
        );
    }

    if (error || !skill) {
        return (
            <div className="p-6 flex flex-col gap-4 items-start">
                <Button variant="outline" size="sm" onClick={() => navigate({ to: '/skills' })} className="gap-2">
                    <ChevronLeft size={14} /> Back to Skills
                </Button>
                <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Skill not found.</div>
            </div>
        );
    }

    return (
        <div className="p-6 flex flex-col gap-5">
            {/* Top bar */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={() => navigate({ to: '/skills' })} className="gap-2">
                        <ChevronLeft size={14} /> Skills
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                                {skill.display_name}
                            </h1>
                            {skill.featured && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide"
                                    style={{ background: 'var(--badge-yellow-bg)', color: 'var(--badge-yellow-text)' }}>
                                    Featured
                                </span>
                            )}
                        </div>
                        <code className="text-xs" style={{ color: 'var(--text-muted)' }}>{skill.slug}</code>
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2">
                    {isDirty && (
                        <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
                            <RotateCcw size={14} /> Reset
                        </Button>
                    )}
                    <Button
                        size="sm"
                        onClick={() => saveMutation.mutate()}
                        disabled={!isDirty || saveMutation.isPending}
                        className="gap-2"
                    >
                        <Save size={14} />
                        {saveMutation.isPending ? 'Saving…' : isDirty ? 'Save Changes' : 'Saved'}
                    </Button>
                </div>
            </div>

            {/* Skill metadata row */}
            <div className="rounded-xl border p-4 flex flex-wrap items-center gap-3"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
                <Chip icon={Package} label={`${skill.downloads.toLocaleString()} downloads`} />
                <Chip icon={Star} label={`${skill.stars} stars`} />
                {skill.owner_handle && (
                    <Chip icon={Package} label={`@${skill.owner_handle}`} />
                )}
                {skill.web3_category && (
                    <Chip icon={Package} label={skill.web3_category} />
                )}
                {skill.latest_version && (
                    <Chip icon={Package} label={`v${skill.latest_version}`} />
                )}
                {skill.is_web3 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{ background: 'var(--badge-blue-bg)', color: 'var(--badge-blue-text)' }}>
                        Web3
                    </span>
                )}
                {skill.summary && (
                    <span className="text-sm ml-2 flex-1" style={{ color: 'var(--text-secondary)' }}>{skill.summary}</span>
                )}
            </div>

            {/* Dirty banner */}
            {isDirty && (
                <div className="rounded-lg border px-4 py-2.5 text-sm flex items-center justify-between"
                    style={{ borderColor: 'var(--badge-yellow-bg)', background: 'var(--badge-yellow-bg)', color: 'var(--badge-yellow-text)' }}>
                    <span>You have unsaved changes.</span>
                    <div className="flex gap-2">
                        <button onClick={handleReset} className="underline text-xs">Reset</button>
                        <button onClick={() => saveMutation.mutate()} className="underline text-xs font-semibold">Save now</button>
                    </div>
                </div>
            )}

            {/* No config notice */}
            {!skill.verification_config && !isDirty && (
                <div className="rounded-lg border px-4 py-3 text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                    This skill has no verification config yet. Fill in the form below and save to enable challenge-based verification.
                </div>
            )}

            {/* The form */}
            {config && (
                <VerificationConfigForm
                    skillSlug={slug}
                    value={config}
                    onChange={handleChange}
                />
            )}

            {/* Bottom save */}
            <div className="flex justify-end pt-2">
                <Button
                    onClick={() => saveMutation.mutate()}
                    disabled={!isDirty || saveMutation.isPending}
                    className="gap-2"
                >
                    <Save size={15} />
                    {saveMutation.isPending ? 'Saving…' : 'Save Verification Config'}
                </Button>
            </div>
        </div>
    );
}
