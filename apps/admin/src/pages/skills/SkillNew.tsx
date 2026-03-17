import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useEnv } from '@/context/EnvContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    VerificationConfigForm,
    defaultVerificationConfig,
    type VerificationConfigValue,
} from '@/components/skills/VerificationConfigForm';

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

export function SkillNew() {
    const navigate = useNavigate();
    const { env } = useEnv();
    const queryClient = useQueryClient();

    const [slug, setSlug] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [summary, setSummary] = useState('');
    const [ownerHandle, setOwnerHandle] = useState('');
    const [isWeb3, setIsWeb3] = useState(false);
    const [featured, setFeatured] = useState(false);
    const [config, setConfig] = useState<VerificationConfigValue>(defaultVerificationConfig());

    const mutation = useMutation({
        mutationFn: () =>
            api.upsertSkill({
                slug,
                display_name: displayName,
                summary: summary || undefined,
                owner_handle: ownerHandle || undefined,
                is_web3: isWeb3,
                featured,
                verification_config: config.skill_display ? configValueToPayload(config) : undefined,
                env,
            } as any),
        onSuccess: () => {
            toast.success('Skill created');
            queryClient.invalidateQueries({ queryKey: ['admin', 'skills'] });
            navigate({ to: '/skills/$slug', params: { slug } });
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const canSave = slug.trim() && displayName.trim();

    return (
        <div className="p-6 flex flex-col gap-5">
            {/* Top bar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={() => navigate({ to: '/skills' })} className="gap-2">
                        <ChevronLeft size={14} /> Skills
                    </Button>
                    <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                        New Skill
                    </h1>
                </div>
                <Button onClick={() => mutation.mutate()} disabled={!canSave || mutation.isPending} className="gap-2">
                    <Save size={14} />
                    {mutation.isPending ? 'Creating…' : 'Create Skill'}
                </Button>
            </div>

            {/* Basic info */}
            <div className="rounded-xl border p-5 flex flex-col gap-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
                <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    Basic Info
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                        <Label>Slug *</Label>
                        <Input value={slug} onChange={e => setSlug(e.target.value)} placeholder="e.g. bybit-trading" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label>Display Name *</Label>
                        <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="e.g. Bybit Trading" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label>Summary</Label>
                        <Input value={summary} onChange={e => setSummary(e.target.value)} placeholder="Short description" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label>Owner Handle</Label>
                        <Input value={ownerHandle} onChange={e => setOwnerHandle(e.target.value)} placeholder="@handle" />
                    </div>
                </div>
                <div className="flex items-center gap-5 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <input type="checkbox" checked={isWeb3} onChange={e => setIsWeb3(e.target.checked)} className="rounded" />
                        Web3 Skill
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <input type="checkbox" checked={featured} onChange={e => setFeatured(e.target.checked)} className="rounded" />
                        Featured
                    </label>
                </div>
            </div>

            {/* Verification config (optional at create time) */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Verification Config</span>
                    <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                        optional — can be set later
                    </span>
                </div>
                <VerificationConfigForm
                    skillSlug={slug || 'new-skill'}
                    value={config}
                    onChange={setConfig}
                />
            </div>

            {/* Bottom save */}
            <div className="flex justify-end pt-2">
                <Button onClick={() => mutation.mutate()} disabled={!canSave || mutation.isPending} className="gap-2">
                    <Save size={15} />
                    {mutation.isPending ? 'Creating…' : 'Create Skill'}
                </Button>
            </div>
        </div>
    );
}
