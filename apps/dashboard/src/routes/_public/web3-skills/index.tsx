import { useState, useEffect } from "react"
import { PageTitle } from "@/components/page-title"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { SkillCard } from "@/components/web3-skills/skill-card"
import { SkillFilters } from "@/components/web3-skills/skill-filters"
import { useWeb3Skills, useWeb3Categories } from "@/hooks/useWeb3Skills"
import { useAuth } from "@/context/AuthContext"
import { AddLine } from "@mingcute/react"

export function Web3SkillsPage() {
  const { isAuthenticated } = useAuth()

  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [category, setCategory] = useState<string | null>(null)
  const [sort, setSort] = useState<"popular" | "newest" | "stars">("popular")
  const [source, setSource] = useState<"all" | "clawhub" | "community">("all")
  const [page, setPage] = useState(1)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Reset page on filter change
  useEffect(() => { setPage(1) }, [category, sort, source])

  const { data, isLoading } = useWeb3Skills({
    page,
    limit: 24,
    category,
    q: debouncedSearch || undefined,
    sort,
    source,
  })

  const { data: categories } = useWeb3Categories()

  return (
    <div className="space-y-6">
      <PageTitle
        title="Web3 Skills"
        description="Discover Web3 agent skills for your quests"
        actions={
          isAuthenticated ? (
            <Button asChild>
              <a href="/web3-skills/submit" className="no-underline">
                <AddLine size={16} />
                Submit Skill
              </a>
            </Button>
          ) : undefined
        }
      />

      <SkillFilters
        search={search}
        onSearchChange={setSearch}
        category={category}
        onCategoryChange={setCategory}
        sort={sort}
        onSortChange={setSort}
        source={source}
        onSourceChange={setSource}
        categories={categories ?? []}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      ) : data && data.items.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((skill) => (
              <SkillCard key={skill.slug} skill={skill} />
            ))}
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-fg-3">
                Showing {(data.page - 1) * data.limit + 1}–{Math.min(data.page * data.limit, data.total)} of {data.total}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage(p => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="py-12 text-center text-fg-3">
          No Web3 skills found. Try adjusting your filters.
        </div>
      )}
    </div>
  )
}
