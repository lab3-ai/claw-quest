import { useState, useEffect } from "react"
import { PageTitle } from "@/components/page-title"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { SkillCard } from "@/components/web3-skills/skill-card"
import { SkillFilters } from "@/components/web3-skills/skill-filters"
import { SkillDetailContent } from "@/components/web3-skills/skill-detail-content"
import { useWeb3Skills, useWeb3Categories } from "@/hooks/useWeb3Skills"
import { useAuth } from "@/context/AuthContext"
import { AddLine, ArrowLeftLine, ArrowRightLine } from "@mingcute/react"
import {
  Dialog,
  DialogContent,
  DialogClose,
} from "@/components/ui/dialog"
import { XIcon } from "@/components/ui/icons"

export function Web3SkillsPage() {
  const { isAuthenticated } = useAuth()

  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [category, setCategory] = useState<string | null>(null)
  const [sort, setSort] = useState<"popular" | "newest" | "stars">("popular")
  const [source, setSource] = useState<"all" | "clawhub" | "community">("all")
  const [page, setPage] = useState(1)
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null)

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
    <div className="space-y-4">
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
            <div key={i} className="flex flex-col rounded border border-border-2 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-12" />
              </div>
              <Skeleton className="h-5 w-3/4" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
                <Skeleton className="h-3 w-2/3" />
              </div>
              <div className="pt-3 border-t border-border-2 flex items-center justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : data && data.items.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((skill) => (
              <SkillCard key={skill.slug} skill={skill} onSelect={setSelectedSkill} />
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

      {/* Skill detail modal */}
      <Dialog open={!!selectedSkill} onOpenChange={(open) => { if (!open) setSelectedSkill(null) }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto top-[10%] translate-y-0 max-sm:max-w-[calc(100%-1.5rem)] max-sm:max-h-[calc(100%-1.5rem)]">
          {/* Custom header: slug label + nav arrows | close */}
          <div className="flex items-center border-b border-border-2 px-6 py-3">
            <span className="flex-1 text-xs text-fg-3 font-mono truncate">
              skills/{selectedSkill}
            </span>
            {data?.items && data.items.length > 1 && (() => {
              const slugs = data.items.map(s => s.slug)
              const idx = slugs.indexOf(selectedSkill ?? "")
              return (
                <span className="flex items-center gap-1">
                  <button
                    disabled={idx <= 0}
                    onClick={() => idx > 0 && setSelectedSkill(slugs[idx - 1])}
                    className="inline-flex items-center justify-center h-7 w-7 rounded border border-border-2 text-fg-3 hover:text-fg-1 hover:border-fg-3 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ArrowLeftLine size={14} />
                  </button>
                  <button
                    disabled={idx >= slugs.length - 1}
                    onClick={() => idx < slugs.length - 1 && setSelectedSkill(slugs[idx + 1])}
                    className="inline-flex items-center justify-center h-7 w-7 rounded border border-border-2 text-fg-3 hover:text-fg-1 hover:border-fg-3 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ArrowRightLine size={14} />
                  </button>
                </span>
              )
            })()}
            <span className="mx-2 h-4 w-px bg-border-2" />
            <DialogClose className="inline-flex items-center justify-center h-7 w-7 rounded border border-border-2 text-fg-3 hover:text-fg-1 hover:border-fg-3 transition-colors">
              <XIcon className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </div>
          <div className="px-6 py-4">
            {selectedSkill && <SkillDetailContent skillSlug={selectedSkill} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
