import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useEnv } from '../../context/EnvContext';
import { StatsCard } from '../../components/shared/StatsCard';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ConfirmModal } from '../../components/shared/ConfirmModal';
import { TxStatusLookup } from './TxStatusLookup';
import { Link } from '@tanstack/react-router';
import { Wallet, Lock, CheckCircle, Clock, ArrowUpRight, RotateCcw, AlertTriangle, Activity } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export function EscrowOverview() {
    const { env } = useEnv();
    const [page, setPage] = useState(1);
    const qc = useQueryClient();

    // ─── Action modal state ──────────────────────────────────────────────────
    const [actionModal, setActionModal] = useState<{
        type: 'distribute' | 'refund';
        questId: string;
        questTitle: string;
    } | null>(null);

    // ─── Queries ─────────────────────────────────────────────────────────────
    const { data: overview, isLoading } = useQuery({
        queryKey: ['admin', 'escrow', 'overview', env],
        queryFn: api.escrowOverview,
    });

    const { data: quests } = useQuery({
        queryKey: ['admin', 'escrow', 'quests', page, env],
        queryFn: () => api.escrowQuests({ page, pageSize: 20 }),
    });

    const { data: health } = useQuery({
        queryKey: ['escrow', 'health'],
        queryFn: api.escrowHealth,
        refetchInterval: 30_000,
    });

    // ─── Mutations ───────────────────────────────────────────────────────────
    const distributeMut = useMutation({
        mutationFn: (questId: string) => api.escrowDistribute(questId),
        onSuccess: (data) => {
            if (data.txHash) {
                toast.success(`Distributed! Tx: ${data.txHash.slice(0, 16)}...`);
            } else if (data.issued !== undefined) {
                toast.success(`LLM keys issued: ${data.issued} success, ${data.failed ?? 0} failed`);
            } else {
                toast.success('Distribution successful!');
            }
            qc.invalidateQueries({ queryKey: ['admin', 'escrow'] });
            setActionModal(null);
        },
        onError: (err: Error) => {
            toast.error(`Distribute failed: ${err.message}`);
        },
    });

    const refundMut = useMutation({
        mutationFn: (questId: string) => api.escrowRefund(questId),
        onSuccess: (data) => {
            toast.success(`Refunded! Tx: ${data.txHash.slice(0, 16)}...`);
            qc.invalidateQueries({ queryKey: ['admin', 'escrow'] });
            setActionModal(null);
        },
        onError: (err: Error) => {
            toast.error(`Refund failed: ${err.message}`);
        },
    });

    const activeMut = actionModal?.type === 'distribute' ? distributeMut : refundMut;

    if (isLoading) {
        return <div className="animate-pulse" style={{ color: 'var(--text-muted)' }}>Loading escrow data...</div>;
    }

    return (
        <div className="space-y-6">
            <h1 className="text-xl font-semibold">Escrow Dashboard</h1>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatsCard
                    label="Total Funded"
                    value={overview?.totalFunded ?? 0}
                    icon={<Wallet size={18} />}
                    color="text-green-400"
                />
                <StatsCard
                    label="Locked Value"
                    value={overview?.totalLocked ?? 0}
                    icon={<Lock size={18} />}
                    color="text-amber-400"
                />
                <StatsCard
                    label="Distributed"
                    value={overview?.totalDistributed ?? 0}
                    icon={<CheckCircle size={18} />}
                    color="text-emerald-400"
                />
                <StatsCard
                    label="Pending Payouts"
                    value={overview?.pendingPayouts ?? 0}
                    icon={<Clock size={18} />}
                    color="text-purple-400"
                />
            </div>

            {/* Token Breakdown */}
            {overview?.byToken?.length > 0 && (
                <div>
                    <h2 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>By Token</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {overview.byToken.map((t: any) => (
                            <div
                                key={t.token}
                                className="rounded-lg p-4 text-sm"
                                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                            >
                                <div className="font-medium">{t.token}</div>
                                <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                    Funded: {t.funded} | Locked: {t.locked} | Distributed: {t.distributed}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Funded Quests Table */}
            <div>
                <h2 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
                    Funded Quests ({quests?.pagination?.total ?? 0})
                </h2>
                <div className="rounded-lg overflow-hidden" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                    <table className="w-full text-sm">
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                <th className="text-left px-4 py-2.5 font-medium" style={{ color: 'var(--text-muted)' }}>Quest</th>
                                <th className="text-left px-4 py-2.5 font-medium" style={{ color: 'var(--text-muted)' }}>Status</th>
                                <th className="text-left px-4 py-2.5 font-medium" style={{ color: 'var(--text-muted)' }}>Funding</th>
                                <th className="text-right px-4 py-2.5 font-medium" style={{ color: 'var(--text-muted)' }}>Amount</th>
                                <th className="text-left px-4 py-2.5 font-medium" style={{ color: 'var(--text-muted)' }}>Token</th>
                                <th className="text-right px-4 py-2.5 font-medium" style={{ color: 'var(--text-muted)' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {quests?.data?.map((q: any) => (
                                <tr key={q.id} className="hover:bg-[var(--bg-hover)] transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td className="px-4 py-2.5">
                                        <Link to="/quests/$questId" params={{ questId: q.id }} className="text-indigo-400 hover:text-indigo-300">{q.title}</Link>
                                    </td>
                                    <td className="px-4 py-2.5"><StatusBadge status={q.status} /></td>
                                    <td className="px-4 py-2.5"><StatusBadge status={q.fundingStatus} /></td>
                                    <td className="px-4 py-2.5 text-right font-mono">{q.rewardAmount}</td>
                                    <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-secondary)' }}>{q.rewardType}</td>
                                    <td className="px-4 py-2.5 text-right">
                                        <div className="flex gap-1.5 justify-end">
                                            {q.fundingStatus === 'confirmed' && (
                                                <button
                                                    onClick={() => setActionModal({ type: 'distribute', questId: q.id, questTitle: q.title })}
                                                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-600/30 transition-colors"
                                                    title="Distribute rewards"
                                                >
                                                    <ArrowUpRight size={12} /> Distribute
                                                </button>
                                            )}
                                            {q.fundingStatus === 'confirmed' && (
                                                <button
                                                    onClick={() => setActionModal({ type: 'refund', questId: q.id, questTitle: q.title })}
                                                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-600/30 transition-colors"
                                                    title="Refund to sponsor"
                                                >
                                                    <RotateCcw size={12} /> Refund
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!quests?.data?.length && (
                                <tr><td colSpan={7} className="px-4 py-8 text-center" style={{ color: 'var(--text-muted)' }}>No funded quests</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {quests?.pagination && quests.pagination.totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-4">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page <= 1}
                            className="px-3 py-1 text-xs rounded disabled:opacity-40"
                            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                        >
                            Prev
                        </button>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {page} / {quests.pagination.totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(quests.pagination.totalPages, p + 1))}
                            disabled={page >= quests.pagination.totalPages}
                            className="px-3 py-1 text-xs rounded disabled:opacity-40"
                            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>

            {/* Poller Health */}
            <div>
                <h2 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
                    Poller Health
                </h2>
                <div className="rounded-lg p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                    {health ? (
                        <div className="flex flex-wrap gap-6 text-sm">
                            <div className="flex items-center gap-2">
                                <Activity size={14} className={health.poller.running ? 'text-emerald-400' : 'text-red-400'} />
                                <span style={{ color: 'var(--text-muted)' }}>Status</span>
                                <StatusBadge status={health.poller.running ? 'live' : 'cancelled'} />
                            </div>
                            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Chain</span>{' '}
                                {health.defaultChainId}
                            </div>
                            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Events</span>{' '}
                                {health.poller.eventsProcessed}
                            </div>
                            {health.poller.lastPollAt && (
                                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Last poll</span>{' '}
                                    {new Date(health.poller.lastPollAt).toLocaleString()}
                                </div>
                            )}
                            {health.poller.lastError && (
                                <div className="text-xs text-red-300 flex items-center gap-1">
                                    <AlertTriangle size={12} />
                                    {health.poller.lastError}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-xs animate-pulse" style={{ color: 'var(--text-muted)' }}>Loading health...</div>
                    )}
                </div>
            </div>

            {/* TX Status Lookup */}
            <TxStatusLookup />

            {/* Distribute / Refund Confirm Modal */}
            <ConfirmModal
                open={!!actionModal}
                title={actionModal?.type === 'distribute' ? 'Distribute Rewards' : 'Refund to Sponsor'}
                confirmLabel={actionModal?.type === 'distribute' ? 'Distribute' : 'Refund'}
                confirmVariant={actionModal?.type === 'refund' ? 'danger' : 'primary'}
                loading={activeMut.isPending}
                onConfirm={() => {
                    if (actionModal) activeMut.mutate(actionModal.questId);
                }}
                onCancel={() => { setActionModal(null); distributeMut.reset(); refundMut.reset(); }}
            >
                <div className="space-y-3 mt-2">
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {actionModal?.type === 'distribute'
                            ? `This will distribute escrowed rewards to participants of "${actionModal?.questTitle}". This action triggers an on-chain transaction.`
                            : `This will refund escrowed funds back to the sponsor of "${actionModal?.questTitle}". This action triggers an on-chain transaction.`
                        }
                    </p>
                    {activeMut.error && (
                        <div className="flex items-center gap-2 text-xs text-red-300 p-2 rounded bg-red-600/10 border border-red-600/20">
                            <AlertTriangle size={12} /> {activeMut.error.message}
                        </div>
                    )}
                </div>
            </ConfirmModal>
        </div>
    );
}
