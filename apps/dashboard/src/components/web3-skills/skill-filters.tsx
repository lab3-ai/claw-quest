import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search2Line } from "@mingcute/react"

interface SkillFiltersProps {
  search: string
  onSearchChange: (val: string) => void
  category: string | null
  onCategoryChange: (val: string | null) => void
  sort: "popular" | "newest" | "stars"
  onSortChange: (val: "popular" | "newest" | "stars") => void
  source: "all" | "clawhub" | "community"
  onSourceChange: (val: "all" | "clawhub" | "community") => void
  categories: Array<{ name: string; count: number }>
}

export function SkillFilters({
  search, onSearchChange,
  category, onCategoryChange,
  sort, onSortChange,
  source, onSourceChange,
  categories,
}: SkillFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search2Line size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search skills..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <Button
          variant={category === null ? "default" : "outline"}
          size="sm"
          onClick={() => onCategoryChange(null)}
          className="shrink-0"
        >
          All
        </Button>
        {categories.map((cat) => (
          <Button
            key={cat.name}
            variant={category === cat.name ? "default" : "outline"}
            size="sm"
            onClick={() => onCategoryChange(cat.name === category ? null : cat.name)}
            className="shrink-0"
          >
            {cat.name}
            <span className="ml-1 text-xs opacity-60">{cat.count}</span>
          </Button>
        ))}
      </div>

      {/* Sort + Source */}
      <div className="flex gap-3">
        <Select value={sort} onValueChange={(v) => onSortChange(v as typeof sort)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="popular">Popular</SelectItem>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="stars">Stars</SelectItem>
          </SelectContent>
        </Select>

        <Select value={source} onValueChange={(v) => onSourceChange(v as typeof source)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="clawhub">ClawHub</SelectItem>
            <SelectItem value="community">Community</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
