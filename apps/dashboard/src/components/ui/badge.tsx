import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 text-xs font-semibold transition-colors",
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
        pill: "border border-border-2 rounded-md px-2 py-0.5 text-fg-2",
        /* Filled — solid bg (for status indicators) */
        "filled-success":
          "rounded-md bg-success-light text-success px-2 py-0.5",
        "filled-error": "rounded-md bg-error-light text-error px-2 py-0.5",
        "filled-warning":
          "rounded-md bg-warning-light text-warning px-2 py-0.5",
        "filled-muted": "rounded-md bg-bg-3 text-fg-3 px-2 py-0.5",
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
          "border border-primary/40 rounded-md px-2 py-0.5 bg-primary/10 text-fg-1",
        "outline-muted":
          "border border-border rounded-md px-2 py-0.5 bg-bg-2 text-fg-3",
        /* Count — small filled pill for numbers in tabs/nav */
        count:
          "inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-2xs font-semibold rounded-full bg-fg-1 text-bg-1",
        "count-muted":
          "inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-2xs font-semibold rounded-full bg-bg-3 text-fg-2",
        "count-outline":
          "inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-2xs font-semibold rounded-full border border-border text-fg-3",
        "count-primary":
          "inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-2xs font-semibold rounded-full bg-primary text-primary-foreground",
        "count-primary-inverted":
          "inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-2xs font-semibold rounded-full bg-primary-foreground text-primary",
        "count-success":
          "inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-2xs font-semibold rounded-full bg-success text-bg-1",
        "count-error":
          "inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-2xs font-semibold rounded-full bg-error text-bg-1",
        "count-warning":
          "inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-2xs font-semibold rounded-full bg-warning text-bg-1",
        "count-info":
          "inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-2xs font-semibold rounded-full bg-info text-bg-1",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
