import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-button text-sm font-semibold cursor-pointer transition-all duration-150 btn-pop focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        /* Fill: solid bg + 12% darker on hover */
        default: "bg-foreground text-background hover:bg-fg-2",
        primary:
          "border border-transparent bg-primary text-primary-foreground hover:bg-(--primary-hover)",
        danger:
          "bg-destructive text-destructive-foreground hover:bg-(--error-hover)",
        success: "bg-emerald-600 text-white hover:bg-emerald-700",
        warning: "bg-amber-500 text-white hover:bg-amber-600",
        info: "bg-sky-500 text-white hover:bg-sky-600",
        /* Tonal: light bg → slightly darker bg on hover */
        "default-tonal": "bg-bg-2 text-foreground hover:bg-bg-3",
        "primary-tonal": "bg-primary/12 text-primary hover:bg-primary/20",
        "danger-tonal":
          "bg-destructive/12 text-destructive hover:bg-destructive/20",
        "success-tonal":
          "bg-emerald-600/12 text-emerald-600 hover:bg-emerald-600/20",
        "warning-tonal": "bg-amber-500/12 text-amber-500 hover:bg-amber-500/20",
        "info-tonal": "bg-sky-500/12 text-sky-500 hover:bg-sky-500/20",
        /* Outline: border + bg shift on hover */
        outline: "border border-input bg-background hover:bg-bg-3",
        "default-outline": "border border-input bg-background hover:bg-bg-3",
        "primary-outline":
          "border border-primary/30 bg-transparent text-primary hover:bg-primary/12",
        "danger-outline":
          "border border-destructive/30 bg-transparent text-destructive hover:bg-destructive/12",
        "success-outline":
          "border border-emerald-600/30 bg-transparent text-emerald-600 hover:bg-emerald-600/12",
        "warning-outline":
          "border border-amber-500/30 bg-transparent text-amber-500 hover:bg-amber-500/12",
        "info-outline":
          "border border-sky-500/30 bg-transparent text-sky-500 hover:bg-sky-500/12",
        /* Utility */
        secondary:
          "bg-foreground text-background hover:bg-fg-2" /* @deprecated use "default" */,
        ghost: "hover:bg-bg-4",
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
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, iconOnly, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, iconOnly, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
