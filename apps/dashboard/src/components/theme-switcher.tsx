import { useTheme, THEMES } from '@/context/ThemeContext'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { SunLine, MoonLine } from '@mingcute/react'

export function ThemeSwitcher({ className }: { className?: string }) {
    const { colorMode, setColorMode } = useTheme()
    const isDark = colorMode === 'dark'

    return (
        <Button
            variant="outline"
            size="default"
            iconOnly
            onClick={() => setColorMode(isDark ? 'light' : 'dark')}
            className={cn('text-fg-1', className)}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            {isDark ? <SunLine size={16} /> : <MoonLine size={16} />}
        </Button>
    )
}

export { THEMES }
