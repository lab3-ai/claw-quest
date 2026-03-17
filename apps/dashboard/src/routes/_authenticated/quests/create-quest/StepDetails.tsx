import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface StepDetailsProps {
    isActive: boolean
    isDone: boolean
    form: {
        title: string
        description: string
        startAt: string
        endAt: string
    }
    stepSummary?: string
    onToggle: () => void
    onFieldChange: (key: "title" | "description" | "startAt" | "endAt", value: string) => void
    onNext: () => void
}

export function StepDetails({
    isActive,
    isDone,
    form,
    stepSummary,
    onToggle,
    onFieldChange,
    onNext,
}: StepDetailsProps) {
    const [attemptedNext, setAttemptedNext] = useState(false)
    useEffect(() => {
        if (!isActive) setAttemptedNext(false)
    }, [isActive])

    const isValid =
        !!form.title.trim() &&
        !!form.description.trim() &&
        !!form.startAt.trim() &&
        !!form.endAt.trim() &&
        (!form.startAt || !form.endAt || new Date(form.endAt) > new Date(form.startAt))

    const showErr = attemptedNext
    const titleError = showErr && !form.title.trim()
    const descriptionError = showErr && !form.description.trim()
    const startAtError = showErr && !form.startAt.trim()
    const endAtError = showErr && !form.endAt.trim()
    const dateOrderError =
        showErr && !!form.startAt && !!form.endAt && new Date(form.endAt) <= new Date(form.startAt)

    const handleNext = () => {
        if (isValid) {
            setAttemptedNext(false)
            onNext()
        } else {
            setAttemptedNext(true)
        }
    }
    return (
        <div className={cn(
            "relative mb-0 border-none rounded-none",
            "before:content-[''] before:absolute before:left-[13px] before:top-7 before:bottom-0 before:w-0.5 before:bg-border before:z-0",
            isDone && "before:bg-success"
        )}>
            <div className="flex items-start gap-3 py-3.5 cursor-pointer select-none text-xs relative z-1 group" onClick={onToggle}>
                <span className={cn(
                    "size-7 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold text-white border-2 border-background",
                    isDone ? "bg-success shadow-[0_0_0_2px_var(--color-green-500)]"
                        : isActive ? "bg-accent shadow-[0_0_0_2px_var(--accent)]"
                            : "bg-gray-300 shadow-[0_0_0_2px_var(--color-gray-300)]"
                )}>{isDone ? "\u2713" : "1"}</span>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground group-hover:text-primary">Quest Details</span>
                        {isDone && <span className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap bg-accent-light text-accent">Completed</span>}
                        {isActive && <span className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap bg-amber-50 text-warning">In Progress</span>}
                        {!isDone && !isActive && <span className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap bg-muted text-muted-foreground">Not Started</span>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 leading-snug truncate">
                        {!isActive && stepSummary ? stepSummary : "Title, description, and timing"}
                    </div>
                </div>
                <div className="flex flex-col items-end gap-0.5 shrink-0 pt-0.5">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">Step 1 of 4</span>
                    <span className="text-xs text-primary whitespace-nowrap">{isDone ? "Modify if required" : isActive ? "" : "Fill the details"}</span>
                </div>
            </div>
            {isActive && (
                <div className="pl-10 pb-4"><div className="p-4 border border-border rounded bg-transparent">
                    <div className="space-y-4 mb-6">
                        <div className="space-y-1.5 mb-3.5">
                            <Label>Title <span className="text-destructive">*</span></Label>
                            <Input
                                type="text"
                                placeholder="e.g. Register & trade shares on ClawFriend"
                                value={form.title}
                                onChange={e => onFieldChange("title", e.target.value)}
                                maxLength={80}
                                className={cn(titleError && "border-destructive focus-visible:ring-destructive")}
                            />
                            {titleError && <div className="text-xs text-destructive mt-0.5">Title is required</div>}
                        </div>
                        <div className="space-y-1.5 mb-3.5">
                            <Label>Description <span className="text-destructive">*</span></Label>
                            <div className="text-xs text-muted-foreground mb-1 leading-snug">Agent-readable. Explain the overall quest goal.</div>
                            <Textarea
                                rows={3}
                                placeholder="Use the ClawFriend skill to register your agent…"
                                value={form.description}
                                onChange={e => onFieldChange("description", e.target.value)}
                                className={cn(descriptionError && "border-destructive focus-visible:ring-destructive")}
                            />
                            {descriptionError && <div className="text-xs text-destructive mt-0.5">Description is required</div>}
                        </div>
                    </div>
                    <div className="space-y-4 mb-6">
                        <div className="text-sm font-semibold text-foreground pb-2 border-b border-border mb-3">Timing</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5 mb-3.5">
                                <Label>Start <span className="text-destructive">*</span></Label>
                                <input
                                    className={cn("flex h-9 w-full rounded border border-input bg-transparent px-3 py-1 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer", (startAtError || dateOrderError) && "border-destructive focus-visible:ring-destructive")}
                                    type="datetime-local"
                                    value={form.startAt}
                                    onChange={e => onFieldChange("startAt", e.target.value)}
                                    onClick={(e) => e.currentTarget.showPicker?.()}
                                    style={{ cursor: 'pointer' }}
                                />
                                {startAtError && <div className="text-xs text-destructive mt-0.5">Start date is required</div>}
                            </div>
                            <div className="space-y-1.5 mb-3.5">
                                <Label>End <span className="text-destructive">*</span></Label>
                                <input
                                    className={cn("flex h-9 w-full rounded border border-input bg-transparent px-3 py-1 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer", (endAtError || dateOrderError) && "border-destructive focus-visible:ring-destructive")}
                                    type="datetime-local"
                                    value={form.endAt}
                                    onChange={e => onFieldChange("endAt", e.target.value)}
                                    onClick={(e) => e.currentTarget.showPicker?.()}
                                    style={{ cursor: 'pointer' }}
                                />
                                {endAtError && <div className="text-xs text-destructive mt-0.5">End date is required</div>}
                                {dateOrderError && !endAtError && <div className="text-xs text-destructive mt-0.5">End date must be after start date</div>}
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-between mt-5 pt-4 border-t border-border">
                        <span />
                        <Button type="button" onClick={handleNext}>
                            Next: Tasks →
                        </Button>
                    </div>
                    {attemptedNext && !isValid && (
                        <div className="text-xs text-destructive mt-2 text-center">
                            Fix the fields above to continue
                        </div>
                    )}
                </div></div>
            )}
        </div>
    )
}
