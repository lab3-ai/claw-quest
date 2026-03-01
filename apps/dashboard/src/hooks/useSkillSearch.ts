import { useState, useEffect, useRef } from "react"
import { supabase } from "../lib/supabase"

export interface ClawHubSkill {
    id: string          // "owner_handle/slug"
    slug: string
    name: string        // display_name
    desc: string        // summary
    downloads: string   // formatted ("1.2k")
    stars: string
    version: string     // latest_version
    agents: number      // installs_all_time (proxy)
    ownerHandle: string
}

function formatCount(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
    return String(n)
}

export function useSkillSearch(debounceMs = 300) {
    const [query, setQuery] = useState("")
    const [results, setResults] = useState<ClawHubSkill[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        if (timerRef.current) clearTimeout(timerRef.current)

        if (query.trim().length < 2) {
            setResults([])
            setIsLoading(false)
            return
        }

        setIsLoading(true)

        timerRef.current = setTimeout(async () => {
            try {
                const term = `%${query.trim()}%`
                const { data, error } = await supabase
                    .from("clawhub_skills")
                    .select("slug, display_name, summary, owner_handle, downloads, installs_all_time, stars, latest_version")
                    .or(`slug.ilike.${term},display_name.ilike.${term},owner_handle.ilike.${term}`)
                    .order("downloads", { ascending: false })
                    .limit(20)

                if (error) {
                    console.error("Skill search error:", error.message)
                    setResults([])
                } else {
                    setResults(
                        (data ?? []).map(row => ({
                            id: `${row.owner_handle ?? "unknown"}/${row.slug}`,
                            slug: row.slug,
                            name: row.display_name,
                            desc: row.summary ?? "",
                            downloads: formatCount(row.downloads ?? 0),
                            stars: String(row.stars ?? 0),
                            version: row.latest_version ?? "0.0.0",
                            agents: row.installs_all_time ?? 0,
                            ownerHandle: row.owner_handle ?? "unknown",
                        }))
                    )
                }
            } catch (e) {
                console.error("Skill search failed:", e)
                setResults([])
            } finally {
                setIsLoading(false)
            }
        }, debounceMs)

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current)
        }
    }, [query, debounceMs])

    return { query, setQuery, results, isLoading }
}

// ── Custom skill URL utilities ──────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

export function isSkillUrl(q: string): boolean {
    const t = q.trim()
    return t.startsWith("http://") || t.startsWith("https://")
}

export async function fetchSkillFromUrl(url: string): Promise<ClawHubSkill | null> {
    const trimmed = url.trim()
    const res = await fetch(`${API_BASE}/quests/skill-preview?url=${encodeURIComponent(trimmed)}`)
    if (!res.ok) return null

    const data = await res.json() as { name: string; desc: string; version: string; url: string }

    let hostname = "custom"
    try { hostname = new URL(trimmed).hostname } catch { /* invalid URL, keep default */ }

    return {
        id: trimmed,
        slug: data.name,
        name: data.name,
        desc: data.desc,
        downloads: "—",
        stars: "—",
        version: data.version,
        agents: 0,
        ownerHandle: hostname,
    }
}
