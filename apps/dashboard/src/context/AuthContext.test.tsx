import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'
import type { Session, User } from '@supabase/supabase-js'

// Mock supabase
vi.mock('@/lib/supabase', () => {
    const mockAuth = {
        getSession: vi.fn(),
        onAuthStateChange: vi.fn(),
        signOut: vi.fn(),
    }
    return {
        supabase: {
            auth: mockAuth,
        },
    }
})

// Test component that uses the hook
function TestComponent() {
    const { user, isAuthenticated, isLoading, logout } = useAuth()
    return (
        <div>
            <div data-testid="loading">{isLoading ? 'loading' : 'loaded'}</div>
            <div data-testid="authenticated">{isAuthenticated ? 'yes' : 'no'}</div>
            <div data-testid="user">{user?.email || 'none'}</div>
            <button onClick={logout}>Logout</button>
        </div>
    )
}

describe('AuthContext', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should throw error when useAuth is used outside AuthProvider', () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
        expect(() => render(<TestComponent />)).toThrow(
            'useAuth must be used within an AuthProvider'
        )
        consoleError.mockRestore()
    })

    it('should provide initial unauthenticated state', async () => {
        const { supabase } = await import('@/lib/supabase')
        const mockGetSession = supabase.auth.getSession as ReturnType<typeof vi.fn>
        const mockOnAuthStateChange = supabase.auth.onAuthStateChange as ReturnType<typeof vi.fn>

        mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
        mockOnAuthStateChange.mockReturnValue({
            data: { subscription: { unsubscribe: vi.fn() } },
        })

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        )

        await waitFor(() => {
            expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
        })

        expect(screen.getByTestId('authenticated')).toHaveTextContent('no')
        expect(screen.getByTestId('user')).toHaveTextContent('none')
    })

    it('should provide authenticated state when session exists', async () => {
        const { supabase } = await import('@/lib/supabase')
        const mockGetSession = supabase.auth.getSession as ReturnType<typeof vi.fn>
        const mockOnAuthStateChange = supabase.auth.onAuthStateChange as ReturnType<typeof vi.fn>

        const mockUser: Partial<User> = {
            id: '123',
            email: 'test@example.com',
        }
        const mockSession: Partial<Session> = {
            user: mockUser as User,
        }

        mockGetSession.mockResolvedValue({
            data: { session: mockSession },
            error: null,
        })
        mockOnAuthStateChange.mockReturnValue({
            data: { subscription: { unsubscribe: vi.fn() } },
        })

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        )

        await waitFor(() => {
            expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
        })

        expect(screen.getByTestId('authenticated')).toHaveTextContent('yes')
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
    })

    it('should call signOut on logout', async () => {
        const { supabase } = await import('@/lib/supabase')
        const mockGetSession = supabase.auth.getSession as ReturnType<typeof vi.fn>
        const mockOnAuthStateChange = supabase.auth.onAuthStateChange as ReturnType<typeof vi.fn>
        const mockSignOut = supabase.auth.signOut as ReturnType<typeof vi.fn>

        mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
        mockOnAuthStateChange.mockReturnValue({
            data: { subscription: { unsubscribe: vi.fn() } },
        })
        mockSignOut.mockResolvedValue({ error: null })

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        )

        await waitFor(() => {
            expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
        })

        const logoutButton = screen.getByText('Logout')
        logoutButton.click()

        await waitFor(() => {
            expect(mockSignOut).toHaveBeenCalled()
        })
    })

    it('should handle auth state changes', async () => {
        const { supabase } = await import('@/lib/supabase')
        const mockGetSession = supabase.auth.getSession as ReturnType<typeof vi.fn>
        const mockOnAuthStateChange = supabase.auth.onAuthStateChange as ReturnType<typeof vi.fn>

        let authStateCallback: (event: string, session: Session | null) => void

        mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
        mockOnAuthStateChange.mockImplementation((callback) => {
            authStateCallback = callback
            return {
                data: { subscription: { unsubscribe: vi.fn() } },
            }
        })

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        )

        await waitFor(() => {
            expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
        })

        // Simulate auth state change
        const mockUser: Partial<User> = {
            id: '456',
            email: 'newuser@example.com',
        }
        const mockSession: Partial<Session> = {
            user: mockUser as User,
        }

        authStateCallback!('SIGNED_IN', mockSession as Session)

        await waitFor(() => {
            expect(screen.getByTestId('authenticated')).toHaveTextContent('yes')
            expect(screen.getByTestId('user')).toHaveTextContent('newuser@example.com')
        })
    })
})
