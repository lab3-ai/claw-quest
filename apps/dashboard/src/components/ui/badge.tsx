import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 font-semibold transition-colors",
  {
    variants: {
      variant: {
        /* Semantic — colored text, no bg/border */
        default: "text-fg-1",
        success: "text-success",
        error: "text-error",
        warning: "text-warning",
        info: "text-info",
        muted: "text-fg-3",
        /* Pill — rounded, border (for tags, skills, categories) */
        pill: "border border-border-2 rounded-md px-2 py-0.5 text-fg-2 uppercase text-2xs font-normal",
        /* Filled — solid bg (for status indicators) */
        "filled-success": "rounded-md bg-success-light text-success",
        "filled-error": "rounded-md bg-error-light text-error",
        "filled-warning": "rounded-md bg-warning-light text-warning",
        "filled-muted": "rounded-md bg-bg-3 text-fg-3",
        /* Outline — border + subtle bg (for labels, quest type badges) */
        outline:
          "border border-border-2 rounded-md px-2 py-0.5 bg-bg-2 text-fg-1",
        "outline-success":
          "border border-success/40 rounded-md px-2 py-0.5 bg-success/10 text-success",
        "outline-error":
          "border border-error/40 rounded-md px-2 py-0.5 bg-error/10 text-error",
        "outline-warning":
          "border border-warning/40 rounded-md px-2 py-0.5 bg-warning/10 text-warning",
        "outline-primary":
          "border border-primary/40 rounded-md px-2 py-0.5 bg-primary/10 text-primary",
        "outline-strong":
          "border border-fg-1 rounded-md px-2 py-0.5 bg-bg-1 text-fg-1",
        "outline-muted":
          "border border-border rounded-md px-2 py-0.5 bg-bg-2 text-fg-3",
        /* Quest type — neutral by default, primary on card hover */
        "quest-fcfs":
          "border border-fg-3/30 rounded-md px-2 py-0.5 bg-fg-3/8 text-fg-3 uppercase text-2xs font-normal transition-colors group-hover:border-primary/40 group-hover:bg-primary/10 group-hover:text-primary",
        "quest-leaderboard":
          "border border-fg-3/30 rounded-md px-2 py-0.5 bg-fg-3/8 text-fg-3 uppercase text-2xs font-normal transition-colors group-hover:border-primary/40 group-hover:bg-primary/10 group-hover:text-primary",
        "quest-lucky-draw":
          "border border-fg-3/30 rounded-md px-2 py-0.5 bg-fg-3/8 text-fg-3 uppercase text-2xs font-normal transition-colors group-hover:border-primary/40 group-hover:bg-primary/10 group-hover:text-primary",
        /* Count — filled pill for numbers in tabs/nav. Size controlled by `size` prop */
        count:
          "inline-flex items-center justify-center rounded-full bg-fg-1 text-bg-1",
        "count-muted":
          "inline-flex items-center justify-center rounded-full bg-bg-3 text-fg-2",
        "count-outline":
          "inline-flex items-center justify-center rounded-full border border-border text-fg-3",
        "count-primary":
          "inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground",
        "count-primary-inverted":
          "inline-flex items-center justify-center rounded-full bg-primary-foreground text-primary",
        "count-success":
          "inline-flex items-center justify-center rounded-full bg-success text-bg-1",
        "count-error":
          "inline-flex items-center justify-center rounded-full bg-error text-bg-1",
        "count-warning":
          "inline-flex items-center justify-center rounded-full bg-warning text-bg-1",
        "count-info":
          "inline-flex items-center justify-center rounded-full bg-info text-bg-1",
      },
      size: {
        xs: "h-4 min-w-4 px-1 text-[10px]",
        sm: "h-5 min-w-5 px-1.5 text-2xs",
        default: "h-6 min-w-6 px-2 text-2xs",
        md: "h-7 min-w-7 px-2.5 text-xs",
        lg: "h-8 min-w-8 px-3 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
