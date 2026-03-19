import { useState } from "react";
import { Link } from "@tanstack/react-router";
import type { Quest } from "@clawquest/shared";
import { getDiceBearUrl } from "./avatarUtils";
import { SponsorLogo } from "./sponsor-logo";
import { QuestersPopup } from "./QuestersPopup";
import { RunLine, TrophyLine, RandomLine } from "@mingcute/react";
import { formatTimeLeft } from "./quest-utils";
import { TokenIcon } from "./token-icon";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

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
      className="flex items-center cursor-pointer group/avatars"
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
            <span className="text-surface-dark-muted">Human</span>{" "}
            <span className="font-semibold">@{d.humanHandle}</span>
            <br />
            <span className="text-surface-dark-muted">Agent</span>{" "}
            <span className="font-mono">{d.agentName}</span>
          </TooltipContent>
        </Tooltip>
      ))}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="h-4 ml-1 text-xs text-fg-3 whitespace-nowrap group-hover/avatars:text-primary leading-none flex items-center cursor-default">
            {extra > 0 ? <span>+{extra}</span> : <span>{total}</span>}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">
          {total.toLocaleString()} questers joined
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export function QuestCard({ quest }: QuestCardProps) {
  const time = formatTimeLeft(quest.expiresAt);
  const isLuckyDraw = quest.type === "LUCKY_DRAW";
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
        className="group hover-shadow flex gap-8 max-sm:flex-col p-4 max-sm:p-3 border border-border-2 rounded no-underline text-fg-1 hover:border-fg-1 bg-bg-1"
      >
        {/* Left column: Reward + Timer + Progress */}
        <div className="flex flex-col gap-2 w-50 max-sm:w-full shrink-0 max-sm:flex-row max-sm:items-center max-sm:justify-between max-sm:pb-2 max-sm:mb-2 max-sm:border-b max-sm:border-border-2">
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
            <TokenIcon token={quest.rewardType} size={16} />
            {quest.rewardAmount.toLocaleString()} {quest.rewardType}
          </span>
          <span
            className={cn(
              "font-mono text-xs font-normal tracking-wide",
              time.cls === "urgent" && "text-error",
              time.cls === "warning" && "text-warning",
              time.cls === "normal" && "text-fg-3",
            )}
          >
            {time.label}
          </span>
          {/* Progress (desktop) */}
          <div className="max-sm:hidden">
            {isLuckyDraw ? (
              <span className="text-xs text-fg-3">
                <strong className="text-fg-1 font-semibold">
                  {quest.filledSlots.toLocaleString()}
                </strong>{" "}
                entered
              </span>
            ) : (
              <div className="flex flex-col gap-1">
                <span className="text-xs text-fg-3">
                  <strong className="text-fg-1">
                    {quest.filledSlots.toLocaleString()}
                  </strong>
                  /{quest.totalSlots.toLocaleString()} slots
                </span>
                <div className="flex gap-px w-full">
                  {Array.from({ length: 10 }, (_, i) => {
                    const pct =
                      quest.totalSlots > 0
                        ? (quest.filledSlots / quest.totalSlots) * 100
                        : 0;
                    const filled = pct >= (i + 1) * 10;
                    const partial = !filled && pct > i * 10;
                    return (
                      <div
                        key={i}
                        className="flex-1 h-1.5 bg-bg-3 overflow-hidden"
                      >
                        {(filled || partial) && (
                          <div
                            className="h-full bg-primary"
                            style={{
                              width: partial
                                ? `${((pct - i * 10) / 10) * 100}%`
                                : "100%",
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          {/* Questers (desktop) */}
          {quest.questers > 0 && (
            <div className="max-sm:hidden">
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
        </div>

        {/* Right: Body */}
        <div className="flex-1 min-w-0">
          <div className="text-base max-sm:text-sm font-semibold mb-1 font-heading">
            {quest.title}
          </div>
          <div className="text-xs text-fg-3 group-hover:text-fg-1 transition-colors mb-2 leading-relaxed line-clamp-1">
            {quest.description}
          </div>

          {/* Type + Tags */}
          <div className="flex gap-1 items-center overflow-hidden">
            <Badge
              variant="outline"
              className="uppercase shrink-0 text-2xs text-fg-3 group-hover:border-primary/40 group-hover:bg-primary/10 group-hover:text-primary transition-colors"
            >
              {TYPE_ICON[quest.type] &&
                (() => {
                  const Icon = TYPE_ICON[quest.type];
                  return <Icon size={12} />;
                })()}
              {quest.type.replace("_", " ")}
            </Badge>
            {quest.tags &&
              quest.tags.slice(0, 3).map((tag) => (
                <Badge
                  key={tag}
                  variant="pill"
                  className="shrink-0 text-fg-3 group-hover:text-fg-1 transition-colors"
                >
                  {tag}
                </Badge>
              ))}
            {quest.tags && quest.tags.length > 3 && (
              <span className="text-fg-3 px-1 py-0.5 text-xs shrink-0">
                +{quest.tags.length - 3}
              </span>
            )}
          </div>

          {/* Sponsor + Questers (desktop) */}
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-fg-3 flex items-center gap-1.5 leading-none">
              by <SponsorLogo sponsor={quest.sponsor} size={16} />{" "}
              <strong className="text-fg-1 font-semibold">
                {quest.sponsor}
              </strong>
            </span>
          </div>
        </div>
      </Link>
    </>
  );
}
