import { createContext, useContext, useEffect, useState, useCallback } from 'react'

export const THEMES = [
    { id: 'terminal', label: 'Terminal', description: 'Monospace, flat, high-contrast' },
    // TODO: re-enable after polishing each theme
    // { id: 'glass', label: 'Glass', description: 'Frosted blur, translucent, rounded' },
    // { id: 'brutalist', label: 'Brutalist', description: 'Raw, bold borders, heavy shadows' },
    // { id: 'minimal', label: 'Minimal', description: 'Clean, airy, subtle' },
    // { id: 'bauhaus', label: 'Bauhaus', description: 'Geometric, primary colors, bold' },
] as const

export type ThemeId = (typeof THEMES)[number]['id']
export type ColorMode = 'light' | 'dark'

interface ThemeContextValue {
    theme: ThemeId
    colorMode: ColorMode
    setTheme: (theme: ThemeId) => void
    setColorMode: (mode: ColorMode) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY_THEME = 'cq-theme'
const STORAGE_KEY_MODE = 'cq-color-mode'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<ThemeId>(() => {
        const stored = localStorage.getItem(STORAGE_KEY_THEME)
        return (stored && THEMES.some(t => t.id === stored) ? stored : 'terminal') as ThemeId
    })

    const [colorMode, setColorModeState] = useState<ColorMode>(() => {
        const stored = localStorage.getItem(STORAGE_KEY_MODE)
        return (stored === 'light' || stored === 'dark' ? stored : 'light') as ColorMode
    })

    // Apply theme + mode to <html>
    useEffect(() => {
        const root = document.documentElement
        root.setAttribute('data-theme', theme)
        root.classList.toggle('dark', colorMode === 'dark')
    }, [theme, colorMode])

    const setTheme = useCallback((t: ThemeId) => {
        setThemeState(t)
        localStorage.setItem(STORAGE_KEY_THEME, t)
    }, [])

    const setColorMode = useCallback((m: ColorMode) => {
        setColorModeState(m)
        localStorage.setItem(STORAGE_KEY_MODE, m)
    }, [])

    return (
        <ThemeContext.Provider value={{ theme, colorMode, setTheme, setColorMode }}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    const ctx = useContext(ThemeContext)
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
    return ctx
}
