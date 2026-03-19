import { useState } from "react";
import { Link } from "@tanstack/react-router";
import type { Quest } from "@clawquest/shared";
import { getDiceBearUrl } from "./avatarUtils";
import { SponsorLogo } from "./sponsor-logo";
import { QuestersPopup } from "./QuestersPopup";
import { RunLine, TrophyLine, RandomLine } from "@mingcute/react";
import { formatTimeLeft, typeColorClass } from "./quest-utils";
import { TokenIcon } from "./token-icon";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TYPE_ICON: Record<string, React.ElementType> = {
  FCFS: RunLine,
  LEADERBOARD: TrophyLine,
  LUCKY_DRAW: RandomLine,
};

interface QuestCardProps {
  quest: Quest;
}

export interface QuesterDetail {
  agentName: string;
  humanHandle: string;
}

interface QuestersAvatarStackProps {
  details: QuesterDetail[];
  total: number;
  onClick?: (e: React.MouseEvent) => void;
}

export function QuestersAvatarStack({
  details,
  total,
  onClick,
}: QuestersAvatarStackProps) {
  if (total === 0) return null;
  const displayed = details.slice(0, 5);
  const extra = total - displayed.length;

  return (
    <div
      className="flex items-center justify-baseline cursor-pointer group"
      title={`${total} questers`}
      onClick={onClick}
    >
      {displayed.map((d, i) => (
        <div
          key={d.agentName + i}
          className="group/avatar w-4 h-4 ml-0.5 shrink-0 relative overflow-visible hover:z-10 hover:-translate-y-px transition-transform"
        >
          <img
            src={getDiceBearUrl(d.agentName, 40)}
            alt={d.humanHandle}
            className="w-full h-full object-cover"
          />
          <div className="hidden group-hover/avatar:block absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 bg-fg-1 text-white text-xs px-2 py-1.5 rounded whitespace-nowrap z-100 pointer-events-none leading-relaxed text-left after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-fg-1">
            <span className="text-surface-dark-muted text-xs">Human</span>{" "}
            <span className="font-semibold text-white">@{d.humanHandle}</span>
            <br />
            <span className="text-surface-dark-muted text-xs">Agent</span>{" "}
            <span className="font-semibold text-surface-dark-muted font-mono text-xs">
              {d.agentName}
            </span>
          </div>
        </div>
      ))}
      <div className="h-4 ml-1 mt-0.5 text-xs text-fg-2 whitespace-nowrap group-hover:text-primary leading-none flex items-center font-medium">
        {extra > 0 ? (
          <span className="">+{extra}</span>
        ) : (
          <span className="">{total}</span>
        )}
      </div>
    </div>
  );
}

export function QuestCard({ quest }: QuestCardProps) {
  const time = formatTimeLeft(quest.expiresAt);
  const isLuckyDraw = quest.type === "LUCKY_DRAW";
  const slotsLeft = isLuckyDraw
    ? Infinity
    : quest.totalSlots - quest.filledSlots;
  const [showPopup, setShowPopup] = useState(false);

  return (
    <>
      {showPopup && (
        <QuestersPopup
          questId={quest.id}
          questTitle={quest.title}
          onClose={() => setShowPopup(false)}
        />
      )}
      <Link
        to="/quests/$questId"
        params={{ questId: quest.id }}
        className="hover-shadow flex gap-6 max-sm:gap-3 max-sm:flex-col p-4 max-sm:p-3 border border-border rounded items-start no-underline text-fg-1 hover:border-fg-1 bg-bg-1"
      >
        {/* Mobile-only stats row */}
        <div className="sm:hidden flex items-center justify-between gap-3 pb-2 mb-2 border-b border-border w-full text-xs">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-success">
            <TokenIcon token={quest.rewardType} size={14} />
            {quest.rewardAmount.toLocaleString()} {quest.rewardType}
          </span>
          <span
            className={cn(
              "font-mono text-sm font-semibold",
              time.cls === "urgent" && "text-error",
              time.cls === "warning" && "text-warning",
            )}
          >
            {time.label}
          </span>
        </div>

        {/* Stats column (desktop only) */}
        <div className="hidden sm:flex flex-col items-end gap-1.5 w-[140px] shrink-0 text-xs text-fg-3 text-right pt-0.5">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-success">
            <TokenIcon token={quest.rewardType} size={16} />
            {quest.rewardAmount.toLocaleString()} {quest.rewardType}
          </span>
          {quest.questers > 0 && (
            <div className="flex flex-col items-end">
              <QuestersAvatarStack
                details={quest.questerDetails ?? []}
                total={quest.questers}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowPopup(true);
                }}
              />
            </div>
          )}
          <div className="flex flex-col items-end">
            {isLuckyDraw ? (
              <>
                <span className="text-sm font-semibold text-fg-1 leading-tight">
                  {quest.filledSlots}
                </span>
                <span className="text-xs text-fg-3">entered</span>
              </>
            ) : (
              <>
                <span
                  className={cn(
                    "text-sm font-semibold leading-tight",
                    slotsLeft < 5 ? "text-error" : "text-fg-1",
                  )}
                >
                  {slotsLeft}
                </span>
                <span className="text-xs text-fg-3">slots left</span>
              </>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 text-xs">
            <span
              className={cn(
                "inline-flex items-center gap-1 font-semibold uppercase",
                typeColorClass(quest.type),
              )}
            >
              {TYPE_ICON[quest.type] &&
                (() => {
                  const Icon = TYPE_ICON[quest.type];
                  return <Icon size={14} />;
                })()}
              {quest.type}
            </span>
            <span className="w-1 h-1 rounded-full bg-border inline-block"></span>
            <span className="text-fg-3 inline-flex items-center gap-1">
              by <SponsorLogo sponsor={quest.sponsor} size={14} />{" "}
              <strong className="text-fg-1 font-semibold">
                {quest.sponsor}
              </strong>
            </span>
          </div>
          <div className="text-base max-sm:text-sm font-semibold mb-1 font-heading">
            {quest.title}
          </div>
          <div className="text-xs text-fg-3 mb-2 leading-relaxed line-clamp-3">
            {quest.description}
          </div>
          {quest.tags && quest.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 max-sm:gap-1 items-center text-xs">
              {quest.tags.map((tag) => (
                <Badge key={tag} variant="pill">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Time column */}
        <div className="hidden sm:flex flex-col items-end justify-start min-w-[100px] text-right pt-0.5 shrink-0">
          <span
            className={cn(
              "font-mono text-sm font-semibold text-fg-1 leading-tight whitespace-nowrap",
              time.cls === "urgent" && "text-error",
              time.cls === "warning" && "text-warning",
            )}
          >
            {time.label}
          </span>
          {time.sublabel && (
            <span className="text-xs text-fg-3 mt-0.5">{time.sublabel}</span>
          )}
        </div>
      </Link>
    </>
  );
}
