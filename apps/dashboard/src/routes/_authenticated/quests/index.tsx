import { useState, useEffect } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { QuestersAvatarStack } from "@/components/QuestCard";
import type { QuesterDetail } from "@/components/QuestCard";
import { QuestGridCard } from "@/components/QuestGridCard";
import { QuestersPopup } from "@/components/QuestersPopup";
import { SeoHead } from "@/components/seo-head";
import { formatTimeShort } from "@/components/quest-utils";
import { QuestTabBar, TAB_IDS } from "@/components/quest-tab-bar";
import type { Tab, View } from "@/components/quest-tab-bar";

import { cn } from "@/lib/utils";
import { SponsorLogo } from "@/components/sponsor-logo";
import { PageTitle } from "@/components/page-title";
import { TokenIcon } from "@/components/token-icon";
import { QuestTypeBadge } from "@/components/quest-badges";
import { AnimatedBanner } from "@/components/animated-banner";
import type { Quest } from "@clawquest/shared";

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
  const navigate = useNavigate();
  const searchParams = useSearch({ strict: false }) as { tab?: string };
  const [tab, setTab] = useState<Tab>(() => {
    const validTabs: string[] = TAB_IDS;
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

  // Auto-switch to grid on mobile (compact/table not available below lg)
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const handler = (e: MediaQueryListEvent) => {
      if (!e.matches && view === "compact") {
        setView("grid");
        sessionStorage.setItem("cq-quest-view", "grid");
      }
    };
    if (!mql.matches && view === "compact") {
      setView("grid");
      sessionStorage.setItem("cq-quest-view", "grid");
    }
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [view]);
  const [popupQuest, setPopupQuest] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const slideDir =
    TAB_IDS.indexOf(tab) >= TAB_IDS.indexOf(prevTab) ? "right" : "left";

  const handleTabChange = (newTab: Tab) => {
    setPrevTab(tab);
    setTab(newTab);
    sessionStorage.setItem("cq-quest-tab", newTab);
  };

  const handleViewChange = (newView: View) => {
    setView(newView);
    sessionStorage.setItem("cq-quest-view", newView);
  };

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
      <QuestTabBar
        tab={tab}
        view={view}
        tabCounts={tabCounts}
        onTabChange={handleTabChange}
        onViewChange={handleViewChange}
      />

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
              className="flex gap-4 py-4 border-b border-border-2 items-start pointer-events-none"
            >
              <div className="hidden sm:flex flex-col items-end gap-1.5 min-w-[110px] pt-0.5">
                <div className="animate-pulse bg-bg-3 rounded w-[50px] h-5 mb-1" />
                <div className="animate-pulse bg-bg-3 rounded w-[70px] h-3" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="animate-pulse bg-bg-3 rounded w-3/5 h-4 mb-2" />
                <div className="animate-pulse bg-bg-3 rounded w-[90%] h-3 mb-3" />
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
                  <th className="text-left px-4 py-3 text-xs font-normal text-fg-3 uppercase tracking-wide border-b border-border-2 bg-transparent whitespace-nowrap cursor-default select-none min-w-60">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-normal text-fg-3 uppercase tracking-wide border-b border-border-2 bg-transparent whitespace-nowrap cursor-default select-none min-w-36">
                    Reward
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-normal text-fg-3 uppercase tracking-wide border-b border-border-2 bg-transparent whitespace-nowrap cursor-default select-none">
                    Type
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-normal text-fg-3 uppercase tracking-wide border-b border-border-2 bg-transparent whitespace-nowrap cursor-default select-none">
                    Questers
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-normal text-fg-3 uppercase tracking-wide border-b border-border-2 bg-transparent whitespace-nowrap cursor-default select-none">
                    Slots
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-normal text-fg-3 uppercase tracking-wide border-b border-border-2 bg-transparent whitespace-nowrap cursor-default select-none">
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
                        className="group hover:bg-bg-2 cursor-pointer transition-colors"
                        onClick={() =>
                          navigate({
                            to: "/quests/$questId",
                            params: { questId: quest.id },
                          })
                        }
                      >
                        <td className="px-4 pt-4 pb-4 text-xs border-b border-border-2 align-top min-w-60">
                          <div className="text-base font-semibold leading-snug -mt-0.5 font-heading group-hover:text-primary transition-colors">
                            {quest.title}
                          </div>
                          <div className="text-xs text-fg-3 inline-flex items-center mt-1 gap-1">
                            by <SponsorLogo sponsor={quest.sponsor} size={14} />{" "}
                            <strong className="text-fg-1 font-semibold">
                              {quest.sponsor}
                            </strong>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-xs border-b border-border-2 align-top whitespace-nowrap">
                          <span className="inline-flex items-center gap-2 text-sm font-semibold whitespace-nowrap">
                            <TokenIcon token={quest.rewardType} size={16} />
                            {quest.rewardAmount.toLocaleString()}{" "}
                            {quest.rewardType}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-xs border-b border-border-2 align-top">
                          <QuestTypeBadge type={quest.type} />
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
        <div className="mt-8 sm:mt-12">
          <AnimatedBanner />
        </div>
      )}
    </div>
  );
}
