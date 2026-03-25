import { useAuth } from '@/context/AuthContext';
import { LogOut, User, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { EnvSwitcher } from './EnvSwitcher';

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Prevent hydration mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <div className="w-9 h-9" />;
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-9 h-9 rounded-lg hover:bg-[var(--bg-hover)] text-muted-foreground transition-colors"
        >
            {theme === 'dark' ? (
                <Sun size={18} className="transition-all" />
            ) : (
                <Moon size={18} className="transition-all" />
            )}
            <span className="sr-only">Toggle theme</span>
        </Button>
    );
}

export function TopBar() {
    const { email, signOut } = useAuth();

    return (
        <header
            className="h-16 flex items-center justify-between px-3 sm:px-6 md:px-8 sticky top-0 z-40 backdrop-blur-md bg-background/70 border-b border-border"
        >
            <div className="flex items-center gap-4">
                <div
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-secondary/50"
                >
                    <User size={14} className="text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">{email}</span>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <EnvSwitcher />
                <ThemeToggle />
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={signOut}
                    className="w-9 h-9 rounded-lg hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
                >
                    <LogOut size={18} />
                </Button>
            </div>
        </header>
    );
}
