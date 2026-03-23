import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckFill } from "@mingcute/react";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { cn } from "@/lib/utils";

interface StepDetailsProps {
  isActive: boolean;
  isDone: boolean;
  form: {
    title: string;
    description: string;
    startAt: string;
    endAt: string;
  };
  stepSummary?: string;
  onToggle: () => void;
  onFieldChange: (
    key: "title" | "description" | "startAt" | "endAt",
    value: string,
  ) => void;
  onNext: () => void;
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
  const [attemptedNext, setAttemptedNext] = useState(false);
  useEffect(() => {
    if (!isActive) setAttemptedNext(false);
  }, [isActive]);

  const isValid =
    !!form.title.trim() &&
    !!form.description.trim() &&
    !!form.startAt.trim() &&
    !!form.endAt.trim() &&
    (!form.startAt ||
      !form.endAt ||
      new Date(form.endAt) > new Date(form.startAt));

  const showErr = attemptedNext;
  const titleError = showErr && !form.title.trim();
  const descriptionError = showErr && !form.description.trim();
  const startAtError = showErr && !form.startAt.trim();
  const endAtError = showErr && !form.endAt.trim();
  const dateOrderError =
    showErr &&
    !!form.startAt &&
    !!form.endAt &&
    new Date(form.endAt) <= new Date(form.startAt);

  const handleNext = () => {
    if (isValid) {
      setAttemptedNext(false);
      onNext();
    } else {
      setAttemptedNext(true);
    }
  };
  return (
    <div
      className={cn(
        "relative mb-0 border-none rounded-none",
        "before:content-[''] before:absolute before:left-[13px] before:top-7 before:bottom-0 before:w-0.5 before:bg-border before:z-0",
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
          {isDone ? <CheckFill size={12} /> : "1"}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-fg-1 group-hover:text-primary">
              Quest Details
            </span>
          </div>
          <div className="text-xs text-fg-3 mt-0.5 leading-snug truncate">
            {!isActive && stepSummary
              ? stepSummary
              : "Title, description, and timing"}
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5 shrink-0 pt-0.5">
          <span className="text-xs text-fg-3 whitespace-nowrap">
            Step 1 of 4
          </span>
          <span className="text-xs text-primary whitespace-nowrap">
            {isDone ? "Modify if required" : isActive ? "" : "Fill the details"}
          </span>
        </div>
      </div>
      {isActive && (
        <div className="pl-10 pb-4">
          <div className="p-4 sm:p-6 border border-border-2 rounded bg-bg-1">
            <div className="space-y-4 sm:space-y-6 mb-4 sm:mb-6">
              <div className="flex flex-col gap-2">
                <Label>
                  Title {showErr && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  type="text"
                  placeholder="e.g. Register & trade shares on ClawFriend"
                  value={form.title}
                  onChange={(e) => onFieldChange("title", e.target.value)}
                  maxLength={80}
                  className={cn(
                    titleError &&
                      "border-destructive focus-visible:ring-destructive",
                  )}
                />
                {titleError && (
                  <div className="text-xs text-destructive mt-0.5">
                    Title is required
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label>
                  Description{" "}
                  {showErr && <span className="text-destructive">*</span>}
                </Label>
                <div className="text-xs text-fg-3 leading-snug">
                  Agent-readable. Explain the overall quest goal.
                </div>
                <Textarea
                  rows={3}
                  placeholder="Use the ClawFriend skill to register your agent…"
                  value={form.description}
                  onChange={(e) => onFieldChange("description", e.target.value)}
                  className={cn(
                    descriptionError &&
                      "border-destructive focus-visible:ring-destructive",
                  )}
                />
                {descriptionError && (
                  <div className="text-xs text-destructive mt-0.5">
                    Description is required
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
                <div className="flex flex-col gap-2">
                  <Label>
                    Start{" "}
                    {showErr && <span className="text-destructive">*</span>}
                  </Label>
                  <DateTimePicker
                    value={form.startAt}
                    onChange={(v) => onFieldChange("startAt", v)}
                    error={startAtError || dateOrderError}
                  />
                  {startAtError && (
                    <div className="text-xs text-destructive mt-0.5">
                      Start date is required
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Label>
                    End {showErr && <span className="text-destructive">*</span>}
                  </Label>
                  <DateTimePicker
                    value={form.endAt}
                    onChange={(v) => onFieldChange("endAt", v)}
                    error={endAtError || dateOrderError}
                  />
                  {endAtError && (
                    <div className="text-xs text-destructive mt-0.5">
                      End date is required
                    </div>
                  )}
                  {dateOrderError && !endAtError && (
                    <div className="text-xs text-destructive mt-0.5">
                      End date must be after start date
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-between mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-border-2">
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
          </div>
        </div>
      )}
    </div>
  );
}
