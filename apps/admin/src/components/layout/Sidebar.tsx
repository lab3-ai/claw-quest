import { Link, useMatchRoute } from '@tanstack/react-router';
import { LayoutDashboard, ScrollText, Users, Wallet, BarChart3, Zap, KeyRound, Brain, Package } from 'lucide-react';
import { Separator } from "@/components/ui/separator";
import { useEnv } from '@/context/EnvContext';

const NAV = [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    { to: '/quests', label: 'Quests', icon: ScrollText },
    { to: '/users', label: 'Users', icon: Users },
    { to: '/escrow', label: 'Escrow', icon: Wallet },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/llm-keys', label: 'LLM Keys', icon: KeyRound },
    { to: '/llm-models', label: 'LLM Models', icon: Brain },
    { to: '/skills', label: 'Skills', icon: Package },
] as const;

export function Sidebar() {
    const matchRoute = useMatchRoute();
    const { env } = useEnv();

    return (
        <aside
            className="hidden sm:flex w-56 h-screen flex-col shrink-0 fixed left-0 top-0 border-r border-sidebar-border"
            style={{
                background: 'var(--sidebar-bg-gradient, var(--sidebar))',
            }}
        >
            {/* Logo */}
            <div className="h-16 px-4 flex items-center gap-3">
                <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                        background: 'linear-gradient(135deg, #7c6df4 0%, #6366f1 100%)',
                        boxShadow: '0 0 12px rgba(124,109,244,0.4)',
                    }}
                >
                    <Zap size={16} className="text-white" />
                </div>
                <div>
                    <div className="text-sm font-semibold text-sidebar-foreground" style={{ letterSpacing: '-0.01em' }}>
                        ClawQuest
                    </div>
                    <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground opacity-70">
                        Admin Panel
                    </div>
                </div>
            </div>
            <Separator className="bg-sidebar-border opacity-50" />

            {/* Navigation */}
            <nav className="flex-1 p-3 flex flex-col gap-0.5 overflow-y-auto">
                <div className="text-[10px] font-bold uppercase tracking-widest mb-3 px-3 text-muted-foreground opacity-60">
                    MENU
                </div>
                {NAV.map(({ to, label, icon: Icon }) => {
                    const active = to === '/'
                        ? matchRoute({ to: '/', fuzzy: false })
                        : matchRoute({ to, fuzzy: true });
                    return (
                        <Link
                            key={to}
                            to={to}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${active ? 'sidebar-active shadow-sm' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                                }`}
                        >
                            <Icon size={17} strokeWidth={active ? 2.2 : 1.8} />
                            <span className="font-medium">{label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div
                className="p-4 flex items-center gap-2 border-t border-sidebar-border"
            >
                <div
                    className={`w-1.5 h-1.5 rounded-full ${
                        env === 'testnet'
                            ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                            : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                    }`}
                />
                <span className="text-[10px] font-medium text-muted-foreground">v0.8.0 · {env}</span>
            </div>
        </aside>
    );
}
