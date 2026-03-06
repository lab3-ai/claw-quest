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
        <div className={cn("flex justify-between items-end py-3", border && "border-b border-border", className)}>
            <div>
                <h1 className="text-3xl font-semibold text-foreground">{title}</h1>
                {description && (
                    <div className="mt-1 text-sm text-muted-foreground">{description}</div>
                )}
                {children && <div className="mt-2">{children}</div>}
            </div>
            {actions && <div className="flex gap-2 items-center">{actions}</div>}
        </div>
    )
}
