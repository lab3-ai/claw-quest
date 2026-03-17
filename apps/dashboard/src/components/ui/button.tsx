import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-button text-sm font-semibold cursor-pointer transition-all duration-200 btn-pop focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50",
    {
        variants: {
            variant: {
                /* Fill: solid bg + contrast text */
                default: "bg-foreground text-background hover:bg-foreground/80",
                primary: "border border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
                danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                success: "bg-emerald-600 text-white hover:bg-emerald-600/80",
                warning: "bg-amber-500 text-white hover:bg-amber-500/80",
                info: "bg-sky-500 text-white hover:bg-sky-500/80",
                /* Tonal: 20% opacity bg + colored text */
                "default-tonal": "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                "primary-tonal": "bg-primary/20 text-primary hover:bg-primary/30",
                "danger-tonal": "bg-destructive/20 text-destructive hover:bg-destructive/30",
                "success-tonal": "bg-emerald-600/20 text-emerald-600 hover:bg-emerald-600/30",
                "warning-tonal": "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30",
                "info-tonal": "bg-sky-500/20 text-sky-500 hover:bg-sky-500/30",
                /* Outline: border + transparent bg + colored text */
                outline: "border border-input bg-background hover:bg-bg-2",
                "default-outline": "border border-input bg-background hover:bg-bg-2",
                "primary-outline": "border border-primary/30 bg-transparent text-primary hover:bg-primary/10",
                "danger-outline": "border border-destructive/30 bg-transparent text-destructive hover:bg-destructive/10",
                "success-outline": "border border-emerald-600/30 bg-transparent text-emerald-600 hover:bg-emerald-600/10",
                "warning-outline": "border border-amber-500/30 bg-transparent text-amber-500 hover:bg-amber-500/10",
                "info-outline": "border border-sky-500/30 bg-transparent text-sky-500 hover:bg-sky-500/10",
                /* Utility */
                secondary: "bg-foreground text-background hover:bg-foreground/80", /* @deprecated use "default" */
                ghost: "hover:bg-bg-2",
                link: "text-foreground underline-offset-4 hover:underline",
            },
            size: {
                sm: "h-[26px] px-2.5 text-xs",
                default: "h-9 px-4",
                lg: "h-11 px-6",
                xl: "h-[52px] px-8 text-base",
            },
            /* Icon-only: square button, w = h */
            iconOnly: {
                true: "!p-0 !gap-0 shrink-0",
            },
        },
        compoundVariants: [
            { iconOnly: true, size: "sm", className: "!w-[26px] !px-0" },
            { iconOnly: true, size: "default", className: "!w-9 !px-0" },
            { iconOnly: true, size: "lg", className: "!w-11 !px-0" },
            { iconOnly: true, size: "xl", className: "!w-[52px] !px-0" },
        ],
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
    ({ className, variant, size, iconOnly, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, iconOnly, className }))}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }
