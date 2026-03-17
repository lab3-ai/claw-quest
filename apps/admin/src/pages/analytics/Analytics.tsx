import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useEnv } from '../../context/EnvContext';
import { StatsCard } from '../../components/shared/StatsCard';
import { Users, ScrollText, Bot, Clock } from 'lucide-react';
import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

type Metric = 'users' | 'quests' | 'participations';
type Period = 'day' | 'week' | 'month';

const METRICS: { value: Metric; label: string }[] = [
    { value: 'users', label: 'Users' },
    { value: 'quests', label: 'Quests' },
    { value: 'participations', label: 'Participations' },
];

const PERIODS: { value: Period; label: string }[] = [
    { value: 'day', label: 'Daily' },
    { value: 'week', label: 'Weekly' },
    { value: 'month', label: 'Monthly' },
];

export function Analytics() {
    const { env } = useEnv();
    const [metric, setMetric] = useState<Metric>('users');
    const [period, setPeriod] = useState<Period>('day');

    const { data: overview } = useQuery({
        queryKey: ['analytics', 'overview', env],
        queryFn: api.analyticsOverview,
    });

    const { data: timeseries, isLoading: tsLoading } = useQuery({
        queryKey: ['analytics', 'timeseries', metric, period, env],
        queryFn: () => api.timeseries({ metric, period }),
    });

    return (
        <div className="space-y-6">
            <h1 className="text-xl font-semibold">Analytics</h1>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatsCard label="Total Users" value={overview?.users?.total ?? 0} icon={<Users size={18} />} />
                <StatsCard label="Total Quests" value={overview?.quests?.total ?? 0} icon={<ScrollText size={18} />} color="text-emerald-400" />
                <StatsCard label="Total Agents" value={overview?.agents?.total ?? 0} icon={<Bot size={18} />} color="text-cyan-400" />
                <StatsCard label="Participations" value={overview?.participations?.total ?? 0} icon={<Clock size={18} />} color="text-purple-400" />
            </div>

            {/* Quest Status Breakdown */}
            {overview?.quests?.byStatus && (
                <div>
                    <h2 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Quests by Status</h2>
                    <div className="rounded-lg p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={Object.entries(overview.quests.byStatus).map(([name, value]) => ({ name, count: value }))}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                                <Tooltip
                                    contentStyle={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}
                                    labelStyle={{ color: 'var(--text-primary)' }}
                                />
                                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Time-series Chart */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Growth Over Time</h2>
                    <div className="flex gap-2">
                        <div className="flex rounded overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                            {METRICS.map(m => (
                                <button
                                    key={m.value}
                                    onClick={() => setMetric(m.value)}
                                    className="px-3 py-1 text-xs transition-colors"
                                    style={{
                                        background: metric === m.value ? 'var(--accent)' : 'var(--bg-tertiary)',
                                        color: metric === m.value ? '#fff' : 'var(--text-secondary)',
                                    }}
                                >
                                    {m.label}
                                </button>
                            ))}
                        </div>
                        <div className="flex rounded overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                            {PERIODS.map(p => (
                                <button
                                    key={p.value}
                                    onClick={() => setPeriod(p.value)}
                                    className="px-3 py-1 text-xs transition-colors"
                                    style={{
                                        background: period === p.value ? 'var(--accent)' : 'var(--bg-tertiary)',
                                        color: period === p.value ? '#fff' : 'var(--text-secondary)',
                                    }}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="rounded-lg p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                    {tsLoading ? (
                        <div className="h-[300px] flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>Loading chart...</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={timeseries?.data ?? []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                                    tickFormatter={(v: string) => {
                                        const d = new Date(v);
                                        return period === 'month'
                                            ? d.toLocaleDateString('en', { month: 'short' })
                                            : d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
                                    }}
                                />
                                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                                <Tooltip
                                    contentStyle={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}
                                    labelStyle={{ color: 'var(--text-primary)' }}
                                    labelFormatter={(v) => new Date(String(v)).toLocaleDateString()}
                                />
                                <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Quest Type Breakdown */}
            {overview?.quests?.byType && (
                <div>
                    <h2 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Quests by Type</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {Object.entries(overview.quests.byType).map(([type, count]) => (
                            <div
                                key={type}
                                className="rounded-lg p-3 text-center"
                                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                            >
                                <div className="text-lg font-semibold">{count as number}</div>
                                <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{type}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
