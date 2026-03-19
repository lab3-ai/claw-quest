import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { QuestersAvatarStack } from "@/components/QuestCard";
import type { QuesterDetail } from "@/components/QuestCard";
import { QuestGridCard } from "@/components/QuestGridCard";
import { QuestersPopup } from "@/components/QuestersPopup";
import { SeoHead } from "@/components/seo-head";
import { formatTimeShort, typeColorClass } from "@/components/quest-utils";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RunLine, TrophyLine, RandomLine } from "@mingcute/react";
import { SponsorLogo } from "@/components/sponsor-logo";
import { PageTitle } from "@/components/page-title";
import { TokenIcon } from "@/components/token-icon";
import { AnimatedBanner } from "@/components/animated-banner";
import type { Quest } from "@clawquest/shared";

type Tab =
  | "featured"
  | "highest-reward"
  | "ending-soon"
  | "new"
  | "upcoming"
  | "ended";
type View = "grid" | "compact";

function isEnded(quest: Quest): boolean {
  if (!quest.expiresAt) return false;
  return new Date(quest.expiresAt).getTime() <= Date.now();
}

function filterAndSortQuests(quests: Quest[], tab: Tab): Quest[] {
  const live = quests.filter((q) => q.status === "live" && !isEnded(q));
  switch (tab) {
    case "featured":
      return [...live]
        .sort((a, b) => {
          const sa = a.rewardAmount * (1 + a.questers);
          const sb = b.rewardAmount * (1 + b.questers);
          return sb - sa;
        })
        .slice(0, 6);
    case "highest-reward":
      return [...live].sort((a, b) => b.rewardAmount - a.rewardAmount);
    case "ending-soon":
      return [...live]
        .filter((q) => q.expiresAt)
        .sort((a, b) => {
          const ta = new Date(a.expiresAt!).getTime();
          const tb = new Date(b.expiresAt!).getTime();
          return ta - tb;
        });
    case "new": {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const recent = live.filter(
        (q) => new Date(q.createdAt).getTime() >= weekAgo,
      );
      const source = recent.length >= 3 ? recent : live;
      return [...source].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }
    case "upcoming":
      return quests
        .filter((q) => q.status === "scheduled")
        .sort((a, b) => {
          const ta = a.startAt ? new Date(a.startAt).getTime() : Infinity;
          const tb = b.startAt ? new Date(b.startAt).getTime() : Infinity;
          return ta - tb;
        });
    case "ended":
      // Ended quests come from a separate query; just sort by most recently ended
      return [...quests].sort(
        (a, b) =>
          new Date(b.updatedAt ?? b.createdAt).getTime() -
          new Date(a.updatedAt ?? a.createdAt).getTime(),
      );
    default:
      return live;
  }
}

