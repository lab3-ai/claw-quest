import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { api } from '../../lib/api';
import { useEnv } from '../../context/EnvContext';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { Search, ChevronLeft, ChevronRight, Edit2 } from 'lucide-react';

const STATUSES = ['', 'draft', 'live', 'scheduled', 'completed', 'expired', 'cancelled'];
const TYPES = ['', 'FCFS', 'LEADERBOARD', 'LUCKY_DRAW'];

export function QuestList() {
    const { env } = useEnv();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [type, setType] = useState('');

    const { data, isLoading } = useQuery({
        queryKey: ['admin', 'quests', { page, search, status, type }, env],
        queryFn: () => api.getQuests({ page, pageSize: 20, search, status, type, sort: 'createdAt', order: 'desc' }),
    });

    return (
        <div className="space-y-4">
            <h1 className="text-lg sm:text-xl font-semibold">Quest Management</h1>

            {/* Filters */}
            <div className="flex gap-2 sm:gap-3 flex-wrap">
                <div className="relative flex-1 min-w-0 sm:min-w-[200px] max-w-sm">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                    <input
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        placeholder="Search by title..."
                        className="w-full pl-9 pr-3 py-2 rounded text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    />
                </div>
                <select
                    value={status}
                    onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                    className="px-2 sm:px-3 py-2 rounded text-xs sm:text-sm min-w-[100px]"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                >
                    <option value="">All Statuses</option>
                    {STATUSES.filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select
                    value={type}
                    onChange={(e) => { setType(e.target.value); setPage(1); }}
                    className="px-2 sm:px-3 py-2 rounded text-xs sm:text-sm min-w-[100px]"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                >
                    <option value="">All Types</option>
                    {TYPES.filter(Boolean).map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>

            {/* Table */}
            <div className="rounded-lg overflow-x-auto" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <table className="w-full text-sm min-w-[800px]">
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                            <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>Title</th>
                            <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>Status</th>
                            <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>Type</th>
                            <th className="text-right px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>Reward</th>
                            <th className="text-center px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>Slots</th>
                            <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>Funding</th>
                            <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>Creator</th>
                            <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>Created</th>
                            <th className="text-right px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading && (
                            <tr><td colSpan={8} className="px-4 py-8 text-center" style={{ color: 'var(--text-muted)' }}>Loading...</td></tr>
                        )}
                        {data?.data?.map((q: any) => (
                            <tr key={q.id} className="hover:bg-[var(--bg-hover)] transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
                                <td className="px-4 py-2.5">
                                    <Link to="/quests/$questId" params={{ questId: q.id }} className="text-indigo-400 hover:text-indigo-300 font-medium">
                                        {q.title}
                                    </Link>
                                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{q.participationCount} participants</div>
                                </td>
                                <td className="px-4 py-2.5"><StatusBadge status={q.status} /></td>
                                <td className="px-4 py-2.5"><StatusBadge status={q.type} /></td>
                                <td className="px-4 py-2.5 text-right font-mono">{q.rewardAmount} {q.rewardType}</td>
                                <td className="px-4 py-2.5 text-center">{q.filledSlots}/{q.totalSlots}</td>
                                <td className="px-4 py-2.5"><StatusBadge status={q.fundingStatus} /></td>
                                <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-secondary)' }}>{q.creatorEmail || '—'}</td>
                                <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                    {new Date(q.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                    <Link
                                        to="/quests/$questId"
                                        params={{ questId: q.id }}
                                        search={{ edit: true }}
                                        className="inline-flex p-1.5 rounded hover:bg-[var(--bg-hover)] text-muted-foreground hover:text-indigo-400 transition-colors"
                                    >
                                        <Edit2 size={14} />
                                    </Link>
                                </td>
                            </tr>
                        ))}
                        {!isLoading && !data?.data?.length && (
                            <tr><td colSpan={8} className="px-4 py-8 text-center" style={{ color: 'var(--text-muted)' }}>No quests found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {data?.pagination && data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <span>Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} total)</span>
                    <div className="flex gap-2">
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage(page - 1)}
                            className="p-1.5 rounded disabled:opacity-30 hover:bg-[var(--bg-hover)]"
                        ><ChevronLeft size={16} /></button>
                        <button
                            disabled={page >= data.pagination.totalPages}
                            onClick={() => setPage(page + 1)}
                            className="p-1.5 rounded disabled:opacity-30 hover:bg-[var(--bg-hover)]"
                        ><ChevronRight size={16} /></button>
                    </div>
                </div>
            )}
        </div>
    );
}
