import { useMemo } from "react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search2Fill } from "@mingcute/react"
import { TabBar, type TabItem } from "@/components/tab-bar"

type SortValue = "popular" | "newest" | "stars"
type SourceValue = "all" | "clawhub" | "community"

interface SkillFiltersProps {
  search: string
  onSearchChange: (val: string) => void
  category: string | null
  onCategoryChange: (val: string | null) => void
  sort: SortValue
  onSortChange: (val: SortValue) => void
  source: SourceValue
  onSourceChange: (val: SourceValue) => void
  categories: Array<{ name: string; count: number }>
}

export function SkillFilters({
  search, onSearchChange,
  category, onCategoryChange,
  sort, onSortChange,
  source, onSourceChange,
  categories,
}: SkillFiltersProps) {
  const categoryTabs = useMemo<TabItem[]>(() => [
    { id: "all", label: "All" },
    ...categories.map((cat) => ({ id: cat.name, label: cat.name })),
  ], [categories])

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const cat of categories) counts[cat.name] = cat.count
    return counts
  }, [categories])

  return (
    <div className="space-y-4">
      {/* Search + Sort/Source dropdowns */}
      <div className="flex items-center gap-3">
        <Select value={sort} onValueChange={(v) => onSortChange(v as SortValue)}>
          <SelectTrigger size="lg" className="w-auto shrink-0">
            <span className="text-fg-3 font-normal">Sort:</span>
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="popular">Popular</SelectItem>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="stars">Stars</SelectItem>
          </SelectContent>
        </Select>
        <Select value={source} onValueChange={(v) => onSourceChange(v as SourceValue)}>
          <SelectTrigger size="lg" className="w-auto shrink-0">
            <span className="text-fg-3 font-normal">Source:</span>
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="clawhub">ClawHub</SelectItem>
            <SelectItem value="community">Community</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Search2Fill size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-3" />
          <Input
            placeholder="Search skills..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Category sub-tabs */}
      <TabBar
        variant="sub"
        tabs={categoryTabs}
        activeTab={category ?? "all"}
        onTabChange={(id) => onCategoryChange(id === "all" ? null : id)}
        tabCounts={categoryCounts}
      />
    </div>
  )
}
