import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Plus, Pencil, X, Brain } from 'lucide-react';
import { toast } from 'sonner';

interface LlmModel {
    id: string;
    openrouterId: string;
    name: string;
    provider: string;
    tier: string;
    inputPricePer1M: number;
    outputPricePer1M: number;
    contextWindow: number;
    isActive: boolean;
    createdAt?: string;
}

const TIER_COLORS: Record<string, string> = {
    premium: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    mid: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    budget: 'text-green-400 bg-green-400/10 border-green-400/20',
};

const EMPTY_EDIT = { inputPricePer1M: '', outputPricePer1M: '', isActive: true };

export function LlmModels() {
    const queryClient = useQueryClient();
    const [editId, setEditId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState(EMPTY_EDIT);
    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState({
        openrouterId: '', name: '', provider: '', tier: 'standard',
        inputPricePer1M: '', outputPricePer1M: '', contextWindow: '',
    });

    const { data: models, isLoading } = useQuery<LlmModel[]>({
        queryKey: ['admin', 'llm-models'],
        queryFn: () => api.getLlmModels(),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => api.updateLlmModel(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'llm-models'] });
            setEditId(null);
            toast.success('Model updated');
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => api.createLlmModel(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'llm-models'] });
            setShowCreate(false);
            setCreateForm({ openrouterId: '', name: '', provider: '', tier: 'standard', inputPricePer1M: '', outputPricePer1M: '', contextWindow: '' });
            toast.success('Model created');
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.deleteLlmModel(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'llm-models'] });
            toast.success('Model deactivated');
        },
        onError: (e: Error) => toast.error(e.message),
    });

    function openEdit(m: LlmModel) {
        setEditId(m.id);
        setEditForm({
            inputPricePer1M: String(m.inputPricePer1M),
            outputPricePer1M: String(m.outputPricePer1M),
            isActive: m.isActive,
        });
    }

    function saveEdit() {
        if (!editId) return;
        updateMutation.mutate({
            id: editId,
            data: {
                inputPricePer1M: parseFloat(editForm.inputPricePer1M),
                outputPricePer1M: parseFloat(editForm.outputPricePer1M),
                isActive: editForm.isActive,
            },
        });
    }

    function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        createMutation.mutate({
            openrouterId: createForm.openrouterId,
            name: createForm.name,
            provider: createForm.provider,
            tier: createForm.tier,
            inputPricePer1M: parseFloat(createForm.inputPricePer1M),
            outputPricePer1M: parseFloat(createForm.outputPricePer1M),
            contextWindow: parseInt(createForm.contextWindow),
        });
    }

    const modelList = Array.isArray(models) ? models : [];
    const sorted = [...modelList].sort((a, b) => {
        const tierOrder = { premium: 0, mid: 1, budget: 2, standard: 3 };
        return (tierOrder[a.tier as keyof typeof tierOrder] ?? 3) - (tierOrder[b.tier as keyof typeof tierOrder] ?? 3);
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">LLM Models</h1>
                    <p className="text-sm mt-0.5 text-muted-foreground">
                        Manage OpenRouter model catalog and pricing for LLM reward quests
                    </p>
                </div>
                <button
                    onClick={() => setShowCreate(v => !v)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{ background: 'var(--indigo-600, #4f46e5)', color: '#fff' }}
                >
                    <Plus size={15} />
                    Add Model
                </button>
            </div>

            {/* Create Form */}
            {showCreate && (
                <form
                    onSubmit={handleCreate}
                    className="rounded-xl p-5 space-y-4"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                >
                    <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">New LLM Model</div>
                        <button type="button" onClick={() => setShowCreate(false)}><X size={15} /></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                            { key: 'openrouterId', label: 'OpenRouter ID', placeholder: 'anthropic/claude-sonnet-4-6' },
                            { key: 'name', label: 'Display Name', placeholder: 'Claude Sonnet 4.6' },
                            { key: 'provider', label: 'Provider', placeholder: 'Anthropic' },
                        ].map(f => (
                            <div key={f.key} className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">{f.label} *</label>
                                <input
                                    required
                                    value={createForm[f.key as keyof typeof createForm]}
                                    onChange={e => setCreateForm({ ...createForm, [f.key]: e.target.value })}
                                    placeholder={f.placeholder}
                                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                                />
                            </div>
                        ))}
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Tier</label>
                            <select
                                value={createForm.tier}
                                onChange={e => setCreateForm({ ...createForm, tier: e.target.value })}
                                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                            >
                                {['premium', 'mid', 'budget', 'standard'].map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        {[
                            { key: 'inputPricePer1M', label: 'Input $/1M tokens' },
                            { key: 'outputPricePer1M', label: 'Output $/1M tokens' },
                            { key: 'contextWindow', label: 'Context Window (tokens)' },
                        ].map(f => (
                            <div key={f.key} className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">{f.label} *</label>
                                <input
                                    required
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={createForm[f.key as keyof typeof createForm]}
                                    onChange={e => setCreateForm({ ...createForm, [f.key]: e.target.value })}
                                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                                />
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setShowCreate(false)} className="px-3 py-1.5 text-sm rounded-md border border-input">Cancel</button>
                        <button
                            type="submit"
                            disabled={createMutation.isPending}
                            className="px-4 py-1.5 text-sm rounded-md font-medium text-white disabled:opacity-50"
                            style={{ background: '#4f46e5' }}
                        >
                            {createMutation.isPending ? 'Creating…' : 'Create Model'}
                        </button>
                    </div>
                </form>
            )}

            {/* Table */}
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                <table className="w-full text-sm">
                    <thead>
                        <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                            {['Model', 'Provider', 'Tier', 'Input $/1M', 'Output $/1M', 'Context', 'Status', ''].map(h => (
                                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading && (
                            <tr><td colSpan={8} className="text-center py-10 text-muted-foreground">Loading…</td></tr>
                        )}
                        {!isLoading && sorted.length === 0 && (
                            <tr><td colSpan={8} className="text-center py-10 text-muted-foreground">No models found</td></tr>
                        )}
                        {sorted.map((m, i) => (
                            <tr
                                key={m.id}
                                style={{
                                    borderBottom: i < sorted.length - 1 ? '1px solid var(--border)' : undefined,
                                    background: !m.isActive ? 'var(--muted)' : undefined,
                                    opacity: !m.isActive ? 0.6 : 1,
                                }}
                            >
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <Brain size={14} className="text-muted-foreground shrink-0" />
                                        <div>
                                            <div className="font-medium">{m.name}</div>
                                            <div className="text-xs text-muted-foreground font-mono">{m.openrouterId}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">{m.provider}</td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${TIER_COLORS[m.tier] ?? 'text-muted-foreground'}`}>
                                        {m.tier}
                                    </span>
                                </td>
                                <td className="px-4 py-3 font-mono">
                                    {editId === m.id ? (
                                        <input
                                            type="number" step="any" min="0"
                                            value={editForm.inputPricePer1M}
                                            onChange={e => setEditForm({ ...editForm, inputPricePer1M: e.target.value })}
                                            className="w-24 rounded border border-input bg-background px-2 py-1 text-sm"
                                        />
                                    ) : `$${m.inputPricePer1M}`}
                                </td>
                                <td className="px-4 py-3 font-mono">
                                    {editId === m.id ? (
                                        <input
                                            type="number" step="any" min="0"
                                            value={editForm.outputPricePer1M}
                                            onChange={e => setEditForm({ ...editForm, outputPricePer1M: e.target.value })}
                                            className="w-24 rounded border border-input bg-background px-2 py-1 text-sm"
                                        />
                                    ) : `$${m.outputPricePer1M}`}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">
                                    {m.contextWindow >= 1000000
                                        ? `${m.contextWindow / 1000000}M`
                                        : `${Math.round(m.contextWindow / 1000)}K`}
                                </td>
                                <td className="px-4 py-3">
                                    {editId === m.id ? (
                                        <button
                                            type="button"
                                            onClick={() => setEditForm({ ...editForm, isActive: !editForm.isActive })}
                                            className={`relative inline-flex h-5 w-9 rounded-full border-2 border-transparent transition-colors ${editForm.isActive ? 'bg-green-500' : 'bg-muted-foreground/30'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${editForm.isActive ? 'translate-x-4' : 'translate-x-0'}`} />
                                        </button>
                                    ) : (
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${m.isActive ? 'text-green-400 bg-green-400/10 border-green-400/20' : 'text-muted-foreground bg-muted border-border'}`}>
                                            {m.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        {editId === m.id ? (
                                            <>
                                                <button
                                                    onClick={saveEdit}
                                                    disabled={updateMutation.isPending}
                                                    className="px-3 py-1 text-xs rounded font-medium text-white disabled:opacity-50"
                                                    style={{ background: '#4f46e5' }}
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    onClick={() => setEditId(null)}
                                                    className="px-3 py-1 text-xs rounded border border-input"
                                                >
                                                    Cancel
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => openEdit(m)}
                                                    className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                                    title="Edit pricing"
                                                >
                                                    <Pencil size={13} />
                                                </button>
                                                {m.isActive && (
                                                    <button
                                                        onClick={() => { if (confirm(`Deactivate ${m.name}?`)) deleteMutation.mutate(m.id) }}
                                                        className="p-1.5 rounded hover:bg-red-500/10 transition-colors text-muted-foreground hover:text-red-400"
                                                        title="Deactivate model"
                                                    >
                                                        <X size={13} />
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
