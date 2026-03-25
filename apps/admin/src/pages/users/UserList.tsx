import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { api } from '../../lib/api';
import { useEnv } from '../../context/EnvContext';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { Search, ChevronLeft, ChevronRight, Edit2, Key, User as UserIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export function UserList() {
    const { env } = useEnv();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [role, setRole] = useState('');

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['admin', 'users', { page, search, role }, env],
        queryFn: () => api.getUsers({ page, pageSize: 20, search, role, sort: 'createdAt', order: 'desc' }),
    });

    const [editingUser, setEditingUser] = useState<any>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    const handleEdit = (user: any) => {
        setEditingUser(user);
        setIsEditDialogOpen(true);
    };

    return (
        <div className="space-y-4">
            <h1 className="text-xl font-semibold">User Management</h1>

            <div className="flex gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                    <input
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        placeholder="Search by email..."
                        className="w-full pl-9 pr-3 py-2 rounded text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    />
                </div>
                <select
                    value={role}
                    onChange={(e) => { setRole(e.target.value); setPage(1); }}
                    className="px-3 py-2 rounded text-sm"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                >
                    <option value="">All Roles</option>
                    <option value="admin">admin</option>
                    <option value="user">user</option>
                </select>
            </div>

            <div className="rounded-lg overflow-hidden" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <table className="w-full text-sm">
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                            <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>Email</th>
                            <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>Username</th>
                            <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>Password</th>
                            <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>Role</th>
                            <th className="text-right px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>Agents</th>
                            <th className="text-right px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>Quests</th>
                            <th className="text-right px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>Wallets</th>
                            <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>Joined</th>
                            <th className="text-right px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading && (
                            <tr><td colSpan={6} className="px-4 py-8 text-center" style={{ color: 'var(--text-muted)' }}>Loading...</td></tr>
                        )}
                        {data?.data?.map((u: any) => (
                            <tr key={u.id} className="hover:bg-[var(--bg-hover)] transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
                                <td className="px-4 py-2.5">
                                    <Link to="/users/$userId" params={{ userId: u.id }} className="text-indigo-400 hover:text-indigo-300">{u.email}</Link>
                                </td>
                                <td className="px-4 py-2.5" style={{ color: 'var(--text-secondary)' }}>{u.username || '-'}</td>
                                <td className="px-4 py-2.5 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>••••••••</td>
                                <td className="px-4 py-2.5"><StatusBadge status={u.role} /></td>
                                <td className="px-4 py-2.5 text-right">{u.agentCount}</td>
                                <td className="px-4 py-2.5 text-right">{u.questCount}</td>
                                <td className="px-4 py-2.5 text-right">{u.walletCount}</td>
                                <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                    {new Date(u.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                    <button
                                        onClick={() => handleEdit(u)}
                                        className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-muted-foreground hover:text-indigo-400 transition-colors"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {!isLoading && !data?.data?.length && (
                            <tr><td colSpan={6} className="px-4 py-8 text-center" style={{ color: 'var(--text-muted)' }}>No users found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {data?.pagination && data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <span>Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} total)</span>
                    <div className="flex gap-2">
                        <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="p-1.5 rounded disabled:opacity-30 hover:bg-[var(--bg-hover)]"><ChevronLeft size={16} /></button>
                        <button disabled={page >= data.pagination.totalPages} onClick={() => setPage(page + 1)} className="p-1.5 rounded disabled:opacity-30 hover:bg-[var(--bg-hover)]"><ChevronRight size={16} /></button>
                    </div>
                </div>
            )}

            <EditUserDialog
                user={editingUser}
                open={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
                onSuccess={() => {
                    refetch();
                    setIsEditDialogOpen(false);
                }}
            />
        </div>
    );
}

function EditUserDialog({ user, open, onOpenChange, onSuccess }: { user: any; open: boolean; onOpenChange: (open: boolean) => void; onSuccess: () => void }) {
    const [username, setUsername] = useState('');
    const [role, setRole] = useState<'user' | 'admin'>('user');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    useState(() => {
        if (user) {
            setUsername(user.username || '');
            setRole(user.role || 'user');
            setPassword('');
        }
    });

    // We need to use useEffect or just reset when user changes because useState initial value only runs once
    useEffect(() => {
        if (user) {
            setUsername(user.username || '');
            setRole(user.role || 'user');
            setPassword('');
        }
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);

        try {
            await api.updateUser(user.id, {
                username,
                role,
                ...(password ? { password } : {}),
            });
            toast.success('User updated successfully');
            onSuccess();
        } catch (err: any) {
            toast.error(err.message || 'Failed to update user');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-primary)]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserIcon className="text-indigo-400" size={20} />
                        Edit User
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-xs font-medium uppercase text-muted-foreground">Email</Label>
                        <Input
                            id="email"
                            value={user?.email || ''}
                            readOnly
                            disabled
                            className="bg-black/20 border-[var(--border)] cursor-not-allowed opacity-70"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="username" className="text-xs font-medium uppercase text-muted-foreground">Username</Label>
                        <Input
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter username"
                            className="bg-black/20 border-[var(--border)] focus:ring-indigo-500"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="role" className="text-xs font-medium uppercase text-muted-foreground">Role</Label>
                        <select
                            id="role"
                            value={role}
                            onChange={(e) => setRole(e.target.value as 'user' | 'admin')}
                            className="w-full px-3 py-2 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-black/20 border border-[var(--border)]"
                        >
                            <option value="user" className="bg-[#1a1a1a]">User</option>
                            <option value="admin" className="bg-[#1a1a1a]">Admin</option>
                        </select>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-[var(--border)]">
                        <Label htmlFor="password" className="text-xs font-semibold uppercase text-indigo-400 flex items-center gap-2">
                            <Key size={12} />
                            Reset Password
                        </Label>
                        <Input
                            id="password"
                            type="text"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter new password to reset"
                            className="bg-black/20 border-[var(--border)] focus:ring-indigo-500"
                        />
                        <p className="text-[10px] text-muted-foreground italic">Leave blank to keep current password.</p>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-[var(--border)] hover:bg-black/20">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="btn-gradient">
                            {loading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
