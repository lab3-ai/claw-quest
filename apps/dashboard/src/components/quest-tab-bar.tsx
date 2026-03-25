import { TabBar, GRID_VIEW_ICON, LIST_VIEW_ICON } from "@/components/tab-bar";
import type { TabItem, ViewOption } from "@/components/tab-bar";

/* ─── Quest-specific types & constants ─── */

export type QuestTab =
  | "featured"
  | "highest-reward"
  | "ending-soon"
  | "new"
  | "upcoming"
  | "ended";

/** @deprecated Use QuestTab instead */
export type Tab = QuestTab;

export type QuestView = "grid" | "compact";

/** @deprecated Use QuestView instead */
export type View = QuestView;

export const TAB_IDS: QuestTab[] = [
  "featured",
  "highest-reward",
  "ending-soon",
  "new",
  "upcoming",
  "ended",
];

const QUEST_TABS: TabItem<QuestTab>[] = [
  { id: "featured", label: "Featured" },
  { id: "highest-reward", label: "Highest Reward" },
  { id: "ending-soon", label: "Ending Soon" },
  { id: "new", label: "New" },
  { id: "upcoming", label: "Upcoming" },
  { id: "ended", label: "Ended" },
];

const QUEST_VIEW_OPTIONS: ViewOption<QuestView>[] = [
  { id: "grid", icon: GRID_VIEW_ICON, tooltip: "Grid view" },
  { id: "compact", icon: LIST_VIEW_ICON, tooltip: "Table view" },
];

/* ─── Component ─── */

interface QuestTabBarProps {
  tab: QuestTab;
  view: QuestView;
  tabCounts: Record<QuestTab, number>;
  onTabChange: (tab: QuestTab) => void;
  onViewChange: (view: QuestView) => void;
}

export function QuestTabBar({
  tab,
  view,
  tabCounts,
  onTabChange,
  onViewChange,
}: QuestTabBarProps) {
  return (
    <TabBar
      tabs={QUEST_TABS}
      activeTab={tab}
      onTabChange={onTabChange}
      tabCounts={tabCounts}
      viewOptions={QUEST_VIEW_OPTIONS}
      activeView={view}
      onViewChange={onViewChange}
    />
  );
}
