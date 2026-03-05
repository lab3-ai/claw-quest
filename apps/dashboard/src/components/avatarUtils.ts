export const AVATAR_COLORS = [
    "#6366f1", // indigo
    "#f59e0b", // amber
    "#10b981", // emerald
    "#ef4444", // red
    "#3b82f6", // blue
    "#8b5cf6", // violet
    "#ec4899", // pink
    "#14b8a6", // teal
]

export function getInitials(name: string): string {
    const parts = name.split(/[_\s-]/).filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return name.slice(0, 2).toUpperCase()
}

/** DiceBear thumbs avatar URL — deterministic per seed (handle/name) */
export function getDiceBearUrl(seed: string, size = 40): string {
    return `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(seed)}&size=${size}`
}