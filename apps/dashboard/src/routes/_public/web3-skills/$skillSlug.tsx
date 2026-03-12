import { PageTitle } from "@/components/page-title"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useWeb3SkillDetail } from "@/hooks/useWeb3Skills"
import { Download2Line, StarLine, FlashLine, ArrowLeftLine, GlobeLine } from "@mingcute/react"

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

export function Web3SkillDetail({ skillSlug }: { skillSlug: string }) {
  const { data: skill, isLoading, error } = useWeb3SkillDetail(skillSlug)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
      </div>
    )
  }

  if (error || !skill) {
    return (
      <div className="space-y-4">
        <a href="/web3-skills" className="inline-flex items-center gap-1 text-sm text-muted-foreground no-underline hover:text-foreground">
          <ArrowLeftLine size={14} />
          Back to Web3 Skills
        </a>
        <div className="py-12 text-center text-muted-foreground">Skill not found.</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <a href="/web3-skills" className="inline-flex items-center gap-1 text-sm text-muted-foreground no-underline hover:text-foreground">
        <ArrowLeftLine size={14} />
        Back to Web3 Skills
      </a>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 max-sm:flex-col">
        <div>
          <PageTitle title={skill.name} />
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            {skill.ownerHandle ? `@${skill.ownerHandle}` : skill.ownerDisplayName ?? "Unknown"}
            {skill.version && <span>· {skill.version}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          {skill.category && <Badge variant="outline">{skill.category}</Badge>}
          {skill.source === "community" && <Badge variant="pill">Community</Badge>}
          {skill.featured && <Badge className="bg-yellow-500/10 text-yellow-600">Featured</Badge>}
        </div>
      </div>

      {skill.summary && <p className="text-sm text-muted-foreground">{skill.summary}</p>}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Download2Line, label: "Downloads", value: formatCount(skill.downloads) },
          { icon: StarLine, label: "Stars", value: formatCount(skill.stars) },
          { icon: FlashLine, label: "Agents", value: formatCount(skill.installs) },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex flex-col items-center rounded-lg border border-border p-4">
            <Icon size={20} className="text-muted-foreground" />
            <span className="mt-1 text-lg font-semibold">{value}</span>
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      {skill.description && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Description</h2>
          <div className="whitespace-pre-wrap text-sm text-muted-foreground">{skill.description}</div>
        </div>
      )}

      {(skill.websiteUrl || skill.githubUrl) && (
        <div className="flex gap-3">
          {skill.websiteUrl && (
            <Button variant="outline" size="sm" asChild>
              <a href={skill.websiteUrl} target="_blank" rel="noopener noreferrer" className="no-underline">
                <GlobeLine size={14} /> Website
              </a>
            </Button>
          )}
          {skill.githubUrl && (
            <Button variant="outline" size="sm" asChild>
              <a href={skill.githubUrl} target="_blank" rel="noopener noreferrer" className="no-underline">GitHub</a>
            </Button>
          )}
        </div>
      )}

      {skill.tags && skill.tags.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {skill.tags.map((tag) => (
              <Badge key={tag} variant="pill">{tag}</Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
