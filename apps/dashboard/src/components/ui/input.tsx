import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const inputVariants = cva(
    "flex w-full rounded-button border border-border-2 bg-bg-base cursor-text transition-all duration-200 file:border-0 file:bg-transparent file:font-medium placeholder:text-fg-3 hover:border-border-3 focus-visible:outline-hidden focus-visible:border-fg-1 focus-visible:bg-bg-1 disabled:cursor-not-allowed disabled:opacity-50",
    {
        variants: {
            inputSize: {
                md: "h-8 px-3 text-sm file:text-sm",
                lg: "h-9 px-3 text-sm file:text-sm",
                xl: "h-10 px-3 text-sm file:text-sm",
            },
        },
        defaultVariants: {
            inputSize: "lg",
        },
    },
)

export interface InputProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
        VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, inputSize, ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(inputVariants({ inputSize }), className)}
                ref={ref}
                {...props}
            />
        )
    }
)
Input.displayName = "Input"

export { Input, inputVariants }
