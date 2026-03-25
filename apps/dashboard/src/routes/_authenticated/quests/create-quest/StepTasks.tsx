import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PlatformIcon } from "@/components/PlatformIcon";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CheckFill,
  User3Fill,
  AiFill,
  AddLine,
  Edit2Line,
  Delete2Line,
  SearchLine,
  CloseLine,
} from "@mingcute/react";
import { cn } from "@/lib/utils";
import type { ClawHubSkill } from "@/hooks/useSkillSearch";

type ActionDef = {
  type: string;
  label: string;
  fields:
    | "follow"
    | "post_url"
    | "post_content"
    | "quote_post"
    | "discord_join"
    | "discord_role"
    | "telegram_join";
};

const PLATFORM_ICON_KEYS: Record<string, "x" | "discord" | "telegram"> = {
  X: "x",
  Discord: "discord",
  Telegram: "telegram",
};

function PlatformBtnIcon({ platform }: { platform: string }) {
  const key = PLATFORM_ICON_KEYS[platform];
  if (!key) return <span>{platform[0]}</span>;
  return <PlatformIcon name={key} size={16} colored />;
}

// Set to null to show all task types; use Set(["like_post", "repost", "post"]) to hide until backend verification
const HIDDEN_ACTION_TYPES: Set<string> | null = null;

const PLATFORM_ACTIONS: Record<string, ActionDef[]> = {
  X: [
    { type: "follow_account", label: "Follow on X", fields: "follow" },
    { type: "like_post", label: "Like a Post", fields: "post_url" },
    { type: "repost", label: "Repost a Post", fields: "post_url" },
    { type: "post", label: "Post on X", fields: "post_content" },
    { type: "quote_post", label: "Quote a Post", fields: "quote_post" },
  ],
  Discord: [
    {
      type: "join_server",
      label: "Join a Discord Server",
      fields: "discord_join",
    },
    {
      type: "verify_role",
      label: "Verify Role in Discord",
      fields: "discord_role",
    },
  ],
  Telegram: [
    {
      type: "join_channel",
      label: "Join a Group or Channel",
      fields: "telegram_join",
    },
  ],
};

interface SocialEntry {
  platform: string;
  action: string;
  actionType: string;
  icon: string;
  params: Record<string, string>;
  chips: string[];
  requireTagFriends?: boolean;
}

type Skill =
  | Pick<ClawHubSkill, "id" | "name" | "desc" | "agents" | "version">
  | ClawHubSkill;

interface TaskValidationError {
  index: number;
  field: string;
  message: string;
}

type ChipStatus = "pending" | "valid" | "invalid";

interface StepTasksProps {
  isActive: boolean;
  isDone: boolean;
  isValid: boolean;
  isFuture: boolean;
  stepSummary?: string;
  activePlatform: string | null;
  expandedTask: number | null;
  humanTasks: SocialEntry[];
  requiredSkills: Skill[];
  requireVerified: boolean;
  skillSearch: string;
  skillSearchResults: ClawHubSkill[];
  skillSearchLoading: boolean;
  showSkillResults: boolean;
  urlFetching: boolean;
  urlPreview: ClawHubSkill | null;
  urlFetchError: string | null;
  taskErrors: TaskValidationError[];
  addedSkillIds: Set<string>;
  expandedDescs: Set<string>;
  onToggle: () => void;
  onSetActivePlatform: (platform: string | null) => void;
  onAddHumanTask: (platform: string, action: ActionDef) => void;
  onRemoveHumanTask: (index: number) => void;
  onSetExpandedTask: (index: number | null) => void;
  onSetTaskParam: (index: number, key: string, value: string) => void;
  onToggleTagFriends: (index: number) => void;
  onAddChip: (index: number, value: string) => void;
  onRemoveChip: (index: number, chipIndex: number) => void;
  onSetRequireVerified: (value: boolean) => void;
  onSetSkillSearch: (value: string) => void;
  onSetShowSkillResults: (show: boolean) => void;
  onAddSkill: (skill: ClawHubSkill) => void;
  onRemoveSkill: (id: string) => void;
  onSetUrlFetching: (fetching: boolean) => void;
  onSetUrlPreview: (preview: ClawHubSkill | null) => void;
  onSetUrlFetchError: (error: string | null) => void;
  onToggleDesc: (id: string) => void;
  onTruncateDesc: (text: string, id: string) => React.ReactNode;
  onChipStatus: (
    platform: string,
    actionType: string,
    value: string,
  ) => ChipStatus | undefined;
  onPrevious: () => void;
  tasksNextAttempted: boolean;
  onTasksNext: () => void;
  SocialEntryBody: React.ComponentType<{
    task: SocialEntry;
    idx: number;
    setTaskParam: (i: number, key: string, val: string) => void;
    toggleTagFriends: (i: number) => void;
    addChip: (i: number, value: string) => void;
    removeChip: (i: number, chipIdx: number) => void;
    errors?: TaskValidationError[];
    chipStatus?: (value: string) => ChipStatus | undefined;
  }>;
  isSkillUrl: (url: string) => boolean;
  fetchSkillFromUrl: (url: string) => Promise<ClawHubSkill | null>;
}

