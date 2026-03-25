import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PublicLayout } from './_public'

// Mock AuthContext
const mockAuthContext = {
    isAuthenticated: false,
    isLoading: false,
    logout: vi.fn(),
    user: null,
    session: null,
}

vi.mock('@/context/AuthContext', () => ({
    useAuth: () => mockAuthContext,
}))

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
    Outlet: () => <div data-testid="outlet">Public Content</div>,
    Link: ({ children, to, className, onClick }: any) => (
        <a href={to} className={className} onClick={onClick}>
            {children}
        </a>
    ),
}))

// Mock other dependencies
vi.mock('@/components/avatarUtils', () => ({
    getDiceBearUrl: (name: string) => `https://avatar.example.com/${name}`,
}))

vi.mock('@/components/brand-logo', () => ({
    BrandLogo: () => <div>Logo</div>,
}))

vi.mock('@/components/theme-switcher', () => ({
    ThemeSwitcher: () => <div data-testid="theme-switcher">Theme Switcher</div>,
}))

vi.mock('@/lib/telegram-oidc', () => ({
    TELEGRAM_BOT_USERNAME: 'testbot',
}))

describe('PublicLayout (No Auth Guard)', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should render public layout without authentication', () => {
        mockAuthContext.isAuthenticated = false

        render(<PublicLayout />)

        expect(screen.getByTestId('outlet')).toBeInTheDocument()
        expect(screen.getByText('Public Content')).toBeInTheDocument()
    })

    it('should show login link when not authenticated', () => {
        mockAuthContext.isAuthenticated = false

        render(<PublicLayout />)

        const loginLinks = screen.getAllByText('Log in')
        expect(loginLinks.length).toBeGreaterThan(0)
    })

    it('should show user menu when authenticated', () => {
        mockAuthContext.isAuthenticated = true
        mockAuthContext.user = {
            id: '123',
            email: 'test@example.com',
            user_metadata: { full_name: 'Test User' },
        } as any

        render(<PublicLayout />)

        expect(screen.getByText('Test User')).toBeInTheDocument()
        expect(screen.queryByText('Log in')).not.toBeInTheDocument()
    })

    it('should display navigation items', () => {
        render(<PublicLayout />)

        expect(screen.getAllByText('Quests').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Web3 Skills').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Bounties').length).toBeGreaterThan(0)
    })

    it('should show Create Quest button for both authenticated and unauthenticated users', () => {
        mockAuthContext.isAuthenticated = false

        render(<PublicLayout />)

        expect(screen.getAllByText('Create Quest')).toHaveLength(1)
    })

    it('should show Dashboard link when authenticated', () => {
        mockAuthContext.isAuthenticated = true
        mockAuthContext.user = {
            id: '123',
            email: 'test@example.com',
        } as any

        render(<PublicLayout />)

        expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0)
    })

    it('should not show Dashboard link when not authenticated', () => {
        mockAuthContext.isAuthenticated = false

        render(<PublicLayout />)

        expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
    })

    it('should render theme switcher', () => {
        render(<PublicLayout />)

        const themeSwitchers = screen.queryAllByTestId('theme-switcher')
        const themeButtons = screen.queryAllByLabelText('Theme')
        expect(themeSwitchers.length + themeButtons.length).toBeGreaterThan(0)
    })

    it('should display footer links', () => {
        render(<PublicLayout />)

        expect(screen.getByText('ClawQuest v0.1 beta')).toBeInTheDocument()
        expect(screen.getByText('Privacy')).toBeInTheDocument()
        expect(screen.getByText('Terms')).toBeInTheDocument()
        expect(screen.getByText('API Docs')).toBeInTheDocument()
        expect(screen.getByText('Telegram Bot')).toBeInTheDocument()
    })

    it('should render outlet for nested routes', () => {
        render(<PublicLayout />)

        expect(screen.getByTestId('outlet')).toBeInTheDocument()
    })
})
