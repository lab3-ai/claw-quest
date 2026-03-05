import { createContext, useContext, useEffect, useState, useCallback } from 'react'

export const THEMES = [
    { id: 'terminal', label: 'Terminal', description: 'Monospace, flat, high-contrast' },
{ id: 'glass', label: 'Glass', description: 'Frosted blur, translucent, rounded' },
    { id: 'brutalist', label: 'Brutalist', description: 'Raw, bold borders, heavy shadows' },
    { id: 'minimal', label: 'Minimal', description: 'Clean, airy, subtle' },
    { id: 'bauhaus', label: 'Bauhaus', description: 'Geometric, primary colors, bold' },
] as const

export type ThemeId = (typeof THEMES)[number]['id']
export type ColorMode = 'light' | 'dark' | 'system'

interface ThemeContextValue {
    theme: ThemeId
    colorMode: ColorMode
    resolvedMode: 'light' | 'dark'
    setTheme: (theme: ThemeId) => void
    setColorMode: (mode: ColorMode) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY_THEME = 'cq-theme'
const STORAGE_KEY_MODE = 'cq-color-mode'

function getSystemPreference(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<ThemeId>(() => {
        const stored = localStorage.getItem(STORAGE_KEY_THEME)
        return (stored && THEMES.some(t => t.id === stored) ? stored : 'terminal') as ThemeId
    })

    const [colorMode, setColorModeState] = useState<ColorMode>(() => {
        const stored = localStorage.getItem(STORAGE_KEY_MODE)
        return (stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'light') as ColorMode
    })

    const [systemPref, setSystemPref] = useState<'light' | 'dark'>(getSystemPreference)

    const resolvedMode = colorMode === 'system' ? systemPref : colorMode

    // Listen for system preference changes
    useEffect(() => {
        const mql = window.matchMedia('(prefers-color-scheme: dark)')
        // Sync current state on mount
        setSystemPref(mql.matches ? 'dark' : 'light')
        const handler = (e: MediaQueryListEvent) => setSystemPref(e.matches ? 'dark' : 'light')
        mql.addEventListener('change', handler)
        return () => mql.removeEventListener('change', handler)
    }, [])

    // Apply theme + mode to <html>
    useEffect(() => {
        const root = document.documentElement
        root.setAttribute('data-theme', theme)
        // For system mode, read media query directly to avoid stale state
        const isDark = colorMode === 'dark' ||
            (colorMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
        root.classList.toggle('dark', isDark)
        console.log('[theme]', { theme, colorMode, isDark, mediaQuery: window.matchMedia('(prefers-color-scheme: dark)').matches })
    }, [theme, colorMode, resolvedMode])

    const setTheme = useCallback((t: ThemeId) => {
        setThemeState(t)
        localStorage.setItem(STORAGE_KEY_THEME, t)
    }, [])

    const setColorMode = useCallback((m: ColorMode) => {
        setColorModeState(m)
        localStorage.setItem(STORAGE_KEY_MODE, m)
        // Re-check system preference when switching to system mode
        if (m === 'system') {
            setSystemPref(getSystemPreference())
        }
    }, [])

    return (
        <ThemeContext.Provider value={{ theme, colorMode, resolvedMode, setTheme, setColorMode }}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    const ctx = useContext(ThemeContext)
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
    return ctx
}