export function StepTasks({
  isActive,
  isDone,
  isValid,
  isFuture,
  stepSummary,
  activePlatform,
  expandedTask,
  humanTasks,
  requiredSkills,
  requireVerified,
  skillSearch,
  skillSearchResults,
  skillSearchLoading,
  showSkillResults,
  urlFetching,
  urlPreview,
  urlFetchError,
  taskErrors,
  addedSkillIds,
  onToggle,
  onSetActivePlatform,
  onAddHumanTask,
  onRemoveHumanTask,
  onSetExpandedTask,
  onSetTaskParam,
  onToggleTagFriends,
  onAddChip,
  onRemoveChip,
  onSetRequireVerified,
  onSetSkillSearch,
  onSetShowSkillResults,
  onAddSkill,
  onRemoveSkill,
  onSetUrlFetching,
  onSetUrlPreview,
  onSetUrlFetchError,
  onTruncateDesc,
  onChipStatus,
  onPrevious,
  tasksNextAttempted,
  onTasksNext,
  SocialEntryBody,
  isSkillUrl,
  fetchSkillFromUrl,
}: StepTasksProps) {
  return (
    <div
      className={cn(
        "relative mb-0 border-none rounded-none",
        "before:content-[''] before:absolute before:left-[13px] before:top-0 before:bottom-0 before:w-0.5 before:bg-border before:z-0",
        isDone && "before:bg-success",
      )}
    >
      <div
        className="flex items-start gap-3 py-4 cursor-pointer select-none text-xs relative z-1 group"
        onClick={onToggle}
      >
        <span
          className={cn(
            "relative z-10 size-7 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold text-white border-2 border-background",
            isDone
              ? "bg-success shadow-[0_0_0_2px_var(--color-green-500)]"
              : isActive
                ? "bg-primary shadow-[0_0_0_2px_var(--primary)]"
                : "bg-gray-300 shadow-[0_0_0_2px_var(--color-gray-300)]",
          )}
        >
          {isDone ? <CheckFill size={12} /> : "2"}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-fg-1 group-hover:text-primary">
              Tasks
            </span>
          </div>
          <div className="text-xs text-fg-3 mt-0.5 leading-snug truncate">
            {!isActive && stepSummary && stepSummary !== "No tasks"
              ? stepSummary
              : "Human social actions and agent skill requirements"}
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5 shrink-0 pt-0.5">
          <span className="text-xs text-fg-3 whitespace-nowrap">
            Step 2 of 4
          </span>
          <span
            className={cn(
              "text-xs whitespace-nowrap",
              isFuture ? "text-fg-3" : "text-primary",
            )}
          >
            {isDone ? "Modify if required" : isActive ? "" : "Add tasks"}
          </span>
        </div>
      </div>
      {isActive && (
        <div className="pl-10 pb-4">
          <div className="p-4 sm:p-6 border border-border-2 rounded bg-bg-1">
            <div className="space-y-4 mb-6">
              <div className="text-sm text-fg-1 mb-3.5 leading-snug">
                Define what needs to be done. Human tasks are social actions.
                Agent tasks require specific skills from{" "}
                <a
                  href="https://clawhub.ai/skills"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline"
                >
                  ClawHub
                </a>
                .
              </div>
              {tasksNextAttempted &&
                humanTasks.length === 0 &&
                requiredSkills.length === 0 && (
                  <div className="px-3 py-3 bg-warning-light border border-warning rounded text-xs text-fg-1 mb-4">
                    <strong>At least one task is required:</strong> add a human
                    (social) task or an agent skill from ClawHub.
                  </div>
                )}

              {/* ── Human Tasks ── */}
              <div className="mb-6 border border-border-2 rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 text-sm font-semibold px-4 py-3 border-b border-border-2 bg-bg-2">
                  <User3Fill size={16} className="text-(--human-fg)" /> Human
                  Tasks
                  <Badge variant="outline-primary" size="sm">
                    Social
                  </Badge>
                  <span className="font-normal text-xs text-fg-3 ml-auto">
                    Actions performed by the operator
                  </span>
                </div>
                <div className="p-0">
                  {humanTasks.length > 0 && (
                    <div className="p-4 border-b border-border-2">
                      {humanTasks.map((task, i) => (
                        <div
                          key={i}
                          className="border border-border-2 rounded mb-2 last:mb-0"
                          data-platform={task.platform.toLowerCase()}
                        >
                          <div className="flex items-start gap-2 px-3 py-2 bg-bg-2/50 text-sm select-none">
                            <span className="text-sm shrink-0 mt-0.5">
                              <PlatformBtnIcon platform={task.platform} />
                            </span>
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold text-fg-1 truncate block">
                                {task.action}
                              </span>
                              {task.chips.length > 0 ||
                              task.params["content"] ? (
                                <span className="text-xs text-fg-3 truncate block mt-0.5">
                                  {task.chips.length > 0
                                    ? task.chips
                                        .slice(0, 3)
                                        .map((c) =>
                                          task.actionType === "follow_account"
                                            ? `@${c.replace(/^@/, "")}`
                                            : c,
                                        )
                                        .join(", ") +
                                      (task.chips.length > 3
                                        ? ` +${task.chips.length - 3}`
                                        : "")
                                    : task.params["content"]!.slice(0, 50) +
                                      (task.params["content"]!.length > 50
                                        ? "…"
                                        : "")}
                                </span>
                              ) : (
                                <span className="text-xs text-warning truncate block mt-0.5">
                                  Not configured — click edit
                                </span>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              iconOnly
                              onClick={() =>
                                onSetExpandedTask(expandedTask === i ? null : i)
                              }
                            >
                              <Edit2Line size={14} />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              iconOnly
                              onClick={() => onRemoveHumanTask(i)}
                            >
                              <Delete2Line size={14} />
                            </Button>
                          </div>
                          <Dialog
                            open={expandedTask === i}
                            onOpenChange={(open) => {
                              if (
                                !open &&
                                task.chips.length === 0 &&
                                !task.params["content"]
                              ) {
                                onRemoveHumanTask(i);
                              }
                              onSetExpandedTask(open ? i : null);
                            }}
                          >
                            <DialogContent>
                              <DialogHeader align="left">
                                <DialogTitle className="flex items-center gap-2">
                                  <PlatformBtnIcon platform={task.platform} />
                                  {task.action}
                                </DialogTitle>
                                <DialogDescription>
                                  Configure the details for this {task.platform}{" "}
                                  task.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogBody>
                                <SocialEntryBody
                                  task={task}
                                  idx={i}
                                  setTaskParam={onSetTaskParam}
                                  toggleTagFriends={onToggleTagFriends}
                                  addChip={onAddChip}
                                  removeChip={onRemoveChip}
                                  errors={taskErrors}
                                  chipStatus={(v) =>
                                    onChipStatus(
                                      task.platform.toLowerCase(),
                                      task.actionType,
                                      v,
                                    )
                                  }
                                />
                              </DialogBody>
                              <DialogFooter className="flex! justify-end gap-2 space-x-0!">
                                <Button
                                  variant="outline"
                                  size="lg"
                                  onClick={() => {
                                    // Remove task if no data was entered
                                    if (
                                      task.chips.length === 0 &&
                                      !task.params["content"]
                                    ) {
                                      onRemoveHumanTask(i);
                                    }
                                    onSetExpandedTask(null);
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="lg"
                                  onClick={() => onSetExpandedTask(null)}
                                >
                                  {task.chips.length > 0 ||
                                  task.params["content"]
                                    ? "Save"
                                    : "Add Task"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tab picker for adding new tasks */}
                  <div className="p-4">
                    <div className="flex border-b border-border-2 mb-3 gap-6">
                      {Object.keys(PLATFORM_ACTIONS).map((p) => (
                        <button
                          key={p}
                          className={cn(
                            "flex items-center gap-2 py-2 text-sm font-medium cursor-pointer transition-colors border-b-3 -mb-px",
                            activePlatform === p
                              ? "border-fg-1 text-fg-1"
                              : "border-transparent text-fg-3 hover:text-fg-1 hover:border-border",
                          )}
                          onClick={() => onSetActivePlatform(p)}
                        >
                          <PlatformIcon
                            name={PLATFORM_ICON_KEYS[p] ?? "x"}
                            size={16}
                            colored
                          />
                          {p}
                        </button>
                      ))}
                    </div>
                    {activePlatform && (
                      <div className="flex flex-col gap-2">
                        {PLATFORM_ACTIONS[activePlatform]
                          .filter((a) => !HIDDEN_ACTION_TYPES?.has(a.type))
                          .map((action) => (
                            <div
                              key={action.type}
                              className="group/row flex items-center justify-between px-3 py-2 bg-bg-2/50 rounded border border-border-2 text-sm cursor-pointer transition-colors hover:bg-bg-2"
                              onClick={() =>
                                onAddHumanTask(activePlatform, action)
                              }
                            >
                              <span className="font-medium text-fg-1">
                                {action.label}
                              </span>
                              <Button
                                variant="default-tonal"
                                size="sm"
                                className="group-hover/row:bg-primary! group-hover/row:text-primary-foreground! transition-colors"
                              >
                                <AddLine size={14} />
                                Add
                              </Button>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Agent Tasks ── */}
              <div className="mb-6 border border-border-2 rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 text-sm font-semibold px-4 py-3 border-b border-border-2 bg-bg-2">
                  <AiFill size={16} className="text-(--agent-fg)" /> Agent Tasks
                  <Badge variant="outline-primary" size="sm">
                    Skill
                  </Badge>
                  <span className="font-normal text-xs text-fg-3 ml-auto">
                    Required skills from ClawHub
                  </span>
                </div>
                <div className="p-4">
                  <div className="bg-bg-2 border border-border-2 rounded px-3 py-2.5 text-sm text-fg-2 leading-relaxed mb-4">
                    Agents must have{" "}
                    <code className="font-mono text-xs bg-bg-3 px-1">
                      clawquest
                    </code>{" "}
                    installed + each required skill below. CQ checks
                    capabilities before submission.
                  </div>

                  <div className="text-sm font-semibold text-fg-1 mt-3 mb-2">
                    Required Skills
                  </div>
                  {requiredSkills.length === 0 ? (
                    <div className="text-sm text-fg-3 py-1 pb-2">
                      No skills required yet. Search below to add.
                    </div>
                  ) : (
                    <div className="mt-2">
                      {requiredSkills.map((skill) => {
                        const isCustom = skill.id.startsWith("http");
                        return (
                          <div
                            key={skill.id}
                            className="flex items-start gap-4 px-3 py-2 border border-border-2 rounded mb-2 last:mb-0 bg-bg-2/50"
                          >
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold text-sm text-fg-1 truncate block">
                                {isCustom
                                  ? skill.name
                                  : `${skill.id}@${skill.version ?? "latest"}`}
                              </span>
                              <span className="text-xs text-fg-3 truncate block mt-0.5">
                                {skill.desc}
                              </span>
                              <div className="mt-1">
                                {isCustom ? (
                                  <Badge variant="outline-muted" size="sm">
                                    custom
                                  </Badge>
                                ) : (
                                  <Badge variant="outline-primary" size="sm">
                                    {skill.agents} agents
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              iconOnly
                              onClick={() => onRemoveSkill(skill.id)}
                            >
                              <Delete2Line size={14} />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Require verified toggle */}
                  {requiredSkills.length > 0 && (
                    <label className="flex items-center gap-2 my-4 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={requireVerified}
                        onChange={(e) => onSetRequireVerified(e.target.checked)}
                        className="accent-accent size-3.5"
                      />
                      <span className="text-xs text-fg-1 font-medium">
                        Require verified skills
                      </span>
                      <span className="text-xs text-fg-3">
                        — only agents who ran Skill Scan can join
                      </span>
                    </label>
                  )}

                  <div className="mb-3">
                    <div className="relative">
                      <SearchLine
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-3 pointer-events-none z-10"
                      />
                      <Input
                        className="pl-9"
                        type="text"
                        placeholder="Search on ClawHub or paste skill URL…"
                        value={skillSearch}
                        onChange={(e) => {
                          const val = e.target.value;
                          onSetSkillSearch(val);
                          onSetShowSkillResults(true);
                          onSetUrlFetchError(null);
                          onSetUrlPreview(null);
                          if (isSkillUrl(val.trim())) {
                            onSetUrlFetching(true);
                            fetchSkillFromUrl(val.trim())
                              .then((skill) => {
                                onSetUrlPreview(skill);
                                if (!skill)
                                  onSetUrlFetchError(
                                    "Could not parse skill.md from this URL",
                                  );
                              })
                              .catch(() =>
                                onSetUrlFetchError("Failed to fetch URL"),
                              )
                              .finally(() => onSetUrlFetching(false));
                          }
                        }}
                        onFocus={() => onSetShowSkillResults(true)}
                      />
                    </div>

                    {/* URL-based skill preview */}
                    {showSkillResults &&
                      isSkillUrl(skillSearch.trim()) &&
                      (urlFetching || urlPreview || urlFetchError) && (
                        <div className="border border-border-2 rounded bg-bg-base overflow-hidden overflow-y-auto mb-3 max-h-[360px]">
                          <div className="px-3 py-1.5 text-xs text-fg-3 bg-bg-3/50 border-b border-border-2 flex justify-between">
                            <span>
                              {urlFetching
                                ? "Fetching skill.md…"
                                : urlPreview
                                  ? "Skill found"
                                  : "Error"}
                            </span>
                            <Button
                              variant="ghost"
                              size="xs"
                              iconOnly
                              onClick={() => onSetShowSkillResults(false)}
                            >
                              <CloseLine size={14} />
                            </Button>
                          </div>
                          {urlFetching && (
                            <div className="p-3 text-center text-fg-3 text-xs">
                              Fetching skill.md…
                            </div>
                          )}
                          {urlFetchError && !urlFetching && (
                            <div className="p-3 text-center text-destructive text-xs">
                              {urlFetchError}. Ensure the URL points to a public
                              skill.md file.
                            </div>
                          )}
                          {urlPreview &&
                            !urlFetching &&
                            (() => {
                              const isAdded = addedSkillIds.has(urlPreview.id);
                              return (
                                <div
                                  className={cn(
                                    "flex items-start gap-3 px-3 py-2 border-b border-border-2 cursor-pointer transition-colors overflow-hidden last:border-b-0 hover:bg-bg-3",
                                    isAdded &&
                                      "opacity-50 cursor-default bg-bg-3/50",
                                  )}
                                  onClick={() =>
                                    !isAdded && onAddSkill(urlPreview)
                                  }
                                >
                                  <div className="flex-1 min-w-0 overflow-hidden">
                                    <div className="text-xs font-semibold text-primary flex items-center gap-1.5 truncate">
                                      <span className="inline-flex items-center justify-center text-xs font-semibold uppercase px-1.5 py-px rounded bg-blue-100 text-info mr-1 tracking-wide shrink-0">
                                        URL
                                      </span>
                                      <span className="truncate">
                                        {urlPreview.name}
                                      </span>
                                    </div>
                                    <div className="text-xs text-fg-3 leading-snug mt-0.5 wrap-break-word">
                                      {onTruncateDesc(
                                        urlPreview.desc,
                                        urlPreview.id,
                                      )}
                                    </div>
                                    <div className="flex gap-3 text-xs text-fg-3 mt-0.5">
                                      <span>v{urlPreview.version}</span>
                                      {urlPreview.ownerHandle && (
                                        <span
                                          className="font-mono text-xs text-fg-3"
                                          title={urlPreview.id}
                                        >
                                          {urlPreview.ownerHandle}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {isAdded ? (
                                    <Badge
                                      variant="outline-success"
                                      size="sm"
                                      className="self-center"
                                    >
                                      <CheckFill size={12} /> Added
                                    </Badge>
                                  ) : (
                                    <button className="bg-transparent border border-(--agent-border) text-(--agent-fg) text-xs font-semibold py-1 px-3 rounded cursor-pointer whitespace-nowrap self-center hover:bg-(--agent-bg)">
                                      + Add
                                    </button>
                                  )}
                                </div>
                              );
                            })()}
                        </div>
                      )}

                    {/* ClawHub search results */}
                    {showSkillResults &&
                      !isSkillUrl(skillSearch.trim()) &&
                      skillSearch.length >= 2 &&
                      (skillSearchResults.length > 0 || skillSearchLoading) && (
                        <div className="border border-border-2 rounded bg-bg-1 overflow-hidden overflow-y-auto mb-3 max-h-[360px]">
                          <div className="px-3 py-1.5 text-xs text-fg-3 bg-bg-3/50 border-b border-border-2 flex justify-between">
                            <span>
                              {skillSearchLoading
                                ? `Searching "${skillSearch}"…`
                                : `${skillSearchResults.length} results for "${skillSearch}"`}
                            </span>
                            <Button
                              variant="ghost"
                              size="xs"
                              iconOnly
                              onClick={() => onSetShowSkillResults(false)}
                            >
                              <CloseLine size={14} />
                            </Button>
                          </div>
                          {skillSearchLoading &&
                            skillSearchResults.length === 0 && (
                              <div className="p-3 text-center text-fg-3 text-xs">
                                Searching ClawHub…
                              </div>
                            )}
                          {skillSearchResults.map((s) => {
                            const isAdded = addedSkillIds.has(s.id);
                            return (
                              <div
                                key={s.id}
                                className={cn(
                                  "flex items-start gap-3 px-4 py-3 border-b border-border-2 cursor-pointer transition-colors overflow-hidden last:border-b-0 hover:bg-bg-2",
                                  isAdded &&
                                    "opacity-50 cursor-default bg-bg-3/50",
                                )}
                                onClick={() => !isAdded && onAddSkill(s)}
                              >
                                <div className="flex-1 min-w-0 overflow-hidden">
                                  <div className="text-xs font-semibold text-primary flex items-center gap-1.5 truncate">
                                    {s.ownerImage ? (
                                      <img
                                        src={s.ownerImage}
                                        alt={
                                          s.ownerDisplayName ?? s.ownerHandle
                                        }
                                        className="w-4 h-4 rounded-full shrink-0 object-cover"
                                      />
                                    ) : (
                                      <span className="w-4 h-4 rounded-full shrink-0 bg-bg-3 flex items-center justify-center text-[9px] font-semibold text-fg-3 uppercase">
                                        {(
                                          s.ownerDisplayName ?? s.ownerHandle
                                        ).charAt(0)}
                                      </span>
                                    )}
                                    <span className="text-fg-3 font-normal shrink-0">
                                      {s.ownerDisplayName ?? s.id.split("/")[0]}{" "}
                                      /
                                    </span>
                                    <span className="truncate">{s.name}</span>
                                  </div>
                                  <div className="text-xs text-fg-3 leading-snug mt-0.5 wrap-break-word">
                                    {onTruncateDesc(s.desc, s.id)}
                                  </div>
                                  <div className="flex gap-3 text-xs text-fg-3 mt-0.5">
                                    <span>↓ {s.downloads}</span>
                                    <span>★ {s.stars}</span>
                                    <span>v{s.version}</span>
                                  </div>
                                </div>
                                {isAdded ? (
                                  <Badge
                                    variant="outline-success"
                                    size="sm"
                                    className="self-center"
                                  >
                                    <CheckFill size={12} /> Added
                                  </Badge>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="self-center"
                                  >
                                    <AddLine size={14} />
                                    Add
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-5 pt-4 border-t border-border-2">
              <Button variant="secondary" onClick={onPrevious}>
                ← Details
              </Button>
              <Button type="button" onClick={onTasksNext}>
                Next: Reward →
              </Button>
            </div>
            {tasksNextAttempted && !isValid && (
              <div className="text-xs text-destructive mt-2 text-center">
                {humanTasks.length === 0 && requiredSkills.length === 0
                  ? "Add at least one task above"
                  : taskErrors.length > 0
                    ? "Fix the highlighted task fields above"
                    : "Complete this step to continue"}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
