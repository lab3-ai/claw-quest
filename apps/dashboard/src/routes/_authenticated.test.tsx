import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AuthenticatedLayout } from './_authenticated'

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
const mockNavigate = vi.fn()
vi.mock('@tanstack/react-router', () => ({
    Outlet: () => <div data-testid="outlet">Outlet Content</div>,
    Navigate: ({ to }: { to: string }) => {
        mockNavigate(to)
        return <div data-testid="navigate">Navigating to {to}</div>
    },
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

vi.mock('@/lib/telegram-oidc', () => ({
    TELEGRAM_BOT_USERNAME: 'testbot',
}))

describe('AuthenticatedLayout (Router Guard)', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockNavigate.mockClear()
    })

    it('should show loading state while checking authentication', () => {
        mockAuthContext.isLoading = true
        mockAuthContext.isAuthenticated = false

        render(<AuthenticatedLayout />)

        expect(screen.getByText('Loading...')).toBeInTheDocument()
        expect(screen.queryByTestId('outlet')).not.toBeInTheDocument()
    })

    it('should redirect to /login when not authenticated', () => {
        mockAuthContext.isLoading = false
        mockAuthContext.isAuthenticated = false

        render(<AuthenticatedLayout />)

        expect(mockNavigate).toHaveBeenCalledWith('/login')
        expect(screen.getByTestId('navigate')).toHaveTextContent('Navigating to /login')
    })

    it('should render authenticated layout when user is authenticated', () => {
        mockAuthContext.isLoading = false
        mockAuthContext.isAuthenticated = true
        mockAuthContext.user = {
            id: '123',
            email: 'test@example.com',
            user_metadata: { full_name: 'Test User' },
        } as any

        render(<AuthenticatedLayout />)

        expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
        expect(screen.queryByTestId('navigate')).not.toBeInTheDocument()
        expect(screen.getByTestId('outlet')).toBeInTheDocument()
    })

    it('should display user name in authenticated layout', () => {
        mockAuthContext.isLoading = false
        mockAuthContext.isAuthenticated = true
        mockAuthContext.user = {
            id: '123',
            email: 'test@example.com',
            user_metadata: { full_name: 'Test User' },
        } as any

        render(<AuthenticatedLayout />)

        expect(screen.getByText('Test User')).toBeInTheDocument()
    })

    it('should display email username when no full name', () => {
        mockAuthContext.isLoading = false
        mockAuthContext.isAuthenticated = true
        mockAuthContext.user = {
            id: '123',
            email: 'testuser@example.com',
            user_metadata: {},
        } as any

        render(<AuthenticatedLayout />)

        expect(screen.getByText('@testuser')).toBeInTheDocument()
    })

    it('should show navigation links', () => {
        mockAuthContext.isLoading = false
        mockAuthContext.isAuthenticated = true
        mockAuthContext.user = {
            id: '123',
            email: 'test@example.com',
        } as any

        render(<AuthenticatedLayout />)

        expect(screen.getAllByText('Quests').length).toBeGreaterThan(0)
        expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })

    it('should show Create Quest button', () => {
        mockAuthContext.isLoading = false
        mockAuthContext.isAuthenticated = true
        mockAuthContext.user = {
            id: '123',
            email: 'test@example.com',
        } as any

        render(<AuthenticatedLayout />)

        expect(screen.getByText('Create Quest')).toBeInTheDocument()
    })

    it('should not redirect when already authenticated', () => {
        mockAuthContext.isLoading = false
        mockAuthContext.isAuthenticated = true
        mockAuthContext.user = {
            id: '123',
            email: 'test@example.com',
        } as any

        render(<AuthenticatedLayout />)

        expect(mockNavigate).not.toHaveBeenCalled()
    })
})
