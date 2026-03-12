import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { formatTimeLeft, formatTimeShort, typeBadgeClass, typeColorClass } from './quest-utils'

describe('quest-utils', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2024-01-01T00:00:00Z'))
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    describe('formatTimeLeft', () => {
        it('should return dash for null expiresAt', () => {
            const result = formatTimeLeft(null)
            expect(result).toEqual({ label: '—', sublabel: '', cls: 'normal' })
        })

        it('should return "Ended" for expired quests', () => {
            const pastDate = new Date('2023-12-31T00:00:00Z').toISOString()
            const result = formatTimeLeft(pastDate)
            expect(result).toEqual({ label: 'Ended', sublabel: '', cls: 'urgent' })
        })

        it('should format time with urgent class when less than 6 hours', () => {
            const expiresAt = new Date('2024-01-01T05:30:00Z').toISOString() // 5h 30m
            const result = formatTimeLeft(expiresAt)
            expect(result.label).toBe('5h:30m')
            expect(result.sublabel).toBe('remaining')
            expect(result.cls).toBe('urgent')
        })

        it('should format time with warning class when less than 2 days', () => {
            const expiresAt = new Date('2024-01-01T20:45:00Z').toISOString() // 20h 45m
            const result = formatTimeLeft(expiresAt)
            expect(result.label).toBe('20h:45m')
            expect(result.sublabel).toBe('remaining')
            expect(result.cls).toBe('warning')
        })

        it('should format time with days when 2+ days remaining', () => {
            const expiresAt = new Date('2024-01-05T10:30:00Z').toISOString() // 4d 10h 30m
            const result = formatTimeLeft(expiresAt)
            expect(result.label).toBe('4d:10h:30m')
            expect(result.sublabel).toBe('remaining')
            expect(result.cls).toBe('normal')
        })

        it('should pad minutes with leading zero', () => {
            const expiresAt = new Date('2024-01-01T03:05:00Z').toISOString() // 3h 5m
            const result = formatTimeLeft(expiresAt)
            expect(result.label).toBe('3h:05m')
        })

        it('should pad hours with leading zero for multi-day format', () => {
            const expiresAt = new Date('2024-01-03T09:30:00Z').toISOString() // 2d 9h 30m
            const result = formatTimeLeft(expiresAt)
            expect(result.label).toBe('2d:09h:30m')
        })
    })

    describe('formatTimeShort', () => {
        it('should return "No deadline" for null expiresAt', () => {
            const result = formatTimeShort(null)
            expect(result).toEqual({ label: 'No deadline', cls: 'normal' })
        })

        it('should return "Ended" for expired quests', () => {
            const pastDate = new Date('2023-12-31T00:00:00Z').toISOString()
            const result = formatTimeShort(pastDate)
            expect(result).toEqual({ label: 'Ended', cls: 'urgent' })
        })

        it('should show hours with urgent class when less than 6 hours', () => {
            const expiresAt = new Date('2024-01-01T04:00:00Z').toISOString() // 4h
            const result = formatTimeShort(expiresAt)
            expect(result.label).toBe('4h')
            expect(result.cls).toBe('urgent')
        })

        it('should show hours with warning class when less than 2 days', () => {
            const expiresAt = new Date('2024-01-01T20:00:00Z').toISOString() // 20h
            const result = formatTimeShort(expiresAt)
            expect(result.label).toBe('20h')
            expect(result.cls).toBe('warning')
        })

        it('should show days with normal class when 2+ days remaining', () => {
            const expiresAt = new Date('2024-01-05T00:00:00Z').toISOString() // 4d
            const result = formatTimeShort(expiresAt)
            expect(result.label).toBe('4d')
            expect(result.cls).toBe('normal')
        })
    })

    describe('typeBadgeClass', () => {
        it('should return correct class for FCFS type', () => {
            expect(typeBadgeClass('FCFS')).toBe('badge-fcfs')
        })

        it('should return correct class for LEADERBOARD type', () => {
            expect(typeBadgeClass('LEADERBOARD')).toBe('badge-leaderboard')
        })

        it('should return correct class for LUCKY_DRAW type', () => {
            expect(typeBadgeClass('LUCKY_DRAW')).toBe('badge-luckydraw')
        })

        it('should return default class for unknown type', () => {
            expect(typeBadgeClass('UNKNOWN')).toBe('badge-fcfs')
        })
    })

    describe('typeColorClass', () => {
        it('should return correct class for FCFS type', () => {
            expect(typeColorClass('FCFS')).toBe('text-accent')
        })

        it('should return correct class for LEADERBOARD type', () => {
            expect(typeColorClass('LEADERBOARD')).toBe('text-info')
        })

        it('should return correct class for LUCKY_DRAW type', () => {
            expect(typeColorClass('LUCKY_DRAW')).toBe('text-fg-secondary')
        })

        it('should return default class for unknown type', () => {
            expect(typeColorClass('UNKNOWN')).toBe('text-accent')
        })
    })
})
