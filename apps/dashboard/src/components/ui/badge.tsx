import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
    "inline-flex items-center gap-1 text-xs font-semibold transition-colors",
    {
        variants: {
            variant: {
                /* Semantic — colored text, no bg/border */
                default: "text-foreground",
                success: "text-success",
                error: "text-error",
                warning: "text-warning",
                info: "text-info",
                muted: "text-muted-foreground",
                /* Pill — rounded, border, light bg (for tags, skills, categories) */
                pill: "border border-border rounded-full px-2.5 py-0.5 text-fg-secondary",
                /* Filled — solid bg (for status indicators) */
                "filled-success": "rounded bg-success-light text-success px-2 py-0.5",
                "filled-error": "rounded bg-error-light text-error px-2 py-0.5",
                "filled-warning": "rounded bg-warning-light text-warning px-2 py-0.5",
                "filled-muted": "rounded bg-muted text-muted-foreground px-2 py-0.5",
                /* Outline — border only (for subtle labels) */
                outline: "border border-border rounded px-2 py-0.5 text-foreground",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    )
}

export { Badge, badgeVariants }
