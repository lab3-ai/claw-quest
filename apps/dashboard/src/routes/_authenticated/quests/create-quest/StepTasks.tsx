import { Button } from "@/components/ui/button"
import { PlatformIcon } from "@/components/PlatformIcon"
import { cn } from "@/lib/utils"
import type { ClawHubSkill } from "@/hooks/useSkillSearch"

type ActionDef = {
    type: string
    label: string
    fields: "follow" | "post_url" | "post_content" | "quote_post" | "discord_join" | "discord_role" | "telegram_join"
}

const PLATFORM_ICON_KEYS: Record<string, "x" | "discord" | "telegram"> = {
    X: "x", Discord: "discord", Telegram: "telegram",
}

function PlatformBtnIcon({ platform }: { platform: string }) {
    const key = PLATFORM_ICON_KEYS[platform]
    if (!key) return <span>{platform[0]}</span>
    return <PlatformIcon name={key} size={15} colored />
}

const PLATFORM_ACTIONS: Record<string, ActionDef[]> = {
    X: [
        { type: "follow_account", label: "Follow on X", fields: "follow" },
        { type: "like_post", label: "Like a Post", fields: "post_url" },
        { type: "repost", label: "Repost a Post", fields: "post_url" },
        { type: "post", label: "Post on X", fields: "post_content" },
        { type: "quote_post", label: "Quote a Post", fields: "quote_post" },
    ],
    Discord: [
        { type: "join_server", label: "Join a Discord Server", fields: "discord_join" },
        { type: "verify_role", label: "Verify Role in Discord", fields: "discord_role" },
    ],
    Telegram: [
        { type: "join_channel", label: "Join a Group or Channel", fields: "telegram_join" },
    ],
}

interface SocialEntry {
    platform: string
    action: string
    actionType: string
    icon: string
    params: Record<string, string>
    chips: string[]
    requireTagFriends?: boolean
}

type Skill = Pick<ClawHubSkill, "id" | "name" | "desc" | "agents" | "version"> | ClawHubSkill

interface TaskValidationError {
    index: number
    field: string
    message: string
}

type ChipStatus = "pending" | "valid" | "invalid"

