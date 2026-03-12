import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QuestCard, QuestersAvatarStack } from './QuestCard'
import type { Quest } from '@clawquest/shared'

// Mock dependencies
vi.mock('@tanstack/react-router', () => ({
    Link: ({ children, to, params, className, ...props }: any) => (
        <a href={`${to}?questId=${params?.questId}`} className={className} {...props}>
            {children}
        </a>
    ),
}))

vi.mock('./avatarUtils', () => ({
    getDiceBearUrl: (name: string) => `https://api.dicebear.com/7.x/shapes/svg?seed=${name}`,
}))

vi.mock('./sponsor-logo', () => ({
    SponsorLogo: ({ sponsor }: { sponsor: string }) => <span>{sponsor}</span>,
}))

vi.mock('./QuestersPopup', () => ({
    QuestersPopup: ({ questTitle, onClose }: any) => (
        <div data-testid="questers-popup">
            <span>{questTitle}</span>
            <button onClick={onClose}>Close</button>
        </div>
    ),
}))

vi.mock('./token-icon', () => ({
    TokenIcon: ({ token }: { token: string }) => <span data-testid="token-icon">{token}</span>,
}))

vi.mock('./quest-utils', () => ({
    formatTimeLeft: (date: string) => ({
        label: '2h 30m',
        sublabel: 'remaining',
        cls: 'normal',
    }),
    typeColorClass: (type: string) => `type-${type.toLowerCase()}`,
}))

const mockQuest: Quest = {
    id: 'quest-1',
    title: 'Test Quest',
    description: 'This is a test quest description',
    type: 'FCFS',
    sponsor: 'Test Sponsor',
    rewardAmount: 1000,
    rewardType: 'USDC',
    totalSlots: 10,
    filledSlots: 3,
    questers: 2,
    questerDetails: [
        { agentName: 'agent1', humanHandle: 'user1' },
        { agentName: 'agent2', humanHandle: 'user2' },
    ],
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    tags: ['typescript', 'testing'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'active',
} as Quest

describe('QuestCard', () => {
    it('should render quest basic information', () => {
        render(<QuestCard quest={mockQuest} />)

        expect(screen.getByText('Test Quest')).toBeInTheDocument()
        expect(screen.getByText('This is a test quest description')).toBeInTheDocument()
        expect(screen.getByText('Test Sponsor')).toBeInTheDocument()
    })

    it('should display quest type', () => {
        render(<QuestCard quest={mockQuest} />)

        expect(screen.getByText('FCFS')).toBeInTheDocument()
    })

    it('should display reward amount and type', () => {
        render(<QuestCard quest={mockQuest} />)

        expect(screen.getByText('1,000')).toBeInTheDocument()
        expect(screen.getAllByText('USDC')).toHaveLength(2) // Desktop and mobile views
    })

    it('should display slots left for non-lucky-draw quests', () => {
        render(<QuestCard quest={mockQuest} />)

        // 10 total - 3 filled = 7 slots left
        expect(screen.getByText('7')).toBeInTheDocument()
        expect(screen.getByText('slots left')).toBeInTheDocument()
    })

    it('should display entries for lucky draw quests', () => {
        const luckyDrawQuest = { ...mockQuest, type: 'LUCKY_DRAW' as const }
        render(<QuestCard quest={luckyDrawQuest} />)

        expect(screen.getByText('3')).toBeInTheDocument()
        expect(screen.getByText('entered')).toBeInTheDocument()
    })

    it('should display tags', () => {
        render(<QuestCard quest={mockQuest} />)

        expect(screen.getByText('typescript')).toBeInTheDocument()
        expect(screen.getByText('testing')).toBeInTheDocument()
    })

    it('should render as a link to quest detail page', () => {
        render(<QuestCard quest={mockQuest} />)

        const link = screen.getByRole('link')
        expect(link).toHaveAttribute('href', expect.stringContaining('quest-1'))
    })

    it('should show questers popup when avatar stack is clicked', () => {
        render(<QuestCard quest={mockQuest} />)

        const avatarStack = screen.getByTitle('2 questers')
        fireEvent.click(avatarStack)

        expect(screen.getByTestId('questers-popup')).toBeInTheDocument()
        expect(screen.getByText('Test Quest')).toBeInTheDocument()
    })

    it('should close questers popup when close button is clicked', () => {
        render(<QuestCard quest={mockQuest} />)

        // Open popup
        const avatarStack = screen.getByTitle('2 questers')
        fireEvent.click(avatarStack)

        expect(screen.getByTestId('questers-popup')).toBeInTheDocument()

        // Close popup
        const closeButton = screen.getByText('Close')
        fireEvent.click(closeButton)

        expect(screen.queryByTestId('questers-popup')).not.toBeInTheDocument()
    })
})

describe('QuestersAvatarStack', () => {
    const mockDetails = [
        { agentName: 'agent1', humanHandle: 'user1' },
        { agentName: 'agent2', humanHandle: 'user2' },
        { agentName: 'agent3', humanHandle: 'user3' },
    ]

    it('should render nothing when total is 0', () => {
        const { container } = render(<QuestersAvatarStack details={[]} total={0} />)
        expect(container.firstChild).toBeNull()
    })

    it('should display all questers when 5 or fewer', () => {
        render(<QuestersAvatarStack details={mockDetails} total={3} />)

        const avatars = screen.getAllByRole('img')
        expect(avatars).toHaveLength(3)
    })

    it('should display only first 5 questers when more than 5', () => {
        const manyDetails = Array.from({ length: 10 }, (_, i) => ({
            agentName: `agent${i}`,
            humanHandle: `user${i}`,
        }))

        render(<QuestersAvatarStack details={manyDetails} total={10} />)

        const avatars = screen.getAllByRole('img')
        expect(avatars).toHaveLength(5)
    })

    it('should show extra count when more questers than displayed', () => {
        const manyDetails = Array.from({ length: 10 }, (_, i) => ({
            agentName: `agent${i}`,
            humanHandle: `user${i}`,
        }))

        render(<QuestersAvatarStack details={manyDetails} total={10} />)

        expect(screen.getByText('+5')).toBeInTheDocument() // 10 total - 5 displayed = +5
    })

    it('should show total count when no extra questers', () => {
        render(<QuestersAvatarStack details={mockDetails} total={3} />)

        expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('should call onClick when clicked', () => {
        const handleClick = vi.fn()
        render(<QuestersAvatarStack details={mockDetails} total={3} onClick={handleClick} />)

        const stack = screen.getByTitle('3 questers')
        fireEvent.click(stack)

        expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should render avatar images with correct alt text', () => {
        render(<QuestersAvatarStack details={mockDetails} total={3} />)

        const avatars = screen.getAllByRole('img')
        expect(avatars[0]).toHaveAttribute('alt', 'user1')
        expect(avatars[1]).toHaveAttribute('alt', 'user2')
        expect(avatars[2]).toHaveAttribute('alt', 'user3')
    })
})
