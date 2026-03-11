import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-button text-sm font-semibold ring-offset-background transition-colors active:scale-95 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
    {
        variants: {
            variant: {
                default: "bg-primary text-primary-foreground hover:bg-primary/80",
                destructive:
                    "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                outline:
                    "border border-input bg-background hover:bg-bg-secondary",
                "outline-primary":
                    "border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20",
                secondary:
                    "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                ghost: "hover:bg-bg-secondary",
                link: "text-foreground underline-offset-4 hover:underline",
                /* ClawQuest domain variants */
                quest: "bg-primary text-primary-foreground border border-(--border-heavy) hover:bg-primary/80",
                agent: "bg-(--tone-agent) text-(--accent-fg) border border-(--tone-agent-dark) hover:bg-(--tone-agent-dark)",
                danger: "bg-background text-(--error) border border-(--error) hover:bg-error-light",
            },
            size: {
                default: "h-9 px-4 py-2",
                sm: "h-8 rounded-button px-3 text-xs",
                md: "h-10 px-5 py-2",
                lg: "h-11 rounded-button px-8",
                icon: "h-9 w-9",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }
