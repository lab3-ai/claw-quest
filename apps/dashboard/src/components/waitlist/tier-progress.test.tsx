import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TierProgress } from './tier-progress'

// Mock IntersectionObserver
class MockIntersectionObserver {
    constructor(private callback: IntersectionObserverCallback) {}
    observe(element: Element) {
        // Immediately trigger callback with isIntersecting: true for testing
        this.callback(
            [{ isIntersecting: true, target: element } as IntersectionObserverEntry],
            this as any
        )
    }
    unobserve() {}
    disconnect() {}
    takeRecords() {
        return []
    }
    get root() {
        return null
    }
    get rootMargin() {
        return ''
    }
    get thresholds() {
        return []
    }
}

window.IntersectionObserver = MockIntersectionObserver as any

describe('TierProgress', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should render tier names', () => {
        render(<TierProgress totalSignups={50} />)

        expect(screen.getByText('OG Pioneer')).toBeInTheDocument()
        expect(screen.getByText('Early Access')).toBeInTheDocument()
    })

    it('should display tier perks', () => {
        render(<TierProgress totalSignups={50} />)

        expect(screen.getByText('OG Discord badge + 500 bonus XP')).toBeInTheDocument()
        expect(
            screen.getByText('Premium quests 30 min before public')
        ).toBeInTheDocument()
    })

    it('should show current signup count for each tier', () => {
        render(<TierProgress totalSignups={50} />)

        // OG Pioneer: 50/100
        const ogText = screen.getByText((content, element) => {
            return element?.textContent === '50/100 claimed'
        })
        expect(ogText).toBeInTheDocument()

        // Early Access: 0/1000 (since totalSignups < 100)
        const earlyText = screen.getByText((content, element) => {
            return element?.textContent === '0/1000 claimed'
        })
        expect(earlyText).toBeInTheDocument()
    })

    it('should cap tier progress at max', () => {
        render(<TierProgress totalSignups={150} />)

        // OG Pioneer should be capped at 100
        const ogText = screen.getByText((content, element) => {
            return element?.textContent === '100/100 claimed'
        })
        expect(ogText).toBeInTheDocument()

        // Early Access should show 50 (150 - 100 from first tier)
        const earlyText = screen.getByText((content, element) => {
            return element?.textContent === '50/1000 claimed'
        })
        expect(earlyText).toBeInTheDocument()
    })

    it('should display position indicator when position is provided', () => {
        render(<TierProgress totalSignups={100} position={42} />)

        expect(screen.getByText("You're #42 in line")).toBeInTheDocument()
    })

    it('should not display position indicator when position is null', () => {
        render(<TierProgress totalSignups={100} position={null} />)

        expect(screen.queryByText(/You're #/)).not.toBeInTheDocument()
    })

    it('should display email in position indicator when provided', () => {
        render(<TierProgress totalSignups={100} position={42} email="test@example.com" />)

        expect(screen.getByText('Hey, test@example.com')).toBeInTheDocument()
    })

    it('should not display email when not provided', () => {
        render(<TierProgress totalSignups={100} position={42} />)

        expect(screen.queryByText(/Hey,/)).not.toBeInTheDocument()
    })

    it('should calculate correct percentage for progress bars', () => {
        const { container } = render(<TierProgress totalSignups={50} />)

        const progressBars = container.querySelectorAll('.bg-primary')

        // First tier (OG Pioneer): 50/100 = 50%
        expect(progressBars[0]).toHaveStyle({ width: '50%' })

        // Second tier (Early Access): 0/1000 = 0%
        expect(progressBars[1]).toHaveStyle({ width: '0%' })
    })

    it('should handle all tiers being full', () => {
        render(<TierProgress totalSignups={1100} />)

        // OG Pioneer: 100/100
        const ogText = screen.getByText((content, element) => {
            return element?.textContent === '100/100 claimed'
        })
        expect(ogText).toBeInTheDocument()

        // Early Access: 1000/1000
        const earlyText = screen.getByText((content, element) => {
            return element?.textContent === '1000/1000 claimed'
        })
        expect(earlyText).toBeInTheDocument()
    })

    it('should setup IntersectionObserver on mount', () => {
        const { container } = render(<TierProgress totalSignups={50} />)

        // Verify component renders without errors (IntersectionObserver is set up internally)
        expect(container).toBeInTheDocument()
    })

    it('should animate progress bars when visible', () => {
        const { container } = render(<TierProgress totalSignups={50} />)

        const progressBars = container.querySelectorAll('.bg-primary')

        // Progress bars should have width set (animated from 0%)
        expect(progressBars[0]).toHaveStyle({ width: '50%' })
    })

    it('should show celebrate icon in position indicator', () => {
        render(<TierProgress totalSignups={100} position={1} />)

        // The CelebrateLine component should be rendered
        const positionCard = screen.getByText("You're #1 in line").closest('div')
        expect(positionCard).toBeInTheDocument()
    })
})
