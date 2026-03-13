/**
 * Shared utilities for quest display components.
 * Used by QuestCard (list view), QuestGridCard (grid view), and QuestList page (table view).
 */

/** Format time remaining with urgency class */
export function formatTimeLeft(expiresAt: string | null): { label: string; sublabel: string; cls: string; ticking: boolean } {
    if (!expiresAt) return { label: "—", sublabel: "", cls: "normal", ticking: false }
    const diff = new Date(expiresAt).getTime() - Date.now()
    if (diff <= 0) return { label: "Ended", sublabel: "", cls: "urgent", ticking: false }
    const totalSecs = Math.floor(diff / 1000)
    const totalMins = Math.floor(totalSecs / 60)
    const h = Math.floor(totalMins / 60)
    const m = totalMins % 60
    const s = totalSecs % 60
    const d = Math.floor(h / 24)
    const remH = h % 24
    const mm = String(m).padStart(2, "0")
    const ss = String(s).padStart(2, "0")
    const hh = String(remH).padStart(2, "0")
    /* < 6h: show seconds, tick every second */
    if (h < 1) return { label: `${mm}m:${ss}s`, sublabel: "remaining", cls: "urgent", ticking: true }
    if (h < 6) return { label: `${h}h:${mm}m:${ss}s`, sublabel: "remaining", cls: "urgent", ticking: true }
    if (d < 2) return { label: `${h}h:${mm}m`, sublabel: "remaining", cls: "warning", ticking: false }
    return { label: `${d}d:${hh}h:${mm}m`, sublabel: "remaining", cls: "normal", ticking: false }
}

/** Short format for compact displays (grid cards, table) */
export function formatTimeShort(expiresAt: string | null): { label: string; cls: string } {
    if (!expiresAt) return { label: "No deadline", cls: "normal" }
    const diff = new Date(expiresAt).getTime() - Date.now()
    if (diff <= 0) return { label: "Ended", cls: "urgent" }
    const h = Math.floor(diff / 3600000)
    const d = Math.floor(h / 24)
    if (h < 6) return { label: `${h}h`, cls: "urgent" }
    if (d < 2) return { label: `${h}h`, cls: "warning" }
    return { label: `${d}d`, cls: "normal" }
}

/** Map quest type to CSS badge class */
export function typeBadgeClass(type: string): string {
    const map: Record<string, string> = {
        FCFS: "badge-fcfs",
        LEADERBOARD: "badge-leaderboard",
        LUCKY_DRAW: "badge-luckydraw",
    }
    return map[type] ?? "badge-fcfs"
}

/** Map quest type to text color class */
export function typeColorClass(_type: string): string {
    return "text-foreground"
}

/** Map quest status to CSS badge class */
export function statusBadgeClass(status: string): string {
    const map: Record<string, string> = {
        live: "badge-live",
        completed: "badge-completed",
        draft: "badge-draft",
        scheduled: "badge-scheduled",
        expired: "badge-expired",
        cancelled: "badge-cancelled",
    }
    return map[status] ?? "badge-live"
}
