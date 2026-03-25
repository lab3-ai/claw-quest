import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { api } from '../../lib/api';
import { useEnv } from '../../context/EnvContext';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ConfirmModal } from '../../components/shared/ConfirmModal';
import { ArrowLeft, AlertTriangle, Edit2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useEffect } from 'react';

const ALL_STATUSES = ['draft', 'live', 'scheduled', 'completed', 'expired', 'cancelled'];

export function QuestDetail() {
    const { questId } = useParams({ strict: false }) as { questId: string };
    const search = (useParams({ strict: false }) as any) || {};
    const qc = useQueryClient();
    const { env } = useEnv();

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [participationsPage, setParticipationsPage] = useState(1);
    const pageSize = 10;

    useEffect(() => {
        if (search.edit === 'true' || search.edit === true) {
            setIsEditDialogOpen(true);
        }
    }, [search.edit]);

    const { data: quest, isLoading } = useQuery({
        queryKey: ['admin', 'quest', questId, env],
        queryFn: () => api.getQuest(questId),
    });

    const { data: participationsData, isLoading: isLoadingParticipations } = useQuery({
        queryKey: ['admin', 'quest', questId, 'participations', participationsPage, env],
        queryFn: () => api.getQuestParticipations(questId, { page: participationsPage, pageSize }),
    });

    // Force status modal
    const [statusModal, setStatusModal] = useState(false);
    const [newStatus, setNewStatus] = useState('');
    const [reason, setReason] = useState('');

    const forceStatusMut = useMutation({
        mutationFn: () => api.forceStatus(questId, { status: newStatus, reason }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin', 'quest', questId] });
            setStatusModal(false);
            setReason('');
        },
    });

    // Delete modal
    const [deleteModal, setDeleteModal] = useState(false);
    const deleteMut = useMutation({
        mutationFn: () => api.deleteQuest(questId),
        onSuccess: () => { window.history.back(); },
    });

    if (isLoading) return <div className="animate-pulse" style={{ color: 'var(--text-muted)' }}>Loading quest...</div>;
    if (!quest) return <div style={{ color: 'var(--text-muted)' }}>Quest not found</div>;

    return (
        <div className="space-y-6 max-w-4xl">
            <Link to="/quests" className="flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300">
                <ArrowLeft size={14} /> Back to Quests
            </Link>

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-xl font-semibold">{quest.title}</h1>
                    <div className="flex gap-2 mt-2">
                        <StatusBadge status={quest.status} />
                        <StatusBadge status={quest.type} />
                        <StatusBadge status={quest.fundingStatus} />
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsEditDialogOpen(true)}
                        className="p-2 rounded bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border)] text-indigo-400"
                        title="Edit Quest"
                    >
                        <Edit2 size={16} />
                    </button>
                    <button
                        onClick={() => { setNewStatus(quest.status); setStatusModal(true); }}
                        className="px-3 py-1.5 rounded text-sm bg-indigo-600 hover:bg-indigo-700 text-white"
                    >Force Status</button>
                    <button
                        onClick={() => setDeleteModal(true)}
                        className="px-3 py-1.5 rounded text-sm bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-600/30"
                    >Delete</button>
                </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4">
                <InfoCard title="Quest Details">
                    <Row label="ID" value={quest.id} mono />
                    <Row label="Description" value={quest.description} />
                    <Row label="Creator" value={quest.sponsor} />
                    <Row label="Created" value={new Date(quest.createdAt).toLocaleString()} />
                    <Row label="Start" value={quest.startAt ? new Date(quest.startAt).toLocaleString() : '—'} />
                    <Row label="Expires" value={quest.expiresAt ? new Date(quest.expiresAt).toLocaleString() : '—'} />
                </InfoCard>

                <InfoCard title="Reward & Funding">
                    <Row label="Reward" value={`${quest.rewardAmount} ${quest.rewardType}`} />
                    <Row label="Slots" value={`${quest.filledSlots} / ${quest.totalSlots}`} />
                    <Row label="Funding Method" value={quest.fundingMethod || '—'} />
                    <Row label="Chain ID" value={quest.cryptoChainId ?? '—'} />
                    <Row label="Tx Hash" value={quest.cryptoTxHash || '—'} mono />
                    <Row label="Sponsor Wallet" value={quest.sponsorWallet || '—'} mono />
                </InfoCard>

                <InfoCard title="Creator Details">
                    <Row label="Creator User ID" value={quest.creatorUserId || '—'} mono />
                    <Row label="Email" value={quest.creatorEmail || '—'} />
                    <Row label="Agent ID" value={quest.creatorAgentId || '—'} mono />
                    <Row label="Claimed" value={quest.claimedAt ? new Date(quest.claimedAt).toLocaleString() : 'No'} />
                </InfoCard>

                <InfoCard title="Participation Summary">
                    <Row label="Total" value={quest.participationSummary?.total ?? 0} />
                    <Row label="Completed" value={quest.participationSummary?.completed ?? 0} />
                    <Row label="In Progress" value={quest.participationSummary?.inProgress ?? 0} />
                    <Row label="Submitted" value={quest.participationSummary?.submitted ?? 0} />
                    <Row label="Failed" value={quest.participationSummary?.failed ?? 0} />
                </InfoCard>
            </div>

            {/* Participations Table */}
            <div>
                <h2 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
                    Participations {participationsData?.pagination ? `(${participationsData.pagination.total})` : ''}
                </h2>
                <div className="rounded-lg overflow-hidden" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                    <table className="w-full text-sm">
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                <th className="text-left px-4 py-2.5 font-medium" style={{ color: 'var(--text-muted)' }}>Agent</th>
                                <th className="text-left px-4 py-2.5 font-medium" style={{ color: 'var(--text-muted)' }}>Status</th>
                                <th className="text-center px-4 py-2.5 font-medium" style={{ color: 'var(--text-muted)' }}>Tasks</th>
                                <th className="text-left px-4 py-2.5 font-medium" style={{ color: 'var(--text-muted)' }}>Payout</th>
                                <th className="text-left px-4 py-2.5 font-medium" style={{ color: 'var(--text-muted)' }}>Joined</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoadingParticipations ? (
                                <tr><td colSpan={5} className="px-4 py-8 text-center animate-pulse">Loading participations...</td></tr>
                            ) : participationsData?.data?.length ? (
                                participationsData.data.map((p: any) => (
                                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td className="px-4 py-2.5">{p.agentName}</td>
                                        <td className="px-4 py-2.5"><StatusBadge status={p.status} /></td>
                                        <td className="px-4 py-2.5 text-center">{p.tasksCompleted}/{p.tasksTotal}</td>
                                        <td className="px-4 py-2.5">
                                            <StatusBadge status={p.payoutStatus} />
                                            {p.payoutAmount != null && <span className="ml-2 text-xs">${p.payoutAmount}</span>}
                                        </td>
                                        <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                            {new Date(p.joinedAt).toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={5} className="px-4 py-8 text-center" style={{ color: 'var(--text-muted)' }}>No participations found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {participationsData?.pagination && participationsData.pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        <span>Page {participationsData.pagination.page} / {participationsData.pagination.totalPages}</span>
                        <div className="flex gap-1">
                            <button
                                disabled={participationsPage <= 1}
                                onClick={() => setParticipationsPage(p => p - 1)}
                                className="p-1 rounded disabled:opacity-30 hover:bg-[var(--bg-hover)]"
                            ><ChevronLeft size={14} /></button>
                            <button
                                disabled={participationsPage >= participationsData.pagination.totalPages}
                                onClick={() => setParticipationsPage(p => p + 1)}
                                className="p-1 rounded disabled:opacity-30 hover:bg-[var(--bg-hover)]"
                            ><ChevronRight size={14} /></button>
                        </div>
                    </div>
                )}
            </div>

            {/* Force Status Modal */}
            <ConfirmModal
                open={statusModal}
                title="Force Quest Status"
                confirmLabel="Apply"
                loading={forceStatusMut.isPending}
                onConfirm={() => forceStatusMut.mutate()}
                onCancel={() => setStatusModal(false)}
            >
                <div className="space-y-3 mt-2">
                    <div>
                        <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>New Status</label>
                        <select
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value)}
                            className="w-full px-3 py-2 rounded text-sm"
                            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                        >
                            {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Reason (required)</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 rounded text-sm"
                            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                            placeholder="Why is this status being changed?"
                        />
                    </div>
                    {forceStatusMut.error && (
                        <div className="flex items-center gap-2 text-xs text-red-300">
                            <AlertTriangle size={12} /> {forceStatusMut.error.message}
                        </div>
                    )}
                </div>
            </ConfirmModal>

            {/* Delete Modal */}
            <ConfirmModal
                open={deleteModal}
                title="Delete Quest"
                description={`Are you sure you want to delete "${quest.title}"? This cannot be undone.`}
                confirmLabel="Delete"
                confirmVariant="danger"
                loading={deleteMut.isPending}
                onConfirm={() => deleteMut.mutate()}
                onCancel={() => setDeleteModal(false)}
            >
                {deleteMut.error && (
                    <div className="flex items-center gap-2 text-xs text-red-300 mt-2">
                        <AlertTriangle size={12} /> {deleteMut.error.message}
                    </div>
                )}
            </ConfirmModal>

            <EditQuestDialog
                quest={quest}
                open={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
                onSuccess={() => {
                    qc.invalidateQueries({ queryKey: ['admin', 'quest', questId] });
                    setIsEditDialogOpen(false);
                }}
            />
        </div>
    );
}

function EditQuestDialog({ quest, open, onOpenChange, onSuccess }: { quest: any; open: boolean; onOpenChange: (open: boolean) => void; onSuccess: () => void }) {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        sponsor: '',
        creatorUserId: '',
        type: 'FCFS',
        status: 'draft',
        rewardAmount: 0,
        rewardType: 'USDC',
        totalSlots: 0,
        startAt: '',
        expiresAt: '',
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (quest) {
            setFormData({
                title: quest.title || '',
                description: quest.description || '',
                sponsor: quest.sponsor || '',
                creatorUserId: quest.creatorUserId || '',
                type: quest.type || 'FCFS',
                status: quest.status || 'draft',
                rewardAmount: quest.rewardAmount || 0,
                rewardType: quest.rewardType || 'USDC',
                totalSlots: quest.totalSlots || 0,
                startAt: quest.startAt ? new Date(quest.startAt).toISOString().slice(0, 16) : '',
                expiresAt: quest.expiresAt ? new Date(quest.expiresAt).toISOString().slice(0, 16) : '',
            });
        }
    }, [quest]);

    // Auto-fetch creator name from User ID
    useEffect(() => {
        const userId = formData.creatorUserId;
        if (!userId || userId.length < 32 || userId === quest?.creatorUserId) return;

        const timer = setTimeout(async () => {
            try {
                const user = await api.getUser(userId);
                if (user && (user.email || user.username)) {
                    setFormData(prev => ({ ...prev, sponsor: user.email || user.username }));
                    toast.success(`Fetched creator: ${user.email || user.username}`, { id: 'fetch-user' });
                }
            } catch (err) {
                // Silently fail or log to console, don't spam toasts
                console.error('Failed to fetch user', err);
            }
        }, 500); // Debounce to avoid excessive API calls

        return () => clearTimeout(timer);
    }, [formData.creatorUserId, quest?.creatorUserId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.updateQuest(quest.id, {
                ...formData,
                startAt: formData.startAt ? new Date(formData.startAt).toISOString() : null,
                expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null,
            });
            toast.success('Quest updated successfully');
            onSuccess();
        } catch (err: any) {
            toast.error(err.message || 'Failed to update quest');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-primary)] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Edit2 className="text-indigo-400" size={20} />
                        Edit Quest
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label className="text-xs font-medium uppercase text-muted-foreground">Title</Label>
                        <Input
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="bg-black/20 border-[var(--border)]"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-medium uppercase text-muted-foreground">Description</Label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-2 rounded-md text-sm bg-black/20 border border-[var(--border)] focus:ring-2 focus:ring-indigo-500 h-24"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-medium uppercase text-muted-foreground">Creator Name (Sponsor)</Label>
                            <Input
                                value={formData.sponsor}
                                onChange={(e) => setFormData({ ...formData, sponsor: e.target.value })}
                                className="bg-black/20 border-[var(--border)]"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-medium uppercase text-muted-foreground">Creator User ID</Label>
                            <Input
                                value={formData.creatorUserId}
                                onChange={(e) => setFormData({ ...formData, creatorUserId: e.target.value })}
                                className="bg-black/20 border-[var(--border)] font-mono text-[10px]"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-medium uppercase text-muted-foreground">Quest Type</Label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                className="w-full px-3 py-2 rounded-md text-sm bg-black/20 border border-[var(--border)]"
                            >
                                <option value="FCFS">FCFS</option>
                                <option value="LEADERBOARD">Leaderboard</option>
                                <option value="LUCKY_DRAW">Lucky Draw</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-medium uppercase text-muted-foreground">Status</Label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="w-full px-3 py-2 rounded-md text-sm bg-black/20 border border-[var(--border)]"
                            >
                                {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-medium uppercase text-muted-foreground">Reward Amount & Type</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    step="any"
                                    value={formData.rewardAmount}
                                    onChange={(e) => setFormData({ ...formData, rewardAmount: Number(e.target.value) })}
                                    className="bg-black/20 border-[var(--border)] flex-1"
                                />
                                <Input
                                    value={formData.rewardType}
                                    onChange={(e) => setFormData({ ...formData, rewardType: e.target.value })}
                                    className="bg-black/20 border-[var(--border)] w-24"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-medium uppercase text-muted-foreground">Total Slots</Label>
                            <Input
                                type="number"
                                value={formData.totalSlots}
                                onChange={(e) => setFormData({ ...formData, totalSlots: Number(e.target.value) })}
                                className="bg-black/20 border-[var(--border)]"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-medium uppercase text-muted-foreground">Start At</Label>
                            <Input
                                type="datetime-local"
                                value={formData.startAt}
                                onChange={(e) => setFormData({ ...formData, startAt: e.target.value })}
                                className="bg-black/20 border-[var(--border)]"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-medium uppercase text-muted-foreground">Expires At</Label>
                            <Input
                                type="datetime-local"
                                value={formData.expiresAt}
                                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                                className="bg-black/20 border-[var(--border)]"
                            />
                        </div>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-[var(--border)] hover:bg-black/20 text-white">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            {loading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}


function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-lg p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>{title}</h3>
            <div className="space-y-2">{children}</div>
        </div>
    );
}

function Row({ label, value, mono }: { label: string; value: any; mono?: boolean }) {
    return (
        <div className="flex justify-between text-xs">
            <span style={{ color: 'var(--text-muted)' }}>{label}</span>
            <span className={`text-right max-w-[60%] truncate ${mono ? 'font-mono' : ''}`}>{String(value)}</span>
        </div>
    );
}
