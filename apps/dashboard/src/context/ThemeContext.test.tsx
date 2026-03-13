import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeProvider, useTheme, THEMES } from './ThemeContext'

// Test component that uses the hook
function TestComponent() {
    const { theme, colorMode, setTheme, setColorMode } = useTheme()
    return (
        <div>
            <div data-testid="theme">{theme}</div>
            <div data-testid="color-mode">{colorMode}</div>
            <button onClick={() => setTheme('glass')}>Set Glass</button>
            <button onClick={() => setColorMode('dark')}>Set Dark</button>
        </div>
    )
}

describe('ThemeContext', () => {
    beforeEach(() => {
        localStorage.clear()
        document.documentElement.removeAttribute('data-theme')
        document.documentElement.classList.remove('dark')
    })

    it('should throw error when useTheme is used outside ThemeProvider', () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
        expect(() => render(<TestComponent />)).toThrow(
            'useTheme must be used within ThemeProvider'
        )
        consoleError.mockRestore()
    })

    it('should provide default theme and color mode', () => {
        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        )

        expect(screen.getByTestId('theme')).toHaveTextContent('terminal')
        expect(screen.getByTestId('color-mode')).toHaveTextContent('light')
    })

    it('should load theme from localStorage', () => {
        localStorage.setItem('cq-theme', 'glass')
        localStorage.setItem('cq-color-mode', 'dark')

        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        )

        expect(screen.getByTestId('theme')).toHaveTextContent('glass')
        expect(screen.getByTestId('color-mode')).toHaveTextContent('dark')
    })

    it('should fallback to default when localStorage has invalid theme', () => {
        localStorage.setItem('cq-theme', 'invalid-theme')
        localStorage.setItem('cq-color-mode', 'invalid-mode')

        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        )

        expect(screen.getByTestId('theme')).toHaveTextContent('terminal')
        expect(screen.getByTestId('color-mode')).toHaveTextContent('light')
    })

    it('should update theme and persist to localStorage', () => {
        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        )

        const setGlassButton = screen.getByText('Set Glass')
        fireEvent.click(setGlassButton)

        expect(screen.getByTestId('theme')).toHaveTextContent('glass')
        expect(localStorage.getItem('cq-theme')).toBe('glass')
    })

    it('should update color mode and persist to localStorage', () => {
        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        )

        const setDarkButton = screen.getByText('Set Dark')
        fireEvent.click(setDarkButton)

        expect(screen.getByTestId('color-mode')).toHaveTextContent('dark')
        expect(localStorage.getItem('cq-color-mode')).toBe('dark')
    })

    it('should apply theme attribute to document root', () => {
        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        )

        expect(document.documentElement.getAttribute('data-theme')).toBe('terminal')
    })

    it('should apply dark class to document root when dark mode', () => {
        localStorage.setItem('cq-color-mode', 'dark')

        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        )

        expect(document.documentElement.classList.contains('dark')).toBe(true)
    })

    it('should remove dark class when light mode', () => {
        localStorage.setItem('cq-color-mode', 'light')

        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        )

        expect(document.documentElement.classList.contains('dark')).toBe(false)
    })

    it('should export all theme options', () => {
        expect(THEMES).toHaveLength(5)
        expect(THEMES.map(t => t.id)).toEqual([
            'terminal',
            'glass',
            'brutalist',
            'minimal',
            'bauhaus',
        ])
    })
})
