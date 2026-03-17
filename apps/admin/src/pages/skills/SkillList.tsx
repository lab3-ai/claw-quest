import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Search, Plus, CheckCircle2, Circle, ChevronLeft, ChevronRight } from 'lucide-react';
import { api, type SkillSummary } from '@/lib/api';
import { useEnv } from '@/context/EnvContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const PAGE_SIZE = 50;

export function SkillList() {
    const { env } = useEnv();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [hasVerifyConfig, setHasVerifyConfig] = useState<'all' | 'yes' | 'no'>('all');
    const [offset, setOffset] = useState(0);

    const params: Record<string, any> = {
        limit: PAGE_SIZE,
        offset,
    };
    if (search) params.search = search;
    if (hasVerifyConfig !== 'all') params.hasVerifyConfig = hasVerifyConfig === 'yes' ? 'true' : 'false';

    const { data, isLoading } = useQuery({
        queryKey: ['admin', 'skills', params, env],
        queryFn: () => api.getSkills(params),
    });

    const skills: SkillSummary[] = data?.items ?? [];
    const total = data?.total ?? 0;
    const totalPages = Math.ceil(total / PAGE_SIZE);
    const page = Math.floor(offset / PAGE_SIZE) + 1;

    function handleSearch(val: string) {
        setSearch(val);
        setOffset(0);
    }

    function handleFilter(val: 'all' | 'yes' | 'no') {
        setHasVerifyConfig(val);
        setOffset(0);
    }

    return (
        <div className="p-6 flex flex-col gap-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Skills</h1>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        Manage clawhub skills and verification configs
                    </p>
                </div>
                <Button onClick={() => navigate({ to: '/skills/new' })} className="gap-2">
                    <Plus size={15} />
                    New Skill
                </Button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-48">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                    <Input
                        className="pl-8 text-sm"
                        placeholder="Search slug or name…"
                        value={search}
                        onChange={e => handleSearch(e.target.value)}
                    />
                </div>
                <div className="flex items-center rounded-lg border overflow-hidden text-sm" style={{ borderColor: 'var(--border)' }}>
                    {(['all', 'yes', 'no'] as const).map(v => (
                        <button
                            key={v}
                            onClick={() => handleFilter(v)}
                            className={`px-3 py-1.5 transition-colors ${hasVerifyConfig === v ? 'bg-primary text-primary-foreground' : ''}`}
                            style={hasVerifyConfig !== v ? { color: 'var(--text-secondary)' } : {}}
                        >
                            {v === 'all' ? 'All' : v === 'yes' ? 'Has Config' : 'No Config'}
                        </button>
                    ))}
                </div>
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {total} skill{total !== 1 ? 's' : ''}
                </span>
            </div>

            {/* Table */}
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
                <table className="w-full text-sm">
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-tertiary)' }}>
                            <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Slug</th>
                            <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Display Name</th>
                            <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--text-muted)' }}>Downloads</th>
                            <th className="px-4 py-3 text-center font-medium" style={{ color: 'var(--text-muted)' }}>Web3</th>
                            <th className="px-4 py-3 text-center font-medium" style={{ color: 'var(--text-muted)' }}>Verify Config</th>
                            <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--text-muted)' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                                    Loading…
                                </td>
                            </tr>
                        ) : skills.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                                    No skills found
                                </td>
                            </tr>
                        ) : (
                            skills.map(skill => (
                                <tr
                                    key={skill.id}
                                    style={{ borderBottom: '1px solid var(--border)' }}
                                    className="transition-colors hover:bg-[var(--bg-hover)]"
                                >
                                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                                        {skill.slug}
                                    </td>
                                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>
                                        {skill.display_name}
                                        {skill.featured && (
                                            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide"
                                                style={{ background: 'var(--badge-yellow-bg)', color: 'var(--badge-yellow-text)' }}>
                                                Featured
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                                        {skill.downloads.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {skill.is_web3
                                            ? <CheckCircle2 size={15} className="mx-auto text-emerald-500" />
                                            : <Circle size={15} className="mx-auto" style={{ color: 'var(--text-muted)' }} />}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {skill.verification_config
                                            ? <CheckCircle2 size={15} className="mx-auto text-emerald-500" />
                                            : <Circle size={15} className="mx-auto" style={{ color: 'var(--text-muted)' }} />}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => navigate({ to: '/skills/$slug', params: { slug: skill.slug } })}
                                        >
                                            Edit Config
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm" style={{ color: 'var(--text-muted)' }}>
                    <span>Page {page} of {totalPages}</span>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={offset === 0}
                            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                        >
                            <ChevronLeft size={14} />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={offset + PAGE_SIZE >= total}
                            onClick={() => setOffset(offset + PAGE_SIZE)}
                        >
                            <ChevronRight size={14} />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
