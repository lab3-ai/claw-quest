import { useState, useCallback } from "react"

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

export type ChipStatus = "pending" | "valid" | "invalid"

export interface ChipValidation {
    /** chip value → validation status */
    statuses: Record<string, ChipStatus>
    /** chip value → error message (only for invalid) */
    errors: Record<string, string>
    /** chip value → meta info (e.g. account name) */
    meta: Record<string, Record<string, string>>
}

/** Validate a social task target (X account, Discord invite, Telegram channel).
 *  Fires a single API call per chip added. Warning-only: invalid results don't block publish. */
export function useSocialValidation(token: string | undefined) {
    const [validations, setValidations] = useState<ChipValidation>({
        statuses: {},
        errors: {},
        meta: {},
    })

    /** Call API to validate a chip value. Updates state with result. */
    const validate = useCallback(
        async (platform: string, actionType: string, value: string) => {
            if (!token) return
            // Skip post type (user creates new content)
            if (actionType === "post") return

            const key = `${platform}:${actionType}:${value}`

            // Mark as pending
            setValidations(prev => ({
                ...prev,
                statuses: { ...prev.statuses, [key]: "pending" },
            }))

            try {
                const params = new URLSearchParams({ platform, type: actionType, value })
                const res = await fetch(`${API_BASE}/quests/validate-social?${params}`, {
                    headers: { Authorization: `Bearer ${token}` },
                    signal: AbortSignal.timeout(12000),
                })
                if (!res.ok) {
                    // API error → treat as valid (graceful degradation)
                    setValidations(prev => ({
                        ...prev,
                        statuses: { ...prev.statuses, [key]: "valid" },
                    }))
                    return
                }
                const data = await res.json() as { valid: boolean; error?: string; meta?: Record<string, string> }
                setValidations(prev => ({
                    statuses: { ...prev.statuses, [key]: data.valid ? "valid" : "invalid" },
                    errors: data.error
                        ? { ...prev.errors, [key]: data.error }
                        : prev.errors,
                    meta: data.meta
                        ? { ...prev.meta, [key]: data.meta }
                        : prev.meta,
                }))
            } catch {
                // Network/timeout → treat as valid (graceful)
                setValidations(prev => ({
                    ...prev,
                    statuses: { ...prev.statuses, [key]: "valid" },
                }))
            }
        },
        [token],
    )

    /** Remove validation state for a chip */
    const remove = useCallback((platform: string, actionType: string, value: string) => {
        const key = `${platform}:${actionType}:${value}`
        setValidations(prev => {
            const { [key]: _s, ...statuses } = prev.statuses
            const { [key]: _e, ...errors } = prev.errors
            const { [key]: _m, ...meta } = prev.meta
            return { statuses, errors, meta }
        })
    }, [])

    /** Get status for a specific chip */
    const getStatus = useCallback(
        (platform: string, actionType: string, value: string): ChipStatus | undefined => {
            return validations.statuses[`${platform}:${actionType}:${value}`]
        },
        [validations.statuses],
    )

    /** Get error for a specific chip */
    const getError = useCallback(
        (platform: string, actionType: string, value: string): string | undefined => {
            return validations.errors[`${platform}:${actionType}:${value}`]
        },
        [validations.errors],
    )

    /** Get meta for a specific chip */
    const getMeta = useCallback(
        (platform: string, actionType: string, value: string): Record<string, string> | undefined => {
            return validations.meta[`${platform}:${actionType}:${value}`]
        },
        [validations.meta],
    )

    return { validate, remove, getStatus, getError, getMeta, validations }
}
