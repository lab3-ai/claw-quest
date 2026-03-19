import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Breadcrumb } from "@/components/breadcrumb"
import { useWeb3SkillDetail } from "@/hooks/useWeb3Skills"
import { Download2Line, StarLine, FlashLine, GlobeLine } from "@mingcute/react"
import { GitHubIcon } from "@/components/github-icon"

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

export function Web3SkillDetail({ skillSlug }: { skillSlug: string }) {
  const { data: skill, isLoading, error } = useWeb3SkillDetail(skillSlug)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Breadcrumb items={[
          { label: "Web3 Skills", to: "/web3-skills" },
          { label: "Loading..." },
        ]} />
        <div className="py-4 border-b border-border-2">
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      </div>
    )
  }

  if (error || !skill) {
    return (
      <div className="space-y-4">
        <Breadcrumb items={[
          { label: "Web3 Skills", to: "/web3-skills" },
          { label: "Not found" },
        ]} />
        <div className="py-12 text-center text-fg-3">Skill not found.</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumb items={[
          { label: "Web3 Skills", to: "/web3-skills" },
          { label: skill.name },
        ]} />

        {/* Header */}
        <div className="py-4 border-b border-border-2">
        <div className="flex items-start justify-between gap-4 max-sm:flex-col">
          <div>
            <h1 className="text-2xl font-semibold text-fg-1">{skill.name}</h1>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-fg-3">
              <span>by <strong className="text-fg-1 font-semibold">@{skill.ownerHandle || skill.ownerDisplayName || "unknown"}</strong></span>
              {skill.version && (
                <>
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <span>{skill.version}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {skill.category && <Badge variant="outline">{skill.category}</Badge>}
            {skill.source === "community" && <Badge variant="pill">Community</Badge>}
            {skill.featured && <Badge variant="outline" className="text-warning border-warning/30">Featured</Badge>}
          </div>
        </div>
        </div>
      </div>

      {skill.summary && <p className="text-sm text-fg-3 leading-relaxed">{skill.summary}</p>}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Download2Line, label: "Downloads", value: formatCount(skill.downloads) },
          { icon: StarLine, label: "Stars", value: formatCount(skill.stars) },
          { icon: FlashLine, label: "Agents", value: formatCount(skill.installs) },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex flex-col items-center border border-border-2 rounded p-3">
            <Icon size={16} className="text-fg-3" />
            <span className="mt-1 text-base font-semibold">{value}</span>
            <span className="text-2xs text-fg-3 uppercase tracking-wider">{label}</span>
          </div>
        ))}
      </div>

      {skill.description && (
        <div>
          <h2 className="text-xs font-medium text-fg-3 uppercase tracking-wider mb-3">Description</h2>
          <div className="whitespace-pre-wrap text-sm text-fg-3 leading-relaxed">{skill.description}</div>
        </div>
      )}

      {(skill.websiteUrl || skill.githubUrl) && (
        <div className="flex gap-2">
          {skill.websiteUrl && (
            <Button variant="outline" size="sm" asChild>
              <a href={skill.websiteUrl} target="_blank" rel="noopener noreferrer" className="no-underline">
                <GlobeLine size={14} /> Website
              </a>
            </Button>
          )}
          {skill.githubUrl && (
            <Button variant="outline" size="sm" asChild>
              <a href={skill.githubUrl} target="_blank" rel="noopener noreferrer" className="no-underline">
                <GitHubIcon size={14} /> GitHub
              </a>
            </Button>
          )}
        </div>
      )}

      {skill.tags && skill.tags.length > 0 && (
        <div>
          <h2 className="text-xs font-medium text-fg-3 uppercase tracking-wider mb-3">Tags</h2>
          <div className="flex flex-wrap gap-1.5">
            {skill.tags.map((tag) => (
              <Badge key={tag} variant="pill">{tag}</Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
