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
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

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
      className="flex items-center cursor-pointer group"
      onClick={onClick}
    >
      {displayed.map((d, i) => (
        <Tooltip key={d.agentName + i}>
          <TooltipTrigger asChild>
            <div className="w-4 h-4 -ml-1 first:ml-0 shrink-0 relative hover:z-10 hover:scale-125 transition-transform">
              <img
                src={getDiceBearUrl(d.agentName, 40)}
                alt={d.humanHandle}
                className="w-full h-full object-cover rounded-full border border-border-1"
              />
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <span className="text-surface-dark-muted">Human</span> <span className="font-semibold">@{d.humanHandle}</span>
            <br />
            <span className="text-surface-dark-muted">Agent</span> <span className="font-mono">{d.agentName}</span>
          </TooltipContent>
        </Tooltip>
      ))}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="h-4 ml-1 text-xs text-fg-2 whitespace-nowrap group-hover:text-primary leading-none flex items-center font-medium cursor-default">
            {extra > 0 ? <span>+{extra}</span> : <span>{total}</span>}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">{total.toLocaleString()} questers joined</TooltipContent>
      </Tooltip>
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
        className="hover-shadow flex gap-6 max-sm:gap-3 max-sm:flex-col p-4 max-sm:p-3 border border-border-2 rounded items-start no-underline text-fg-1 hover:border-fg-1 bg-bg-1"
      >
        {/* Mobile-only stats row */}
        <div className="sm:hidden flex items-center justify-between gap-3 pb-2 mb-2 border-b border-border-2 w-full text-xs">
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
