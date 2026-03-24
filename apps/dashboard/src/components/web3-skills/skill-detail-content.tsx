import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useWeb3SkillDetail } from "@/hooks/useWeb3Skills";
import {
  Download2Fill,
  StarFill,
  FlashFill,
  GlobeFill,
  CalendarLine,
  CopyLine,
  CheckLine,
} from "@mingcute/react";
import { GitHubIcon } from "@/components/github-icon";

/** Semantic colors for skill categories — deterministic by name */
const CATEGORY_COLORS = [
  "var(--success)",
  "var(--warning)",
  "var(--accent)",
  "var(--info)",
  "#a855f7",
  "#06b6d4",
  "#f97316",
  "#ec4899",
] as const;

function getCategoryColor(category: string): string {
  if (category.toUpperCase() === "OTHER") return "var(--fg-3)";
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CATEGORY_COLORS[Math.abs(hash) % CATEGORY_COLORS.length];
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 1) return "today";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

/** Copy-to-clipboard install command */
function InstallCommand({ owner, slug }: { owner: string; slug: string }) {
  const [copied, setCopied] = useState(false);
  const cmd = `clawhub install ${owner}/${slug}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center justify-between border border-border-accent/20 rounded px-4 py-3 font-mono text-sm text-accent bg-accent/5">
      <span>
        <span className="text-fg-3 mr-2">$</span>
        {cmd}
      </span>
      <button
        onClick={handleCopy}
        className="text-fg-3 hover:text-fg-1 transition-colors ml-3 shrink-0"
      >
        {copied ? <CheckLine size={16} /> : <CopyLine size={16} />}
      </button>
    </div>
  );
}

export function SkillDetailContent({ skillSlug }: { skillSlug: string }) {
  const { data: skill, isLoading, error } = useWeb3SkillDetail(skillSlug);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_220px] gap-6">
        {/* Left column skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-10 w-full rounded" />
          <Skeleton className="h-px w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
        {/* Right column skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-36 w-full rounded" />
          <Skeleton className="h-16 w-full rounded" />
          <Skeleton className="h-20 w-full rounded" />
        </div>
      </div>
    );
  }

  if (error || !skill) {
    return <div className="py-12 text-center text-fg-3">Skill not found.</div>;
  }

  const owner = skill.ownerHandle || skill.ownerDisplayName || "unknown";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_220px] gap-6 py-2">
      {/* ── Left column: main content ── */}
      <div className="space-y-6 min-w-0">
        {/* Title */}
        <div className="flex flex-col gap-1">
          {/* Category */}
          {skill.category && (
            <span
              className="text-xs font-semibold uppercase flex items-center gap-1"
              style={{ color: getCategoryColor(skill.category) }}
            >
              <span>#</span>
              {skill.category}
            </span>
          )}
          <h2 className="text-2xl font-semibold text-fg-1 font-heading">
            {skill.name}
          </h2>
          <div className="mt-1 flex items-center gap-2 text-xs text-fg-3">
            <span>
              by <strong className="text-fg-1 font-semibold">@{owner}</strong>
            </span>
            {skill.version && (
              <>
                <span className="w-1 h-1 rounded-full bg-border" />
                <span>{skill.version}</span>
              </>
            )}
          </div>
        </div>

        {/* Install command */}
        <InstallCommand owner={owner} slug={skill.slug} />

        {/* Summary */}
        {skill.summary && (
          <p className="text-sm text-fg-2 leading-relaxed">{skill.summary}</p>
        )}

        {/* Tags card */}
        {skill.tags && skill.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {skill.tags.map((tag) => (
              <Badge key={tag} variant="pill">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Description */}
        {/* {skill.description && (
          <div className="whitespace-pre-wrap text-sm text-fg-2 leading-relaxed">
            <h3>Descrition</h3>
            <div className="whitespace-pre-wrap text-sm text-fg-1 leading-relaxed">
              {skill.description}
            </div>
          </div>
        )} */}

        {/* Links */}
        {(skill.websiteUrl || skill.githubUrl) && (
          <div className="flex gap-2">
            {skill.websiteUrl && (
              <a
                href={skill.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-fg-3 hover:text-fg-1 no-underline transition-colors"
              >
                <GlobeFill size={14} /> Website
              </a>
            )}
            {skill.githubUrl && (
              <a
                href={skill.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-fg-3 hover:text-fg-1 no-underline transition-colors"
              >
                <GitHubIcon size={14} /> GitHub
              </a>
            )}
          </div>
        )}
      </div>

      {/* ── Right column: sidebar ── */}
      <div className="space-y-4">
        {/* Stats card */}
        <div className="border border-border-2 rounded p-4 space-y-3">
          <h3 className="text-sm font-semibold text-fg-1">Stats</h3>
          {(
            [
              {
                icon: Download2Fill,
                label: "Weekly installs",
                value: formatCount(skill.downloads),
              },
              ...(skill.githubUrl
                ? [
                    {
                      icon: GitHubIcon,
                      label: "Repository",
                      value: "github.com",
                      href: skill.githubUrl,
                    },
                  ]
                : []),
              {
                icon: StarFill,
                label: "Stars",
                value: formatCount(skill.stars),
              },
              {
                icon: CalendarLine,
                label: "Created",
                value: timeAgo(skill.createdAt),
              },
            ] as {
              icon: React.ComponentType<{ size?: number; className?: string }>;
              label: string;
              value: string;
              href?: string;
            }[]
          ).map(({ icon: Icon, label, value, href }) => (
            <div
              key={label}
              className="flex items-center justify-between text-xs"
            >
              <span className="flex items-center gap-2 text-fg-3">
                <Icon size={14} />
                {label}
              </span>
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline no-underline font-medium"
                >
                  {value} ↗
                </a>
              ) : (
                <span className="font-semibold text-fg-1">{value}</span>
              )}
            </div>
          ))}
        </div>

        {/* Author card */}
        <div className="border border-border-2 rounded p-4">
          <h3 className="text-sm font-semibold text-fg-1 mb-3">Author</h3>
          <div className="flex items-center gap-2.5">
            {skill.ownerImage ? (
              <img
                src={skill.ownerImage}
                alt={owner}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-bg-3 flex items-center justify-center text-xs font-semibold text-fg-3">
                {owner.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-sm font-medium text-fg-1">@{owner}</span>
          </div>
        </div>

        {/* Agents using count */}
        {skill.installs > 0 && (
          <div className="border border-border-2 rounded p-4">
            <div className="flex items-center gap-2 text-xs text-fg-3">
              <FlashFill size={14} />
              <span>
                <strong className="text-fg-1 font-semibold">
                  {formatCount(skill.installs)}
                </strong>{" "}
                agents using
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
