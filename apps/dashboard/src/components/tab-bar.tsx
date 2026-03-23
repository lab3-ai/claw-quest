import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/* ─── Types ─── */

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
}

export interface ViewOption<V extends string = string> {
  id: V;
  icon: ReactNode;
  tooltip: string;
}

export interface SubFilter<S extends string = string> {
  id: S;
  label: string;
  count: number;
}

interface TabBarProps<
  T extends string,
  V extends string,
  S extends string = string,
> {
  tabs: TabItem<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  /** "main" = underline tabs (default), "sub" = smaller pill/chip tabs */
  variant?: "main" | "sub";
  /** Optional count badge per tab */
  tabCounts?: Partial<Record<T, number>>;
  /** Optional view toggle options (e.g. grid/compact). Hidden on mobile by default */
  viewOptions?: ViewOption<V>[];
  activeView?: V;
  onViewChange?: (view: V) => void;
  /** Optional sub-filter pills below the tab row */
  subFilters?: SubFilter<S>[];
  activeSubFilter?: S;
  onSubFilterChange?: (filter: S) => void;
  className?: string;
}

/* ─── Icons ─── */

export const GRID_VIEW_ICON = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="1" y="1" width="6" height="6" rx="1" />
    <rect x="9" y="1" width="6" height="6" rx="1" />
    <rect x="1" y="9" width="6" height="6" rx="1" />
    <rect x="9" y="9" width="6" height="6" rx="1" />
  </svg>
);

export const LIST_VIEW_ICON = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <line x1="1" y1="2" x2="15" y2="2" />
    <line x1="1" y1="5.5" x2="15" y2="5.5" />
    <line x1="1" y1="9" x2="15" y2="9" />
    <line x1="1" y1="12.5" x2="15" y2="12.5" />
  </svg>
);

/* ─── Component ─── */

export function TabBar<
  T extends string,
  V extends string,
  S extends string = string,
