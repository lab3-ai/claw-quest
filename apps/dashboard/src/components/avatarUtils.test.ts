import { describe, it, expect } from 'vitest'
import { getInitials, getDiceBearUrl, AVATAR_COLORS } from './avatarUtils'

describe('avatarUtils', () => {
    describe('AVATAR_COLORS', () => {
        it('should export array of color codes', () => {
            expect(AVATAR_COLORS).toBeInstanceOf(Array)
            expect(AVATAR_COLORS.length).toBeGreaterThan(0)
        })

        it('should contain valid hex colors', () => {
            AVATAR_COLORS.forEach((color) => {
                expect(color).toMatch(/^#[0-9a-f]{6}$/i)
            })
        })
    })

    describe('getInitials', () => {
        it('should get initials from two-part name', () => {
            expect(getInitials('John Doe')).toBe('JD')
            expect(getInitials('Jane Smith')).toBe('JS')
        })

        it('should handle underscore-separated names', () => {
            expect(getInitials('john_doe')).toBe('JD')
            expect(getInitials('test_user')).toBe('TU')
        })

        it('should handle hyphen-separated names', () => {
            expect(getInitials('mary-jane')).toBe('MJ')
            expect(getInitials('Jean-Pierre')).toBe('JP')
        })

        it('should handle single word names', () => {
            expect(getInitials('Alice')).toBe('AL')
            expect(getInitials('Bob')).toBe('BO')
        })

        it('should handle three or more parts (use first two)', () => {
            expect(getInitials('John Michael Doe')).toBe('JM')
            expect(getInitials('first second third')).toBe('FS')
        })

        it('should uppercase the initials', () => {
            expect(getInitials('john doe')).toBe('JD')
            expect(getInitials('alice bob')).toBe('AB')
        })

        it('should handle mixed separators', () => {
            expect(getInitials('john_doe-smith')).toBe('JD')
        })

        it('should handle empty parts gracefully', () => {
            expect(getInitials('john  doe')).toBe('JD') // double space
            expect(getInitials('test__user')).toBe('TU') // double underscore
        })

        it('should handle very short names', () => {
            expect(getInitials('AB')).toBe('AB')
            expect(getInitials('X')).toBe('X')
        })
    })

    describe('getDiceBearUrl', () => {
        it('should generate DiceBear URL with seed', () => {
            const url = getDiceBearUrl('testuser')
            expect(url).toContain('api.dicebear.com/9.x/thumbs/svg')
            expect(url).toContain('seed=testuser')
        })

        it('should use default size of 40', () => {
            const url = getDiceBearUrl('testuser')
            expect(url).toContain('size=40')
        })

        it('should accept custom size', () => {
            const url = getDiceBearUrl('testuser', 64)
            expect(url).toContain('size=64')
        })

        it('should include background colors from AVATAR_COLORS', () => {
            const url = getDiceBearUrl('testuser')
            expect(url).toContain('backgroundColor=')

            // Check that at least one color (without #) is included
            const firstColorCode = AVATAR_COLORS[0].replace('#', '')
            expect(url).toContain(firstColorCode)
        })

        it('should URL-encode the seed', () => {
            const url = getDiceBearUrl('user@example.com')
            expect(url).toContain('seed=user%40example.com')
        })

        it('should handle special characters in seed', () => {
            const url = getDiceBearUrl('user name with spaces')
            expect(url).toContain('seed=user%20name%20with%20spaces')
        })

        it('should generate different URLs for different seeds', () => {
            const url1 = getDiceBearUrl('user1')
            const url2 = getDiceBearUrl('user2')
            expect(url1).not.toBe(url2)
        })

        it('should generate same URL for same seed', () => {
            const url1 = getDiceBearUrl('testuser', 40)
            const url2 = getDiceBearUrl('testuser', 40)
            expect(url1).toBe(url2)
        })

        it('should include all avatar colors in background', () => {
            const url = getDiceBearUrl('testuser')
            const expectedBgColors = AVATAR_COLORS.map((c) => c.replace('#', '')).join(',')
            expect(url).toContain(`backgroundColor=${expectedBgColors}`)
        })
    })
})
