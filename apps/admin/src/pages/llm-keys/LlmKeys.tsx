import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type LlmUpstream } from '../../lib/api';
import { Plus, Trash2, Eye, EyeOff, Server } from 'lucide-react';
import { toast } from 'sonner';

const EMPTY_FORM = { base_url: '', api_key: '', model_name: '', name: '', priority: 0 };

export function LlmKeys() {
    const queryClient = useQueryClient();
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [revealedKeys, setRevealedKeys] = useState<Set<number>>(new Set());

    const { data, isLoading } = useQuery({
        queryKey: ['llm', 'upstreams'],
        queryFn: api.llmGetUpstreams,
    });

    const createMutation = useMutation({
        mutationFn: api.llmCreateUpstream,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['llm', 'upstreams'] });
            setForm(EMPTY_FORM);
            setShowForm(false);
            toast.success('Upstream added');
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const deleteMutation = useMutation({
        mutationFn: api.llmDeleteUpstream,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['llm', 'upstreams'] });
            toast.success('Upstream removed');
        },
        onError: (e: Error) => toast.error(e.message),
    });

    function toggleReveal(id: number) {
        setRevealedKeys((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.base_url || !form.api_key) {
            toast.error('base_url and api_key are required');
            return;
        }
        createMutation.mutate({
            base_url: form.base_url,
            api_key: form.api_key,
            model_name: form.model_name || undefined,
            name: form.name || undefined,
            priority: Number(form.priority) || 0,
        });
    }

    const upstreams: LlmUpstream[] = data?.upstreams ?? [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">LLM Upstream Keys</h1>
                    <p className="text-sm mt-0.5 text-muted-foreground">
                        Manage LLM server upstream API keys and endpoints
                    </p>
                </div>
                <button
                    onClick={() => setShowForm((v) => !v)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{ background: 'var(--indigo-600, #4f46e5)', color: '#fff' }}
                >
                    <Plus size={15} />
                    Add Upstream
                </button>
            </div>

            {/* Add Form */}
            {showForm && (
                <form
                    onSubmit={handleSubmit}
                    className="rounded-xl p-5 space-y-4"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                >
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>New Upstream</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Base URL *</label>
                            <input
                                required
                                value={form.base_url}
                                onChange={(e) => setForm({ ...form, base_url: e.target.value })}
                                placeholder="https://api.openai.com/v1"
                                className="w-full px-3 py-2 rounded text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>API Key *</label>
                            <input
                                required
                                value={form.api_key}
                                onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                                placeholder="sk-..."
                                className="w-full px-3 py-2 rounded text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Model Name</label>
                            <input
                                value={form.model_name}
                                onChange={(e) => setForm({ ...form, model_name: e.target.value })}
                                placeholder="gpt-4o"
                                className="w-full px-3 py-2 rounded text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Name / Label</label>
                            <input
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder="OpenAI Primary"
                                className="w-full px-3 py-2 rounded text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Priority</label>
                            <input
                                type="number"
                                min={0}
                                value={form.priority}
                                onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                                className="w-full px-3 py-2 rounded text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                            />
                        </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                        <button
                            type="button"
                            onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
                            className="px-4 py-2 rounded text-sm"
                            style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={createMutation.isPending}
                            className="px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
                            style={{ background: '#4f46e5', color: '#fff' }}
                        >
                            {createMutation.isPending ? 'Adding…' : 'Add Upstream'}
                        </button>
                    </div>
                </form>
            )}

            {/* Table */}
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                <table className="w-full text-sm">
                    <thead>
                        <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                            <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Name</th>
                            <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Base URL</th>
                            <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>API Key</th>
                            <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Model</th>
                            <th className="text-center px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Priority</th>
                            <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Created</th>
                            <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading && (
                            <tr>
                                <td colSpan={7} className="px-5 py-10 text-center text-sm animate-pulse" style={{ color: 'var(--text-muted)' }}>
                                    Loading…
                                </td>
                            </tr>
                        )}
                        {!isLoading && upstreams.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-5 py-10 text-center" style={{ color: 'var(--text-muted)' }}>
                                    <div className="flex flex-col items-center gap-2">
                                        <Server size={24} className="opacity-30" />
                                        <span className="text-sm">No upstreams configured</span>
                                    </div>
                                </td>
                            </tr>
                        )}
                        {upstreams.map((u) => (
                            <tr
                                key={u.id}
                                className="hover:bg-[var(--bg-hover)] transition-colors"
                                style={{ borderBottom: '1px solid var(--border)' }}
                            >
                                <td className="px-5 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>
                                    {u.name ?? <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                </td>
                                <td className="px-5 py-3 font-mono text-xs max-w-[220px] truncate" style={{ color: 'var(--text-secondary)' }}>
                                    {u.base_url}
                                </td>
                                <td className="px-5 py-3">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                                            {revealedKeys.has(u.id) ? u.api_key : maskKey(u.api_key)}
                                        </span>
                                        <button
                                            onClick={() => toggleReveal(u.id)}
                                            className="p-1 rounded opacity-60 hover:opacity-100 transition-opacity"
                                        >
                                            {revealedKeys.has(u.id)
                                                ? <EyeOff size={13} style={{ color: 'var(--text-muted)' }} />
                                                : <Eye size={13} style={{ color: 'var(--text-muted)' }} />
                                            }
                                        </button>
                                    </div>
                                </td>
                                <td className="px-5 py-3 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                                    {u.model_name ?? <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                </td>
                                <td className="px-5 py-3 text-center text-xs" style={{ color: 'var(--text-secondary)' }}>
                                    {u.priority}
                                </td>
                                <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                                    {new Date(u.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-5 py-3 text-right">
                                    <button
                                        onClick={() => {
                                            if (confirm(`Remove upstream "${u.name ?? u.base_url}"?`)) {
                                                deleteMutation.mutate(u.id);
                                            }
                                        }}
                                        disabled={deleteMutation.isPending}
                                        className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors disabled:opacity-30"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function maskKey(key: string): string {
    if (key.length <= 8) return '••••••••';
    return key.slice(0, 6) + '••••••••' + key.slice(-4);
}