>({
  tabs,
  activeTab,
  onTabChange,
  variant = "main",
  tabCounts,
  viewOptions,
  activeView,
  onViewChange,
  subFilters,
  activeSubFilter,
  onSubFilterChange,
  className,
}: TabBarProps<T, V, S>) {
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const viewRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const tabScrollRef = useRef<HTMLDivElement>(null);
  const [showTabMask, setShowTabMask] = useState(true);
  const [tabIndicatorStyle, setTabIndicatorStyle] = useState({
    left: 0,
    width: 0,
  });
  const [viewIndicatorStyle, setViewIndicatorStyle] = useState({
    left: 0,
    width: 0,
  });

  const updateTabIndicator = useCallback(() => {
    const el = tabRefs.current[activeTab];
    if (el) {
      setTabIndicatorStyle({ left: el.offsetLeft, width: el.offsetWidth });
    }
  }, [activeTab]);

  const updateViewIndicator = useCallback(() => {
    if (!activeView) return;
    const el = viewRefs.current[activeView];
    if (el) {
      setViewIndicatorStyle({ left: el.offsetLeft, width: el.offsetWidth });
    }
  }, [activeView]);

  useEffect(() => {
    updateTabIndicator();
  }, [updateTabIndicator]);

  useEffect(() => {
    updateViewIndicator();
  }, [updateViewIndicator]);

  // Recalculate on font load and resize
  useEffect(() => {
    const recalc = () => {
      updateTabIndicator();
      updateViewIndicator();
    };
    document.fonts.ready.then(recalc);
    window.addEventListener("resize", recalc);
    return () => window.removeEventListener("resize", recalc);
  }, [updateTabIndicator, updateViewIndicator]);

  const hasViewToggle =
    viewOptions && viewOptions.length > 0 && activeView && onViewChange;

  const hasSubFilters =
    subFilters &&
    subFilters.length > 0 &&
    activeSubFilter !== undefined &&
    onSubFilterChange;

  /* ── Sub variant: compact pill/chip tabs ── */
  if (variant === "sub") {
    return (
      <div
        className={cn(
          "flex items-center gap-1.5 pb-3 overflow-x-auto scrollbar-hide flex-wrap",
          className,
        )}
      >
        {tabs.map((t) => {
          const isActive = activeTab === t.id;
          const count = tabCounts?.[t.id] ?? 0;
          return (
            <button
              key={t.id}
              className={cn(
                "cursor-pointer inline-flex items-center gap-1.5 px-3 py-1 text-xs whitespace-nowrap rounded border transition-colors",
                isActive
                  ? "border-fg-1 bg-fg-1 text-bg-1 font-semibold"
                  : "border-border-2 bg-transparent text-fg-1 hover:text-fg-1 hover:border-fg-3",
              )}
              onClick={() => onTabChange(t.id)}
            >
              {t.label}
              {count > 0 && (
                <span
                  className={cn(
                    "text-xs",
                    isActive ? "opacity-70" : "opacity-50",
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  /* ── Main variant: underline tabs ── */
  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-center gap-3 pt-2 pb-3">
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
              const isActive = activeTab === t.id;
              const count = tabCounts?.[t.id] ?? 0;
              return (
                <button
                  key={t.id}
                  ref={(el) => {
                    tabRefs.current[t.id] = el;
                  }}
                  className={cn(
                    "group/tab inline-flex items-center gap-2 pb-0.5 text-base font-medium tracking-tight cursor-pointer transition-colors duration-150 ease-out",
                    "whitespace-nowrap",
                    "max-sm:gap-1.5 lg:min-h-10",
                    isActive
                      ? "text-fg-1 font-semibold"
                      : "text-fg-3 hover:text-fg-1",
                  )}
                  onClick={() => onTabChange(t.id)}
                >
                  {t.label}
                  {count > 0 && (
                    <Badge
                      variant={isActive ? "count" : "count-outline"}
                      size="sm"
                    >
                      {count}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
          {/* Right fade mask — hints at scrollable content */}
          <div
            className={cn(
              "pointer-events-none absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-bg-base to-transparent lg:hidden transition-opacity duration-200",
              showTabMask ? "opacity-100" : "opacity-0",
            )}
          />
        </div>

        {/* View toggle */}
        {hasViewToggle && (
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
              {viewOptions.map((opt) => (
                <Tooltip key={opt.id}>
                  <TooltipTrigger asChild>
                    <button
                      ref={(el) => {
                        viewRefs.current[opt.id] = el;
                      }}
                      className={cn(
                        "relative z-10 flex items-center justify-center w-7 h-7 cursor-pointer border-none [&_svg]:w-3.5 [&_svg]:h-3.5 transition-colors duration-150",
                        activeView === opt.id
                          ? "text-fg-1"
                          : "text-fg-3 hover:text-fg-1",
                      )}
                      onClick={() => onViewChange(opt.id)}
                    >
                      {opt.icon}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {opt.tooltip}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>
        )}
      </div>

      {/* Sub-filter pills */}
      {hasSubFilters && (
        <div className="flex items-center gap-1.5 pb-3 flex-wrap">
          {subFilters.map((f) =>
            f.count > 0 ? (
              <button
                key={f.id}
                className={cn(
                  "cursor-pointer inline-flex items-center gap-1.5 px-3 py-1 text-xs whitespace-nowrap rounded border transition-colors",
                  activeSubFilter === f.id
                    ? "border-fg-1 bg-fg-1 text-bg-1 font-semibold"
                    : "border-border-2 bg-transparent text-fg-1 hover:text-fg-1 hover:border-fg-3",
                )}
                onClick={() => onSubFilterChange(f.id)}
              >
                {f.label}
                <span
                  className={cn(
                    "text-xs",
                    activeSubFilter === f.id ? "opacity-70" : "opacity-50",
                  )}
                >
                  {f.count}
                </span>
              </button>
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}
