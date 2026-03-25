import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { SocialTasks } from './social-tasks'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock window.open
const mockWindowOpen = vi.fn()
window.open = mockWindowOpen

// Mock PlatformIcon
vi.mock('@/components/PlatformIcon', () => ({
    PlatformIcon: ({ platform }: { platform: string }) => <span>{platform}-icon</span>,
}))

// Mock telegram config
vi.mock('@/lib/telegram-oidc', () => ({
    TELEGRAM_BOT_USERNAME: 'testbot',
}))

vi.mock('@/components/waitlist/telegram-join-button', () => ({
    WAITLIST_TOKEN_KEY: 'cq_waitlist_token',
}))

describe('SocialTasks', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.useFakeTimers()
        localStorage.clear()
    })

    afterEach(() => {
        vi.runOnlyPendingTimers()
        vi.useRealTimers()
    })

    it('should render social task buttons', () => {
        render(<SocialTasks />)

        expect(screen.getByRole('button', { name: /Follow/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Claim/i })).toBeInTheDocument()
    })

    it('should open X profile when follow button is clicked', () => {
        render(<SocialTasks />)

        const followButton = screen.getByRole('button', { name: /Follow/i })
        fireEvent.click(followButton)

        expect(mockWindowOpen).toHaveBeenCalledWith(
            'https://x.com/clawquest_ai',
            '_blank',
            'noopener,noreferrer'
        )
    })

    it('should show pending state after clicking follow', () => {
        render(<SocialTasks />)

        const followButton = screen.getByRole('button', { name: /Follow/i })
        fireEvent.click(followButton)

        // Should show loading icon during pending state
        expect(screen.getByRole('button', { name: /\.\.\./i })).toBeInTheDocument()
    })

    it('should mark follow as done after delay', () => {
        render(<SocialTasks />)

        const followButton = screen.getByRole('button', { name: /Follow/i })
        fireEvent.click(followButton)

        // Fast-forward time by 5 seconds
        act(() => {
            vi.advanceTimersByTime(5000)
        })

        // Button should show completed state
        expect(screen.getByRole('button', { name: /Done/i })).toBeInTheDocument()
    })

    it('should open Telegram bot when claim button is clicked with token', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ accessToken: 'test-token-123' }),
        })

        render(<SocialTasks />)

        // Complete follow step first
        const followButton = screen.getByRole('button', { name: /Follow/i })
        fireEvent.click(followButton)
        act(() => {
            vi.advanceTimersByTime(5000)
        })

        // Use real timers for async operations
        vi.useRealTimers()

        const claimButton = screen.getByRole('button', { name: /Claim/i })
        fireEvent.click(claimButton)

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/waitlist/token'),
                expect.objectContaining({
                    method: 'POST',
                })
            )
        })

        await waitFor(() => {
            expect(localStorage.getItem('cq_waitlist_token')).toBe('test-token-123')
            expect(mockWindowOpen).toHaveBeenCalledWith(
                'https://t.me/testbot?start=wl_test-token-123',
                '_blank',
                'noopener,noreferrer'
            )
        })

        vi.useFakeTimers()
    })

    it('should open Telegram bot without token on API failure', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
        })

        render(<SocialTasks />)

        // Complete follow step first
        const followButton = screen.getByRole('button', { name: /Follow/i })
        fireEvent.click(followButton)
        act(() => {
            vi.advanceTimersByTime(5000)
        })

        // Use real timers for async operations
        vi.useRealTimers()

        const claimButton = screen.getByRole('button', { name: /Claim/i })
        fireEvent.click(claimButton)

        await waitFor(() => {
            expect(mockWindowOpen).toHaveBeenCalledWith(
                'https://t.me/testbot?start=waitlist',
                '_blank',
                'noopener,noreferrer'
            )
        })

        vi.useFakeTimers()
    })

    it('should handle network errors gracefully', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'))

        render(<SocialTasks />)

        // Complete follow step first
        const followButton = screen.getByRole('button', { name: /Follow/i })
        fireEvent.click(followButton)
        act(() => {
            vi.advanceTimersByTime(5000)
        })

        // Use real timers for async operations
        vi.useRealTimers()

        const claimButton = screen.getByRole('button', { name: /Claim/i })
        fireEvent.click(claimButton)

        await waitFor(() => {
            expect(mockWindowOpen).toHaveBeenCalledWith(
                'https://t.me/testbot?start=waitlist',
                '_blank',
                'noopener,noreferrer'
            )
        })

        vi.useFakeTimers()
    })

    it('should use referral code when provided', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
        })

        render(<SocialTasks referralCode="REF123" />)

        // Complete follow step first
        const followButton = screen.getByRole('button', { name: /Follow/i })
        fireEvent.click(followButton)
        act(() => {
            vi.advanceTimersByTime(5000)
        })

        // Use real timers for async operations
        vi.useRealTimers()

        const claimButton = screen.getByRole('button', { name: /Claim/i })
        fireEvent.click(claimButton)

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    body: JSON.stringify({ referredBy: 'REF123' }),
                })
            )
        })

        await waitFor(() => {
            expect(mockWindowOpen).toHaveBeenCalledWith(
                'https://t.me/testbot?start=ref_REF123',
                '_blank',
                'noopener,noreferrer'
            )
        })

        vi.useFakeTimers()
    })

    it('should prevent multiple simultaneous claim requests', async () => {
        mockFetch.mockImplementationOnce(
            () =>
                new Promise((resolve) =>
                    setTimeout(
                        () =>
                            resolve({
                                ok: true,
                                json: async () => ({ accessToken: 'test-token' }),
                            }),
                        100
                    )
                )
        )

        render(<SocialTasks />)

        // Complete follow step first to enable claim button
        const followButton = screen.getByRole('button', { name: /Follow/i })
        fireEvent.click(followButton)
        act(() => {
            vi.advanceTimersByTime(5000)
        })

        // Use real timers for async operations
        vi.useRealTimers()

        await waitFor(() => expect(screen.getByRole('button', { name: /Done/i })).toBeInTheDocument())

        const claimButton = screen.getByRole('button', { name: /Claim/i })

        // Click multiple times
        fireEvent.click(claimButton)
        fireEvent.click(claimButton)
        fireEvent.click(claimButton)

        // Should only make one request
        expect(mockFetch).toHaveBeenCalledTimes(1)

        vi.useFakeTimers()
    })

    it('should cleanup timer on unmount', () => {
        const { unmount } = render(<SocialTasks />)

        const followButton = screen.getByRole('button', { name: /Follow/i })
        fireEvent.click(followButton)

        unmount()

        // Should not throw when advancing timers after unmount
        expect(() => vi.advanceTimersByTime(5000)).not.toThrow()
    })
})
