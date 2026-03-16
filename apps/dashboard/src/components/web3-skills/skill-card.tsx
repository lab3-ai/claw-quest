import { StarLine, GroupLine } from "@mingcute/react"
import type { Web3SkillItem } from "@/hooks/useWeb3Skills"

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days < 1) return "today"
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

export function SkillCard({ skill }: { skill: Web3SkillItem }) {
  return (
    <a
      href={`/web3-skills/${skill.slug}`}
      className="hover-shadow group flex flex-col rounded border border-border bg-bg-1 p-4 max-sm:p-3 no-underline text-fg-1 hover:border-fg-1"
    >
      {/* Top row: category + time — matches quest card top row spacing */}
      <div className="flex items-center justify-between mb-2">
        {skill.category ? (
          <span className="text-xs font-semibold uppercase text-fg-1 flex items-center gap-1">
            <span>#</span>{skill.category}
          </span>
        ) : <span />}
        <span className="text-xs text-fg-3">{timeAgo(skill.createdAt)}</span>
      </div>

      {/* Title — text-md matches quest card */}
      <h3 className="text-md font-semibold leading-snug mb-2 line-clamp-2">{skill.name}</h3>

      {/* Summary — flex-1 fills remaining space so cards align */}
      <p className="flex-1 text-xs text-fg-3 leading-relaxed mb-3 line-clamp-3">
        {skill.summary ?? "No description"}
      </p>

      {/* Bottom row: author + stats — matches quest card border-t + pt-3 */}
      <div className="mt-auto pt-3 border-t border-border flex items-center gap-1 text-xs text-fg-3">
        <span className="truncate">
          by <strong className="text-fg-1 font-semibold">@{skill.ownerHandle || skill.ownerDisplayName || "unknown"}</strong>
        </span>
        <span className="w-1 h-1 rounded-full bg-border mx-1" />
        <StarLine size={14} />
        <span>{formatCount(skill.stars)}</span>
        <span className="w-1 h-1 rounded-full bg-border mx-1" />
        <GroupLine size={14} />
        <span>{formatCount(skill.installs)}</span>
      </div>
    </a>
  )
}
