import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { api } from '../../lib/api';
import { useEnv } from '../../context/EnvContext';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';

export function UserDetail() {
    const { userId } = useParams({ strict: false }) as { userId: string };
    const qc = useQueryClient();
    const { env } = useEnv();

    const [agentsPage, setAgentsPage] = useState(1);
    const [questsPage, setQuestsPage] = useState(1);
    const pageSize = 10;

    const { data: user, isLoading } = useQuery({
        queryKey: ['admin', 'user', userId, env],
        queryFn: () => api.getUser(userId),
    });

    const { data: agentsData, isLoading: isLoadingAgents } = useQuery({
        queryKey: ['admin', 'user', userId, 'agents', agentsPage, env],
        queryFn: () => api.getUserAgents(userId, { page: agentsPage, pageSize }),
    });

    const { data: questsData, isLoading: isLoadingQuests } = useQuery({
        queryKey: ['admin', 'user', userId, 'quests', questsPage, env],
        queryFn: () => api.getUserQuests(userId, { page: questsPage, pageSize }),
    });

    const roleMut = useMutation({
        mutationFn: (role: string) => api.updateUser(userId, { role }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'user', userId] }),
    });

    if (isLoading) return <div className="animate-pulse" style={{ color: 'var(--text-muted)' }}>Loading user...</div>;
    if (!user) return <div style={{ color: 'var(--text-muted)' }}>User not found</div>;

    return (
        <div className="space-y-6 max-w-4xl">
            <Link to="/users" className="flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300">
                <ArrowLeft size={14} /> Back to Users
            </Link>

            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-xl font-semibold">{user.email}</h1>
                    <div className="flex gap-2 mt-2">
                        <StatusBadge status={user.role} />
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            Joined {new Date(user.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                </div>
                <select
                    value={user.role}
                    onChange={(e) => roleMut.mutate(e.target.value)}
                    disabled={roleMut.isPending}
                    className="px-3 py-1.5 rounded text-sm"
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                >
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                </select>
            </div>

            {roleMut.error && (
                <div className="p-3 rounded text-sm bg-red-600/15 text-red-300 border border-red-600/30">
                    {roleMut.error.message}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg p-4 text-sm" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                    <h3 className="font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Info</h3>
                    <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>ID</span><span className="font-mono">{user.id}</span></div>
                        <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Supabase ID</span><span className="font-mono truncate max-w-[200px]">{user.supabaseId || '—'}</span></div>
                    </div>
                </div>

                <div className="rounded-lg p-4 text-sm" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                    <h3 className="font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Wallets ({user.wallets?.length ?? 0})</h3>
                    {user.wallets?.length ? user.wallets.map((w: any) => (
                        <div key={w.id} className="text-xs font-mono flex justify-between py-1" style={{ borderBottom: '1px solid var(--border)' }}>
                            <span className="truncate max-w-[200px]">{w.address}</span>
                            {w.isPrimary && <StatusBadge status="confirmed" />}
                        </div>
                    )) : <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No wallets linked</p>}
                </div>
            </div>

            {/* Agents */}
            <div>
                <h2 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
                    Agents {agentsData?.pagination ? `(${agentsData.pagination.total})` : ''}
                </h2>
                <div className="rounded-lg overflow-hidden" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                    <table className="w-full text-sm">
                        <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
                            <th className="text-left px-4 py-2.5 font-medium" style={{ color: 'var(--text-muted)' }}>Name</th>
                            <th className="text-left px-4 py-2.5 font-medium" style={{ color: 'var(--text-muted)' }}>Status</th>
                            <th className="text-right px-4 py-2.5 font-medium" style={{ color: 'var(--text-muted)' }}>Skills</th>
                            <th className="text-right px-4 py-2.5 font-medium" style={{ color: 'var(--text-muted)' }}>Participations</th>
                        </tr></thead>
                        <tbody>
                            {isLoadingAgents ? (
                                <tr><td colSpan={4} className="px-4 py-8 text-center animate-pulse">Loading agents...</td></tr>
                            ) : agentsData?.data?.length ? (
                                agentsData.data.map((a: any) => (
                                    <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td className="px-4 py-2.5">{a.agentname}</td>
                                        <td className="px-4 py-2.5"><StatusBadge status={a.status} /></td>
                                        <td className="px-4 py-2.5 text-right">{a.skillCount}</td>
                                        <td className="px-4 py-2.5 text-right">{a.participationCount}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={4} className="px-4 py-8 text-center" style={{ color: 'var(--text-muted)' }}>No agents found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {agentsData?.pagination && agentsData.pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        <span>Page {agentsData.pagination.page} / {agentsData.pagination.totalPages}</span>
                        <div className="flex gap-1">
                            <button
                                disabled={agentsPage <= 1}
                                onClick={() => setAgentsPage(p => p - 1)}
                                className="p-1 rounded disabled:opacity-30 hover:bg-[var(--bg-hover)]"
                            ><ChevronLeft size={14} /></button>
                            <button
                                disabled={agentsPage >= agentsData.pagination.totalPages}
                                onClick={() => setAgentsPage(p => p + 1)}
                                className="p-1 rounded disabled:opacity-30 hover:bg-[var(--bg-hover)]"
                            ><ChevronRight size={14} /></button>
                        </div>
                    </div>
                )}
            </div>

            {/* Quests Created */}
            <div>
                <h2 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
                    Quests Created {questsData?.pagination ? `(${questsData.pagination.total})` : ''}
                </h2>
                <div className="rounded-lg overflow-hidden" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                    <table className="w-full text-sm">
                        <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
                            <th className="text-left px-4 py-2.5 font-medium" style={{ color: 'var(--text-muted)' }}>Title</th>
                            <th className="text-left px-4 py-2.5 font-medium" style={{ color: 'var(--text-muted)' }}>Status</th>
                            <th className="text-right px-4 py-2.5 font-medium" style={{ color: 'var(--text-muted)' }}>Reward</th>
                        </tr></thead>
                        <tbody>
                            {isLoadingQuests ? (
                                <tr><td colSpan={3} className="px-4 py-8 text-center animate-pulse">Loading quests...</td></tr>
                            ) : questsData?.data?.length ? (
                                questsData.data.map((q: any) => (
                                    <tr key={q.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td className="px-4 py-2.5">
                                            <Link to="/quests/$questId" params={{ questId: q.id }} className="text-indigo-400 hover:text-indigo-300">{q.title}</Link>
                                        </td>
                                        <td className="px-4 py-2.5"><StatusBadge status={q.status} /></td>
                                        <td className="px-4 py-2.5 text-right font-mono text-xs">{q.rewardAmount} {q.rewardType}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={3} className="px-4 py-8 text-center" style={{ color: 'var(--text-muted)' }}>No quests found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {questsData?.pagination && questsData.pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        <span>Page {questsData.pagination.page} / {questsData.pagination.totalPages}</span>
                        <div className="flex gap-1">
                            <button
                                disabled={questsPage <= 1}
                                onClick={() => setQuestsPage(p => p - 1)}
                                className="p-1 rounded disabled:opacity-30 hover:bg-[var(--bg-hover)]"
                            ><ChevronLeft size={14} /></button>
                            <button
                                disabled={questsPage >= questsData.pagination.totalPages}
                                onClick={() => setQuestsPage(p => p + 1)}
                                className="p-1 rounded disabled:opacity-30 hover:bg-[var(--bg-hover)]"
                            ><ChevronRight size={14} /></button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
