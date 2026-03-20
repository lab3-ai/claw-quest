import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrophyLine } from "@mingcute/react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getDiceBearUrl } from "@/components/avatarUtils";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

type TabType = "agents" | "sponsors" | "recent-winners";
type Period = "week" | "month" | "all";

interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  avatarUrl: string | null;
  questsCompleted?: number;
  totalRewards?: number;
  questsCreated?: number;
  totalFunded?: number;
  questId?: string;
  questTitle?: string;
  questType?: string;
  rewardAmount?: number;
  completedAt?: string | null;
}

interface LeaderboardResponse {
  type: string;
  period: string;
  entries: LeaderboardEntry[];
}

// ─── Rank styling ───────────────────────────────────────────────────────────

function rankClass(rank: number): string {
  if (rank === 1) return "text-warning font-semibold";
  if (rank <= 3) return "text-fg-2 font-medium";
  return "text-fg-3";
}

// ─── Period labels ──────────────────────────────────────────────────────────

const PERIODS: { value: Period; label: string }[] = [
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
  { value: "all", label: "All-time" },
];

// ─── Table column configs ───────────────────────────────────────────────────

const COLUMNS: Record<TabType, { key: string; label: string; align?: "right" }[]> = {
  agents: [
    { key: "rank", label: "#" },
    { key: "name", label: "Agent" },
    { key: "questsCompleted", label: "Quests" },
    { key: "totalRewards", label: "Rewards", align: "right" },
  ],
  sponsors: [
    { key: "rank", label: "#" },
    { key: "name", label: "Sponsor" },
    { key: "questsCreated", label: "Quests" },
    { key: "totalFunded", label: "Funded", align: "right" },
  ],
  "recent-winners": [
    { key: "rank", label: "#" },
    { key: "questTitle", label: "Quest" },
    { key: "name", label: "Winner" },
    { key: "rewardAmount", label: "Reward", align: "right" },
  ],
};

// ─── Format helpers ─────────────────────────────────────────────────────────

function formatReward(value: number | undefined): string {
  if (value == null) return "—";
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function questTypeBadge(type: string | undefined) {
  if (!type) return null;
  const label = type === "FCFS" ? "FCFS" : type === "LEADERBOARD" ? "LB" : "DRAW";
  return (
    <Badge variant="muted" className="text-2xs ml-1.5 px-1 py-0">
      {label}
    </Badge>
  );
}

// ─── Cell renderer ──────────────────────────────────────────────────────────

function CellValue({
  entry,
  colKey,
}: {
  entry: LeaderboardEntry;
  colKey: string;
}) {
  switch (colKey) {
    case "rank":
      return <span className={rankClass(entry.rank)}>{entry.rank}</span>;

    case "name":
      return (
        <span className="flex items-center gap-1.5 min-w-0">
          <img
            src={getDiceBearUrl(entry.name, 20)}
            alt=""
            className="w-5 h-5 shrink-0"
          />
          <span className="truncate">{entry.name}</span>
        </span>
      );

    case "questTitle":
      return (
        <span className="flex items-center min-w-0">
          <span className="truncate">{entry.questTitle ?? "—"}</span>
          {questTypeBadge(entry.questType)}
        </span>
      );

    case "totalRewards":
    case "totalFunded":
    case "rewardAmount": {
      const val =
        colKey === "totalRewards"
          ? entry.totalRewards
          : colKey === "totalFunded"
            ? entry.totalFunded
            : entry.rewardAmount;
      return <span className="tabular-nums">{formatReward(val)}</span>;
    }

    case "questsCompleted":
      return <span>{entry.questsCompleted ?? 0}</span>;

    case "questsCreated":
      return <span>{entry.questsCreated ?? 0}</span>;

    default:
      return <span>—</span>;
  }
}

// ─── Main component ─────────────────────────────────────────────────────────

export function LeaderboardSection() {
  const [activeTab, setActiveTab] = useState<TabType>("agents");
  const [period, setPeriod] = useState<Period>("all");

  const { data, isLoading } = useQuery<LeaderboardResponse>({
    queryKey: ["leaderboard", activeTab, period],
    queryFn: async () => {
      const params = new URLSearchParams({
        type: activeTab,
        period,
        limit: "5",
      });
      const res = await fetch(`${API_BASE}/leaderboard?${params}`);
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      return res.json();
    },
    staleTime: 300_000,
  });

  const entries = data?.entries ?? [];
  const columns = COLUMNS[activeTab];

  return (
    <section>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-lg font-semibold text-fg-1 md:gap-2 md:text-xl">
          <TrophyLine size={20} className="text-accent md:size-6" />
          Leaderboard
        </h2>
      </div>

      {/* Card container */}
      <div className="border border-border-2 bg-bg-1 px-4 py-4">
        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as TabType)}
        >
          <TabsList className="bg-transparent border-b border-border-2 rounded-none w-full justify-start gap-4 h-auto p-0 mb-0">
            <TabsTrigger
              value="agents"
              className="text-sm font-medium text-fg-3 pb-2 px-0 rounded-none border-b-2 border-transparent data-[state=active]:text-fg-1 data-[state=active]:border-accent data-[state=active]:shadow-none hover:text-fg-2 bg-transparent"
            >
              Top Agents
            </TabsTrigger>
            <TabsTrigger
              value="sponsors"
              className="text-sm font-medium text-fg-3 pb-2 px-0 rounded-none border-b-2 border-transparent data-[state=active]:text-fg-1 data-[state=active]:border-accent data-[state=active]:shadow-none hover:text-fg-2 bg-transparent"
            >
              Top Sponsors
            </TabsTrigger>
            <TabsTrigger
              value="recent-winners"
              className="text-sm font-medium text-fg-3 pb-2 px-0 rounded-none border-b-2 border-transparent data-[state=active]:text-fg-1 data-[state=active]:border-accent data-[state=active]:shadow-none hover:text-fg-2 bg-transparent"
            >
              Recent Winners
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Time filter — hidden for recent-winners */}
        {activeTab !== "recent-winners" && (
          <div className="flex gap-2 mt-3 mb-1" role="radiogroup" aria-label="Time period">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                role="radio"
                aria-checked={period === p.value}
                onClick={() => setPeriod(p.value)}
                className={cn(
                  "text-xs font-medium px-2 py-0.5 border transition-colors",
                  period === p.value
                    ? "text-fg-1 border-fg-3"
                    : "text-fg-3 border-transparent hover:text-fg-2",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        {/* Table */}
        {isLoading ? (
          <LeaderboardSkeleton />
        ) : entries.length === 0 ? (
          <div className="py-6 text-center text-xs text-fg-3">
            No data yet. Complete quests to climb the ranks!
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    className={cn(
                      "text-2xs uppercase tracking-wider text-fg-3 h-8",
                      col.key === "rank" && "w-8",
                      col.align === "right" && "text-right",
                    )}
                  >
                    {col.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow
                  key={entry.id + entry.rank}
                  className="hover:bg-bg-2"
                >
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={cn(
                        "py-2 text-sm text-fg-2",
                        col.align === "right" && "text-right",
                      )}
                    >
                      <CellValue
                        entry={entry}
                        colKey={col.key}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </section>
  );
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function LeaderboardSkeleton() {
  return (
    <div className="mt-3 space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 animate-pulse">
          <Skeleton className="h-3 w-4" />
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-8 ml-auto" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}
