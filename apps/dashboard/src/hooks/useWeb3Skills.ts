import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/context/AuthContext"

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

// ─── Fetchers ────────────────────────────────────────────────────────────────

async function fetchJson<T>(url: string, token?: string): Promise<T> {
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  const json = await res.json()
  return json.data
}

// ─── Public hooks ────────────────────────────────────────────────────────────

interface Web3SkillsParams {
  page?: number
  limit?: number
  category?: string | null
  q?: string
  sort?: "popular" | "newest" | "stars"
  source?: "all" | "clawhub" | "community"
}

export function useWeb3Skills(params: Web3SkillsParams) {
  const qs = new URLSearchParams()
  if (params.page) qs.set("page", String(params.page))
  if (params.limit) qs.set("limit", String(params.limit))
  if (params.category) qs.set("category", params.category)
  if (params.q && params.q.length >= 2) qs.set("q", params.q)
  if (params.sort) qs.set("sort", params.sort)
  if (params.source && params.source !== "all") qs.set("source", params.source)

  return useQuery({
    queryKey: ["web3-skills", params],
    queryFn: () => fetchJson<{
      items: Web3SkillItem[]
      total: number
      page: number
      limit: number
      totalPages: number
    }>(`${API_BASE}/web3-skills?${qs}`),
    placeholderData: (prev) => prev,
  })
}

export function useWeb3Categories() {
  return useQuery({
    queryKey: ["web3-skills-categories"],
    queryFn: () => fetchJson<Array<{ name: string; count: number }>>(`${API_BASE}/web3-skills/categories`),
    staleTime: 5 * 60 * 1000,
  })
}

export function useWeb3SkillDetail(slug: string) {
  return useQuery({
    queryKey: ["web3-skill", slug],
    queryFn: () => fetchJson<Web3SkillDetail>(`${API_BASE}/web3-skills/${slug}`),
    enabled: !!slug,
  })
}

// ─── Auth hooks ──────────────────────────────────────────────────────────────

export function useSubmitWeb3Skill() {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const token = session?.access_token

  return useMutation({
    mutationFn: async (data: Web3SkillSubmitData) => {
      const res = await fetch(`${API_BASE}/web3-skills/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? "Failed to submit")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["web3-skills"] })
    },
  })
}

export function useMySubmissions() {
  const { session } = useAuth()
  const token = session?.access_token

  return useQuery({
    queryKey: ["web3-skills-my-submissions"],
    queryFn: () => fetchJson<Web3SkillSubmission[]>(`${API_BASE}/web3-skills/submissions/mine`, token!),
    enabled: !!token,
  })
}

// ─── Admin hooks ────────────────────────────────────────────────────────────

export function useWeb3AdminPending() {
  const { session } = useAuth()
  const token = session?.access_token

  return useQuery({
    queryKey: ["web3-skills-admin-pending"],
    queryFn: () => fetchJson<{ submissions: Web3SkillSubmission[] }>(`${API_BASE}/web3-skills/admin/pending`, token!),
    enabled: !!token,
  })
}

export function useWeb3AdminReview() {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const token = session?.access_token

  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; action: string; is_web3?: boolean; category?: string; featured?: boolean; review_note?: string }) => {
      const res = await fetch(`${API_BASE}/web3-skills/admin/${id}/review`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error("Review failed")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["web3-skills"] })
      queryClient.invalidateQueries({ queryKey: ["web3-skills-admin-pending"] })
    },
  })
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Web3SkillItem {
  slug: string
  name: string
  summary: string | null
  category: string | null
  source: "clawhub" | "community"
  featured: boolean
  downloads: number
  stars: number
  installs: number
  version: string | null
  ownerHandle: string | null
  ownerDisplayName: string | null
  ownerImage: string | null
  logoUrl: string | null
  websiteUrl: string | null
  createdAt: string
}

export interface Web3SkillDetail extends Web3SkillItem {
  description: string | null
  githubUrl: string | null
  tags: string[]
}

export interface Web3SkillSubmission {
  id: string
  name: string
  slug: string
  summary: string
  category: string
  status: string
  review_note: string | null
  created_at: string
  submitter?: { displayName: string | null; email: string }
}

export interface Web3SkillSubmitData {
  name: string
  summary: string
  description?: string
  website_url?: string
  github_url?: string
  logo_url?: string
  category: string
  tags: string[]
}
