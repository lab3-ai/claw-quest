import { Badge } from "@/components/ui/badge"
import { Download2Line, StarLine, FlashLine } from "@mingcute/react"
import type { Web3SkillItem } from "@/hooks/useWeb3Skills"

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

export function SkillCard({ skill }: { skill: Web3SkillItem }) {
  return (
    <a
      href={`/web3-skills/${skill.slug}`}
      className="group flex flex-col rounded-lg border border-border bg-background p-4 no-underline transition-colors hover:border-foreground"
    >
      {/* Top: category + featured */}
      <div className="flex items-center gap-2">
        {skill.category && (
          <Badge variant="outline" className="text-xs">
            {skill.category}
          </Badge>
        )}
        {skill.source === "community" && (
          <Badge variant="pill" className="text-xs">
            Community
          </Badge>
        )}
        {skill.featured && (
          <StarLine size={14} className="ml-auto text-yellow-500" />
        )}
      </div>

      {/* Name + summary */}
      <h3 className="mt-2 text-base font-semibold text-foreground group-hover:underline">
        {skill.name}
      </h3>
      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
        {skill.summary ?? "No description"}
      </p>

      {/* Stats */}
      <div className="mt-auto flex items-center gap-4 pt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Download2Line size={12} />
          {formatCount(skill.downloads)}
        </span>
        <span className="flex items-center gap-1">
          <StarLine size={12} />
          {formatCount(skill.stars)}
        </span>
        <span className="flex items-center gap-1">
          <FlashLine size={12} />
          {formatCount(skill.installs)}
        </span>
      </div>

      {/* Owner + version */}
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span className="truncate">
          {skill.ownerHandle ? `@${skill.ownerHandle}` : skill.ownerDisplayName ?? "Unknown"}
        </span>
        {skill.version && <span>{skill.version}</span>}
      </div>
    </a>
  )
}