interface StepTasksProps {
    isActive: boolean
    isDone: boolean
    isValid: boolean
    isFuture: boolean
    stepSummary?: string
    activePlatform: string | null
    expandedTask: number | null
    humanTasks: SocialEntry[]
    requiredSkills: Skill[]
    requireVerified: boolean
    skillSearch: string
    skillSearchResults: ClawHubSkill[]
    skillSearchLoading: boolean
    showSkillResults: boolean
    urlFetching: boolean
    urlPreview: ClawHubSkill | null
    urlFetchError: string | null
    taskErrors: TaskValidationError[]
    addedSkillIds: Set<string>
    expandedDescs: Set<string>
    onToggle: () => void
    onSetActivePlatform: (platform: string | null) => void
    onAddHumanTask: (platform: string, action: ActionDef) => void
    onRemoveHumanTask: (index: number) => void
    onSetExpandedTask: (index: number | null) => void
    onSetTaskParam: (index: number, key: string, value: string) => void
    onToggleTagFriends: (index: number) => void
    onAddChip: (index: number, value: string) => void
    onRemoveChip: (index: number, chipIndex: number) => void
    onSetRequireVerified: (value: boolean) => void
    onSetSkillSearch: (value: string) => void
    onSetShowSkillResults: (show: boolean) => void
    onAddSkill: (skill: ClawHubSkill) => void
    onRemoveSkill: (id: string) => void
    onSetUrlFetching: (fetching: boolean) => void
    onSetUrlPreview: (preview: ClawHubSkill | null) => void
    onSetUrlFetchError: (error: string | null) => void
    onToggleDesc: (id: string) => void
    onTruncateDesc: (text: string, id: string) => React.ReactNode
    onChipStatus: (platform: string, actionType: string, value: string) => ChipStatus | undefined
    onPrevious: () => void
    onNext: () => void
    SocialEntryBody: React.ComponentType<{
        task: SocialEntry
        idx: number
        setTaskParam: (i: number, key: string, val: string) => void
        toggleTagFriends: (i: number) => void
        addChip: (i: number, value: string) => void
        removeChip: (i: number, chipIdx: number) => void
        errors?: TaskValidationError[]
        chipStatus?: (value: string) => ChipStatus | undefined
    }>
    isSkillUrl: (url: string) => boolean
    fetchSkillFromUrl: (url: string) => Promise<ClawHubSkill | null>
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
    onNext,
    SocialEntryBody,
    isSkillUrl,
    fetchSkillFromUrl,
}: StepTasksProps) {
    return (
        <div className={cn(
            "relative mb-0 border-none rounded-none",
            "before:content-[''] before:absolute before:left-[13px] before:top-0 before:bottom-0 before:w-0.5 before:bg-border before:z-0",
            isDone && "before:bg-success"
        )}>
            <div className="flex items-start gap-3 py-3.5 cursor-pointer select-none text-xs relative z-1 group" onClick={onToggle}>
                <span className={cn(
                    "size-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white border-2 border-background",
                    isDone ? "bg-success shadow-[0_0_0_2px_var(--color-green-500)]"
                        : isActive ? "bg-accent shadow-[0_0_0_2px_var(--accent)]"
                            : "bg-gray-300 shadow-[0_0_0_2px_var(--color-gray-300)]"
                )}>{isDone ? "\u2713" : "2"}</span>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground group-hover:text-primary">Tasks</span>
                        {isDone && <span className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap bg-accent-light text-accent">Completed</span>}
                        {isActive && <span className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap bg-amber-50 text-warning">In Progress</span>}
                        {!isDone && !isActive && <span className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap bg-muted text-muted-foreground">Not Started</span>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 leading-snug truncate">
                        {!isActive && stepSummary && stepSummary !== "No tasks" ? stepSummary : "Human social actions and agent skill requirements"}
                    </div>
                </div>
                <div className="flex flex-col items-end gap-0.5 shrink-0 pt-0.5">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">Step 2 of 4</span>
                    <span className={cn("text-xs whitespace-nowrap", isFuture ? "text-muted-foreground" : "text-primary")}>{isDone ? "Modify if required" : isActive ? "" : "Add tasks"}</span>
                </div>
            </div>
            {isActive && (
                <div className="pl-10 pb-4"><div className="p-4 border border-border rounded bg-transparent">
                    <div className="space-y-4 mb-6">
                        <div className="text-xs text-muted-foreground mb-1 leading-snug" style={{ marginBottom: 14 }}>
                            Define what needs to be done. Human tasks are social actions.
                            Agent tasks require specific skills from{" "}
                            <a href="https://clawhub.ai/skills" target="_blank" rel="noreferrer" style={{ color: "var(--link)" }}>
                                ClawHub
                            </a>.
                        </div>
                        {!isValid && humanTasks.length === 0 && requiredSkills.length === 0 && (
                            <div className="px-3 py-2.5 bg-warning-light border border-warning rounded text-xs text-foreground mb-4">
                                <strong>⚠️ At least one task is required:</strong> Add at least one human task (social action) or one agent task (required skill) to continue.
                            </div>
                        )}

                        {/* ── Human Tasks ── */}
                        <div className="mb-6 pl-3.5 border-l-4 border-l-(--human-fg)">
                            <div className="flex items-center gap-2 text-sm font-semibold mb-2.5">
                                <span>👤</span> Human Tasks
                                <span className="text-xs font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-(--human-bg) text-(--human-fg)">Social</span>
                                <span className="font-normal text-xs text-muted-foreground ml-auto">Actions performed by the operator</span>
                            </div>

                            <div className="mb-2.5" style={{ marginBottom: 12 }}>
                                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--fg-muted)", marginBottom: 6 }}>
                                    Select a task template
                                </div>
                                <div className="flex flex-wrap gap-1.5 mb-2.5">
                                    {Object.keys(PLATFORM_ACTIONS).map(p => (
                                        <button
                                            key={p}
                                            className={cn("flex items-center gap-1.5 px-3 py-1.5 border border-input rounded bg-background text-foreground text-xs font-medium cursor-pointer transition-colors hover:border-muted-foreground hover:bg-muted", activePlatform === p && "border-accent text-accent bg-accent-light font-semibold")}
                                            onClick={() => onSetActivePlatform(activePlatform === p ? null : p)}
                                        >
                                            <span className="icon"><PlatformBtnIcon platform={p} /></span> {p}
                                        </button>
                                    ))}
                                </div>
                                {activePlatform && (
                                    <div className="block">
                                        <div className="border border-border rounded overflow-hidden mb-2.5">
                                            {PLATFORM_ACTIONS[activePlatform].map(action => (
                                                <div
                                                    key={action.type}
                                                    className="flex items-center justify-between px-3 py-2 border-b border-border/30 text-xs cursor-pointer transition-colors hover:bg-(--human-bg) last:border-b-0"
                                                    onClick={() => onAddHumanTask(activePlatform, action)}
                                                >
                                                    <span className="font-medium text-foreground">{action.label}</span>
                                                    <button className="bg-transparent border border-(--human-border) text-(--human-fg) text-xs font-semibold py-0.5 px-2.5 rounded cursor-pointer hover:bg-(--human-bg)">+ Add</button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {humanTasks.length === 0 ? (
                                <div style={{ fontSize: 12, color: "var(--fg-muted)", padding: "8px 0" }}>
                                    No tasks added yet. Use the template picker above.
                                </div>
                            ) : (
                                <>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--fg)", marginBottom: 6 }}>
                                        Added Tasks
                                    </div>
                                    {humanTasks.map((task, i) => (
                                        <div key={i} className="border border-border rounded mb-2 last:mb-0" data-platform={task.platform.toLowerCase()}>
                                            <div
                                                className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b border-border text-xs cursor-pointer select-none"
                                                onClick={() => onSetExpandedTask(expandedTask === i ? null : i)}
                                            >
                                                <span className="text-sm"><PlatformBtnIcon platform={task.platform} /></span>
                                                <span className="font-semibold text-foreground flex-1">{task.action}</span>
                                                {task.chips.length > 0 && (
                                                    <span className="inline-flex items-center justify-center min-w-4 h-4 rounded-full text-xs font-bold bg-accent-light0 text-white px-1">{task.chips.length}</span>
                                                )}
                                                <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-(--social-bg) text-(--social-fg) uppercase">{task.platform}</span>
                                                <button
                                                    className="bg-transparent border-none text-muted-foreground text-xs cursor-pointer px-1.5 py-0.5 rounded hover:text-destructive hover:bg-destructive/10"
                                                    onClick={e => { e.stopPropagation(); onRemoveHumanTask(i) }}
                                                >✕</button>
                                            </div>
                                            {expandedTask !== i && task.chips.length > 0 && (
                                                <div className="flex flex-wrap gap-1 px-3 py-1.5 pb-2 text-xs border-t border-dashed border-border">
                                                    {task.chips.slice(0, 4).map((c, ci) => {
                                                        const st = onChipStatus(task.platform.toLowerCase(), task.actionType, c)
                                                        const icon = st === "pending" ? "⋯" : st === "invalid" ? "⚠" : "✓"
                                                        return (
                                                            <span key={ci} className={cn(
                                                                "font-mono text-xs px-1.5 py-px rounded whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]",
                                                                st === "invalid" ? "text-warning bg-error-light"
                                                                    : st === "pending" ? "text-muted-foreground bg-muted"
                                                                        : "text-success bg-accent-light"
                                                            )}>
                                                                {icon} {task.actionType === "follow_account" ? `@${c.replace(/^@/, "")}` : c.length > 35 ? c.slice(0, 35) + "…" : c}
                                                            </span>
                                                        )
                                                    })}
                                                    {task.chips.length > 4 && <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-px rounded">+{task.chips.length - 4} more</span>}
                                                </div>
                                            )}
                                            {expandedTask === i && (
                                                <SocialEntryBody
                                                    task={task}
                                                    idx={i}
                                                    setTaskParam={onSetTaskParam}
                                                    toggleTagFriends={onToggleTagFriends}
                                                    addChip={onAddChip}
                                                    removeChip={onRemoveChip}
                                                    errors={taskErrors}
                                                    chipStatus={v => onChipStatus(task.platform.toLowerCase(), task.actionType, v)}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>

                        {/* ── Agent Tasks ── */}
                        <div className="mb-6 pl-3.5 border-l-4 border-l-(--agent-fg)">
                            <div className="flex items-center gap-2 text-sm font-semibold mb-2.5">
                                <span>🤖</span> Agent Tasks
                                <span className="text-xs font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-(--agent-bg) text-(--agent-fg)">Skill</span>
                                <span className="font-normal text-xs text-muted-foreground ml-auto">Required skills from ClawHub</span>
                            </div>

                            <div className="bg-muted/50 border border-border rounded px-3 py-2 text-xs text-muted-foreground leading-relaxed mb-2.5">
                                Agents must have{" "}
                                <code style={{ fontFamily: "var(--font-mono)", fontSize: 11, background: "var(--code-bg)", padding: "0 3px", borderRadius: 2 }}>
                                    clawquest
                                </code>{" "}
                                installed + each required skill below. CQ checks capabilities before submission.
                            </div>

                            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--fg)", margin: "12px 0 6px" }}>
                                Required Skills
                            </div>
                            {requiredSkills.length === 0 ? (
                                <div style={{ fontSize: 12, color: "var(--fg-muted)", padding: "4px 0 8px" }}>
                                    No skills required yet. Search below to add.
                                </div>
                            ) : (
                                <div className="mt-2.5">
                                    {requiredSkills.map(skill => {
                                        const isCustom = skill.id.startsWith("http")
                                        return (
                                            <div key={skill.id} className="flex items-center gap-2.5 px-2.5 py-2 border border-(--skill-border) rounded mb-1.5 bg-background overflow-hidden" data-agents={skill.agents}>
                                                <div className="size-7 rounded bg-(--skill-bg) flex items-center justify-center text-sm shrink-0">{isCustom ? "🔗" : "🧩"}</div>
                                                <div className="flex-1 min-w-0 overflow-hidden">
                                                    <div className="text-xs font-semibold text-foreground font-mono truncate">
                                                        {isCustom ? skill.name : `${skill.id}@${skill.version ?? "latest"}`}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground leading-tight truncate">{skill.desc}</div>
                                                    {isCustom && (
                                                        <div className="text-xs text-primary mt-0.5 truncate font-mono opacity-70" title={skill.id}>
                                                            {skill.id}
                                                        </div>
                                                    )}
                                                </div>
                                                {isCustom
                                                    ? <span className="text-xs font-semibold text-muted-foreground bg-muted border border-border px-1.5 py-0.5 rounded whitespace-nowrap self-center">custom</span>
                                                    : <span className="text-xs font-semibold text-accent bg-accent-light px-1.5 py-0.5 rounded whitespace-nowrap self-center">{skill.agents} agents</span>
                                                }
                                                <button className="bg-transparent border-none text-muted-foreground text-sm cursor-pointer p-0.5 rounded leading-none hover:text-destructive hover:bg-destructive/10" onClick={() => onRemoveSkill(skill.id)}>✕</button>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                            {/* Require verified toggle */}
                            {requiredSkills.length > 0 && (
                                <label className="flex items-center gap-2 mb-3 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={requireVerified}
                                        onChange={e => onSetRequireVerified(e.target.checked)}
                                        className="accent-accent size-3.5"
                                    />
                                    <span className="text-xs text-foreground font-medium">Require verified skills</span>
                                    <span className="text-xs text-muted-foreground">— only agents who ran Skill Scan can join</span>
                                </label>
                            )}

                            <div className="relative mb-2.5">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-base pointer-events-none">🔍</span>
                                <input
                                    className="w-full py-2 px-2.5 pl-[30px] text-base border border-(--agent-border) rounded bg-(--agent-bg) text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:border-primary focus:bg-background focus:ring-[3px] focus:ring-primary/15"
                                    type="text"
                                    placeholder="Search on ClawHub or paste skill URL…"
                                    value={skillSearch}
                                    onChange={e => {
                                        const val = e.target.value
                                        onSetSkillSearch(val)
                                        onSetShowSkillResults(true)
                                        onSetUrlFetchError(null)
                                        onSetUrlPreview(null)
                                        if (isSkillUrl(val.trim())) {
                                            onSetUrlFetching(true)
                                            fetchSkillFromUrl(val.trim())
                                                .then(skill => {
                                                    onSetUrlPreview(skill)
                                                    if (!skill) onSetUrlFetchError("Could not parse skill.md from this URL")
                                                })
                                                .catch(() => onSetUrlFetchError("Failed to fetch URL"))
                                                .finally(() => onSetUrlFetching(false))
                                        }
                                    }}
                                    onFocus={() => onSetShowSkillResults(true)}
                                />

                                {/* URL-based skill preview */}
                                {showSkillResults && isSkillUrl(skillSearch.trim()) && (urlFetching || urlPreview || urlFetchError) && (
                                    <div className="border border-border rounded bg-background overflow-hidden overflow-y-auto mb-2.5 max-h-[360px]">
                                        <div className="px-2.5 py-1.5 text-xs text-muted-foreground bg-muted/50 border-b border-border flex justify-between">
                                            <span>{urlFetching ? "Fetching skill.md…" : urlPreview ? "Skill found" : "Error"}</span>
                                            <span style={{ cursor: "pointer" }} onClick={() => onSetShowSkillResults(false)}>✕ close</span>
                                        </div>
                                        {urlFetching && (
                                            <div style={{ padding: "12px", textAlign: "center", color: "var(--fg-muted)", fontSize: 12 }}>
                                                Fetching skill.md…
                                            </div>
                                        )}
                                        {urlFetchError && !urlFetching && (
                                            <div style={{ padding: "12px", textAlign: "center", color: "var(--red)", fontSize: 12 }}>
                                                {urlFetchError}. Ensure the URL points to a public skill.md file.
                                            </div>
                                        )}
                                        {urlPreview && !urlFetching && (() => {
                                            const isAdded = addedSkillIds.has(urlPreview.id)
                                            return (
                                                <div className={cn("flex items-start gap-2.5 px-2.5 py-2 border-b border-border/30 cursor-pointer transition-colors overflow-hidden last:border-b-0 hover:bg-muted/50", isAdded && "opacity-50 cursor-default bg-muted/50")} onClick={() => !isAdded && onAddSkill(urlPreview)}>
                                                    <div className="flex-1 min-w-0 overflow-hidden">
                                                        <div className="text-xs font-semibold text-primary flex items-center gap-1.5 truncate">
                                                            <span className="inline-flex items-center justify-center text-xs font-bold uppercase px-1.5 py-px rounded bg-blue-100 text-info mr-1 tracking-wide shrink-0">URL</span>
                                                            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{urlPreview.name}</span>
                                                        </div>
                                                        <div className="text-xs text-muted-foreground leading-snug mt-0.5 wrap-break-word">{onTruncateDesc(urlPreview.desc, urlPreview.id)}</div>
                                                        <div className="flex gap-2.5 text-xs text-muted-foreground mt-0.5">
                                                            <span>v{urlPreview.version}</span>
                                                            {urlPreview.ownerHandle && <span className="font-mono text-xs text-muted-foreground" title={urlPreview.id}>{urlPreview.ownerHandle}</span>}
                                                        </div>
                                                    </div>
                                                    {isAdded
                                                        ? <span className="bg-accent-light border border-accent-border text-accent text-xs font-semibold py-1 px-2.5 rounded whitespace-nowrap self-center">✓ Added</span>
                                                        : <button className="bg-transparent border border-(--agent-border) text-(--agent-fg) text-xs font-semibold py-1 px-2.5 rounded cursor-pointer whitespace-nowrap self-center hover:bg-(--agent-bg)">+ Add</button>
                                                    }
                                                </div>
                                            )
                                        })()}
                                    </div>
                                )}

                                {/* ClawHub search results */}
                                {showSkillResults && !isSkillUrl(skillSearch.trim()) && skillSearch.length >= 2 && (skillSearchResults.length > 0 || skillSearchLoading) && (
                                    <div className="border border-border rounded bg-background overflow-hidden overflow-y-auto mb-2.5 max-h-[360px]">
                                        <div className="px-2.5 py-1.5 text-xs text-muted-foreground bg-muted/50 border-b border-border flex justify-between">
                                            <span>{skillSearchLoading ? `Searching "${skillSearch}"…` : `${skillSearchResults.length} results for "${skillSearch}"`}</span>
                                            <span style={{ cursor: "pointer" }} onClick={() => onSetShowSkillResults(false)}>✕ close</span>
                                        </div>
                                        {skillSearchLoading && skillSearchResults.length === 0 && (
                                            <div style={{ padding: "12px", textAlign: "center", color: "var(--fg-muted)", fontSize: 12 }}>
                                                Searching ClawHub…
                                            </div>
                                        )}
                                        {skillSearchResults.map(s => {
                                            const isAdded = addedSkillIds.has(s.id)
                                            return (
                                                <div key={s.id} className={cn("flex items-start gap-2.5 px-2.5 py-2 border-b border-border/30 cursor-pointer transition-colors overflow-hidden last:border-b-0 hover:bg-muted/50", isAdded && "opacity-50 cursor-default bg-muted/50")} onClick={() => !isAdded && onAddSkill(s)}>
                                                    <div className="flex-1 min-w-0 overflow-hidden">
                                                        <div className="text-xs font-semibold text-primary flex items-center gap-1.5 truncate">
                                                            <span className="text-muted-foreground font-normal shrink-0">{s.id.split("/")[0]} /</span>
                                                            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</span>
                                                        </div>
                                                        <div className="text-xs text-muted-foreground leading-snug mt-0.5 wrap-break-word">{onTruncateDesc(s.desc, s.id)}</div>
                                                        <div className="flex gap-2.5 text-xs text-muted-foreground mt-0.5">
                                                            <span>↓ {s.downloads}</span>
                                                            <span>★ {s.stars}</span>
                                                            <span>v{s.version}</span>
                                                        </div>
                                                    </div>
                                                    {isAdded
                                                        ? <span className="bg-accent-light border border-accent-border text-accent text-xs font-semibold py-1 px-2.5 rounded whitespace-nowrap self-center">✓ Added</span>
                                                        : <button className="bg-transparent border border-(--agent-border) text-(--agent-fg) text-xs font-semibold py-1 px-2.5 rounded cursor-pointer whitespace-nowrap self-center hover:bg-(--agent-bg)">+ Add</button>
                                                    }
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between mt-5 pt-4 border-t border-border">
                        <Button variant="secondary" onClick={onPrevious}>← Details</Button>
                        <Button onClick={onNext} disabled={!isValid}>
                            Next: Reward →
                        </Button>
                    </div>
                    {!isValid && (
                        <div className="text-xs text-destructive mt-2 text-center">
                            {humanTasks.length === 0 && requiredSkills.length === 0
                                ? "At least one task (human or agent) is required"
                                : taskErrors.length > 0
                                    ? "Please fix task errors before continuing"
                                    : "Please complete the tasks step to continue"}
                        </div>
                    )}
                </div></div>
            )}
        </div>
    )
}
