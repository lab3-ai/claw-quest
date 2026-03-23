import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-button text-sm font-semibold cursor-pointer transition-all duration-150 btn-pop focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        /* Fill: solid bg + 12% darker on hover */
        default: "bg-fg-1 text-bg-1 hover:bg-fg-2",
        primary:
          "border border-transparent bg-primary text-primary-foreground hover:bg-(--primary-hover)",
        danger:
          "bg-destructive text-destructive-foreground hover:bg-(--error-hover)",
        success: "bg-success text-white hover:bg-(--success-hover)",
        warning: "bg-warning text-white hover:bg-(--warning-hover)",
        info: "bg-info text-white hover:bg-(--info-hover)",
        /* Tonal: light bg → slightly darker bg on hover */
        "default-tonal": "bg-fg-1/10 text-fg-1 hover:bg-fg-1/20",
        "primary-tonal": "bg-primary/12 text-primary hover:bg-primary/20",
        "danger-tonal":
          "bg-destructive/12 text-destructive hover:bg-destructive/20",
        "success-tonal":
          "bg-success/12 text-success hover:bg-success/20",
        "warning-tonal": "bg-warning/12 text-warning hover:bg-warning/20",
        "info-tonal": "bg-info/12 text-info hover:bg-info/20",
        /* Outline: border + bg shift on hover */
        outline: "border border-border-2 bg-transparent hover:bg-bg-2",
        "default-outline":
          "border border-border-2 bg-transparent hover:bg-bg-2",
        "primary-outline":
          "border border-primary bg-transparent text-primary hover:bg-primary/10",
        "danger-outline":
          "border border-destructive bg-transparent text-destructive hover:bg-destructive/10",
        "success-outline":
          "border border-success bg-transparent text-success hover:bg-success/10",
        "warning-outline":
          "border border-warning bg-transparent text-warning hover:bg-warning/10",
        "info-outline":
          "border border-info bg-transparent text-info hover:bg-info/10",
        /* Utility */
        secondary:
          "bg-fg-1 text-bg-1 hover:bg-fg-2" /* @deprecated use "default" */,
        ghost: "hover:bg-bg-4",
        link: "text-fg-1 underline-offset-4 hover:underline",
      },
      size: {
        xs: "h-6 px-2 text-xs",
        sm: "h-7 px-3 text-xs",
        default: "h-8 px-3 text-sm",
        lg: "h-9 px-4 text-sm",
        xl: "h-10 px-4 text-sm",
      },
      /* Icon-only: square button, w = h */
      iconOnly: {
        true: "!p-0 !gap-0 shrink-0",
      },
    },
    compoundVariants: [
      { iconOnly: true, size: "xs", className: "!w-6 !px-0" },
      { iconOnly: true, size: "sm", className: "!w-7 !px-0" },
      { iconOnly: true, size: "default", className: "!w-8 !px-0" },
      { iconOnly: true, size: "lg", className: "!w-9 !px-0" },
      { iconOnly: true, size: "xl", className: "!w-10 !px-0" },
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