export function QuestList() {
  const { session } = useAuth();
  const { theme, colorMode } = useTheme();
  const navigate = useNavigate();
  const searchParams = useSearch({ strict: false }) as { tab?: string };
  const [tab, setTab] = useState<Tab>(() => {
    const validTabs = [
      "featured",
      "highest-reward",
      "ending-soon",
      "new",
      "upcoming",
      "ended",
    ];
    // URL ?tab param takes priority, then session storage, then default
    if (searchParams.tab && validTabs.includes(searchParams.tab))
      return searchParams.tab as Tab;
    const stored = sessionStorage.getItem("cq-quest-tab");
    return (stored && validTabs.includes(stored) ? stored : "featured") as Tab;
  });
  const [prevTab, setPrevTab] = useState<Tab>(tab);
  const [view, setView] = useState<View>(() => {
    const stored = sessionStorage.getItem("cq-quest-view");
    return (
      stored && ["grid", "compact"].includes(stored) ? stored : "grid"
    ) as View;
  });
  const [popupQuest, setPopupQuest] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const viewRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const tabScrollRef = useRef<HTMLDivElement>(null);
  const [showTabMask, setShowTabMask] = useState(true);
  const [tabIndicatorStyle, setTabIndicatorStyle] = useState<{
    left: number;
    width: number;
  }>({ left: 0, width: 0 });
  const [viewIndicatorStyle, setViewIndicatorStyle] = useState<{
    left: number;
    width: number;
  }>({ left: 0, width: 0 });

  const tabIds: Tab[] = [
    "featured",
    "highest-reward",
    "ending-soon",
    "new",
    "upcoming",
    "ended",
  ];
  const slideDir =
    tabIds.indexOf(tab) >= tabIds.indexOf(prevTab) ? "right" : "left";

  const handleTabChange = (newTab: Tab) => {
    setPrevTab(tab);
    setTab(newTab);
    sessionStorage.setItem("cq-quest-tab", newTab);
  };

  const handleViewChange = (newView: View) => {
    setView(newView);
    sessionStorage.setItem("cq-quest-view", newView);
  };

  const updateTabIndicator = useCallback(() => {
    const el = tabRefs.current[tab];
    if (el) {
      setTabIndicatorStyle({ left: el.offsetLeft, width: el.offsetWidth });
    }
  }, [tab]);

  const updateViewIndicator = useCallback(() => {
    const el = viewRefs.current[view];
    if (el) {
      setViewIndicatorStyle({ left: el.offsetLeft, width: el.offsetWidth });
    }
  }, [view]);

  useEffect(() => {
    updateTabIndicator();
  }, [updateTabIndicator]);
  useEffect(() => {
    updateViewIndicator();
  }, [updateViewIndicator]);

  const {
    data: quests = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["quests"],
    queryFn: async () => {
      const headers: HeadersInit = {};
      if (session?.access_token)
        headers.Authorization = `Bearer ${session.access_token}`;
      const res = await fetch(`${import.meta.env.VITE_API_URL}/quests`, {
        headers,
      });
      if (!res.ok) throw new Error("Failed to fetch quests");
      return res.json() as Promise<Quest[]>;
    },
    staleTime: 60_000,
  });

  const { data: endedQuests = [], isLoading: endedLoading } = useQuery({
    queryKey: ["quests-ended"],
    queryFn: async () => {
      const headers: HeadersInit = {};
      if (session?.access_token)
        headers.Authorization = `Bearer ${session.access_token}`;
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/quests?status=ended&limit=100`,
        { headers },
      );
      if (!res.ok) throw new Error("Failed to fetch ended quests");
      return res.json() as Promise<Quest[]>;
    },
    staleTime: 5 * 60_000,
    enabled: tab === "ended",
  });

  // Recalculate indicators on theme/mode change, data load, font load, and resize
  useEffect(() => {
    const recalc = () => {
      updateTabIndicator();
      updateViewIndicator();
    };
    document.fonts.ready.then(recalc);
    window.addEventListener("resize", recalc);
    return () => window.removeEventListener("resize", recalc);
  }, [
    theme,
    colorMode,
    isLoading,
    endedLoading,
    updateTabIndicator,
    updateViewIndicator,
  ]);

  const activeData = tab === "ended" ? endedQuests : quests;
  const sorted = filterAndSortQuests(activeData, tab);
  const tabCounts: Record<Tab, number> = {
    featured: filterAndSortQuests(quests, "featured").length,
    "highest-reward": filterAndSortQuests(quests, "highest-reward").length,
    "ending-soon": filterAndSortQuests(quests, "ending-soon").length,
    new: filterAndSortQuests(quests, "new").length,
    upcoming: filterAndSortQuests(quests, "upcoming").length,
    ended: endedQuests.length,
  };
  const tabs: { id: Tab; label: string }[] = [
    { id: "featured", label: "Featured" },
    { id: "highest-reward", label: "Highest Reward" },
    { id: "ending-soon", label: "Ending Soon" },
    { id: "new", label: "New" },
    { id: "upcoming", label: "Upcoming" },
    { id: "ended", label: "Ended" },
  ];

  const activeIsLoading = tab === "ended" ? endedLoading : isLoading;
  const emptyMessage =
    tab === "upcoming"
      ? "No upcoming quests scheduled."
      : tab === "ended"
        ? "No ended quests found."
        : "No active quests found.";

  return (
    <div className="quest-explore-page">
      <SeoHead
        title="Explore Quests"
        description="Browse live quests with real rewards. AI agents compete, human owners handle social tasks. Join now on ClawQuest."
        url="https://clawquest.ai/quests"
      />
      {popupQuest && (
        <QuestersPopup
          questId={popupQuest.id}
          questTitle={popupQuest.title}
          onClose={() => setPopupQuest(null)}
        />
      )}
      {/* Page header */}
      <PageTitle
        title="Quests"
        description="Agent-executable tasks with on-chain rewards"
      />

      {/* Tabs row + view toggle */}
      <div className="flex items-center gap-3 py-4">
        {/* Scrollable tabs with right fade mask on mobile */}
        <div className="relative flex-1 min-w-0">
          <div
            ref={tabScrollRef}
            onScroll={(e) => {
              const el = e.currentTarget;
              setShowTabMask(
                el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
              );
            }}
            className="relative flex items-center gap-4 lg:gap-6 max-lg:overflow-x-auto scrollbar-hide"
          >
            {/* Sliding underline indicator */}
            <span
              className="absolute bottom-0 h-[3px] bg-fg-1 rounded-full transition-all duration-200 ease-out"
              style={{
                left: tabIndicatorStyle.left,
                width: tabIndicatorStyle.width,
              }}
            />
            {tabs.map((t) => {
              const isActive = tab === t.id;
              return (
                <button
                  key={t.id}
                  ref={(el) => {
                    tabRefs.current[t.id] = el;
                  }}
                  className={cn(
                    "group/tab inline-flex items-center gap-2 py-1 pb-1.5 text-base cursor-pointer transition-colors duration-150 ease-out",
                    "font-medium whitespace-nowrap",
                    "text-sm max-sm:gap-1.5 lg:min-h-10",
                    isActive
                      ? "text-fg-1 font-semibold"
                      : "text-fg-3 hover:text-fg-1",
                  )}
                  onClick={() => handleTabChange(t.id)}
                >
                  {t.label}
                  {tabCounts[t.id] > 0 && (
                    <Badge variant={isActive ? "count" : "count-outline"}>
                      {tabCounts[t.id]}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
          {/* Right fade mask — hints at scrollable content, hides when scrolled to end */}
          <div
            className={cn(
              "pointer-events-none absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-bg-base to-transparent lg:hidden transition-opacity duration-200",
              showTabMask ? "opacity-100" : "opacity-0",
            )}
          />
        </div>
        <TooltipProvider delayDuration={300}>
          <div className="relative inline-flex border border-border-2 p-0.5 gap-0.5 rounded-button overflow-hidden ml-auto shrink-0 max-lg:hidden">
            {/* Sliding highlight */}
            <span
              className="absolute top-0.5 bottom-0.5 rounded-button bg-bg-3 transition-all duration-200 ease-out z-0"
              style={{
                left: viewIndicatorStyle.left,
                width: viewIndicatorStyle.width,
              }}
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  ref={(el) => {
                    viewRefs.current["grid"] = el;
                  }}
                  className={cn(
                    "relative z-10 flex items-center justify-center w-7 h-7 cursor-pointer border-none [&_svg]:w-3.5 [&_svg]:h-3.5 transition-colors duration-150",
                    "max-sm:flex-1 max-sm:w-auto",
                    view === "grid" ? "text-fg-1" : "text-fg-3 hover:text-fg-1",
                  )}
                  onClick={() => handleViewChange("grid")}
                >
                  <svg
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <rect x="1" y="1" width="6" height="6" rx="1" />
                    <rect x="9" y="1" width="6" height="6" rx="1" />
                    <rect x="1" y="9" width="6" height="6" rx="1" />
                    <rect x="9" y="9" width="6" height="6" rx="1" />
                  </svg>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Grid view
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  ref={(el) => {
                    viewRefs.current["compact"] = el;
                  }}
                  className={cn(
                    "relative z-10 flex items-center justify-center w-7 h-7 cursor-pointer border-none [&_svg]:w-3.5 [&_svg]:h-3.5 transition-colors duration-150",
                    "max-sm:flex-1 max-sm:w-auto",
                    view === "compact"
                      ? "text-fg-1"
                      : "text-fg-3 hover:text-fg-1",
                  )}
                  onClick={() => handleViewChange("compact")}
                >
                  <svg
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <line x1="1" y1="2" x2="15" y2="2" />
                    <line x1="1" y1="5.5" x2="15" y2="5.5" />
                    <line x1="1" y1="9" x2="15" y2="9" />
                    <line x1="1" y1="12.5" x2="15" y2="12.5" />
                  </svg>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Table view
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>

      {/* Loading skeletons — match active view */}
      {activeIsLoading && view === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="flex flex-col border border-border-2 rounded p-4 pointer-events-none"
            >
              <div className="flex justify-between items-center mb-3">
                <div className="animate-pulse bg-bg-3 rounded w-[70px] h-5" />
                <div className="animate-pulse bg-bg-3 rounded w-[50px] h-4" />
              </div>
              <div className="animate-pulse bg-bg-3 rounded w-4/5 h-4 mb-2" />
              <div className="animate-pulse bg-bg-3 rounded w-full h-3 mb-1.5" />
              <div className="animate-pulse bg-bg-3 rounded w-3/5 h-3 mb-3" />
              <div className="flex gap-1 mb-3">
                <div className="animate-pulse bg-bg-3 rounded w-[50px] h-5" />
                <div className="animate-pulse bg-bg-3 rounded w-[40px] h-5" />
              </div>
              <div className="mt-auto pt-3 border-t border-border-2 flex justify-between items-end">
                <div>
                  <div className="animate-pulse bg-bg-3 rounded w-[80px] h-4 mb-1" />
                  <div className="animate-pulse bg-bg-3 rounded w-[60px] h-3" />
                </div>
                <div className="animate-pulse bg-bg-3 rounded w-[50px] h-4" />
              </div>
            </div>
          ))}
        </div>
      )}
      {activeIsLoading && view !== "grid" && (
        <div className="block">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex gap-4 py-3.5 border-b border-border-2 items-start pointer-events-none"
            >
              <div className="hidden sm:flex flex-col items-end gap-1.5 min-w-[110px] pt-0.5">
                <div className="animate-pulse bg-bg-3 rounded w-[50px] h-5 mb-1" />
                <div className="animate-pulse bg-bg-3 rounded w-[70px] h-3" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="animate-pulse bg-bg-3 rounded w-3/5 h-4 mb-2" />
                <div className="animate-pulse bg-bg-3 rounded w-[90%] h-3 mb-2.5" />
                <div className="animate-pulse bg-bg-3 rounded w-2/5 h-3" />
              </div>
              <div className="hidden sm:flex flex-col items-end min-w-[100px] pt-0.5 shrink-0">
                <div className="animate-pulse bg-bg-3 rounded w-[70px] h-[18px]" />
              </div>
            </div>
          ))}
        </div>
      )}
      {error && <div className="py-8 text-error">Error loading quests.</div>}

      {/* Tab content with slide animation */}
      <div
        key={`${tab}-${view}`}
        className={cn(
          "animate-in fade-in-0 duration-200",
          slideDir === "right"
            ? "slide-in-from-right-3"
            : "slide-in-from-left-3",
        )}
      >
        {/* Grid view */}
        {!activeIsLoading &&
          view === "grid" &&
          (sorted.length === 0 ? (
            <div className="py-12 text-center text-fg-3">{emptyMessage}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-sm:gap-3">
              {sorted.map((quest) => (
                <QuestGridCard key={quest.id} quest={quest} />
              ))}
            </div>
          ))}

        {/* List view (card rows) */}
        {/* Compact list (table) view */}
        {!activeIsLoading && view === "compact" && (
          <div className="block overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 max-sm:pb-2">
            <div className="sm:hidden text-xs text-fg-3 mb-2 text-center flex items-center justify-center gap-1 animate-pulse">
              <span>←</span> Swipe to view all columns <span>→</span>
            </div>
            <table className="w-full min-w-[640px] border border-border-2 border-b-0 rounded bg-bg-1 overflow-hidden border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-normal text-fg-3 uppercase tracking-wide border-b border-border-2 bg-transparent whitespace-nowrap cursor-default select-none min-w-36">
                    Reward
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-normal text-fg-3 uppercase tracking-wide border-b border-border-2 bg-transparent whitespace-nowrap cursor-default select-none min-w-60">
                    Name
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-normal text-fg-3 uppercase tracking-wide border-b border-border-2 bg-transparent whitespace-nowrap cursor-default select-none">
                    Type
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-normal text-fg-3 uppercase tracking-wide border-b border-border-2 bg-transparent whitespace-nowrap cursor-default select-none">
                    Questers
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-normal text-fg-3 uppercase tracking-wide border-b border-border-2 bg-transparent whitespace-nowrap cursor-default select-none">
                    Slots
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-normal text-fg-3 uppercase tracking-wide border-b border-border-2 bg-transparent whitespace-nowrap cursor-default select-none">
                    Time Left
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-4 text-xs border-b border-border-2 align-top text-center py-8 text-fg-3"
                    >
                      {emptyMessage}
                    </td>
                  </tr>
                ) : (
                  sorted.map((quest) => {
                    const time = formatTimeShort(quest.expiresAt);
                    return (
                      <tr
                        key={quest.id}
                        className="hover:bg-bg-2 cursor-pointer transition-colors"
                        onClick={() =>
                          navigate({
                            to: "/quests/$questId",
                            params: { questId: quest.id },
                          })
                        }
                      >
                        <td className="px-4 py-4 text-xs border-b border-border-2 align-top whitespace-nowrap">
                          <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary whitespace-nowrap">
                            <TokenIcon token={quest.rewardType} size={16} />
                            {quest.rewardAmount.toLocaleString()}{" "}
                            {quest.rewardType}
                          </span>
                        </td>
                        <td className="px-4 pt-4 pb-4 text-xs border-b border-border-2 align-top min-w-60">
                          <div className="text-base font-semibold leading-snug -mt-0.5 font-heading">
                            {quest.title}
                          </div>
                          <div className="text-xs text-fg-3 leading-snug line-clamp-3 hidden">
                            {quest.description}
                          </div>
                          <div className="text-xs text-fg-3 inline-flex items-center mt-1 gap-1">
                            by <SponsorLogo sponsor={quest.sponsor} size={14} />{" "}
                            <strong className="text-fg-1 font-semibold">
                              {quest.sponsor}
                            </strong>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-xs border-b border-border-2 align-top">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 text-xs font-semibold uppercase",
                              typeColorClass(quest.type),
                            )}
                          >
                            {quest.type === "FCFS" && <RunLine size={14} />}
                            {quest.type === "LEADERBOARD" && (
                              <TrophyLine size={14} />
                            )}
                            {quest.type === "LUCKY_DRAW" && (
                              <RandomLine size={14} />
                            )}
                            {quest.type}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-xs border-b border-border-2 align-top whitespace-nowrap">
                          {quest.questers > 0 ? (
                            <QuestersAvatarStack
                              details={
                                (quest.questerDetails ?? []) as QuesterDetail[]
                              }
                              total={quest.questers}
                              onClick={(e) => {
                                e.stopPropagation();
                                setPopupQuest({
                                  id: quest.id,
                                  title: quest.title,
                                });
                              }}
                            />
                          ) : (
                            <span className="text-xs text-fg-3">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-xs border-b border-border-2 align-top text-right">
                          {quest.totalSlots - quest.filledSlots}
                        </td>
                        <td className="px-4 py-4 text-xs border-b border-border-2 align-top text-right">
                          <div
                            className={cn(
                              "font-mono text-xs whitespace-nowrap",
                              time.cls === "warning" && "text-warning",
                              time.cls === "urgent" && "text-error",
                              time.cls === "normal" && "text-fg-1",
                              time.cls === "muted" && "text-fg-3 font-normal",
                            )}
                          >
                            {time.label}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Animated banner — only on featured tab */}
      {tab === "featured" && (
        <div className="mt-6 sm:mt-12">
          <AnimatedBanner />
        </div>
      )}
    </div>
  );
}
