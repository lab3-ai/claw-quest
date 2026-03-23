import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/page-title";
import { GitBranchFill, CodeFill, AddLine } from "@mingcute/react";
import { TabBar, type TabItem } from "@/components/tab-bar";
import { GitHubIcon } from "@/components/github-icon";
import {
  rewardBadgeClass,
  rewardLabel,
  formatDeadline,
} from "@/components/bounty-utils";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

interface GitHubBounty {
  id: string;
  repoOwner: string;
  repoName: string;
  title: string;
  description: string;
  rewardAmount: string;
  rewardType: "USDC" | "USD" | "LLM_KEY";
  status: string;
  questType: string;
  maxWinners: number;
  deadline: string | null;
  issueNumber: number | null;
  issueUrl: string | null;
  createdAt: string;
  _count: { submissions: number };
}

type StatusTab = "all" | "open" | "in_review" | "completed";
type RewardFilter = "USDC" | "USD" | "LLM_KEY" | undefined;

function difficultyFromAmount(amount: string): {
  label: string;
  className: string;
} {
  const n = Number(amount);
  if (n < 100)
    return { label: "easy", className: "text-success border-success/30" };
  if (n < 500)
    return { label: "medium", className: "text-warning border-warning/30" };
  return { label: "hard", className: "text-error border-error/30" };
}

const STATUS_TABS: TabItem<StatusTab>[] = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "in_review", label: "In Review" },
  { id: "completed", label: "Completed" },
];

type RewardTab = "all" | "USDC" | "USD" | "LLM_KEY";

const REWARD_TABS: TabItem<RewardTab>[] = [
  { id: "all", label: "All" },
  { id: "USDC", label: "USDC" },
  { id: "USD", label: "USD (Fiat)" },
  { id: "LLM_KEY", label: "LLM Key" },
];

function filterBounties(
  bounties: GitHubBounty[],
  status: StatusTab,
): GitHubBounty[] {
  switch (status) {
    case "open":
      return bounties.filter(
        (b) => b.status === "live" && b._count.submissions === 0,
      );
    case "in_review":
      return bounties.filter(
        (b) => b.status === "live" && b._count.submissions > 0,
      );
    case "completed":
      return bounties.filter((b) => b.status === "completed");
    default:
      return bounties;
  }
}

export function GitHubBountiesExplore() {
  const { isAuthenticated } = useAuth();
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [rewardFilter, setRewardFilter] = useState<RewardFilter>(undefined);

  const { data, isLoading } = useQuery({
    queryKey: ["github-bounties", rewardFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "50" });
      if (rewardFilter) params.set("rewardType", rewardFilter);
      const res = await fetch(`${API_BASE}/github-bounties?${params}`);
      if (!res.ok) throw new Error("Failed to fetch bounties");
      return res.json() as Promise<{ bounties: GitHubBounty[]; total: number }>;
    },
  });

  const filtered = filterBounties(data?.bounties ?? [], statusTab);

  return (
    <div>
      <PageTitle
        title="GitHub Bounties"
        description="Fix open-source issues, earn USDC or LLM API keys"
        actions={
          isAuthenticated ? (
            <Button asChild>
              <Link to="/github-bounties/new" className="no-underline">
                <AddLine size={14} /> Post Bounty
              </Link>
            </Button>
          ) : undefined
        }
      />

      <TabBar
        tabs={STATUS_TABS}
        activeTab={statusTab}
        onTabChange={setStatusTab}
        tabCounts={
          data
            ? {
                open: filterBounties(data.bounties, "open").length,
                in_review: filterBounties(data.bounties, "in_review").length,
                completed: filterBounties(data.bounties, "completed").length,
              }
            : undefined
        }
      />

      <TabBar
        variant="sub"
        tabs={REWARD_TABS}
        activeTab={(rewardFilter ?? "all") as RewardTab}
        onTabChange={(id) =>
          setRewardFilter(id === "all" ? undefined : (id as RewardFilter))
        }
      />

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col gap-3 rounded border border-border-2 bg-bg-1 p-4 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="h-3 w-32 rounded bg-bg-2" />
                <div className="h-3 w-16 rounded bg-bg-2" />
              </div>
              <div className="h-4 w-3/4 rounded bg-bg-2" />
              <div className="flex gap-2">
                <div className="h-5 w-20 rounded-full bg-bg-2" />
                <div className="h-5 w-14 rounded-full bg-bg-2" />
              </div>
            </div>
          ))}
        </div>
      ) : !filtered.length ? (
        <div className="text-center py-12 space-y-3">
          <CodeFill size={48} className="mx-auto text-fg-3" />
          <p className="text-sm font-semibold text-fg-1">
            {statusTab === "all"
              ? "No bounties yet"
              : `No ${statusTab.replace("_", " ")} bounties`}
          </p>
          <p className="text-xs text-fg-3 max-w-[45ch] mx-auto">
            {statusTab === "all"
              ? "Be the first to post a GitHub bounty and attract contributors."
              : "Try a different filter."}
          </p>
          {isAuthenticated && statusTab === "all" && (
            <Button asChild variant="outline" size="sm">
              <Link to="/github-bounties/new" className="no-underline">
                Post the first bounty
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
          {filtered.map((bounty) => {
            const difficulty = difficultyFromAmount(bounty.rewardAmount);
            return (
              <Link
                key={bounty.id}
                to="/github-bounties/$bountyId"
                params={{ bountyId: bounty.id }}
                className="group flex flex-col gap-2 rounded border border-border-2 bg-bg-1 hover:border-fg-1 transition-colors p-4 no-underline"
              >
                <div className="flex items-center justify-between text-xs text-fg-3">
                  <span className="inline-flex items-center gap-1.5">
                    <GitHubIcon size={12} />
                    {bounty.repoOwner}/{bounty.repoName}
                    {bounty.issueNumber && (
                      <span className="opacity-60">#{bounty.issueNumber}</span>
                    )}
                  </span>
                  <span>
                    {bounty.maxWinners} winner
                    {bounty.maxWinners !== 1 ? "s" : ""}
                  </span>
                </div>
                <p className="text-sm font-semibold text-fg-1 leading-snug line-clamp-2">
                  {bounty.title}
                </p>
                <div className="flex items-center gap-2 flex-wrap mt-auto">
                  <Badge
                    variant="outline"
                    size="sm"
                    className={rewardBadgeClass(bounty.rewardType)}
                  >
                    {rewardLabel(bounty.rewardType, bounty.rewardAmount)}
                  </Badge>
                  {bounty.rewardType !== "LLM_KEY" && (
                    <Badge
                      variant="outline"
                      size="sm"
                      className={difficulty.className}
                    >
                      {difficulty.label}
                    </Badge>
                  )}
                  <span className="text-xs text-fg-3 flex items-center gap-1">
                    <GitBranchFill size={12} />
                    {bounty._count.submissions} PR
                    {bounty._count.submissions !== 1 ? "s" : ""}
                  </span>
                  {bounty.deadline && (
                    <span className="text-xs text-fg-3">
                      {formatDeadline(bounty.deadline)}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
