import { cn } from "@/lib/utils"

interface PageTitleProps {
    title: string
    description?: React.ReactNode
    actions?: React.ReactNode
    border?: boolean
    className?: string
    children?: React.ReactNode
}

export function PageTitle({ title, description, actions, border, className, children }: PageTitleProps) {
    return (
        <div className={cn(
            "flex justify-between items-end py-3",
            "max-sm:flex-col max-sm:items-start max-sm:gap-2",
            border && "border-b border-border-2",
            className
        )}>
            <div>
                <h1 className="text-3xl font-semibold text-fg-1">{title}</h1>
                {description && (
                    <div className="mt-2 text-sm text-fg-3">{description}</div>
                )}
                {children && <div className="mt-2">{children}</div>}
            </div>
            {actions && <div className="flex gap-2 items-center max-sm:w-full max-sm:justify-end">{actions}</div>}
        </div>
    )
}
