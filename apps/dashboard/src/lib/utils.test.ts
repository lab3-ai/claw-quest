import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('utils', () => {
    describe('cn', () => {
        it('should merge class names', () => {
            const result = cn('text-red-500', 'bg-blue-500')
            expect(result).toBe('text-red-500 bg-blue-500')
        })

        it('should handle conditional classes', () => {
            const result = cn('base-class', true && 'conditional-class', false && 'hidden-class')
            expect(result).toBe('base-class conditional-class')
        })

        it('should merge conflicting tailwind classes', () => {
            // twMerge should keep the last conflicting class
            const result = cn('p-4', 'p-8')
            expect(result).toBe('p-8')
        })

        it('should handle array of classes', () => {
            const result = cn(['class-1', 'class-2'], 'class-3')
            expect(result).toBe('class-1 class-2 class-3')
        })

        it('should handle undefined and null values', () => {
            const result = cn('base', undefined, null, 'end')
            expect(result).toBe('base end')
        })

        it('should handle empty input', () => {
            const result = cn()
            expect(result).toBe('')
        })

        it('should handle object notation', () => {
            const result = cn({ 'class-1': true, 'class-2': false, 'class-3': true })
            expect(result).toBe('class-1 class-3')
        })

        it('should merge complex tailwind utilities', () => {
            const result = cn('px-2 py-1', 'p-4')
            // twMerge should resolve conflicts
            expect(result).toBe('p-4')
        })

        it('should handle responsive modifiers', () => {
            const result = cn('text-sm', 'sm:text-base', 'lg:text-lg')
            expect(result).toBe('text-sm sm:text-base lg:text-lg')
        })

        it('should merge hover and state variants', () => {
            const result = cn('hover:bg-blue-500', 'hover:bg-red-500')
            expect(result).toBe('hover:bg-red-500')
        })
    })
})
