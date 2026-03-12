import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmailForm } from './email-form'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock InlineMessage
vi.mock('@/components/ui/inline-message', () => ({
    InlineMessage: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="inline-message">{children}</div>
    ),
}))

describe('EmailForm', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should render email input and submit button', () => {
        render(<EmailForm />)

        expect(screen.getByPlaceholderText('your@email.com')).toBeInTheDocument()
        expect(screen.getByText('Join the Waitlist')).toBeInTheDocument()
    })

    it('should update email input value', async () => {
        const user = userEvent.setup()
        render(<EmailForm />)

        const input = screen.getByPlaceholderText('your@email.com') as HTMLInputElement

        await user.type(input, 'test@example.com')

        expect(input.value).toBe('test@example.com')
    })

    it('should show error when submitting empty email', async () => {
        render(<EmailForm />)

        const button = screen.getByText('Join the Waitlist')
        fireEvent.click(button)

        await waitFor(() => {
            expect(screen.getByTestId('inline-message')).toHaveTextContent(
                'Please enter your email address.'
            )
        })
    })

    it('should show error for invalid email format', async () => {
        const user = userEvent.setup()
        render(<EmailForm />)

        const input = screen.getByPlaceholderText('your@email.com')
        const button = screen.getByText('Join the Waitlist')

        await user.type(input, 'invalid-email')
        fireEvent.click(button)

        await waitFor(() => {
            expect(screen.getByTestId('inline-message')).toHaveTextContent(
                'Please enter a valid email address.'
            )
        })
    })

    it('should call onSuccess callback on successful submission', async () => {
        const user = userEvent.setup()
        const onSuccess = vi.fn()

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true }),
        })

        render(<EmailForm onSuccess={onSuccess} />)

        const input = screen.getByPlaceholderText('your@email.com')
        const button = screen.getByText('Join the Waitlist')

        await user.type(input, 'test@example.com')
        fireEvent.click(button)

        await waitFor(() => {
            expect(onSuccess).toHaveBeenCalledWith('test@example.com')
        })
    })

    it('should call onError callback on failed submission', async () => {
        const user = userEvent.setup()
        const onError = vi.fn()

        mockFetch.mockResolvedValueOnce({
            ok: false,
            json: async () => ({ message: 'Email already registered' }),
        })

        render(<EmailForm onError={onError} />)

        const input = screen.getByPlaceholderText('your@email.com')
        const button = screen.getByText('Join the Waitlist')

        await user.type(input, 'test@example.com')
        fireEvent.click(button)

        await waitFor(() => {
            expect(onError).toHaveBeenCalled()
        })
    })

    it('should show loading state while submitting', async () => {
        const user = userEvent.setup()

        mockFetch.mockImplementationOnce(
            () =>
                new Promise((resolve) =>
                    setTimeout(
                        () =>
                            resolve({
                                ok: true,
                                json: async () => ({ success: true }),
                            }),
                        100
                    )
                )
        )

        render(<EmailForm />)

        const input = screen.getByPlaceholderText('your@email.com')
        const button = screen.getByText('Join the Waitlist')

        await user.type(input, 'test@example.com')
        fireEvent.click(button)

        expect(screen.getByText('Joining...')).toBeInTheDocument()

        await waitFor(() => {
            expect(screen.queryByText('Joining...')).not.toBeInTheDocument()
        })
    })

    it('should display server error message', async () => {
        const user = userEvent.setup()

        mockFetch.mockResolvedValueOnce({
            ok: false,
            json: async () => ({ message: 'Custom error message' }),
        })

        render(<EmailForm />)

        const input = screen.getByPlaceholderText('your@email.com')
        const button = screen.getByText('Join the Waitlist')

        await user.type(input, 'test@example.com')
        fireEvent.click(button)

        await waitFor(() => {
            expect(screen.getByTestId('inline-message')).toHaveTextContent(
                'Custom error message'
            )
        })
    })

    it('should handle network errors gracefully', async () => {
        const user = userEvent.setup()

        mockFetch.mockRejectedValueOnce(new Error('Network error'))

        render(<EmailForm />)

        const input = screen.getByPlaceholderText('your@email.com')
        const button = screen.getByText('Join the Waitlist')

        await user.type(input, 'test@example.com')
        fireEvent.click(button)

        await waitFor(() => {
            expect(screen.getByTestId('inline-message')).toHaveTextContent(
                'Something went wrong. Please try again.'
            )
        })
    })

    it('should clear error message when user types', async () => {
        const user = userEvent.setup()
        render(<EmailForm />)

        const input = screen.getByPlaceholderText('your@email.com')
        const button = screen.getByText('Join the Waitlist')

        // Trigger error
        fireEvent.click(button)

        await waitFor(() => {
            expect(screen.getByTestId('inline-message')).toBeInTheDocument()
        })

        // Type to clear error
        await user.type(input, 'a')

        expect(screen.queryByTestId('inline-message')).not.toBeInTheDocument()
    })

    it('should use custom button text when provided', () => {
        render(<EmailForm buttonText="Subscribe Now" />)

        expect(screen.getByText('Subscribe Now')).toBeInTheDocument()
        expect(screen.queryByText('Join the Waitlist')).not.toBeInTheDocument()
    })

    it('should apply compact layout class', () => {
        const { container } = render(<EmailForm compact />)

        const form = container.querySelector('form')
        expect(form?.className).toContain('flex-row')
    })

    it('should disable button while loading', async () => {
        const user = userEvent.setup()

        mockFetch.mockImplementationOnce(
            () =>
                new Promise((resolve) =>
                    setTimeout(
                        () =>
                            resolve({
                                ok: true,
                                json: async () => ({ success: true }),
                            }),
                        100
                    )
                )
        )

        render(<EmailForm />)

        const input = screen.getByPlaceholderText('your@email.com')
        const button = screen.getByText('Join the Waitlist') as HTMLButtonElement

        await user.type(input, 'test@example.com')
        fireEvent.click(button)

        expect(button.disabled).toBe(true)

        await waitFor(() => {
            expect(button.disabled).toBe(false)
        })
    })
})
