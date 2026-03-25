import { useEnv, type AdminEnv } from '@/context/EnvContext';

const ENV_OPTIONS: { value: AdminEnv; label: string; dotClass: string }[] = [
    { value: 'mainnet', label: 'Mainnet', dotClass: 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]' },
    { value: 'testnet', label: 'Testnet', dotClass: 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]' },
];

export function EnvSwitcher() {
    const { env, setEnv, testnetAvailable, isLoading } = useEnv();

    if (isLoading) {
        return <div className="w-[160px] h-8 rounded-lg bg-secondary/50 animate-pulse" />;
    }

    return (
        <div
            className="flex items-center rounded-lg border border-border overflow-hidden"
            style={{ background: 'var(--bg-secondary, hsl(var(--secondary)))' }}
        >
            {ENV_OPTIONS.map(({ value, label, dotClass }) => {
                const isActive = env === value;
                const isDisabled = value === 'testnet' && !testnetAvailable;

                return (
                    <button
                        key={value}
                        onClick={() => !isDisabled && setEnv(value)}
                        disabled={isDisabled}
                        className={`
                            flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all duration-150
                            ${isActive
                                ? 'bg-primary/10 text-primary dark:text-indigo-300'
                                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                            }
                            ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                        `}
                        title={isDisabled ? 'Testnet DB not configured' : `Switch to ${label}`}
                    >
                        <div className={`w-1.5 h-1.5 rounded-full ${isActive ? dotClass : 'bg-muted-foreground/40'}`} />
                        {label}
                    </button>
                );
            })}
        </div>
    );
}
