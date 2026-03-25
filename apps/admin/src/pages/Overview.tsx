import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useEnv } from '../context/EnvContext';
import { StatsCard } from '../components/shared/StatsCard';
import { StatusBadge } from '../components/shared/StatusBadge';
import { Link } from '@tanstack/react-router';
import { Users, ScrollText, Bot, Wallet, TrendingUp, Clock, ArrowRight, Database } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

function EmptyRow({ cols, message }: { cols: number; message: string }) {
    return (
        <TableRow>
            <TableCell colSpan={cols} className="px-6 py-10 text-center">
                <div className="text-2xl mb-1.5">—</div>
                <div className="text-sm text-muted-foreground">{message}</div>
            </TableCell>
        </TableRow>
    );
}

function SectionHeader({ title, link, to, params }: { title: string; link: string; to: any; params?: any }) {
    return (
        <div className="flex items-center justify-between mb-4">
            <h2
                className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
                style={{ letterSpacing: '0.09em' }}
            >
                {title}
            </h2>
            <Link
                to={to}
                params={params}
                className="flex items-center gap-1 text-xs font-medium transition-colors text-primary hover:text-primary/80"
            >
                {link}
                <ArrowRight size={12} />
            </Link>
        </div>
    );
}

export function Overview() {
    const { env } = useEnv();

    const { data: stats, isLoading } = useQuery({
        queryKey: ['analytics', 'overview', env],
        queryFn: api.analyticsOverview,
    });

    const { data: envStatus } = useQuery({
        queryKey: ['admin', 'env-status'],
        queryFn: api.envStatus,
        staleTime: 60_000,
    });

    const { data: recentQuests } = useQuery({
        queryKey: ['admin', 'quests', 'recent', env],
        queryFn: () => api.getQuests({ pageSize: 8, sort: 'createdAt', order: 'desc' }),
    });

    const { data: recentUsers } = useQuery({
        queryKey: ['admin', 'users', 'recent', env],
        queryFn: () => api.getUsers({ pageSize: 8, sort: 'createdAt', order: 'desc' }),
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-24">
                <div className="text-sm animate-pulse text-muted-foreground">Loading overview…</div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Page title */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Overview
                    </h1>
                    <p className="text-sm mt-0.5 text-muted-foreground">
                        Platform health at a glance
                    </p>
                </div>
                {envStatus && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
                        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                        <Database size={12} className="text-indigo-400" />
                        <span style={{ color: 'var(--text-muted)' }}>DB:</span>
                        <span className="font-medium">{envStatus.currentDefault}</span>
                        {envStatus.testnetDbConfigured && (
                            <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                testnet ready
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <StatsCard
                    label="Total Users"
                    value={stats?.users?.total ?? 0}
                    icon={<Users size={16} />}
                    sub={`+${stats?.users?.thisWeek ?? 0} this week`}
                    color="text-violet-400"
                    accentColor="#7c6df4"
                />
                <StatsCard
                    label="Quests"
                    value={stats?.quests?.total ?? 0}
                    icon={<ScrollText size={16} />}
                    color="text-emerald-400"
                    accentColor="#10b981"
                />
                <StatsCard
                    label="Agents"
                    value={stats?.agents?.total ?? 0}
                    icon={<Bot size={16} />}
                    sub={`${stats?.agents?.active ?? 0} active`}
                    color="text-sky-400"
                    accentColor="#38bdf8"
                />
                <StatsCard
                    label="Funded"
                    value={`$${(stats?.escrow?.totalFunded ?? 0).toLocaleString()}`}
                    icon={<Wallet size={16} />}
                    color="text-green-400"
                    accentColor="#22c55e"
                />
                <StatsCard
                    label="Completion"
                    value={`${stats?.quests?.avgCompletionRate ?? 0}%`}
                    icon={<TrendingUp size={16} />}
                    color="text-amber-400"
                    accentColor="#f59e0b"
                />
                <StatsCard
                    label="Participations"
                    value={stats?.participations?.total ?? 0}
                    icon={<Clock size={16} />}
                    sub={`${stats?.participations?.completed ?? 0} done`}
                    color="text-purple-400"
                    accentColor="#a855f7"
                />
            </div>

            {/* Recent Quests */}
            <div>
                <SectionHeader title="Recent Quests" link="View all" to="/quests" />
                <div className="rounded-xl border border-border bg-secondary/10 dark:bg-secondary/20 overflow-hidden shadow-sm">
                    <Table>
                        <TableHeader className="bg-muted/50 dark:bg-white/5">
                            <TableRow className="border-border hover:bg-transparent">
                                {['Title', 'Status', 'Type', 'Reward', 'Funding'].map((h, i) => (
                                    <TableHead
                                        key={h}
                                        className={`px-5 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground ${i > 2 ? 'text-right' : 'text-left'}`}
                                        style={{ letterSpacing: '0.07em' }}
                                    >
                                        {h}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {recentQuests?.data?.map((q: any) => (
                                <TableRow
                                    key={q.id}
                                    className="table-row border-border"
                                >
                                    <TableCell className="px-5 py-3">
                                        <Link
                                            to="/quests/$questId"
                                            params={{ questId: q.id }}
                                            className="font-semibold hover:underline text-primary dark:text-indigo-400"
                                        >
                                            {q.title}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="px-5 py-3"><StatusBadge status={q.status} /></TableCell>
                                    <TableCell className="px-5 py-3"><StatusBadge status={q.type} /></TableCell>
                                    <TableCell className="px-5 py-3 text-right text-secondary-foreground">
                                        {q.rewardAmount} {q.rewardType}
                                    </TableCell>
                                    <TableCell className="px-5 py-3 text-right"><StatusBadge status={q.fundingStatus} /></TableCell>
                                </TableRow>
                            ))}
                            {!recentQuests?.data?.length && <EmptyRow cols={5} message="No quests yet" />}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Recent Users */}
            <div>
                <SectionHeader title="Recent Users" link="View all" to="/users" />
                <div className="rounded-xl border border-border bg-secondary/10 dark:bg-secondary/20 overflow-hidden shadow-sm">
                    <Table>
                        <TableHeader className="bg-muted/50 dark:bg-white/5">
                            <TableRow className="border-border hover:bg-transparent">
                                {['Email', 'Role', 'Agents', 'Quests', 'Joined'].map((h, i) => (
                                    <TableHead
                                        key={h}
                                        className={`px-5 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground ${i > 1 ? 'text-right' : 'text-left'}`}
                                        style={{ letterSpacing: '0.07em' }}
                                    >
                                        {h}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {recentUsers?.data?.map((u: any) => (
                                <TableRow
                                    key={u.id}
                                    className="table-row border-border"
                                >
                                    <TableCell className="px-5 py-3">
                                        <Link
                                            to="/users/$userId"
                                            params={{ userId: u.id }}
                                            className="font-semibold hover:underline text-primary dark:text-indigo-400"
                                        >
                                            {u.email}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="px-5 py-3"><StatusBadge status={u.role} /></TableCell>
                                    <TableCell className="px-5 py-3 text-right text-secondary-foreground">{u.agentCount}</TableCell>
                                    <TableCell className="px-5 py-3 text-right text-secondary-foreground">{u.questCount}</TableCell>
                                    <TableCell className="px-5 py-3 text-right text-muted-foreground">
                                        {new Date(u.createdAt).toLocaleDateString()}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {!recentUsers?.data?.length && <EmptyRow cols={5} message="No users yet" />}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
