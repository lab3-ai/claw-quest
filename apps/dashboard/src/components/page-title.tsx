interface PageTitleProps {
    title: string
    description?: React.ReactNode
    children?: React.ReactNode
}

export function PageTitle({ title, description, children }: PageTitleProps) {
    return (
        <div>
            <h1 className="text-3xl font-semibold text-foreground">{title}</h1>
            {description && (
                <div className="mt-1 text-sm text-muted-foreground">{description}</div>
            )}
            {children}
        </div>
    )
}
