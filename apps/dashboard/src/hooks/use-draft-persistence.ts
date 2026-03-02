import { useCallback, useRef } from 'react'

interface DraftState {
    form: Record<string, any>
    socialEntries: any[]
    selectedSkills: any[]
    savedAt: number
}

export function useDraftPersistence(questId?: string) {
    const key = `quest-draft-${questId || 'new'}`
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const save = useCallback((state: Omit<DraftState, 'savedAt'>) => {
        // Debounce 1s
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => {
            try {
                localStorage.setItem(key, JSON.stringify({ ...state, savedAt: Date.now() }))
            } catch { /* quota exceeded — ignore */ }
        }, 1000)
    }, [key])

    const restore = useCallback((): DraftState | null => {
        try {
            const raw = localStorage.getItem(key)
            if (!raw) return null
            const draft: DraftState = JSON.parse(raw)
            // Discard drafts older than 7 days
            if (draft.savedAt && Date.now() - draft.savedAt > 7 * 24 * 60 * 60 * 1000) {
                localStorage.removeItem(key)
                return null
            }
            return draft
        } catch {
            return null
        }
    }, [key])

    const clear = useCallback(() => {
        localStorage.removeItem(key)
        // Also clear 'new' key when saving an existing quest
        if (questId) localStorage.removeItem('quest-draft-new')
    }, [key, questId])

    return { save, restore, clear }
}
