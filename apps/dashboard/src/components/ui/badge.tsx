import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
    "inline-flex items-center rounded border px-2 py-0.5 text-xs font-bold uppercase tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    {
        variants: {
            variant: {
                default:
                    "border-transparent bg-primary text-primary-foreground",
                secondary:
                    "border-transparent bg-secondary text-secondary-foreground",
                destructive:
                    "border-transparent bg-destructive text-destructive-foreground",
                outline: "text-foreground",
                /* Quest type variants */
                fcfs: "border-transparent bg-accent-light text-accent",
                leaderboard: "border-transparent bg-info-light text-info",
                luckydraw: "border-transparent bg-muted text-fg-secondary",
                /* Payment/category variants */
                crypto: "border-transparent bg-info-light text-link",
                fiat: "border-transparent bg-[var(--stripe-bg)] text-[var(--stripe-fg)]",
                skill: "border-transparent bg-skill-bg text-skill",
                onchain: "border-transparent bg-muted text-fg-secondary",
                social: "border-transparent bg-[var(--social-bg)] text-fg-secondary",
                network: "border-transparent bg-info-light text-link",
                /* Status variants */
                live: "border-transparent bg-success-light text-success",
                completed: "border-transparent bg-muted text-muted-foreground",
                draft: "border-border bg-muted text-muted-foreground",
                pending: "border-transparent bg-warning-light text-warning",
                scheduled: "border-transparent bg-muted text-fg-secondary",
                rejected: "border-transparent bg-error-light text-error",
                cancelled: "border-transparent bg-error-light text-error",
                "pending-claim": "border-dashed border-warning bg-warning-light text-warning",
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
