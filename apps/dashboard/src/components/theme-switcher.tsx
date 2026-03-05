import { useTheme, THEMES, type ColorMode } from '@/context/ThemeContext'
import { cn } from '@/lib/utils'

const COLOR_MODES: { id: ColorMode; label: string }[] = [
    { id: 'light', label: 'Light' },
    { id: 'dark', label: 'Dark' },
    { id: 'system', label: 'System' },
]

export function ThemeSwitcher({ className }: { className?: string }) {
    const { theme, colorMode, setTheme, setColorMode } = useTheme()

    return (
        <div className={cn('flex flex-col gap-4', className)}>
            {/* Color mode toggle */}
            <div className="flex items-center gap-1 rounded-md border border-border bg-bg-subtle p-1">
                {COLOR_MODES.map(m => (
                    <button
                        key={m.id}
                        onClick={() => setColorMode(m.id)}
                        className={cn(
                            'flex-1 px-3 py-1.5 text-xs font-medium transition-all',
                            'rounded-sm',
                            colorMode === m.id
                                ? 'bg-primary text-primary-foreground'
                                : 'text-fg-muted hover:text-fg'
                        )}
                    >
                        {m.label}
                    </button>
                ))}
            </div>

            {/* Theme grid */}
            <div className="grid grid-cols-2 gap-2">
                {THEMES.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTheme(t.id)}
                        className={cn(
                            'flex flex-col items-start gap-1 rounded-md border p-3 text-left transition-all',
                            theme === t.id
                                ? 'border-primary bg-accent-light'
                                : 'border-border hover:border-border-heavy'
                        )}
                    >
                        <span className="text-sm font-medium text-fg">{t.label}</span>
                        <span className="text-xs text-fg-muted">{t.description}</span>
                    </button>
                ))}
            </div>
        </div>
    )
}
