export const AVATAR_COLORS = [
    "#c7d2fe", // indigo-200
    "#bfdbfe", // blue-200
    "#ddd6fe", // violet-200
    "#a5f3fc", // cyan-200
    "#99f6e4", // teal-200
    "#a7f3d0", // emerald-200
    "#bae6fd", // sky-200
    "#e0e7ff", // indigo-100
]

export function getInitials(name: string): string {
    const parts = name.split(/[_\s-]/).filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return name.slice(0, 2).toUpperCase()
}

/** DiceBear fun-emoji avatar URL — deterministic per seed, happy/neutral only */
export function getDiceBearUrl(seed: string, size = 40): string {
    const bgColors = AVATAR_COLORS.map((c) => c.replace("#", "")).join(",")
    const eyes = "cute,closed,love,stars,wink,wink2"
    const mouth = "cute,lilSmile,smileLol,smileTeeth,tongueOut,wideSmile"
    return `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(seed)}&size=${size}&backgroundColor=${bgColors}&eyes=${eyes}&mouth=${mouth}`
}