import { useState, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import type { Quest } from "@clawquest/shared";
import { formatTimeLeft } from "./quest-utils";
import { SponsorLogo } from "./sponsor-logo";
import {
  RunLine,
  TrophyLine,
  RandomLine,
  Group2Line,
  GiftLine,
} from "@mingcute/react";
import { TokenIcon } from "./token-icon";
import { QuestersAvatarStack } from "./QuestCard";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TYPE_ICON: Record<string, React.ElementType> = {
  FCFS: RunLine,
  LEADERBOARD: TrophyLine,
  LUCKY_DRAW: RandomLine,
};

interface QuestGridCardProps {
  quest: Quest;
}

export function QuestGridCard({ quest }: QuestGridCardProps) {
  const [, tick] = useState(0);
  const time = formatTimeLeft(quest.expiresAt);

  useEffect(() => {
    if (!time.ticking) return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [time.ticking]);
  const isLuckyDraw = quest.type === "LUCKY_DRAW";

  // Dynamic desc line-clamp: title 1 line → desc 3 lines, title 2 lines → desc 2 lines
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [descClamp, setDescClamp] = useState(3);
  useEffect(() => {
    if (!titleRef.current) return;
    const lineH =
      parseFloat(getComputedStyle(titleRef.current).lineHeight) || 22;
    const lines = Math.round(titleRef.current.scrollHeight / lineH);
    setDescClamp(lines >= 2 ? 2 : 3);
  }, [quest.title]);

  return (
    <Link
      to="/quests/$questId"
      params={{ questId: quest.id }}
      className="group hover-shadow flex flex-col h-full border border-border-2 rounded p-4 max-sm:p-3 no-underline text-fg-1 hover:border-fg-1 bg-bg-1"
    >
      {/* Reward + Time */}
      <div className="flex items-center justify-between mb-2">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
          <TokenIcon token={quest.rewardType} size={16} />
          {quest.rewardAmount.toLocaleString()} {quest.rewardType}
        </span>
        {quest.expiresAt && (
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
        )}
      </div>

      {/* Title — max 2 lines */}
      <h3
        ref={titleRef}
        className="text-md font-semibold leading-snug mb-1.5 line-clamp-2"
      >
        {quest.title}
      </h3>

      {/* Description — dynamic clamp: 3 lines if title 1 line, 2 lines if title 2 lines */}
      <p
        className={cn(
          "flex-1 text-xs text-fg-3 group-hover:text-fg-1 transition-colors leading-relaxed mb-3 overflow-hidden",
          descClamp === 2 ? "line-clamp-2" : "line-clamp-3",
        )}
      >
        {quest.description}
      </p>

      {/* Type badge + Tags (single row, overflow → +N) */}
      <div className="flex gap-1 mb-4 items-center overflow-hidden">
        <Badge
          variant="outline"
          className="uppercase shrink-0 text-2xs text-fg-3 group-hover:border-primary/40 group-hover:bg-primary/10 group-hover:text-primary transition-colors"
        >
          {TYPE_ICON[quest.type] &&
            (() => {
              const Icon = TYPE_ICON[quest.type];
              return <Icon size={14} />;
            })()}
          {quest.type.replace("_", " ")}
        </Badge>
        {quest.tags &&
          quest.tags.slice(0, 2).map((tag) => (
            <Badge
              key={tag}
              variant="pill"
              className="shrink-0 text-fg-3 group-hover:text-fg-1 transition-colors"
            >
              {tag}
            </Badge>
          ))}
        {quest.tags && quest.tags.length > 2 && (
          <span className="text-fg-3 px-1 py-0.5 text-xs shrink-0">
            +{quest.tags.length - 2}
          </span>
        )}
      </div>

      {/* Bottom stats */}
      <div className="mt-auto flex flex-col gap-3 pt-4 border-t border-border-2">
        {/* Progress */}
        {isLuckyDraw ? (
          <div className="flex flex-col border border-border-2 min-h-[26px] justify-center">
            <div className="flex items-center text-xs text-fg-3">
              <div className="flex items-center px-2 py-1 gap-1.5 w-full">
                <span className="w-full">
                  <strong className="text-fg-1">
                    {quest.filledSlots.toLocaleString()}
                  </strong>{" "}
                  entered
                </span>
                <Group2Line size={14} className="text-fg-3 shrink-0" />
              </div>
              <span className="text-border-2 h-full w-px bg-bg-3">·</span>
              <div className="flex items-center px-2 py-1 gap-1.5 w-full">
                <span className="w-full">
                  <strong className="text-fg-1">
                    {quest.totalSlots.toLocaleString()}
                  </strong>{" "}
                  rewards
                </span>
                <GiftLine size={14} className="text-fg-3 shrink-0" />
              </div>
            </div>
            {/* Spacer to match FCFS progress bar height */}
          </div>
        ) : (
          <div className="flex flex-col gap-1 min-h-[26px] justify-center">
            <div className="flex items-center justify-between text-xs">
              <span className="text-fg-3">
                <strong className="text-fg-1">
                  {quest.filledSlots.toLocaleString()}
                </strong>
                /{quest.totalSlots.toLocaleString()} slots
              </span>
              <span className="text-fg-3">
                <strong className="text-fg-1 font-semibold">
                  {(quest.totalSlots - quest.filledSlots).toLocaleString()}
                </strong>{" "}
                left
              </span>
            </div>
            <div className="flex gap-px w-full">
              {Array.from({ length: 10 }, (_, i) => {
                const pct =
                  quest.totalSlots > 0
                    ? (quest.filledSlots / quest.totalSlots) * 100
                    : 0;
                const segThreshold = (i + 1) * 10;
                const filled = pct >= segThreshold;
                const partial = !filled && pct > i * 10;
                return (
                  <div key={i} className="flex-1 h-1.5 bg-bg-3 overflow-hidden">
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

        {/* Sponsor + Questers */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-fg-3 flex items-center gap-1.5 leading-none">
            by <SponsorLogo sponsor={quest.sponsor} size={16} />{" "}
            <strong className="text-fg-1 font-semibold">{quest.sponsor}</strong>
          </span>
          {quest.questers > 0 && (
            <QuestersAvatarStack
              details={quest.questerDetails ?? []}
              total={quest.questers}
            />
          )}
        </div>
      </div>
    </Link>
  );
}
